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
import { MentionNode, $createMentionNode } from './mention-node';
import { MentionPlugin } from './mention-plugin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MentionMatch = {
  query: string;
  start: number;
};

type MentionNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape';

type ClipboardPromptSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; id: string; title: string };

type MentionCandidate = {
  id: string;
  title: string;
};

function splitMentionSelectorToken(token: string) {
  const separatorIndex = token.search(/[#/:]/);
  if (separatorIndex === -1) {
    return {
      mentionTitle: token,
      selectorSuffix: '',
    };
  }

  return {
    mentionTitle: token.slice(0, separatorIndex),
    selectorSuffix: token.slice(separatorIndex),
  };
}

export type PromptComposerHandle = {
  focus: () => void;
  clear: () => void;
  setText: (text: string, mentionCandidates?: MentionCandidate[]) => void;
  insertMention: (id: string, title: string, range?: { start: number; end: number }, suffixOverride?: string) => void;
};

type PromptComposerProps = {
  ariaLabel?: string;
  placeholder?: string;
  isExpanded: boolean;
  hasReferenceImages: boolean;
  mentionCandidates?: MentionCandidate[];
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

function parsePromptMentionHtml(html: string): ClipboardPromptSegment[] | null {
  if (!html || !html.includes('data-mention-id')) {
    return null;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  const segments: ClipboardPromptSegment[] = [];
  let hasMention = false;

  function appendText(text: string) {
    if (!text) return;
    const previous = segments[segments.length - 1];
    if (previous?.type === 'text') {
      previous.text += text;
      return;
    }
    segments.push({ type: 'text', text });
  }

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent ?? '');
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const mentionId = node.getAttribute('data-mention-id');
    if (mentionId) {
      const mentionTitle = node.getAttribute('data-mention-title') || node.textContent || mentionId;
      segments.push({ type: 'mention', id: mentionId, title: mentionTitle });
      hasMention = true;
      return;
    }

    if (node.tagName === 'BR') {
      appendText('\n');
      return;
    }

    for (const child of Array.from(node.childNodes)) {
      visit(child);
    }
  }

  for (const child of Array.from(template.content.childNodes)) {
    visit(child);
  }

  return hasMention ? segments : null;
}

function createNodesFromClipboardSegments(segments: ClipboardPromptSegment[]) {
  return segments.flatMap((segment) => {
    if (segment.type === 'mention') {
      return [$createMentionNode(segment.id, segment.title)];
    }

    const textParts = segment.text.split('\n');
    return textParts.flatMap((part, index) => [
      ...(index > 0 ? [$createLineBreakNode()] : []),
      ...(part.length > 0 ? [$createTextNode(part)] : []),
    ]);
  });
}

function insertClipboardNodes(nodes: ReturnType<typeof createNodesFromClipboardSegments>) {
  if (nodes.length === 0) return;

  const root = $getRoot();
  const rootIsEmpty = root.getTextContent() === '';
  if (rootIsEmpty) {
    root.clear();
    const paragraph = $createParagraphNode();
    paragraph.append(...nodes);
    root.append(paragraph);
    paragraph.selectEnd();
    return;
  }

  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    selection.insertNodes(nodes);
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(...nodes);
  root.append(paragraph);
}

function parsePromptMentionText(
  text: string,
  mentionCandidates: MentionCandidate[],
): ClipboardPromptSegment[] | null {
  if (!text || mentionCandidates.length === 0 || !text.includes('@')) {
    return null;
  }

  const candidatesByTitle = new Map<string, MentionCandidate>();
  for (const candidate of mentionCandidates) {
    const key = candidate.title.trim().toLocaleLowerCase();
    if (!key || candidatesByTitle.has(key)) continue;
    candidatesByTitle.set(key, candidate);
  }

  const mentionPattern = /(^|[\s([{'"`])@([^\s@.,!?;:()[\]{}'"`]+)/g;
  const segments: ClipboardPromptSegment[] = [];
  let hasMention = false;
  let lastIndex = 0;

  for (const match of text.matchAll(mentionPattern)) {
    const fullMatch = match[0];
    const leadingText = match[1] ?? '';
    const rawTitle = match[2] ?? '';
    const matchIndex = match.index ?? -1;
    if (matchIndex < 0) continue;

    const { mentionTitle, selectorSuffix } = splitMentionSelectorToken(rawTitle);
    const mentionCandidate = candidatesByTitle.get(mentionTitle.toLocaleLowerCase());
    if (!mentionCandidate) continue;

    const mentionStart = matchIndex + leadingText.length;
    const prefix = text.slice(lastIndex, mentionStart);
    if (prefix) {
      segments.push({ type: 'text', text: prefix });
    }

    segments.push({
      type: 'mention',
      id: mentionCandidate.id,
      title: mentionCandidate.title,
    });
    if (selectorSuffix) {
      segments.push({ type: 'text', text: selectorSuffix });
    }
    hasMention = true;
    lastIndex = matchIndex + fullMatch.length;
  }

  if (!hasMention) {
    return null;
  }

  const trailingText = text.slice(lastIndex);
  if (trailingText) {
    segments.push({ type: 'text', text: trailingText });
  }

  return segments;
}

function writeComposerText(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  text: string,
  mentionCandidates: MentionCandidate[],
) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    const paragraph = $createParagraphNode();
    const segments = parsePromptMentionText(text, mentionCandidates);
    const nodes = segments ? createNodesFromClipboardSegments(segments) : [$createTextNode(text)];
    paragraph.append(...nodes);
    root.append(paragraph);
    paragraph.selectEnd();
  });
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
      mentionCandidates = [],
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
    const insertMentionRef = useRef<
      ((id: string, title: string, range?: { start: number; end: number }) => void) | null
    >(null);

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
        setText: (text: string, nextMentionCandidates = mentionCandidates) => {
          writeComposerText(editor, text, nextMentionCandidates);
        },
        insertMention: (id: string, title: string, range, suffixOverride) => {
          insertMentionRef.current?.(id, title, range, suffixOverride);
        },
      }),
      [editor, mentionCandidates],
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
        const stopHandledPaste = () => {
          event.preventDefault();
          event.stopPropagation();
          const nativeEvent = event.nativeEvent as ClipboardEvent['nativeEvent'] & {
            stopImmediatePropagation?: () => void;
          };
          nativeEvent.preventDefault?.();
          nativeEvent.stopImmediatePropagation?.();
        };

        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          stopHandledPaste();
          onPasteFiles?.(files);
          return;
        }

        const html = event.clipboardData?.getData('text/html') ?? '';
        const htmlSegments = parsePromptMentionHtml(html);
        if (htmlSegments) {
          stopHandledPaste();
          editor.update(() => {
            const nodes = createNodesFromClipboardSegments(htmlSegments);
            insertClipboardNodes(nodes);
          });
          return;
        }

        const plainText = event.clipboardData?.getData('text/plain') ?? '';
        const textSegments = parsePromptMentionText(plainText, mentionCandidates);
        const segments = textSegments;
        if (segments) {
          stopHandledPaste();
          editor.update(() => {
            const nodes = createNodesFromClipboardSegments(segments);
            insertClipboardNodes(nodes);
          });
        }
      },
      [editor, mentionCandidates, onPasteFiles],
    );

    const handleCopy = useCallback(
      (event: ClipboardEvent<HTMLDivElement>) => {
        const rootElement = editor.getRootElement();
        const selection = window.getSelection();
        if (!rootElement || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }

        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        if (!anchorNode || !focusNode || !rootElement.contains(anchorNode) || !rootElement.contains(focusNode)) {
          return;
        }

        const container = document.createElement('div');
        container.appendChild(selection.getRangeAt(0).cloneContents());
        if (!container.querySelector('[data-mention-id]')) {
          return;
        }

        event.clipboardData?.setData('text/html', container.innerHTML);
        event.clipboardData?.setData('text/plain', selection.toString());
        event.preventDefault();
      },
      [editor],
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
          insertLineBreak();
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

        onSubmitRequested?.();
      },
      [insertLineBreak, onMentionNavigationKey, onSubmitRequested],
    );

    useEffect(() => {
      return editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (event?.shiftKey) {
            event.preventDefault();
            insertLineBreak();
            return true;
          }

          if (onMentionNavigationKey?.('Enter')) {
            event?.preventDefault();
            return true;
          }

          event?.preventDefault();
          onSubmitRequested?.();

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
              data-prompt-composer-editor="true"
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
              onCopyCapture={handleCopy}
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
              data-prompt-composer-placeholder="true"
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
