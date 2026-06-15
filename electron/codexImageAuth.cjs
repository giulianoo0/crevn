const crypto = require('node:crypto');
const http = require('node:http');

const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_OAUTH_ISSUER = 'https://auth.openai.com';
const CODEX_OAUTH_TOKEN_URL = `${CODEX_OAUTH_ISSUER}/oauth/token`;
const CHATGPT_BACKEND_BASE_URL = 'https://chatgpt.com/backend-api';
const CODEX_USAGE_URL = `${CHATGPT_BACKEND_BASE_URL}/wham/usage`;
const CODEX_ORIGINATOR = 'codex_cli_rs';
const CODEX_OAUTH_SCOPE = 'openid profile email offline_access api.connectors.read api.connectors.invoke';
const CODEX_OAUTH_REDIRECT_PATH = '/auth/callback';
const CODEX_OAUTH_PORT_CANDIDATES = [1455, 1457];
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function nowIso(now) {
  return typeof now === 'function' ? now() : new Date().toISOString();
}

function decodeBase64UrlJson(value) {
  return JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
}

function parseJwtPayload(jwt) {
  const parts = String(jwt ?? '').split('.');
  if (parts.length < 2 || !parts[1]) {
    return {};
  }
  try {
    return decodeBase64UrlJson(parts[1]);
  } catch {
    return {};
  }
}

function getAuthClaims(payload) {
  const claims = payload?.['https://api.openai.com/auth'];
  return claims && typeof claims === 'object' ? claims : {};
}

function getProfileClaims(payload) {
  const claims = payload?.['https://api.openai.com/profile'];
  return claims && typeof claims === 'object' ? claims : {};
}

function parseCodexTokenMetadata({ idToken, accessToken, accountId } = {}) {
  const idPayload = parseJwtPayload(idToken);
  const accessPayload = parseJwtPayload(accessToken);
  const idAuth = getAuthClaims(idPayload);
  const accessAuth = getAuthClaims(accessPayload);
  const idProfile = getProfileClaims(idPayload);
  const accessTokenExp = Number(accessPayload?.exp);

  return {
    email: normalizeString(idPayload?.email) || normalizeString(idProfile?.email) || null,
    accountId:
      normalizeString(accountId) ||
      normalizeString(idAuth?.chatgpt_account_id) ||
      normalizeString(accessAuth?.chatgpt_account_id) ||
      null,
    chatgptUserId:
      normalizeString(idAuth?.chatgpt_user_id) ||
      normalizeString(idAuth?.user_id) ||
      normalizeString(accessAuth?.chatgpt_user_id) ||
      normalizeString(accessAuth?.user_id) ||
      null,
    planType:
      normalizeString(idAuth?.chatgpt_plan_type) || normalizeString(accessAuth?.chatgpt_plan_type) || null,
    isFedrampAccount: Boolean(idAuth?.chatgpt_account_is_fedramp || accessAuth?.chatgpt_account_is_fedramp),
    accessTokenExpiresAt: Number.isFinite(accessTokenExp) ? new Date(accessTokenExp * 1000).toISOString() : null,
  };
}

function createPkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

function buildCodexAuthorizeUrl({ redirectUri, codeChallenge, state }) {
  const url = new URL('/oauth/authorize', CODEX_OAUTH_ISSUER);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CODEX_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', CODEX_OAUTH_SCOPE);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('id_token_add_organizations', 'true');
  url.searchParams.set('codex_cli_simplified_flow', 'true');
  url.searchParams.set('state', state);
  url.searchParams.set('originator', CODEX_ORIGINATOR);
  return url.toString();
}

function createCodexAccountId(options = {}) {
  if (typeof options.createId === 'function') {
    const id = normalizeString(options.createId());
    if (id) {
      return id;
    }
  }
  return `codex-image-${crypto.randomUUID()}`;
}

