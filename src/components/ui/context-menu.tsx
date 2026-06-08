import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import { cn } from '@/lib/utils';

export const ContextMenu = ContextMenuPrimitive.Root;

export function ContextMenuTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger> & {
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) {
    return <ContextMenuPrimitive.Trigger {...props} render={children} />;
  }

  return <ContextMenuPrimitive.Trigger {...props}>{children}</ContextMenuPrimitive.Trigger>;
}

export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.SubmenuRoot;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Popup>
>(({ className, ...props }, ref) => (
    <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Positioner sideOffset={8} className="z-[120]">
      <ContextMenuPrimitive.Popup
        ref={ref}
        className={cn(
          'z-[120] min-w-[180px] overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-1.5 text-[13px] text-[var(--foreground)] shadow-[0_20px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl outline-none',
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Positioner>
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-[12px] px-3 py-2 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-white/6 data-[highlighted]:text-[var(--foreground)]',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = 'ContextMenuItem';

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--border-soft)]', className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = 'ContextMenuSeparator';
