"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { memo } from "react";

export interface TextShimmerProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  duration?: number;
}

const TextShimmerComponent = ({
  children,
  as: Component = "span",
  className,
  duration = 1.8,
}: TextShimmerProps) => {
  return (
    <Component
      className={cn(
        "relative inline-block bg-[length:220%_100%] bg-clip-text text-transparent",
        "bg-[linear-gradient(110deg,var(--muted-foreground)_20%,var(--foreground)_45%,var(--muted-foreground)_70%)]",
        "animate-skeleton-shimmer",
        className
      )}
      style={
        {
          animationDuration: `${duration}s`,
          willChange: "background-position",
        } as CSSProperties
      }
    >
      {children}
    </Component>
  );
};

export const TextShimmer = memo(TextShimmerComponent);
export const Shimmer = TextShimmer;
