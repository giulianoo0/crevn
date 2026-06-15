import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createProviderSettingsStore, applyProviderSettingsToEnv, getProviderSettingsPath } = require('./providerSettings.cjs');

describe('provider settings', () => {
  it('persists the Gemini and Anthropic text provider API keys under user data', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-provider-settings-'));
    const store = createProviderSettingsStore(userDataDir);

    await store.update({
      text: {
        gemini: { apiKey: ' gemini-secret ' },
        anthropic: { apiKey: ' claude-secret ' },
      },
    });

    await expect(store.read()).resolves.toEqual({
      text: {
        gemini: { apiKey: 'gemini-secret' },
        anthropic: { apiKey: 'claude-secret' },
      },
      image: {
        codex: {
          activeAccountId: null,
          accounts: [],
        },
      },
    });
  });

  it('defaults the Anthropic key to empty when an older settings file omits it', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-provider-settings-'));
    const store = createProviderSettingsStore(userDataDir);

    await store.update({ text: { gemini: { apiKey: 'gemini-secret' } } });

    await expect(store.read()).resolves.toEqual({
      text: {
        gemini: { apiKey: 'gemini-secret' },
        anthropic: { apiKey: '' },
      },
      image: {
        codex: {
          activeAccountId: null,
          accounts: [],
        },
      },
    });
  });

  it('defaults the Codex image provider state when an older settings file omits it', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-provider-settings-'));
    const store = createProviderSettingsStore(userDataDir);
    const settingsPath = getProviderSettingsPath(userDataDir);
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        text: {
          gemini: { apiKey: 'gemini-secret' },
          anthropic: { apiKey: 'claude-secret' },
        },
      }),
      'utf8'
    );

    await expect(store.read()).resolves.toEqual({
      text: {
        gemini: { apiKey: 'gemini-secret' },
        anthropic: { apiKey: 'claude-secret' },
      },
      image: {
        codex: {
          activeAccountId: null,
          accounts: [],
        },
      },
    });
  });

  it('preserves saved Codex image accounts when updating only text provider keys', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-provider-settings-'));
    const store = createProviderSettingsStore(userDataDir);
    const codexAccount = {
      id: 'codex-account-1',
      accountId: 'chatgpt-account-1',
      email: 'artist@example.com',
      planType: 'pro',
      chatgptUserId: 'user-1',
      isFedrampAccount: false,
      tokens: {
        idToken: 'id-token',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
      lastRefresh: '2026-06-15T10:00:00.000Z',
      limits: [
        {
          limitId: 'codex',
          limitName: null,
          primary: {
            usedPercent: 42,
            windowMinutes: 60,
            resetsAt: 1760000000,
          },
          secondary: null,
          credits: null,
          individualLimit: null,
          planType: 'pro',
          rateLimitReachedType: null,
        },
      ],
      limitsLastCheckedAt: '2026-06-15T10:01:00.000Z',
      limitsError: null,
      createdAt: '2026-06-15T09:59:00.000Z',
      updatedAt: '2026-06-15T10:01:00.000Z',
    };
    await store.update({
      text: {
        gemini: { apiKey: 'old-gemini-key' },
        anthropic: { apiKey: 'old-claude-key' },
      },
      image: {
        codex: {
          activeAccountId: 'codex-account-1',
          accounts: [codexAccount],
        },
      },
    });

    await store.update({
      text: {
        gemini: { apiKey: 'new-gemini-key' },
        anthropic: { apiKey: 'new-claude-key' },
      },
    });

    await expect(store.read()).resolves.toEqual({
      text: {
        gemini: { apiKey: 'new-gemini-key' },
        anthropic: { apiKey: 'new-claude-key' },
      },
      image: {
        codex: {
          activeAccountId: 'codex-account-1',
          accounts: [codexAccount],
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

  it('applies saved Anthropic credentials to the process environment', () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    applyProviderSettingsToEnv({
      text: {
        anthropic: {
          apiKey: 'claude-secret',
        },
      },
    });

    expect(process.env.ANTHROPIC_API_KEY).toBe('claude-secret');

    if (previous === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = previous;
    }
  });
});
