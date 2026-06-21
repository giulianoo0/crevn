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
  it('renders markdown without blur or fade animation props during streaming', () => {
    render(<MessageResponse isAnimating>New streaming text</MessageResponse>);

    expect(screen.getByTestId('streamdown')).toHaveTextContent('New streaming text');
    expect(streamdownRender).toHaveBeenCalledWith(
      expect.objectContaining({
        isAnimating: true,
        className: expect.stringContaining('min-w-0'),
      })
    );
    expect(streamdownRender.mock.calls.at(-1)?.[0]).not.toHaveProperty('animated');
  });
});
