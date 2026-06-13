import type { SyntheticEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import codexIcon from '@/assets/codex.svg';
import geminiIcon from '@/assets/gemini.svg';
import {
  getModelsForProvider,
  getProviderOptions,
  getProviderOptionById,
  type GenerationCapability,
  type GenerationProviderId,
  type ModelOption,
} from '@/lib/model-catalog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const providerIcons: Record<GenerationProviderId, string> = {
  codex: codexIcon,
  google: geminiIcon,
};

type ModelPickerProps = {
  capability: GenerationCapability;
  isOpen: boolean;
  selectedModel: ModelOption;
  selectedProviderId: GenerationProviderId;
  onOpenChange: (open: boolean) => void;
  onProviderChange: (providerId: GenerationProviderId) => void;
  onModelSelect: (modelId: string) => void;
  onKeepOpen: (event?: Event | SyntheticEvent) => void;
};

export function ModelPicker({
  capability,
  isOpen,
  selectedModel,
  selectedProviderId,
  onOpenChange,
  onProviderChange,
  onModelSelect,
  onKeepOpen,
}: ModelPickerProps) {
  const provider = getProviderOptionById(selectedProviderId);
  const providers = getProviderOptions(capability);
  const models = getModelsForProvider(selectedProviderId, capability);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Model ${selectedModel.label}`}
          onMouseDown={onKeepOpen}
          className="pointer-events-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-3 text-[13px] font-medium text-[var(--foreground)] backdrop-blur-xl transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]"
        >
          <img
            src={providerIcons[selectedProviderId]}
            alt=""
            aria-hidden="true"
            className="size-4 shrink-0 rounded-[4px] object-contain"
          />
          <span className="max-w-[172px] truncate">{selectedModel.label}</span>
          <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={12}
        className="w-[338px] overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[rgba(12,12,13,0.88)] p-0 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseDown={onKeepOpen}
      >
        <div className="flex min-h-[220px]">
          <div className="flex w-[68px] flex-col items-center gap-2 border-r border-white/6 bg-[rgba(255,255,255,0.02)] px-2 py-3">
            {providers.map((entry) => {
              const isSelected = entry.id === selectedProviderId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-label={entry.label}
                  onMouseDown={onKeepOpen}
                  onClick={() => onProviderChange(entry.id)}
                  className={[
                    'inline-flex size-11 items-center justify-center rounded-[14px] border transition-colors',
                    isSelected
                      ? 'border-white/10 bg-[rgba(255,255,255,0.08)]'
                      : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/4',
                  ].join(' ')}
                >
                  <img
                    src={providerIcons[entry.id]}
                    alt=""
                    aria-hidden="true"
                    className="size-6 object-contain"
                  />
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 px-3 py-3">
            <div className="mb-2 flex items-center gap-2 px-2">
              <img
                src={providerIcons[selectedProviderId]}
                alt=""
                aria-hidden="true"
                className="size-4 object-contain"
              />
              <span className="text-[12px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                {provider?.label ?? 'Models'}
              </span>
            </div>

            <div className="space-y-1">
              {models.map((model) => {
                const isSelected = model.id === selectedModel.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    aria-label={model.label}
                    onMouseDown={onKeepOpen}
                    onClick={() => {
                      onModelSelect(model.id);
                      onOpenChange(false);
                    }}
                    className={[
                      'flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-white/8 ring-1 ring-white/10' : 'hover:bg-white/4',
                    ].join(' ')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[var(--foreground)]">
                        {model.label}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--muted-foreground)]">
                        {provider?.label}
                      </span>
                    </span>
                    <span
                      className={[
                        'inline-flex size-4 items-center justify-center text-[var(--foreground)] transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
