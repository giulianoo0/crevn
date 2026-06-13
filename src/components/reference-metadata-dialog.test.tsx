import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ReferenceMetadataDialog,
  type ReferenceMetadataDraft,
} from './reference-metadata-dialog';

const images = [
  {
    id: 'image-1',
    name: 'front.png',
    title: 'Front view',
    description: 'Use for face continuity.',
    previewUrl: 'data:image/png;base64,AQID',
  },
  {
    id: 'image-2',
    name: 'profile.png',
    title: 'Profile view',
    description: 'Use for side angles.',
    previewUrl: 'data:image/png;base64,BAUG',
  },
];

const initialDraft: ReferenceMetadataDraft = {
  title: 'Lumo',
  description: 'Use for all Lumo generations.',
  images,
};

describe('ReferenceMetadataDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('opens focused on the requested image', () => {
    render(
      <ReferenceMetadataDialog
        open
        initialDraft={initialDraft}
        initialImageId="image-2"
        onOpenChange={() => {}}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Edit reference metadata' })).toHaveClass('is-open');
    expect(screen.getByLabelText('Image name')).toHaveValue('Profile view');
    expect(screen.getByLabelText('When to use this image')).toHaveValue('Use for side angles.');
  });

  it('auto-saves the latest draft 500ms after editing stops', async () => {
    const onSave = vi.fn(async () => {});
    render(
      <ReferenceMetadataDialog
        open
        initialDraft={initialDraft}
        initialImageId={null}
        onOpenChange={() => {}}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('Reference group name'), {
      target: { value: 'Lumo hero' },
    });

    expect(screen.getByRole('status', { name: 'Editing' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Lumo hero',
        description: 'Use for all Lumo generations.',
      })
    );
    expect(screen.getByRole('status', { name: 'Saved' })).toBeInTheDocument();
  });

  it('flushes pending changes before requesting close', async () => {
    const onSave = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    render(
      <ReferenceMetadataDialog
        open
        initialDraft={initialDraft}
        initialImageId="image-1"
        onOpenChange={onOpenChange}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('When to use this image'), {
      target: { value: 'Use whenever the face is visible.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: expect.arrayContaining([
          expect.objectContaining({
            id: 'image-1',
            description: 'Use whenever the face is visible.',
          }),
        ]),
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
