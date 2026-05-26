import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectLabel = SelectPrimitive.Label;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-12 w-full items-center justify-between rounded-[18px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.82)] px-4 text-left text-[14px] text-[var(--foreground)] outline-none transition-colors focus-visible:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)] data-[popup-open]:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="text-[var(--muted-foreground)]">
      <ChevronDown className="size-4" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export function SelectContent({
  className,
  children,
  sideOffset = 8,
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup> & {
  sideOffset?: number;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={sideOffset} align="start" className="z-[90]">
        <SelectPrimitive.Popup
          className={cn(
            'rounded-[20px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl outline-none',
            'origin-[var(--transform-origin)] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]',
            className
          )}
        >
          <SelectPrimitive.List className="max-h-[280px] min-w-[220px] overflow-y-auto">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-between rounded-[14px] px-3 py-2.5 text-[13px] text-[var(--foreground)] outline-none transition-colors data-[highlighted]:bg-white/6 data-[selected]:bg-[rgba(65,130,230,0.12)]',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="text-[var(--foreground)]">
      <Check className="size-3.5" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
