export type GenerationCapability = 'image' | 'text';

export type GenerationProviderId = 'codex' | 'google' | 'anthropic';

export type ModelProviderOption = {
  id: GenerationProviderId;
  label: string;
  capabilities: GenerationCapability[];
};

export type ModelOption = {
  id: string;
  label: string;
  providerId: GenerationProviderId;
  tanstackModel?: string;
  runtimeModel?: string;
  supportsReasoningEffort?: boolean;
  capabilities: GenerationCapability[];
};

export const MODEL_PROVIDER_OPTIONS: ModelProviderOption[] = [
  { id: 'codex', label: 'Codex', capabilities: ['image'] },
  { id: 'google', label: 'Google', capabilities: ['text'] },
  { id: 'anthropic', label: 'Claude', capabilities: ['text'] },
];

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'codex-gpt-5-4-mini',
    label: 'GPT Image',
    providerId: 'codex',
    runtimeModel: 'gpt-5.4',
    capabilities: ['image'],
  },
  {
    id: 'google-gemini-3-5-flash',
    label: 'Gemini 3.5 Flash',
    providerId: 'google',
    tanstackModel: 'gemini-3.5-flash',
    capabilities: ['text'],
  },
  {
    id: 'google-gemini-3-1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    providerId: 'google',
    tanstackModel: 'gemini-3.1-flash-lite-preview',
    capabilities: ['text'],
  },
  {
    id: 'google-gemini-3-pro',
    label: 'Gemini 3 Pro',
    providerId: 'google',
    tanstackModel: 'gemini-3-pro-preview',
    capabilities: ['text'],
  },
  {
    id: 'anthropic-claude-opus-4-8',
    label: 'Claude Opus 4.8',
    providerId: 'anthropic',
    runtimeModel: 'claude-opus-4-8',
    supportsReasoningEffort: true,
    capabilities: ['text'],
  },
  {
    id: 'anthropic-claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    providerId: 'anthropic',
    runtimeModel: 'claude-sonnet-4-6',
    supportsReasoningEffort: true,
    capabilities: ['text'],
  },
  {
    id: 'anthropic-claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    providerId: 'anthropic',
    runtimeModel: 'claude-haiku-4-5',
    supportsReasoningEffort: false,
    capabilities: ['text'],
  },
];

export const DEFAULT_IMAGE_MODEL_ID = 'codex-gpt-5-4-mini';
export const DEFAULT_TEXT_MODEL_ID = 'google-gemini-3-5-flash';
export const DEFAULT_MODEL_ID = DEFAULT_IMAGE_MODEL_ID;

/** Label used on generated-image tiles: model name plus its provider, e.g. "GPT Image (Codex)". */
export function getModelBadgeLabel(model: Pick<ModelOption, 'label' | 'providerId'>) {
  const provider = getProviderOptionById(model.providerId);
  return provider ? `${model.label} (${provider.label})` : model.label;
}

export function getModelOptionById(modelId: string) {
  return MODEL_OPTIONS.find((option) => option.id === modelId) ?? null;
}

export function getProviderOptionById(providerId: GenerationProviderId) {
  return MODEL_PROVIDER_OPTIONS.find((option) => option.id === providerId) ?? null;
}

export function getProviderOptions(capability?: GenerationCapability) {
  if (!capability) {
    return MODEL_PROVIDER_OPTIONS;
  }
  return MODEL_PROVIDER_OPTIONS.filter((option) => option.capabilities.includes(capability));
}

export function getModelsForProvider(providerId: GenerationProviderId, capability?: GenerationCapability) {
  return MODEL_OPTIONS.filter(
    (option) => option.providerId === providerId && (!capability || option.capabilities.includes(capability))
  );
}

export function getDefaultModelOption(capability: GenerationCapability = 'image') {
  const defaultId = capability === 'text' ? DEFAULT_TEXT_MODEL_ID : DEFAULT_IMAGE_MODEL_ID;
  return (
    getModelOptionById(defaultId) ??
    MODEL_OPTIONS.find((option) => option.capabilities.includes(capability)) ??
    MODEL_OPTIONS[0]
  );
}
