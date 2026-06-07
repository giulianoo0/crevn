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
    ((id: string, title: string, range?: { start: number; end: number }, suffixOverride?: string) => void) | null
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
    const separatorIndex = text.search(/[#/:]/);
    if (separatorIndex === -1) {
      return { selectorSuffix: '' };
    }
    return { selectorSuffix: text.slice(separatorIndex) };
  };

  // --- Insert mention: replace @query with a MentionNode ---
  const insertMention = useCallback(
    (id: string, title: string, range?: { start: number; end: number }, suffixOverride?: string) => {
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
        const shouldReusePreviousMention =
          matchStart === 0 &&
          previousSibling &&
          $isMentionNode(previousSibling) &&
          previousSibling.getMentionId() === id;

        const mentionNode = shouldReusePreviousMention ? null : $createMentionNode(id, title);
        const replacementNodes = [
          ...(beforeAt.length > 0 ? [$createTextNode(beforeAt)] : []),
          ...(mentionNode ? [mentionNode] : []),
          ...(resolvedSelectorSuffix.length > 0 ? [$createTextNode(resolvedSelectorSuffix)] : []),
          $createTextNode(' '),
          ...(afterMatch.length > 0 ? [$createTextNode(afterMatch)] : []),
        ];

        targetNode.replace(replacementNodes[0]);
        let previousNode = replacementNodes[0];
        for (const nextNode of replacementNodes.slice(1)) {
          previousNode.insertAfter(nextNode);
          previousNode = nextNode;
        }

        const spaceNode =
          replacementNodes.find((node) => node instanceof TextNode && node.getTextContent() === ' ') ??
          replacementNodes[replacementNodes.length - 1];
        spaceNode.select();
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
        const selectorMatchResult = textUpToCursor.match(/[#/:]([^\s@]*)$/);

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

  return null;
}
