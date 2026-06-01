export type GenerationProviderId = 'codex' | 'antigravity';

export type ModelProviderOption = {
  id: GenerationProviderId;
  label: string;
};

export type ModelOption = {
  id: string;
  label: string;
  providerId: GenerationProviderId;
  codexCliModel?: string;
  antigravitySettingModel?: string;
};

export const MODEL_PROVIDER_OPTIONS: ModelProviderOption[] = [
  { id: 'codex', label: 'Codex' },
  { id: 'antigravity', label: 'Antigravity' },
];

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'codex-gpt-5-4-mini',
    label: 'GPT-5.4 Mini',
    providerId: 'codex',
    codexCliModel: 'gpt-5.4-mini',
  },
  {
    id: 'codex-gpt-5-4',
    label: 'GPT-5.4',
    providerId: 'codex',
    codexCliModel: 'gpt-5.4',
  },
  {
    id: 'codex-gpt-5-5',
    label: 'GPT-5.5',
    providerId: 'codex',
    codexCliModel: 'gpt-5.5',
  },
  {
    id: 'codex-gpt-5-3-codex',
    label: 'GPT-5.3 Codex',
    providerId: 'codex',
    codexCliModel: 'gpt-5.3-codex',
  },
  {
    id: 'codex-gpt-5-2-codex',
    label: 'GPT-5.2 Codex',
    providerId: 'codex',
    codexCliModel: 'gpt-5.2-codex',
  },
  {
    id: 'antigravity-gemini-3-5-flash-low',
    label: 'Gemini 3.5 Flash (Low)',
    providerId: 'antigravity',
    antigravitySettingModel: 'Gemini 3.5 Flash (Low)',
  },
  {
    id: 'antigravity-gemini-3-5-flash',
    label: 'Gemini 3.5 Flash',
    providerId: 'antigravity',
    antigravitySettingModel: 'Gemini 3.5 Flash',
  },
  {
    id: 'antigravity-claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    providerId: 'antigravity',
    antigravitySettingModel: 'Claude Sonnet 4.6',
  },
  {
    id: 'antigravity-claude-opus-4-6',
    label: 'Claude Opus 4.6',
    providerId: 'antigravity',
    antigravitySettingModel: 'Claude Opus 4.6',
  },
  {
    id: 'antigravity-gpt-oss-120b',
    label: 'GPT-OSS-120b',
    providerId: 'antigravity',
    antigravitySettingModel: 'GPT-OSS-120b',
  },
];

export const DEFAULT_MODEL_ID = 'codex-gpt-5-4-mini';

export function getModelOptionById(modelId: string) {
  return MODEL_OPTIONS.find((option) => option.id === modelId) ?? null;
}

export function getProviderOptionById(providerId: GenerationProviderId) {
  return MODEL_PROVIDER_OPTIONS.find((option) => option.id === providerId) ?? null;
}

export function getModelsForProvider(providerId: GenerationProviderId) {
  return MODEL_OPTIONS.filter((option) => option.providerId === providerId);
}

export function getDefaultModelOption() {
  return getModelOptionById(DEFAULT_MODEL_ID) ?? MODEL_OPTIONS[0];
}
