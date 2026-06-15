const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const CODEX_USER_AGENT = 'codex_cli_rs/0.137.0';
const CODEX_VERSION = '0.137.0';
const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const COOKIE_PRIME_URLS = ['https://chatgpt.com/', 'https://chat.openai.com/'];

function truncateForLog(value, maxLength = 120) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function summarizeReferenceForLog(reference, index) {
  return {
    index: index + 1,
    name: reference?.name ?? path.basename(reference?.path ?? `reference-${index + 1}`),
    mimeType: guessMimeType(reference),
    title: reference?.title ? truncateForLog(reference.title, 80) : null,
    description: reference?.description ? truncateForLog(reference.description, 120) : null,
    source: typeof reference?.bytesBase64 === 'string' && reference.bytesBase64.trim() ? 'inline-bytes' : 'file-path',
  };
}

function logCodexImage(message, details) {
  if (details === undefined) {
    console.info(`[crenv:codex-image] ${message}`);
    return;
  }
  console.info(`[crenv:codex-image] ${message}`, details);
}

function buildCodexImagePrompt({ prompt, run, count }) {
  if (count <= 1) {
    return String(prompt ?? '').trim();
  }

  return [
    String(prompt ?? '').trim(),
    '',
    `Parallel variation ${run} of ${count}: keep the core request consistent, but make this output distinct in a small harmless way.`,
  ]
    .join('\n')
    .trim();
}

function guessMimeType(reference) {
  if (reference?.mimeType) {
    return reference.mimeType;
  }

  const sourceName = reference?.name ?? reference?.path ?? '';
  const extension = path.extname(sourceName).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  return 'image/png';
}

async function toImageDataUrl(reference) {
  const mimeType = guessMimeType(reference);

  if (typeof reference?.bytesBase64 === 'string' && reference.bytesBase64.trim()) {
    return `data:${mimeType};base64,${reference.bytesBase64}`;
  }

  if (typeof reference?.path === 'string' && reference.path.trim()) {
    const bytes = await fs.readFile(reference.path);
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
  }

  throw new Error('Reference images must provide either bytesBase64 or path.');
}

async function buildInputContent({ prompt, references, run, count }) {
  const content = [
    {
      type: 'input_text',
      text: buildCodexImagePrompt({ prompt, run, count }),
    },
  ];

  for (const reference of references ?? []) {
    content.push({
      type: 'input_image',
      image_url: await toImageDataUrl(reference),
    });
  }

  return content;
}

function resolveCodexAuth(auth) {
  const accessToken = auth?.accessToken;
  const accountId = auth?.accountId;

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Add a Codex image account in Providers > Image before generating images.');
  }

  if (typeof accountId !== 'string' || !accountId.trim()) {
    throw new Error('The active Codex image account is missing an account id. Reconnect it in Providers > Image.');
  }

  return {
    accessToken: accessToken.trim(),
    accountId: accountId.trim(),
    isFedrampAccount: Boolean(auth?.isFedrampAccount),
  };
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  mergeFromResponse(response) {
    const setCookies = readSetCookieHeaders(response?.headers);
    for (const cookieHeader of setCookies) {
      const firstSegment = String(cookieHeader ?? '').split(';', 1)[0]?.trim();
      if (!firstSegment) continue;
      const separatorIndex = firstSegment.indexOf('=');
      if (separatorIndex <= 0) continue;
      const name = firstSegment.slice(0, separatorIndex).trim();
      const value = firstSegment.slice(separatorIndex + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  toHeaderValue() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

function readSetCookieHeaders(headers) {
  if (!headers) {
    return [];
  }

  if (typeof headers.getSetCookie === 'function') {
    const cookies = headers.getSetCookie();
    return Array.isArray(cookies) ? cookies : [];
  }

  const singleHeader = typeof headers.get === 'function' ? headers.get('set-cookie') : null;
  return singleHeader ? [singleHeader] : [];
}

async function primeCookies({ fetchImpl, cookieJar }) {
  for (const url of COOKIE_PRIME_URLS) {
    logCodexImage(`cookie prime ${url}`);
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': CODEX_USER_AGENT,
        originator: 'codex_cli_rs',
        version: CODEX_VERSION,
      },
    });
    cookieJar.mergeFromResponse(response);
    logCodexImage(`cookie prime complete ${url}`, {
      cookieCount: cookieJar.cookies.size,
    });
  }
}

