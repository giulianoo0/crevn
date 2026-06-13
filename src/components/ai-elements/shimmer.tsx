"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import { memo } from "react";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread: _spread = 2,
}: TextShimmerProps) => {
  return (
    <Component
      className={cn("t-shimmer", className)}
      data-text={children}
      style={
        duration === 2
          ? undefined
          : ({ "--shimmer-dur": `${duration}s` } as CSSProperties)
      }
    >
      {children}
    </Component>
  );
};

export interface ShimmerSurfaceProps extends ComponentPropsWithoutRef<"div"> {}

const ShimmerSurfaceComponent = ({ className, ...props }: ShimmerSurfaceProps) => {
  return (
    <div
      className={cn(
        "animate-skeleton-shimmer bg-[linear-gradient(110deg,rgba(36,37,41,0.88)_18%,rgba(244,246,255,0.16)_38%,rgba(65,130,230,0.52)_50%,rgba(244,246,255,0.16)_62%,rgba(36,37,41,0.88)_82%)] bg-[length:260%_100%]",
        className
      )}
      {...props}
    />
  );
};

export const TextShimmer = memo(ShimmerComponent);
export const ShimmerSurface = memo(ShimmerSurfaceComponent);
export const Shimmer = TextShimmer;
