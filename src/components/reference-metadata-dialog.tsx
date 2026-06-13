import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Folder,
  Image as ImageIcon,
  TriangleAlert,
} from 'lucide-react';
import { SlotText } from 'slot-text/react';
import { chromatic } from 'slot-text';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function hasText(value: string) {
  return value.trim().length > 0;
}

export type ReferenceMetadataImageDraft = {
  id: string;
  name: string;
  title: string;
  description: string;
  previewUrl: string;
};

export type ReferenceMetadataDraft = {
  title: string;
  description: string;
  images: ReferenceMetadataImageDraft[];
};

type SaveStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

const saveStatusLabels: Record<SaveStatus, string> = {
  idle: 'Saved',
  editing: 'Editing',
  saving: 'Editing',
  saved: 'Saved',
  error: "Couldn't save",
};

function getDraftSignature(draft: ReferenceMetadataDraft) {
  return JSON.stringify(draft);
}

export function ReferenceMetadataDialog({
  open,
  initialDraft,
  initialImageId,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initialDraft: ReferenceMetadataDraft;
  initialImageId: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ReferenceMetadataDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(initialImageId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const draftRef = useRef(draft);
  const popupRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef(Promise.resolve());
  const lastQueuedSignatureRef = useRef(getDraftSignature(initialDraft));
  const wasOpenRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Only reset the draft and selection when the dialog transitions from closed
  // to open. Auto-save replaces `initialDraft` with a fresh object on every
  // keystroke, and re-running this on those changes would yank the user back to
  // the initially selected image (or the whole group) mid-edit.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setDraft(initialDraft);
    draftRef.current = initialDraft;
    setSelectedImageId(initialImageId);
    setSaveStatus('idle');
    lastQueuedSignatureRef.current = getDraftSignature(initialDraft);
  }, [initialDraft, initialImageId, open]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Tween the popup's height when its content (selected image, preview, etc.)
  // changes, so the modal resizes smoothly instead of snapping. Measuring with
  // offsetHeight ignores the open/close scale transform. The height transition
  // itself lives on `.t-modal` in index.css so it composes with scale + opacity.
  useEffect(() => {
    const popup = popupRef.current;
    const grid = gridRef.current;
    if (!open || !popup || !grid) {
      if (popup) popup.style.height = '';
      return;
    }

    const applyHeight = (animated: boolean) => {
      const start = popup.offsetHeight;
      popup.style.height = 'auto';
      const target = popup.offsetHeight;
      if (!animated) {
        popup.style.transition = 'none';
        popup.style.height = `${target}px`;
        void popup.offsetHeight;
        popup.style.transition = '';
        return;
      }
      popup.style.height = `${start}px`;
      void popup.offsetHeight;
      popup.style.height = `${target}px`;
    };

    applyHeight(false);

    let firstObservation = true;
    const observer = new ResizeObserver(() => {
      if (firstObservation) {
        firstObservation = false;
        return;
      }
      applyHeight(true);
    });
    observer.observe(grid);
    return () => {
      observer.disconnect();
      popup.style.height = '';
    };
  }, [open]);

  const queueSave = useCallback((nextDraft: ReferenceMetadataDraft) => {
    const signature = getDraftSignature(nextDraft);
    if (signature === lastQueuedSignatureRef.current) {
      return saveChainRef.current;
    }

    lastQueuedSignatureRef.current = signature;
    setSaveStatus('saving');
    const saveRequest = saveChainRef.current
      .catch(() => undefined)
      .then(() => onSave(nextDraft))
      .then(() => {
        if (lastQueuedSignatureRef.current === signature) {
          setSaveStatus('saved');
        }
      })
      .catch((error) => {
        if (lastQueuedSignatureRef.current === signature) {
          lastQueuedSignatureRef.current = '';
          setSaveStatus('error');
        }
        throw error;
      });
    saveChainRef.current = saveRequest.catch(() => undefined);
    return saveRequest;
  }, [onSave]);

  const scheduleSave = useCallback((nextDraft: ReferenceMetadataDraft) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('editing');
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void queueSave(nextDraft).catch(() => undefined);
    }, 500);
  }, [queueSave]);

  const updateDraft = useCallback((updater: (current: ReferenceMetadataDraft) => ReferenceMetadataDraft) => {
    setDraft((current) => {
      const nextDraft = updater(current);
      draftRef.current = nextDraft;
      scheduleSave(nextDraft);
      return nextDraft;
    });
  }, [scheduleSave]);

  const requestClose = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await queueSave(draftRef.current);
    } catch {
      return;
    }
    onOpenChange(false);
  }, [onOpenChange, queueSave]);

  const selectedImage = draft.images.find((image) => image.id === selectedImageId) ?? null;
  const activeTitle = selectedImage ? selectedImage.title : draft.title;
  const activeDescription = selectedImage ? selectedImage.description : draft.description;
  const describedCount = draft.images.filter((image) => hasText(image.description)).length;

  function updateActiveMetadata(field: 'title' | 'description', value: string) {
    updateDraft((current) => {
      if (!selectedImageId) {
        return { ...current, [field]: value };
      }
      return {
        ...current,
        images: current.images.map((image) =>
          image.id === selectedImageId ? { ...image, [field]: value } : image
        ),
      };
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        void requestClose();
      }}
    >
      <DialogContent ref={popupRef} className="max-h-[min(820px,calc(100vh-32px))] max-w-[min(1120px,calc(100vw-32px))] overflow-hidden border-white/8 bg-[rgba(15,16,16,0.96)] p-0 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit reference metadata</DialogTitle>
          <DialogDescription>Name references and explain when each visual should be used.</DialogDescription>
        </DialogHeader>

        <div ref={gridRef} className="grid min-h-[640px] grid-cols-[minmax(300px,0.85fr)_minmax(420px,1.15fr)]">
          <aside className="flex min-h-0 flex-col border-r border-[var(--border-soft)] bg-[rgba(7,7,7,0.42)]">
            <div className="border-b border-[var(--border-soft)] px-5 pb-5 pt-5">
              <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                {draft.title || 'Untitled group'}
              </h2>
              <p className="mt-1 text-[12px] leading-5 text-[var(--muted-foreground)]">
                Pick what to edit, then describe it. Changes save automatically.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-4">
              <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Whole group
              </p>
              <button
                type="button"
                onClick={() => setSelectedImageId(null)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-left transition-colors',
                  selectedImageId === null
                    ? 'border-[var(--accent)] bg-[var(--surface2)]'
                    : 'border-transparent hover:border-white/8 hover:bg-white/4'
                )}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-white/6 text-[var(--muted-foreground)]">
                  <Folder className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">
                    Group guidance
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)]">
                    Applies to all {draft.images.length} {draft.images.length === 1 ? 'image' : 'images'}
                  </span>
                </span>
                {hasText(draft.description) ? (
                  <Check className="size-4 shrink-0 text-[var(--accent)]" />
                ) : null}
              </button>

              {draft.images.length > 0 ? (
                <p className="px-2 pb-2 pt-5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Per image · {describedCount}/{draft.images.length} described
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                {draft.images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`Edit ${image.name}`}
                    onClick={() => setSelectedImageId(image.id)}
                    className={cn(
                      'group relative overflow-hidden rounded-[16px] border bg-[var(--surface2)] text-left transition-[border-color,background-color]',
                      selectedImageId === image.id
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border-soft)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    {hasText(image.description) ? (
                      <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-sm">
                        <Check className="size-3" />
                      </span>
                    ) : null}
                    <div className="px-2.5 py-2">
                      <span className="block truncate text-[12px] font-medium text-[var(--foreground)]">
                        {image.title || image.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-7 pb-4 pt-6 pr-16 text-[13px] text-[var(--muted-foreground)]">
              <span className="inline-flex items-center gap-1.5">
                <Folder className="size-3.5" />
                {draft.title || 'Untitled group'}
              </span>
              {selectedImage ? (
                <>
                  <ChevronRight className="size-3.5 opacity-60" />
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                    <ImageIcon className="size-3.5" />
                    {selectedImage.name}
                  </span>
                </>
              ) : (
                <span className="font-medium text-[var(--foreground)]">· editing shared guidance</span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-7 py-7">
              <div className="mx-auto flex max-w-[620px] flex-col gap-7">
                {selectedImage ? (
                  <div className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface2)]">
                    <img
                      src={selectedImage.previewUrl}
                      alt={`${selectedImage.name} preview`}
                      className="max-h-[260px] w-full object-contain"
                    />
                  </div>
                ) : null}

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {selectedImage ? 'Image name' : 'Reference group name'}
                  </span>
                  <input
                    aria-label={selectedImage ? 'Image name' : 'Reference group name'}
                    value={activeTitle}
                    onChange={(event) => updateActiveMetadata('title', event.target.value)}
                    className="h-12 rounded-[18px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-4 text-[14px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-[var(--foreground)]">
                    {selectedImage ? 'When to use this image' : 'When to use this reference group'}
                  </span>
                  <textarea
                    aria-label={selectedImage ? 'When to use this image' : 'When to use this reference group'}
                    value={activeDescription}
                    onChange={(event) => updateActiveMetadata('description', event.target.value)}
                    placeholder={
                      selectedImage
                        ? 'Describe the angle, detail, pose, or situation where this image should guide generation.'
                        : 'Describe the identity, subject, or situations where this group should be used.'
                    }
                    className="min-h-[180px] resize-none rounded-[24px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-5 py-4 text-[14px] leading-6 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
                  />
                  <span className="text-[12px] leading-5 text-[var(--muted-foreground)]">
                    This guidance is included when the reference is used for generation.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[var(--border-soft)] px-7 py-4">
              <div
                role="status"
                aria-label={saveStatusLabels[saveStatus]}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px]',
                  saveStatus === 'error'
                    ? 'border border-[rgba(229,112,112,0.24)] bg-[rgba(190,58,58,0.12)] text-[rgb(245,178,178)]'
                    : 'text-[var(--muted-foreground)]'
                )}
              >
                {saveStatus === 'error' ? <TriangleAlert className="size-3.5" /> : null}
                <SlotText
                  text={saveStatusLabels[saveStatus]}
                  options={{ color: chromatic() }}
                />
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
