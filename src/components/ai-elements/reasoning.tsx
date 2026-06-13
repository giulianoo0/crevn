import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ReasoningProps extends ComponentProps<'details'> {
  label?: ReactNode;
}

export function Reasoning({ className, label = 'Reasoning', children, ...props }: ReasoningProps) {
  return (
    <details
      className={cn(
        'group overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)]/72 text-[13px] text-[var(--foreground)] backdrop-blur-xl',
        className
      )}
      {...props}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[12px] font-medium text-[var(--muted-foreground)] marker:hidden">
        <span>{label}</span>
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--border-soft)] px-3 py-2 text-[13px] leading-5 text-[var(--foreground)]">
        {children}
      </div>
    </details>
  );
}
