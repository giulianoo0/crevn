const fs = require('node:fs/promises');
const path = require('node:path');

const PROVIDER_SETTINGS_FILE_NAME = 'provider-settings.json';

const DEFAULT_PROVIDER_SETTINGS = {
  text: {
    gemini: {
      apiKey: '',
    },
  },
};

function normalizeProviderSettings(input) {
  return {
    text: {
      gemini: {
        apiKey: String(input?.text?.gemini?.apiKey ?? '').trim(),
      },
    },
  };
}

function getProviderSettingsPath(userDataDir) {
  return path.join(userDataDir, PROVIDER_SETTINGS_FILE_NAME);
}

function applyProviderSettingsToEnv(settings) {
  const apiKey = normalizeProviderSettings(settings).text.gemini.apiKey;
  if (!apiKey) {
    return;
  }
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
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
          return DEFAULT_PROVIDER_SETTINGS;
        }
        throw error;
      }
    },
    async update(input) {
      const settings = normalizeProviderSettings(input);
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
