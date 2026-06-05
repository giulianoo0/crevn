const {
  buildCodexThreadSandboxParams,
  buildCodexTurnSandboxParams,
} = require('./codexSandboxPolicy.cjs');

const TRACE_DIRECTOR_RUNTIME = process.env.CRENV_CODEX_APP_SERVER_TRACE === '1';

function buildDirectorThreadStartParams({ cwd, model, fastMode }) {
  return {
    cwd,
    approvalPolicy: 'never',
    ...buildCodexThreadSandboxParams(),
    ...(model ? { model } : {}),
    ...(fastMode ? { serviceTier: 'fast' } : {}),
  };
}

function buildDirectorTurnStartParams({ threadId, prompt, model, fastMode }) {
  return {
    threadId,
    input: [{ type: 'text', text: prompt }],
    approvalPolicy: 'never',
    ...buildCodexTurnSandboxParams(),
    ...(model ? { model } : {}),
    ...(fastMode ? { serviceTier: 'fast' } : {}),
  };
}

function extractCompletedAssistantText(item) {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const type = item.type ?? item.kind ?? item.itemType;
  if (type && type !== 'agentMessage' && type !== 'assistantMessage' && type !== 'message') {
    return '';
  }

  const directText = firstString(item.text, item.contentMarkdown, item.markdown, item.outputText, item.message);
  if (directText) {
    return directText;
  }

  if (Array.isArray(item.content)) {
    return item.content
      .map((part) =>
        typeof part === 'string'
          ? part
          : firstString(part?.text, part?.content, part?.markdown, part?.outputText)
      )
      .filter(Boolean)
      .join('');
  }

  return '';
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return '';
}

function getTurnErrorMessage(turn) {
  return firstString(
    turn?.error?.message,
    turn?.errorMessage,
    turn?.lastError?.message,
    turn?.failureReason,
    turn?.statusDetails
  );
}

