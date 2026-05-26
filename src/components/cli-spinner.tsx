import { useEffect, useState } from 'react';
import spinners from 'cli-spinners';

const dots1 =
  (spinners as { dots1?: { frames: string[]; interval: number }; default?: { dots1?: { frames: string[]; interval: number } } }).dots1 ??
  (spinners as { default?: { dots1?: { frames: string[]; interval: number } } }).default?.dots1 ?? {
    interval: 80,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  };

export function CliSpinner({
  className = '',
  label,
}: {
  className?: string;
  label: string;
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % dots1.frames.length);
    }, dots1.interval);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <span aria-label={label} className={className}>
      {dots1.frames[frameIndex]}
    </span>
  );
}
