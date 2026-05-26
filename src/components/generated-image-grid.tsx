import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { List, type RowComponentProps } from 'react-window';

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

interface GeneratedImageGridRowProps {
  rows: GeneratedImageGridImage[][];
}

function GeneratedImageGridRow({
  index,
  style,
  rows,
}: RowComponentProps<GeneratedImageGridRowProps>) {
  const row = rows[index] ?? [];

  return (
    <div
      data-testid={`generated-image-grid-row-${index}`}
      className="grid grid-cols-3 gap-3 px-4 py-1.5 sm:px-6"
      style={style as CSSProperties}
    >
      {row.map((image) => (
        <div
          key={image.id}
          className="relative h-[220px] overflow-hidden rounded-[20px] bg-[var(--surface)]/50"
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
        </div>
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
}: {
  images: GeneratedImageGridImage[];
  className?: string;
}) {
  if (images.length === 0) {
    return null;
  }

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
      rowProps={{ rows }}
      overscanCount={OVERSCAN_ROWS}
      className={['pointer-events-none', className].join(' ')}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