async function runDirectorAppServerTurn({
  client,
  providerThreadId,
  cwd,
  model,
  fastMode = false,
  prompt,
  onProviderThread,
  onTurnStarted,
  onDelta,
}) {
  await client.start();

  console.info(
    `[crenv:director] starting turn mode=${providerThreadId ? 'resume' : 'new'} model=${model ?? 'default'} fast=${fastMode ? 'yes' : 'no'} cwd=${cwd} promptChars=${prompt.length}`
  );
  const opened = providerThreadId
    ? await client.resumeThread(providerThreadId)
    : await client.startThread(buildDirectorThreadStartParams({ cwd, model, fastMode }));
  const activeProviderThreadId = opened?.thread?.id ?? providerThreadId;

  if (!activeProviderThreadId) {
    throw new Error('Codex app-server did not return a provider thread id.');
  }

  console.info(`[crenv:director] provider thread ready thread=${activeProviderThreadId}`);
  await onProviderThread?.(activeProviderThreadId);

  let aggregate = '';
  let providerTurnId = null;
  const completedItemIds = new Set();
  let settle;
  let reject;
  const completionPromise = new Promise((resolve, rejectPromise) => {
    settle = resolve;
    reject = rejectPromise;
  });

  const unsubscribe = client.onNotification((message) => {
    try {
      if (!message || typeof message !== 'object') {
        return;
      }
      const method = message.method;
      const params = message.params ?? {};
      const threadId = params.threadId;

      if (threadId && threadId !== activeProviderThreadId) {
        if (process.env.CRENV_CODEX_APP_SERVER_TRACE === '1') {
          console.info(`[crenv:director] ignored event for foreign thread eventThread=${threadId}`);
        }
        return;
      }

      if (method === 'turn/started') {
        const turnId = params.turn?.id;
        if (turnId) {
          providerTurnId = turnId;
          console.info(`[crenv:director] turn started thread=${activeProviderThreadId} turn=${turnId}`);
          onTurnStarted?.(turnId);
        }
        return;
      }

      if (method === 'item/agentMessage/delta') {
        const turnId = params.turnId;
        if (providerTurnId && turnId && turnId !== providerTurnId) {
          console.warn(
            `[crenv:director] ignored delta for foreign turn expected=${providerTurnId} eventTurn=${turnId}`
          );
          return;
        }
        const delta = typeof params.delta === 'string' ? params.delta : '';
        if (!delta) {
          console.warn(`[crenv:director] ignored empty agent delta thread=${activeProviderThreadId}`);
          return;
        }
        aggregate += delta;
        if (TRACE_DIRECTOR_RUNTIME) {
          console.info(
            `[crenv:director] delta thread=${activeProviderThreadId} turn=${turnId ?? providerTurnId ?? 'unknown'} item=${params.itemId ?? 'unknown'} deltaChars=${delta.length} outputLength=${aggregate.length}`
          );
        }
        onDelta?.(delta, aggregate, {
          itemId: params.itemId,
          providerThreadId: activeProviderThreadId,
          providerTurnId: turnId ?? providerTurnId,
        });
        return;
      }

      if (method === 'item/completed') {
        const turnId = params.turnId;
        if (providerTurnId && turnId && turnId !== providerTurnId) {
          console.warn(
            `[crenv:director] ignored completed item for foreign turn expected=${providerTurnId} eventTurn=${turnId}`
          );
          return;
        }
        const item = params.item ?? params.completedItem ?? params;
        const itemId = item?.id ?? params.itemId ?? null;
        if (itemId && completedItemIds.has(itemId)) {
          console.info(`[crenv:director] ignored duplicate completed item item=${itemId}`);
          return;
        }
        const completedText = extractCompletedAssistantText(item);
        if (!completedText || aggregate.includes(completedText)) {
          console.info(
            `[crenv:director] ignored completed item item=${itemId ?? 'unknown'} textChars=${completedText.length} duplicate=${completedText ? 'yes' : 'no'}`
          );
          return;
        }
        if (itemId) {
          completedItemIds.add(itemId);
        }
        aggregate += completedText;
        console.info(
          `[crenv:director] completed item text thread=${activeProviderThreadId} turn=${turnId ?? providerTurnId ?? 'unknown'} item=${itemId ?? 'unknown'} textChars=${completedText.length} outputLength=${aggregate.length}`
        );
        onDelta?.(completedText, aggregate, {
          itemId,
          providerThreadId: activeProviderThreadId,
          providerTurnId: turnId ?? providerTurnId,
        });
        return;
      }

      if (method === 'turn/completed') {
        const turn = params.turn ?? {};
        if (turn.id) {
          providerTurnId = turn.id;
        }
        const status = turn.status ?? 'completed';
        const errorMessage =
          getTurnErrorMessage(turn) ||
          (status === 'completed' && !aggregate.trim()
            ? 'Director completed without assistant output.'
            : status === 'interrupted'
              ? 'Director turn canceled.'
              : status !== 'completed'
                ? `Director turn ended with status ${status}.`
                : undefined);
        console.info(
          `[crenv:director] turn completed thread=${activeProviderThreadId} turn=${providerTurnId ?? 'unknown'} status=${status} outputLength=${aggregate.length}`
        );
        settle({
          success: status === 'completed' && aggregate.trim().length > 0,
          canceled: status === 'interrupted',
          output: aggregate,
          errorMessage,
          providerThreadId: activeProviderThreadId,
          providerTurnId,
        });
      }
    } catch (error) {
      reject(error);
    }
  });

  try {
    const turnResponse = await client.startTurn(
      buildDirectorTurnStartParams({
        threadId: activeProviderThreadId,
        prompt,
        model,
        fastMode,
      })
    );
    providerTurnId = turnResponse?.turn?.id ?? providerTurnId;
    if (providerTurnId) {
      console.info(`[crenv:director] startTurn returned turn=${providerTurnId}`);
      await onTurnStarted?.(providerTurnId);
    }
    return await completionPromise;
  } finally {
    console.info(`[crenv:director] unsubscribed thread=${activeProviderThreadId}`);
    unsubscribe?.();
  }
}

module.exports = {
  buildDirectorThreadStartParams,
  buildDirectorTurnStartParams,
  extractCompletedAssistantText,
  runDirectorAppServerTurn,
};
