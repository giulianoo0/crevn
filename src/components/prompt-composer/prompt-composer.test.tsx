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

  it('replaces pasted multi-word non-ASCII @mentions with registered references', async () => {
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
            id: 'reference-rainha',
            title: 'Rainha do açucar',
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
            if (type === 'text/plain') return 'Plano com @Rainha do açucar entrando';
            return '';
          },
        },
      });
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Rainha do açucar');
    expect(input).toHaveTextContent('Plano com Rainha do açucar entrando');
    expect(onTextChange).toHaveBeenLastCalledWith('Plano com Rainha do açucar entrando');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-rainha']);
  });

  it('opens mention search for a bare @ without throwing', async () => {
    const onMentionMatch = vi.fn();

    render(
      <PromptComposer
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[{ id: 'reference-rainha', title: 'Rainha do açucar' }]}
        onTextChange={() => {}}
        onMentionMatch={onMentionMatch}
        onMentionIdsChange={() => {}}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' }) as HTMLDivElement & { value: string };

    await act(async () => {
      input.value = '@';
      fireEvent.input(input);
    });

    expect(onMentionMatch).toHaveBeenLastCalledWith({ query: '', start: 0 });
  });

  it('renders inserted references with inline preview metadata', async () => {
    const composerRef = createRef<PromptComposerHandle>();

    render(
      <PromptComposer
        ref={composerRef}
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[
          {
            id: 'reference-tito',
            title: 'Tito',
            previewUrl: 'data:image/png;base64,preview',
          },
        ]}
        onTextChange={() => {}}
        onMentionMatch={() => {}}
        onMentionIdsChange={() => {}}
      />,
    );

    await act(async () => {
      composerRef.current?.setText('Frame with @tit');
    });

    await act(async () => {
      composerRef.current?.insertMention('reference-tito', 'Tito', { start: 11, end: 15 }, undefined, 'data:image/png;base64,preview');
    });

    const mention = screen.getByTestId('selected-reference-mention');
    expect(mention).toHaveAttribute('data-mention-preview-url', 'data:image/png;base64,preview');
    expect(mention).toHaveClass('prompt-reference-mention--preview');
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

  it('keeps a prior chip when inserting a second @mention separated only by a space', async () => {
    const onMentionIdsChange = vi.fn();
    const composerRef = createRef<PromptComposerHandle>();

    render(
      <PromptComposer
        ref={composerRef}
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[
          { id: 'reference-tito', title: 'Tito' },
          { id: 'reference-nina', title: 'Nina' },
        ]}
        onTextChange={() => {}}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    // First mention is already a chip, followed by " @Nin" the user is typing.
    // The chip is the previous sibling of that text node, separated only by a
    // space — the case that used to make the second mention replace the first.
    await act(async () => {
      composerRef.current?.setText('@Tito @Nin');
    });
    await act(async () => {
      composerRef.current?.insertMention('reference-nina', 'Nina', { start: 5, end: 9 });
    });

    expect(input).toHaveTextContent('Tito Nina');
    expect(onMentionIdsChange).toHaveBeenLastCalledWith(['reference-tito', 'reference-nina']);
  });

  it('deletes a whole mention chip with a single backspace', async () => {
    const onMentionIdsChange = vi.fn();
    const composerRef = createRef<PromptComposerHandle>();

    render(
      <PromptComposer
        ref={composerRef}
        ariaLabel="Prompt"
        placeholder="Write something"
        isExpanded
        hasReferenceImages={false}
        mentionCandidates={[{ id: 'reference-garage', title: 'Mesa Principal Garagem' }]}
        onTextChange={() => {}}
        onMentionMatch={() => {}}
        onMentionIdsChange={onMentionIdsChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Prompt' });

    await act(async () => {
      composerRef.current?.setText('Use @gar');
    });

    await act(async () => {
      composerRef.current?.insertMention('reference-garage', 'Mesa Principal Garagem', { start: 4, end: 8 });
    });

    expect(screen.getByTestId('selected-reference-mention')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Backspace' });
    });

    expect(screen.queryByTestId('selected-reference-mention')).not.toBeInTheDocument();
    expect(onMentionIdsChange).toHaveBeenLastCalledWith([]);
  });
});