function createCodexImageAccountFromTokenPayload(payload, options = {}) {
  const idToken = normalizeString(payload?.id_token) || '';
  const accessToken = normalizeString(payload?.access_token);
  const refreshToken = normalizeString(payload?.refresh_token);
  const metadata = parseCodexTokenMetadata({
    idToken,
    accessToken,
    accountId: payload?.account_id,
  });
  if (!accessToken || !refreshToken || !metadata.accountId) {
    throw new Error('Codex OAuth response did not include a usable account.');
  }
  const timestamp = nowIso(options.now);
  return {
    id: createCodexAccountId(options),
    accountId: metadata.accountId,
    email: metadata.email,
    planType: metadata.planType,
    chatgptUserId: metadata.chatgptUserId,
    isFedrampAccount: metadata.isFedrampAccount,
    tokens: {
      idToken,
      accessToken,
      refreshToken,
    },
    lastRefresh: timestamp,
    limits: [],
    limitsLastCheckedAt: null,
    limitsError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function exchangeCodexAuthorizationCode({ code, redirectUri, codeVerifier }, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalizedCode = normalizeString(code);
  const normalizedRedirectUri = normalizeString(redirectUri);
  const normalizedCodeVerifier = normalizeString(codeVerifier);
  if (!normalizedCode || !normalizedRedirectUri || !normalizedCodeVerifier) {
    throw new Error('Codex OAuth authorization code exchange is incomplete.');
  }

  const body = new URLSearchParams({
    client_id: CODEX_OAUTH_CLIENT_ID,
    grant_type: 'authorization_code',
    code: normalizedCode,
    redirect_uri: normalizedRedirectUri,
    code_verifier: normalizedCodeVerifier,
  });
  const response = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response?.ok) {
    const message = (await readErrorText(response)) || `Codex OAuth exchange failed with status ${response?.status ?? 'unknown'}.`;
    throw new Error(message);
  }

  return createCodexImageAccountFromTokenPayload(await response.json(), options);
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

async function startOAuthCallbackServer(handler, portCandidates = CODEX_OAUTH_PORT_CANDIDATES) {
  const ports = Array.isArray(portCandidates) && portCandidates.length ? portCandidates : CODEX_OAUTH_PORT_CANDIDATES;
  const errors = [];
  for (const port of ports) {
    const server = http.createServer(handler);
    try {
      await listen(server, port);
      return { server, port };
    } catch (error) {
      errors.push(error);
      await closeServer(server);
      if (!['EADDRINUSE', 'EACCES'].includes(error?.code)) {
        throw error;
      }
    }
  }
  throw new Error(`Could not start Codex OAuth callback server: ${errors.map((error) => error?.message).join('; ')}`);
}

function sendOAuthCallbackResponse(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html><body><p>${message}</p></body></html>`);
}

async function runCodexImageOAuthFlow(options = {}) {
  const openExternal = options.openExternal;
  if (typeof openExternal !== 'function') {
    throw new Error('Codex OAuth requires an openExternal function.');
  }

  const { codeVerifier, codeChallenge } = options.pkcePair ?? createPkcePair();
  const state = normalizeString(options.state) || crypto.randomBytes(16).toString('base64url');
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 5 * 60 * 1000;
  let callbackSettled = false;
  let callbackPort = null;
  let settleCallback;
  const callbackPromise = new Promise((resolve, reject) => {
    settleCallback = { resolve, reject };
  });
  const timeout = setTimeout(() => {
    if (!callbackSettled) {
      callbackSettled = true;
      settleCallback.reject(new Error('Codex OAuth timed out before the browser callback completed.'));
    }
  }, timeoutMs);

  const handler = (request, response) => {
    if (callbackSettled) {
      sendOAuthCallbackResponse(response, 409, 'Codex sign-in already completed. You can close this window.');
      return;
    }
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${callbackPort ?? CODEX_OAUTH_PORT_CANDIDATES[0]}`);
    if (requestUrl.pathname !== CODEX_OAUTH_REDIRECT_PATH) {
      sendOAuthCallbackResponse(response, 404, 'Codex sign-in callback was not found.');
      return;
    }
    const callbackState = requestUrl.searchParams.get('state');
    const error = requestUrl.searchParams.get('error');
    const code = requestUrl.searchParams.get('code');
    if (error) {
      callbackSettled = true;
      sendOAuthCallbackResponse(response, 400, 'Codex sign-in failed. You can close this window.');
      settleCallback.reject(new Error(`Codex OAuth failed: ${error}`));
      return;
    }
    if (callbackState !== state) {
      callbackSettled = true;
      sendOAuthCallbackResponse(response, 400, 'Codex sign-in state did not match. You can close this window.');
      settleCallback.reject(new Error('Codex OAuth state mismatch.'));
      return;
    }
    if (!code) {
      callbackSettled = true;
      sendOAuthCallbackResponse(response, 400, 'Codex sign-in did not return an authorization code. You can close this window.');
      settleCallback.reject(new Error('Codex OAuth callback did not include an authorization code.'));
      return;
    }
    callbackSettled = true;
    sendOAuthCallbackResponse(response, 200, 'Codex sign-in completed. You can close this window.');
    settleCallback.resolve({ code });
  };

  const { server, port } = await startOAuthCallbackServer(handler, options.portCandidates);
  callbackPort = port;
  const redirectUri = `http://localhost:${port}${CODEX_OAUTH_REDIRECT_PATH}`;
  const authorizeUrl = buildCodexAuthorizeUrl({
    redirectUri,
    codeChallenge,
    state,
  });

  try {
    await openExternal(authorizeUrl);
    const callback = await callbackPromise;
    return exchangeCodexAuthorizationCode(
      {
        code: callback.code,
        redirectUri,
        codeVerifier,
      },
      options
    );
  } finally {
    clearTimeout(timeout);
    await closeServer(server);
  }
}

