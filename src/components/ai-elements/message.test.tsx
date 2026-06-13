import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageResponse } from './message';

const streamdownRender = vi.fn();

vi.mock('streamdown', () => ({
  Streamdown: (props: Record<string, unknown>) => {
    streamdownRender(props);
    return <div data-testid="streamdown">{props.children as string}</div>;
  },
}));

describe('MessageResponse', () => {
  it('enables blur-in word animation for streaming markdown', () => {
    render(<MessageResponse isAnimating>New streaming text</MessageResponse>);

    expect(screen.getByTestId('streamdown')).toHaveTextContent('New streaming text');
    expect(streamdownRender).toHaveBeenCalledWith(
      expect.objectContaining({
        animated: {
          animation: 'blurIn',
          duration: 280,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          sep: 'word',
          stagger: 12,
        },
        isAnimating: true,
      })
    );
  });
});
