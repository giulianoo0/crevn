import { Check, Code2, LoaderCircle, XCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ToolCallProps extends ComponentProps<'div'> {
  name: string;
  status?: ToolStatus;
  input?: unknown;
  children?: ReactNode;
}

function ToolStatusIcon({ status }: { status: ToolStatus }) {
  if (status === 'running') {
    return <LoaderCircle className="size-3.5 animate-spin" />;
  }
  if (status === 'failed') {
    return <XCircle className="size-3.5" />;
  }
  if (status === 'completed') {
    return <Check className="size-3.5" />;
  }
  return <Code2 className="size-3.5" />;
}

export function ToolCall({
  name,
  status = 'completed',
  input,
  children,
  className,
  ...props
}: ToolCallProps) {
  const hasInput = input !== undefined;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)]/72 text-[13px] text-[var(--foreground)] backdrop-blur-xl',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface2)] text-[var(--muted-foreground)]">
            <ToolStatusIcon status={status} />
          </span>
          <span className="truncate font-medium">{name}</span>
        </div>
        <span className="shrink-0 text-[11px] capitalize text-[var(--muted-foreground)]">{status}</span>
      </div>
      {hasInput || children ? (
        <div className="border-t border-[var(--border-soft)] px-3 py-2">
          {hasInput ? (
            <pre className="max-h-56 overflow-auto rounded-[14px] bg-[var(--surface2)]/70 p-3 text-[12px] leading-5 text-[var(--muted-foreground)]">
              {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
            </pre>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
