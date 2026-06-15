import type { CSSProperties } from 'react';
import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Copy, Download, Star, Trash2 } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { BorderBeam } from 'border-beam';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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
  favorite?: boolean;
}

export type GeneratedImageGridVariant = 'uniform' | 'mosaic';

const COLUMN_COUNT = 3;
const ROW_HEIGHT = 220;
const ROW_GAP = 12;
const OVERSCAN_ROWS = 2;
const DOUBLE_CLICK_DELAY_MS = 200;

// Mosaic layout: a deterministic, repeating set of tile templates that mixes a
// hero tile, full-width "bands" and panoramic wide tiles. The pattern repeats
// every few blocks so the grid stays organized and scannable while feeling far
// less static than a uniform grid. The vertical unit is the height of a single
// (1x1) tile; hero tiles span two of these units.
const MOSAIC_UNIT = 230;
const MOSAIC_GAP = 12;
const MOSAIC_VERTICAL_PADDING = 12;

interface MosaicCell {
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}

interface MosaicTemplate {
  name: string;
  rows: number;
  count: number;
  cells: MosaicCell[];
}

// Designed for a 3-column grid. The cycle alternates the hero side and threads
// in breather "band" rows and panoramic wides so the eye keeps moving.
const MOSAIC_TEMPLATES: MosaicTemplate[] = [
  {
    name: 'heroLeft',
    rows: 2,
    count: 3,
    cells: [
      { col: 1, row: 1, colSpan: 2, rowSpan: 2 },
      { col: 3, row: 1 },
      { col: 3, row: 2 },
    ],
  },
  {
    name: 'band',
    rows: 1,
    count: 3,
    cells: [
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 3, row: 1 },
    ],
  },
  {
    name: 'wideRight',
    rows: 1,
    count: 2,
    cells: [
      { col: 1, row: 1 },
      { col: 2, row: 1, colSpan: 2 },
    ],
  },
  {
    name: 'heroRight',
    rows: 2,
    count: 3,
    cells: [
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 1, colSpan: 2, rowSpan: 2 },
    ],
  },
  {
    name: 'band',
    rows: 1,
    count: 3,
    cells: [
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 3, row: 1 },
    ],
  },
  {
    name: 'wideLeft',
    rows: 1,
    count: 2,
    cells: [
      { col: 1, row: 1, colSpan: 2 },
      { col: 3, row: 1 },
    ],
  },
];

interface MosaicBlock {
  template: MosaicTemplate;
  images: GeneratedImageGridImage[];
}

function buildMosaicBlocks(
  images: GeneratedImageGridImage[],
  columnCount: number,
): MosaicBlock[] {
  const blocks: MosaicBlock[] = [];
  let cursor = 0;
  let templateIndex = 0;

  while (cursor < images.length) {
    const remaining = images.length - cursor;
    const template = MOSAIC_TEMPLATES[templateIndex % MOSAIC_TEMPLATES.length];

    if (template.count <= remaining) {
      blocks.push({ template, images: images.slice(cursor, cursor + template.count) });
      cursor += template.count;
      templateIndex += 1;
      continue;
    }

    // Tail: fewer images than the next template needs. Lay the rest out as a
    // simple wrapping band so we never leave a giant hero with a single tile.
    const rows = Math.max(1, Math.ceil(remaining / columnCount));
    const cells: MosaicCell[] = Array.from({ length: remaining }, (_, index) => ({
      col: (index % columnCount) + 1,
      row: Math.floor(index / columnCount) + 1,
    }));
    blocks.push({
      template: { name: 'tail', rows, count: remaining, cells },
      images: images.slice(cursor),
    });
    break;
  }

  return blocks;
}

function mosaicBlockHeight(block: MosaicBlock): number {
  const { rows } = block.template;
  return rows * MOSAIC_UNIT + (rows - 1) * MOSAIC_GAP + MOSAIC_VERTICAL_PADDING;
}

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

