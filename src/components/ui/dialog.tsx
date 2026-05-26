import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;

export function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & {
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Trigger {...props} render={children} />;
  }

  return <DialogPrimitive.Trigger {...props}>{children}</DialogPrimitive.Trigger>;
}

export function DialogPortal({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal keepMounted {...props}>{children}</DialogPrimitive.Portal>;
}

export function DialogClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close> & {
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Close {...props} render={children} />;
  }

  return <DialogPrimitive.Close {...props}>{children}</DialogPrimitive.Close>;
}

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Backdrop>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Backdrop
    ref={ref}
    render={(renderProps, state) => (
      <motion.div
        {...renderProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: state.open ? 1 : 0 }}
        transition={{ duration: state.open ? 0.18 : 0.16, ease: 'easeOut' }}
        className={cn('fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm', className)}
      />
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Popup
      ref={ref}
    render={(renderProps, state) => (
      <motion.div
        {...renderProps}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{
          opacity: state.open ? 1 : 0,
          scale: state.open ? 1 : 0.985,
        }}
        transition={{ duration: state.open ? 0.22 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
            'fixed inset-0 z-[91] m-auto h-fit w-[calc(100vw-32px)] max-w-[460px] rounded-[26px] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5 shadow-[0_24px_72px_rgba(0,0,0,0.45)] backdrop-blur-xl outline-none',
            className
          )}
        />
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
      >
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Popup>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 text-left', className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-[18px] font-medium tracking-[0] text-[var(--foreground)]', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-[13px] text-[var(--muted-foreground)]', className)}
      {...props}
    />
  );
}
