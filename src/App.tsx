import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, ChevronDown, ChevronUp, Crop, Disc3, Plus, WandSparkles, X } from 'lucide-react';
import { MetalFx, resumeShared } from 'metal-fx';

import birdsEyePreview from './assets/angle-previews/birds-eye.png';
import cleanSinglePreview from './assets/angle-previews/clean-single.png';
import closeUpPreview from './assets/angle-previews/close-up.png';
import cowboyShotPreview from './assets/angle-previews/cowboy-shot.png';
import crossShotPreview from './assets/angle-previews/cross-shot.png';
import dialogueInsertPreview from './assets/angle-previews/dialogue-insert.png';
import dutchAnglePreview from './assets/angle-previews/dutch-angle.png';
import eyeLevelPreview from './assets/angle-previews/eye-level.png';
import dirtySinglePreview from './assets/angle-previews/dirty-single.png';
import ensembleWidePreview from './assets/angle-previews/ensemble-wide.png';
import extremeCloseUpPreview from './assets/angle-previews/extreme-close-up.png';
import extremeWideShotPreview from './assets/angle-previews/extreme-wide-shot.png';
import groundLevelPreview from './assets/angle-previews/ground-level.png';
import groupOverTheShoulderPreview from './assets/angle-previews/group-over-the-shoulder.png';
import groupThreeShotPreview from './assets/angle-previews/group-three-shot.png';
import highAnglePreview from './assets/angle-previews/high-angle.png';
import hipLevelPreview from './assets/angle-previews/hip-level.png';
import kneeLevelPreview from './assets/angle-previews/knee-level.png';
import longShotPreview from './assets/angle-previews/long-shot.png';
import lowAnglePreview from './assets/angle-previews/low-angle.png';
import mediumShotPreview from './assets/angle-previews/medium-shot.png';
import overheadPreview from './assets/angle-previews/overhead.png';
import overTheShoulderPreview from './assets/angle-previews/over-the-shoulder.png';
import overTheHipPreview from './assets/angle-previews/over-the-hip.png';
import profileShotPreview from './assets/angle-previews/profile-shot.png';
import povPreview from './assets/angle-previews/pov.png';
import reactionShotPreview from './assets/angle-previews/reaction-shot.png';
import shoulderLevelPreview from './assets/angle-previews/shoulder-level.png';
import shotReverseShotPreview from './assets/angle-previews/shot-reverse-shot.png';
import silhouetteShotPreview from './assets/angle-previews/silhouette-shot.png';
import twoShotPreview from './assets/angle-previews/two-shot.png';
import wideEstablishingPreview from './assets/angle-previews/wide-establishing.png';
import wormsEyePreview from './assets/angle-previews/worms-eye.png';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const aspectRatioOptions = [
  { value: '1:1' },
  { value: '3:4' },
  { value: '2:3' },
  { value: '9:16' },
  { value: '3:2' },
  { value: '4:3' },
  { value: '16:9', badge: 'Cinematic' },
  { value: '21:9', badge: 'Cinematic' },
] as const;

