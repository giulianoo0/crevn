import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;

export function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) {
    return <PopoverPrimitive.Trigger {...props} render={children} />;
  }

  return <PopoverPrimitive.Trigger {...props}>{children}</PopoverPrimitive.Trigger>;
}

export const PopoverAnchor = React.Fragment;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 8,
  side = 'bottom',
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> & {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        positionMethod="fixed"
        className="z-[80]"
      >
        <PopoverPrimitive.Popup
          className={cn(
            'rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl outline-none',
            'origin-[var(--transform-origin)] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
