import type { CSSProperties } from 'react';
import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Copy, Download, Trash2 } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { ImageGeneration } from 'img-fx';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ShimmerSurface } from '@/components/ai-elements/shimmer';

type GeneratedImageGridLoadingEffect = 'shimmer' | 'img-fx';

export interface GeneratedImageGridImage {
  id: string;
  fileUrl?: string;
  fileName: string;
  createdAt?: string;
  isLoading?: boolean;
  provider?: string | null;
  modelId?: string | null;
  modelLabel?: string | null;
  prompt?: string | null;
  references?: Array<{
    name: string;
    title?: string | null;
    description?: string | null;
    mimeType: string;
  }>;
  durationMs?: number | null;
  generationStartedAt?: string;
}

const COLUMN_COUNT = 3;
const ROW_HEIGHT = 220;
const ROW_GAP = 12;
const OVERSCAN_ROWS = 2;
const DOUBLE_CLICK_DELAY_MS = 200;

function formatElapsed(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDurationMs(durationMs: number | null | undefined) {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return null;
  }
  return formatElapsed(durationMs / 1000);
}

function useElapsedSeconds(startedAt: string | undefined, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !startedAt) return undefined;

    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, startedAt]);

  if (!startedAt) {
    return 0;
  }

  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - startedAtMs) / 1000));
}

function RunningDuration({ startedAt }: { startedAt?: string }) {
  const elapsedSeconds = useElapsedSeconds(startedAt, true);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <span aria-label={formatElapsed(elapsedSeconds)} className="inline-flex items-center tabular-nums">
      <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} />
      <span>:</span>
      <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
    </span>
  );
}

function GenerationMetadataBadge({ image }: { image: GeneratedImageGridImage }) {
  const modelLabel = image.modelLabel ?? image.modelId ?? null;
  const completedDuration = formatDurationMs(image.durationMs);

  if (!modelLabel && !completedDuration && !image.isLoading) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex max-w-[calc(100%-24px)] items-center gap-2 rounded-full border border-white/10 bg-[rgba(15,16,16,0.74)] px-2.5 py-1.5 text-[11px] font-medium text-white/88 shadow-[0_12px_32px_rgba(0,0,0,0.34)] opacity-100 backdrop-blur-xl transition-[opacity,transform] duration-200"
    >
      {modelLabel ? <span className="min-w-0 truncate">{modelLabel}</span> : null}
      {image.isLoading ? (
        <span className="shrink-0 text-white/60">
          <RunningDuration startedAt={image.generationStartedAt ?? image.createdAt} />
        </span>
      ) : completedDuration ? (
        <span className="shrink-0 text-white/60">{completedDuration}</span>
      ) : null}
    </div>
  );
}

interface GeneratedImageGridRowProps {
  rows: GeneratedImageGridImage[][];
  columnCount: number;
  cardHeight: number;
  loadingEffect: GeneratedImageGridLoadingEffect;
  selectedImageIds: string[];
  onImageSelect?: (image: GeneratedImageGridImage) => void;
  onImageOpen?: (image: GeneratedImageGridImage) => void;
  onImageClick?: (image: GeneratedImageGridImage) => void;
  onImageDoubleClick?: (image: GeneratedImageGridImage) => void;
  onImageCopy?: (image: GeneratedImageGridImage) => void;
  onImageCopyPrompt?: (image: GeneratedImageGridImage) => void;
  onImageDownload?: (image: GeneratedImageGridImage) => void;
  onImageDelete?: (image: GeneratedImageGridImage) => void;
}