function createBenchmarkTracker() {
  const startedAt = performance.now();
  const benchmark = {
    requestStartedAt: new Date().toISOString(),
    firstEventAt: null,
    imageToolCallStartedAt: null,
    imageToolGeneratingAt: null,
    firstPartialImageAt: null,
    completedAt: null,
  };
  const deltasMs = {
    firstEventMs: null,
    imageToolCallStartedMs: null,
    imageToolGeneratingMs: null,
    firstPartialImageMs: null,
    completedMs: null,
  };

  function mark(benchmarkKey, deltaKey) {
    if (!benchmark[benchmarkKey]) {
      benchmark[benchmarkKey] = new Date().toISOString();
      deltasMs[deltaKey] = Math.round(performance.now() - startedAt);
    }
  }

  return {
    benchmark,
    deltasMs,
    markFirstEvent() {
      mark('firstEventAt', 'firstEventMs');
    },
    markImageToolCallStarted() {
      mark('imageToolCallStartedAt', 'imageToolCallStartedMs');
    },
    markImageToolGenerating() {
      mark('imageToolGeneratingAt', 'imageToolGeneratingMs');
    },
    markFirstPartialImage() {
      mark('firstPartialImageAt', 'firstPartialImageMs');
    },
    markCompleted() {
      mark('completedAt', 'completedMs');
    },
  };
}

