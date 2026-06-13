const { loadBundledSkill } = require('./skills.cjs');

function cloneParts(parts) {
  return parts.map((part) => ({
    ...part,
    ...(part.input && typeof part.input === 'object' ? { input: structuredClone(part.input) } : null),
    ...(part.providerMetadata ? { providerMetadata: structuredClone(part.providerMetadata) } : null),
  }));
}

function getChunkText(chunk) {
  if (typeof chunk?.delta === 'string') {
    return chunk.delta;
  }
  if (typeof chunk?.text === 'string') {
    return chunk.text;
  }
  return '';
}

function createDirectorPartAccumulator(initialParts = []) {
  const parts = cloneParts(initialParts);
  const blockIndexById = new Map();
  const toolIndexByCallId = new Map();
  const skillIndexByCallId = new Map();

  for (const [index, part] of parts.entries()) {
    if (part.streamId) {
      blockIndexById.set(part.streamId, index);
    }
    if (part.type === 'tool-generateImages') {
      toolIndexByCallId.set(part.toolCallId, index);
    }
    if (part.type === 'tool-loadSkill') {
      skillIndexByCallId.set(part.toolCallId, index);
    }
  }

  function ensureBlock(type, id, providerMetadata) {
    const existingIndex = blockIndexById.get(id);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    const index = parts.length;
    parts.push({
      type,
      text: '',
      streamId: id,
      ...(providerMetadata ? { providerMetadata } : null),
    });
    blockIndexById.set(id, index);
    return index;
  }

  function apply(chunk) {
    if (!chunk || typeof chunk !== 'object') {
      return false;
    }

    if (chunk.type === 'reasoning-start') {
      ensureBlock('reasoning', chunk.id, chunk.providerMetadata);
      return true;
    }
    if (chunk.type === 'reasoning-delta') {
      const index = ensureBlock('reasoning', chunk.id, chunk.providerMetadata);
      parts[index].text += getChunkText(chunk);
      if (chunk.providerMetadata) {
        parts[index].providerMetadata = chunk.providerMetadata;
      }
      return true;
    }
    if (chunk.type === 'text-start') {
      ensureBlock('text', chunk.id, chunk.providerMetadata);
      return true;
    }
    if (chunk.type === 'text-delta') {
      const index = ensureBlock('text', chunk.id, chunk.providerMetadata);
      parts[index].text += getChunkText(chunk);
      if (chunk.providerMetadata) {
        parts[index].providerMetadata = chunk.providerMetadata;
      }
      return true;
    }
    if (chunk.type === 'tool-call' && chunk.toolName === 'loadSkill') {
      const existingIndex = skillIndexByCallId.get(chunk.toolCallId);
      if (existingIndex !== undefined) {
        return false;
      }
      const input = chunk.input ?? {};
      const index = parts.length;
      parts.push({
        type: 'tool-loadSkill',
        toolCallId: chunk.toolCallId,
        skillName: typeof input.name === 'string' ? input.name : '',
        reference: typeof input.reference === 'string' ? input.reference : undefined,
        state: 'running',
      });
      skillIndexByCallId.set(chunk.toolCallId, index);
      return true;
    }
    if (
      (chunk.type === 'tool-result' || chunk.type === 'tool-error') &&
      skillIndexByCallId.has(chunk.toolCallId)
    ) {
      const index = skillIndexByCallId.get(chunk.toolCallId);
      const output = chunk.output ?? chunk.result;
      parts[index] = {
        ...parts[index],
        state: chunk.type === 'tool-error' ? 'output-error' : 'output-available',
        skillName:
          output && typeof output === 'object' && typeof output.name === 'string'
            ? output.name
            : parts[index].skillName,
        title:
          output && typeof output === 'object' && typeof output.title === 'string'
            ? output.title
            : parts[index].title,
        found: output && typeof output === 'object' ? Boolean(output.found) : undefined,
      };
      return true;
    }
    if (chunk.type === 'tool-call' && chunk.toolName === 'generateImages') {
      const index = parts.length;
      parts.push({
        type: 'tool-generateImages',
        toolCallId: chunk.toolCallId,
        input: chunk.input ?? {},
        state: 'approval-requested',
      });
      toolIndexByCallId.set(chunk.toolCallId, index);
      return true;
    }
    if (chunk.type === 'tool-approval-request') {
      const index = toolIndexByCallId.get(chunk.toolCallId);
      if (index === undefined) {
        return false;
      }
      parts[index] = {
        ...parts[index],
        state: 'approval-requested',
        approvalId: chunk.approvalId,
      };
      return true;
    }

    return false;
  }

  function snapshot() {
    return cloneParts(parts).map(({ streamId: _streamId, ...part }) => part);
  }

  return { apply, snapshot };
}