function normalizeCodexAccount(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const id = normalizeString(input.id);
  const accountId = normalizeString(input.accountId);
  const accessToken = normalizeString(input.tokens?.accessToken);
  const refreshToken = normalizeString(input.tokens?.refreshToken);
  if (!id || !accountId || !accessToken || !refreshToken) {
    return null;
  }

  return {
    id,
    accountId,
    email: normalizeString(input.email),
    planType: normalizeString(input.planType),
    chatgptUserId: normalizeString(input.chatgptUserId),
    isFedrampAccount: Boolean(input.isFedrampAccount),
    tokens: {
      idToken: normalizeString(input.tokens?.idToken) || '',
      accessToken,
      refreshToken,
    },
    lastRefresh: normalizeString(input.lastRefresh),
    limits: Array.isArray(input.limits) ? input.limits : [],
    limitsLastCheckedAt: normalizeString(input.limitsLastCheckedAt),
    limitsError: normalizeString(input.limitsError),
    createdAt: normalizeString(input.createdAt) || nowIso(),
    updatedAt: normalizeString(input.updatedAt) || normalizeString(input.createdAt) || nowIso(),
  };
}

function normalizeSettings(settings) {
  const accounts = Array.isArray(settings?.image?.codex?.accounts)
    ? settings.image.codex.accounts.map(normalizeCodexAccount).filter(Boolean)
    : [];
  const requestedActiveAccountId = normalizeString(settings?.image?.codex?.activeAccountId);
  const activeAccountId = accounts.some((candidate) => candidate.id === requestedActiveAccountId)
    ? requestedActiveAccountId
    : accounts[0]?.id ?? null;

  return {
    text: {
      gemini: {
        apiKey: String(settings?.text?.gemini?.apiKey ?? '').trim(),
      },
      anthropic: {
        apiKey: String(settings?.text?.anthropic?.apiKey ?? '').trim(),
      },
    },
    image: {
      codex: {
        activeAccountId,
        accounts,
      },
    },
  };
}

function upsertCodexImageAccount(settings, account, options = {}) {
  const current = normalizeSettings(settings);
  const incoming = normalizeCodexAccount(account);
  if (!incoming) {
    throw new Error('Codex image account is incomplete.');
  }
  const timestamp = nowIso(options.now);
  const existing = current.image.codex.accounts.find((candidate) => candidate.accountId === incoming.accountId);
  const accounts = existing
    ? current.image.codex.accounts.map((candidate) =>
        candidate.id === existing.id
          ? {
              ...candidate,
              ...incoming,
              id: candidate.id,
              createdAt: candidate.createdAt,
              limits: incoming.limits.length ? incoming.limits : candidate.limits,
              limitsLastCheckedAt: incoming.limitsLastCheckedAt ?? candidate.limitsLastCheckedAt,
              limitsError: incoming.limitsError ?? candidate.limitsError,
              updatedAt: timestamp,
            }
          : candidate
      )
    : [
        ...current.image.codex.accounts,
        {
          ...incoming,
          createdAt: incoming.createdAt || timestamp,
          updatedAt: timestamp,
        },
      ];
  const activeAccountId = existing ? existing.id : incoming.id;
  return {
    ...current,
    image: {
      codex: {
        activeAccountId,
        accounts,
      },
    },
  };
}

function selectCodexImageAccount(settings, accountId) {
  const current = normalizeSettings(settings);
  const id = normalizeString(accountId);
  if (!current.image.codex.accounts.some((candidate) => candidate.id === id)) {
    throw new Error('Codex image account was not found.');
  }
  return {
    ...current,
    image: {
      codex: {
        ...current.image.codex,
        activeAccountId: id,
      },
    },
  };
}

