import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildCodexAuthorizeUrl,
  exchangeCodexAuthorizationCode,
  fetchCodexImageAccountLimits,
  mapCodexUsagePayloadToSnapshots,
  parseCodexTokenMetadata,
  refreshCodexImageAccountToken,
  removeCodexImageAccount,
  selectCodexImageAccount,
  toPublicProviderSettings,
  upsertCodexImageAccount,
} = require('./codexImageAuth.cjs');

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwt(payload: Record<string, unknown>) {
  return `${base64UrlJson({ alg: 'none' })}.${base64UrlJson(payload)}.signature`;
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'codex-account-1',
    accountId: 'chatgpt-account-1',
    email: 'artist@example.com',
    planType: 'pro',
    chatgptUserId: 'user-1',
    isFedrampAccount: false,
    tokens: {
      idToken: 'id-token-1',
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
    },
    lastRefresh: '2026-06-15T10:00:00.000Z',
    limits: [],
    limitsLastCheckedAt: null,
    limitsError: null,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    ...overrides,
  };
}

function settings(accounts = [account()], activeAccountId = 'codex-account-1') {
  return {
    text: {
      gemini: { apiKey: '' },
      anthropic: { apiKey: '' },
    },
    image: {
      codex: {
        activeAccountId,
        accounts,
      },
    },
  };
}

