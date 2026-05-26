export interface GeneratedImageGridImage {
  id: string;
  fileUrl: string;
  fileName: string;
}

export function GeneratedImageGrid({ images }: { images: GeneratedImageGridImage[] }) {
  if (images.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] text-sm text-[var(--muted-foreground)]">
        No generated images yet
      </div>
    );
  }

  const rows = [0, 1, 2].map((rowIndex) => images.filter((_, index) => index % 3 === rowIndex));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          data-testid={`generated-image-grid-row-${rowIndex}`}
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          {row.map((image) => (
            <div
              key={image.id}
              className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)]"
            >
              <img
                src={image.fileUrl}
                alt={image.fileName}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