function removeCodexImageAccount(settings, accountId) {
  const current = normalizeSettings(settings);
  const id = normalizeString(accountId);
  const accounts = current.image.codex.accounts.filter((candidate) => candidate.id !== id);
  const activeAccountId =
    current.image.codex.activeAccountId === id
      ? accounts[0]?.id ?? null
      : accounts.some((candidate) => candidate.id === current.image.codex.activeAccountId)
        ? current.image.codex.activeAccountId
        : accounts[0]?.id ?? null;
  return {
    ...current,
    image: {
      codex: {
        activeAccountId,
        accounts,
      },
    },
  };
}

function toPublicAccount(account) {
  const { tokens: _tokens, ...publicAccount } = account;
  return publicAccount;
}

function toPublicProviderSettings(settings) {
  const current = normalizeSettings(settings);
  return {
    ...current,
    image: {
      codex: {
        activeAccountId: current.image.codex.activeAccountId,
        accounts: current.image.codex.accounts.map(toPublicAccount),
      },
    },
  };
}

function windowMinutesFromSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.ceil(value / 60);
}

function mapWindow(window) {
  if (!window || typeof window !== 'object') {
    return null;
  }
  const usedPercent = Number(window.used_percent);
  if (!Number.isFinite(usedPercent)) {
    return null;
  }
  return {
    usedPercent,
    windowMinutes: windowMinutesFromSeconds(window.limit_window_seconds),
    resetsAt: Number.isFinite(Number(window.reset_at)) ? Number(window.reset_at) : null,
  };
}

function mapCredits(credits) {
  if (!credits || typeof credits !== 'object') {
    return null;
  }
  return {
    hasCredits: Boolean(credits.has_credits),
    unlimited: Boolean(credits.unlimited),
    balance: normalizeString(credits.balance),
  };
}

function mapIndividualLimit(spendControl) {
  const details = spendControl?.individual_limit;
  if (!details || typeof details !== 'object') {
    return null;
  }
  return {
    limit: String(details.limit ?? ''),
    used: String(details.used ?? ''),
    remainingPercent: Number(details.remaining_percent ?? 0),
    resetsAt: Number(details.reset_at ?? 0),
  };
}

function mapRateLimitSnapshot({ limitId, limitName, rateLimit, credits, individualLimit, planType, rateLimitReachedType }) {
  return {
    limitId,
    limitName: normalizeString(limitName),
    primary: mapWindow(rateLimit?.primary_window),
    secondary: mapWindow(rateLimit?.secondary_window),
    credits: mapCredits(credits),
    individualLimit,
    planType: normalizeString(planType),
    rateLimitReachedType: normalizeString(rateLimitReachedType),
  };
}

function mapCodexUsagePayloadToSnapshots(payload) {
  const planType = normalizeString(payload?.plan_type);
  const primary = mapRateLimitSnapshot({
    limitId: 'codex',
    limitName: null,
    rateLimit: payload?.rate_limit,
    credits: payload?.credits,
    individualLimit: mapIndividualLimit(payload?.spend_control),
    planType,
    rateLimitReachedType: payload?.rate_limit_reached_type?.type,
  });
  const additional = Array.isArray(payload?.additional_rate_limits)
    ? payload.additional_rate_limits.map((details) =>
        mapRateLimitSnapshot({
          limitId: normalizeString(details?.metered_feature) || normalizeString(details?.limit_name) || 'codex',
          limitName: details?.limit_name,
          rateLimit: details?.rate_limit,
          credits: null,
          individualLimit: null,
          planType,
          rateLimitReachedType: null,
        })
      )
    : [];
  return [primary, ...additional];
}

async function readErrorText(response) {
  if (typeof response?.text !== 'function') {
    return '';
  }
  return response.text().catch(() => '');
}

async function refreshCodexImageAccountToken(account, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalized = normalizeCodexAccount(account);
  if (!normalized) {
    throw new Error('Codex image account is incomplete.');
  }
  const response = await fetchImpl(CODEX_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CODEX_OAUTH_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: normalized.tokens.refreshToken,
    }),
  });

  if (!response?.ok) {
    const message = (await readErrorText(response)) || `Codex token refresh failed with status ${response?.status ?? 'unknown'}.`;
    throw new Error(message);
  }

  const payload = await response.json();
  const idToken = normalizeString(payload?.id_token) || normalized.tokens.idToken;
  const accessToken = normalizeString(payload?.access_token) || normalized.tokens.accessToken;
  const refreshToken = normalizeString(payload?.refresh_token) || normalized.tokens.refreshToken;
  const metadata = parseCodexTokenMetadata({
    idToken,
    accessToken,
    accountId: normalized.accountId,
  });

  return {
    ...normalized,
    accountId: metadata.accountId || normalized.accountId,
    email: metadata.email || normalized.email,
    planType: metadata.planType || normalized.planType,
    chatgptUserId: metadata.chatgptUserId || normalized.chatgptUserId,
    isFedrampAccount: metadata.isFedrampAccount,
    tokens: {
      idToken,
      accessToken,
      refreshToken,
    },
    lastRefresh: nowIso(options.now),
    limitsError: null,
    updatedAt: nowIso(options.now),
  };
}