describe('Codex image auth helpers', () => {
  it('extracts ChatGPT account metadata from JWT claims', () => {
    const idToken = jwt({
      'https://api.openai.com/profile': {
        email: 'artist@example.com',
      },
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'workspace-123',
        chatgpt_user_id: 'user-123',
        chatgpt_plan_type: 'pro',
        chatgpt_account_is_fedramp: true,
      },
    });

    expect(parseCodexTokenMetadata({ idToken, accessToken: idToken })).toEqual({
      email: 'artist@example.com',
      accountId: 'workspace-123',
      chatgptUserId: 'user-123',
      planType: 'pro',
      isFedrampAccount: true,
      accessTokenExpiresAt: null,
    });
  });

  it('builds the Codex OAuth authorize URL with upstream parameters', () => {
    const authorizeUrl = new URL(
      buildCodexAuthorizeUrl({
        redirectUri: 'http://localhost:1455/auth/callback',
        codeChallenge: 'challenge-123',
        state: 'state-123',
      })
    );

    expect(authorizeUrl.origin).toBe('https://auth.openai.com');
    expect(authorizeUrl.pathname).toBe('/oauth/authorize');
    expect(authorizeUrl.searchParams.get('response_type')).toBe('code');
    expect(authorizeUrl.searchParams.get('client_id')).toBe('app_EMoamEEZ73f0CkXaXp7hrann');
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('http://localhost:1455/auth/callback');
    expect(authorizeUrl.searchParams.get('scope')).toBe(
      'openid profile email offline_access api.connectors.read api.connectors.invoke'
    );
    expect(authorizeUrl.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizeUrl.searchParams.get('id_token_add_organizations')).toBe('true');
    expect(authorizeUrl.searchParams.get('codex_cli_simplified_flow')).toBe('true');
    expect(authorizeUrl.searchParams.get('state')).toBe('state-123');
    expect(authorizeUrl.searchParams.get('originator')).toBe('codex_cli_rs');
  });

  it('updates duplicate accounts instead of appending them', () => {
    const next = upsertCodexImageAccount(
      settings(),
      account({
        id: 'new-local-id',
        accountId: 'chatgpt-account-1',
        email: 'updated@example.com',
        tokens: {
          idToken: 'id-token-2',
          accessToken: 'access-token-2',
          refreshToken: 'refresh-token-2',
        },
      }),
      { now: () => '2026-06-15T11:00:00.000Z' }
    );

    expect(next.image.codex.accounts).toHaveLength(1);
    expect(next.image.codex.activeAccountId).toBe('codex-account-1');
    expect(next.image.codex.accounts[0]).toMatchObject({
      id: 'codex-account-1',
      accountId: 'chatgpt-account-1',
      email: 'updated@example.com',
      tokens: {
        idToken: 'id-token-2',
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
      },
      updatedAt: '2026-06-15T11:00:00.000Z',
    });
  });

  it('switches and removes active Codex image accounts', () => {
    const first = account();
    const second = account({
      id: 'codex-account-2',
      accountId: 'chatgpt-account-2',
      email: 'second@example.com',
    });
    const selected = selectCodexImageAccount(settings([first, second]), 'codex-account-2');
    expect(selected.image.codex.activeAccountId).toBe('codex-account-2');

    const removed = removeCodexImageAccount(selected, 'codex-account-2');
    expect(removed.image.codex.accounts).toHaveLength(1);
    expect(removed.image.codex.activeAccountId).toBe('codex-account-1');
  });

  it('removes raw tokens from public provider settings', () => {
    expect(toPublicProviderSettings(settings()).image.codex.accounts[0]).not.toHaveProperty('tokens');
  });

  it('maps Codex usage payloads into account limit snapshots', () => {
    expect(
      mapCodexUsagePayloadToSnapshots({
        plan_type: 'pro',
        rate_limit: {
          primary_window: {
            used_percent: 42,
            limit_window_seconds: 3600,
            reset_at: 1760000000,
          },
          secondary_window: {
            used_percent: 5,
            limit_window_seconds: 86400,
            reset_at: 1760100000,
          },
        },
        rate_limit_reached_type: {
          type: 'workspace_member_usage_limit_reached',
        },
        spend_control: {
          individual_limit: {
            limit: '25000',
            used: '8000',
            remaining_percent: 68,
            reset_at: 1760100000,
          },
        },
        credits: {
          has_credits: true,
          unlimited: false,
          balance: '17',
        },
        additional_rate_limits: [
          {
            limit_name: 'gpt-5.4',
            metered_feature: 'codex_gpt_5_4',
            rate_limit: {
              primary_window: {
                used_percent: 88,
                limit_window_seconds: 1800,
                reset_at: 1760000300,
              },
            },
          },
        ],
      })
    ).toEqual([
      {
        limitId: 'codex',
        limitName: null,
        primary: {
          usedPercent: 42,
          windowMinutes: 60,
          resetsAt: 1760000000,
        },
        secondary: {
          usedPercent: 5,
          windowMinutes: 1440,
          resetsAt: 1760100000,
        },
        credits: {
          hasCredits: true,
          unlimited: false,
          balance: '17',
        },
        individualLimit: {
          limit: '25000',
          used: '8000',
          remainingPercent: 68,
          resetsAt: 1760100000,
        },
        planType: 'pro',
        rateLimitReachedType: 'workspace_member_usage_limit_reached',
      },
      {
        limitId: 'codex_gpt_5_4',
        limitName: 'gpt-5.4',
        primary: {
          usedPercent: 88,
          windowMinutes: 30,
          resetsAt: 1760000300,
        },
        secondary: null,
        credits: null,
        individualLimit: null,
        planType: 'pro',
        rateLimitReachedType: null,
      },
    ]);
  });

  it('refreshes account tokens with the Codex OAuth client id', async () => {
    const refreshedIdToken = jwt({
      'https://api.openai.com/profile': {
        email: 'fresh@example.com',
      },
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'chatgpt-account-1',
        chatgpt_user_id: 'user-1',
        chatgpt_plan_type: 'plus',
      },
    });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id_token: refreshedIdToken,
        access_token: 'fresh-access-token',
        refresh_token: 'fresh-refresh-token',
      }),
    }));

    const refreshed = await refreshCodexImageAccountToken(account(), {
      fetchImpl,
      now: () => '2026-06-15T12:00:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://auth.openai.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',
          grant_type: 'refresh_token',
          refresh_token: 'refresh-token-1',
        }),
      })
    );
    expect(refreshed).toMatchObject({
      email: 'fresh@example.com',
      planType: 'plus',
      tokens: {
        idToken: refreshedIdToken,
        accessToken: 'fresh-access-token',
        refreshToken: 'fresh-refresh-token',
      },
      lastRefresh: '2026-06-15T12:00:00.000Z',
      limitsError: null,
    });
  });

  it('exchanges a Codex OAuth authorization code with PKCE and returns a persisted account shape', async () => {
    const idToken = jwt({
      'https://api.openai.com/profile': {
        email: 'oauth@example.com',
      },
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'chatgpt-oauth-account',
        chatgpt_user_id: 'oauth-user',
        chatgpt_plan_type: 'pro',
      },
    });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id_token: idToken,
        access_token: 'oauth-access-token',
        refresh_token: 'oauth-refresh-token',
      }),
    }));

    const exchanged = await exchangeCodexAuthorizationCode(
      {
        code: 'oauth-code-123',
        redirectUri: 'http://localhost:1455/auth/callback',
        codeVerifier: 'verifier-123',
      },
      {
        fetchImpl,
        createId: () => 'codex-oauth-local-id',
        now: () => '2026-06-15T12:03:00.000Z',
      }
    );

    const request = fetchImpl.mock.calls[0]?.[1];
    const body = new URLSearchParams(String(request?.body));
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://auth.openai.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
    expect(body.get('client_id')).toBe('app_EMoamEEZ73f0CkXaXp7hrann');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('oauth-code-123');
    expect(body.get('redirect_uri')).toBe('http://localhost:1455/auth/callback');
    expect(body.get('code_verifier')).toBe('verifier-123');
    expect(exchanged).toMatchObject({
      id: 'codex-oauth-local-id',
      accountId: 'chatgpt-oauth-account',
      email: 'oauth@example.com',
      planType: 'pro',
      chatgptUserId: 'oauth-user',
      tokens: {
        idToken,
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
      },
      lastRefresh: '2026-06-15T12:03:00.000Z',
      createdAt: '2026-06-15T12:03:00.000Z',
      updatedAt: '2026-06-15T12:03:00.000Z',
    });
  });

  it('fetches limits with active account headers', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        plan_type: 'pro',
        rate_limit: {
          primary_window: {
            used_percent: 12,
            limit_window_seconds: 3600,
            reset_at: 1760000000,
          },
        },
      }),
    }));

    const updated = await fetchCodexImageAccountLimits(
      account({
        isFedrampAccount: true,
      }),
      {
        fetchImpl,
        now: () => '2026-06-15T12:01:00.000Z',
      }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://chatgpt.com/backend-api/wham/usage',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
          'ChatGPT-Account-ID': 'chatgpt-account-1',
          'X-OpenAI-Fedramp': 'true',
        }),
      })
    );
    expect(updated.limits).toHaveLength(1);
    expect(updated.limitsLastCheckedAt).toBe('2026-06-15T12:01:00.000Z');
    expect(updated.limitsError).toBeNull();
  });

  it('refreshes and retries once when limit fetch is unauthorized', async () => {
    const refreshedAccessToken = jwt({
      exp: 1800000000,
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'chatgpt-account-1',
        chatgpt_user_id: 'user-1',
        chatgpt_plan_type: 'pro',
      },
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id_token: refreshedAccessToken,
          access_token: refreshedAccessToken,
          refresh_token: 'new-refresh-token',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plan_type: 'pro',
          rate_limit: {
            primary_window: {
              used_percent: 1,
              limit_window_seconds: 3600,
              reset_at: 1760000000,
            },
          },
        }),
      });

    const updated = await fetchCodexImageAccountLimits(account(), {
      fetchImpl,
      now: () => '2026-06-15T12:02:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[2]?.[1]?.headers?.Authorization).toBe(`Bearer ${refreshedAccessToken}`);
    expect(updated.tokens.accessToken).toBe(refreshedAccessToken);
    expect(updated.limits[0]?.primary?.usedPercent).toBe(1);
  });
});