function LoadingDurationCounter({ startedAt }: { startedAt?: string }) {
  const elapsedSeconds = useElapsedSeconds(startedAt, true);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <span
      aria-label={formatElapsed(elapsedSeconds)}
      className="inline-flex items-center text-[44px] font-semibold leading-none tabular-nums text-[var(--foreground)]"
    >
      <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} />
      <span className="px-1 text-[var(--muted-foreground)]">:</span>
      <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
    </span>
  );
}

function GenerationMetadataBadge({ image }: { image: GeneratedImageGridImage }) {
  const modelLabel = image.modelLabel ?? image.modelId ?? null;
  const completedDuration = formatDurationMs(image.durationMs);

  if (!modelLabel && !completedDuration) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex max-w-[calc(100%-24px)] items-center gap-2 px-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
    >
      {modelLabel ? <span className="min-w-0 truncate">{modelLabel}</span> : null}
      {completedDuration ? (
        <span className="shrink-0 text-white/70">{completedDuration}</span>
      ) : null}
    </div>
  );
}

function LoadingSurface({ image }: { image: GeneratedImageGridImage }) {
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant="colorful"
      theme="dark"
      strength={1}
      duration={2.4}
      borderRadius={18}
      className="h-full w-full"
    >
      <div
        aria-label={`${image.fileName} loading`}
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[rgb(32,32,33)] px-5 text-center"
      >
        <LoadingDurationCounter startedAt={image.generationStartedAt ?? image.createdAt} />
      </div>
    </BorderBeam>
  );
}

interface ImageCellHandlers {
  onImageClick?: (image: GeneratedImageGridImage) => void;
  onImageDoubleClick?: (image: GeneratedImageGridImage) => void;
  onImageCopy?: (image: GeneratedImageGridImage) => void;
  onImageCopyPrompt?: (image: GeneratedImageGridImage) => void;
  onImageDownload?: (image: GeneratedImageGridImage) => void;
  onImageDelete?: (image: GeneratedImageGridImage) => void;
}

