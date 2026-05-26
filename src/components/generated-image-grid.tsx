import type { CSSProperties } from 'react';
import { useMemo, useRef, useEffect, useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Copy, Download, Trash2 } from 'lucide-react';

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
  isLoading?: boolean;
}

const COLUMN_COUNT = 3;
const ROW_HEIGHT = 220;
const ROW_GAP = 12;
const OVERSCAN_ROWS = 2;
const DOUBLE_CLICK_DELAY_MS = 200;

interface GeneratedImageGridRowProps {
  rows: GeneratedImageGridImage[][];
  selectedImageIds: string[];
  onImageSelect?: (image: GeneratedImageGridImage) => void;
  onImageOpen?: (image: GeneratedImageGridImage) => void;
  onImageClick?: (image: GeneratedImageGridImage) => void;
  onImageDoubleClick?: (image: GeneratedImageGridImage) => void;
  onImageCopy?: (image: GeneratedImageGridImage) => void;
  onImageDownload?: (image: GeneratedImageGridImage) => void;
  onImageDelete?: (image: GeneratedImageGridImage) => void;
}

function GeneratedImageGridRow({
  index,
  style,
  rows,
  selectedImageIds,
  onImageClick,
  onImageDoubleClick,
  onImageCopy,
  onImageDownload,
  onImageDelete,
}: RowComponentProps<GeneratedImageGridRowProps>) {
  const row = rows[index] ?? [];

  return (
    <div
      data-testid={`generated-image-grid-row-${index}`}
      className="grid grid-cols-3 gap-3 px-4 py-1.5 sm:px-6"
      style={style as CSSProperties}
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
                'pointer-events-auto relative h-[220px] overflow-hidden rounded-[20px] bg-[var(--surface)]/50 text-left transition-[border-color,box-shadow,transform,opacity] duration-200',
                'border',
                selectedImageIds.includes(image.id)
                  ? 'border-[var(--accent)] shadow-[0_0_0_1px_rgba(65,130,230,0.5)]'
                  : 'border-transparent hover:border-white/10',
                image.isLoading ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {image.isLoading ? (
                <div
                  aria-label={`${image.fileName} loading`}
                  className="animate-skeleton-shimmer h-full w-full bg-[linear-gradient(110deg,rgba(32,32,33,0.45)_20%,rgba(66,66,70,0.92)_50%,rgba(32,32,33,0.45)_80%)] bg-[length:220%_100%]"
                />
              ) : (
                <img
                  src={image.fileUrl}
                  alt={image.fileName}
                  className="h-full w-full object-cover opacity-90"
                />
              )}
            </button>
          </ContextMenuTrigger>
          {!image.isLoading ? (
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onImageCopy?.(image)}>
                <Copy className="mr-2 size-3.5" />
                Copy
              </ContextMenuItem>
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
      {row.length < COLUMN_COUNT
        ? Array.from({ length: COLUMN_COUNT - row.length }, (_, columnIndex) => (
            <div key={`empty-${index}-${columnIndex}`} className="h-[220px]" aria-hidden="true" />
          ))
        : null}
    </div>
  );
}

export function GeneratedImageGrid({
  images,
  className = '',
  selectedImageIds = [],
  onImageSelect,
  onImageOpen,
  onImageCopy,
  onImageDownload,
  onImageDelete,
}: {
  images: GeneratedImageGridImage[];
  className?: string;
  selectedImageIds?: string[];
  onImageSelect?: (image: GeneratedImageGridImage) => void;
  onImageOpen?: (image: GeneratedImageGridImage) => void;
  onImageCopy?: (image: GeneratedImageGridImage) => void;
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
    for (let index = 0; index < images.length; index += COLUMN_COUNT) {
      value.push(images.slice(index, index + COLUMN_COUNT));
    }
    return value;
  }, [images]);

  return (
    <List
      rowComponent={GeneratedImageGridRow}
      rowCount={rows.length}
      rowHeight={ROW_HEIGHT + ROW_GAP}
      rowProps={{
        rows,
        selectedImageIds,
        onImageClick: handleImageClick,
        onImageDoubleClick: handleImageDoubleClick,
        onImageCopy,
        onImageDownload,
        onImageDelete,
      }}
      overscanCount={OVERSCAN_ROWS}
      className={className}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
