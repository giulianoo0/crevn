/**
 * MentionNode — A custom Lexical TextNode that renders mention tokens
 * (e.g. reference image titles) as styled inline spans.
 *
 * Key behaviors:
 * - Renders with accent color and data-testid for existing test selectors
 * - Non-segmentable: backspace deletes the entire mention as a unit
 * - Carries metadata (mentionId, mentionTitle) for extraction
 */

import {
  $applyNodeReplacement,
  TextNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from 'lexical';

export type SerializedMentionNode = Spread<
  {
    mentionId: string;
    mentionTitle: string;
  },
  SerializedTextNode
>;

export class MentionNode extends TextNode {
  __mentionId: string;
  __mentionTitle: string;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__mentionId,
      node.__mentionTitle,
      node.__text,
      node.__key,
    );
  }

  constructor(
    mentionId: string,
    mentionTitle: string,
    text?: string,
    key?: NodeKey,
  ) {
    super(text ?? mentionTitle, key);
    this.__mentionId = mentionId;
    this.__mentionTitle = mentionTitle;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.setAttribute('data-testid', 'selected-reference-mention');
    element.setAttribute('data-mention-id', this.__mentionId);
    element.style.color = 'var(--accent)';
    element.style.pointerEvents = 'none';
    return element;
  }

  updateDOM(
    prevNode: MentionNode,
    element: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const needsUpdate = super.updateDOM(prevNode, element, config);
    if (prevNode.__mentionId !== this.__mentionId) {
      element.setAttribute('data-mention-id', this.__mentionId);
    }
    return needsUpdate;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-testid', 'selected-reference-mention');
    element.setAttribute('data-mention-id', this.__mentionId);
    element.style.color = 'var(--accent)';
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      serializedNode.mentionId,
      serializedNode.mentionTitle,
    );
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      mentionId: this.__mentionId,
      mentionTitle: this.__mentionTitle,
      type: 'mention',
    };
  }

  getMentionId(): string {
    return this.__mentionId;
  }

  getMentionTitle(): string {
    return this.__mentionTitle;
  }

  // Prevent partial editing inside the mention
  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isTextEntity(): boolean {
    return true;
  }

  // The mention should be selected/deleted as a whole unit
  splitText(): [TextNode] {
    return [this];
  }
}

export function $createMentionNode(
  mentionId: string,
  mentionTitle: string,
): MentionNode {
  const node = new MentionNode(mentionId, mentionTitle);
  // Mark as non-editable segment so cursor skips over it
  node.setMode('segmented');
  return $applyNodeReplacement(node);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
