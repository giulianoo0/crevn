import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
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

export const LiquidMetalButton = forwardRef<
  HTMLDivElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function LiquidMetalButton({ className = '', children, disabled, ...props }, forwardedRef) {
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
      const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasSize = Math.max(1, Math.floor(size * pixelRatio));

      if (canvas.width !== canvasSize || canvas.height !== canvasSize) {
        canvas.width = canvasSize;
        canvas.height = canvasSize;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size, size);

      const t = timestamp * 0.001;
      const radius = size / 2;
      const center = radius;
      const outerRadius = radius - 0.75;
      const ringThickness = 2;
      const innerRadius = Math.max(0, outerRadius - ringThickness);
      const ringMidRadius = innerRadius + ringThickness * 0.5;

      context.save();
      context.beginPath();
      context.arc(center, center, outerRadius, 0, Math.PI * 2);
      context.arc(center, center, innerRadius, 0, Math.PI * 2, true);
      context.clip('evenodd');

      // Dark base under the spectral layers keeps contrast high.
      context.fillStyle = 'rgba(16,18,24,0.98)';
      context.fillRect(0, 0, size, size);

      const segments = 180;
      const step = (Math.PI * 2) / segments;
      context.lineWidth = ringThickness;
      context.lineCap = 'round';
      context.globalCompositeOperation = 'screen';
      for (let index = 0; index < segments; index += 1) {
        const u = index / segments;
        const start = u * Math.PI * 2 + t * 0.95;
        const end = start + step * 0.92;
        const hue = (u * 360 + t * 160) % 360;
        const light = 42 + 18 * Math.sin(u * 14 + t * 2.4) + 12 * Math.sin(u * 32 - t * 1.7);

        context.strokeStyle = `hsla(${hue}, 94%, ${Math.max(20, Math.min(84, light))}%, 0.9)`;
        context.beginPath();
        context.arc(center, center, ringMidRadius, start, end);
        context.stroke();
      }

      context.globalCompositeOperation = 'overlay';
      context.lineWidth = ringThickness * 0.9;
      for (let index = 0; index < 3; index += 1) {
        const phase = t * (1.45 + index * 0.35) + index * 2.1;
        const spread = 0.6 + index * 0.08;
        const hue = (220 + index * 95 + t * 80) % 360;
        const alpha = 0.33 - index * 0.07;
        context.strokeStyle = `hsla(${hue}, 100%, ${72 + index * 6}%, ${alpha})`;
        context.beginPath();
        context.arc(center, center, ringMidRadius, phase, phase + spread);
        context.stroke();
      }

      const sweep = context.createLinearGradient(
        radius + Math.sin(t * 0.9) * radius * 1.2,
        0,
        radius - Math.sin(t * 0.9) * radius * 1.2,
        size
      );
      sweep.addColorStop(0, 'rgba(255,255,255,0)');
      sweep.addColorStop(0.35, 'rgba(255,255,255,0.26)');
      sweep.addColorStop(0.5, 'rgba(255,255,255,0.92)');
      sweep.addColorStop(0.65, 'rgba(255,255,255,0.26)');
      sweep.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = sweep;
      context.fillRect(0, 0, size, size);

      context.globalCompositeOperation = 'multiply';
      const shadowSweep = context.createLinearGradient(
        radius - Math.cos(t * 1.1) * radius * 1.1,
        0,
        radius + Math.cos(t * 1.1) * radius * 1.1,
        size
      );
      shadowSweep.addColorStop(0, 'rgba(15,18,24,0)');
      shadowSweep.addColorStop(0.42, 'rgba(15,18,24,0.52)');
      shadowSweep.addColorStop(0.58, 'rgba(15,18,24,0.52)');
      shadowSweep.addColorStop(1, 'rgba(15,18,24,0)');
      context.fillStyle = shadowSweep;
      context.fillRect(0, 0, size, size);

      context.globalCompositeOperation = 'source-over';

      const vignette = context.createRadialGradient(center, center, innerRadius, center, center, outerRadius);
      vignette.addColorStop(0, 'rgba(255,255,255,0)');
      vignette.addColorStop(0.6, 'rgba(16,18,24,0)');
      vignette.addColorStop(1, 'rgba(8,10,14,0.42)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, size, size);

      context.restore();

      context.strokeStyle = 'rgba(255,255,255,0.16)';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(center, center, outerRadius, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = 'rgba(255,255,255,0.1)';
      context.beginPath();
      context.arc(center, center, innerRadius, 0, Math.PI * 2);
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
      className={['pointer-events-auto relative z-30 h-10 w-10 shrink-0', className].join(' ')}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full rounded-full"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-[3px] rounded-full bg-[rgba(15,16,16,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
      <button
        type="button"
        disabled={disabled}
        {...props}
        className="absolute inset-0 inline-flex items-center justify-center rounded-full text-[var(--foreground)] transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </button>
    </div>
  );
});
