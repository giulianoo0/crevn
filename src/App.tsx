import {
  Component,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Camera as CameraIcon,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Crop,
  Crosshair,
  Download,
  FolderPlus,
  Folder,
  ImagePlus,
  Minus,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { List, type RowComponentProps } from 'react-window';

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
import logo from './assets/logo.svg';
import { ConfirmDeleteDialog } from './components/confirm-delete-dialog';
import { CreateProjectDialog } from './components/create-project-dialog';
import { EntityNameDialog } from './components/entity-name-dialog';
import { GeneratedImageGrid } from './components/generated-image-grid';
import { LiquidMetalButton } from './components/liquid-metal-button';
import { LiquidMetalFrame } from './components/liquid-metal-frame';
import {
  ProjectPropertiesDialog,
  type ProjectPropertiesDraft,
} from './components/project-properties-dialog';
import { ProjectRow } from './components/project-row';
import { ThreadRow } from './components/thread-row';
import { PromptComposer, type PromptComposerHandle } from './components/prompt-composer';
import { getErrorMessage } from './lib/errors';
import {
  copyGeneratedImage,
  createProject,
  createReference,
  createThread,
  deleteGeneratedImage,
  deleteProject,
  deleteThread,
  downloadGeneratedImage,
  ensureProjectThreadWorkspace,
  generateImages,
  listGeneratedImages,
  listProjectsWithThreads,
  listReferences,
  renameProject,
  renameThread,
  subscribeToScenePlan,
  updateProjectSettings,
  type GeneratedImageRecord,
  type ProjectRecord,
  type ReferenceImageRecord,
} from './lib/electron-api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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

const generationModeOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'scene', label: 'Scene' },
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
const APP_VERSION = '0.1.0';
const APP_CHANNEL = 'ALPHA';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function estimateHeaderTitleWidth(title: string, includesSidebarToggle: boolean) {
  const baseShellWidth = 24 + 24 + 2;
  const toggleWidth = includesSidebarToggle ? 36 + 8 : 0;
  return Math.ceil(baseShellWidth + toggleWidth + Math.max(title.length, 8) * 9.5);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function base64ToObjectUrl(bytesBase64: string, mimeType: string) {
  const binary = window.atob(bytesBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function revokeReferencePreviewUrl(referenceImage: ComposerReferenceImage) {
  if (referenceImage.shouldRevokePreviewUrl !== false) {
    URL.revokeObjectURL(referenceImage.previewUrl);
  }
}

function revokePlayerSessionResources(session: PlayerSession | null) {
  if (!session) {
    return;
  }

  for (const referenceImage of session.characterReferences) {
    revokeReferencePreviewUrl(referenceImage);
  }
}

function createLoadingEntries(prefix: string, count: number): GeneratedImageRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `loading-${prefix}-${index}`,
    fileName: `Generating ${index + 1}`,
    createdAt: new Date().toISOString(),
    isLoading: true,
  }));
}

function mergeGeneratedImagesWithLoadingEntries(
  images: GeneratedImageRecord[],
  loadingEntries: GeneratedImageRecord[] | undefined
) {
  if (!loadingEntries?.length) {
    return images;
  }

  return [...loadingEntries, ...images];
}

function toSavedReferenceImage(reference: ReferenceImageRecord): SavedReferenceImage {
  return {
    id: reference.id,
    name: reference.name,
    title: reference.title,
    description: reference.description ?? undefined,
    mimeType: reference.mimeType,
    bytesBase64: reference.bytesBase64,
    previewUrl: base64ToObjectUrl(reference.bytesBase64, reference.mimeType),
    size: 0,
    createdAt: reference.createdAt,
    shouldRevokePreviewUrl: true,
  };
}

type ComposerReferenceImage = {
  id: string;
  name: string;
  mimeType: string;
  bytesBase64: string;
  previewUrl: string;
  size: number;
  sourceImageId?: string;
  shouldRevokePreviewUrl?: boolean;
};

type SavedReferenceImage = ComposerReferenceImage & {
  title: string;
  description?: string;
  createdAt: string;
};

type ComposerGenerationMode = (typeof generationModeOptions)[number]['value'];
type GenerationMode = ComposerGenerationMode | 'pinpoint' | 'camera';

type CameraPose = {
  rotationDeg: number;
  tiltDeg: number;
  zoom: number;
  generateBestAngles: boolean;
};

type PlayerImageSource = {
  id: string;
  name: string;
  previewUrl: string;
  mimeType: string;
  bytesBase64?: string;
  sourceImageId?: string;
  origin: 'generated' | 'attached';
};

type PlayerSession = {
  image: PlayerImageSource;
  mode: 'details' | 'pinpoint' | 'camera';
  point: { x: number; y: number } | null;
  camera: CameraPose;
  extraPrompt: string;
  extraPromptReferenceIds: string[];
  characterReferences: ComposerReferenceImage[];
};

type SidebarEntityAction =
  | null
  | {
      mode: 'rename' | 'delete';
      entity: 'project' | 'thread';
      id: string;
      name: string;
      projectId?: string;
    };