function getTextFromParts(parts) {
  return (Array.isArray(parts) ? parts : [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function toDirectorModelMessages(messages) {
  return (Array.isArray(messages) ? messages : []).flatMap((message) => {
    if (message?.role !== 'user' && message?.role !== 'assistant') {
      return [];
    }
    const content = getTextFromParts(message.parts).trim();
    return content ? [{ role: message.role, content }] : [];
  });
}

function truncateForDirectorLog(value, maxLength = 180) {
  const text = typeof value === 'string' ? value : '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function summarizeDirectorMessagesForLog(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const lastMessage = list.at(-1);
  const content = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

  return {
    count: list.length,
    roles: list.map((message) => message?.role).filter(Boolean),
    lastMessage: lastMessage
      ? {
          role: lastMessage.role,
          contentChars: content.length,
          contentPreview: truncateForDirectorLog(content),
        }
      : null,
  };
}

function summarizeDirectorChunkForLog(chunk) {
  if (!chunk || typeof chunk !== 'object') {
    return { type: typeof chunk };
  }

  const summary = {
    type: chunk.type,
  };

  if (chunk.id) {
    summary.id = chunk.id;
  }
  if (chunk.toolCallId) {
    summary.toolCallId = chunk.toolCallId;
  }
  if (chunk.toolName) {
    summary.toolName = chunk.toolName;
  }
  if (typeof chunk.delta === 'string') {
    summary.deltaChars = chunk.delta.length;
    summary.deltaPreview = truncateForDirectorLog(chunk.delta);
  }
  if (typeof chunk.text === 'string') {
    summary.textChars = chunk.text.length;
    summary.textPreview = truncateForDirectorLog(chunk.text);
  }
  if (chunk.input && typeof chunk.input === 'object') {
    summary.inputKeys = Object.keys(chunk.input);
    if (typeof chunk.input.prompt === 'string') {
      summary.promptChars = chunk.input.prompt.length;
      summary.promptPreview = truncateForDirectorLog(chunk.input.prompt);
    }
  }
  if (chunk.approvalId) {
    summary.approvalId = chunk.approvalId;
  }
  if (chunk.finishReason) {
    summary.finishReason = chunk.finishReason;
  }
  if (chunk.usage) {
    summary.usage = chunk.usage;
  }
  if (chunk.error) {
    summary.error = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
  }
  if (chunk.providerMetadata) {
    summary.providerMetadataKeys = Object.keys(chunk.providerMetadata);
  }

  return summary;
}

function buildDirectorStreamOptions({
  model,
  messages,
  abortSignal,
  smoothStream,
  tool,
  jsonSchema,
  stepCountIs,
}) {
  const system = (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.role === 'system')
    .map((message) => (typeof message.content === 'string' ? message.content.trim() : ''))
    .filter(Boolean)
    .join('\n\n');
  const modelMessages = (Array.isArray(messages) ? messages : []).filter((message) => message?.role !== 'system');

  return {
    model,
    ...(system ? { system } : null),
    messages: modelMessages,
    abortSignal,
    experimental_transform: smoothStream(),
    // Allow the model to call loadSkill, read the result, and keep reasoning in
    // the same turn. generateImages still halts the stream via needsApproval.
    ...(typeof stepCountIs === 'function' ? { stopWhen: stepCountIs(8) } : null),
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    },
    tools: {
      loadSkill: tool({
        description:
          'Load the full instructions for a bundled skill before acting on a request it covers. Optionally pass a reference filename to read a specific reference document.',
        inputSchema: jsonSchema({
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string' },
            reference: { type: 'string' },
          },
        }),
        execute: async ({ name, reference }) => loadBundledSkill(name, reference),
      }),
      generateImages: tool({
        description: 'Request one or more still images for the current Director thread.',
        inputSchema: jsonSchema({
          type: 'object',
          additionalProperties: false,
          required: ['prompt', 'count', 'aspectRatio', 'references'],
          properties: {
            prompt: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 25 },
            aspectRatio: { type: 'string' },
            references: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        }),
        needsApproval: true,
      }),
    },
  };
}

async function* createAiSdkDirectorPartStream({
  modelId,
  messages,
  abortController,
}) {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error('Set GEMINI_API_KEY or GOOGLE_API_KEY to use Google Gemini Director.');
  }

  const [{ streamText, smoothStream, tool, jsonSchema, stepCountIs }, { createGoogleGenerativeAI }] = await Promise.all([
    import('ai'),
    import('@ai-sdk/google'),
  ]);
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  });
  console.info('[crenv:director-ai] Gemini stream starting', {
    modelId,
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGoogleApiKey: Boolean(process.env.GOOGLE_API_KEY),
    messages: summarizeDirectorMessagesForLog(messages),
  });
  const result = streamText(buildDirectorStreamOptions({
    model: google(modelId),
    messages,
    abortSignal: abortController.signal,
    smoothStream,
    tool,
    jsonSchema,
    stepCountIs,
  }));

  const accumulator = createDirectorPartAccumulator();
  const streamSummary = {
    chunkCount: 0,
    appliedChunkCount: 0,
    emittedSnapshotCount: 0,
    textChars: 0,
    reasoningChars: 0,
    toolCallCount: 0,
    approvalRequestCount: 0,
    finishReason: null,
    usage: null,
  };
  let streamFailed = false;

  try {
    for await (const chunk of result.fullStream) {
      streamSummary.chunkCount += 1;
      const chunkText = getChunkText(chunk);
      if (chunkText) {
        if (chunk.type === 'text-delta') {
          streamSummary.textChars += chunkText.length;
        }
        if (chunk.type === 'reasoning-delta') {
          streamSummary.reasoningChars += chunkText.length;
        }
      }
      if (chunk?.type === 'tool-call') {
        streamSummary.toolCallCount += 1;
      }
      if (chunk?.type === 'tool-approval-request') {
        streamSummary.approvalRequestCount += 1;
      }
      if (chunk?.finishReason) {
        streamSummary.finishReason = chunk.finishReason;
      }
      if (chunk?.usage) {
        streamSummary.usage = chunk.usage;
      }

      console.info('[crenv:director-ai] Gemini stream chunk', summarizeDirectorChunkForLog(chunk));

      if (accumulator.apply(chunk)) {
        streamSummary.appliedChunkCount += 1;
        streamSummary.emittedSnapshotCount += 1;
        yield accumulator.snapshot();
      }
    }
  } catch (error) {
    streamFailed = true;
    console.error('[crenv:director-ai] Gemini stream failed', {
      ...streamSummary,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    const finalParts = accumulator.snapshot();
    const finalTextChars = getTextFromParts(finalParts).length;
    const finalReasoningChars = finalParts
      .filter((part) => part?.type === 'reasoning' && typeof part.text === 'string')
      .reduce((total, part) => total + part.text.length, 0);
    const finalToolParts = finalParts.filter((part) => part?.type === 'tool-generateImages').length;
    const finalSummary = {
      ...streamSummary,
      finalPartCount: finalParts.length,
      finalTextChars,
      finalReasoningChars,
      finalToolParts,
    };

    if (streamFailed) {
      // The catch block already logged the failure; do not also report it as an empty answer.
    } else if (finalParts.length === 0 || (finalTextChars === 0 && finalReasoningChars === 0 && finalToolParts === 0)) {
      console.warn('[crenv:director-ai] Gemini answered nothing', finalSummary);
    } else {
      console.info('[crenv:director-ai] Gemini stream completed', finalSummary);
    }
  }
}

module.exports = {
  buildDirectorStreamOptions,
  createAiSdkDirectorPartStream,
  createDirectorPartAccumulator,
  getTextFromParts,
  summarizeDirectorChunkForLog,
  summarizeDirectorMessagesForLog,
  toDirectorModelMessages,
};
