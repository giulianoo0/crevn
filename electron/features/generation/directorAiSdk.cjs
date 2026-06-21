const { loadBundledSkill, findSkills } = require('./skills.cjs');

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

// Reasoning levels exposed in the UI. Mapped per provider in
// buildReasoningProviderOptions below.
const REASONING_EFFORTS = ['low', 'medium', 'high'];
const DEFAULT_REASONING_EFFORT = 'medium';
const DIRECTOR_TITLE_ANTHROPIC_MODEL_ID = 'claude-haiku-4-5';
const DIRECTOR_TITLE_GOOGLE_MODEL_ID = 'gemini-3.1-flash-lite';

function normalizeReasoningEffort(effort) {
  return REASONING_EFFORTS.includes(effort) ? effort : DEFAULT_REASONING_EFFORT;
}

// Translate a provider-agnostic reasoning effort into the per-provider knob.
// Anthropic exposes a first-class `effort`; Gemini uses thinkingConfig (we keep
// thoughts visible and reserve a future budget mapping).
function buildReasoningProviderOptions(providerId, effort, supportsReasoningEffort = true) {
  const reasoningEffort = normalizeReasoningEffort(effort);
  if (providerId === 'anthropic') {
    if (supportsReasoningEffort === false) {
      return undefined;
    }
    return { anthropic: { effort: reasoningEffort } };
  }
  return {
    google: {
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  };
}

function buildDirectorStreamOptions({
  providerId = 'google',
  reasoningEffort,
  supportsReasoningEffort = true,
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
  const providerOptions = buildReasoningProviderOptions(providerId, reasoningEffort, supportsReasoningEffort);

  return {
    model,
    ...(system ? { system } : null),
    messages: modelMessages,
    abortSignal,
    experimental_transform: smoothStream({ chunking: 'word', delayInMs: 8 }),
    // Allow the model to call loadSkill, read the result, and keep reasoning in
    // the same turn. generateImages still halts the stream via needsApproval.
    ...(typeof stepCountIs === 'function' ? { stopWhen: stepCountIs(8) } : null),
    ...(providerOptions ? { providerOptions } : null),
    tools: {
      findSkills: tool({
        description:
          'List every bundled skill available to you, each with guidance on when to use it. Call this to discover which skills exist before loading one with loadSkill.',
        inputSchema: jsonSchema({
          type: 'object',
          additionalProperties: false,
          properties: {},
        }),
        execute: async () => findSkills(),
      }),
      loadSkill: tool({
        description:
          'Load a bundled skill before acting on a request it covers. Call with just { name } first to get the skill overview, section index, and reference list. Then request a single section with { name, section } or a reference document with { name, reference } as needed — do not try to load everything at once.',
        inputSchema: jsonSchema({
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string' },
            section: { type: 'string' },
            reference: { type: 'string' },
          },
        }),
        execute: async ({ name, section, reference }) => loadBundledSkill(name, { section, reference }),
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

function sanitizeDirectorChatTitle(value, maxLength = 56) {
  const normalized = String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!normalized) {
    return null;
  }

  const cleaned = normalized
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .replace(/[#*_~]/g, '')
    .replace(/[/:\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

async function resolveDirectorLanguageModel(providerId, modelId) {
  if (providerId === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Set ANTHROPIC_API_KEY to use the Claude Director.');
    }
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return {
      model: anthropic(modelId),
      label: 'Claude',
      keyState: { hasAnthropicApiKey: true },
    };
  }

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error('Set GEMINI_API_KEY or GOOGLE_API_KEY to use Google Gemini Director.');
  }
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  });
  return {
    model: google(modelId),
    label: 'Gemini',
    keyState: {
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      hasGoogleApiKey: Boolean(process.env.GOOGLE_API_KEY),
    },
  };
}

async function* createAiSdkDirectorPartStream({
  providerId = 'google',
  reasoningEffort,
  supportsReasoningEffort = true,
  modelId,
  messages,
  abortController,
}) {
  const { streamText, smoothStream, tool, jsonSchema, stepCountIs } = await import('ai');
  const { model, label, keyState } = await resolveDirectorLanguageModel(providerId, modelId);

  console.info('[crenv:director-ai] Director stream starting', {
    providerId,
    modelId,
    reasoningEffort: normalizeReasoningEffort(reasoningEffort),
    supportsReasoningEffort,
    label,
    ...keyState,
    messages: summarizeDirectorMessagesForLog(messages),
  });
  const result = streamText(buildDirectorStreamOptions({
    providerId,
    reasoningEffort,
    supportsReasoningEffort,
    model,
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

      if (accumulator.apply(chunk)) {
        streamSummary.appliedChunkCount += 1;
        streamSummary.emittedSnapshotCount += 1;
        yield accumulator.snapshot();
      }
    }
  } catch (error) {
    streamFailed = true;
    console.error('[crenv:director-ai] Director stream failed', {
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
      console.warn('[crenv:director-ai] Director answered nothing', finalSummary);
    } else {
      console.info('[crenv:director-ai] Director stream completed', finalSummary);
    }
  }
}

async function resolveDirectorTitleLanguageModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return {
      model: anthropic(DIRECTOR_TITLE_ANTHROPIC_MODEL_ID),
      providerId: 'anthropic',
      modelId: DIRECTOR_TITLE_ANTHROPIC_MODEL_ID,
    };
  }

  const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    return null;
  }

  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
  return {
    model: google(DIRECTOR_TITLE_GOOGLE_MODEL_ID),
    providerId: 'google',
    modelId: DIRECTOR_TITLE_GOOGLE_MODEL_ID,
  };
}

async function createAiSdkDirectorChatTitle({ prompt, abortSignal }) {
  const titleModel = await resolveDirectorTitleLanguageModel();
  if (!titleModel) {
    return null;
  }

  const { generateText } = await import('ai');
  const result = await generateText({
    model: titleModel.model,
    system:
      'Generate a very short sidebar title for this Director conversation. Return only the title. No quotes, markdown, punctuation-heavy labels, or explanation.',
    prompt: `Conversation request:\n${String(prompt ?? '').trim()}`,
    maxOutputTokens: 24,
    temperature: 0.2,
    abortSignal,
  });
  const title = sanitizeDirectorChatTitle(result.text);

  console.info('[crenv:director-ai] Director title generated', {
    providerId: titleModel.providerId,
    modelId: titleModel.modelId,
    title,
  });

  return title;
}

module.exports = {
  REASONING_EFFORTS,
  DEFAULT_REASONING_EFFORT,
  normalizeReasoningEffort,
  buildReasoningProviderOptions,
  buildDirectorStreamOptions,
  createAiSdkDirectorChatTitle,
  createAiSdkDirectorPartStream,
  createDirectorPartAccumulator,
  getTextFromParts,
  sanitizeDirectorChatTitle,
  summarizeDirectorChunkForLog,
  summarizeDirectorMessagesForLog,
  toDirectorModelMessages,
};
