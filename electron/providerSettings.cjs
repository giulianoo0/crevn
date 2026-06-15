const fs = require('node:fs/promises');
const path = require('node:path');

const PROVIDER_SETTINGS_FILE_NAME = 'provider-settings.json';

const DEFAULT_PROVIDER_SETTINGS = {
  text: {
    gemini: {
      apiKey: '',
    },
    anthropic: {
      apiKey: '',
    },
  },
  image: {
    codex: {
      activeAccountId: null,
      accounts: [],
    },
  },
};

function normalizeNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeLimitWindow(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const usedPercent = normalizeOptionalNumber(input.usedPercent);
  if (usedPercent === null) {
    return null;
  }
  return {
    usedPercent,
    windowMinutes: normalizeOptionalNumber(input.windowMinutes),
    resetsAt: normalizeOptionalNumber(input.resetsAt),
  };
}

function normalizeCreditsSnapshot(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  return {
    hasCredits: Boolean(input.hasCredits),
    unlimited: Boolean(input.unlimited),
    balance: normalizeNullableString(input.balance),
  };
}

function normalizeIndividualLimit(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const limit = normalizeNullableString(input.limit);
  const used = normalizeNullableString(input.used);
  const remainingPercent = normalizeOptionalNumber(input.remainingPercent);
  const resetsAt = normalizeOptionalNumber(input.resetsAt);
  if (!limit || !used || remainingPercent === null || resetsAt === null) {
    return null;
  }
  return {
    limit,
    used,
    remainingPercent,
    resetsAt,
  };
}

function normalizeRateLimitSnapshot(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const limitId = normalizeNullableString(input.limitId);
  return {
    limitId: limitId || 'codex',
    limitName: normalizeNullableString(input.limitName),
    primary: normalizeLimitWindow(input.primary),
    secondary: normalizeLimitWindow(input.secondary),
    credits: normalizeCreditsSnapshot(input.credits),
    individualLimit: normalizeIndividualLimit(input.individualLimit),
    planType: normalizeNullableString(input.planType),
    rateLimitReachedType: normalizeNullableString(input.rateLimitReachedType),
  };
}

function normalizeCodexImageAccount(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const id = normalizeNullableString(input.id);
  const accountId = normalizeNullableString(input.accountId);
  const accessToken = normalizeNullableString(input.tokens?.accessToken);
  const refreshToken = normalizeNullableString(input.tokens?.refreshToken);
  if (!id || !accountId || !accessToken || !refreshToken) {
    return null;
  }

  return {
    id,
    accountId,
    email: normalizeNullableString(input.email),
    planType: normalizeNullableString(input.planType),
    chatgptUserId: normalizeNullableString(input.chatgptUserId),
    isFedrampAccount: Boolean(input.isFedrampAccount),
    tokens: {
      idToken: normalizeNullableString(input.tokens?.idToken) || '',
      accessToken,
      refreshToken,
    },
    lastRefresh: normalizeNullableString(input.lastRefresh),
    limits: Array.isArray(input.limits) ? input.limits.map(normalizeRateLimitSnapshot).filter(Boolean) : [],
    limitsLastCheckedAt: normalizeNullableString(input.limitsLastCheckedAt),
    limitsError: normalizeNullableString(input.limitsError),
    createdAt: normalizeNullableString(input.createdAt) || new Date(0).toISOString(),
    updatedAt: normalizeNullableString(input.updatedAt) || normalizeNullableString(input.createdAt) || new Date(0).toISOString(),
  };
}

function normalizeProviderSettings(input, fallback = DEFAULT_PROVIDER_SETTINGS) {
  const accounts = Array.isArray(input?.image?.codex?.accounts)
    ? input.image.codex.accounts.map(normalizeCodexImageAccount).filter(Boolean)
    : Array.isArray(fallback?.image?.codex?.accounts)
      ? fallback.image.codex.accounts.map(normalizeCodexImageAccount).filter(Boolean)
      : [];
  const requestedActiveAccountId =
    normalizeNullableString(input?.image?.codex?.activeAccountId) ??
    normalizeNullableString(fallback?.image?.codex?.activeAccountId);
  const activeAccountId = accounts.some((account) => account.id === requestedActiveAccountId)
    ? requestedActiveAccountId
    : null;

  return {
    text: {
      gemini: {
        apiKey: String(input?.text?.gemini?.apiKey ?? fallback?.text?.gemini?.apiKey ?? '').trim(),
      },
      anthropic: {
        apiKey: String(input?.text?.anthropic?.apiKey ?? fallback?.text?.anthropic?.apiKey ?? '').trim(),
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

function getProviderSettingsPath(userDataDir) {
  return path.join(userDataDir, PROVIDER_SETTINGS_FILE_NAME);
}

function applyProviderSettingsToEnv(settings) {
  const normalized = normalizeProviderSettings(settings);

  const geminiApiKey = normalized.text.gemini.apiKey;
  if (geminiApiKey) {
    process.env.GEMINI_API_KEY = geminiApiKey;
    process.env.GOOGLE_API_KEY = geminiApiKey;
  }

  const anthropicApiKey = normalized.text.anthropic.apiKey;
  if (anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = anthropicApiKey;
  }
}

function createProviderSettingsStore(userDataDir) {
  const settingsPath = getProviderSettingsPath(userDataDir);

  return {
    settingsPath,
    async read() {
      try {
        const raw = await fs.readFile(settingsPath, 'utf8');
        return normalizeProviderSettings(JSON.parse(raw));
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return normalizeProviderSettings(DEFAULT_PROVIDER_SETTINGS);
        }
        throw error;
      }
    },
    async update(input) {
      const previous = await this.read();
      const settings = normalizeProviderSettings(input, previous);
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
      applyProviderSettingsToEnv(settings);
      return settings;
    },
  };
}

module.exports = {
  DEFAULT_PROVIDER_SETTINGS,
  applyProviderSettingsToEnv,
  createProviderSettingsStore,
  getProviderSettingsPath,
  normalizeProviderSettings,
};
