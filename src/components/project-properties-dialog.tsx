import { Settings2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const artStyleOptions = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'realism', label: 'Realism' },
  { value: 'photoreal', label: 'Photoreal' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: '3d-render', label: '3D Render' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'concept-art', label: 'Concept Art' },
  { value: 'pixel-art', label: 'Pixel Art' },
] as const;

export interface ProjectPropertiesDraft {
  systemInstructions: string;
  artStyle: string;
}

export function ProjectPropertiesDialog({
  open,
  projectName,
  draft,
  isSaving,
  onDraftChange,
  onOpenChange,
  onOpenChangeComplete,
  onSave,
}: {
  open: boolean;
  projectName: string;
  draft: ProjectPropertiesDraft;
  isSaving: boolean;
  onDraftChange: (draft: ProjectPropertiesDraft) => void;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onSave: () => void;
}) {
  const tabClasses =
    'flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-[13px] transition-colors';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <DialogContent className="max-w-[min(1000px,calc(100vw-32px))] overflow-hidden border-white/8 bg-[rgba(15,16,16,0.96)] p-0 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
        <DialogHeader className="sr-only">
          <DialogTitle>{projectName}</DialogTitle>
          <DialogDescription>Edit project-level generation defaults.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[620px] flex-col md:min-h-[640px] md:flex-row">
          <aside className="w-full border-b border-[var(--border-soft)] bg-[rgba(11,12,12,0.88)] p-4 md:w-[248px] md:border-b-0 md:border-r">
            <div className="mb-5 px-2">
              <div className="text-[12px] font-medium text-[var(--muted-foreground)]">Projeto</div>
              <div className="mt-1 truncate text-[20px] font-medium text-[var(--foreground)]">
                {projectName}
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                aria-label="General"
                className={cn(
                  tabClasses,
                  'bg-[var(--surface2)] text-[var(--foreground)]'
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-[var(--foreground)]">
                  <Settings2 className="size-4" />
                </span>
                <span>
                  <span className="block text-[14px] font-medium">General</span>
                  <span className="block text-[12px] text-[var(--muted-foreground)]">
                    Project defaults
                  </span>
                </span>
              </button>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-[rgba(15,16,16,0.98)]">
            <div className="border-b border-[var(--border-soft)] px-6 py-5 md:px-8">
              <h2 className="text-[28px] font-medium tracking-[0] text-[var(--foreground)]">General</h2>
              <p className="mt-2 max-w-[640px] text-[14px] leading-6 text-[var(--muted-foreground)]">
                Define project-level defaults so Codex keeps image style choices and system guidance
                consistent for this workspace.
              </p>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 md:px-8">
              <div className="space-y-3 border-b border-[var(--border-soft)] pb-8">
                <div className="space-y-1">
                  <label
                    htmlFor="project-system-instructions"
                    className="text-[15px] font-medium text-[var(--foreground)]"
                  >
                    System Instructions
                  </label>
                  <p className="text-[13px] leading-5 text-[var(--muted-foreground)]">
                    Add stable direction about style discipline, continuity, camera behavior, or any
                    other project-wide rules Codex should follow.
                  </p>
                </div>

                <textarea
                  id="project-system-instructions"
                  value={draft.systemInstructions}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      systemInstructions: event.target.value,
                    })
                  }
                  rows={10}
                  className="w-full resize-none rounded-[26px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.82)] px-5 py-4 text-[14px] leading-6 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
                  placeholder="Describe how this project should look and behave across generations."
                />
              </div>

              <div className="grid gap-3 pb-2 md:max-w-[420px]">
                <div className="space-y-1">
                  <div className="text-[15px] font-medium text-[var(--foreground)]">
                    Art Style
                  </div>
                  <p className="text-[13px] leading-5 text-[var(--muted-foreground)]">
                    Choose the default visual language Codex should prioritize for this project.
                  </p>
                </div>

                <Select
                  value={draft.artStyle}
                  items={artStyleOptions}
                  onValueChange={(value) =>
                    onDraftChange({
                      ...draft,
                      artStyle: value ?? '',
                    })
                  }
                >
                  <SelectTrigger aria-label="Art Style">
                    <SelectValue placeholder="Choose a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Choose a style</SelectItem>
                  {artStyleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4 md:px-8">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border-soft)] px-5 text-[14px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-white/10 hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--surface2)] px-5 text-[14px] font-medium text-[var(--foreground)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save properties
              </button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