function buildSummaryText(summary) {
  const lines = [
    `model: ${summary.model}`,
    `run_count: ${summary.run_count}`,
    `wall_clock_ms: ${summary.wall_clock_ms}`,
    `avg_ms: ${summary.avg_ms}`,
    `min_ms: ${summary.min_ms}`,
    `max_ms: ${summary.max_ms}`,
    `failed_runs: ${summary.failed_runs}`,
    '',
  ];

  for (const result of summary.results) {
    lines.push(`run ${result.run}:`);
    lines.push(`  duration_ms: ${result.durationMs}`);
    lines.push(`  failed: ${result.failed}`);
    lines.push(`  saved_path: ${result.savedPath ?? 'none'}`);
    lines.push(`  first_event_ms: ${result.benchmarkMs.firstEventMs ?? 'none'}`);
    lines.push(`  image_tool_in_progress_ms: ${result.benchmarkMs.imageToolCallStartedMs ?? 'none'}`);
    lines.push(`  image_tool_generating_ms: ${result.benchmarkMs.imageToolGeneratingMs ?? 'none'}`);
    lines.push(`  first_partial_image_ms: ${result.benchmarkMs.firstPartialImageMs ?? 'none'}`);
    lines.push(`  completed_ms: ${result.benchmarkMs.completedMs ?? 'none'}`);
    if (result.errorMessage) {
      lines.push(`  error: ${result.errorMessage}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function nextSseBlock(buffer) {
  const lfBoundary = buffer.indexOf('\n\n');
  const crlfBoundary = buffer.indexOf('\r\n\r\n');

  if (lfBoundary === -1 && crlfBoundary === -1) {
    return null;
  }

  if (crlfBoundary !== -1 && (lfBoundary === -1 || crlfBoundary < lfBoundary)) {
    return {
      block: buffer.slice(0, crlfBoundary),
      rest: buffer.slice(crlfBoundary + 4),
    };
  }

  return {
    block: buffer.slice(0, lfBoundary),
    rest: buffer.slice(lfBoundary + 2),
  };
}

function parseSseBlock(block) {
  const lines = String(block ?? '').split(/\r?\n/);
  let event = null;
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  if (!event && dataLines.length === 0) {
    return null;
  }

  const rawData = dataLines.join('\n').trim();
  let data = null;
  if (rawData) {
    try {
      data = JSON.parse(rawData);
    } catch {
      data = rawData;
    }
  }

  return {
    event: event ?? 'message',
    data,
  };
}

function extractErrorMessage(data) {
  if (!data) {
    return 'Unknown Codex failure.';
  }

  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (typeof data?.error?.message === 'string' && data.error.message.trim()) {
    return data.error.message.trim();
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  return 'Unknown Codex failure.';
}

async function runSingleCodexImageGeneration(input) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const runDirectory = path.join(input.artifactsDirectory, `run-${input.run}`);
  const eventsPath = path.join(runDirectory, 'events.jsonl');
  const requestPath = path.join(runDirectory, 'request.json');
  const responsePath = path.join(runDirectory, 'response.json');
  const outputPath = path.join(input.outputDirectory, `run-${input.run}.png`);
  const references = Array.isArray(input.references) ? input.references : [];
  const benchmarkTracker = createBenchmarkTracker();
  const startedAt = performance.now();

  await fs.mkdir(runDirectory, { recursive: true });

  try {
    logCodexImage(`run ${input.run} start`, {
      model: input.model,
      count: input.count,
      references: references.length,
      prompt: truncateForLog(input.prompt, 160),
      workingDirectory: input.workingDirectory,
    });
    for (const [index, reference] of references.entries()) {
      logCodexImage(`run ${input.run} reference[${index + 1}]`, summarizeReferenceForLog(reference, index));
    }

    const auth = resolveCodexAuth(input.auth);
    logCodexImage(`run ${input.run} auth loaded`, {
      accountId: auth.accountId,
      source: 'app-provider-settings',
    });
    const cookieJar = new CookieJar();
    await primeCookies({ fetchImpl, cookieJar });

    const requestBody = {
      model: input.model,
      instructions: 'You are Codex. Follow the user request exactly.',
      input: [
        {
          type: 'message',
          role: 'user',
          content: await buildInputContent({
            prompt: input.prompt,
            references,
            run: input.run,
            count: input.count,
          }),
        },
      ],
      tools: [{ type: 'image_generation' }],
      stream: true,
      store: false,
    };

    await fs.writeFile(requestPath, JSON.stringify(requestBody, null, 2), 'utf8');

    const headers = {
      Authorization: `Bearer ${auth.accessToken}`,
      'ChatGPT-Account-ID': auth.accountId,
      originator: 'codex_cli_rs',
      version: CODEX_VERSION,
      'User-Agent': CODEX_USER_AGENT,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    const cookieHeader = cookieJar.toHeaderValue();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    if (auth.isFedrampAccount) {
      headers['X-OpenAI-Fedramp'] = 'true';
    }

    logCodexImage(`run ${input.run} POST /backend-api/codex/responses`, {
      model: requestBody.model,
      contentItems: requestBody.input[0]?.content?.length ?? 0,
      references: references.length,
      cookieCount: cookieJar.cookies.size,
      stream: requestBody.stream,
    });

    const response = await fetchImpl(CODEX_RESPONSES_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response?.ok || !response?.body) {
      const responseText = typeof response?.text === 'function' ? await response.text() : '';
      throw new Error(responseText || `Codex image request failed with status ${response?.status ?? 'unknown'}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamBuffer = '';
    let latestSavedPath = null;
    let finalResponse = null;
    let failureMessage = '';
    let eventsLog = '';

    async function handleParsedEvent(parsedEvent) {
      if (!parsedEvent) {
        return;
      }

      benchmarkTracker.markFirstEvent();
      eventsLog += `${JSON.stringify(parsedEvent)}\n`;

      if (parsedEvent.event === 'response.image_generation_call.in_progress') {
        benchmarkTracker.markImageToolCallStarted();
        logCodexImage(`run ${input.run} SSE response.image_generation_call.in_progress`, {
          at: benchmarkTracker.benchmark.imageToolCallStartedAt,
          elapsedMs: benchmarkTracker.deltasMs.imageToolCallStartedMs,
        });
        return;
      }

      if (parsedEvent.event === 'response.image_generation_call.generating') {
        benchmarkTracker.markImageToolGenerating();
        logCodexImage(`run ${input.run} SSE response.image_generation_call.generating`, {
          at: benchmarkTracker.benchmark.imageToolGeneratingAt,
          elapsedMs: benchmarkTracker.deltasMs.imageToolGeneratingMs,
        });
        return;
      }

      if (parsedEvent.event === 'response.image_generation_call.partial_image') {
        const partialImageBase64 = parsedEvent.data?.partial_image_b64;
        if (typeof partialImageBase64 !== 'string' || !partialImageBase64.trim()) {
          return;
        }

        benchmarkTracker.markFirstPartialImage();
        await fs.writeFile(outputPath, Buffer.from(partialImageBase64, 'base64'));
        latestSavedPath = outputPath;
        logCodexImage(`run ${input.run} SSE response.image_generation_call.partial_image`, {
          at: benchmarkTracker.benchmark.firstPartialImageAt,
          elapsedMs: benchmarkTracker.deltasMs.firstPartialImageMs,
          savedPath: outputPath,
          bytes: Buffer.byteLength(partialImageBase64, 'base64'),
        });
        logCodexImage(`run ${input.run} saved partial image`, {
          savedPath: outputPath,
        });

        if (typeof input.onImageUpdated === 'function') {
          await input.onImageUpdated({
            run: input.run,
            savedPath: outputPath,
            mimeType: 'image/png',
            providerImageId: parsedEvent.data?.id ?? null,
            providerThreadId: parsedEvent.data?.thread_id ?? null,
            providerTurnId: parsedEvent.data?.turn_id ?? null,
            benchmark: {
              ...benchmarkTracker.benchmark,
            },
            isFinal: false,
          });
        }
        return;
      }

      if (parsedEvent.event === 'response.completed') {
        benchmarkTracker.markCompleted();
        finalResponse = parsedEvent.data ?? finalResponse;
        logCodexImage(`run ${input.run} SSE response.completed`, {
          at: benchmarkTracker.benchmark.completedAt,
          elapsedMs: benchmarkTracker.deltasMs.completedMs,
          responseId: parsedEvent.data?.id ?? null,
        });
        return;
      }

      if (parsedEvent.event === 'response.failed' || parsedEvent.event === 'error') {
        failureMessage = extractErrorMessage(parsedEvent.data);
        logCodexImage(`run ${input.run} SSE ${parsedEvent.event}`, {
          error: failureMessage,
        });
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      streamBuffer += decoder.decode(value, { stream: true });
      while (true) {
        const nextBlock = nextSseBlock(streamBuffer);
        if (!nextBlock) {
          break;
        }

        streamBuffer = nextBlock.rest;
        await handleParsedEvent(parseSseBlock(nextBlock.block));
      }
    }

    if (streamBuffer.trim()) {
      await handleParsedEvent(parseSseBlock(streamBuffer));
    }

    await fs.writeFile(eventsPath, eventsLog, 'utf8');
    await fs.writeFile(
      responsePath,
      JSON.stringify(
        {
          response: finalResponse,
          benchmark: benchmarkTracker.benchmark,
          benchmarkMs: benchmarkTracker.deltasMs,
        },
        null,
        2
      ),
      'utf8'
    );

    if (!latestSavedPath) {
      throw new Error(failureMessage || 'Codex finished without returning image bytes.');
    }

    if (typeof input.onImageUpdated === 'function') {
      await input.onImageUpdated({
        run: input.run,
        savedPath: latestSavedPath,
        mimeType: 'image/png',
        providerImageId: finalResponse?.id ?? null,
        providerThreadId: finalResponse?.thread_id ?? null,
        providerTurnId: finalResponse?.turn_id ?? null,
        benchmark: {
          ...benchmarkTracker.benchmark,
        },
        isFinal: true,
      });
    }

    logCodexImage(`run ${input.run} completed`, {
      savedPath: latestSavedPath,
      duration_ms: benchmarkTracker.deltasMs.completedMs ?? Math.round(performance.now() - startedAt),
      benchmarkMs: benchmarkTracker.deltasMs,
    });

    return {
      run: input.run,
      durationMs: benchmarkTracker.deltasMs.completedMs ?? Math.round(performance.now() - startedAt),
      savedPath: latestSavedPath,
      failed: false,
      errorMessage: '',
      benchmark: {
        ...benchmarkTracker.benchmark,
      },
      benchmarkMs: {
        ...benchmarkTracker.deltasMs,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await fs.writeFile(eventsPath, '', 'utf8').catch(() => {});
    logCodexImage(`run ${input.run} failed`, {
      error: errorMessage,
    });
    return {
      run: input.run,
      durationMs: Math.round(performance.now() - startedAt),
      savedPath: null,
      failed: true,
      errorMessage,
      benchmark: {
        ...benchmarkTracker.benchmark,
      },
      benchmarkMs: {
        ...benchmarkTracker.deltasMs,
      },
    };
  }
}

async function runImageGenerationBatch(input) {
  const artifactsDirectory = input.artifactsDirectory ?? path.join(input.workingDirectory, 'artifacts');
  await fs.mkdir(input.outputDirectory, { recursive: true });
  await fs.mkdir(artifactsDirectory, { recursive: true });

  const startedAt = performance.now();
  const results = await Promise.all(
    Array.from({ length: input.count }, (_value, index) =>
      runSingleCodexImageGeneration({
        ...input,
        artifactsDirectory,
        run: index + 1,
      })
    )
  );
  const wallClockMs = Math.round(performance.now() - startedAt);
  const durations = results.map((result) => result.durationMs);
  const summary = {
    model: input.model,
    run_count: input.count,
    wall_clock_ms: wallClockMs,
    avg_ms: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    min_ms: durations.length ? Math.min(...durations) : 0,
    max_ms: durations.length ? Math.max(...durations) : 0,
    failed_runs: results.filter((result) => result.failed).length,
    results,
  };

  await fs.writeFile(path.join(artifactsDirectory, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(path.join(artifactsDirectory, 'summary.txt'), buildSummaryText(summary), 'utf8');

  return {
    wallClockMs,
    results,
    summaryPath: path.join(artifactsDirectory, 'summary.json'),
    summaryTextPath: path.join(artifactsDirectory, 'summary.txt'),
  };
}

module.exports = {
  buildCodexImagePrompt,
  runImageGenerationBatch,
};