function GeneratedImageCell({
  image,
  selected,
  style,
  onImageClick,
  onImageDoubleClick,
  onImageCopy,
  onImageCopyPrompt,
  onImageDownload,
  onImageDelete,
}: {
  image: GeneratedImageGridImage;
  selected: boolean;
  style?: CSSProperties;
} & ImageCellHandlers) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Select ${image.fileName}`}
          data-selected={selected}
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
            'group pointer-events-auto relative h-full w-full overflow-hidden rounded-[18px] bg-[var(--surface2)]/80 text-left transition-[border-color,box-shadow,transform,opacity] duration-200',
            selected
              ? 'border-[3px] border-[var(--accent)] shadow-[0_0_0_2px_rgba(65,130,230,0.55)]'
              : 'border border-[var(--border-soft)]',
            image.isLoading ? 'cursor-default' : 'cursor-pointer',
          ].join(' ')}
          style={style}
        >
          {image.isLoading ? (
            <LoadingSurface image={image} />
          ) : (
            <img
              src={image.fileUrl}
              alt={image.fileName}
              className="h-full w-full object-cover opacity-90 saturate-[0.94]"
            />
          )}
          {!image.isLoading ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          ) : null}
          {!image.isLoading ? <GenerationMetadataBadge image={image} /> : null}
          {!image.isLoading && image.favorite ? (
            <span
              className="pointer-events-none absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(15,16,16,0.74)] text-[rgb(255,205,90)] shadow-[0_8px_24px_rgba(0,0,0,0.34)] backdrop-blur-xl"
              aria-label="Favorited"
            >
              <Star className="size-3.5 fill-current" />
            </span>
          ) : null}
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
  );
}

interface GeneratedImageGridRowProps extends ImageCellHandlers {
  rows: GeneratedImageGridImage[][];
  columnCount: number;
  cardHeight: number;
  selectedImageIds: string[];
}

function GeneratedImageGridRow({
  index,
  style,
  rows,
  columnCount,
  cardHeight,
  selectedImageIds,
  onImageClick,
  onImageDoubleClick,
  onImageCopy,
  onImageCopyPrompt,
  onImageDownload,
  onImageDelete,
}: RowComponentProps<GeneratedImageGridRowProps>) {
  const row = rows[index] ?? [];

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
        <GeneratedImageCell
          key={image.id}
          image={image}
          selected={selectedImageIds.includes(image.id)}
          style={{ height: cardHeight }}
          onImageClick={onImageClick}
          onImageDoubleClick={onImageDoubleClick}
          onImageCopy={onImageCopy}
          onImageCopyPrompt={onImageCopyPrompt}
          onImageDownload={onImageDownload}
          onImageDelete={onImageDelete}
        />
      ))}
      {row.length < columnCount
        ? Array.from({ length: columnCount - row.length }, (_, columnIndex) => (
            <div key={`empty-${index}-${columnIndex}`} style={{ height: cardHeight }} aria-hidden="true" />
          ))
        : null}
    </div>
  );
}

interface MosaicRowProps extends ImageCellHandlers {
  blocks: MosaicBlock[];
  columnCount: number;
  selectedImageIds: string[];
}

function MosaicRow({
  index,
  style,
  blocks,
  columnCount,
  selectedImageIds,
  onImageClick,
  onImageDoubleClick,
  onImageCopy,
  onImageCopyPrompt,
  onImageDownload,
  onImageDelete,
}: RowComponentProps<MosaicRowProps>) {
  const block = blocks[index];
  if (!block) {
    return null;
  }
  const { template } = block;

  return (
    <div
      data-testid={`generated-image-mosaic-block-${index}`}
      data-template={template.name}
      className="px-4 py-1.5 sm:px-6"
      style={style as CSSProperties}
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${template.rows}, ${MOSAIC_UNIT}px)`,
          gap: MOSAIC_GAP,
        }}
      >
        {block.images.map((image, imageIndex) => {
          const cell = template.cells[imageIndex];
          const placement: CSSProperties = cell
            ? {
                gridColumn: `${cell.col} / span ${cell.colSpan ?? 1}`,
                gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
              }
            : {};
          return (
            <GeneratedImageCell
              key={image.id}
              image={image}
              selected={selectedImageIds.includes(image.id)}
              style={placement}
              onImageClick={onImageClick}
              onImageDoubleClick={onImageDoubleClick}
              onImageCopy={onImageCopy}
              onImageCopyPrompt={onImageCopyPrompt}
              onImageDownload={onImageDownload}
              onImageDelete={onImageDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

export function GeneratedImageGrid({
  images,
  className = '',
  columnCount = COLUMN_COUNT,
  cardHeight = ROW_HEIGHT,
  rowGap = ROW_GAP,
  variant = 'uniform',
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
  variant?: GeneratedImageGridVariant;
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

  // The mosaic variant assumes a 3-column tile system; fall back to the uniform
  // grid for any other column count.
  const useMosaic = variant === 'mosaic' && columnCount === COLUMN_COUNT;

  const blocks = useMemo(
    () => (useMosaic ? buildMosaicBlocks(images, columnCount) : []),
    [useMosaic, images, columnCount],
  );

  const rows = useMemo(() => {
    if (useMosaic) return [];
    const value: GeneratedImageGridImage[][] = [];
    for (let index = 0; index < images.length; index += columnCount) {
      value.push(images.slice(index, index + columnCount));
    }
    return value;
  }, [useMosaic, columnCount, images]);

  if (useMosaic) {
    const totalHeight = blocks.reduce((sum, block) => sum + mosaicBlockHeight(block), 0);
    const listHeight =
      fitHeight
        ? typeof maxFitHeight === 'number' && Number.isFinite(maxFitHeight) && maxFitHeight > 0
          ? Math.min(totalHeight, maxFitHeight)
          : totalHeight
        : '100%';

    return (
      <List
        rowComponent={MosaicRow}
        rowCount={blocks.length}
        rowHeight={(index: number) => mosaicBlockHeight(blocks[index])}
        rowProps={{
          blocks,
          columnCount,
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
