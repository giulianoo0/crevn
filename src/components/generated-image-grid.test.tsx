import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratedImageGrid } from './generated-image-grid';

const images = [
  { id: '1', fileUrl: 'file:///1.png', fileName: '1.png' },
  { id: '2', fileUrl: 'file:///2.png', fileName: '2.png' },
  { id: '3', fileUrl: 'file:///3.png', fileName: '3.png' },
  { id: '4', fileUrl: 'file:///4.png', fileName: '4.png' },
  { id: '5', fileUrl: 'file:///5.png', fileName: '5.png' },
];

describe('GeneratedImageGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders images across two rows with three images per row', () => {
    render(<GeneratedImageGrid images={images} className="h-[600px]" />);

    expect(screen.getByTestId('generated-image-grid-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('generated-image-grid-row-1')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(5);
  });

  it('renders shimmer placeholders for loading entries', () => {
    render(
      <GeneratedImageGrid
        images={[{ id: 'loading-1', fileName: 'Generating 1', isLoading: true }]}
        className="h-[300px]"
      />
    );

    const placeholder = screen.getByLabelText('Generating 1 loading');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass('animate-skeleton-shimmer');
    expect(placeholder).not.toHaveClass('animate-pulse');
  });

  it('renders nothing when there are no images', () => {
    const { container } = render(<GeneratedImageGrid images={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('calls selection and open handlers from image tiles', () => {
    const handleSelect = vi.fn();
    const handleOpen = vi.fn();

    render(
      <GeneratedImageGrid
        images={images}
        className="h-[600px]"
        selectedImageIds={['2']}
        onImageSelect={handleSelect}
        onImageOpen={handleOpen}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select 1.png' }));
    vi.advanceTimersByTime(220);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Select 2.png' }));

    expect(handleSelect).toHaveBeenCalledWith(images[0]);
    expect(handleOpen).toHaveBeenCalledWith(images[1]);
    expect(screen.getByRole('button', { name: 'Select 2.png' })).toHaveAttribute('data-selected', 'true');
  });

  it('shows a context menu with copy, download, and delete actions for images', () => {
    const handleCopy = vi.fn();
    const handleDownload = vi.fn();
    const handleDelete = vi.fn();

    render(
      <GeneratedImageGrid
        images={images}
        className="h-[600px]"
        onImageCopy={handleCopy}
        onImageDownload={handleDownload}
        onImageDelete={handleDelete}
      />
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(handleCopy).toHaveBeenCalledWith(images[0]);
    expect(handleDownload).toHaveBeenCalledWith(images[0]);
    expect(handleDelete).toHaveBeenCalledWith(images[0]);
  });
});
