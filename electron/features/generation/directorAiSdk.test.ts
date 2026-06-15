import { describe, expect, it } from 'vitest';

const {
  buildDirectorStreamOptions,
  createDirectorPartAccumulator,
  sanitizeDirectorChatTitle,
  summarizeDirectorChunkForLog,
  summarizeDirectorMessagesForLog,
  toDirectorModelMessages,
} = require('./directorAiSdk.cjs');

describe('Director AI SDK stream accumulator', () => {
  it('keeps streamed reasoning and text blocks in provider order', () => {
    const accumulator = createDirectorPartAccumulator();

    accumulator.apply({ type: 'reasoning-start', id: 'reasoning-1' });
    accumulator.apply({
      type: 'reasoning-delta',
      id: 'reasoning-1',
      delta: 'Check continuity.',
      providerMetadata: { google: { thoughtSignature: 'signature-1' } },
    });
    accumulator.apply({ type: 'reasoning-end', id: 'reasoning-1' });
    accumulator.apply({ type: 'text-start', id: 'text-1' });
    accumulator.apply({ type: 'text-delta', id: 'text-1', delta: 'Use the wide shot.' });
    accumulator.apply({ type: 'text-end', id: 'text-1' });

    expect(accumulator.snapshot()).toEqual([
      {
        type: 'reasoning',
        text: 'Check continuity.',
        providerMetadata: { google: { thoughtSignature: 'signature-1' } },
      },
      {
        type: 'text',
        text: 'Use the wide shot.',
      },
    ]);
  });

  it('accepts Gemini delta chunks that carry text instead of delta', () => {
    const accumulator = createDirectorPartAccumulator();

    accumulator.apply({ type: 'reasoning-start', id: 'reasoning-1' });
    accumulator.apply({
      type: 'reasoning-delta',
      id: 'reasoning-1',
      text: 'Think through the greeting.',
    });
    accumulator.apply({ type: 'text-start', id: 'text-1' });
    accumulator.apply({ type: 'text-delta', id: 'text-1', text: 'Olá!' });

    expect(accumulator.snapshot()).toEqual([
      {
        type: 'reasoning',
        text: 'Think through the greeting.',
      },
      {
        type: 'text',
        text: 'Olá!',
      },
    ]);
  });

  it('merges an approval request into its existing generateImages tool part', () => {
    const accumulator = createDirectorPartAccumulator();

    accumulator.apply({
      type: 'tool-call',
      toolCallId: 'tool-1',
      toolName: 'generateImages',
      input: {
        prompt: 'A clean garage establishing shot',
        count: 1,
        aspectRatio: '16:9',
        references: ['@Garage'],
      },
    });
    accumulator.apply({
      type: 'tool-approval-request',
      approvalId: 'approval-1',
      toolCallId: 'tool-1',
    });

    expect(accumulator.snapshot()).toEqual([
      {
        type: 'tool-generateImages',
        toolCallId: 'tool-1',
        input: {
          prompt: 'A clean garage establishing shot',
          count: 1,
          aspectRatio: '16:9',
          references: ['@Garage'],
        },
        state: 'approval-requested',
        approvalId: 'approval-1',
      },
    ]);
  });
});

describe('Director AI SDK loadSkill tool stream', () => {
  it('tracks a skill load from call through result inside the chain of thought', () => {
    const accumulator = createDirectorPartAccumulator();

    accumulator.apply({
      type: 'tool-call',
      toolCallId: 'skill-1',
      toolName: 'loadSkill',
      input: { name: 'seedance-cartoon' },
    });

    expect(accumulator.snapshot()).toEqual([
      {
        type: 'tool-loadSkill',
        toolCallId: 'skill-1',
        skillName: 'seedance-cartoon',
        reference: undefined,
        state: 'running',
      },
    ]);

    accumulator.apply({
      type: 'tool-result',
      toolCallId: 'skill-1',
      toolName: 'loadSkill',
      output: { found: true, name: 'seedance-cartoon', title: 'Seedance Cartoon', content: '...' },
    });

    expect(accumulator.snapshot()).toEqual([
      {
        type: 'tool-loadSkill',
        toolCallId: 'skill-1',
        skillName: 'seedance-cartoon',
        reference: undefined,
        state: 'output-available',
        title: 'Seedance Cartoon',
        found: true,
      },
    ]);
  });
});

describe('Director AI SDK model messages', () => {
  it('converts stored structured parts without leaking reasoning summaries back into history', () => {
    expect(
      toDirectorModelMessages([
        {
          role: 'user',
          parts: [{ type: 'text', text: 'Plan the shot.' }],
        },
        {
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Internal summary.' },
            { type: 'text', text: 'Start with a wide.' },
          ],
        },
      ])
    ).toEqual([
      { role: 'user', content: 'Plan the shot.' },
      { role: 'assistant', content: 'Start with a wide.' },
    ]);
  });
});

