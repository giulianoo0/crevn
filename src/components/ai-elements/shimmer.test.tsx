import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShimmerSurface, TextShimmer } from './shimmer';

describe('shimmer primitives', () => {
  it('exports TextShimmer for streaming thread copy', () => {
    render(<TextShimmer>Thinking...</TextShimmer>);

    const shimmer = screen.getByText('Thinking...');

    expect(shimmer).toBeInTheDocument();
    expect(shimmer).toHaveClass('t-shimmer');
    expect(shimmer).toHaveAttribute('data-text', 'Thinking...');
    expect(shimmer).not.toHaveAttribute('style');
  });

  it('renders a reusable surface shimmer for loading cards', () => {
    render(<ShimmerSurface data-testid="surface-shimmer" className="h-10 w-10" />);

    expect(screen.getByTestId('surface-shimmer')).toHaveClass('animate-skeleton-shimmer');
  });
});
