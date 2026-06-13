import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from './chain-of-thought';

describe('chain of thought', () => {
  it('renders reasoning content open by default and allows collapsing it', () => {
    render(
      <ChainOfThought data-testid="cot">
        <ChainOfThoughtHeader>Thinking</ChainOfThoughtHeader>
        <ChainOfThoughtContent>Visible reasoning</ChainOfThoughtContent>
      </ChainOfThought>
    );

    const trigger = screen.getByRole('button', { name: 'Thinking' });

    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Visible reasoning')).toBeInTheDocument();
    expect(screen.getByTestId('cot').className).not.toContain('bg-');

    fireEvent.click(trigger);
    expect(screen.queryByText('Visible reasoning')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByText('Visible reasoning')).toBeInTheDocument();
  });

  it('visually separates reasoning from the final answer', () => {
    render(
      <ChainOfThought data-testid="cot">
        <ChainOfThoughtHeader>Thought for 8s</ChainOfThoughtHeader>
        <ChainOfThoughtContent data-testid="cot-content">Visible reasoning</ChainOfThoughtContent>
      </ChainOfThought>
    );

    expect(screen.getByTestId('cot')).toHaveClass('border-l');
    expect(screen.getByTestId('cot')).toHaveClass('border-[rgba(65,130,230,0.45)]');
    expect(screen.getByRole('button', { name: 'Thought for 8s' })).toHaveClass('text-[12px]');
    expect(screen.getByTestId('cot-content')).toHaveClass('text-[13px]');
    expect(screen.getByTestId('cot-content')).toHaveClass('text-[color:rgba(150,151,158,0.84)]');
  });

  it('keeps empty pending reasoning non-expandable and moves shimmer to the title', () => {
    render(
      <ChainOfThought data-testid="cot" isExpandable={false}>
        <ChainOfThoughtHeader isShimmering>Thinking</ChainOfThoughtHeader>
        <ChainOfThoughtContent>Hidden reasoning</ChainOfThoughtContent>
      </ChainOfThought>
    );

    const title = screen.getByText('Thinking');

    expect(title).toHaveClass('t-shimmer');
    expect(title).toHaveClass('cot-title-shimmer');
    expect(title.closest('.t-text-swap')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thinking' })).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden reasoning')).not.toBeInTheDocument();
  });

  it('does not render a leading icon in the reasoning title', () => {
    const { container } = render(
      <ChainOfThought data-testid="cot">
        <ChainOfThoughtHeader>Thinking</ChainOfThoughtHeader>
        <ChainOfThoughtContent>Visible reasoning</ChainOfThoughtContent>
      </ChainOfThought>
    );

    expect(container.querySelector('.lucide-brain')).not.toBeInTheDocument();
  });

  it('does not leave the title hidden if the animation frame is delayed during a text swap', async () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 0);

    try {
      const { rerender } = render(
        <ChainOfThought data-testid="cot" isExpandable={false}>
          <ChainOfThoughtHeader isShimmering>Thinking</ChainOfThoughtHeader>
        </ChainOfThought>
      );

      rerender(
        <ChainOfThought data-testid="cot" isExpandable={false}>
          <ChainOfThoughtHeader>Thought for 8s</ChainOfThoughtHeader>
        </ChainOfThought>
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      const titleSlot = screen.getByText('Thought for 8s').closest('.t-text-swap');

      expect(titleSlot).toBeInTheDocument();
      expect(titleSlot).not.toHaveClass('is-exit');
      expect(titleSlot).not.toHaveClass('is-enter-start');
    } finally {
      requestAnimationFrameSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
