import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const shimmerSurfaceSpy = vi.fn((props: Record<string, unknown>) => <div data-testid="shimmer-surface" {...props} />);

vi.mock('img-fx', () => ({
  ImageGeneration: ({ children }: { children: unknown }) => <div data-testid="img-fx-surface">{children}</div>,
}));

vi.mock('./ai-elements/shimmer', () => ({
  ShimmerSurface: (props: Record<string, unknown>) => shimmerSurfaceSpy(props),
}));

import { GeneratedImageGrid } from './generated-image-grid';

describe('GeneratedImageGrid shimmer integration', () => {
  it('uses the shared shimmer surface for loading tiles', () => {
    render(
      <GeneratedImageGrid
        images={[
          {
            id: 'loading-1',
            fileName: 'Generating 1',
            isLoading: true,
          },
        ]}
        className="h-[300px]"
      />
    );

    expect(screen.getByTestId('shimmer-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('img-fx-surface')).not.toBeInTheDocument();
    expect(shimmerSurfaceSpy).toHaveBeenCalled();
  });
});
