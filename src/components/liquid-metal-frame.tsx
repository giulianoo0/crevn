import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const nextRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
}

export const LiquidMetalFrame = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    innerClassName?: string;
    radiusClassName?: string;
  }
>(function LiquidMetalFrame(
  { className = '', innerClassName = '', radiusClassName = 'rounded-full', children, ...props },
  forwardedRef
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId = 0;

    const draw = (timestamp: number) => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasWidth = Math.max(1, Math.floor(width * pixelRatio));
      const canvasHeight = Math.max(1, Math.floor(height * pixelRatio));

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const t = timestamp * 0.001;
      const ringThickness = 2;
      const outerInset = 0.75;
      const innerInset = outerInset + ringThickness;
      const outerRadius = height / 2;
      const innerRadius = Math.max(0, outerRadius - ringThickness);

      context.save();
      roundedRectPath(context, outerInset, outerInset, width - outerInset * 2, height - outerInset * 2, outerRadius);
      roundedRectPath(context, innerInset, innerInset, width - innerInset * 2, height - innerInset * 2, innerRadius);
      context.clip('evenodd');

      context.fillStyle = 'rgba(16,18,24,0.98)';
      context.fillRect(0, 0, width, height);

      const sweep = context.createLinearGradient(
        width * 0.15 + Math.sin(t * 0.9) * width * 0.55,
        0,
        width * 0.85 - Math.sin(t * 0.9) * width * 0.55,
        height
      );
      sweep.addColorStop(0, 'rgba(255,255,255,0)');
      sweep.addColorStop(0.35, 'rgba(255,255,255,0.26)');
      sweep.addColorStop(0.5, 'rgba(255,255,255,0.92)');
      sweep.addColorStop(0.65, 'rgba(255,255,255,0.26)');
      sweep.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = sweep;
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < 4; index += 1) {
        const gradient = context.createLinearGradient(
          0,
          height * (0.12 + index * 0.18),
          width,
          height * (0.88 - index * 0.16)
        );
        const hue = (t * 140 + index * 78) % 360;
        gradient.addColorStop(0, `hsla(${(hue + 300) % 360}, 100%, 58%, 0)`);
        gradient.addColorStop(0.25, `hsla(${hue}, 96%, 62%, 0.28)`);
        gradient.addColorStop(0.5, `hsla(${(hue + 50) % 360}, 100%, 70%, 0.64)`);
        gradient.addColorStop(0.75, `hsla(${(hue + 110) % 360}, 96%, 62%, 0.26)`);
        gradient.addColorStop(1, `hsla(${(hue + 180) % 360}, 100%, 58%, 0)`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      context.globalCompositeOperation = 'multiply';
      const shadowSweep = context.createLinearGradient(
        width * 0.2 - Math.cos(t * 1.1) * width * 0.45,
        0,
        width * 0.8 + Math.cos(t * 1.1) * width * 0.45,
        height
      );
      shadowSweep.addColorStop(0, 'rgba(15,18,24,0)');
      shadowSweep.addColorStop(0.42, 'rgba(15,18,24,0.52)');
      shadowSweep.addColorStop(0.58, 'rgba(15,18,24,0.52)');
      shadowSweep.addColorStop(1, 'rgba(15,18,24,0)');
      context.fillStyle = shadowSweep;
      context.fillRect(0, 0, width, height);
      context.restore();

      context.strokeStyle = 'rgba(255,255,255,0.16)';
      context.lineWidth = 1;
      roundedRectPath(context, outerInset, outerInset, width - outerInset * 2, height - outerInset * 2, outerRadius);
      context.stroke();

      context.strokeStyle = 'rgba(255,255,255,0.1)';
      roundedRectPath(context, innerInset, innerInset, width - innerInset * 2, height - innerInset * 2, innerRadius);
      context.stroke();

      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={(node) => {
        hostRef.current = node;
        assignRef(forwardedRef, node);
      }}
      className={['relative', className].join(' ')}
      {...props}
    >
      <canvas ref={canvasRef} className={['absolute inset-0 h-full w-full', radiusClassName].join(' ')} aria-hidden="true" />
      <div
        className={[
          'pointer-events-none absolute inset-[3px] bg-[rgba(15,16,16,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          radiusClassName,
          innerClassName,
        ].join(' ')}
      />
      <div className={['relative z-10 h-full w-full', radiusClassName].join(' ')}>{children}</div>
    </div>
  );
});
