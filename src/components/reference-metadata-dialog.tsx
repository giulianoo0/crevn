import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Folder,
  GripVertical,
  TriangleAlert,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SlotText } from "slot-text/react";
import { chromatic } from "slot-text";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { applyOrder, getImageOrder, setImageOrder } from "@/lib/reference-order";

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

type SaveStatus = "idle" | "editing" | "saving" | "saved" | "error";

const saveStatusLabels: Record<SaveStatus, string> = {
  idle: "Saved",
  editing: "Editing",
  saving: "Editing",
  saved: "Saved",
  error: "Couldn't save",
};

function getDraftSignature(draft: ReferenceMetadataDraft) {
  return JSON.stringify(draft);
}

async function downloadImageFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function copyImageFromUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

function ImageCard({
  image,
  selected,
  onSelect,
  onDelete,
  dragHandleProps,
}: {
  image: ReferenceMetadataImageDraft;
  selected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Edit ${image.name}`}
          onClick={onSelect}
          className={cn(
            "group/imgcard relative w-full overflow-hidden rounded-[14px] border bg-[var(--surface2)] text-left transition-[border-color,box-shadow,transform,opacity] duration-150",
            selected
              ? "border-[var(--accent)] ring-1 ring-[var(--accent)] opacity-90"
              : "border-[var(--border-soft)] hover:border-[var(--border-strong)]",
          )}
        >
          <img
            src={image.previewUrl}
            alt=""
            className="block w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/imgcard:scale-[1.03]"
            draggable={false}
          />
          {/* Drag handle — top-left, opposite the described check (top-right) */}
          {dragHandleProps ? (
            <div
              {...dragHandleProps}
              className="absolute left-1.5 top-1.5 z-20 inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-lg bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/imgcard:opacity-100 active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="size-3" />
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover/imgcard:opacity-100">
            <span className="block truncate text-[11px] font-medium text-white/90">
              {image.title || image.name}
            </span>
          </div>
          {hasText(image.description) ? (
            <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-sm">
              <Check className="size-3" />
            </span>
          ) : null}
          {selected ? (
            <span className="absolute inset-0 rounded-[13px] ring-2 ring-[var(--accent)] ring-inset pointer-events-none" />
          ) : null}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => { sounds.select(); void copyImageFromUrl(image.previewUrl); }}>
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { sounds.select(); void downloadImageFromUrl(image.previewUrl, image.name); }}>
          Download
        </ContextMenuItem>
        {onDelete ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
              onClick={() => { sounds.select(); onDelete(image.id); }}
            >
              Delete
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SortableImageCard({ image, selected, onSelect, onDelete }: {
  image: ReferenceMetadataImageDraft;
  selected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        opacity: isDragging ? 0.3 : 1,
      }}
      className="break-inside-avoid mb-3"
    >
      <ImageCard
        image={image}
        selected={selected}
        onSelect={onSelect}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SortableDialogListRow({
  image,
  selected,
  onSelect,
  onDelete,
}: {
  image: ReferenceMetadataImageDraft;
  selected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={isDragging ? 'opacity-95 shadow-2xl scale-[1.01]' : ''}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="group/card relative grid cursor-pointer"
            style={{ gridTemplateColumns: '1fr 2.25fr', gap: '16px' }}
            onClick={onSelect}
          >
            {/* Image */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl bg-[var(--surface2)] border transition-colors",
              selected ? "border-[var(--accent)]" : "border-[var(--border-soft)]"
            )}>
              <img
                src={image.previewUrl}
                alt=""
                className="block w-full object-cover"
                draggable={false}
              />
              {/* Drag handle — top-left, opposite action buttons (bottom-right) */}
              <div
                {...attributes}
                {...listeners}
                className="absolute left-1.5 top-1.5 z-20 inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-lg bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/card:opacity-100 active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="size-3" />
              </div>
              {selected ? (
                <span className="absolute inset-0 ring-2 ring-[var(--accent)] ring-inset pointer-events-none rounded-2xl" />
              ) : null}
            </div>
            {/* Info panel */}
            <div className="relative flex flex-col gap-2 bg-[rgba(7,7,7,0.72)] rounded-2xl p-4 pb-12 border border-[var(--border-soft)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)] leading-snug">
                {image.title || image.name}
              </p>
              {hasText(image.description) ? (
                <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.5] line-clamp-6">
                  {image.description}
                </p>
              ) : (
                <p className="text-[12px] text-[var(--muted-foreground)] italic opacity-40">
                  No description
                </p>
              )}
              {hasText(image.description) ? (
                <span className="absolute top-3 right-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-sm">
                  <Check className="size-3" />
                </span>
              ) : null}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sounds.select(); void copyImageFromUrl(image.previewUrl); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[rgba(15,16,16,0.88)] px-2 py-1 text-[11px] text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sounds.select(); void downloadImageFromUrl(image.previewUrl, image.name); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[rgba(15,16,16,0.88)] px-2 py-1 text-[11px] text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Download
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); sounds.select(); onDelete(image.id); }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(229,112,112,0.3)] bg-[rgba(15,16,16,0.88)] px-2 py-1 text-[11px] text-[rgb(229,112,112)] backdrop-blur-sm transition-colors hover:border-[rgba(229,112,112,0.6)] hover:text-[rgb(245,178,178)]"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => { sounds.select(); void copyImageFromUrl(image.previewUrl); }}>Copy</ContextMenuItem>
          <ContextMenuItem onClick={() => { sounds.select(); void downloadImageFromUrl(image.previewUrl, image.name); }}>Download</ContextMenuItem>
          {onDelete ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                onClick={() => { sounds.select(); onDelete(image.id); }}
              >
                Delete
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function MetadataPanel({
  selectedImage,
  activeTitle,
  activeDescription,
  saveStatus,
  onUpdateField,
}: {
  selectedImage: ReferenceMetadataImageDraft | null;
  activeTitle: string;
  activeDescription: string;
  saveStatus: SaveStatus;
  onUpdateField: (field: "title" | "description", value: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {selectedImage ? "Name" : "Group name"}
            </span>
            <input
              aria-label={selectedImage ? "Image name" : "Reference group name"}
              value={activeTitle}
              onChange={(e) => onUpdateField("title", e.target.value)}
              className="h-10 rounded-[14px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              When to use
            </span>
            <textarea
              aria-label={selectedImage ? "When to use this image" : "When to use this reference group"}
              value={activeDescription}
              onChange={(e) => onUpdateField("description", e.target.value)}
              rows={4}
              placeholder={selectedImage ? "Angle, detail, pose, or situation…" : "Identity, subject, or situations…"}
              className="resize-none rounded-[14px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-3 py-3 text-[13px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

export function ReferenceMetadataDialog({
  open,
  folderId,
  initialDraft,
  initialImageId,
  onOpenChange,
  onSave,
  onDeleteImage,
}: {
  open: boolean;
  folderId: string;
  initialDraft: ReferenceMetadataDraft;
  initialImageId: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ReferenceMetadataDraft) => Promise<void>;
  onDeleteImage?: (imageId: string) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    initialImageId,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
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
    // Saved order (localStorage) wins; alphabetical is the default.
    const sortedDraft = {
      ...initialDraft,
      images: applyOrder(
        initialDraft.images,
        getImageOrder(folderId),
        (img) => img.id,
        (img) => img.title || img.name,
      ),
    };
    setDraft(sortedDraft);
    draftRef.current = sortedDraft;
    setSelectedImageId(initialImageId);
    setSaveStatus("idle");
    lastQueuedSignatureRef.current = getDraftSignature(sortedDraft);
  }, [folderId, initialDraft, initialImageId, open]);

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
      if (popup) popup.style.height = "";
      return;
    }

    const applyHeight = (animated: boolean) => {
      const start = popup.offsetHeight;
      popup.style.height = "auto";
      const target = popup.offsetHeight;
      if (!animated) {
        popup.style.transition = "none";
        popup.style.height = `${target}px`;
        void popup.offsetHeight;
        popup.style.transition = "";
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
      popup.style.height = "";
    };
  }, [open]);

  const queueSave = useCallback(
    (nextDraft: ReferenceMetadataDraft) => {
      const signature = getDraftSignature(nextDraft);
      if (signature === lastQueuedSignatureRef.current) {
        return saveChainRef.current;
      }

      lastQueuedSignatureRef.current = signature;
      setSaveStatus("saving");
      const saveRequest = saveChainRef.current
        .catch(() => undefined)
        .then(() => onSave(nextDraft))
        .then(() => {
          if (lastQueuedSignatureRef.current === signature) {
            setSaveStatus("saved");
          }
        })
        .catch((error) => {
          if (lastQueuedSignatureRef.current === signature) {
            lastQueuedSignatureRef.current = "";
            setSaveStatus("error");
          }
          throw error;
        });
      saveChainRef.current = saveRequest.catch(() => undefined);
      return saveRequest;
    },
    [onSave],
  );

  const scheduleSave = useCallback(
    (nextDraft: ReferenceMetadataDraft) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("editing");
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void queueSave(nextDraft).catch(() => undefined);
      }, 500);
    },
    [queueSave],
  );

  const updateDraft = useCallback(
    (updater: (current: ReferenceMetadataDraft) => ReferenceMetadataDraft) => {
      setDraft((current) => {
        const nextDraft = updater(current);
        draftRef.current = nextDraft;
        scheduleSave(nextDraft);
        return nextDraft;
      });
    },
    [scheduleSave],
  );

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

  const [zoom, setZoom] = useState(72);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  const selectedImage =
    draft.images.find((image) => image.id === selectedImageId) ?? null;
  const activeTitle = selectedImage ? selectedImage.title : draft.title;
  const activeDescription = selectedImage
    ? selectedImage.description
    : draft.description;
  const describedCount = draft.images.filter((image) =>
    hasText(image.description),
  ).length;

  const handleDelete = useCallback((imageId: string) => {
    updateDraft((current) => ({
      ...current,
      images: current.images.filter((img) => img.id !== imageId),
    }));
    if (selectedImageId === imageId) setSelectedImageId(null);
    onDeleteImage?.(imageId);
  }, [onDeleteImage, selectedImageId, updateDraft]);

  const handleImageDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    updateDraft((current) => {
      const ids = current.images.map((img) => img.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1) return current;
      const images = arrayMove(current.images, from, to);
      // Persist order so it survives a restart and matches the workspace views.
      setImageOrder(folderId, images.map((img) => img.id));
      return { ...current, images };
    });
  }, [folderId, updateDraft]);

  function updateActiveMetadata(field: "title" | "description", value: string) {
    updateDraft((current) => {
      if (!selectedImageId) {
        return { ...current, [field]: value };
      }
      return {
        ...current,
        images: current.images.map((image) =>
          image.id === selectedImageId ? { ...image, [field]: value } : image,
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
      <DialogContent
        ref={popupRef}
        className="h-[90vh] max-w-[90vw] overflow-hidden border-white/8 bg-[rgba(15,16,16,0.96)] p-0 shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Edit reference metadata</DialogTitle>
          <DialogDescription>
            Name references and explain when each visual should be used.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={gridRef}
          className="h-full flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-[var(--border-soft)] px-6 pb-4 pt-5 flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedImageId(null)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                selectedImageId === null
                  ? "border-[var(--accent)] bg-[var(--surface2)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:border-white/8 hover:bg-white/4 hover:text-[var(--foreground)]",
              )}
            >
              <Folder className="size-3.5" />
              <span>{draft.title || "Untitled group"}</span>
              {hasText(draft.description) ? (
                <Check className="size-3 text-[var(--accent)]" />
              ) : null}
            </button>
            {draft.images.length > 0 ? (
              <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                {describedCount}/{draft.images.length} described
              </span>
            ) : null}

            {/* Grid/List tab group */}
            <div className="relative inline-grid h-8 grid-cols-2 items-center rounded-full bg-[rgba(15,16,16,0.88)] p-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ x: viewMode === 'grid' ? '0%' : '100%' }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-1 left-1 top-1 w-[calc((100%_-_8px)/2)] rounded-full bg-[var(--border-soft)]"
              />
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "relative z-10 inline-flex h-6 min-w-[52px] items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors duration-200 capitalize",
                    viewMode === mode
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  {mode === 'grid' ? 'Grid' : 'List'}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {viewMode === 'grid' ? (
                <>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{zoom}%</span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-24 h-1 cursor-pointer accent-[var(--accent)]"
                    aria-label="Image size"
                  />
                </>
              ) : null}
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              {viewMode === 'grid' ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="h-full grid grid-cols-[4fr_1fr]"
                >
                  <aside className="flex min-h-0 flex-col border-r border-[var(--border-soft)] bg-[rgba(7,7,7,0.42)] overflow-y-auto">
                    <div className="p-4">
                      <DndContext
                        sensors={dndSensors}
                        collisionDetection={closestCenter}
                        onDragStart={(e) => setActiveDragId(String(e.active.id))}
                        onDragEnd={handleImageDragEnd}
                        onDragCancel={() => setActiveDragId(null)}
                      >
                        <SortableContext items={draft.images.map((img) => img.id)} strategy={rectSortingStrategy}>
                          <div
                            className="columns-[var(--col-w)] gap-3"
                            style={{ '--col-w': `${Math.round(180 + zoom * 5)}px` } as React.CSSProperties}
                          >
                            {draft.images.map((image) => (
                              <SortableImageCard
                                key={image.id}
                                image={image}
                                selected={selectedImageId === image.id}
                                onSelect={() => setSelectedImageId(image.id)}
                                onDelete={onDeleteImage ? handleDelete : undefined}
                              />
                            ))}
                          </div>
                        </SortableContext>
                        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.22,1,0.36,1)' }}>
                          {activeDragId ? (() => {
                            const img = draft.images.find((x) => x.id === activeDragId);
                            if (!img) return null;
                            return (
                              <div style={{ width: `${Math.round(180 + zoom * 5)}px` }} className="overflow-hidden rounded-[14px] border border-[var(--accent)] bg-[var(--surface2)] shadow-2xl rotate-1 scale-[1.04] opacity-95">
                                <img src={img.previewUrl} alt="" className="block w-full object-cover" draggable={false} />
                              </div>
                            );
                          })() : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  </aside>
                  <MetadataPanel
                    selectedImage={selectedImage}
                    activeTitle={activeTitle}
                    activeDescription={activeDescription}
                    saveStatus={saveStatus}
                    onUpdateField={updateActiveMetadata}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="h-full overflow-y-auto"
                >
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveDragId(String(e.active.id))}
                    onDragEnd={handleImageDragEnd}
                    onDragCancel={() => setActiveDragId(null)}
                  >
                    <SortableContext items={draft.images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-3 p-4">
                        {draft.images.map((image) => (
                          <SortableDialogListRow
                            key={image.id}
                            image={image}
                            selected={selectedImageId === image.id}
                            onSelect={() => setSelectedImageId(image.id === selectedImageId ? null : image.id)}
                            onDelete={onDeleteImage ? handleDelete : undefined}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-[var(--border-soft)] px-7 py-4 shrink-0">
            <div
              role="status"
              aria-label={saveStatusLabels[saveStatus]}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px]",
                saveStatus === "error"
                  ? "border border-[rgba(229,112,112,0.24)] bg-[rgba(190,58,58,0.12)] text-[rgb(245,178,178)]"
                  : "text-[var(--muted-foreground)]",
              )}
            >
              {saveStatus === "error" ? (
                <TriangleAlert className="size-3.5" />
              ) : null}
              <SlotText
                text={saveStatusLabels[saveStatus]}
                options={{ color: chromatic() }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
