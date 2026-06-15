import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const shimmerSurfaceSpy = vi.fn((props: Record<string, unknown>) => <div data-testid="shimmer-surface" {...props} />);

vi.mock('border-beam', () => ({
  BorderBeam: ({ children }: { children: unknown } & Record<string, unknown>) => (
    <div data-testid="border-beam">
      {children}
    </div>
  ),
}));

vi.mock('./ai-elements/shimmer', () => ({
  ShimmerSurface: (props: Record<string, unknown>) => shimmerSurfaceSpy(props),
}));

import { GeneratedImageGrid } from './generated-image-grid';

describe('GeneratedImageGrid shimmer integration', () => {
  it('uses BorderBeam instead of the shared shimmer surface for loading tiles', () => {
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

    expect(screen.getByTestId('border-beam')).toBeInTheDocument();
    expect(screen.queryByTestId('shimmer-surface')).not.toBeInTheDocument();
    expect(shimmerSurfaceSpy).not.toHaveBeenCalled();
  });
});