function GeneratedImageGridRow({
  index,
  style,
  rows,
  columnCount,
  cardHeight,
  loadingEffect,
  selectedImageIds,
  onImageClick,
  onImageDoubleClick,
  onImageCopy,
  onImageCopyPrompt,
  onImageDownload,
  onImageDelete,
}: RowComponentProps<GeneratedImageGridRowProps>) {
  const row = rows[index] ?? [];

  const renderLoadingSurface = (image: GeneratedImageGridImage) => {
    if (loadingEffect === 'img-fx') {
      return (
        <ImageGeneration
          aria-label={`${image.fileName} loading`}
          className="h-full w-full"
          preset="pixels-organic"
          theme="dark"
          strength={1}
          cardBg="rgb(32, 32, 33)"
          borderRadius={28}
        >
          <div className="h-full w-full bg-[rgb(32,32,33)]" />
        </ImageGeneration>
      );
    }

    return (
      <ShimmerSurface
        aria-label={`${image.fileName} loading`}
        className="h-full w-full"
      />
    );
  };

  return (
    <div
      data-testid={`generated-image-grid-row-${index}`}
      className="grid gap-3 px-4 py-1.5 sm:px-6"
      style={{
        ...(style as CSSProperties),
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {row.map((image) => (
        <ContextMenu key={image.id}>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Select ${image.fileName}`}
              data-selected={selectedImageIds.includes(image.id)}
              onClick={() => {
                if (!image.isLoading) {
                  onImageClick?.(image);
                }
              }}
              onDoubleClick={() => {
                if (!image.isLoading) {
                  onImageDoubleClick?.(image);
                }
              }}
              className={[
                'group pointer-events-auto relative overflow-hidden rounded-[28px] bg-[var(--surface2)]/80 text-left transition-[border-color,box-shadow,transform,opacity] duration-200',
                'border',
                selectedImageIds.includes(image.id)
                  ? 'border-[var(--accent)] shadow-[0_0_0_1px_rgba(65,130,230,0.5)]'
                  : 'border-[var(--border-soft)]',
                image.isLoading ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
              style={{ height: cardHeight }}
            >
              {image.isLoading ? (
                renderLoadingSurface(image)
              ) : (
                <img
                  src={image.fileUrl}
                  alt={image.fileName}
                  className="h-full w-full object-cover opacity-90 saturate-[0.94]"
                />
              )}
              <GenerationMetadataBadge image={image} />
            </button>
          </ContextMenuTrigger>
          {!image.isLoading ? (
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onImageCopy?.(image)}>
                <Copy className="mr-2 size-3.5" />
                Copy
              </ContextMenuItem>
              {image.prompt?.trim() ? (
                <ContextMenuItem onClick={() => onImageCopyPrompt?.(image)}>
                  <Copy className="mr-2 size-3.5" />
                  Copy prompt
                </ContextMenuItem>
              ) : null}
              <ContextMenuItem onClick={() => onImageDownload?.(image)}>
                <Download className="mr-2 size-3.5" />
                Download
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                onClick={() => onImageDelete?.(image)}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          ) : null}
        </ContextMenu>
      ))}
      {row.length < columnCount
        ? Array.from({ length: columnCount - row.length }, (_, columnIndex) => (
            <div key={`empty-${index}-${columnIndex}`} style={{ height: cardHeight }} aria-hidden="true" />
          ))
        : null}
    </div>
  );
}

export function GeneratedImageGrid({
  images,
  className = '',
  columnCount = COLUMN_COUNT,
  cardHeight = ROW_HEIGHT,
  rowGap = ROW_GAP,
  loadingEffect = 'shimmer',
  fitHeight = false,
  maxFitHeight,
  selectedImageIds = [],
  onImageSelect,
  onImageOpen,
  onImageCopy,
  onImageCopyPrompt,
  onImageDownload,
  onImageDelete,
}: {
  images: GeneratedImageGridImage[];
  className?: string;
  columnCount?: number;
  cardHeight?: number;
  rowGap?: number;
  loadingEffect?: GeneratedImageGridLoadingEffect;
  fitHeight?: boolean;
  maxFitHeight?: number;
  selectedImageIds?: string[];
  onImageSelect?: (image: GeneratedImageGridImage) => void;
  onImageOpen?: (image: GeneratedImageGridImage) => void;
  onImageCopy?: (image: GeneratedImageGridImage) => void;
  onImageCopyPrompt?: (image: GeneratedImageGridImage) => void;
  onImageDownload?: (image: GeneratedImageGridImage) => void;
  onImageDelete?: (image: GeneratedImageGridImage) => void;
}) {
  if (images.length === 0) {
    return null;
  }

  const clickTimeoutsRef = useRef(new Map<string, number>());

  useEffect(() => {
    return () => {
      for (const timeoutId of clickTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      clickTimeoutsRef.current.clear();
    };
  }, []);

  const handleImageClick = useCallback((image: GeneratedImageGridImage) => {
    const existingTimeoutId = clickTimeoutsRef.current.get(image.id);
    if (existingTimeoutId !== undefined) {
      window.clearTimeout(existingTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      clickTimeoutsRef.current.delete(image.id);
      onImageSelect?.(image);
    }, DOUBLE_CLICK_DELAY_MS);

    clickTimeoutsRef.current.set(image.id, timeoutId);
  }, [onImageSelect]);

  const handleImageDoubleClick = useCallback((image: GeneratedImageGridImage) => {
    const timeoutId = clickTimeoutsRef.current.get(image.id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      clickTimeoutsRef.current.delete(image.id);
    }
    onImageOpen?.(image);
  }, [onImageOpen]);

  const rows = useMemo(() => {
    const value: GeneratedImageGridImage[][] = [];
    for (let index = 0; index < images.length; index += columnCount) {
      value.push(images.slice(index, index + columnCount));
    }
    return value;
  }, [columnCount, images]);
  const totalHeight = rows.length * (cardHeight + rowGap);
  const listHeight =
    fitHeight
      ? typeof maxFitHeight === 'number' && Number.isFinite(maxFitHeight) && maxFitHeight > 0
        ? Math.min(totalHeight, maxFitHeight)
        : totalHeight
      : '100%';

  return (
    <List
      rowComponent={GeneratedImageGridRow}
      rowCount={rows.length}
      rowHeight={cardHeight + rowGap}
      rowProps={{
        rows,
        columnCount,
        cardHeight,
        loadingEffect,
        selectedImageIds,
        onImageClick: handleImageClick,
        onImageDoubleClick: handleImageDoubleClick,
        onImageCopy,
        onImageCopyPrompt,
        onImageDownload,
        onImageDelete,
      }}
      overscanCount={OVERSCAN_ROWS}
      className={className}
      style={{ height: listHeight, width: '100%' }}
    />
  );
}
