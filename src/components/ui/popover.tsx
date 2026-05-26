import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-[18px] border border-[var(--border-soft)] bg-[rgba(20,20,21,0.98)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.38)] outline-none',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
