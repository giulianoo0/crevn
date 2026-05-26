import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GeneratedImageGrid } from './generated-image-grid';

const images = [
  { id: '1', fileUrl: 'file:///1.png', fileName: '1.png' },
  { id: '2', fileUrl: 'file:///2.png', fileName: '2.png' },
  { id: '3', fileUrl: 'file:///3.png', fileName: '3.png' },
  { id: '4', fileUrl: 'file:///4.png', fileName: '4.png' },
  { id: '5', fileUrl: 'file:///5.png', fileName: '5.png' },
];

describe('GeneratedImageGrid', () => {
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
});
