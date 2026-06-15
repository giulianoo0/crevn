import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneratedImageGrid } from './generated-image-grid';

vi.mock('@number-flow/react', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock('border-beam', () => ({
  BorderBeam: ({
    children,
    size,
    colorVariant,
    theme,
    strength,
  }: {
    children: unknown;
    size?: string;
    colorVariant?: string;
    theme?: string;
    strength?: number;
  } & Record<string, unknown>) => (
    <div
      data-testid="border-beam"
      data-size={size}
      data-color-variant={colorVariant}
      data-theme={theme}
      data-strength={strength}
    >
      {children}
    </div>
  ),
}));

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

  it('caps fit-height grids so large image sets stay virtualized', () => {
    const manyImages = Array.from({ length: 60 }, (_, index) => ({
      id: `image-${index + 1}`,
      fileUrl: `file:///${index + 1}.png`,
      fileName: `${index + 1}.png`,
    }));

    const { container } = render(
      <GeneratedImageGrid
        images={manyImages}
        columnCount={2}
        cardHeight={220}
        rowGap={12}
        fitHeight
        maxFitHeight={464}
      />
    );

    expect(container.firstElementChild).toHaveStyle({ height: '464px' });
    expect(screen.getByRole('button', { name: 'Select 1.png' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select 60.png' })).not.toBeInTheDocument();
  });

  it('renders BorderBeam placeholders with a large elapsed counter for loading entries', () => {
    vi.setSystemTime(new Date('2026-05-26T10:30:42.000Z'));

    render(
      <GeneratedImageGrid
        images={[
          {
            id: 'loading-1',
            fileName: 'Generating 1',
            isLoading: true,
            provider: 'api',
            modelLabel: 'GPT-5.4 Mini',
            generationStartedAt: '2026-05-26T10:30:00.000Z',
          },
        ]}
        className="h-[300px]"
      />
    );

    const placeholder = screen.getByLabelText('Generating 1 loading');
    expect(placeholder).toBeInTheDocument();
    expect(screen.getByTestId('border-beam')).toBeInTheDocument();
    expect(screen.getByTestId('border-beam')).toHaveAttribute('data-color-variant', 'colorful');
    expect(screen.getByTestId('border-beam')).toHaveAttribute('data-strength', '1');
    expect(screen.getByLabelText('00:42')).toHaveClass('text-[44px]');
    expect(screen.queryByText('GPT-5.4 Mini')).not.toBeInTheDocument();
  });

  it('uses BorderBeam placeholders without WebGL loading surfaces', () => {
    render(
      <GeneratedImageGrid
        images={[
          {
            id: 'loading-1',
            fileName: 'Generating 1',
            isLoading: true,
            provider: 'api',
          },
        ]}
        className="h-[300px]"
      />
    );

    expect(screen.getByTestId('border-beam')).toBeInTheDocument();
    expect(screen.getByLabelText('Generating 1 loading')).toBeInTheDocument();
    expect(screen.queryByTestId('shimmer-surface')).not.toBeInTheDocument();
  });

  it('shows model and time metadata on image tiles', () => {
    render(
      <GeneratedImageGrid
        images={[
          {
            id: 'agy-1',
            fileUrl: 'file:///agy-1.png',
            fileName: 'agy-1.png',
            provider: 'api',
            modelLabel: 'Gemini 3.5 Flash (Low)',
            durationMs: 92_500,
          },
        ]}
        className="h-[300px]"
      />
    );

    expect(screen.getByText('Gemini 3.5 Flash (Low)')).toBeInTheDocument();
    expect(screen.getByText('01:32')).toBeInTheDocument();
  });

  it('does not add a hover border to non-selected image tiles', () => {
    render(
      <GeneratedImageGrid
        images={[
          {
            id: 'hover-1',
            fileUrl: 'file:///hover-1.png',
            fileName: 'hover-1.png',
            provider: 'api',
            modelLabel: 'GPT-5.4 Mini',
            durationMs: 12_000,
          },
        ]}
        className="h-[300px]"
      />
    );

    expect(screen.getByRole('button', { name: 'Select hover-1.png' }).className).not.toContain('hover:border');
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

  it('shows a context menu with copy, copy prompt, download, and delete actions for images', () => {
    const handleCopy = vi.fn();
    const handleCopyPrompt = vi.fn();
    const handleDownload = vi.fn();
    const handleDelete = vi.fn();

    render(
      <GeneratedImageGrid
        images={[
          {
            ...images[0],
            prompt: 'A cinematic control room frame',
          },
          ...images.slice(1),
        ]}
        className="h-[600px]"
        onImageCopy={handleCopy}
        onImageCopyPrompt={handleCopyPrompt}
        onImageDownload={handleDownload}
        onImageDelete={handleDelete}
      />
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy prompt' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download' }));
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Select 1.png' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(handleCopy).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    expect(handleCopyPrompt).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    expect(handleDownload).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
