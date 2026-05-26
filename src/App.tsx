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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Crop,
  Disc3,
  FolderPlus,
  Folder,
  ImagePlus,
  Minus,
  PanelLeftOpen,
  Plus,
  Settings,
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
import { ProjectRow } from './components/project-row';
import { ThreadRow } from './components/thread-row';
import {
  createProject,
  createReference,
  createThread,
  deleteProject,
  deleteThread,
  ensureProjectThreadWorkspace,
  generateImages,
  listGeneratedImages,
  listProjectsWithThreads,
  listReferences,
  renameProject,
  renameThread,
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

function parseCssDurationMs(value: string, fallbackMs: number) {
  const trimmed = value.trim();
  if (!trimmed) return fallbackMs;

  if (trimmed.endsWith('ms')) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : fallbackMs;
  }

  if (trimmed.endsWith('s')) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed * 1000 : fallbackMs;
  }

  return fallbackMs;
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
  };
}

type ComposerReferenceImage = {
  id: string;
  name: string;
  mimeType: string;
  bytesBase64: string;
  previewUrl: string;
  size: number;
};

type SavedReferenceImage = ComposerReferenceImage & {
  title: string;
  description?: string;
  createdAt: string;
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

export function App() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<(typeof aspectRatioOptions)[number]['value']>('16:9');
  const [shotCount, setShotCount] = useState(4);
  const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
  const [isAnglePanelOpen, setIsAnglePanelOpen] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<(typeof angleOptions)[number]['name']>('Low Angle');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [sidebarEntityAction, setSidebarEntityAction] = useState<SidebarEntityAction>(null);
  const [isSidebarEntityDialogOpen, setIsSidebarEntityDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<'projects' | 'settings'>('projects');
  const [activeStudioView, setActiveStudioView] = useState<'generation' | 'references'>('generation');
  const [isAddReferenceDialogOpen, setIsAddReferenceDialogOpen] = useState(false);
  const [displayThreadTitle, setDisplayThreadTitle] = useState<string | null>(null);
  const [headerTitleWidth, setHeaderTitleWidth] = useState<number | null>(null);
  const [headerTextWidth, setHeaderTextWidth] = useState<number | null>(null);
  const [referenceImages, setReferenceImages] = useState<ComposerReferenceImage[]>([]);
  const [savedReferences, setSavedReferences] = useState<SavedReferenceImage[]>([]);
  const [selectedPromptReferenceIds, setSelectedPromptReferenceIds] = useState<string[]>([]);
  const [isReferenceDragActive, setIsReferenceDragActive] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<ComposerReferenceImage[]>([]);
  const savedReferencesRef = useRef<SavedReferenceImage[]>([]);
  const blurTimeoutRef = useRef<number | null>(null);
  const titleSwapTimeoutRef = useRef<number | null>(null);
  const referenceDragDepthRef = useRef(0);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  const wandButtonRef = useRef<HTMLButtonElement>(null);
  const sendFxRef = useRef<HTMLDivElement>(null);
  const threadTitleRef = useRef<HTMLSpanElement>(null);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const headerTitleMeasureRef = useRef<HTMLSpanElement>(null);
  const isReferencePickerOpenRef = useRef(false);

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => {
    savedReferencesRef.current = savedReferences;
  }, [savedReferences]);

  const hasPrompt = prompt.trim().length > 0;
  const hasReferenceImages = referenceImages.length > 0;
  const isExpanded = useMemo(
    () => isFocused || hasPrompt || isAspectRatioOpen || isAnglePanelOpen || hasReferenceImages,
    [hasReferenceImages, isFocused, hasPrompt, isAspectRatioOpen, isAnglePanelOpen]
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
    return savedReferences
      .filter((reference) => reference.title.toLowerCase().includes(referenceMentionMatch.query))
      .slice(0, 5);
  }, [referenceMentionMatch, savedReferences]);
  const selectedPromptReferences = useMemo(
    () => savedReferences.filter((reference) => selectedPromptReferenceIds.includes(reference.id)),
    [savedReferences, selectedPromptReferenceIds]
  );

  const holdComposerOpen = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setIsFocused(true);
  }, []);

  const insertReferenceMention = useCallback((reference: SavedReferenceImage) => {
    setPrompt((current) => {
      const match = current.match(/@([^\s@]*)$/);
      if (!match || match.index === undefined) return current;
      return `${current.slice(0, match.index)}${reference.title}`;
    });
    setSelectedPromptReferenceIds((current) =>
      current.includes(reference.id) ? current : [...current, reference.id]
    );
    holdComposerOpen();
  }, [holdComposerOpen]);

  const clearReferenceImages = useCallback(() => {
    setReferenceImages((current) => {
      for (const referenceImage of current) {
        URL.revokeObjectURL(referenceImage.previewUrl);
      }
      return [];
    });
  }, []);

  const removeReferenceImage = useCallback((referenceImageId: string) => {
    setReferenceImages((current) => {
      const referenceImage = current.find((item) => item.id === referenceImageId);
      if (referenceImage) {
        URL.revokeObjectURL(referenceImage.previewUrl);
      }
      return current.filter((item) => item.id !== referenceImageId);
    });
  }, []);

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
    if (target.closest('button, [role="button"], a, input, textarea')) return;

    event.preventDefault();
    holdComposerOpen();
    inputRef.current?.focus();
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
    setGeneratedImages(images);
  }, []);

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

    const loadingEntries: GeneratedImageRecord[] = Array.from({ length: shotCount }, (_, index) => ({
      id: `loading-${Date.now()}-${index}`,
      fileName: `Generating ${index + 1}`,
      createdAt: new Date().toISOString(),
      isLoading: true,
    }));

    setIsGenerating(true);
    setGeneratedImages((current) => [...loadingEntries, ...current]);
    toast.message('Generation started');

    try {
      const result = await generateImages({
        prompt: `${trimmedPrompt}\n\nAspect ratio: ${selectedAspectRatio}\nAngle: ${selectedAngle}`,
        count: shotCount,
        threadId: activeThreadId,
        referenceImages: [
          ...savedReferences.map(({ name, title, description, mimeType, bytesBase64 }) => ({
            name,
            title,
            description,
            mimeType,
            bytesBase64,
          })),
          ...referenceImages.map(({ name, mimeType, bytesBase64 }) => ({
          name,
          mimeType,
          bytesBase64,
          })),
        ],
      });

      await refreshProjects();
      setGeneratedImages((current) => [
        ...result.assets,
        ...current.filter((image) => !loadingEntries.some((entry) => entry.id === image.id)),
      ]);
      setPrompt('');
      setSelectedPromptReferenceIds([]);
      clearReferenceImages();
      toast.success(result.assets.length > 0 ? `Generated ${result.assets.length} images` : 'Generation complete');
    } catch (error) {
      console.error('Failed to generate images', error);
      setGeneratedImages((current) =>
        current.filter((image) => !loadingEntries.some((entry) => entry.id === image.id))
      );
      await refreshProjects();
      clearReferenceImages();
      toast.error('Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  }, [clearReferenceImages, isGenerating, prompt, referenceImages, refreshProjects, savedReferences, selectedAngle, selectedProjectId, selectedAspectRatio, selectedThreadId, shotCount]);

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
          setGeneratedImages(images);
          setSavedReferences((current) => {
            for (const reference of current) {
              URL.revokeObjectURL(reference.previewUrl);
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
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }

      if (titleSwapTimeoutRef.current !== null) {
        window.clearTimeout(titleSwapTimeoutRef.current);
      }

      for (const referenceImage of referenceImagesRef.current) {
        URL.revokeObjectURL(referenceImage.previewUrl);
      }

      for (const reference of savedReferencesRef.current) {
        URL.revokeObjectURL(reference.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    const titleNode = threadTitleRef.current;

    if (!titleNode || !displayThreadTitle) {
      titleNode?.classList.remove('is-exit', 'is-enter-start');
      setDisplayThreadTitle(activeThreadTitle);
      return;
    }

    if (displayThreadTitle === activeThreadTitle) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReducedMotion) {
      titleNode.classList.remove('is-exit', 'is-enter-start');
      setDisplayThreadTitle(activeThreadTitle);
      return;
    }

    const durationMs = parseCssDurationMs(
      getComputedStyle(document.documentElement).getPropertyValue('--text-swap-dur'),
      200
    );

    titleNode.classList.add('is-exit');

    titleSwapTimeoutRef.current = window.setTimeout(() => {
      setDisplayThreadTitle(activeThreadTitle);

      if (activeThreadTitle === null) {
        return;
      }

      queueMicrotask(() => {
        const nextTitleNode = threadTitleRef.current;
        if (!nextTitleNode) return;

        nextTitleNode.classList.remove('is-exit');
        nextTitleNode.classList.add('is-enter-start');
        void nextTitleNode.offsetHeight;
        nextTitleNode.classList.remove('is-enter-start');
      });
    }, durationMs);

    return () => {
      if (titleSwapTimeoutRef.current !== null) {
        window.clearTimeout(titleSwapTimeoutRef.current);
        titleSwapTimeoutRef.current = null;
      }
      titleNode.classList.remove('is-exit');
    };
  }, [activeThreadTitle, displayThreadTitle]);

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
          'transition-[padding-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeStudioView === 'generation' ? (
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
          {displayThreadTitle ? (
            <motion.div
              key="thread-header"
              initial={{ opacity: 0, filter: 'blur(6px)', y: 4 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(6px)', y: -4 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="t-resize flex h-12 items-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl"
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
                <span
                  ref={threadTitleRef}
                  className="t-text-swap inline-block whitespace-nowrap align-middle text-center text-[18px] font-medium leading-none tracking-[0] text-[var(--foreground)]"
                >
                  {displayThreadTitle}
                </span>
              </h1>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
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
                                  isRunning={thread.hasRunningJob}
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
              isExpanded
                ? hasReferenceImages
                  ? 'h-[252px] px-5 pb-5 pt-5'
                  : 'h-[212px] px-5 pb-5 pt-5'
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

            {selectedPromptReferences.length > 0 ? (
              <HighlightedPromptText
                prompt={prompt}
                references={selectedPromptReferences}
                isExpanded={isExpanded}
                hasReferenceImages={hasReferenceImages}
              />
            ) : null}

            <textarea
              ref={inputRef}
              id={inputId}
              value={prompt}
              rows={isExpanded ? 3 : 1}
              placeholder="Escreva algo..."
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && referenceMentionOptions[0]) {
                  event.preventDefault();
                  insertReferenceMention(referenceMentionOptions[0]);
                }
              }}
              onPaste={(event) => {
                const files = event.clipboardData.files;
                if (!files.length) return;
                void appendReferenceImages(files);
              }}
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
              className={[
                'relative z-10 w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-[var(--muted-foreground)]',
                selectedPromptReferences.length > 0 ? 'text-transparent caret-[var(--foreground)]' : 'text-[var(--foreground)]',
                'transition-[height,font-size,line-height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isExpanded
                  ? hasReferenceImages
                    ? 'h-[124px] pr-0 pt-[96px] text-[21px] leading-[1.35]'
                    : 'h-[140px] pr-0 pt-[52px] text-[21px] leading-[1.35]'
                  : 'h-[40px] pl-[52px] pr-[52px] pt-[8px] text-[15px] leading-[24px] overflow-hidden',
              ].join(' ')}
            />

            <AnimatePresence initial={false}>
              {referenceMentionOptions.length > 0 ? (
                <motion.div
                  key="reference-mention-popover"
                  initial={{ opacity: 0, y: 8, filter: 'blur(8px)', scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                  exit={{ opacity: 0, y: 6, filter: 'blur(8px)', scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  role="listbox"
                  className="absolute left-5 top-[58px] z-40 w-[260px] overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-xl"
                  onMouseDown={holdComposerOpen}
                >
                  {referenceMentionOptions.map((reference) => (
                    <button
                      key={reference.id}
                      type="button"
                      role="option"
                      aria-label={reference.title}
                      aria-selected={selectedPromptReferenceIds.includes(reference.id)}
                      onClick={() => insertReferenceMention(reference)}
                      className="flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface2)]"
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

            {isExpanded ? (
              <div className="absolute inset-x-5 top-[16px] z-10" onMouseDown={holdComposerOpen}>
                <InlineAttachmentsRow
                  hasReferenceImages={hasReferenceImages}
                  referenceImages={referenceImages}
                  onAddReference={openReferencePicker}
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

                  <div
                    className={[
                      'pointer-events-auto inline-flex h-9 items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface2)]',
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
                      aria-label="Decrease shots"
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
                      <span className="text-[var(--muted-foreground)]">/4</span>
                    </div>

                    <button
                      type="button"
                      tabIndex={isExpanded ? 0 : -1}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        holdComposerOpen();
                      }}
                      onClick={() => setShotCount((current) => Math.min(4, current + 1))}
                      disabled={shotCount >= 4}
                      className="inline-flex h-9 w-7 items-center justify-center rounded-r-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-35"
                      aria-label="Increase shots"
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
                    'pointer-events-auto inline-flex h-10 items-center justify-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] text-[var(--foreground)]',
                    'transition-[width,opacity,transform,margin] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]',
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

function InlineAttachmentsRow({
  hasReferenceImages,
  referenceImages,
  onAddReference,
  onRemoveReference,
  onKeepOpen,
}: {
  hasReferenceImages: boolean;
  referenceImages: ComposerReferenceImage[];
  onAddReference: () => void;
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
          'inline-flex shrink-0 items-center justify-center border border-[var(--border-soft)] bg-[var(--surface2)] text-[var(--foreground)]',
          'transition-[width,height,border-radius,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]',
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
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface2)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            title={referenceImage.name}
          >
            <img
              src={referenceImage.previewUrl}
              alt={referenceImage.name}
              className="h-full w-full object-cover"
            />
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

function HighlightedPromptText({
  prompt,
  references,
  isExpanded,
  hasReferenceImages,
}: {
  prompt: string;
  references: SavedReferenceImage[];
  isExpanded: boolean;
  hasReferenceImages: boolean;
}) {
  const referenceTitles = references.map((reference) => reference.title).sort((left, right) => right.length - left.length);
  const pattern = new RegExp(`(${referenceTitles.map(escapeRegExp).join('|')})`, 'g');
  const parts = prompt.split(pattern).filter(Boolean);

  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none absolute z-0 whitespace-pre-wrap break-words text-[var(--foreground)]',
        'transition-[height,font-size,line-height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        isExpanded
          ? hasReferenceImages
            ? 'left-5 right-5 top-5 h-[124px] pr-0 pt-[96px] text-[21px] leading-[1.35]'
            : 'left-5 right-5 top-5 h-[140px] pr-0 pt-[52px] text-[21px] leading-[1.35]'
          : 'left-4 right-4 top-3 h-[40px] pl-[52px] pr-[52px] pt-[8px] text-[15px] leading-[24px] overflow-hidden',
      ].join(' ')}
    >
      {parts.map((part, index) =>
        referenceTitles.includes(part) ? (
          <span key={`${part}-${index}`} data-testid="selected-reference-mention" className="text-[var(--accent)]">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
