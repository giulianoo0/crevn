import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_ID,
  getDefaultModelOption,
  getModelsForProvider,
  MODEL_OPTIONS,
  MODEL_PROVIDER_OPTIONS,
} from './model-catalog';

describe('model catalog', () => {
  it('offers Codex image models alongside the Google text models', () => {
    expect(MODEL_PROVIDER_OPTIONS).toEqual([
      { id: 'codex', label: 'Codex', capabilities: ['image'] },
      { id: 'google', label: 'Google', capabilities: ['text'] },
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
});
