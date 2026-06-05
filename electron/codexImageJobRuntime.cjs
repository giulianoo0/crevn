const path = require('node:path');
const fsp = require('node:fs/promises');

const IMAGE_READY_PREFIX = 'CRENV_IMAGE_READY ';
const IMAGE_READY_SCHEMA = 'crenv.image.ready.v1';
const TRACE_IMAGE_RUNTIME = process.env.CRENV_CODEX_APP_SERVER_TRACE === '1';

function parseCrenvImageReadyLine(line) {
  const text = String(line ?? '').trim();
  if (!text.startsWith(IMAGE_READY_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(IMAGE_READY_PREFIX.length));
    if (!parsed || parsed.schema !== IMAGE_READY_SCHEMA) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function validateCrenvImageReadyEvent(event, context) {
  if (!event || event.schema !== IMAGE_READY_SCHEMA) {
    return { ok: false, errorMessage: 'Invalid ready-event schema.' };
  }
  if (event.jobId !== context.jobId) {
    return { ok: false, errorMessage: 'Ready event belongs to a different job.' };
  }
  if (typeof event.imageId !== 'string' || !event.imageId.trim()) {
    return { ok: false, errorMessage: 'Ready event is missing imageId.' };
  }
  if (!Number.isInteger(event.outputIndex) || event.outputIndex < 0) {
    return { ok: false, errorMessage: 'Ready event has an invalid outputIndex.' };
  }
  if (event.reviewStatus !== 'accepted') {
    return { ok: false, errorMessage: 'Ready event image is not accepted.' };
  }
  if (typeof event.path !== 'string' || !event.path.trim()) {
    return { ok: false, errorMessage: 'Ready event is missing image path.' };
  }

  const normalizedPath = event.path.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('output/ready/')) {
    return { ok: false, errorMessage: 'Ready image must be under output/ready.' };
  }

  const absoluteOutputDirectory = path.resolve(context.outputDirectory);
  const relativeToOutput = normalizedPath.slice('output/'.length);
  const absolutePath = path.resolve(absoluteOutputDirectory, relativeToOutput);

  if (!isPathInside(absolutePath, path.join(absoluteOutputDirectory, 'ready'))) {
    return { ok: false, errorMessage: 'Ready image path escapes output/ready.' };
  }

  return {
    ok: true,
    absolutePath,
  };
}

function isPathInside(candidatePath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function buildCrenvImageReadyPromptContract({ jobId, outputDirectory, requestedCount }) {
  return [
    'Streaming image registration contract:',
    `- Job id: ${jobId}`,
    `- Output directory: ${outputDirectory}`,
    `- Requested accepted image count: ${requestedCount}`,
    '- Write in-progress candidates under output/tmp.',
    '- Review or regenerate each candidate before exposing it.',
    '- Move only accepted images into output/ready.',
    '- For every accepted image, write output/ready/<imageId>.json with the same JSON object you emit.',
    '- Append each accepted-image JSON object to output/events.jsonl.',
    '- Print exactly one single-line event for each accepted image:',
    `CRENV_IMAGE_READY {"schema":"${IMAGE_READY_SCHEMA}","jobId":"${jobId}","imageId":"unique-image-id","outputIndex":0,"path":"output/ready/000.png","reviewStatus":"accepted"}`,
    '- No final manifest is required.',
  ].join('\n');
}

async function discoverCrenvImageReadyEvents(outputDirectory) {
  const events = [];
  const readyDirectory = path.join(outputDirectory, 'ready');
  const eventsPath = path.join(outputDirectory, 'events.jsonl');

  try {
    const entries = await fsp.readdir(readyDirectory);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      try {
        const event = JSON.parse(await fsp.readFile(path.join(readyDirectory, entry), 'utf8'));
        if (event?.schema === IMAGE_READY_SCHEMA) {
          events.push(event);
        }
      } catch {}
    }
  } catch {}

  try {
    const lines = (await fsp.readFile(eventsPath, 'utf8')).split('\n');
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const event = JSON.parse(line);
        if (event?.schema === IMAGE_READY_SCHEMA) {
          events.push(event);
        }
      } catch {}
    }
  } catch {}

  return events;
}

