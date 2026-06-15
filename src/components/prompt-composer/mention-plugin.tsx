/**
 * MentionPlugin — Lexical plugin that detects @-trigger patterns and provides
 * callbacks for mention insertion.
 *
 * This plugin:
 * - Watches text changes for /@([^\s@]*)$/ pattern
 * - Reports the match query and cursor position to the parent
 * - Provides an `insertMention` function that replaces the @-trigger text
 *   with a MentionNode
 * - Reports all current mention IDs in the editor whenever content changes
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $getNodeByKey,
  $isRangeSelection,
  $createTextNode,
  TextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
  type NodeKey,
} from 'lexical';
import { $createMentionNode, $isMentionNode } from './mention-node';

type MentionMatch = {
  query: string;
  start: number;
};

type MentionPluginProps = {
  onMentionMatch: (match: MentionMatch | null) => void;
  onMentionIdsChange: (ids: string[]) => void;
  onTextChange: (text: string) => void;
  onEnterWithMention?: () => void;
  insertMentionRef: React.MutableRefObject<
    ((
      id: string,
      title: string,
      range?: { start: number; end: number },
      suffixOverride?: string,
      previewUrl?: string,
      keepSelectorOpen?: boolean
    ) => void) | null
  >;
};

export function MentionPlugin({
  onMentionMatch,
  onMentionIdsChange,
  onTextChange,
  onEnterWithMention,
  insertMentionRef,
}: MentionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const onEnterWithMentionRef = useRef(onEnterWithMention);
  const latestMentionMatchRef = useRef<{
    nodeKey: NodeKey;
    offset: number;
    start: number;
  } | null>(null);
  onEnterWithMentionRef.current = onEnterWithMention;

  const splitSelectorSuffix = (text: string) => {
    const separatorIndex = text.search(/[#/:.]/);
    if (separatorIndex === -1) {
      return { selectorSuffix: '' };
    }
    return { selectorSuffix: text.slice(separatorIndex) };
  };

  // --- Insert mention: replace @query with a MentionNode ---
  const insertMention = useCallback(
    (
      id: string,
      title: string,
      range?: { start: number; end: number },
      suffixOverride?: string,
      previewUrl?: string,
      keepSelectorOpen?: boolean
    ) => {
      editor.update(() => {
        const root = $getRoot();
        const selection = $getSelection();
        let targetNode: TextNode | null = null;
        let matchStart: number | null = null;
        let matchEnd: number | null = null;

        if (range) {
          let textOffset = 0;
          const allNodes = root.getAllTextNodes();

          for (const node of allNodes) {
            if ($isMentionNode(node)) {
              textOffset += node.getTextContentSize();
              continue;
            }

            const nodeTextLength = node.getTextContentSize();
            const nodeStart = textOffset;
            const nodeEnd = textOffset + nodeTextLength;

            if (range.start >= nodeStart && range.end <= nodeEnd) {
              targetNode = node;
              matchStart = range.start - nodeStart;
              matchEnd = range.end - nodeStart;
              break;
            }

            textOffset = nodeEnd;
          }
        }

        if (!targetNode && $isRangeSelection(selection)) {
          const anchor = selection.anchor;
          const anchorNode = anchor.getNode();

          if (anchorNode instanceof TextNode && !$isMentionNode(anchorNode)) {
            const textUpToCursor = anchorNode.getTextContent().slice(0, anchor.offset);
            const matchResult = textUpToCursor.match(/@([^\s@]*)$/);
            if (matchResult?.index !== undefined) {
              targetNode = anchorNode;
              matchStart = matchResult.index;
              matchEnd = anchor.offset;
            }
          }
        }

        if (!targetNode && latestMentionMatchRef.current) {
          const latestMatch = latestMentionMatchRef.current;
          const latestNode = $getNodeByKey(latestMatch.nodeKey);
          if (latestNode instanceof TextNode && !$isMentionNode(latestNode)) {
            targetNode = latestNode;
            matchStart = latestMatch.start;
            matchEnd = latestMatch.offset;
          }
        }

        if (!targetNode || matchStart === null || matchEnd === null) {
          return;
        }

        const text = targetNode.getTextContent();
        const matchedText = text.slice(matchStart + 1, matchEnd);
        const { selectorSuffix } = splitSelectorSuffix(matchedText);
        const resolvedSelectorSuffix = typeof suffixOverride === 'string' ? suffixOverride : selectorSuffix;
        const beforeAt = text.slice(0, matchStart);
        const afterMatch = text.slice(matchEnd);
        const previousSibling = targetNode.getPreviousSibling();
        // The selector folding logic below only makes sense when the trigger is
        // a selector char (`.`, `#`, `/`, `:`) drilling into the preceding chip.
        // A plain `@` mention that merely follows another chip (e.g. typing
        // "@Tito @Nina") must NOT fold into / replace that chip.
        const isSelectorTrigger = text[matchStart] !== '@';
        // The selector (`.`) sits right after a chip, possibly with stray
        // whitespace between them (the trailing space we insert after a chip).
        // Treat that case as "attached to the chip" so we reuse/replace it
        // instead of leaving a duplicate, and drop the blank gap.
        const beforeIsBlank = beforeAt.trim().length === 0;
        const previousIsMention = Boolean(
          isSelectorTrigger && beforeIsBlank && previousSibling && $isMentionNode(previousSibling),
        );
        const effectiveBeforeAt = previousIsMention ? '' : beforeAt;
        const shouldReusePreviousMention =
          previousIsMention && previousSibling!.getMentionId() === id;
        // When the selector follows an existing chip and we are inserting a
        // *different* mention (folding a folder chip into the chosen image),
        // the old chip must be replaced — otherwise it lingers as a duplicate.
        const shouldReplacePreviousMention = previousIsMention && !shouldReusePreviousMention;

        const mentionNode = shouldReusePreviousMention ? null : $createMentionNode(id, title, previewUrl);
        const suffixNode =
          resolvedSelectorSuffix.length > 0 ? $createTextNode(resolvedSelectorSuffix) : null;
        const spaceNode = $createTextNode(' ');
        const replacementNodes = [
          ...(effectiveBeforeAt.length > 0 ? [$createTextNode(effectiveBeforeAt)] : []),
          ...(mentionNode ? [mentionNode] : []),
          ...(suffixNode ? [suffixNode] : []),
          spaceNode,
          ...(afterMatch.length > 0 ? [$createTextNode(afterMatch)] : []),
        ];

        targetNode.replace(replacementNodes[0]);
        let previousNode = replacementNodes[0];
        for (const nextNode of replacementNodes.slice(1)) {
          previousNode.insertAfter(nextNode);
          previousNode = nextNode;
        }

        if (shouldReplacePreviousMention && previousSibling) {
          previousSibling.remove();
        }

        if (keepSelectorOpen) {
          // Keep the caret glued to the chip (or to the end of the inserted
          // path suffix) so the next `.` keeps drilling instead of landing
          // after the trailing space.
          if (suffixNode) {
            suffixNode.select(resolvedSelectorSuffix.length, resolvedSelectorSuffix.length);
          } else {
            spaceNode.select(0, 0);
          }
        } else {
          spaceNode.select();
        }
        latestMentionMatchRef.current = null;
      });
    },
    [editor],
  );

  // Expose insertMention to the parent via ref
  useEffect(() => {
    insertMentionRef.current = insertMention;
    return () => {
      insertMentionRef.current = null;
    };
  }, [insertMention, insertMentionRef]);

  // --- Listen to editor updates for @-trigger detection and text extraction ---
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();

        // Extract plain text
        const plainText = root.getTextContent();
        onTextChange(plainText);

        // Extract all mention IDs
        const mentionIds: string[] = [];
        const allNodes = root.getAllTextNodes();
        for (const node of allNodes) {
          if ($isMentionNode(node)) {
            mentionIds.push(node.getMentionId());
          }
        }
        onMentionIdsChange(mentionIds);

        // Detect @-trigger
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          onMentionMatch(null);
          return;
        }

        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();

        if (!(anchorNode instanceof TextNode) || $isMentionNode(anchorNode)) {
          onMentionMatch(null);
          return;
        }

        let globalNodeOffset = 0;
        for (const node of root.getAllTextNodes()) {
          if (node.getKey() === anchorNode.getKey()) {
            break;
          }
          globalNodeOffset += node.getTextContentSize();
        }

        // Get text up to cursor within this text node
        const textUpToCursor = anchorNode
          .getTextContent()
          .slice(0, anchor.offset);
        const matchResult = textUpToCursor.match(/@([^\s@]*)$/);
        const selectorMatchResult = textUpToCursor.match(/[#/:.]([^\s@]*)$/);

        if (matchResult && matchResult.index !== undefined) {
          latestMentionMatchRef.current = {
            nodeKey: anchorNode.getKey(),
            offset: anchor.offset,
            start: matchResult.index,
          };
          onMentionMatch({
            query: matchResult[1].toLowerCase(),
            start: globalNodeOffset + matchResult.index,
          });
        } else if (
          selectorMatchResult &&
          selectorMatchResult.index !== undefined &&
          anchorNode.getPreviousSibling() &&
          $isMentionNode(anchorNode.getPreviousSibling())
        ) {
          const previousMentionNode = anchorNode.getPreviousSibling();
          latestMentionMatchRef.current = {
            nodeKey: anchorNode.getKey(),
            offset: anchor.offset,
            start: selectorMatchResult.index,
          };
          onMentionMatch({
            query: `${previousMentionNode.getMentionTitle()}${selectorMatchResult[0].toLowerCase()}`,
            start: globalNodeOffset + selectorMatchResult.index,
          });
        } else {
          latestMentionMatchRef.current = null;
          onMentionMatch(null);
        }
      });
    });
  }, [editor, onMentionMatch, onMentionIdsChange, onTextChange]);

  // --- Handle Enter key to select first mention option ---
  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (onEnterWithMentionRef.current) {
          event?.preventDefault();
          onEnterWithMentionRef.current();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  // --- Backspace deletes a whole mention chip in a single press ---
  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;
        let mentionNode: ReturnType<typeof $getNodeByKey> | null = null;
        let blankGap: TextNode | null = null;

        if ($isMentionNode(anchorNode)) {
          mentionNode = anchorNode;
        } else if (anchorNode instanceof TextNode) {
          const before = anchorNode.getTextContent().slice(0, anchorOffset);
          // Caret sits at the chip, or only whitespace (the trailing space we
          // insert) separates it from the chip.
          if (before.trim().length === 0) {
            const previous = anchorNode.getPreviousSibling();
            if ($isMentionNode(previous)) {
              mentionNode = previous;
              if (before.length > 0) {
                blankGap = anchorNode;
              }
            }
          }
        } else if ('getChildAtIndex' in anchorNode && anchorOffset > 0) {
          const previousChild = (anchorNode as { getChildAtIndex: (index: number) => unknown })
            .getChildAtIndex(anchorOffset - 1);
          if ($isMentionNode(previousChild)) {
            mentionNode = previousChild;
          }
        }

        if (!mentionNode || !$isMentionNode(mentionNode)) {
          return false;
        }

        event?.preventDefault();
        const caretTarget = mentionNode.getPreviousSibling();
        mentionNode.remove();
        if (blankGap) {
          blankGap.remove();
        }
        if (caretTarget instanceof TextNode) {
          const end = caretTarget.getTextContentSize();
          caretTarget.select(end, end);
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
