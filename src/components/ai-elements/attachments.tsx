import { FileText, Image as ImageIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export interface AttachmentRecord {
  name: string;
  title?: string | null;
  description?: string | null;
  mimeType: string;
  previewUrl?: string | null;
}

export type AttachmentsProps = ComponentProps<'div'>;

export function Attachments({ className, ...props }: AttachmentsProps) {
  return (
    <div
      className={cn('flex max-w-full flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export interface AttachmentProps extends Omit<ComponentProps<'div'>, 'children'> {
  attachment: AttachmentRecord;
}

export function Attachment({ attachment, className, ...props }: AttachmentProps) {
  const label = attachment.title?.trim() || attachment.name;
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-[220px] items-center gap-2 overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)]/80 p-1.5 text-[12px] text-[var(--foreground)]',
        className
      )}
      title={attachment.description?.trim() || label}
      {...props}
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-[var(--surface)] text-[var(--muted-foreground)]">
        {isImage && attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={label}
            className="h-full w-full object-cover opacity-90"
          />
        ) : isImage ? (
          <ImageIcon className="size-4" />
        ) : (
          <FileText className="size-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium">{label}</div>
        <div className="truncate text-[11px] text-[var(--muted-foreground)]">{attachment.mimeType}</div>
      </div>
    </div>
  );
}