function shouldRefreshCodexImageAccountToken(account, now = Date.now()) {
  const normalized = normalizeCodexAccount(account);
  if (!normalized) {
    return false;
  }
  const metadata = parseCodexTokenMetadata({
    idToken: normalized.tokens.idToken,
    accessToken: normalized.tokens.accessToken,
    accountId: normalized.accountId,
  });
  if (metadata.accessTokenExpiresAt) {
    return new Date(metadata.accessTokenExpiresAt).getTime() <= now + TOKEN_REFRESH_WINDOW_MS;
  }
  if (!normalized.lastRefresh) {
    return true;
  }
  return new Date(normalized.lastRefresh).getTime() < now - TOKEN_REFRESH_MAX_AGE_MS;
}

async function fetchCodexImageAccountLimits(account, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalized = normalizeCodexAccount(account);
  if (!normalized) {
    throw new Error('Codex image account is incomplete.');
  }
  const headers = {
    Authorization: `Bearer ${normalized.tokens.accessToken}`,
    'ChatGPT-Account-ID': normalized.accountId,
    originator: CODEX_ORIGINATOR,
    version: '0.137.0',
    'User-Agent': 'codex_cli_rs/0.137.0',
  };
  if (normalized.isFedrampAccount) {
    headers['X-OpenAI-Fedramp'] = 'true';
  }

  const response = await fetchImpl(CODEX_USAGE_URL, {
    method: 'GET',
    headers,
  });

  if (response?.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshCodexImageAccountToken(normalized, options);
    return fetchCodexImageAccountLimits(refreshed, {
      ...options,
      retryOnUnauthorized: false,
    });
  }

  if (!response?.ok) {
    const message = (await readErrorText(response)) || `Codex limit refresh failed with status ${response?.status ?? 'unknown'}.`;
    return {
      ...normalized,
      limitsError: message,
      updatedAt: nowIso(options.now),
    };
  }

  const payload = await response.json();
  return {
    ...normalized,
    limits: mapCodexUsagePayloadToSnapshots(payload),
    limitsLastCheckedAt: nowIso(options.now),
    limitsError: null,
    updatedAt: nowIso(options.now),
  };
}

async function refreshAllCodexImageAccountLimits(settings, options = {}) {
  const current = normalizeSettings(settings);
  const accounts = [];
  for (const account of current.image.codex.accounts) {
    try {
      accounts.push(await fetchCodexImageAccountLimits(account, options));
    } catch (error) {
      accounts.push({
        ...account,
        limitsError: error instanceof Error ? error.message : String(error),
        updatedAt: nowIso(options.now),
      });
    }
  }
  return {
    ...current,
    image: {
      codex: {
        activeAccountId: current.image.codex.activeAccountId,
        accounts,
      },
    },
  };
}

function getActiveCodexImageAccount(settings) {
  const current = normalizeSettings(settings);
  return (
    current.image.codex.accounts.find((account) => account.id === current.image.codex.activeAccountId) ??
    null
  );
}

module.exports = {
  CHATGPT_BACKEND_BASE_URL,
  CODEX_OAUTH_CLIENT_ID,
  CODEX_OAUTH_ISSUER,
  CODEX_OAUTH_TOKEN_URL,
  CODEX_USAGE_URL,
  buildCodexAuthorizeUrl,
  createPkcePair,
  exchangeCodexAuthorizationCode,
  fetchCodexImageAccountLimits,
  getActiveCodexImageAccount,
  mapCodexUsagePayloadToSnapshots,
  normalizeSettings,
  parseCodexTokenMetadata,
  parseJwtPayload,
  refreshAllCodexImageAccountLimits,
  refreshCodexImageAccountToken,
  removeCodexImageAccount,
  runCodexImageOAuthFlow,
  selectCodexImageAccount,
  shouldRefreshCodexImageAccountToken,
  toPublicProviderSettings,
  upsertCodexImageAccount,
};