describe('Director AI SDK stream options', () => {
  it('uses smoothStream for smoother text and reasoning deltas', () => {
    const transform = Symbol('smooth-stream-transform');
    const options = buildDirectorStreamOptions({
      model: 'gemini-model',
      messages: [{ role: 'user', content: 'Plan a shot.' }],
      abortSignal: undefined,
      smoothStream: () => transform,
      tool: (definition: unknown) => definition,
      jsonSchema: (schema: unknown) => schema,
    });

    expect(options.experimental_transform).toBe(transform);
  });

  it('moves system messages into the streamText system option', () => {
    const options = buildDirectorStreamOptions({
      model: 'gemini-model',
      messages: [
        { role: 'system', content: 'Follow the studio rules.' },
        { role: 'user', content: 'Plan a shot.' },
      ],
      abortSignal: undefined,
      smoothStream: () => undefined,
      tool: (definition: unknown) => definition,
      jsonSchema: (schema: unknown) => schema,
    });

    expect(options.system).toBe('Follow the studio rules.');
    expect(options.messages).toEqual([{ role: 'user', content: 'Plan a shot.' }]);
  });

  it('maps the reasoning effort to Anthropic provider options', () => {
    const options = buildDirectorStreamOptions({
      providerId: 'anthropic',
      reasoningEffort: 'high',
      supportsReasoningEffort: true,
      model: 'claude-model',
      messages: [{ role: 'user', content: 'Plan a shot.' }],
      abortSignal: undefined,
      smoothStream: () => undefined,
      tool: (definition: unknown) => definition,
      jsonSchema: (schema: unknown) => schema,
    });

    expect(options.providerOptions.anthropic.effort).toBe('high');
    expect(options.tools.findSkills).toBeTruthy();
    expect(options.tools.loadSkill).toBeTruthy();
    expect(options.tools.generateImages).toBeTruthy();
    // loadSkill now supports progressive disclosure via a section argument.
    expect(options.tools.loadSkill.inputSchema.properties.section).toBeTruthy();
  });

  it('omits Anthropic effort for models that do not support it', () => {
    const options = buildDirectorStreamOptions({
      providerId: 'anthropic',
      reasoningEffort: 'high',
      supportsReasoningEffort: false,
      model: 'claude-haiku-model',
      messages: [{ role: 'user', content: 'Plan a shot.' }],
      abortSignal: undefined,
      smoothStream: () => undefined,
      tool: (definition: unknown) => definition,
      jsonSchema: (schema: unknown) => schema,
    });

    expect(options.providerOptions).toBeUndefined();
  });

  it('defaults to Google thinking config when no provider is given', () => {
    const options = buildDirectorStreamOptions({
      model: 'gemini-model',
      messages: [{ role: 'user', content: 'Plan a shot.' }],
      abortSignal: undefined,
      smoothStream: () => undefined,
      tool: (definition: unknown) => definition,
      jsonSchema: (schema: unknown) => schema,
    });

    expect(options.providerOptions.google.thinkingConfig.includeThoughts).toBe(true);
  });
});

describe('Director AI SDK title helpers', () => {
  it('sanitizes short generated titles for the chat sidebar', () => {
    expect(sanitizeDirectorChatTitle('"Reverse angle / garage setup"\nExtra detail')).toBe('Reverse angle garage setup');
    expect(sanitizeDirectorChatTitle('A'.repeat(80))).toBe(`${'A'.repeat(53)}...`);
    expect(sanitizeDirectorChatTitle('')).toBeNull();
  });
});

describe('Director AI SDK logging summaries', () => {
  it('summarizes messages and stream chunks without dumping full prompt text', () => {
    expect(
      summarizeDirectorMessagesForLog([
        { role: 'user', content: 'x'.repeat(220) },
      ])
    ).toEqual({
      count: 1,
      roles: ['user'],
      lastMessage: {
        role: 'user',
        contentChars: 220,
        contentPreview: `${'x'.repeat(180)}...`,
      },
    });

    expect(
      summarizeDirectorChunkForLog({
        type: 'text-delta',
        id: 'text-1',
        delta: 'hello',
        providerMetadata: { google: { thoughtSignature: 'sig' } },
      })
    ).toEqual({
      type: 'text-delta',
      id: 'text-1',
      deltaChars: 5,
      deltaPreview: 'hello',
      providerMetadataKeys: ['google'],
    });

    expect(
      summarizeDirectorChunkForLog({
        type: 'tool-call',
        toolCallId: 'tool-1',
        toolName: 'generateImages',
        input: {
          prompt: 'y'.repeat(220),
          count: 1,
        },
      })
    ).toEqual({
      type: 'tool-call',
      toolCallId: 'tool-1',
      toolName: 'generateImages',
      inputKeys: ['prompt', 'count'],
      promptChars: 220,
      promptPreview: `${'y'.repeat(180)}...`,
    });
  });
});
