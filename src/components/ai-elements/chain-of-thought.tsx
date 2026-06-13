"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon, DotIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TextShimmer } from "./shimmer";

interface ChainOfThoughtContextValue {
  isOpen: boolean;
  isExpandable: boolean;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
);

function getSafeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function useChainOfThought() {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
}

export type ChainOfThoughtProps = Omit<
  ComponentProps<typeof Collapsible>,
  "children"
> & {
  children?: ReactNode;
  isExpandable?: boolean;
  storageKey?: string;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = true,
    onOpenChange,
    isExpandable = true,
    storageKey,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      defaultProp: defaultOpen,
      onChange: onOpenChange,
      prop: open,
    });

    useEffect(() => {
      const storage = getSafeStorage();
      if (!isExpandable || !storageKey || open !== undefined || !storage) {
        return;
      }

      const persistedValue = storage.getItem(storageKey);
      if (persistedValue === "open") {
        setIsOpen(true);
      } else if (persistedValue === "closed") {
        setIsOpen(false);
      }
    }, [isExpandable, open, setIsOpen, storageKey]);

    useEffect(() => {
      const storage = getSafeStorage();
      if (!isExpandable || !storageKey || !storage) {
        return;
      }

      storage.setItem(storageKey, isOpen ? "open" : "closed");
    }, [isExpandable, isOpen, storageKey]);

    const resolvedOpen = isExpandable ? isOpen : false;
    const chainOfThoughtContext = useMemo(
      () => ({ isExpandable, isOpen: resolvedOpen }),
      [isExpandable, resolvedOpen]
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <Collapsible
          className={cn(
            "not-prose w-full border-l border-[rgba(65,130,230,0.45)] pl-3 text-[var(--foreground)]",
            className
          )}
          onOpenChange={isExpandable ? setIsOpen : undefined}
          open={resolvedOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ChainOfThoughtContext.Provider>
    );
  }
);

function readTextSwapDurationMs() {
  if (typeof window === "undefined") {
    return 150;
  }

  const rawDuration = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--text-swap-dur")
    .trim();
  const parsedDuration = Number.parseFloat(rawDuration);

  if (!Number.isFinite(parsedDuration)) {
    return 150;
  }

  return rawDuration.endsWith("s") && !rawDuration.endsWith("ms")
    ? parsedDuration * 1000
    : parsedDuration;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ChainOfThoughtTitleState = {
  isShimmering: boolean;
  text: string;
};

function ChainOfThoughtTitle({
  isShimmering,
  text,
}: ChainOfThoughtTitleState) {
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const [displayState, setDisplayState] = useState<ChainOfThoughtTitleState>({
    isShimmering,
    text,
  });
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");

  useLayoutEffect(() => {
    if (phase !== "enter") {
      return;
    }

    if (titleRef.current) {
      void titleRef.current.offsetHeight;
    }

    setPhase("idle");
  }, [phase]);

  useEffect(() => {
    if (
      displayState.text === text &&
      displayState.isShimmering === isShimmering
    ) {
      return;
    }

    const nextState = { isShimmering, text };

    if (prefersReducedMotion()) {
      setDisplayState(nextState);
      setPhase("idle");
      return;
    }

    const duration = readTextSwapDurationMs();

    setPhase("exit");

    const timeout = window.setTimeout(() => {
      setDisplayState(nextState);
      setPhase("enter");
    }, duration);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [displayState, isShimmering, text]);

  return (
    <span
      ref={titleRef}
      className={cn(
        "t-text-swap",
        phase === "exit" ? "is-exit" : null,
        phase === "enter" ? "is-enter-start" : null
      )}
    >
      {displayState.isShimmering ? (
        <TextShimmer
          as="span"
          className="cot-title-shimmer inline-block"
          duration={1.6}
        >
          {displayState.text}
        </TextShimmer>
      ) : (
        displayState.text
      )}
    </span>
  );
}

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  isShimmering?: boolean;
};

export const ChainOfThoughtHeader = memo(
  ({
    className,
    children,
    isShimmering = false,
    ...props
  }: ChainOfThoughtHeaderProps) => {
    const { isExpandable, isOpen } = useChainOfThought();
    const title =
      typeof children === "string" || children === undefined ? (
        <ChainOfThoughtTitle
          isShimmering={isShimmering}
          text={children ?? "Thinking"}
        />
      ) : (
        children
      );
    const headerClassName = cn(
      "flex w-full items-center gap-2 py-1 text-[12px] font-medium text-[rgb(116,168,244)]",
      isExpandable
        ? "transition-colors hover:text-[rgb(166,200,250)]"
        : "cursor-default",
      className
    );
    const headerContent = (
      <>
        <span className="flex-1 text-left">{title}</span>
        {isExpandable ? (
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        ) : null}
      </>
    );

    if (!isExpandable) {
      const { disabled: _disabled, type: _type, ...nonButtonProps } = props;

      return (
        <div
          className={headerClassName}
          {...(nonButtonProps as ComponentProps<"div">)}
        >
          {headerContent}
        </div>
      );
    }

    return (
      <CollapsibleTrigger
        className={headerClassName}
        {...props}
      >
        {headerContent}
      </CollapsibleTrigger>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon;
  label: ReactNode;
  description?: ReactNode;
  status?: "complete" | "active" | "pending";
};

const stepStatusStyles = {
  active: "text-[var(--foreground)]",
  complete: "text-[var(--muted-foreground)]",
  pending: "text-[color:rgba(150,151,158,0.72)]",
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon = DotIcon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => (
    <div
      className={cn("flex gap-2 text-sm", stepStatusStyles[status], className)}
      {...props}
    >
      <div className="relative mt-0.5 shrink-0">
        <Icon className="size-4" />
        <div className="absolute bottom-0 left-1/2 top-7 -mx-px w-px bg-[var(--border-soft)] last:hidden" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
        <div>{label}</div>
        {description ? (
          <div className="text-[12px] leading-5 text-[var(--muted-foreground)]">
            {description}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
);

export type ChainOfThoughtSearchResultProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <div
      className={cn(
        "gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface2)]/70 px-2 py-0.5 font-normal text-[11px] text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isExpandable } = useChainOfThought();

    if (!isExpandable) {
      return null;
    }

    return (
      <CollapsibleContent
        className={cn(
          "space-y-2 py-1 text-[13px] leading-5 text-[color:rgba(150,151,158,0.84)]",
          className
        )}
        {...props}
      >
        {children}
      </CollapsibleContent>
    );
  }
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div className={cn("mt-2 space-y-2", className)} {...props}>
      <div className="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-[16px] bg-[var(--surface2)]/70 p-3">
        {children}
      </div>
      {caption ? (
        <p className="text-[12px] leading-5 text-[var(--muted-foreground)]">
          {caption}
        </p>
      ) : null}
    </div>
  )
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