async function runCodexImageAppServerJob({
  client,
  jobId,
  workingDirectory,
  outputDirectory,
  prompt,
  requestedCount,
  fastMode = false,
  model,
  onScenePlan,
  onImageReady,
  onCancelableRun,
}) {
  await client.start();

  console.info(
    `[crenv:codex:${jobId}] app-server image job starting model=${model ?? 'default'} fast=${fastMode ? 'yes' : 'no'} requested=${requestedCount} cwd=${workingDirectory} output=${outputDirectory} promptChars=${prompt.length}`
  );
  const opened = await client.startThread({
    cwd: workingDirectory,
    approvalPolicy: 'never',
    sandbox: 'workspace-write',
    ...(model ? { model } : {}),
    ...(fastMode ? { serviceTier: 'fast' } : {}),
  });
  const providerThreadId = opened?.thread?.id;
  if (!providerThreadId) {
    throw new Error('Codex app-server did not return an image job thread id.');
  }
  console.info(`[crenv:codex:${jobId}] provider thread ready thread=${providerThreadId}`);

  let providerTurnId = null;
  let settled = false;
  let readyCount = 0;
  let hasDispatchedScenePlan = false;
  let cancelableRunRegistered = false;
  const seenImageIds = new Set();
  const readyEventPromises = [];
  const textBuffer = { value: '' };
  let settle;
  let reject;
  const completionPromise = new Promise((resolve, rejectPromise) => {
    settle = resolve;
    reject = rejectPromise;
  });

  function ingestText(text) {
    if (!text) {
      return;
    }
    if (TRACE_IMAGE_RUNTIME) {
      console.info(`[crenv:codex:${jobId}] ingest text chars=${text.length}`);
    }
    textBuffer.value += text;
    const lines = textBuffer.value.split('\n');
    textBuffer.value = lines.pop() ?? '';
    for (const line of lines) {
      processOutputLine(line);
    }
  }

  async function processReadyEvent(event) {
    const validation = validateCrenvImageReadyEvent(event, { jobId, outputDirectory });
    if (!validation.ok) {
      console.warn(
        `[crenv:codex:${jobId}] ignored CRENV_IMAGE_READY imageId=${event?.imageId ?? 'unknown'}: ${validation.errorMessage}`
      );
      return;
    }
    if (seenImageIds.has(event.imageId)) {
      console.info(`[crenv:codex:${jobId}] ignored duplicate CRENV_IMAGE_READY imageId=${event.imageId}`);
      return;
    }
    seenImageIds.add(event.imageId);
    console.info(
      `[crenv:codex:${jobId}] accepted CRENV_IMAGE_READY imageId=${event.imageId} outputIndex=${event.outputIndex}`
    );
    await onImageReady?.({
      event,
      absolutePath: validation.absolutePath,
      providerThreadId,
      providerTurnId,
    });
    readyCount += 1;
  }

  function processOutputLine(line) {
    const readyEvent = parseCrenvImageReadyLine(line);
    if (readyEvent) {
      console.info(
        `[crenv:codex:${jobId}] parsed CRENV_IMAGE_READY imageId=${readyEvent.imageId ?? 'unknown'} outputIndex=${readyEvent.outputIndex ?? 'unknown'}`
      );
      const promise = processReadyEvent(readyEvent).catch(reject);
      readyEventPromises.push(promise);
      return;
    }

    if (!hasDispatchedScenePlan) {
      const scenePlan = parseScenePlanLineForImageRuntime(line);
      if (scenePlan) {
        hasDispatchedScenePlan = true;
        console.info(
          `[crenv:codex:${jobId}] scene plan count=${scenePlan.count} applyToShimmers=${scenePlan.applyToShimmers ? 'yes' : 'no'}`
        );
        onScenePlan?.({
          jobId,
          count: Math.max(requestedCount, scenePlan.count),
          applyToShimmers: scenePlan.applyToShimmers,
        });
      }
    }
  }

  const unsubscribe = client.onNotification((message) => {
    try {
      if (!message || typeof message !== 'object') {
        return;
      }
      const { method, params = {} } = message;
      if (params.threadId && params.threadId !== providerThreadId) {
        if (process.env.CRENV_CODEX_APP_SERVER_TRACE === '1') {
          console.info(`[crenv:codex:${jobId}] ignored event for foreign thread eventThread=${params.threadId}`);
        }
        return;
      }

      if (method === 'turn/started') {
        providerTurnId = params.turn?.id ?? providerTurnId;
        console.info(`[crenv:codex:${jobId}] turn started turn=${providerTurnId ?? 'unknown'}`);
        registerCancelableRun();
        return;
      }

      if (method === 'item/agentMessage/delta') {
        ingestText(typeof params.delta === 'string' ? params.delta : '');
        return;
      }

      if (method === 'item/commandExecution/outputDelta') {
        const encoded = params.delta ?? params.outputDelta ?? params.chunk;
        if (typeof encoded === 'string') {
          if (TRACE_IMAGE_RUNTIME) {
            console.info(`[crenv:codex:${jobId}] command output delta chars=${encoded.length}`);
          }
          try {
            ingestText(Buffer.from(encoded, 'base64').toString('utf8'));
          } catch {
            ingestText(encoded);
          }
        }
        return;
      }

      if (method === 'turn/completed') {
        settled = true;
        providerTurnId = params.turn?.id ?? providerTurnId;
        console.info(
          `[crenv:codex:${jobId}] turn completed turn=${providerTurnId ?? 'unknown'} status=${params.turn?.status ?? 'unknown'} readyCount=${readyCount}`
        );
        settle({
          success: params.turn?.status === 'completed',
          canceled: params.turn?.status === 'interrupted',
          providerThreadId,
          providerTurnId,
        });
      }
    } catch (error) {
      reject(error);
    }
  });

  try {
    const turnResponse = await client.startTurn({
      threadId: providerThreadId,
      input: [{ type: 'text', text: prompt }],
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'workspaceWrite' },
      ...(model ? { model } : {}),
      ...(fastMode ? { serviceTier: 'fast' } : {}),
    });
    providerTurnId = turnResponse?.turn?.id ?? providerTurnId;
    console.info(`[crenv:codex:${jobId}] startTurn returned turn=${providerTurnId ?? 'unknown'}`);
    registerCancelableRun();

    const result = await completionPromise;
    if (textBuffer.value.trim()) {
      console.info(`[crenv:codex:${jobId}] processing buffered tail chars=${textBuffer.value.length}`);
      processOutputLine(textBuffer.value);
      textBuffer.value = '';
    }
    await Promise.all(readyEventPromises);

    const discovered = await discoverCrenvImageReadyEvents(outputDirectory);
    console.info(`[crenv:codex:${jobId}] discovered ready sidecars/events=${discovered.length}`);
    for (const event of discovered) {
      await processReadyEvent(event);
    }

    console.info(
      `[crenv:codex:${jobId}] image job finished success=${result.success ? 'yes' : 'no'} canceled=${result.canceled ? 'yes' : 'no'} imported=${readyCount}`
    );
    return {
      ...result,
      success: result.success && readyCount > 0,
      errorMessage:
        result.success && readyCount === 0
          ? 'Codex completed without accepting any generated images.'
          : result.canceled
            ? 'Generation canceled.'
            : undefined,
      importedCount: readyCount,
    };
  } catch (error) {
    if (!settled) {
      throw error;
    }
    throw error;
  } finally {
    console.info(`[crenv:codex:${jobId}] unsubscribed thread=${providerThreadId}`);
    unsubscribe?.();
  }

  function registerCancelableRun() {
    if (!providerTurnId || cancelableRunRegistered) {
      return;
    }
    cancelableRunRegistered = true;
    console.info(`[crenv:codex:${jobId}] cancelable run registered turn=${providerTurnId}`);
    onCancelableRun?.({
      jobId,
      cancel(reason = 'user_requested') {
        void client.interruptTurn(providerThreadId, providerTurnId).catch((error) => {
          console.error(`[crenv:codex:${jobId}] failed to interrupt image job (${reason}): ${error.message}`);
        });
        return true;
      },
    });
  }
}

function parseScenePlanLineForImageRuntime(line) {
  const trimmedLine = String(line ?? '').trim();
  if (!trimmedLine.startsWith('{') || !trimmedLine.endsWith('}')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmedLine);
    if (parsed?.type === 'CRENV_SCENE_PLAN' && Number.isInteger(parsed.count) && parsed.count > 0) {
      return {
        count: parsed.count,
        applyToShimmers: parsed.applyToShimmers === true,
      };
    }
  } catch {}
  return null;
}

module.exports = {
  IMAGE_READY_PREFIX,
  IMAGE_READY_SCHEMA,
  buildCrenvImageReadyPromptContract,
  discoverCrenvImageReadyEvents,
  parseCrenvImageReadyLine,
  runCodexImageAppServerJob,
  validateCrenvImageReadyEvent,
};
