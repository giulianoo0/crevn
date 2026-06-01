import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PromptComposer } from './prompt-composer';

describe('PromptComposer', () => {
  it('replaces pasted case-insensitive @mentions with registered references', async () => {
    const onTextChange = vi.fn();
    const onMentionIdsChange = vi.fn();

    render(
      <PromptComposer
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[
          {
            id: 'reference-tito',
            title: 'Tito',
          },
        ]}
        onTextChange={onTextChange}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      fireEvent.paste(input, {
        clipboardData: {
          files: [],
          getData: (type: string) => {
            if (type === 'text/plain') return 'Frame with @tito, side light';
            return '';
          },
        },
      });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Tito');
    expect(input).toHaveTextContent('Frame with Tito, side light');
    expect(onTextChange).toHaveBeenLastCalledWith('Frame with Tito, side light');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-tito']);
  });

  it('preserves possessives and does not paste a duplicate plain-text copy', async () => {
    const onTextChange = vi.fn();
    const onMentionIdsChange = vi.fn();

    render(
      <PromptComposer
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[
          {
            id: 'reference-tito',
            title: 'Tito',
          },
        ]}
        onTextChange={onTextChange}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      fireEvent.paste(input, {
        clipboardData: {
          files: [],
          getData: (type: string) => {
            if (type === 'text/plain') return "@Tito's jacket";
            return '';
          },
        },
      });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Tito');
    expect(input).toHaveTextContent("Tito's jacket");
    expect(input).not.toHaveTextContent("@Tito's jacket");
    expect(onTextChange).toHaveBeenLastCalledWith("Tito's jacket");
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-tito']);
  });
});
