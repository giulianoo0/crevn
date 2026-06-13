import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createProviderSettingsStore, applyProviderSettingsToEnv } = require('./providerSettings.cjs');

describe('provider settings', () => {
  it('persists the Gemini text provider API key under user data', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-provider-settings-'));
    const store = createProviderSettingsStore(userDataDir);

    await store.update({ text: { gemini: { apiKey: ' gemini-secret ' } } });

    await expect(store.read()).resolves.toEqual({
      text: {
        gemini: {
          apiKey: 'gemini-secret',
        },
      },
    });
  });

  it('applies saved Gemini credentials to the process environment', () => {
    const previousGeminiApiKey = process.env.GEMINI_API_KEY;
    const previousGoogleApiKey = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    applyProviderSettingsToEnv({
      text: {
        gemini: {
          apiKey: 'gemini-secret',
        },
      },
    });

    expect(process.env.GEMINI_API_KEY).toBe('gemini-secret');
    expect(process.env.GOOGLE_API_KEY).toBe('gemini-secret');

    if (previousGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousGeminiApiKey;
    }
    if (previousGoogleApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousGoogleApiKey;
    }
  });
});