const angleOptions = [
  {
    name: 'Eye Level',
    tone: 'Neutral, balanced framing',
    preview: eyeLevelPreview,
  },
  {
    name: 'Low Angle',
    tone: 'Powerful, dominant presence',
    preview: lowAnglePreview,
  },
  {
    name: 'High Angle',
    tone: 'Vulnerable, exposed subject',
    preview: highAnglePreview,
  },
  {
    name: 'Dutch Angle',
    tone: 'Tension and instability',
    preview: dutchAnglePreview,
  },
  {
    name: 'Overhead',
    tone: 'Graphic top-down staging',
    preview: overheadPreview,
  },
  {
    name: 'Over-the-Shoulder',
    tone: 'Conversational perspective',
    preview: overTheShoulderPreview,
  },
  {
    name: 'POV',
    tone: 'Immersive first-person lens',
    preview: povPreview,
  },
  {
    name: 'Wide Establishing',
    tone: 'Spatial context and scale',
    preview: wideEstablishingPreview,
  },
  {
    name: "Worm's-Eye",
    tone: 'Extreme floor-level heroic scale',
    preview: wormsEyePreview,
  },
  {
    name: "Bird's-Eye",
    tone: 'High aerial spatial control',
    preview: birdsEyePreview,
  },
  {
    name: 'Shoulder Level',
    tone: 'Natural character-height intimacy',
    preview: shoulderLevelPreview,
  },
  {
    name: 'Hip Level',
    tone: 'Action-ready beltline framing',
    preview: hipLevelPreview,
  },
  {
    name: 'Knee Level',
    tone: 'Low kinetic adventure energy',
    preview: kneeLevelPreview,
  },
  {
    name: 'Ground Level',
    tone: 'Floor-skimming dramatic presence',
    preview: groundLevelPreview,
  },
  {
    name: 'Cowboy Shot',
    tone: 'Head-to-thigh character stance',
    preview: cowboyShotPreview,
  },
  {
    name: 'Extreme Close-Up',
    tone: 'Intense eyes and expression',
    preview: extremeCloseUpPreview,
  },
  {
    name: 'Close-Up',
    tone: 'Face-first emotional detail',
    preview: closeUpPreview,
  },
  {
    name: 'Medium Shot',
    tone: 'Waist-up performance framing',
    preview: mediumShotPreview,
  },
  {
    name: 'Long Shot',
    tone: 'Full body with environment',
    preview: longShotPreview,
  },
  {
    name: 'Extreme Wide',
    tone: 'Tiny subject, big world',
    preview: extremeWideShotPreview,
  },
  {
    name: 'Profile Shot',
    tone: 'Graphic side-view silhouette',
    preview: profileShotPreview,
  },
  {
    name: 'Two Shot',
    tone: 'Two-character relationship frame',
    preview: twoShotPreview,
  },
  {
    name: 'Group Three-Shot',
    tone: 'Triangular conversation blocking',
    preview: groupThreeShotPreview,
  },
  {
    name: 'Clean Single',
    tone: 'One speaker isolated cleanly',
    preview: cleanSinglePreview,
  },
  {
    name: 'Dirty Single',
    tone: 'Speaker framed with foreground shoulder',
    preview: dirtySinglePreview,
  },
  {
    name: 'Reaction Shot',
    tone: 'Emotion-first response coverage',
    preview: reactionShotPreview,
  },
  {
    name: 'Shot-Reverse-Shot',
    tone: 'Alternating dialogue coverage',
    preview: shotReverseShotPreview,
  },
  {
    name: 'Over-the-Hip',
    tone: 'Low side foreground perspective',
    preview: overTheHipPreview,
  },
  {
    name: 'Group OTS',
    tone: 'Shoulder-framed group dialogue',
    preview: groupOverTheShoulderPreview,
  },
  {
    name: 'Cross Shot',
    tone: 'Opposing eyelines and tension',
    preview: crossShotPreview,
  },
  {
    name: 'Ensemble Wide',
    tone: 'Full group conversation geography',
    preview: ensembleWidePreview,
  },
  {
    name: 'Dialogue Insert',
    tone: 'Hands and gesture detail',
    preview: dialogueInsertPreview,
  },
  {
    name: 'Silhouette Shot',
    tone: 'Backlit iconic character shape',
    preview: silhouetteShotPreview,
  },
] as const;

class AnglePanelErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Angle panel crashed', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-[900px] rounded-[24px] border border-[var(--border-soft)] bg-[rgba(31,31,32,0.96)] p-4 text-sm text-[var(--foreground)] shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
          <div className="mb-2 font-semibold">Angle panel error</div>
          <div className="whitespace-pre-wrap break-words text-[var(--muted-foreground)]">
            {this.state.error.message}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<(typeof aspectRatioOptions)[number]['value']>('16:9');
  const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
  const [isAnglePanelOpen, setIsAnglePanelOpen] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<(typeof angleOptions)[number]['name']>('Low Angle');
  const [metalReady, setMetalReady] = useState(false);
  const [fxDebug, setFxDebug] = useState({
    visibility: 'unknown',
    hidden: false,
    rafTicks: 0,
    canvasChanging: 'unknown',
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  const wandButtonRef = useRef<HTMLButtonElement>(null);
  const sendFxRef = useRef<HTMLDivElement>(null);

  const hasPrompt = prompt.trim().length > 0;
  const isExpanded = useMemo(
    () => isFocused || hasPrompt || isAspectRatioOpen || isAnglePanelOpen,
    [isFocused, hasPrompt, isAspectRatioOpen, isAnglePanelOpen]
  );

  const holdComposerOpen = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setIsFocused(true);
  }, []);

  const openAnglePanel = useCallback(() => {
    setIsAnglePanelOpen(true);
  }, []);

  const closeAnglePanel = useCallback(() => {
    setIsAnglePanelOpen(false);
  }, []);

  const keepAnglePanelOpen = useCallback(() => {
    setIsAnglePanelOpen(true);
  }, []);

  const handleSelectAngle = useCallback((angle: (typeof angleOptions)[number]['name']) => {
    setSelectedAngle(angle);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'OffscreenCanvas' in window) {
      try {
        Object.defineProperty(window, 'OffscreenCanvas', {
          value: undefined,
          configurable: true,
        });
      } catch {
        window.OffscreenCanvas = undefined as never;
      }
    }

    setMetalReady(true);
  }, []);

  useEffect(() => {
    const resume = () => {
      resumeShared();
    };

    resume();

    const intervalId = window.setInterval(resume, 1000);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);

    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      window.clearInterval(intervalId);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let rafTicks = 0;
    let previousSnapshot = '';

    const tick = () => {
      rafTicks += 1;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    const intervalId = window.setInterval(() => {
      const canvas = sendFxRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      let canvasChanging = 'missing';

      if (canvas) {
        try {
          const snapshot = canvas.toDataURL();
          canvasChanging = previousSnapshot && snapshot !== previousSnapshot ? 'yes' : 'no';
          previousSnapshot = snapshot;
        } catch {
          canvasChanging = 'unreadable';
        }
      }

      setFxDebug({
        visibility: document.visibilityState,
        hidden: document.hidden,
        rafTicks,
        canvasChanging,
      });

      rafTicks = 0;
    }, 1000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_34%)]" />

      <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="relative mx-auto w-full max-w-[620px]">
          <AnimatePresence initial={false}>
            {isExpanded && isAnglePanelOpen ? (
              <>
                <motion.button
                  key="angle-panel-scrim"
                  type="button"
                  aria-label="Fechar painel de angulos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="fixed inset-0 z-20 cursor-default bg-transparent"
                  onClick={() => setIsAnglePanelOpen(false)}
                />

                <motion.div
                  key="angle-panel"
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.99 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1/2 z-30 -translate-x-1/2"
                  style={{ bottom: 'calc(100% + 12px)' }}
                  onMouseDown={holdComposerOpen}
                >
                  <AnglePanelErrorBoundary>
                    <AnglePanel
                      selectedAngle={selectedAngle}
                      onClose={closeAnglePanel}
                      onSelectAngle={handleSelectAngle}
                      onKeepOpen={keepAnglePanelOpen}
                      onInteract={holdComposerOpen}
                    />
                  </AnglePanelErrorBoundary>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isExpanded && !isAnglePanelOpen ? (
              <motion.div
                key="angle-chip"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.985 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-5 z-20"
                style={{ bottom: 'calc(100% + 12px)' }}
                onMouseDown={holdComposerOpen}
              >
                <FloatingAngleChip
                  selectedAngle={selectedAngle}
                  onClick={openAnglePanel}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            className={[
              'relative overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)]',
              'shadow-[0_24px_72px_rgba(0,0,0,0.45)] backdrop-blur-xl',
              'transition-[height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isExpanded ? 'h-[182px] px-5 pb-5 pt-5' : 'h-[64px] px-4 py-3',
            ].join(' ')}
            onMouseDown={(event) => {
              const target = event.target as HTMLElement;

              if (target.closest('button')) return;
              inputRef.current?.focus();
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Escreva algo
            </label>

            <textarea
              ref={inputRef}
              id={inputId}
              value={prompt}
              rows={isExpanded ? 3 : 1}
              placeholder="Escreva algo..."
              onChange={(event) => setPrompt(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                if (blurTimeoutRef.current !== null) {
                  window.clearTimeout(blurTimeoutRef.current);
                }

                blurTimeoutRef.current = window.setTimeout(() => {
                  setIsFocused(false);
                  blurTimeoutRef.current = null;
                }, 180);
              }}
              className={[
                'relative z-0 w-full resize-none border-0 bg-transparent p-0 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]',
                'transition-[height,font-size,line-height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded
                  ? 'h-[88px] pr-0 pt-[40px] text-[21px] leading-[1.35]'
                  : 'h-[40px] pl-[52px] pr-[52px] pt-[8px] text-[15px] leading-[24px] overflow-hidden',
              ].join(' ')}
            />

            {isExpanded ? (
              <div className="absolute inset-x-5 top-[16px] z-10" onMouseDown={holdComposerOpen}>
                <InlineAttachmentsRow />
              </div>
            ) : null}

            <div
              className={[
                'pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between',
                'transition-[left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded ? 'left-5 right-5 bottom-4' : 'left-4 right-4 bottom-3',
              ].join(' ')}
            >
              <div className="flex items-center">
                <div
                  className={[
                    'overflow-hidden transition-[width,margin,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isExpanded ? 'mr-0 w-0 opacity-0' : 'mr-2.5 w-10 opacity-100',
                  ].join(' ')}
                >
                  <button
                    ref={plusButtonRef}
                    type="button"
                    aria-label="Adicionar"
                    tabIndex={isExpanded ? -1 : 0}
                    aria-hidden={isExpanded}
                    className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] text-[var(--foreground)] transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div
                  className={[
                    'flex items-center gap-2.5 overflow-hidden transition-[max-width,opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isExpanded ? 'max-w-[280px] opacity-100 translate-y-0' : 'max-w-0 opacity-0 translate-y-1',
                  ].join(' ')}
                  aria-hidden={!isExpanded}
                >
                  <Popover open={isAspectRatioOpen} onOpenChange={setIsAspectRatioOpen}>
                    <PopoverTrigger asChild>
                      <button
                        ref={aspectRatioButtonRef}
                        type="button"
                        tabIndex={isExpanded ? 0 : -1}
                        onMouseDown={holdComposerOpen}
                        className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-4 text-[13px] font-medium text-[var(--foreground)] transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]"
                      >
                        <Crop className="size-3.5 text-[var(--muted-foreground)]" />
                        <span>{selectedAspectRatio}</span>
                        <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="start"
                      side="top"
                      sideOffset={12}
                      className="min-w-[176px]"
                      onOpenAutoFocus={(event) => event.preventDefault()}
                      onMouseDown={holdComposerOpen}
                    >
                      {aspectRatioOptions.map((option) => {
                        const isSelected = option.value === selectedAspectRatio;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onMouseDown={holdComposerOpen}
                            onClick={() => {
                              setSelectedAspectRatio(option.value);
                              setIsAspectRatioOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-white/4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-4 w-4 rounded-[4px] border border-white/70" />
                              <span className="text-[14px] font-semibold text-[var(--foreground)]">
                                {option.value}
                              </span>
                              {option.badge ? (
                                <span className="rounded-full bg-[rgba(197,255,0,0.14)] px-2 py-1 text-[11px] font-semibold text-[#d0f23a]">
                                  {option.badge}
                                </span>
                              ) : null}
                            </div>

                            <span className={isSelected ? 'text-[#d0f23a]' : 'opacity-0'}>✓</span>
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  ref={wandButtonRef}
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  aria-hidden={!isExpanded}
                  className={[
                    'pointer-events-auto inline-flex h-10 items-center justify-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] text-[var(--foreground)]',
                    'transition-[width,opacity,transform,margin] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]',
                    isExpanded ? 'w-10 opacity-100 translate-y-0' : 'w-0 border-transparent opacity-0 translate-y-1',
                  ].join(' ')}
                >
                  <WandSparkles className="size-4 shrink-0" />
                </button>

                {metalReady ? (
                  <SendButton
                    hostRef={sendFxRef}
                    reflectionTargets={
                      isExpanded
                        ? [plusButtonRef, aspectRatioButtonRef, wandButtonRef]
                        : [plusButtonRef]
                    }
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--surface2)]" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed left-3 top-3 z-50 rounded-[12px] border border-[var(--border-soft)] bg-[rgba(18,18,19,0.94)] px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">
        <div>vis: {fxDebug.visibility}</div>
        <div>hidden: {String(fxDebug.hidden)}</div>
        <div>raf/s: {fxDebug.rafTicks}</div>
        <div>fx pixels: {fxDebug.canvasChanging}</div>
      </div>
    </main>
  );
}

function SendButton({
  hostRef,
  reflectionTargets,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  reflectionTargets: RefObject<HTMLElement | null>[];
}) {
  return (
    <MetalFx
      ref={hostRef}
      variant="circle"
      preset="chromatic"
      theme="dark"
      strength={0.86}
      shaderScale={2.15}
      ringCssPx={3.35}
      scale={1.04}
      reflectionTargets={reflectionTargets}
      className="pointer-events-auto relative z-30 shrink-0"
      disableGlow={false}
    >
      <button
        type="button"
        aria-label="Enviar"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(26,26,27,0.58)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-transform duration-200 hover:scale-[1.02]"
      >
        <ArrowUp className="size-4" />
      </button>
    </MetalFx>
  );
}

function FloatingAngleChip({
  selectedAngle,
  onClick,
}: {
  selectedAngle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.94)] px-4 text-[14px] font-medium text-[var(--foreground)] shadow-[0_14px_32px_rgba(0,0,0,0.24)]"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffae4b_0%,#dc3f0f_58%,#631300_100%)]">
        <Disc3 className="size-3 text-white/90" />
      </span>
      <span>{selectedAngle}</span>
      <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
    </button>
  );
}

function InlineAttachmentsRow() {
  return (
    <div className="pointer-events-auto flex w-full items-center">
      <button
        type="button"
        aria-label="Adicionar anexo"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[var(--surface2)] text-[var(--foreground)]"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function AnglePanel({
  selectedAngle,
  onClose,
  onSelectAngle,
  onKeepOpen,
  onInteract,
}: {
  selectedAngle: (typeof angleOptions)[number]['name'];
  onClose: () => void;
  onSelectAngle: (angle: (typeof angleOptions)[number]['name']) => void;
  onKeepOpen: () => void;
  onInteract: () => void;
}) {
  const selectedIndex = angleOptions.findIndex((angle) => angle.name === selectedAngle);
  const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeIndexRef = useRef(initialIndex);
  const dragStartYRef = useRef(0);
  const dragStartIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const selectedAngleData = angleOptions[activeIndex] ?? angleOptions[0];

  const selectAngleIndex = useCallback(
    (nextIndex: number) => {
      const wrappedIndex =
        ((nextIndex % angleOptions.length) + angleOptions.length) % angleOptions.length;
      const nextAngle = angleOptions[wrappedIndex]?.name;

      if (!nextAngle) return;

      activeIndexRef.current = wrappedIndex;
      setActiveIndex(wrappedIndex);
      onSelectAngle(nextAngle);
    },
    [onSelectAngle]
  );

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex !== activeIndexRef.current) {
      activeIndexRef.current = selectedIndex;
      setActiveIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const goToAngleIndex = useCallback(
    (nextIndex: number) => {
      onInteract();
      onKeepOpen();
      setDragOffset(0);
      selectAngleIndex(nextIndex);
    },
    [onInteract, onKeepOpen, selectAngleIndex]
  );

  const getCircularDistance = useCallback(
    (index: number) => {
      const rawDistance = index - activeIndex;

      if (rawDistance > angleOptions.length / 2) return rawDistance - angleOptions.length;
      if (rawDistance < -angleOptions.length / 2) return rawDistance + angleOptions.length;
      return rawDistance;
    },
    [activeIndex]
  );

  return (
    <div
      className="pointer-events-auto w-[780px] rounded-[24px] border border-[var(--border-soft)] bg-[rgba(31,31,32,0.96)] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl"
      onMouseDown={onInteract}
    >
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
          Ângulos
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(44,44,46,0.92)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="grid h-[330px] grid-cols-[1.45fr_0.95fr] gap-5 px-3 pb-3 pt-0">
        <div className="flex items-center justify-center">
          <div className="relative h-[220px] w-[220px] overflow-hidden rounded-full border border-white/10 bg-[var(--surface2)] shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
            <img
              src={selectedAngleData.preview}
              alt={`${selectedAngleData.name} preview`}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-28px_50px_rgba(0,0,0,0.24)]" />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto] gap-4 pb-1">
          <div
            className="relative h-[296px] touch-none overflow-hidden py-2"
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const direction = event.deltaY > 0 ? 1 : -1;
              const steps = Math.max(1, Math.min(4, Math.round(Math.abs(event.deltaY) / 48)));

              goToAngleIndex(activeIndexRef.current + direction * steps);
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              onInteract();
              onKeepOpen();
              dragStartYRef.current = event.clientY;
              dragStartIndexRef.current = activeIndexRef.current;
              setIsDragging(true);
              setDragOffset(0);
            }}
            onPointerMove={(event) => {
              if (!isDragging) return;

              const nextOffset = event.clientY - dragStartYRef.current;
              const movedSteps = Math.trunc(nextOffset / 56);
              const centeredOffset = nextOffset - movedSteps * 56;
              const nextIndex = dragStartIndexRef.current - movedSteps;
              const wrappedIndex =
                ((nextIndex % angleOptions.length) + angleOptions.length) % angleOptions.length;

              activeIndexRef.current = wrappedIndex;
              setActiveIndex(wrappedIndex);
              setDragOffset(centeredOffset);
            }}
            onPointerUp={(event) => {
              if (!isDragging) return;

              event.currentTarget.releasePointerCapture(event.pointerId);
              setIsDragging(false);
              setDragOffset(0);
              selectAngleIndex(activeIndexRef.current);
            }}
            onPointerCancel={() => {
              setIsDragging(false);
              setDragOffset(0);
              selectAngleIndex(activeIndexRef.current);
            }}
          >
            {angleOptions.map((angle, index) => {
              const relativeDistance = getCircularDistance(index);
              const absoluteDistance = Math.abs(relativeDistance);
              const isSelected = index === activeIndex;
              const scale = Math.max(0.72, 1 - absoluteDistance * 0.11);
              const translateX = Math.min(absoluteDistance * 14, 34);
              const opacity = absoluteDistance > 3 ? 0 : Math.max(0.18, 1 - absoluteDistance * 0.22);

              return (
                <button
                  key={angle.name}
                  type="button"
                  onMouseDown={onInteract}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    goToAngleIndex(index);
                  }}
                  className={[
                    'absolute left-0 top-1/2 flex h-[56px] w-full transform-gpu items-center gap-4 rounded-[18px] border border-transparent bg-transparent px-3 text-left will-change-[transform,opacity]',
                    isDragging
                      ? ''
                      : 'transition-[transform,opacity,color] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                    isSelected ? 'text-white' : 'text-white/42',
                  ].join(' ')}
                  style={{
                    transform: `translate3d(-${translateX}px, calc(-50% + ${relativeDistance * 64 + dragOffset}px), 0) scale(${scale})`,
                    opacity,
                    transformOrigin: 'center right',
                    pointerEvents: absoluteDistance > 3 ? 'none' : 'auto',
                  }}
                >
                  <img
                    src={angle.preview}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover opacity-90 ring-1 ring-white/8 transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-medium transition-colors duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
                      {angle.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-center gap-3">
            <button
              type="button"
              onMouseDown={onInteract}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onInteract();
                onKeepOpen();
                goToAngleIndex(activeIndexRef.current - 1);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] text-white/85 transition-[background-color,border-color] duration-200 hover:bg-[rgba(255,255,255,0.12)]"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              onMouseDown={onInteract}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onInteract();
                onKeepOpen();
                goToAngleIndex(activeIndexRef.current + 1);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] text-white/85 transition-[background-color,border-color] duration-200 hover:bg-[rgba(255,255,255,0.12)]"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
