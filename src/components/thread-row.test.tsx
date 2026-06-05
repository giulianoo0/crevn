import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadRow } from './thread-row';

describe('ThreadRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a dots1 cli spinner to the left of the thread name while running', () => {
    const { rerender } = render(
      <ThreadRow
        id="thread_1"
        name="New Thread"
        createdAtLabel="Just now"
        isRunning
        onClick={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByLabelText('New Thread is generating')).toHaveTextContent('⠋');
    expect(screen.getByText('New Thread')).toBeInTheDocument();

    vi.advanceTimersByTime(80);
    rerender(
      <ThreadRow
        id="thread_1"
        name="New Thread"
        createdAtLabel="Just now"
        isRunning
        onClick={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByLabelText('New Thread is generating')).toHaveTextContent('⠙');
  });

  it('omits the spinner when the thread is idle', () => {
    render(
      <ThreadRow
        id="thread_2"
        name="New Thread 2"
        createdAtLabel="2m ago"
        isRunning={false}
        onClick={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.queryByLabelText('New Thread 2 is generating')).not.toBeInTheDocument();
  });

  it('shows an export context-menu action for threads', () => {
    const handleExport = vi.fn();

    render(
      <ThreadRow
        id="thread_1"
        name="New Thread"
        createdAtLabel="Just now"
        isRunning={false}
        onClick={() => {}}
        onRename={() => {}}
        onExport={handleExport}
        onDelete={() => {}}
      />
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: /New Thread/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export thread...' }));

    expect(handleExport).toHaveBeenCalledWith('thread_1');
  });
});
