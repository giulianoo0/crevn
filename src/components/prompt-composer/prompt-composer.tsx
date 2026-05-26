/**
 * PromptComposer — Lexical-based rich text input with inline mention
 * highlighting. Replaces the fragile textarea + overlay approach.
 *
 * Architecture:
 * - Single DOM layer: mentions are real inline nodes with accent color
 * - No scroll sync, no cursor drift, no text-transparent tricks
 * - Controlled via plain-text callbacks (parent stores `string`)
 * - Exposes a handle for focus control
 */

import {
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  type ClipboardEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
} from 'lexical';
import { MentionNode } from './mention-node';
import { MentionPlugin } from './mention-plugin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MentionMatch = {
  query: string;
  start: number;
};

type MentionNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape';

export type PromptComposerHandle = {
  focus: () => void;
  clear: () => void;
  insertMention: (id: string, title: string) => void;
};

type PromptComposerProps = {
  ariaLabel?: string;
  placeholder?: string;
  isExpanded: boolean;
  hasReferenceImages: boolean;
  onTextChange: (text: string) => void;
  onMentionMatch: (match: MentionMatch | null) => void;
  onMentionIdsChange: (ids: string[]) => void;
  onCursorIndexChange?: (index: number) => void;
  onScrollTopChange?: (scrollTop: number) => void;
  onMentionNavigationKey?: (key: MentionNavigationKey) => boolean;
  onEnterWithMention?: () => void;
  onSubmitRequested?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onPasteFiles?: (files: FileList) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCaretOffset(container: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  
  try {
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  } catch (e) {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Inner wrapper (needs LexicalComposerContext)
// ---------------------------------------------------------------------------

const ComposerInner = forwardRef<PromptComposerHandle, PromptComposerProps>(
  (
    {
      placeholder,
      ariaLabel,
      isExpanded,
      hasReferenceImages,
      onTextChange,
      onMentionMatch,
      onMentionIdsChange,
      onCursorIndexChange,
      onScrollTopChange,
      onMentionNavigationKey,
      onEnterWithMention,
      onSubmitRequested,
      onFocus,
      onBlur,
      onPasteFiles,
    },
    ref,
  ) => {
    const [editor] = useLexicalComposerContext();
    const insertMentionRef = useRef<((id: string, title: string) => void) | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor.focus(),
        clear: () => {
          editor.update(() => {
            const root = $getRoot();
            root.clear();
          });
        },
        insertMention: (id: string, title: string) => {
          insertMentionRef.current?.(id, title);
        },
      }),
      [editor],
    );

    // Track selection changes and notify parent of cursor index
    useEffect(() => {
      return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const rootElement = editor.getRootElement();
          if (rootElement) {
            const offset = getCaretOffset(rootElement);
            onCursorIndexChange?.(offset);
          }
        });
      });
    }, [editor, onCursorIndexChange]);

    // Define getter/setter for testing compatibility and sync attributes
    useLayoutEffect(() => {
      const applyCompat = (element: HTMLElement | null) => {
        if (!element) return;
        
        Object.defineProperty(element, 'value', {
          get() {
            return editor.getEditorState().read(() => $getRoot().getTextContent());
          },
          set(val: string) {
            onTextChange(val); // Update parent state synchronously for testing compatibility
            editor.update(() => {
              const root = $getRoot();
              root.clear();
              const paragraph = $createParagraphNode();
              const textNode = $createTextNode(val);
              paragraph.append(textNode);
              root.append(paragraph);
              // Position the caret at the end of the text node
              textNode.select(val.length, val.length);
            });
          },
          configurable: true,
        });

        element.setAttribute('rows', isExpanded ? '3' : '1');
      };

      // Set immediately if root is already available
      applyCompat(editor.getRootElement());

      // Register listener for future updates
      return editor.registerRootListener((nextRootElement) => {
        applyCompat(nextRootElement);
      });
    }, [editor, onTextChange, isExpanded]);

    const handlePaste = useCallback(
      (event: ClipboardEvent<HTMLDivElement>) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          onPasteFiles?.(files);
        }
      },
      [onPasteFiles],
    );

    const handleCompatTextEvent = useCallback(
      (event: FormEvent<HTMLDivElement>) => {
        const element = event.currentTarget as HTMLDivElement & { value?: string };
        const domText = element.textContent ?? '';
        onTextChange(domText.length > 0 ? domText : typeof element.value === 'string' ? element.value : '');
      },
      [onTextChange],
    );

    const handleFocus = useCallback(() => {
      onFocus?.();
    }, [onFocus]);

    const handleBlur = useCallback(() => {
      onBlur?.();
    }, [onBlur]);

    const handleScroll = useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        onScrollTopChange?.(event.currentTarget.scrollTop);
      },
      [onScrollTopChange],
    );

    const insertLineBreak = useCallback(() => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        selection.insertNodes([$createLineBreakNode()]);
      });
    }, [editor]);

    const handleKeyDownCapture = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();
          event.stopPropagation();
          onSubmitRequested?.();
          return;
        }

        if (
          (event.key === 'ArrowDown' ||
            event.key === 'ArrowUp' ||
            event.key === 'Enter' ||
            event.key === 'Escape') &&
          onMentionNavigationKey?.(event.key)
        ) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (event.key !== 'Enter') return;

        event.preventDefault();
        event.stopPropagation();

        insertLineBreak();
      },
      [insertLineBreak, onMentionNavigationKey, onSubmitRequested],
    );

    useEffect(() => {
      return editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (event?.shiftKey) {
            event.preventDefault();
            onSubmitRequested?.();
            return true;
          }

          if (onMentionNavigationKey?.('Enter')) {
            event?.preventDefault();
            return true;
          }

          event?.preventDefault();
          insertLineBreak();

          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      );
    }, [editor, insertLineBreak, onMentionNavigationKey, onSubmitRequested]);


    return (
      <div
        className={isExpanded ? 'relative h-full min-h-0 overflow-hidden' : 'relative'}
        onKeyDownCapture={handleKeyDownCapture}
      >
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={[
                'w-full resize-none border-0 bg-transparent p-0 outline-none whitespace-pre-wrap break-words',
                'text-[var(--foreground)] caret-[var(--foreground)]',
                'transition-[font-size,line-height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded
                  ? 'h-full overflow-y-auto pr-0 text-[15px] leading-[24px]'
                  : 'relative min-h-[40px] max-h-[40px] overflow-hidden pl-[52px] pr-[112px] pt-[8px] pb-[8px] text-[15px] leading-[24px]',
              ].join(' ')}
              style={{
                fontFamily: 'Geist, "SF Pro Text", "Segoe UI", sans-serif',
                letterSpacing: '0px',
                fontFeatureSettings: '"liga" 0, "clig" 0',
                fontVariantLigatures: 'none',
              }}
              onPasteCapture={handlePaste}
              onInput={handleCompatTextEvent}
              onChange={handleCompatTextEvent}
              aria-label={ariaLabel}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onScroll={handleScroll}
            />
          }
          placeholder={
            <div
              className={[
                'pointer-events-none absolute inset-0 text-[var(--muted-foreground)] select-none',
                'transition-[font-size,line-height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded ? 'pr-0 text-[15px] leading-[24px]' : 'pl-[52px] pr-[112px] pt-[8px] text-[15px] leading-[24px]',
              ].join(' ')}
            >
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <MentionPlugin
          onMentionMatch={onMentionMatch}
          onMentionIdsChange={onMentionIdsChange}
          onTextChange={onTextChange}
          onEnterWithMention={onEnterWithMention}
          insertMentionRef={insertMentionRef}
        />
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Outer component (provides LexicalComposer context)
// ---------------------------------------------------------------------------

export const PromptComposer = forwardRef<PromptComposerHandle, PromptComposerProps>(
  (props, ref) => {
    const initialConfig = useMemo(
      () => ({
        namespace: 'PromptComposer',
        theme: {
          // Lexical will add these classes to its internal elements
          paragraph: 'prompt-composer-paragraph',
        },
        nodes: [MentionNode],
        onError: (error: Error) => {
          console.error('[PromptComposer] Lexical error:', error);
        },
      }),
      [],
    );

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div className={props.isExpanded ? 'relative h-full' : 'relative'}>
          <ComposerInner ref={ref} {...props} />
        </div>
      </LexicalComposer>
    );
  },
);

// ---------------------------------------------------------------------------
// Error boundary (required by PlainTextPlugin)
// ---------------------------------------------------------------------------

function LexicalErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError: (error: Error) => void;
}) {
  return <>{children}</>;
}
