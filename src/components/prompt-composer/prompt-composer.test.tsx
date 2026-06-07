import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PromptComposer, type PromptComposerHandle } from './prompt-composer';

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

  it('keeps @ mention detection working after pasting a converted mention', async () => {
    const onMentionMatch = vi.fn();

    render(
      <PromptComposer
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[
          { id: 'reference-tito', title: 'Tito' },
          { id: 'reference-garage', title: 'Garagem' },
        ]}
        onTextChange={() => {}}
        onMentionMatch={onMentionMatch}
        onMentionIdsChange={() => {}}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      fireEvent.paste(input, {
        clipboardData: {
          files: [],
          getData: (type: string) => {
            if (type === 'text/plain') return 'Frame with @tito @gar';
            return '';
          },
        },
      });
    });

    expect(onMentionMatch).toHaveBeenLastCalledWith({ query: 'gar', start: 16 });
  });

  it('rehydrates pasted selector mentions while preserving the attachment suffix', async () => {
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
            id: 'reference-hangar',
            title: 'Hangar',
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
            if (type === 'text/plain') return 'Use @Hangar#console-detail for the insert';
            return '';
          },
        },
      });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hangar');
    expect(input).toHaveTextContent('Use Hangar#console-detail for the insert');
    expect(onTextChange).toHaveBeenLastCalledWith('Use Hangar#console-detail for the insert');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-hangar']);
  });

  it('inserts an imperative mention from an explicit text range when editor selection is unavailable', async () => {
    const onTextChange = vi.fn();
    const onMentionIdsChange = vi.fn();
    const composerRef = createRef<PromptComposerHandle>();

    render(
      <PromptComposer
        ref={composerRef}
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[{ id: 'reference-garage', title: 'Garagem' }]}
        onTextChange={onTextChange}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      composerRef.current?.setText('Plan shots in @gar');
    });

    await act(async () => {
      composerRef.current?.insertMention('reference-garage', 'Garagem', { start: 14, end: 18 });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(input).toHaveTextContent('Plan shots in Garagem');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-garage']);
  });

  it('uses an explicit mention range instead of the current editor selection', async () => {
    const onTextChange = vi.fn();
    const onMentionIdsChange = vi.fn();
    const composerRef = createRef<PromptComposerHandle>();

    render(
      <PromptComposer
        ref={composerRef}
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[{ id: 'reference-garage', title: 'Garagem' }]}
        onTextChange={onTextChange}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      composerRef.current?.setText('Use @wrong and @gar');
    });

    await act(async () => {
      composerRef.current?.insertMention('reference-garage', 'Garagem', { start: 4, end: 10 });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(input).toHaveTextContent('Use Garagem and @gar');
    expect(input).not.toHaveTextContent('Use @wrong and Garagem');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-garage']);
  });
});