const defaultCameraPose: CameraPose = {
  rotationDeg: 0,
  tiltDeg: 0,
  zoom: 0,
  generateBestAngles: false,
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCameraZoom(value: number) {
  return Number(value.toFixed(2)).toString();
}

const CAMERA_MAX_ROTATION_DEG = 315;

function wrapCameraRotation(value: number) {
  return Math.round(clampValue(value, 0, CAMERA_MAX_ROTATION_DEG));
}

export function App() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [generationMode, setGenerationMode] = useState<ComposerGenerationMode>('manual');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<(typeof aspectRatioOptions)[number]['value']>('16:9');
  const [shotCount, setShotCount] = useState(1);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
  const [isAnglePanelOpen, setIsAnglePanelOpen] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<(typeof angleOptions)[number]['name']>('Low Angle');
  const [isAngleEnabled, setIsAngleEnabled] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [sidebarEntityAction, setSidebarEntityAction] = useState<SidebarEntityAction>(null);
  const [isSidebarEntityDialogOpen, setIsSidebarEntityDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isProjectPropertiesDialogOpen, setIsProjectPropertiesDialogOpen] = useState(false);
  const [projectPropertiesProjectId, setProjectPropertiesProjectId] = useState<string | null>(null);
  const [projectPropertiesDraft, setProjectPropertiesDraft] = useState<ProjectPropertiesDraft>({
    systemInstructions: '',
    artStyle: '',
  });
  const [isSavingProjectProperties, setIsSavingProjectProperties] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<'projects' | 'settings'>('projects');
  const [activeStudioView, setActiveStudioView] = useState<'generation' | 'references'>('generation');
  const [isAddReferenceDialogOpen, setIsAddReferenceDialogOpen] = useState(false);
  const [headerTitleWidth, setHeaderTitleWidth] = useState<number | null>(null);
  const [headerTextWidth, setHeaderTextWidth] = useState<number | null>(null);
  const [referenceImages, setReferenceImages] = useState<ComposerReferenceImage[]>([]);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReferenceImage[]>([]);
  const [selectedPromptReferenceIds, setSelectedPromptReferenceIds] = useState<string[]>([]);
  const [locallyRunningThreadIds, setLocallyRunningThreadIds] = useState<string[]>([]);
  const [loadingEntriesByThreadId, setLoadingEntriesByThreadId] = useState<Record<string, GeneratedImageRecord[]>>({});
  const [isReferenceDragActive, setIsReferenceDragActive] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [activeReferenceMentionIndex, setActiveReferenceMentionIndex] = useState(0);
  const composerRef = useRef<PromptComposerHandle>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<ComposerReferenceImage[]>([]);
  const savedReferencesRef = useRef<SavedReferenceImage[]>([]);
  const blurTimeoutRef = useRef<number | null>(null);
  const referenceDragDepthRef = useRef(0);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  const activeProjectPropertiesProject = projects.find((project) => project.id === projectPropertiesProjectId) ?? null;
  const wandButtonRef = useRef<HTMLButtonElement>(null);
  const sendFxRef = useRef<HTMLDivElement>(null);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const headerTitleMeasureRef = useRef<HTMLSpanElement>(null);
  const isReferencePickerOpenRef = useRef(false);
  const currentGenerationRef = useRef<{
    threadId: string;
    mode: GenerationMode;
    loadingPrefix: string;
  } | null>(null);

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => {
    savedReferencesRef.current = savedReferences;
  }, [savedReferences]);

  useEffect(() => {
    if (generationMode === 'scene' && isAnglePanelOpen) {
      setIsAnglePanelOpen(false);
    }
  }, [generationMode, isAnglePanelOpen]);

  const hasPrompt = prompt.trim().length > 0;
  const hasReferenceImages = referenceImages.length > 0;
  const selectedGeneratedImageIds = useMemo(
    () => referenceImages.map((image) => image.sourceImageId).filter((id): id is string => Boolean(id)),
    [referenceImages]
  );
  const selectedGeneratedImages = useMemo(
    () =>
      generatedImages.filter(
        (image) => !image.isLoading && selectedGeneratedImageIds.includes(image.id)
      ),
    [generatedImages, selectedGeneratedImageIds]
  );
  const isExpanded = useMemo(
    () => isFocused || hasPrompt || isModePickerOpen || isAspectRatioOpen || isAnglePanelOpen || hasReferenceImages,
    [hasReferenceImages, isFocused, hasPrompt, isModePickerOpen, isAspectRatioOpen, isAnglePanelOpen]
  );
  const activeThread = useMemo(
    () =>
      projects
        .flatMap((project) => project.threads)
        .find((thread) => thread.id === selectedThreadId) ?? null,
    [projects, selectedThreadId]
  );
  const activeThreadTitle = activeThread?.name ?? null;
  const referenceMentionMatch = useMemo(() => {
    const match = prompt.match(/@([^\s@]*)$/);
    if (!match || match.index === undefined) return null;
    return {
      query: match[1].toLowerCase(),
      start: match.index,
    };
  }, [prompt]);
  const referenceMentionOptions = useMemo(() => {
    if (!referenceMentionMatch) return [];

    const savedOpts = savedReferences.map((ref) => ({
      id: ref.id,
      title: ref.title,
      description: ref.description ?? 'Saved library reference',
      previewUrl: ref.previewUrl,
      isSaved: true,
      reference: ref,
    }));

    const attachedOpts = referenceImages.map((img) => {
      const titleWithoutExt = img.name.replace(/\.[^/.]+$/, "");
      return {
        id: img.id,
        title: titleWithoutExt,
        description: 'Attached inline image',
        previewUrl: img.previewUrl,
        isSaved: false,
        reference: img,
      };
    });

    const combined = [...savedOpts, ...attachedOpts];

    return combined
      .filter((option) => option.title.toLowerCase().includes(referenceMentionMatch.query))
      .slice(0, 5);
  }, [referenceMentionMatch, savedReferences, referenceImages]);

  useEffect(() => {
    setActiveReferenceMentionIndex(0);
  }, [referenceMentionMatch?.query, referenceMentionOptions.length]);

  const selectedPromptReferences = useMemo(() => {
    const savedRefs = savedReferences.filter((ref) => selectedPromptReferenceIds.includes(ref.id));
    const attachedRefs = referenceImages
      .filter((img) => selectedPromptReferenceIds.includes(img.id))
      .map((img) => ({
        id: img.id,
        title: img.name.replace(/\.[^/.]+$/, ""),
        description: 'Attached inline image',
        previewUrl: img.previewUrl,
        mimeType: img.mimeType,
        bytesBase64: img.bytesBase64,
        name: img.name,
      }));
    return [...savedRefs, ...attachedRefs];
  }, [savedReferences, referenceImages, selectedPromptReferenceIds]);

  const holdComposerOpen = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setIsFocused(true);
  }, []);

  const insertReferenceMention = useCallback((option: { id: string; title: string }) => {
    composerRef.current?.insertMention(option.id, option.title);
    holdComposerOpen();
  }, [holdComposerOpen]);

  const handleReferenceMentionNavigation = useCallback(
    (key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape') => {
      if (referenceMentionOptions.length === 0) return false;

      if (key === 'ArrowDown') {
        setActiveReferenceMentionIndex((current) => (current + 1) % referenceMentionOptions.length);
        return true;
      }

      if (key === 'ArrowUp') {
        setActiveReferenceMentionIndex((current) =>
          (current - 1 + referenceMentionOptions.length) % referenceMentionOptions.length
        );
        return true;
      }

      if (key === 'Enter') {
        const selectedOption =
          referenceMentionOptions[Math.min(activeReferenceMentionIndex, referenceMentionOptions.length - 1)];
        if (!selectedOption) return false;
        insertReferenceMention(selectedOption);
        return true;
      }

      return false;
    },
    [activeReferenceMentionIndex, insertReferenceMention, referenceMentionOptions]
  );

  const handleScrollTop = useCallback((nextScrollTop: number) => {
    setScrollTop(nextScrollTop);
  }, []);

  const popoverBottom = useMemo(() => {
    const paddingTop = isExpanded
      ? hasReferenceImages
        ? 112
        : 56
      : 8;
    const composerHeight = isExpanded
      ? hasReferenceImages
        ? 268
        : 228
      : 64;
    const textBeforeCursor = prompt.slice(0, cursorIndex);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const currentLineTop = paddingTop + lineIndex * 24 - scrollTop;
    return composerHeight - currentLineTop + 8;
  }, [isExpanded, hasReferenceImages, prompt, cursorIndex, scrollTop]);

  const clearReferenceImages = useCallback(() => {
    setReferenceImages((current) => {
      for (const referenceImage of current) {
        revokeReferencePreviewUrl(referenceImage);
      }
      return [];
    });
  }, []);

  const removeReferenceImage = useCallback((referenceImageId: string) => {
    setReferenceImages((current) => {
      const referenceImage = current.find((item) => item.id === referenceImageId);
      if (referenceImage) {
        revokeReferencePreviewUrl(referenceImage);
      }
      return current.filter((item) => item.id !== referenceImageId);
    });
  }, []);

  const buildGeneratedImageReference = useCallback(async (image: GeneratedImageRecord) => {
    if (!image.fileUrl) {
      throw new Error('Generated image is missing a file URL.');
    }

    const response = await fetch(image.fileUrl);
    const buffer = await response.arrayBuffer();
    const contentTypeHeader = response.headers?.get?.('content-type');
    const mimeType = contentTypeHeader && contentTypeHeader.startsWith('image/')
      ? contentTypeHeader
      : image.fileName.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : image.fileName.toLowerCase().endsWith('.jpg') || image.fileName.toLowerCase().endsWith('.jpeg')
          ? 'image/jpeg'
          : 'image/png';

    return {
      id: `generated-reference-${image.id}`,
      sourceImageId: image.id,
      name: image.fileName,
      mimeType,
      bytesBase64: bytesToBase64(new Uint8Array(buffer)),
      previewUrl: image.fileUrl,
      size: buffer.byteLength,
      shouldRevokePreviewUrl: false,
    } satisfies ComposerReferenceImage;
  }, []);

  const openGeneratedImagePlayer = useCallback((image: GeneratedImageRecord) => {
    setPlayerSession((current) => {
      revokePlayerSessionResources(current);
      return {
        image: {
          id: `generated-reference-${image.id}`,
          name: image.fileName,
          previewUrl: image.fileUrl ?? '',
          mimeType: image.fileName.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : image.fileName.toLowerCase().endsWith('.jpg') || image.fileName.toLowerCase().endsWith('.jpeg')
              ? 'image/jpeg'
              : 'image/png',
          sourceImageId: image.id,
          origin: 'generated',
        },
        mode: 'details',
        point: null,
        camera: { ...defaultCameraPose },
        extraPrompt: '',
        extraPromptReferenceIds: [],
        characterReferences: [],
      };
    });
  }, []);

  const openAttachedImagePlayer = useCallback((referenceImage: ComposerReferenceImage) => {
    setPlayerSession((current) => {
      revokePlayerSessionResources(current);
      return {
        image: {
          id: referenceImage.id,
          name: referenceImage.name,
          previewUrl: referenceImage.previewUrl,
          mimeType: referenceImage.mimeType,
          bytesBase64: referenceImage.bytesBase64,
          sourceImageId: referenceImage.sourceImageId,
          origin: referenceImage.sourceImageId ? 'generated' : 'attached',
        },
        mode: 'details',
        point: null,
        camera: { ...defaultCameraPose },
        extraPrompt: '',
        extraPromptReferenceIds: [],
        characterReferences: [],
      };
    });
  }, []);

  const closePlayer = useCallback(() => {
    setPlayerSession((current) => {
      revokePlayerSessionResources(current);
      return null;
    });
  }, []);

  const toggleGeneratedImageReference = useCallback(async (image: GeneratedImageRecord) => {
    const existing = referenceImagesRef.current.find((reference) => reference.sourceImageId === image.id);
    if (existing) {
      removeReferenceImage(existing.id);
      return;
    }

    const nextReference = await buildGeneratedImageReference(image);
    setReferenceImages((current) => [...current, nextReference]);
    holdComposerOpen();
  }, [buildGeneratedImageReference, holdComposerOpen, removeReferenceImage]);

  const handleCopyGeneratedImage = useCallback(async (image: GeneratedImageRecord) => {
    await copyGeneratedImage(image.id);
    toast.success('Image copied');
  }, []);

  const handleDownloadGeneratedImage = useCallback(async (image: GeneratedImageRecord) => {
    const didDownload = await downloadGeneratedImage(image.id);
    if (didDownload) {
      toast.success('Image downloaded');
    }
  }, []);

  const handleDeleteGeneratedImage = useCallback(async (image: GeneratedImageRecord) => {
    await deleteGeneratedImage(image.id);
    setGeneratedImages((current) => current.filter((entry) => entry.id !== image.id));
    setReferenceImages((current) => current.filter((reference) => reference.sourceImageId !== image.id));
    setPlayerSession((current) => {
      if (current?.image.sourceImageId === image.id) {
        revokePlayerSessionResources(current);
        return null;
      }
      return current;
    });
    toast.success('Image deleted');
  }, []);

  const handleCopySelectedGeneratedImages = useCallback(async () => {
    if (selectedGeneratedImages.length !== 1) {
      return;
    }

    await copyGeneratedImage(selectedGeneratedImages[0].id);
    toast.success('Image copied');
  }, [selectedGeneratedImages]);

  const handleDownloadSelectedGeneratedImages = useCallback(async () => {
    for (const image of selectedGeneratedImages) {
      const didDownload = await downloadGeneratedImage(image.id);
      if (!didDownload) {
        return;
      }
    }

    if (selectedGeneratedImages.length > 0) {
      toast.success(
        selectedGeneratedImages.length === 1 ? 'Image downloaded' : `Downloaded ${selectedGeneratedImages.length} images`
      );
    }
  }, [selectedGeneratedImages]);

  const handleDeleteSelectedGeneratedImages = useCallback(async () => {
    for (const image of selectedGeneratedImages) {
      await deleteGeneratedImage(image.id);
    }

    const selectedIds = new Set(selectedGeneratedImages.map((image) => image.id));
    setGeneratedImages((current) => current.filter((image) => !selectedIds.has(image.id)));
    setReferenceImages((current) => current.filter((reference) => !selectedIds.has(reference.sourceImageId ?? '')));
    setPlayerSession((current) => {
      if (current?.image.sourceImageId && selectedIds.has(current.image.sourceImageId)) {
        revokePlayerSessionResources(current);
        return null;
      }
      return current;
    });
    toast.success(
      selectedGeneratedImages.length === 1 ? 'Image deleted' : `Deleted ${selectedGeneratedImages.length} images`
    );
  }, [selectedGeneratedImages]);

  const handleAddSavedReference = useCallback(async ({
    file,
    title,
    description,
  }: {
    file: File;
    title: string;
    description?: string;
  }) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const reference = await createReference({
      name: file.name,
      title,
      description: description?.trim() || undefined,
      mimeType: file.type || 'image/png',
      bytesBase64: bytesToBase64(bytes),
    });
    setSavedReferences((current) => {
      const nextReference = toSavedReferenceImage(reference);
      return [nextReference, ...current];
    });
    toast.message('Reference added');
  }, []);

  const appendReferenceImages = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const nextReferenceImages = await Promise.all(
      imageFiles.map(async (file, index) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${index}`,
          name: file.name,
          mimeType: file.type || 'image/png',
          bytesBase64: bytesToBase64(bytes),
          previewUrl: URL.createObjectURL(file),
          size: file.size,
        } satisfies ComposerReferenceImage;
      })
    );

    setReferenceImages((current) => [...current, ...nextReferenceImages]);
    holdComposerOpen();
  }, [holdComposerOpen]);

  const openReferencePicker = useCallback(() => {
    isReferencePickerOpenRef.current = true;
    referenceInputRef.current?.click();
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

  const focusComposerFromEvent = useCallback((event: ReactMouseEvent | ReactPointerEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, [role="button"], a, input, textarea, [contenteditable], [role="textbox"]')) return;

    event.preventDefault();
    holdComposerOpen();
    composerRef.current?.focus();
  }, [holdComposerOpen]);

  const handleSelectAngle = useCallback((angle: (typeof angleOptions)[number]['name']) => {
    setSelectedAngle(angle);
  }, []);

  const refreshProjects = useCallback(async () => {
    const nextProjects = await listProjectsWithThreads();
    setProjects(nextProjects);
    setOpenProjects((current) => {
      const nextState = { ...current };
      for (const project of nextProjects) {
        if (!(project.id in nextState)) {
          nextState[project.id] = true;
        }
      }
      return nextState;
    });
    return nextProjects;
  }, []);

  const loadThreadImages = useCallback(async (threadId: string) => {
    const images = await listGeneratedImages(threadId);
    setGeneratedImages(mergeGeneratedImagesWithLoadingEntries(images, loadingEntriesByThreadId[threadId]));
  }, [loadingEntriesByThreadId]);

  const handleSelectThread = useCallback(async (projectId: string, threadId: string) => {
    setSelectedProjectId(projectId);
    setSelectedThreadId(threadId);
    await loadThreadImages(threadId);
  }, [loadThreadImages]);

  const handleCreateProject = useCallback(async (projectName: string) => {
    try {
      const workspace = await createProject(projectName);
      await refreshProjects();
      setSelectedProjectId(workspace.project.id);
      setSelectedThreadId(null);
      setGeneratedImages([]);
      toast.success('Project created');
    } catch (error) {
      console.error('Failed to create project', error);
      toast.error('Failed to create project');
    }
  }, [refreshProjects]);

  const handlePrepareThreadDraft = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedThreadId(null);
    setGeneratedImages([]);
    setOpenProjects((current) => ({
      ...current,
      [projectId]: true,
    }));
  }, []);

  const openProjectProperties = useCallback((projectId: string) => {
    const project = projects.find((entry) => entry.id === projectId);
    if (!project) {
      toast.error('Project not found');
      return;
    }

    setProjectPropertiesProjectId(projectId);
    setProjectPropertiesDraft({
      systemInstructions: project.systemInstructions,
      artStyle: project.artStyle,
    });
    setIsProjectPropertiesDialogOpen(true);
  }, [projects]);

  const handleProjectPropertiesOpenChange = useCallback((open: boolean) => {
    setIsProjectPropertiesDialogOpen(open);
  }, []);

  const handleProjectPropertiesOpenChangeComplete = useCallback((open: boolean) => {
    if (open) {
      return;
    }

    setProjectPropertiesProjectId(null);
    setProjectPropertiesDraft({
      systemInstructions: '',
      artStyle: '',
    });
    setIsSavingProjectProperties(false);
  }, []);

  const handleRenameProject = useCallback(async (projectId: string, name: string) => {
    try {
      await renameProject(projectId, name);
      await refreshProjects();
      toast.success('Project renamed');
    } catch (error) {
      console.error('Failed to rename project', error);
      toast.error('Failed to rename project');
    }
  }, [refreshProjects]);

  const handleSaveProjectProperties = useCallback(async () => {
    if (!projectPropertiesProjectId) {
      toast.error('Project not found');
      return;
    }

    setIsSavingProjectProperties(true);

    try {
      await updateProjectSettings(projectPropertiesProjectId, projectPropertiesDraft);
      setProjects((current) =>
        current.map((project) =>
          project.id === projectPropertiesProjectId
            ? {
                ...project,
                systemInstructions: projectPropertiesDraft.systemInstructions,
                artStyle: projectPropertiesDraft.artStyle,
              }
            : project
        )
      );
      toast.success('Project properties saved');
      handleProjectPropertiesOpenChange(false);
    } catch (error) {
      console.error('Failed to save project properties', error);
      toast.error('Failed to save project properties');
      setIsSavingProjectProperties(false);
    }
  }, [handleProjectPropertiesOpenChange, projectPropertiesDraft, projectPropertiesProjectId]);

  const handleRenameThread = useCallback(async (threadId: string, name: string) => {
    try {
      await renameThread(threadId, name);
      await refreshProjects();
      toast.success('Thread renamed');
    } catch (error) {
      console.error('Failed to rename thread', error);
      toast.error('Failed to rename thread');
    }
  }, [refreshProjects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      const nextProjects = await refreshProjects();
      toast.success('Project deleted');

      if (nextProjects.length === 0) {
        const workspace = await ensureProjectThreadWorkspace();
        const syncedProjects = await refreshProjects();
        setProjects(syncedProjects);
        setSelectedProjectId(workspace.project.id);
        setSelectedThreadId(workspace.thread.id);
        await loadThreadImages(workspace.thread.id);
        return;
      }

      if (selectedProjectId === projectId) {
        setSelectedProjectId(nextProjects[0]?.id ?? null);
        setSelectedThreadId(null);
        setGeneratedImages([]);
      }
    } catch (error) {
      console.error('Failed to delete project', error);
      toast.error('Failed to delete project');
    }
  }, [loadThreadImages, refreshProjects, selectedProjectId]);

  const handleDeleteThread = useCallback(async (threadId: string, projectId: string) => {
    try {
      await deleteThread(threadId);
      await refreshProjects();
      toast.message('Thread deleted');

      if (selectedThreadId === threadId) {
        setSelectedProjectId(projectId);
        setSelectedThreadId(null);
        setGeneratedImages([]);
      }
    } catch (error) {
      console.error('Failed to delete thread', error);
      toast.error('Failed to delete thread');
    }
  }, [refreshProjects, selectedThreadId]);

  const openSidebarEntityDialog = useCallback((action: Exclude<SidebarEntityAction, null>) => {
    setSidebarEntityAction(action);
    setIsSidebarEntityDialogOpen(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) return;

    let activeProjectId = selectedProjectId;
    let activeThreadId = selectedThreadId;

    if (!activeProjectId) {
      try {
        const workspace = await ensureProjectThreadWorkspace();
        activeProjectId = workspace.project.id;
        activeThreadId = workspace.thread.id;
        setSelectedProjectId(workspace.project.id);
        setSelectedThreadId(workspace.thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to prepare workspace', error);
        return;
      }
    }

    if (!activeThreadId && activeProjectId) {
      try {
        const thread = await createThread(activeProjectId);
        activeThreadId = thread.id;
        setSelectedThreadId(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before generation', error);
        return;
      }
    }

    const loadingPrefix = `${Date.now()}`;
    const loadingEntries = createLoadingEntries(loadingPrefix, shotCount);
    const isCurrentLoadingEntry = (image: GeneratedImageRecord) =>
      image.isLoading && image.id.startsWith(`loading-${loadingPrefix}-`);

    currentGenerationRef.current = {
      threadId: activeThreadId,
      mode: generationMode,
      loadingPrefix,
    };

    setIsGenerating(true);
    setLocallyRunningThreadIds((current) =>
      current.includes(activeThreadId) ? current : [...current, activeThreadId]
    );
    setLoadingEntriesByThreadId((current) => ({
      ...current,
      [activeThreadId]: loadingEntries,
    }));
    setGeneratedImages((current) => [...loadingEntries, ...current]);
    toast.message('Generation started');

    try {
      const uniqueReferenceImages = [];
      const seenBytes = new Set<string>();

      // 1. Add mentioned saved references
      const selectedSavedReferences = savedReferences.filter((reference) =>
        selectedPromptReferenceIds.includes(reference.id)
      );
      for (const ref of selectedSavedReferences) {
        if (ref.bytesBase64) {
          seenBytes.add(ref.bytesBase64);
        }
        uniqueReferenceImages.push({
          name: ref.name,
          title: ref.title,
          description: ref.description ?? undefined,
          mimeType: ref.mimeType,
          bytesBase64: ref.bytesBase64,
        });
      }

      // 2. Add attached reference images (avoiding duplicates)
      for (const img of referenceImages) {
        if (img.bytesBase64 && seenBytes.has(img.bytesBase64)) {
          continue;
        }
        if (img.bytesBase64) {
          seenBytes.add(img.bytesBase64);
        }
        uniqueReferenceImages.push({
          name: img.name,
          title: img.name.replace(/\.[^/.]+$/, ""),
          mimeType: img.mimeType,
          bytesBase64: img.bytesBase64,
        });
      }

      // 3. Map prompt reference names to RefImageX (Name) placeholder format
      let mappedPrompt = trimmedPrompt;
      const sortedRefsForReplacement = [...uniqueReferenceImages]
        .filter((ref) => ref.title)
        .map((ref, index) => ({
          title: ref.title!,
          placeholder: `RefImage${index + 1} (${ref.title})`,
        }))
        .sort((left, right) => right.title.length - left.title.length);

      for (const item of sortedRefsForReplacement) {
        const regex = new RegExp(escapeRegExp(item.title), 'g');
        mappedPrompt = mappedPrompt.replace(regex, item.placeholder);
      }

      // 4. Format reference images list with RefImageX as title
      const formattedReferenceImages = uniqueReferenceImages.map((ref, index) => ({
        name: ref.name,
        title: `RefImage${index + 1}`,
        description: ref.description,
        mimeType: ref.mimeType,
        bytesBase64: ref.bytesBase64,
      }));

      const generationPrompt =
        generationMode === 'scene'
          ? `${mappedPrompt}\n\nAspect ratio: ${selectedAspectRatio}\nMode: Scene`
          : [
              mappedPrompt,
              '',
              `Aspect ratio: ${selectedAspectRatio}`,
              isAngleEnabled ? `Angle: ${selectedAngle}` : null,
            ]
              .filter((line): line is string => line !== null)
              .join('\n');

      const result = await generateImages({
        mode: generationMode,
        prompt: generationPrompt,
        count: shotCount,
        threadId: activeThreadId,
        referenceImages: formattedReferenceImages,
      });

      await refreshProjects();
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) => [
        ...result.assets,
        ...current.filter((image) => !isCurrentLoadingEntry(image)),
      ]);
      setPrompt('');
      setSelectedPromptReferenceIds([]);
      clearReferenceImages();
      composerRef.current?.clear();
      setIsFocused(false);
      toast.success(result.assets.length > 0 ? `Generated ${result.assets.length} images` : 'Generation complete');
    } catch (error) {
      console.error('Failed to generate images', error);
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) =>
        current.filter((image) => !isCurrentLoadingEntry(image))
      );
      await refreshProjects();
      clearReferenceImages();
      toast.error(getErrorMessage(error, 'Failed to generate images'));
    } finally {
      setLocallyRunningThreadIds((current) =>
        current.filter((threadId) => threadId !== activeThreadId)
      );
      currentGenerationRef.current = null;
      setIsGenerating(false);
    }
  }, [clearReferenceImages, generationMode, isAngleEnabled, isGenerating, prompt, referenceImages, refreshProjects, savedReferences, selectedAngle, selectedProjectId, selectedAspectRatio, selectedThreadId, shotCount]);

  const handlePinPointCharacterReferences = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const nextReferenceImages = await Promise.all(
      imageFiles.map(async (file, index) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${index}`,
          name: file.name,
          mimeType: file.type || 'image/png',
          bytesBase64: bytesToBase64(bytes),
          previewUrl: URL.createObjectURL(file),
          size: file.size,
          shouldRevokePreviewUrl: true,
        } satisfies ComposerReferenceImage;
      })
    );

    setPlayerSession((current) => {
      if (!current) {
        for (const referenceImage of nextReferenceImages) {
          revokeReferencePreviewUrl(referenceImage);
        }
        return current;
      }

      return {
        ...current,
        characterReferences: [...current.characterReferences, ...nextReferenceImages],
      };
    });
  }, []);

  const ensurePlayerImageBytes = useCallback(async (image: PlayerImageSource) => {
    if (image.bytesBase64) {
      return image;
    }

    const response = await fetch(image.previewUrl);
    const buffer = await response.arrayBuffer();
    const contentTypeHeader = response.headers?.get?.('content-type');
    const mimeType = contentTypeHeader && contentTypeHeader.startsWith('image/')
      ? contentTypeHeader
      : image.mimeType;

    return {
      ...image,
      mimeType,
      bytesBase64: bytesToBase64(new Uint8Array(buffer)),
    };
  }, []);

  const handlePinPointGenerate = useCallback(async () => {
    const session = playerSession;
    if (!session || !session.point || isGenerating) {
      return;
    }

    let activeProjectId = selectedProjectId;
    let activeThreadId = selectedThreadId;

    if (!activeProjectId) {
      try {
        const workspace = await ensureProjectThreadWorkspace();
        activeProjectId = workspace.project.id;
        activeThreadId = workspace.thread.id;
        setSelectedProjectId(workspace.project.id);
        setSelectedThreadId(workspace.thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to prepare workspace', error);
        return;
      }
    }

    if (!activeThreadId && activeProjectId) {
      try {
        const thread = await createThread(activeProjectId);
        activeThreadId = thread.id;
        setSelectedThreadId(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before generation', error);
        return;
      }
    }

    const loadingPrefix = `${Date.now()}`;
    const loadingEntries = createLoadingEntries(loadingPrefix, 1);
    const isCurrentLoadingEntry = (image: GeneratedImageRecord) =>
      image.isLoading && image.id.startsWith(`loading-${loadingPrefix}-`);

    currentGenerationRef.current = {
      threadId: activeThreadId,
      mode: 'pinpoint',
      loadingPrefix,
    };

    let sourceImage: PlayerImageSource;
    try {
      sourceImage = await ensurePlayerImageBytes(session.image);
    } catch (error) {
      console.error('Failed to prepare pinpoint source image', error);
      toast.error(getErrorMessage(error, 'Failed to prepare pinpoint image.'));
      return;
    }

    const extraPrompt = session.extraPrompt.trim();
    const sourceReference = {
      name: sourceImage.name,
      title: 'RefImage1',
      description: `Primary pinpoint source image. Selected point x=${session.point.x}, y=${session.point.y}. Preserve this world and target this location.`,
      mimeType: sourceImage.mimeType,
      bytesBase64: sourceImage.bytesBase64 ?? '',
    };

    const characterReferences = session.characterReferences.map((referenceImage, index) => ({
      name: referenceImage.name,
      title: `RefImage${index + 2}`,
      description: 'Character sheet reference for insertion at the selected point.',
      mimeType: referenceImage.mimeType,
      bytesBase64: referenceImage.bytesBase64,
    }));
    const mentionedSavedReferences = savedReferencesRef.current.filter((reference) =>
      session.extraPromptReferenceIds.includes(reference.id)
    );
    const extraPromptReferences = mentionedSavedReferences.map((reference, index) => ({
      name: reference.name,
      title: `RefImage${characterReferences.length + index + 2}`,
      description: reference.description ?? 'Extra prompt saved reference.',
      mimeType: reference.mimeType,
      bytesBase64: reference.bytesBase64,
    }));

    setIsGenerating(true);
    setLocallyRunningThreadIds((current) =>
      current.includes(activeThreadId) ? current : [...current, activeThreadId]
    );
    setLoadingEntriesByThreadId((current) => ({
      ...current,
      [activeThreadId]: loadingEntries,
    }));
    setGeneratedImages((current) => [...loadingEntries, ...current]);
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        mode: 'pinpoint',
        prompt: [
          'Pin Point source image: RefImage1',
          `Pin Point selected point: x=${session.point.x}, y=${session.point.y}`,
          characterReferences.length > 0
            ? `Pin Point character references: ${characterReferences.map((reference) => reference.title).join(', ')}`
            : 'Pin Point character references: none',
          extraPromptReferences.length > 0
            ? `Pin Point extra prompt references: ${extraPromptReferences.map((reference) => reference.title).join(', ')}`
            : null,
          extraPrompt ? `Pin Point extra prompt: ${extraPrompt}` : null,
          `Aspect ratio: ${selectedAspectRatio}`,
        ].filter(Boolean).join('\n'),
        count: 1,
        threadId: activeThreadId,
        referenceImages: [sourceReference, ...characterReferences, ...extraPromptReferences],
        pinPoint: {
          point: session.point,
          extraPrompt: extraPrompt || undefined,
          hasCharacterReferences: characterReferences.length > 0,
        },
      });

      await refreshProjects();
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) => [
        ...result.assets,
        ...current.filter((image) => !isCurrentLoadingEntry(image)),
      ]);
      toast.success(result.assets.length > 0 ? 'Generated 1 image' : 'Generation complete');
    } catch (error) {
      console.error('Failed to generate pinpoint image', error);
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) =>
        current.filter((image) => !isCurrentLoadingEntry(image))
      );
      await refreshProjects();
      toast.error(getErrorMessage(error, 'Failed to generate pinpoint image'));
    } finally {
      setLocallyRunningThreadIds((current) =>
        current.filter((threadId) => threadId !== activeThreadId)
      );
      currentGenerationRef.current = null;
      setIsGenerating(false);
    }
  }, [closePlayer, ensurePlayerImageBytes, isGenerating, playerSession, refreshProjects, selectedAspectRatio, selectedProjectId, selectedThreadId]);

  const handleCameraGenerate = useCallback(async () => {
    const session = playerSession;
    if (!session || isGenerating) {
      return;
    }

    let activeProjectId = selectedProjectId;
    let activeThreadId = selectedThreadId;

    if (!activeProjectId) {
      try {
        const workspace = await ensureProjectThreadWorkspace();
        activeProjectId = workspace.project.id;
        activeThreadId = workspace.thread.id;
        setSelectedProjectId(workspace.project.id);
        setSelectedThreadId(workspace.thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to prepare workspace', error);
        return;
      }
    }

    if (!activeThreadId && activeProjectId) {
      try {
        const thread = await createThread(activeProjectId);
        activeThreadId = thread.id;
        setSelectedThreadId(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before generation', error);
        return;
      }
    }

    if (!activeThreadId) {
      toast.error('Failed to prepare thread for camera generation');
      return;
    }

    const cameraPose = session.camera;
    const outputCount = cameraPose.generateBestAngles ? 12 : 1;
    const loadingPrefix = `${Date.now()}`;
    const loadingEntries = createLoadingEntries(loadingPrefix, outputCount);
    const isCurrentLoadingEntry = (image: GeneratedImageRecord) =>
      image.isLoading && image.id.startsWith(`loading-${loadingPrefix}-`);

    currentGenerationRef.current = {
      threadId: activeThreadId,
      mode: 'camera',
      loadingPrefix,
    };

    let sourceImage: PlayerImageSource;
    try {
      sourceImage = await ensurePlayerImageBytes(session.image);
    } catch (error) {
      console.error('Failed to prepare camera source image', error);
      toast.error(getErrorMessage(error, 'Failed to prepare camera source image.'));
      return;
    }

    const sourceReference = {
      name: sourceImage.name,
      title: 'RefImage1',
      description: [
        'Primary camera source image.',
        'Preserve identity and synthesize a new camera view from this exact scene anchor.',
        'Preserve original aspect ratio, quality, and style. Change as little as possible except the camera angle.',
        `Requested camera rotation ${cameraPose.rotationDeg} degrees, tilt ${cameraPose.tiltDeg} degrees, zoom ${formatCameraZoom(cameraPose.zoom)}.`,
      ].join(' '),
      mimeType: sourceImage.mimeType,
      bytesBase64: sourceImage.bytesBase64 ?? '',
    };

    setIsGenerating(true);
    setLocallyRunningThreadIds((current) =>
      current.includes(activeThreadId) ? current : [...current, activeThreadId]
    );
    setLoadingEntriesByThreadId((current) => ({
      ...current,
      [activeThreadId]: loadingEntries,
    }));
    setGeneratedImages((current) => [...loadingEntries, ...current]);
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        mode: 'camera',
        prompt: [
          'Camera source image: RefImage1',
          `Camera rotation: ${cameraPose.rotationDeg}°`,
          `Camera tilt: ${cameraPose.tiltDeg}°`,
          `Camera zoom: ${formatCameraZoom(cameraPose.zoom)}`,
          cameraPose.generateBestAngles
            ? 'Camera sweep: generate these 12 orbit/tilt camera pairs: 0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°.'
            : 'Camera sweep: single requested camera view.',
          'Aspect ratio: match RefImage1 exactly; preserve the source canvas dimensions and proportions.',
        ].join('\n'),
        count: outputCount,
        threadId: activeThreadId,
        referenceImages: [sourceReference],
        camera: cameraPose,
      });

      await refreshProjects();
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) => [
        ...result.assets,
        ...current.filter((image) => !isCurrentLoadingEntry(image)),
      ]);
      toast.success(
        result.assets.length === 1
          ? 'Generated 1 image'
          : result.assets.length > 1
            ? `Generated ${result.assets.length} images`
            : 'Generation complete'
      );
    } catch (error) {
      console.error('Failed to generate camera image', error);
      setLoadingEntriesByThreadId((current) => {
        const nextState = { ...current };
        delete nextState[activeThreadId];
        return nextState;
      });
      setGeneratedImages((current) =>
        current.filter((image) => !isCurrentLoadingEntry(image))
      );
      await refreshProjects();
      toast.error(getErrorMessage(error, 'Failed to generate camera image'));
    } finally {
      setLocallyRunningThreadIds((current) =>
        current.filter((threadId) => threadId !== activeThreadId)
      );
      currentGenerationRef.current = null;
      setIsGenerating(false);
    }
  }, [closePlayer, ensurePlayerImageBytes, isGenerating, playerSession, refreshProjects, selectedAspectRatio, selectedProjectId, selectedThreadId]);

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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const workspace = await ensureProjectThreadWorkspace();
        const nextProjects = await listProjectsWithThreads();
        const images = await listGeneratedImages(workspace.thread.id);
        const references = await listReferences();
        if (!cancelled) {
          setProjects(nextProjects);
          setOpenProjects((current) => {
            const nextState = { ...current };
            for (const project of nextProjects) {
              if (!(project.id in nextState)) {
                nextState[project.id] = true;
              }
            }
            return nextState;
          });
          setSelectedProjectId(workspace.project.id);
          setSelectedThreadId(workspace.thread.id);
          setGeneratedImages(mergeGeneratedImagesWithLoadingEntries(images, loadingEntriesByThreadId[workspace.thread.id]));
          setSavedReferences((current) => {
            for (const reference of current) {
              revokeReferencePreviewUrl(reference);
            }
            return references.map(toSavedReferenceImage);
          });
        }
      } catch (error) {
        console.error('Failed to load workspace', error);
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [loadingEntriesByThreadId]);

  useEffect(() => {
    return subscribeToScenePlan((event) => {
      const currentGeneration = currentGenerationRef.current;
      if (!currentGeneration || currentGeneration.mode !== 'scene' || currentGeneration.threadId !== event.threadId) {
        return;
      }

      toast.message(`Generating ${event.count} images`);
      if (!event.applyToShimmers) {
        return;
      }

      const nextLoadingEntries = createLoadingEntries(currentGeneration.loadingPrefix, event.count);
      setLoadingEntriesByThreadId((current) => ({
        ...current,
        [event.threadId]: nextLoadingEntries,
      }));
      setGeneratedImages((current) => [
        ...nextLoadingEntries,
        ...current.filter(
          (image) => !(image.isLoading && image.id.startsWith(`loading-${currentGeneration.loadingPrefix}-`))
        ),
      ]);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }

      for (const referenceImage of referenceImagesRef.current) {
        revokeReferencePreviewUrl(referenceImage);
      }

      for (const reference of savedReferencesRef.current) {
        revokeReferencePreviewUrl(reference);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const measureNode = headerMeasureRef.current;
    const titleMeasureNode = headerTitleMeasureRef.current;
    if (!measureNode || !activeThreadTitle) {
      setHeaderTitleWidth(null);
      setHeaderTextWidth(null);
      return;
    }

    const syncHeaderWidth = () => {
      const measuredWidth = Math.ceil(measureNode.getBoundingClientRect().width || measureNode.scrollWidth || 0);
      const measuredTextWidth = Math.ceil(
        titleMeasureNode?.getBoundingClientRect().width || titleMeasureNode?.scrollWidth || 0
      );

      setHeaderTitleWidth(
        measuredWidth > 0
          ? measuredWidth
          : estimateHeaderTitleWidth(activeThreadTitle, isSidebarCollapsed)
      );
      setHeaderTextWidth(measuredTextWidth > 0 ? measuredTextWidth + 1 : null);
    };

    syncHeaderWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncHeaderWidth);
      return () => {
        window.removeEventListener('resize', syncHeaderWidth);
      };
    }

    const resizeObserver = new ResizeObserver(syncHeaderWidth);
    resizeObserver.observe(measureNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeThreadTitle, isSidebarCollapsed]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Toaster position="top-center" />
      <CreateProjectDialog
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
        onSubmit={handleCreateProject}
      />
      {activeProjectPropertiesProject ? (
        <ProjectPropertiesDialog
          open={isProjectPropertiesDialogOpen}
          projectName={activeProjectPropertiesProject.name}
          draft={projectPropertiesDraft}
          isSaving={isSavingProjectProperties}
          onDraftChange={setProjectPropertiesDraft}
          onOpenChange={handleProjectPropertiesOpenChange}
          onOpenChangeComplete={handleProjectPropertiesOpenChangeComplete}
          onSave={() => void handleSaveProjectProperties()}
        />
      ) : null}
      {sidebarEntityAction?.mode === 'rename' ? (
        <EntityNameDialog
          open={isSidebarEntityDialogOpen}
          onOpenChange={(open) => {
            setIsSidebarEntityDialogOpen(open);
          }}
          onOpenChangeComplete={(open) => {
            if (!open) setSidebarEntityAction(null);
          }}
          title={`Rename ${sidebarEntityAction.entity}`}
          description={
            sidebarEntityAction.entity === 'project'
              ? 'Update the project name shown across the sidebar.'
              : 'Update the thread name for this creative workspace.'
          }
          label={sidebarEntityAction.entity === 'project' ? 'Project name' : 'Thread name'}
          initialValue={sidebarEntityAction.name}
          submitLabel={`Save ${sidebarEntityAction.entity}`}
          onSubmit={(value) =>
            sidebarEntityAction.entity === 'project'
              ? handleRenameProject(sidebarEntityAction.id, value)
              : handleRenameThread(sidebarEntityAction.id, value)
          }
        />
      ) : null}
      {sidebarEntityAction?.mode === 'delete' ? (
        <ConfirmDeleteDialog
          open={isSidebarEntityDialogOpen}
          onOpenChange={(open) => {
            setIsSidebarEntityDialogOpen(open);
          }}
          onOpenChangeComplete={(open) => {
            if (!open) setSidebarEntityAction(null);
          }}
          title={`Delete ${sidebarEntityAction.entity}`}
          description={
            sidebarEntityAction.entity === 'project'
              ? 'This removes the project, all of its threads, all generation jobs, and every generated asset stored under it.'
              : 'This removes the thread, all of its generation jobs, and every generated asset stored under it.'
          }
          confirmLabel={`Delete ${sidebarEntityAction.entity}`}
          onConfirm={() =>
            sidebarEntityAction.entity === 'project'
              ? handleDeleteProject(sidebarEntityAction.id)
              : handleDeleteThread(sidebarEntityAction.id, sidebarEntityAction.projectId ?? '')
          }
        />
      ) : null}

      <AddReferenceDialog
        open={isAddReferenceDialogOpen}
        onOpenChange={setIsAddReferenceDialogOpen}
        onSubmit={handleAddSavedReference}
      />

      <div
        className={[
          'absolute inset-0 z-0 overflow-y-auto pt-[60px]',
          'transition-[padding-left,padding-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          activeStudioView === 'generation'
            ? isExpanded
              ? 'pb-[360px]'
              : 'pb-[180px]'
            : 'pb-10',
          isSidebarCollapsed ? 'pl-0' : 'pl-[260px]',
        ].join(' ')}
      >
        <AnimatePresence initial={false}>
          {activeStudioView === 'references' ? (
            <ReferencesWorkspace
              key="references-workspace"
              references={savedReferences}
              onAddReference={() => setIsAddReferenceDialogOpen(true)}
            />
          ) : (
            <motion.div
              key="generation-workspace"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full w-full"
            >
              <GeneratedImageGrid
                images={generatedImages}
                className="min-h-full w-full"
                selectedImageIds={selectedGeneratedImageIds}
                onImageSelect={(image) => {
                  void toggleGeneratedImageReference(image as GeneratedImageRecord).catch((error) => {
                    console.error('Failed to add generated image reference', error);
                    toast.error(getErrorMessage(error, 'Failed to attach generated image.'));
                  });
                }}
                onImageOpen={(image) => {
                  openGeneratedImagePlayer(image as GeneratedImageRecord);
                }}
                onImageCopy={(image) => {
                  void handleCopyGeneratedImage(image as GeneratedImageRecord).catch((error) => {
                    console.error('Failed to copy generated image', error);
                    toast.error(getErrorMessage(error, 'Failed to copy generated image.'));
                  });
                }}
                onImageDownload={(image) => {
                  void handleDownloadGeneratedImage(image as GeneratedImageRecord).catch((error) => {
                    console.error('Failed to download generated image', error);
                    toast.error(getErrorMessage(error, 'Failed to download generated image.'));
                  });
                }}
                onImageDelete={(image) => {
                  void handleDeleteGeneratedImage(image as GeneratedImageRecord).catch((error) => {
                    console.error('Failed to delete generated image', error);
                    toast.error(getErrorMessage(error, 'Failed to delete generated image.'));
                  });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ImagePlayerDialog
        session={playerSession}
        savedReferences={savedReferences}
        onClose={closePlayer}
        onOpenPinPoint={() => {
          setPlayerSession((current) => current ? { ...current, mode: 'pinpoint' } : current);
        }}
        onOpenCamera={() => {
          setPlayerSession((current) => current ? { ...current, mode: 'camera' } : current);
        }}
        onSelectPoint={(point) => {
          setPlayerSession((current) => current ? { ...current, point } : current);
        }}
        onCameraChange={(camera) => {
          setPlayerSession((current) => current ? { ...current, camera } : current);
        }}
        onExtraPromptChange={(extraPrompt) => {
          setPlayerSession((current) => current ? { ...current, extraPrompt } : current);
        }}
        onExtraPromptMentionIdsChange={(extraPromptReferenceIds) => {
          setPlayerSession((current) => current ? { ...current, extraPromptReferenceIds } : current);
        }}
        onAddCharacterReferences={(files) => {
          void handlePinPointCharacterReferences(files);
        }}
        onRemoveCharacterReference={(referenceImageId) => {
          setPlayerSession((current) => {
            if (!current) {
              return current;
            }

            const referenceImage = current.characterReferences.find((item) => item.id === referenceImageId);
            if (referenceImage) {
              revokeReferencePreviewUrl(referenceImage);
            }

            return {
              ...current,
              characterReferences: current.characterReferences.filter((item) => item.id !== referenceImageId),
            };
          });
        }}
        onGenerate={() => {
          void handlePinPointGenerate();
        }}
        onGenerateCamera={() => {
          void handleCameraGenerate();
        }}
      />

      {activeStudioView === 'generation' ? (
      <>
      <header
        className={[
          'fixed top-[8px] z-40',
          'transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isSidebarCollapsed ? 'left-3' : 'left-[272px]',
        ].join(' ')}
      >
        {activeThreadTitle ? (
          <div
            ref={headerMeasureRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 inline-flex h-12 items-center rounded-full border border-transparent px-3 opacity-0"
          >
            <div
              className="overflow-hidden"
              style={{
                width: isSidebarCollapsed ? 36 : 0,
                marginRight: isSidebarCollapsed ? 8 : 0,
              }}
            >
              <span className="block h-9 w-9" />
            </div>
            <span
              ref={headerTitleMeasureRef}
              className="whitespace-nowrap text-[18px] font-medium leading-none tracking-[0] text-transparent"
            >
              {activeThreadTitle}
            </span>
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {activeThreadTitle ? (
            <motion.div
              key="thread-header"
              initial={{ opacity: 0, filter: 'blur(6px)', y: 4 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(6px)', y: -3 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="t-resize flex h-12 items-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] px-3 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
              style={headerTitleWidth ? { width: `${headerTitleWidth}px` } : undefined}
            >
              <motion.div
                initial={false}
                animate={{
                  width: isSidebarCollapsed ? 36 : 0,
                  opacity: isSidebarCollapsed ? 1 : 0,
                  marginRight: isSidebarCollapsed ? 8 : 0,
                }}
                transition={{ duration: 0.36, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  aria-label="Expand sidebar"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-transparent hover:text-[var(--foreground)]"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
              </motion.div>
              <h1
                className="flex h-full shrink-0 items-center justify-center text-center leading-none"
                style={headerTextWidth ? { width: `${headerTextWidth}px` } : undefined}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={activeThreadTitle}
                    initial={{ opacity: 0, y: 4, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -3, filter: 'blur(6px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-block whitespace-nowrap align-middle text-center text-[18px] font-medium leading-none tracking-[0] text-[var(--foreground)]"
                  >
                    {activeThreadTitle}
                  </motion.span>
                </AnimatePresence>
              </h1>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <AnimatePresence initial={false}>
        {selectedGeneratedImages.length > 0 ? (
          <motion.div
            key="selected-image-header-actions"
            initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: 'blur(8px)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-[8px] z-40 -translate-x-1/2"
          >
            <LiquidMetalFrame
              className="h-12 min-w-[176px]"
              innerClassName="bg-[rgba(15,16,16,0.9)]"
            >
              <div className="flex h-full items-center gap-1.5 px-2.5">
                <motion.div
                  initial={false}
                  animate={{
                    width: selectedGeneratedImages.length === 1 ? 'auto' : 0,
                    opacity: selectedGeneratedImages.length === 1 ? 1 : 0,
                  }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {selectedGeneratedImages.length === 1 ? (
                    <motion.div
                      initial={{ opacity: 0, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(6px)' }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Button
                        variant="surface"
                        size="sm"
                        aria-label="Copy selected images"
                        className="h-8 whitespace-nowrap rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                        onClick={() => {
                          void handleCopySelectedGeneratedImages().catch((error) => {
                            console.error('Failed to copy selected generated image', error);
                            toast.error(getErrorMessage(error, 'Failed to copy selected image.'));
                          });
                        }}
                      >
                        <Copy className="size-3.5" />
                        Copy
                      </Button>
                    </motion.div>
                  ) : null}
                </motion.div>

                <Button
                  variant="surface"
                  size="sm"
                  aria-label="Download selected images"
                  className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                  onClick={() => {
                    void handleDownloadSelectedGeneratedImages().catch((error) => {
                      console.error('Failed to download selected generated images', error);
                      toast.error(getErrorMessage(error, 'Failed to download selected images.'));
                    });
                  }}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>

                <Button
                  variant="surface"
                  size="sm"
                  aria-label="Delete selected images"
                  className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] text-[rgb(245,178,178)] hover:bg-[rgba(190,58,58,0.18)]"
                  onClick={() => {
                    void handleDeleteSelectedGeneratedImages().catch((error) => {
                      console.error('Failed to delete selected generated images', error);
                      toast.error(getErrorMessage(error, 'Failed to delete selected images.'));
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </LiquidMetalFrame>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </>
      ) : null}

      <aside
        className={[
          'fixed bottom-0 left-0 top-0 z-30 border-r border-[var(--border-soft)] bg-[var(--surface)]',
          'overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isSidebarCollapsed ? 'w-0' : 'w-[260px]',
        ].join(' ')}
      >
        <div className="flex h-full w-[260px] flex-col">
        <div
          role="button"
          tabIndex={0}
          aria-label="Collapse sidebar"
          onClick={() => setIsSidebarCollapsed(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsSidebarCollapsed(true);
            }
          }}
          className="flex h-14 w-full cursor-pointer items-center gap-2 border-b border-[var(--border-soft)] px-3 text-left outline-none"
        >
          <img src={logo} alt="Imagen logo" className="h-5 w-auto shrink-0" />
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-2 py-0.5 text-[10px] font-semibold tracking-[0] text-[var(--muted-foreground)]">
            {APP_CHANNEL}
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">v{APP_VERSION}</span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <motion.div
            className="flex h-full w-[520px]"
            animate={{ x: sidebarView === 'projects' ? 0 : -260 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="min-h-0 w-[260px] overflow-y-auto px-2 pb-3 pt-3">
              <div className="flex items-center justify-between px-2">
                <div className="text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                  Projects
                </div>
                <button
                  type="button"
                  aria-label="Create new project"
                  onClick={() => setIsCreateProjectDialogOpen(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                >
                  <FolderPlus className="size-3.5" />
                </button>
              </div>
              <div className="mt-1 space-y-1 px-2">
                {projects.map((project) => {
                  const isOpen = openProjects[project.id] ?? true;

                  return (
                    <div key={project.id} className="group rounded-[16px]">
                      <ProjectRow
                        id={project.id}
                        name={project.name}
                        isOpen={isOpen}
                        onToggle={(projectId) =>
                          setOpenProjects((current) => ({
                            ...current,
                            [projectId]: !(current[projectId] ?? true),
                          }))
                        }
                        onPrepareThreadDraft={handlePrepareThreadDraft}
                        onOpenProperties={openProjectProperties}
                        onRename={(projectId) =>
                          openSidebarEntityDialog({
                            mode: 'rename',
                            entity: 'project',
                            id: projectId,
                            name: project.name,
                          })
                        }
                        onDelete={(projectId) =>
                          openSidebarEntityDialog({
                            mode: 'delete',
                            entity: 'project',
                            id: projectId,
                            name: project.name,
                          })
                        }
                      />

                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            key={`${project.id}-threads`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-1 overflow-hidden"
                          >
                            <div className="space-y-0.5">
                              {project.threads.map((thread) => (
                                <ThreadRow
                                  key={thread.id}
                                  id={thread.id}
                                  name={thread.name}
                                  createdAtLabel={formatRelativeTime(thread.createdAt)}
                                  isRunning={thread.hasRunningJob || locallyRunningThreadIds.includes(thread.id)}
                                  isSelected={selectedThreadId === thread.id}
                                  onClick={() => void handleSelectThread(project.id, thread.id)}
                                  onRename={() =>
                                    openSidebarEntityDialog({
                                      mode: 'rename',
                                      entity: 'thread',
                                      id: thread.id,
                                      name: thread.name,
                                      projectId: project.id,
                                    })
                                  }
                                  onDelete={() =>
                                    openSidebarEntityDialog({
                                      mode: 'delete',
                                      entity: 'thread',
                                      id: thread.id,
                                      name: thread.name,
                                      projectId: project.id,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 w-[260px] overflow-y-auto px-2 pb-3 pt-3">
              <div className="space-y-1 px-2">
                <button
                  type="button"
                  onClick={() => setActiveStudioView('references')}
                  className={[
                    'flex h-10 w-full items-center rounded-[12px] px-3 text-left text-[14px] transition-colors',
                    activeStudioView === 'references'
                      ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface2)]',
                  ].join(' ')}
                >
                  References
                </button>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="p-3">
          <button
            type="button"
            aria-label={sidebarView === 'settings' ? 'Back to projects' : 'Settings'}
            onClick={() => {
              setSidebarView((current) => {
                const nextView = current === 'projects' ? 'settings' : 'projects';
                if (nextView === 'settings') {
                  setActiveStudioView('references');
                } else {
                  setActiveStudioView('generation');
                }
                return nextView;
              });
            }}
            className="inline-flex h-10 w-full items-center gap-2 rounded-full px-3 text-[13px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface2)] hover:text-[var(--foreground)]"
          >
            <span className="relative inline-flex size-4 items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`sidebar-icon-${sidebarView}`}
                  initial={{ opacity: 0, y: 4, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -4, filter: 'blur(6px)' }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 inline-flex items-center justify-center"
                >
                  {sidebarView === 'settings' ? <ChevronLeft className="size-4" /> : <Settings className="size-4" />}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="relative inline-flex h-5 min-w-[52px] items-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`sidebar-label-${sidebarView}`}
                  initial={{ opacity: 0, y: 4, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -4, filter: 'blur(6px)' }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="t-text-swap absolute left-0 right-0 inline-flex leading-5"
                >
                  {sidebarView === 'settings' ? 'Back' : 'Settings'}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        </div>
        </div>
      </aside>

      {activeStudioView === 'generation' ? (
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
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                  transition={{ duration: 0 }}
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
            {isExpanded && !isAnglePanelOpen && referenceMentionOptions.length === 0 ? (
              <motion.div
                key="floating-mode-angle-controls"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 1 }}
                transition={{ duration: 0 }}
                className="absolute left-5 z-20 flex items-center gap-2.5"
                style={{ bottom: 'calc(100% + 12px)' }}
                onMouseDown={holdComposerOpen}
              >
                <FloatingModeChip
                  selectedMode={generationMode}
                  open={isModePickerOpen}
                  onOpenChange={setIsModePickerOpen}
                  onSelectMode={(mode) => {
                    setGenerationMode(mode);
                    setIsModePickerOpen(false);
                  }}
                  onInteract={holdComposerOpen}
                />

                {generationMode === 'manual' ? (
                  <FloatingAngleChip
                    selectedAngle={selectedAngle}
                    enabled={isAngleEnabled}
                    onClick={openAnglePanel}
                    onEnabledChange={setIsAngleEnabled}
                    onInteract={holdComposerOpen}
                  />
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {referenceMentionOptions.length > 0 ? (
              <motion.div
                key="reference-mention-popover"
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                role="listbox"
                aria-label="Prompt references"
                className="absolute left-5 z-40 w-[260px] overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                style={{ bottom: `${popoverBottom}px` }}
                onMouseDown={holdComposerOpen}
              >
                {referenceMentionOptions.map((reference, index) => (
                  <button
                    key={reference.id}
                    type="button"
                    role="option"
                    aria-label={reference.title}
                    aria-selected={index === activeReferenceMentionIndex}
                    onMouseEnter={() => setActiveReferenceMentionIndex(index)}
                    onClick={() => insertReferenceMention(reference)}
                    className={[
                      'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors hover:bg-white/6',
                      index === activeReferenceMentionIndex ? 'bg-white/8 ring-1 ring-white/10' : '',
                    ].join(' ')}
                  >
                    <img
                      src={reference.previewUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-[10px] object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">
                        {reference.title}
                      </span>
                      {reference.description ? (
                        <span className="block truncate text-[12px] text-[var(--muted-foreground)]">
                          {reference.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            className={[
              'prompt-composer-card relative overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)]',
              'shadow-[0_24px_72px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
              'transition-[height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isExpanded
                ? hasReferenceImages
                  ? 'h-[268px] px-5 pb-5 pt-5'
                  : 'h-[228px] px-5 pb-5 pt-5'
                : 'h-[64px] px-4 py-3',
            ].join(' ')}
            onPointerDown={focusComposerFromEvent}
            onClick={focusComposerFromEvent}
            onDragEnter={(event) => {
              if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
              event.preventDefault();
              referenceDragDepthRef.current += 1;
              setIsReferenceDragActive(true);
              holdComposerOpen();
            }}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
              setIsReferenceDragActive(true);
            }}
            onDragLeave={(event) => {
              if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
              event.preventDefault();
              referenceDragDepthRef.current = Math.max(0, referenceDragDepthRef.current - 1);
              if (referenceDragDepthRef.current === 0) {
                setIsReferenceDragActive(false);
              }
            }}
            onDrop={(event) => {
              if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
              event.preventDefault();
              referenceDragDepthRef.current = 0;
              setIsReferenceDragActive(false);
              void appendReferenceImages(event.dataTransfer.files);
            }}
          >
            <input
              ref={referenceInputRef}
              data-testid="composer-reference-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                isReferencePickerOpenRef.current = false;
                if (!event.target.files?.length) return;
                void appendReferenceImages(event.target.files);
                event.target.value = '';
              }}
            />
            <label htmlFor={inputId} className="sr-only">
              Escreva algo
            </label>

            <div
              className={[
                'z-0 transition-[inset] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded
                  ? hasReferenceImages
                    ? 'absolute left-5 right-5 top-[112px] bottom-[76px]'
                    : 'absolute left-5 right-5 top-[56px] bottom-[76px]'
                  : 'relative',
              ].join(' ')}
            >
              <PromptComposer
                ref={composerRef}
                placeholder="Escreva algo..."
                isExpanded={isExpanded}
                hasReferenceImages={hasReferenceImages}
                onTextChange={setPrompt}
                onMentionMatch={() => {}}
                onMentionIdsChange={setSelectedPromptReferenceIds}
                onCursorIndexChange={setCursorIndex}
                onScrollTopChange={handleScrollTop}
                onMentionNavigationKey={handleReferenceMentionNavigation}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  if (isReferencePickerOpenRef.current) {
                    return;
                  }

                  if (blurTimeoutRef.current !== null) {
                    window.clearTimeout(blurTimeoutRef.current);
                  }

                  blurTimeoutRef.current = window.setTimeout(() => {
                    setIsFocused(false);
                    blurTimeoutRef.current = null;
                  }, 180);
                }}
                onPasteFiles={(files) => {
                  void appendReferenceImages(files);
                }}
                onSubmitRequested={handleGenerate}
                onEnterWithMention={
                  referenceMentionOptions[activeReferenceMentionIndex]
                    ? () => {
                        insertReferenceMention(referenceMentionOptions[activeReferenceMentionIndex]);
                      }
                    : undefined
                }
              />
            </div>

            {isExpanded ? (
              <div className="absolute inset-x-5 top-[16px] z-10" onMouseDown={holdComposerOpen}>
                <InlineAttachmentsRow
                  hasReferenceImages={hasReferenceImages}
                  referenceImages={referenceImages}
                  onAddReference={openReferencePicker}
                  onOpenReference={openAttachedImagePlayer}
                  onRemoveReference={removeReferenceImage}
                  onKeepOpen={holdComposerOpen}
                />
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {isReferenceDragActive ? (
                <motion.div
                  key="reference-drop-overlay"
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(10px)' }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[24px] border border-white/8 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl"
                >
                  <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-5 py-3 text-[14px] font-medium text-[var(--foreground)]">
                    Release it
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>

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
                    onClick={openReferencePicker}
                    tabIndex={isExpanded ? -1 : 0}
                    aria-hidden={isExpanded}
                    className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--foreground)] backdrop-blur-xl transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]"
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
                        className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-4 text-[13px] font-medium text-[var(--foreground)] backdrop-blur-xl transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]"
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
                          <DropdownItemButton
                            key={option.value}
                            onMouseDown={holdComposerOpen}
                            onClick={() => {
                              setSelectedAspectRatio(option.value);
                              setIsAspectRatioOpen(false);
                            }}
                            selected={isSelected}
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
                          </DropdownItemButton>
                        );
                      })}
                    </PopoverContent>
                  </Popover>

                  <div
                    className={[
                      'pointer-events-auto inline-flex h-9 items-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] backdrop-blur-xl',
                      'transition-[background-color,border-color] duration-200',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      tabIndex={isExpanded ? 0 : -1}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        holdComposerOpen();
                      }}
                      onClick={() => setShotCount((current) => Math.max(1, current - 1))}
                      disabled={shotCount <= 1}
                      className="inline-flex h-9 w-7 items-center justify-center rounded-l-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-35"
                      aria-label="Decrease image count"
                    >
                      <Minus className="size-3.5" />
                    </button>

                    <div className="min-w-[34px] text-center text-[12px] font-medium text-[var(--foreground)] [font-variant-numeric:tabular-nums]">
                      <NumberFlow
                        value={shotCount}
                        transformTiming={{ duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                        spinTiming={{ duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                        opacityTiming={{ duration: 220, easing: 'ease-out' }}
                        className="inline-block"
                      />
                      <span className="text-[var(--muted-foreground)]">/25</span>
                    </div>

                    <button
                      type="button"
                      tabIndex={isExpanded ? 0 : -1}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        holdComposerOpen();
                      }}
                      onClick={() => setShotCount((current) => Math.min(25, current + 1))}
                      disabled={shotCount >= 25}
                      className="inline-flex h-9 w-7 items-center justify-center rounded-r-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-35"
                      aria-label="Increase image count"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  ref={wandButtonRef}
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  aria-hidden={!isExpanded}
                  className={[
                    'pointer-events-auto inline-flex h-10 items-center justify-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--foreground)] backdrop-blur-xl',
                    'transition-[width,opacity,transform,margin] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]',
                    isExpanded ? 'w-10 opacity-100 translate-y-0' : 'w-0 border-transparent opacity-0 translate-y-1',
                  ].join(' ')}
                >
                  <WandSparkles className="size-4 shrink-0" />
                </button>

                <SendButton
                  hostRef={sendFxRef}
                  onClick={() => void handleGenerate()}
                  disabled={!hasPrompt || isGenerating}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : null}

    </main>
  );
}

function SendButton({
  hostRef,
  onClick,
  disabled,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <LiquidMetalButton
      ref={hostRef}
      className="pointer-events-auto"
      aria-label="Enviar"
      onClick={onClick}
      disabled={disabled}
    >
      <ArrowUp className="size-4" />
    </LiquidMetalButton>
  );
}

function FloatingAngleChip({
  selectedAngle,
  enabled,
  onClick,
  onEnabledChange,
  onInteract,
}: {
  selectedAngle: string;
  enabled: boolean;
  onClick: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onInteract: () => void;
}) {
  return (
    <div
      className={[
        'pointer-events-auto inline-flex h-10 items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-1.5 text-[14px] font-medium shadow-[0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl',
        enabled ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
      ].join(' ')}
    >
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onInteract();
        }}
        onClick={onClick}
        className="inline-flex h-7 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-white/6"
      >
        <span>{selectedAngle}</span>
        <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
      </button>
      <button
        type="button"
        role="switch"
        aria-label="Use camera angle"
        aria-checked={enabled}
        onMouseDown={(event) => {
          event.preventDefault();
          onInteract();
        }}
        onClick={() => {
          onInteract();
          onEnabledChange(!enabled);
        }}
        className={[
          'relative h-6 w-10 rounded-full border transition-[background-color,border-color] duration-200',
          enabled
            ? 'border-[rgba(65,130,230,0.58)] bg-[rgba(65,130,230,0.34)]'
            : 'border-[var(--border-soft)] bg-[rgba(255,255,255,0.06)]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-[var(--foreground)] transition-[left,opacity] duration-200',
            enabled ? 'left-[18px] opacity-100' : 'left-1 opacity-65',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function FloatingModeChip({
  selectedMode,
  open,
  onOpenChange,
  onSelectMode,
  onInteract,
}: {
  selectedMode: GenerationMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: GenerationMode) => void;
  onInteract: () => void;
}) {
  const label = generationModeOptions.find((option) => option.value === selectedMode)?.label ?? 'Manual';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mode"
          onMouseDown={onInteract}
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-4 text-[14px] font-medium text-[var(--foreground)] shadow-[0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl"
        >
          <span className="text-[var(--muted-foreground)]">Mode</span>
          <span>{label}</span>
          <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={12}
        className="min-w-[176px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseDown={onInteract}
      >
        {generationModeOptions.map((option) => (
          <DropdownItemButton
            key={option.value}
            onMouseDown={onInteract}
            onClick={() => onSelectMode(option.value)}
            selected={option.value === selectedMode}
          >
            <span className="text-[14px] font-semibold text-[var(--foreground)]">{option.label}</span>
          </DropdownItemButton>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function DropdownItemButton({
  children,
  selected,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  selected: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        'flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-white/4',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {children}
      <span
        className={[
          'inline-flex size-4 items-center justify-center text-[var(--foreground)] transition-opacity',
          selected ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-hidden="true"
      >
        <Check className="size-3.5" />
      </span>
    </button>
  );
}

function ImagePlayerDialog({
  session,
  savedReferences,
  onClose,
  onOpenPinPoint,
  onOpenCamera,
  onSelectPoint,
  onCameraChange,
  onExtraPromptChange,
  onExtraPromptMentionIdsChange,
  onAddCharacterReferences,
  onRemoveCharacterReference,
  onGenerate,
  onGenerateCamera,
}: {
  session: PlayerSession | null;
  savedReferences: SavedReferenceImage[];
  onClose: () => void;
  onOpenPinPoint: () => void;
  onOpenCamera: () => void;
  onSelectPoint: (point: { x: number; y: number }) => void;
  onCameraChange: (camera: CameraPose) => void;
  onExtraPromptChange: (value: string) => void;
  onExtraPromptMentionIdsChange: (ids: string[]) => void;
  onAddCharacterReferences: (files: FileList | File[]) => void;
  onRemoveCharacterReference: (referenceImageId: string) => void;
  onGenerate: () => void;
  onGenerateCamera: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extraPromptComposerRef = useRef<PromptComposerHandle>(null);
  const [extraPromptMentionMatch, setExtraPromptMentionMatch] = useState<{ query: string; start: number } | null>(null);
  const [activeExtraPromptMentionIndex, setActiveExtraPromptMentionIndex] = useState(0);
  const [extraPromptCursorIndex, setExtraPromptCursorIndex] = useState(0);
  const [extraPromptScrollTop, setExtraPromptScrollTop] = useState(0);
  const isPinPointMode = session?.mode === 'pinpoint';
  const isCameraMode = session?.mode === 'camera';
  const extraPromptMentionOptions = useMemo(() => {
    if (!session || !extraPromptMentionMatch) return [];

    const savedOpts = savedReferences.map((reference) => ({
      id: reference.id,
      title: reference.title,
      description: reference.description ?? 'Saved library reference',
      previewUrl: reference.previewUrl,
    }));
    const characterOpts = session.characterReferences.map((reference) => ({
      id: reference.id,
      title: reference.name.replace(/\.[^/.]+$/, ''),
      description: 'Pinned character reference',
      previewUrl: reference.previewUrl,
    }));

    return [...savedOpts, ...characterOpts]
      .filter((option) => option.title.toLowerCase().includes(extraPromptMentionMatch.query))
      .slice(0, 5);
  }, [extraPromptMentionMatch, savedReferences, session]);

  useEffect(() => {
    setActiveExtraPromptMentionIndex(0);
  }, [extraPromptMentionMatch?.query, extraPromptMentionOptions.length]);

  const insertExtraPromptMention = useCallback((option: { id: string; title: string }) => {
    extraPromptComposerRef.current?.insertMention(option.id, option.title);
  }, []);

  const handleExtraPromptMentionNavigation = useCallback(
    (key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape') => {
      if (extraPromptMentionOptions.length === 0) return false;

      if (key === 'ArrowDown') {
        setActiveExtraPromptMentionIndex((current) => (current + 1) % extraPromptMentionOptions.length);
        return true;
      }

      if (key === 'ArrowUp') {
        setActiveExtraPromptMentionIndex((current) =>
          (current - 1 + extraPromptMentionOptions.length) % extraPromptMentionOptions.length
        );
        return true;
      }

      if (key === 'Enter') {
        const selectedOption =
          extraPromptMentionOptions[Math.min(activeExtraPromptMentionIndex, extraPromptMentionOptions.length - 1)];
        if (!selectedOption) return false;
        insertExtraPromptMention(selectedOption);
        return true;
      }

      return false;
    },
    [activeExtraPromptMentionIndex, extraPromptMentionOptions, insertExtraPromptMention]
  );

  const extraPromptMentionBottom = useMemo(() => {
    const textBeforeCursor = (session?.extraPrompt ?? '').slice(0, extraPromptCursorIndex);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const currentLineTop = 12 + lineIndex * 24 - extraPromptScrollTop;
    return Math.max(36, 112 - currentLineTop + 8);
  }, [extraPromptCursorIndex, extraPromptScrollTop, session?.extraPrompt]);

  return (
    <Dialog
      open={session !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[min(94vw,1480px)] border-white/8 bg-[rgba(15,16,16,0.94)] p-0 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ![backdrop-filter:none]">
        <DialogHeader className="sr-only">
          <DialogTitle>{session?.image.name ?? 'Image preview'}</DialogTitle>
          <DialogDescription>Preview and pinpoint editing workspace.</DialogDescription>
        </DialogHeader>
        {session ? (
          <div className="flex min-h-[760px] w-full overflow-hidden rounded-[26px]">
            <div className="relative flex min-w-0 flex-1 flex-col bg-[rgba(11,11,12,0.72)]">
              <div
                data-testid="player-image-stage"
                className={[
                  'relative flex min-h-0 flex-1 items-center justify-center px-7 pb-28 pt-7',
                  isPinPointMode ? 'cursor-crosshair' : '',
                  isCameraMode ? 'cursor-grab' : '',
                ].join(' ')}
                onClick={(event) => {
                  if (!isPinPointMode) {
                    return;
                  }

                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = Number(((event.clientX - rect.left) / rect.width).toFixed(4));
                  const y = Number(((event.clientY - rect.top) / rect.height).toFixed(4));
                  onSelectPoint({
                    x: Math.min(1, Math.max(0, x)),
                    y: Math.min(1, Math.max(0, y)),
                  });
                }}
              >
                <img
                  src={session.image.previewUrl}
                  alt={`${session.image.name} preview`}
                  className="max-h-[82vh] w-full rounded-[24px] object-contain"
                />
                {session.point ? (
                  <div
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${session.point.x * 100}%`,
                      top: `${session.point.y * 100}%`,
                    }}
                  >
                    <div className="flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/35 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-md">
                      <Crosshair className="size-4 text-white" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
                <div className="pointer-events-auto">
                  <LiquidMetalFrame className="rounded-[22px]">
                    <div className="flex rounded-[22px] bg-[rgba(20,20,21,0.92)] p-1">
                      <button
                        type="button"
                        aria-label="Pin Point"
                        onClick={onOpenPinPoint}
                        className={[
                          'inline-flex h-12 items-center gap-2 rounded-[18px] px-4 text-[14px] font-medium transition-colors',
                          isPinPointMode
                            ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)] hover:bg-white/4 hover:text-[var(--foreground)]',
                        ].join(' ')}
                      >
                        <Crosshair className="size-4" />
                        <span>Pin Point</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Camera"
                        onClick={onOpenCamera}
                        className={[
                          'inline-flex h-12 items-center gap-2 rounded-[18px] px-4 text-[14px] font-medium transition-colors',
                          isCameraMode
                            ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)] hover:bg-white/4 hover:text-[var(--foreground)]',
                        ].join(' ')}
                      >
                        <CameraIcon className="size-4" />
                        <span>Camera</span>
                      </button>
                    </div>
                  </LiquidMetalFrame>
                </div>
              </div>
            </div>

            <aside className="flex w-[360px] shrink-0 flex-col border-l border-white/6 bg-[rgba(20,20,21,0.94)] px-5 py-5">
              <div className="mb-5">
                <div className="text-[18px] font-medium text-[var(--foreground)]">{session.image.name}</div>
                <div className="mt-2 text-[13px] text-[var(--muted-foreground)]">
                  {session.image.origin === 'generated' ? 'Generated image' : 'Attached reference'}
                </div>
              </div>

              {!isPinPointMode && !isCameraMode ? (
                <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)]/60 p-4">
                  <div className="text-[14px] font-medium text-[var(--foreground)]">Pin Point</div>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                    Select a target point on this image, attach optional character sheets, and generate one consistent follow-up image into the current thread.
                  </p>
                </div>
              ) : isCameraMode ? (
                <CameraControlPanel
                  imagePreviewUrl={session.image.previewUrl}
                  camera={session.camera}
                  onCameraChange={onCameraChange}
                  onGenerate={onGenerateCamera}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)]/60 p-4">
                    <div className="text-[14px] font-medium text-[var(--foreground)]">Target point</div>
                    <p className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                      {session.point
                        ? `x ${session.point.x.toFixed(2)}, y ${session.point.y.toFixed(2)}`
                        : 'Click anywhere in the image to place the pinpoint.'}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)]/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[14px] font-medium text-[var(--foreground)]">Character references</div>
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex h-8 items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-3 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-white/4"
                      >
                        Add
                      </button>
                    </div>
                    <input
                      ref={inputRef}
                      data-testid="pinpoint-reference-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        if (!event.target.files?.length) {
                          return;
                        }
                        onAddCharacterReferences(event.target.files);
                        event.target.value = '';
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {session.characterReferences.length > 0 ? session.characterReferences.map((referenceImage) => (
                        <div
                          key={referenceImage.id}
                          className="relative h-16 w-16 overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)]"
                        >
                          <img src={referenceImage.previewUrl} alt={referenceImage.name} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            aria-label={`Remove ${referenceImage.name}`}
                            onClick={() => onRemoveCharacterReference(referenceImage.id)}
                            className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/55 text-white"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )) : (
                        <div className="text-[13px] text-[var(--muted-foreground)]">Optional. Attach character sheets only when you want insertion at the selected point.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.82)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[14px] font-medium text-[var(--foreground)]">Extra prompt</div>
                      <div className="text-[12px] text-[var(--muted-foreground)]">Paste or @ reference</div>
                    </div>
                    <div className="relative mt-3 h-[112px] rounded-[18px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-4 py-3">
                      <PromptComposer
                        ref={extraPromptComposerRef}
                        ariaLabel="Extra prompt"
                        placeholder="Optional guidance for zoom, placement, or action"
                        isExpanded
                        hasReferenceImages={false}
                        onTextChange={onExtraPromptChange}
                        onMentionMatch={setExtraPromptMentionMatch}
                        onMentionIdsChange={onExtraPromptMentionIdsChange}
                        onCursorIndexChange={setExtraPromptCursorIndex}
                        onScrollTopChange={setExtraPromptScrollTop}
                        onMentionNavigationKey={handleExtraPromptMentionNavigation}
                        onPasteFiles={onAddCharacterReferences}
                        onEnterWithMention={
                          extraPromptMentionOptions[activeExtraPromptMentionIndex]
                            ? () => insertExtraPromptMention(extraPromptMentionOptions[activeExtraPromptMentionIndex])
                            : undefined
                        }
                      />
                      <AnimatePresence initial={false}>
                        {extraPromptMentionOptions.length > 0 ? (
                          <motion.div
                            key="pinpoint-extra-prompt-mentions"
                            initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: 4, filter: 'blur(8px)' }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute left-3 right-3 z-50 overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                            style={{ bottom: `${extraPromptMentionBottom}px` }}
                            role="listbox"
                            aria-label="Extra prompt references"
                          >
                            {extraPromptMentionOptions.map((reference, index) => (
                              <button
                                key={reference.id}
                                type="button"
                                role="option"
                                aria-selected={index === activeExtraPromptMentionIndex}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveExtraPromptMentionIndex(index)}
                                onClick={() => insertExtraPromptMention(reference)}
                                className={[
                                  'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors hover:bg-white/6',
                                  index === activeExtraPromptMentionIndex ? 'bg-white/8 ring-1 ring-white/10' : '',
                                ].join(' ')}
                              >
                                <img
                                  src={reference.previewUrl}
                                  alt=""
                                  className="h-8 w-8 shrink-0 rounded-[10px] object-cover"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">
                                    {reference.title}
                                  </span>
                                  <span className="block truncate text-[12px] text-[var(--muted-foreground)]">
                                    {reference.description}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={onGenerate}
                    disabled={!session.point}
                    className="mt-auto h-12 rounded-full"
                    aria-label="Generate pinpoint image"
                  >
                    Generate
                  </Button>
                </div>
              )}
            </aside>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CameraControlPanel({
  imagePreviewUrl,
  camera,
  onCameraChange,
  onGenerate,
}: {
  imagePreviewUrl: string;
  camera: CameraPose;
  onCameraChange: (camera: CameraPose) => void;
  onGenerate: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    camera: CameraPose;
  } | null>(null);
  const orbitRotationDeg = wrapCameraRotation(camera.rotationDeg);
  const rotationRad = (orbitRotationDeg * Math.PI) / 180;
  const tiltRad = (camera.tiltDeg * Math.PI) / 180;
  const cameraDepth = Math.cos(rotationRad) * Math.cos(tiltRad);
  const cameraDepthLayer = cameraDepth >= 0 ? 'front' : 'behind';
  const cameraX = 112 + Math.sin(rotationRad) * Math.cos(tiltRad) * 82;
  const cameraY = 112 - Math.sin(tiltRad) * 82;
  const handleScale = 0.88 + ((cameraDepth + 1) / 2) * 0.16 + Math.max(0, camera.zoom) * 0.08;
  const handleOpacity = 0.58 + ((cameraDepth + 1) / 2) * 0.42;
  const isCameraCentered = orbitRotationDeg === 0 && camera.tiltDeg === 0;

  const updateCameraFromDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragStart = dragStartRef.current;
      if (!dragStart) {
        return;
      }

      const deltaX = event.clientX - dragStart.pointerX;
      const deltaY = event.clientY - dragStart.pointerY;

      onCameraChange({
        ...dragStart.camera,
        rotationDeg: wrapCameraRotation(dragStart.camera.rotationDeg + deltaX * (CAMERA_MAX_ROTATION_DEG / 100)),
        tiltDeg: Math.round(clampValue(dragStart.camera.tiltDeg - deltaY * 0.55, -90, 90)),
      });
    },
    [onCameraChange]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-4">
        <div className="text-center text-[13px] leading-5 text-[var(--muted-foreground)]">
          Hold and drag to change camera angle
        </div>

        <div
          role="application"
          aria-label="Camera angle control"
          className={[
            'relative mx-auto mt-3 h-[224px] w-[224px] touch-none select-none rounded-full',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          ].join(' ')}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragStartRef.current = {
              pointerX: event.clientX,
              pointerY: event.clientY,
              camera,
            };
            setIsDragging(true);
          }}
          onPointerMove={(event) => {
            updateCameraFromDrag(event);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            dragStartRef.current = null;
            setIsDragging(false);
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            dragStartRef.current = null;
            setIsDragging(false);
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 224 224"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <circle cx="112" cy="112" r="90" fill="rgba(255,255,255,0.012)" stroke="rgba(255,255,255,0.12)" />
            <ellipse cx="112" cy="112" rx="90" ry="32" fill="none" stroke="rgba(255,255,255,0.14)" />
            <ellipse cx="112" cy="112" rx="32" ry="90" fill="none" stroke="rgba(255,255,255,0.10)" />
            <path d="M34 74C56 91 82 99 112 99C142 99 168 91 190 74" fill="none" stroke="rgba(255,255,255,0.07)" />
            <path d="M34 150C56 133 82 125 112 125C142 125 168 133 190 150" fill="none" stroke="rgba(255,255,255,0.07)" />
            <line x1="112" y1="22" x2="112" y2="202" stroke="rgba(255,255,255,0.06)" />
            <line x1="22" y1="112" x2="202" y2="112" stroke="rgba(255,255,255,0.06)" />
            <path
              d="M112 22A90 90 0 0 1 112 202"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 7"
            />
          </svg>

          <ChevronUp className="absolute left-1/2 top-0 size-4 -translate-x-1/2 text-white/38" />
          <ChevronDown className="absolute bottom-0 left-1/2 size-4 -translate-x-1/2 text-white/38" />
          <ChevronLeft className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-white/38" />
          <ChevronLeft className="absolute right-0 top-1/2 size-4 -translate-y-1/2 rotate-180 text-white/38" />

          <div
            data-testid="camera-source-preview"
            data-depth-layer="front"
            className="absolute left-1/2 top-1/2 z-10 size-[52px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-white/10 bg-[var(--surface2)] shadow-[0_14px_32px_rgba(0,0,0,0.32)]"
          >
            <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>

          <div
            data-testid="camera-position-handle"
            data-camera-rotation={orbitRotationDeg}
            data-camera-tilt={camera.tiltDeg}
            data-camera-depth={cameraDepthLayer}
            data-camera-centered={isCameraCentered ? 'true' : 'false'}
            className={[
              'absolute flex size-10 items-center justify-center rounded-full border border-white/16 bg-[rgba(15,16,16,0.9)] text-white shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl',
              isDragging ? '' : 'transition-[left,top,transform,opacity] duration-150',
            ].join(' ')}
            style={{
              left: `${(cameraX / 224) * 100}%`,
              top: `${(cameraY / 224) * 100}%`,
              transform: `translate(-50%, -50%) scale(${handleScale})`,
              opacity: handleOpacity,
              zIndex: cameraDepth >= 0 ? 20 : 4,
            }}
          >
            <CameraIcon className="size-4.5" />
          </div>
        </div>

        <label
          className="mt-4 flex items-center justify-center gap-2 text-[13px] text-[var(--muted-foreground)]"
          title="Orbit/tilt pairs: 0/0, 45/-30, 45/30, 90/0, 135/-30, 135/30, 180/0, 225/-30, 225/30, 270/0, 315/-30, 315/30 degrees"
        >
          <input
            type="checkbox"
            checked={camera.generateBestAngles}
            onChange={(event) =>
              onCameraChange({
                ...camera,
                generateBestAngles: event.target.checked,
              })
            }
            className="size-4 rounded-[5px] border border-[var(--border-soft)] bg-[var(--surface2)] accent-[var(--accent)]"
          />
          <span>Generate 12-angle sweep</span>
        </label>
      </div>

      <CameraSlider
        label="Rotation"
        min={0}
        max={CAMERA_MAX_ROTATION_DEG}
        step={1}
        value={orbitRotationDeg}
        valueLabel={`${orbitRotationDeg}°`}
        onChange={(value) =>
          onCameraChange({
            ...camera,
            rotationDeg: wrapCameraRotation(value),
          })
        }
      />
      <CameraSlider
        label="Tilt"
        min={-90}
        max={90}
        step={1}
        value={camera.tiltDeg}
        valueLabel={`${camera.tiltDeg}°`}
        onChange={(value) =>
          onCameraChange({
            ...camera,
            tiltDeg: Math.round(value),
          })
        }
      />
      <CameraSlider
        label="Zoom"
        min={-1}
        max={1}
        step={0.05}
        value={camera.zoom}
        valueLabel={formatCameraZoom(camera.zoom)}
        onChange={(value) =>
          onCameraChange({
            ...camera,
            zoom: Number(value.toFixed(2)),
          })
        }
      />

      <Button
        type="button"
        onClick={onGenerate}
        className="mt-auto h-12 rounded-full"
        aria-label="Generate camera image"
      >
        Generate
      </Button>
    </div>
  );
}

function CameraSlider({
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const zeroPercent = ((0 - min) / (max - min)) * 100;
  const fillLeft = Math.min(percent, zeroPercent);
  const fillWidth = Math.abs(percent - zeroPercent);

  return (
    <label className="relative block h-[36px] overflow-hidden rounded-[9px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)]">
      <span
        className="pointer-events-none absolute bottom-0 top-0 bg-white/10"
        style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
      />
      <span
        className="pointer-events-none absolute bottom-0 top-0 w-px bg-white/80"
        style={{ left: `${clampValue(percent, 0, 100)}%` }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 text-[13px]">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className="font-medium text-[var(--foreground)] [font-variant-numeric:tabular-nums]">
          {valueLabel}
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </label>
  );
}

function InlineAttachmentsRow({
  hasReferenceImages,
  referenceImages,
  onAddReference,
  onOpenReference,
  onRemoveReference,
  onKeepOpen,
}: {
  hasReferenceImages: boolean;
  referenceImages: ComposerReferenceImage[];
  onAddReference: () => void;
  onOpenReference: (referenceImage: ComposerReferenceImage) => void;
  onRemoveReference: (referenceImageId: string) => void;
  onKeepOpen: () => void;
}) {
  return (
    <div
      className={[
        'pointer-events-auto flex w-full items-start overflow-hidden',
        'transition-[gap,min-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        hasReferenceImages ? 'min-h-20 gap-3' : 'min-h-8 gap-0',
      ].join(' ')}
    >
      <button
        type="button"
        aria-label="Adicionar anexo"
        onPointerDown={(event) => {
          event.preventDefault();
          onKeepOpen();
        }}
        onClick={onAddReference}
        className={[
          'inline-flex shrink-0 items-center justify-center border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--foreground)] backdrop-blur-xl',
          'transition-[width,height,border-radius,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]',
          hasReferenceImages ? 'h-20 w-20 rounded-[24px]' : 'h-8 w-8 rounded-[11px]',
        ].join(' ')}
      >
        <Plus className={hasReferenceImages ? 'size-5' : 'size-4'} />
      </button>
      <div
        className={[
          'flex min-w-0 items-center overflow-x-auto',
          'transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          hasReferenceImages ? 'ml-0 max-w-[420px] gap-3 opacity-100' : 'ml-0 max-w-0 gap-0 opacity-0',
        ].join(' ')}
      >
        {referenceImages.map((referenceImage) => (
          <div
            key={referenceImage.id}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            title={referenceImage.name}
          >
            <button
              type="button"
              aria-label={`Open ${referenceImage.name}`}
              onPointerDown={(event) => {
                event.preventDefault();
                onKeepOpen();
              }}
              onClick={() => onOpenReference(referenceImage)}
              className="h-full w-full"
            >
              <img
                src={referenceImage.previewUrl}
                alt={referenceImage.name}
                className="h-full w-full object-cover"
              />
            </button>
            <button
              type="button"
              aria-label={`Remove ${referenceImage.name}`}
              onPointerDown={(event) => {
                event.preventDefault();
                onKeepOpen();
              }}
              onClick={() => onRemoveReference(referenceImage.id)}
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-100 transition-colors hover:bg-black/70"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferencesWorkspace({
  references,
  onAddReference,
}: {
  references: SavedReferenceImage[];
  onAddReference: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-full px-8 pb-10 pt-8"
    >
      <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold leading-none tracking-[0] text-[var(--foreground)]">
              References
            </h1>
            <p className="mt-4 text-[16px] leading-6 tracking-[0] text-[var(--muted-foreground)]">
              Choose the visual memory Codex can reuse during generation.
            </p>
          </div>
          <Button
            type="button"
            onClick={onAddReference}
            className="h-10 rounded-full px-4"
          >
            <ImagePlus className="size-4" />
            Add reference
          </Button>
        </div>

        {references.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="reference-grid">
            {references.map((reference) => (
              <article
                key={reference.id}
                className="group overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] transition-[border-color,background-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface2)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[var(--surface2)]">
                  <img
                    src={reference.previewUrl}
                    alt={reference.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.025]"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="line-clamp-1 text-[15px] font-medium leading-5 tracking-[0] text-[var(--foreground)]">
                    {reference.title}
                  </h2>
                  {reference.description ? (
                    <p className="line-clamp-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                      {reference.description}
                    </p>
                  ) : (
                    <p className="text-[13px] leading-5 text-[var(--muted-foreground)]">
                      No description
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-[var(--border-soft)] bg-[var(--surface)]">
            <div className="flex max-w-[340px] flex-col items-center text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface2)] text-[var(--muted-foreground)]">
                <ImagePlus className="size-5" />
              </div>
              <h2 className="text-[15px] font-medium tracking-[0] text-[var(--foreground)]">No references yet</h2>
              <p className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                Add reusable visual anchors for characters, products, palettes, and style direction.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function AddReferenceDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { file: File; title: string; description?: string }) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const trimmedTitle = title.trim();

  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsDragActive(false);
      setTitle('');
      setDescription('');
    }
  }, [open]);

  function acceptFileList(files: FileList | File[]) {
    const nextFile = Array.from(files).find((item) => item.type.startsWith('image/'));
    if (nextFile) {
      setFile(nextFile);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !trimmedTitle) return;

    await onSubmit({
      file,
      title: trimmedTitle,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add reference</DialogTitle>
          <DialogDescription>
            Save an image and guidance Codex can reuse during generation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="reference-image" className="text-[13px] font-medium text-[var(--foreground)]">
              Image
            </label>
            <label
              htmlFor="reference-image"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
                acceptFileList(event.dataTransfer.files);
              }}
              className={[
                'group relative flex min-h-[168px] cursor-pointer items-center justify-center overflow-hidden rounded-[24px] border border-dashed bg-[var(--surface2)] p-4 text-center',
                'transition-[border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isDragActive
                  ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface2))] scale-[1.01]'
                  : 'border-[var(--border-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]',
              ].join(' ')}
            >
              <Input
                id="reference-image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => acceptFileList(event.target.files ?? [])}
              />
              <motion.div
                initial={false}
                animate={{
                  opacity: 1,
                  y: isDragActive ? -2 : 0,
                  filter: isDragActive ? 'blur(0px)' : 'blur(0px)',
                }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <ImagePlus className="size-5" />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={file ? file.name : isDragActive ? 'drop' : 'empty'}
                    initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="text-[14px] font-medium text-[var(--foreground)]">
                      {file ? file.name : isDragActive ? 'Release to add reference' : 'Drop an image here'}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                      {file ? 'Click to replace it' : 'or click to choose a file'}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="reference-title" className="text-[13px] font-medium text-[var(--foreground)]">
              Title
            </label>
            <Input
              id="reference-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Character face, product angle, palette..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reference-description" className="text-[13px] font-medium text-[var(--foreground)]">
              Description
            </label>
            <textarea
              id="reference-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional direction for how Codex should use this reference"
              className="min-h-[104px] w-full resize-none rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)] px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-strong)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="surface"
              className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || !trimmedTitle}>
              Save reference
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



function ProjectSetRow({
  style,
  index,
  items,
}: RowComponentProps<{ items: Array<{ id: string; name: string; createdAtLabel: string }> }> & {
  style: CSSProperties;
}) {
  const set = items[index];
  if (!set) return null;

  return (
    <div style={style}>
      <button
        type="button"
        className="flex h-[36px] w-full items-center justify-between rounded-[10px] px-2 text-left transition-colors hover:bg-white/4"
      >
        <span className="truncate text-[13px] text-[var(--foreground)]/85">{set.name}</span>
        <span className="ml-3 shrink-0 text-[12px] text-[var(--muted-foreground)]">
          {set.createdAtLabel}
        </span>
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
              const previewScale = Math.max(0.82, 1 - absoluteDistance * 0.06);
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
                    'absolute left-0 top-1/2 flex h-[56px] w-full transform-gpu items-center gap-4 rounded-[18px] border border-transparent bg-transparent px-3 text-left will-change-[transform,opacity] [backface-visibility:hidden]',
                    isDragging
                      ? ''
                      : 'transition-[transform,opacity,color] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                    isSelected ? 'text-white' : 'text-white/42',
                  ].join(' ')}
                  style={{
                    transform: `translate3d(-${translateX}px, calc(-50% + ${relativeDistance * 64 + dragOffset}px), 0)`,
                    opacity,
                    transformOrigin: 'center right',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    pointerEvents: absoluteDistance > 3 ? 'none' : 'auto',
                  }}
                >
                  <img
                    src={angle.preview}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover opacity-90 ring-1 ring-white/8 transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ transform: `scale(${previewScale})` }}
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
