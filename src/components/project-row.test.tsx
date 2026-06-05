import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectRow } from './project-row';

describe('ProjectRow', () => {
  it('shows an export context-menu action for projects', () => {
    const handleExport = vi.fn();

    render(
      <ProjectRow
        id="project_1"
        name="Project One"
        isOpen
        onToggle={() => {}}
        onPrepareThreadDraft={() => {}}
        onOpenProperties={() => {}}
        onRename={() => {}}
        onExport={handleExport}
        onDelete={() => {}}
      />
    );

    const projectButton = screen.getByText('Project One').closest('button');
    expect(projectButton).not.toBeNull();

    fireEvent.contextMenu(projectButton!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export project...' }));

    expect(handleExport).toHaveBeenCalledWith('project_1');
  });
});
