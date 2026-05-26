import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateProjectDialog } from './create-project-dialog';

describe('CreateProjectDialog', () => {
  it('collects a project name and submits it', () => {
    const onSubmit = vi.fn();

    render(
      <CreateProjectDialog open onOpenChange={() => {}} onSubmit={onSubmit} />
    );

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Campaign Boards' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(onSubmit).toHaveBeenCalledWith('Campaign Boards');
  });

  it('disables submission while the project name is empty', () => {
    render(
      <CreateProjectDialog open onOpenChange={() => {}} onSubmit={() => {}} />
    );

    expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled();
  });
});
