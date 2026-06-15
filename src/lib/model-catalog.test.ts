import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_ID,
  getDefaultModelOption,
  getModelsForProvider,
  MODEL_OPTIONS,
  MODEL_PROVIDER_OPTIONS,
} from './model-catalog';

describe('model catalog', () => {
  it('offers Codex image models alongside the Google and Claude text models', () => {
    expect(MODEL_PROVIDER_OPTIONS).toEqual([
      { id: 'codex', label: 'Codex', capabilities: ['image'] },
      { id: 'google', label: 'Google', capabilities: ['text'] },
      { id: 'anthropic', label: 'Claude', capabilities: ['text'] },
    ]);
    expect(DEFAULT_MODEL_ID).toBe('codex-gpt-5-4-mini');
    expect(getDefaultModelOption()).toEqual(
      expect.objectContaining({
        id: 'codex-gpt-5-4-mini',
        label: 'GPT-5.4 Mini',
        providerId: 'codex',
      })
    );
    expect(getModelsForProvider('codex').map((model) => model.label)).toEqual(['GPT-5.4 Mini']);
    expect(getModelsForProvider('google').map((model) => model.label)).toEqual([
      'Gemini 3.5 Flash',
      'Gemini 3.1 Flash Lite',
      'Gemini 3 Pro',
    ]);
    expect(getModelsForProvider('google').map((model) => model.tanstackModel)).toEqual([
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite-preview',
      'gemini-3-pro-preview',
    ]);
    expect(MODEL_OPTIONS.some((model) => model.providerId === 'codex')).toBe(true);
  });

  it('exposes the three Claude text models', () => {
    expect(getModelsForProvider('anthropic').map((model) => model.label)).toEqual([
      'Claude Opus 4.8',
      'Claude Sonnet 4.6',
      'Claude Haiku 4.5',
    ]);
    expect(getModelsForProvider('anthropic').map((model) => model.runtimeModel)).toEqual([
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
    ]);
    expect(getModelsForProvider('anthropic').map((model) => model.supportsReasoningEffort ?? true)).toEqual([
      true,
      true,
      false,
    ]);
    expect(getModelsForProvider('anthropic').every((model) => model.capabilities.includes('text'))).toBe(true);
  });
});
