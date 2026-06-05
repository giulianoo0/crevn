import {
  Component,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent as ReactUIEvent,
  type ErrorInfo,
  type FormEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Minus,
  PanelLeftOpen,
  Play,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { List, useDynamicRowHeight, useListRef, type RowComponentProps } from 'react-window';
import 'streamdown/styles.css';

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
import antigravityLogo from './assets/antigravity.webp';
import codexLogo from './assets/codex.webp';
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
import { Shimmer } from './components/ai-elements/shimmer';
import {
  Message,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from './components/ai-elements/message';
import { ThreadRow } from './components/thread-row';
import { PromptComposer, type PromptComposerHandle } from './components/prompt-composer';
import { ModelPicker } from './components/model-picker';
import { getErrorMessage } from './lib/errors';
import {
  approveDirectorAction,
  cancelSceneGroupGeneration,
  copyGeneratedImage,
  createProject,
  createReferenceCollection,
  createReference,
  createDirectorChat,
  createSceneFrame,
  createSceneGroup,
  deleteDirectorChat,
  deleteSceneGroup,
  deleteSceneFrame,
  deleteReference,
  describeReferenceCollection,
  declineDirectorAction,
  generateSceneGroup,
  listDirectorChats,
  listDirectorMessages,
  updateEnvironmentReference,
  renameDirectorChat,
  sendDirectorMessage,
  subscribeToDirectorMessageComplete,
  subscribeToDirectorMessageDelta,
  subscribeToDirectorMessageError,
  subscribeToDirectorMessageStart,
  subscribeToDirectorSceneReady,
  updateReferenceCollection,
  updateReference,
  createThread,
  deleteGeneratedImage,
  deleteProject,
  deleteThread,
  downloadGeneratedImage,
  ensureProjectThreadWorkspace,
  exportProject,
  exportReference,
  exportThread,
  getAppInfo,
  getUpdateStatus,
  generateImages,
  importCrenv,
  importReference,
  installUpdate,
  listGeneratedImages,
  listProjectsWithThreads,
  listReferences,
  listSceneGroups,
  renameProject,
  renameThread,
  checkForUpdates,
  subscribeToImageReady,
  subscribeToSceneFrameReady,
  structureScenePrompt,
  subscribeToScenePlan,
  subscribeToUpdateStatus,
  type SceneGroupRecord,
  updateProjectSettings,
  updateSceneFrame,
  updateSceneGroup,
  type GeneratedImageRecord,
  type DirectorChatRecord,
  type DirectorMessageRecord,
  type ProjectRecord,
  type ReferenceImageRecord,
  type AppInfo,
  type UpdateStatus,
  cancelDirectorChat,
} from './lib/electron-api';
import { getDefaultModelOption, getModelOptionById } from './lib/model-catalog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const DIRECTOR_MESSAGE_CACHE_LIMIT = 3;

// Each angle carries a `prompt`: a precise, AI-facing cinematographic directive
// written in standard film terminology. It states where the camera sits, how the
// frame is filled, and the emotional intent, so the generation model renders the
// shot deliberately instead of guessing from a bare label. See
// .agents/skills/cinematic-angles/SKILL.md for the full rationale and vocabulary.
const angleOptions = [
  {
    name: 'Eye Level',
    tone: 'Neutral, balanced framing',
    prompt:
      'Eye-level shot: place the camera at the subject\u2019s eye height for a neutral, relatable, conversational perspective with no power imbalance.',
    preview: eyeLevelPreview,
  },
  {
    name: 'Low Angle',
    tone: 'Powerful, dominant presence',
    prompt:
      'Low-angle shot: position the camera below the subject\u2019s eyeline and look upward so the subject feels powerful, dominant, and larger than life.',
    preview: lowAnglePreview,
  },
  {
    name: 'High Angle',
    tone: 'Vulnerable, exposed subject',
    prompt:
      'High-angle shot: position the camera above the subject and look down, making the subject appear smaller, vulnerable, or exposed.',
    preview: highAnglePreview,
  },
  {
    name: 'Dutch Angle',
    tone: 'Tension and instability',
    prompt:
      'Dutch angle: tilt the camera off its horizontal axis so the horizon line runs diagonally, creating tension, unease, and disorientation.',
    preview: dutchAnglePreview,
  },
  {
    name: 'Overhead',
    tone: 'Graphic top-down staging',
    prompt:
      'Overhead shot: place the camera directly above the subject at roughly 90 degrees for graphic, top-down staging of the scene.',
    preview: overheadPreview,
  },
  {
    name: 'Over-the-Shoulder',
    tone: 'Conversational perspective',
    prompt:
      'Over-the-shoulder shot: place the camera behind one subject\u2019s shoulder and head, framing the second subject beyond it with layered foreground depth.',
    preview: overTheShoulderPreview,
  },
  {
    name: 'POV',
    tone: 'Immersive first-person lens',
    prompt:
      'Point-of-view shot: place the camera exactly where the character\u2019s eyes would be, showing the scene as a first-person, immersive perspective.',
    preview: povPreview,
  },
  {
    name: 'Wide Establishing',
    tone: 'Spatial context and scale',
    prompt:
      'Wide establishing shot: frame the full environment with the subject small inside it to set location, scale, and spatial context.',
    preview: wideEstablishingPreview,
  },
  {
    name: "Worm's-Eye",
    tone: 'Extreme floor-level heroic scale',
    prompt:
      'Worm\u2019s-eye view: place the camera at ground level looking straight up for extreme foreshortening and towering, monumental scale.',
    preview: wormsEyePreview,
  },
  {
    name: "Bird's-Eye",
    tone: 'High aerial spatial control',
    prompt:
      'Bird\u2019s-eye view: place the camera high overhead looking down, emphasizing geometry, patterns, scale, and the geography of the scene.',
    preview: birdsEyePreview,
  },
  {
    name: 'Shoulder Level',
    tone: 'Natural character-height intimacy',
    prompt:
      'Shoulder-level shot: place the camera at the subject\u2019s shoulder height so the head reaches the top of frame with natural, character-height intimacy.',
    preview: shoulderLevelPreview,
  },
  {
    name: 'Hip Level',
    tone: 'Action-ready beltline framing',
    prompt:
      'Hip-level shot: place the camera at the subject\u2019s waist/hip height, ideal for action at the beltline and grounded, ready stances.',
    preview: hipLevelPreview,
  },
  {
    name: 'Knee Level',
    tone: 'Low kinetic adventure energy',
    prompt:
      'Knee-level shot: place the camera at the subject\u2019s knee height for low, kinetic energy and a sense of motion or stealth.',
    preview: kneeLevelPreview,
  },
  {
    name: 'Ground Level',
    tone: 'Floor-skimming dramatic presence',
    prompt:
      'Ground-level shot: place the camera on the ground skimming the floor for dramatic, low foreground presence.',
    preview: groundLevelPreview,
  },
  {
    name: 'Cowboy Shot',
    tone: 'Head-to-thigh character stance',
    prompt:
      'Cowboy shot: frame the subject from head to mid-thigh to feature stance, hips, and holster line in a classic western posture.',
    preview: cowboyShotPreview,
  },
  {
    name: 'Extreme Close-Up',
    tone: 'Intense eyes and expression',
    prompt:
      'Extreme close-up: fill the frame with a single small detail such as the eyes for intense focus and heightened emotion.',
    preview: extremeCloseUpPreview,
  },
  {
    name: 'Close-Up',
    tone: 'Face-first emotional detail',
    prompt:
      'Close-up: fill the frame with the subject\u2019s face to capture emotion and fine expressive detail.',
    preview: closeUpPreview,
  },
  {
    name: 'Medium Shot',
    tone: 'Waist-up performance framing',
    prompt:
      'Medium shot: frame the subject from the waist up to balance facial expression with body language and gesture.',
    preview: mediumShotPreview,
  },
  {
    name: 'Long Shot',
    tone: 'Full body with environment',
    prompt:
      'Long shot (full shot): frame the subject head to toe within the environment, keeping them the focal point.',
    preview: longShotPreview,
  },
  {
    name: 'Extreme Wide',
    tone: 'Tiny subject, big world',
    prompt:
      'Extreme wide shot: render the subject as a tiny element inside a vast environment to emphasize scale and isolation.',
    preview: extremeWideShotPreview,
  },
  {
    name: 'Profile Shot',
    tone: 'Graphic side-view silhouette',
    prompt:
      'Profile shot: frame the subject from a 90-degree side view for a graphic, silhouette-like outline.',
    preview: profileShotPreview,
  },
  {
    name: 'Two Shot',
    tone: 'Two-character relationship frame',
    prompt:
      'Two shot: frame two subjects together in one composition to establish their relationship and shared space.',
    preview: twoShotPreview,
  },
  {
    name: 'Group Three-Shot',
    tone: 'Triangular conversation blocking',
    prompt:
      'Three shot: frame three subjects in triangular blocking for balanced group conversation staging.',
    preview: groupThreeShotPreview,
  },
  {
    name: 'Clean Single',
    tone: 'One speaker isolated cleanly',
    prompt:
      'Clean single: isolate one subject in the frame with no other person visible.',
    preview: cleanSinglePreview,
  },
  {
    name: 'Dirty Single',
    tone: 'Speaker framed with foreground shoulder',
    prompt:
      'Dirty single: frame one subject while including a piece of another person, such as a shoulder or arm, in the soft foreground.',
    preview: dirtySinglePreview,
  },
  {
    name: 'Reaction Shot',
    tone: 'Emotion-first response coverage',
    prompt:
      'Reaction shot: frame a character receiving or responding to the moment, prioritizing their emotional reaction.',
    preview: reactionShotPreview,
  },
  {
    name: 'Shot-Reverse-Shot',
    tone: 'Alternating dialogue coverage',
    prompt:
      'Shot/reverse-shot coverage: frame one subject along the opposing eyeline of a conversation, matching the reverse of the other angle.',
    preview: shotReverseShotPreview,
  },
  {
    name: 'Over-the-Hip',
    tone: 'Low side foreground perspective',
    prompt:
      'Over-the-hip shot: like an over-the-shoulder but anchored at hip level, with a low foreground body mass framing the subject.',
    preview: overTheHipPreview,
  },
  {
    name: 'Group OTS',
    tone: 'Shoulder-framed group dialogue',
    prompt:
      'Group over-the-shoulder: frame a group conversation from behind one subject\u2019s shoulder, layering the others beyond it.',
    preview: groupOverTheShoulderPreview,
  },
  {
    name: 'Cross Shot',
    tone: 'Opposing eyelines and tension',
    prompt:
      'Cross shot: tight single on one subject along the opposing eyeline, without a foreground shoulder, heightening dialogue tension.',
    preview: crossShotPreview,
  },
  {
    name: 'Ensemble Wide',
    tone: 'Full group conversation geography',
    prompt:
      'Ensemble wide: frame the entire group within the scene to map the full geography of a multi-character conversation.',
    preview: ensembleWidePreview,
  },
  {
    name: 'Dialogue Insert',
    tone: 'Hands and gesture detail',
    prompt:
      'Insert shot: cut in tight on hands, objects, or gesture detail that punctuates the dialogue.',
    preview: dialogueInsertPreview,
  },
  {
    name: 'Silhouette Shot',
    tone: 'Backlit iconic character shape',
    prompt:
      'Silhouette shot: backlight the subject so it reads as a dark, iconic shape against a brighter background.',
    preview: silhouetteShotPreview,
  },
] as const;

// Expand the selected angle into a full cinematographic directive for the AI.
// Falls back to the bare name if the angle is somehow unknown.
function buildAngleDirective(name: (typeof angleOptions)[number]['name']) {
  const angle = angleOptions.find((option) => option.name === name);
  return angle ? `Angle: ${angle.name} \u2014 ${angle.prompt}` : `Angle: ${name}`;
}
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

function getExportedFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function formatDurationBetween(startValue: string, endValue: string) {
  const startMs = new Date(startValue).getTime();
  const endMs = new Date(endValue).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function estimateHeaderTitleWidth(title: string, includesSidebarToggle: boolean) {
  const baseShellWidth = 24 + 24 + 2;
  const toggleWidth = includesSidebarToggle ? 36 + 8 : 0;
  return Math.ceil(baseShellWidth + toggleWidth + Math.max(title.length, 8) * 9.5);
}

function buildHeaderTitleText(threadTitle: string, chatTitle: string | null) {
  return chatTitle ? `${threadTitle} > ${chatTitle}` : threadTitle;
}

function mergeDirectorMessages(
  existing: DirectorMessageRecord[],
  incoming: DirectorMessageRecord[]
): DirectorMessageRecord[] {
  const roleOrder: Record<DirectorMessageRecord['role'], number> = {
    system: 0,
    user: 1,
    assistant: 2,
  };
  const messageById = new Map(existing.map((message) => [message.id, message]));

  for (const message of incoming) {
    const current = messageById.get(message.id);
    messageById.set(message.id, current ? { ...current, ...message } : message);
  }

  return Array.from(messageById.values()).sort((left, right) => {
    const leftOrder = Number.isInteger(left.messageOrder) ? left.messageOrder : null;
    const rightOrder = Number.isInteger(right.messageOrder) ? right.messageOrder : null;

    if (leftOrder !== null || rightOrder !== null) {
      if (leftOrder === null) {
        return 1;
      }
      if (rightOrder === null) {
        return -1;
      }
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
    }

    const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    const roleOrderDifference = roleOrder[left.role] - roleOrder[right.role];
    if (roleOrderDifference !== 0) {
      return roleOrderDifference;
    }

    return left.id.localeCompare(right.id);
  });
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

function getSceneReferenceSignature(references: SceneReferenceAttachment[]) {
  return references
    .map((reference) =>
      [
        reference.id,
        reference.referenceKind,
        reference.referenceId ?? '',
        reference.name,
        reference.mimeType,
        reference.bytesBase64,
      ].join(':')
    )
    .join('|');
}

function isGenerationCanceledError(error: unknown) {
  return error instanceof Error && error.message === 'Generation canceled.';
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

function createLoadingEntries(
  prefix: string,
  count: number,
  metadata?: {
    provider: 'codex' | 'antigravity';
    modelId: string;
    modelLabel: string;
    generationStartedAt: string;
  }
): GeneratedImageRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `loading-${prefix}-${index}`,
    fileName: `Generating ${index + 1}`,
    createdAt: metadata?.generationStartedAt ?? new Date().toISOString(),
    provider: metadata?.provider,
    modelId: metadata?.modelId,
    modelLabel: metadata?.modelLabel,
    generationStartedAt: metadata?.generationStartedAt,
    isLoading: true,
  }));
}

function isLoadingEntryForRun(image: GeneratedImageRecord, runId: string) {
  return image.isLoading && image.id.startsWith(`loading-${runId}-`);
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

function getLoadingEntriesForThread(activeRuns: Record<string, ActiveGenerationRun>, threadId: string) {
  return Object.values(activeRuns)
    .filter((run) => run.threadId === threadId)
    .flatMap((run) => run.loadingEntries);
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
    category: reference.category,
    collectionId: reference.collectionId ?? reference.environmentId ?? undefined,
    environmentId: reference.environmentId ?? undefined,
    shouldRevokePreviewUrl: true,
  };
}

function getSourceImageIdFromGeneratedReferenceId(referenceId: string): string | null {
  const prefix = 'generated-reference-';
  return referenceId.startsWith(prefix) ? referenceId.slice(prefix.length) : null;
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
  category: ReferenceLibraryRoute;
  collectionId?: string;
  environmentId?: string;
};

type SavedReferenceMentionGroup = {
  id: string;
  title: string;
  description: string;
  previewUrl: string;
  references: SavedReferenceImage[];
};

type ReferenceLibraryRoute = 'characters' | 'environment' | 'objects';

function getSavedReferenceMentionGroupId(reference: SavedReferenceImage) {
  return reference.collectionId ?? reference.environmentId ?? reference.id;
}

function buildSavedReferenceMentionGroups(savedReferences: SavedReferenceImage[]): SavedReferenceMentionGroup[] {
  const groups = new Map<string, SavedReferenceImage[]>();

  for (const reference of savedReferences) {
    const groupId = getSavedReferenceMentionGroupId(reference);
    groups.set(groupId, [...(groups.get(groupId) ?? []), reference]);
  }

  return [...groups.entries()].map(([id, references]) => {
    const representative = [...references].sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return left.createdAt < right.createdAt ? -1 : 1;
      }
      return left.id.localeCompare(right.id);
    })[0] ?? references[0];
    const descriptions = references
      .map((reference) => reference.description?.trim())
      .filter((description): description is string => Boolean(description));

    return {
      id,
      title: representative.title,
      description:
        references.length > 1
          ? `${references.length} angles${descriptions.length > 0 ? ` · ${descriptions[0]}` : ''}`
          : representative.description ?? 'Saved library reference',
      previewUrl: representative.previewUrl,
      references,
    };
  });
}

function resolveSavedReferencesFromMentionIds(
  savedReferences: SavedReferenceImage[],
  selectedReferenceIds: string[]
) {
  const selectedIds = new Set(selectedReferenceIds);
  const resolved = new Map<string, SavedReferenceImage>();

  for (const reference of savedReferences) {
    if (selectedIds.has(reference.id) || selectedIds.has(getSavedReferenceMentionGroupId(reference))) {
      resolved.set(reference.id, reference);
    }
  }

  return [...resolved.values()];
}

type ComposerGenerationMode = (typeof generationModeOptions)[number]['value'];
type GenerationWorkspaceMode = 'classic' | 'scenes' | 'director';
type SceneFrame = {
  id: string;
  title: string;
  prompt: string;
  references: Array<{
    id: string;
    referenceKind: 'saved_reference' | 'uploaded_attachment';
    referenceId: string | null;
    name: string;
    mimeType: string;
    bytesBase64: string;
    createdAt: string;
  }>;
  assets: SceneGroupRecord['frames'][number]['assets'];
  isCollapsed: boolean;
  isRenaming: boolean;
};
type SceneGroupUi = {
  id: string;
  threadId: string;
  title: string;
  prompt: string;
  tocOrder: number;
  frames: SceneFrame[];
  runs: SceneGroupRecord['runs'];
};
type SceneReferenceAttachment = {
  id: string;
  name: string;
  mimeType: string;
  bytesBase64: string;
  previewUrl: string;
  referenceKind: 'saved_reference' | 'uploaded_attachment';
  referenceId: string | null;
  createdAt: string;
  title?: string;
  description?: string;
  shouldRevokePreviewUrl?: boolean;
};
type GenerationMode = ComposerGenerationMode | 'pinpoint' | 'camera';
type ActiveGenerationRun = {
  clientRunId: string;
  threadId: string;
  mode: GenerationMode;
  provider: 'codex' | 'antigravity';
  modelId: string;
  modelLabel: string;
  generationStartedAt: string;
  loadingEntries: GeneratedImageRecord[];
};

type ActiveSceneGenerationRun = {
  sceneGroupId: string;
  frameIds: string[];
  provider: 'codex' | 'antigravity';
  modelId: string;
  modelLabel: string;
  generationStartedAt: string;
};

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
  provider?: 'codex' | 'antigravity' | null;
  modelId?: string | null;
  modelLabel?: string | null;
  prompt?: string | null;
  references?: GeneratedImageRecord['references'];
  durationMs?: number | null;
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

function formatGenerationDuration(durationMs: number | null | undefined) {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const CAMERA_MAX_ROTATION_DEG = 315;

function wrapCameraRotation(value: number) {
  return Math.round(clampValue(value, 0, CAMERA_MAX_ROTATION_DEG));
}

export function getReferenceMentionReplacementRange(
  mentionMatch: { query: string; start: number } | null,
  cursorIndex: number
) {
  if (!mentionMatch) return undefined;

  return {
    start: mentionMatch.start,
    end: Math.max(mentionMatch.start, cursorIndex),
  };
}

const INITIAL_SCENE_FRAMES: SceneFrame[] = [];
const DEFAULT_SCENES_SIDEBAR_WIDTH = 500;
const MIN_SCENES_SIDEBAR_WIDTH = 250;

function toSceneFrameUi(frame: SceneGroupRecord['frames'][number]): SceneFrame {
  return {
    id: frame.id,
    title: frame.title,
    prompt: frame.prompt,
    references: frame.references,
    assets: frame.assets,
    isCollapsed: false,
    isRenaming: false,
  };
}

function toSceneGroupUi(sceneGroup: SceneGroupRecord): SceneGroupUi {
  return {
    id: sceneGroup.id,
    threadId: sceneGroup.threadId,
    title: sceneGroup.title,
    prompt: sceneGroup.prompt,
    tocOrder: sceneGroup.tocOrder,
    frames: sceneGroup.frames.map(toSceneFrameUi),
    runs: sceneGroup.runs,
  };
}

function toSceneWorkspaceImage(
  frame: SceneGroupRecord['frames'][number],
  asset: SceneGroupRecord['frames'][number]['assets'][number],
  run: SceneGroupRecord['runs'][number] | null
): GeneratedImageRecord {
  return {
    id: asset.id,
    fileName: `${frame.title} · ${asset.outputIndex + 1}`,
    fileUrl: `crenv-asset://generated?path=${encodeURIComponent(asset.storedPath)}`,
    createdAt: asset.createdAt,
    provider: run?.provider ?? 'codex',
    modelId: run?.modelId ?? null,
    modelLabel: run?.modelLabel ?? null,
    durationMs: run?.durationMs ?? null,
  };
}

function toSceneWorkspaceLoadingImage(
  frame: SceneFrame,
  index: number,
  metadata?: Pick<ActiveSceneGenerationRun, 'provider' | 'modelId' | 'modelLabel' | 'generationStartedAt'>
): GeneratedImageRecord {
  return {
    id: `scene-loading-${frame.id}`,
    fileName: `${frame.title} · ${index + 1}`,
    createdAt: metadata?.generationStartedAt ?? new Date().toISOString(),
    provider: metadata?.provider ?? 'codex',
    modelId: metadata?.modelId ?? 'codex-gpt-5-4-mini',
    modelLabel: metadata?.modelLabel ?? 'GPT-5.4 Mini',
    generationStartedAt: metadata?.generationStartedAt,
    isLoading: true,
  };
}

type SceneWorkspaceFrameCard = {
  frameId: string;
  frameTitle: string;
  images: GeneratedImageRecord[];
  isGenerating: boolean;
};

type DirectorRenderedBlock =
  | { type: 'markdown'; content: string }
  | { type: 'action'; content: string; data: Record<string, unknown> | null }
  | { type: 'status'; content: string; data: Record<string, unknown> | null };

type DirectorChatUi = DirectorChatRecord & {
  isStreaming: boolean;
};

type DirectorActiveRun = {
  chatId: string;
  threadId: string;
  messageId: string;
  modelId?: string | null;
  modelLabel?: string | null;
  fastMode: boolean;
  startedAt: string;
};

function parseDirectorJsonBlock(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseDirectorRenderedBlocks(markdown: string): DirectorRenderedBlock[] {
  const blocks: DirectorRenderedBlock[] = [];
  const pattern = /```(imagen-action|imagen-status)\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    const leading = markdown.slice(lastIndex, match.index);
    if (leading.trim()) {
      blocks.push({ type: 'markdown', content: leading });
    }

    const type = match[1] === 'imagen-status' ? 'status' : 'action';
    const content = match[2]?.trim() ?? '';
    blocks.push({ type, content, data: parseDirectorJsonBlock(content) });
    lastIndex = pattern.lastIndex;
  }

  const trailing = markdown.slice(lastIndex);
  if (trailing.trim()) {
    blocks.push({ type: 'markdown', content: trailing });
  }

  return blocks.length > 0 ? blocks : [{ type: 'markdown', content: markdown }];
}

function getDirectorBlockText(data: Record<string, unknown> | null, key: string, fallback = '') {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function App() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [promptMentionMatch, setPromptMentionMatch] = useState<{ query: string; start: number } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [generationMode, setGenerationMode] = useState<ComposerGenerationMode>('manual');
  const [generationWorkspaceMode, setGenerationWorkspaceMode] = useState<GenerationWorkspaceMode>('classic');
  const [sceneGroups, setSceneGroups] = useState<SceneGroupUi[]>([]);
  const [activeSceneGroupId, setActiveSceneGroupId] = useState<string | null>(null);
  const [directorChatsByThreadId, setDirectorChatsByThreadId] = useState<Record<string, DirectorChatUi[]>>({});
  const [directorMessagesByChatId, setDirectorMessagesByChatId] = useState<Record<string, DirectorMessageRecord[]>>({});
  const [selectedDirectorChatIdByThreadId, setSelectedDirectorChatIdByThreadId] = useState<Record<string, string | null>>({});
  const [activeDirectorRunsByChatId, setActiveDirectorRunsByChatId] = useState<Record<string, DirectorActiveRun>>({});
  const directorMessagesByChatIdRef = useRef<Record<string, DirectorMessageRecord[]>>({});
  const directorMessagesCacheRef = useRef<Record<string, DirectorMessageRecord[]>>({});
  const directorMessagesCacheOrderRef = useRef<string[]>([]);
  const directorMessageLoadPromisesRef = useRef<Record<string, Promise<DirectorMessageRecord[]> | undefined>>({});
  const activeDirectorChatIdRef = useRef<string | null>(null);
  const pendingDirectorChatSelectionRef = useRef<{ threadId: string; chatId: string } | null>(null);
  const directorChatSelectionFrameRef = useRef<number | null>(null);
  const [activeSceneGenerationRunsByGroupId, setActiveSceneGenerationRunsByGroupId] = useState<
    Record<string, ActiveSceneGenerationRun>
  >({});
  const [isStructuringSceneFromClipboard, setIsStructuringSceneFromClipboard] = useState(false);
  const sceneGenerationCancelRequestedRef = useRef<Set<string>>(new Set());
  const [sceneGroupReferences, setSceneGroupReferences] = useState<SceneReferenceAttachment[]>([]);
  const [sceneFrames, setSceneFrames] = useState<SceneFrame[]>(INITIAL_SCENE_FRAMES);
  const [scenesSidebarWidth, setScenesSidebarWidth] = useState(DEFAULT_SCENES_SIDEBAR_WIDTH);
  const [isScenesSidebarResizing, setIsScenesSidebarResizing] = useState(false);
  const [isCreatingDirectorChat, setIsCreatingDirectorChat] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<(typeof aspectRatioOptions)[number]['value']>('16:9');
  const [shotCount, setShotCount] = useState(1);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isAnglePanelOpen, setIsAnglePanelOpen] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<(typeof angleOptions)[number]['name']>('Low Angle');
  const [isAngleEnabled, setIsAngleEnabled] = useState(false);
  const [isFastModeEnabled, setIsFastModeEnabled] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState(getDefaultModelOption().id);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
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
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [activeStudioView, setActiveStudioView] = useState<'generation' | 'references'>('generation');
  const [activeReferenceLibraryRoute, setActiveReferenceLibraryRoute] = useState<ReferenceLibraryRoute>('characters');
  const [isAddReferenceDialogOpen, setIsAddReferenceDialogOpen] = useState(false);
  const [addReferenceDialogRoute, setAddReferenceDialogRoute] = useState<ReferenceLibraryRoute>('characters');
  const [addReferenceDialogSeedFiles, setAddReferenceDialogSeedFiles] = useState<File[]>([]);
  const [isPreparingSelectedImagesReference, setIsPreparingSelectedImagesReference] = useState(false);
  const [editingReference, setEditingReference] = useState<{
    id: string;
    category: ReferenceLibraryRoute;
    collectionId?: string;
    environmentId?: string;
    title: string;
    description?: string;
    attachments?: Array<{
      id?: string;
      name: string;
      mimeType: string;
      bytesBase64: string;
      description?: string;
    }>;
  } | null>(null);
  const [deletingReference, setDeletingReference] = useState<{
    id: string;
    category: ReferenceLibraryRoute;
    collectionId?: string;
    environmentId?: string;
    title: string;
  } | null>(null);
  const [headerTitleWidth, setHeaderTitleWidth] = useState<number | null>(null);
  const [headerTextWidth, setHeaderTextWidth] = useState<number | null>(null);
  const [referenceImages, setReferenceImages] = useState<ComposerReferenceImage[]>([]);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [savedReferences, setSavedReferences] = useState<SavedReferenceImage[]>([]);
  const [selectedPromptReferenceIds, setSelectedPromptReferenceIds] = useState<string[]>([]);
  const [localRunningCountsByThreadId, setLocalRunningCountsByThreadId] = useState<Record<string, number>>({});
  const [activeRunsById, setActiveRunsById] = useState<Record<string, ActiveGenerationRun>>({});
  const [isReferenceDragActive, setIsReferenceDragActive] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [activeReferenceMentionIndex, setActiveReferenceMentionIndex] = useState(0);
  const classicComposerRef = useRef<PromptComposerHandle>(null);
  const directorComposerRef = useRef<PromptComposerHandle>(null);
  const classicReferenceInputRef = useRef<HTMLInputElement>(null);
  const directorReferenceInputRef = useRef<HTMLInputElement>(null);
  const referenceImagesRef = useRef<ComposerReferenceImage[]>([]);
  const savedReferencesRef = useRef<SavedReferenceImage[]>([]);
  const blurTimeoutRef = useRef<number | null>(null);
  const referenceDragDepthRef = useRef(0);
  const scenesSidebarResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  const activeProjectPropertiesProject = projects.find((project) => project.id === projectPropertiesProjectId) ?? null;
  const wandButtonRef = useRef<HTMLButtonElement>(null);
  const sendFxRef = useRef<HTMLDivElement>(null);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const headerTitleMeasureRef = useRef<HTMLDivElement>(null);
  const headerThreadMeasureRef = useRef<HTMLSpanElement>(null);
  const headerChatMeasureRef = useRef<HTMLSpanElement>(null);
  const workspaceTabsRef = useRef<HTMLDivElement>(null);
  const isReferencePickerOpenRef = useRef(false);
  const activeRunsRef = useRef<Record<string, ActiveGenerationRun>>({});
  const pendingDirectorDeltaByMessageIdRef = useRef<Record<string, { chatId: string; content: string }>>({});
  const directorDeltaFlushTimerRef = useRef<number | null>(null);
  const activeDirectorRunsRef = useRef<Record<string, DirectorActiveRun>>({});
  const selectedThreadIdRef = useRef<string | null>(null);
  const activeSceneGroupIdRef = useRef<string | null>(null);
  const selectedModel = useMemo(
    () => getModelOptionById(selectedModelId) ?? getDefaultModelOption(),
    [selectedModelId]
  );
  const selectedProviderId = selectedModel.providerId;
  const effectiveFastMode = selectedProviderId === 'codex' ? isFastModeEnabled : false;

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => {
    savedReferencesRef.current = savedReferences;
  }, [savedReferences]);

  useEffect(() => {
    activeRunsRef.current = activeRunsById;
  }, [activeRunsById]);

  useEffect(() => {
    activeDirectorRunsRef.current = activeDirectorRunsByChatId;
  }, [activeDirectorRunsByChatId]);

  const setSelectedThreadIdImmediately = useCallback((threadId: string | null) => {
    selectedThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
  }, []);

  const limitDirectorMessagesByChatId = useCallback((
    messagesByChatId: Record<string, DirectorMessageRecord[]>,
    touchedChatId?: string
  ) => {
    let cacheOrder = directorMessagesCacheOrderRef.current.filter((chatId) => messagesByChatId[chatId]);

    for (const chatId of Object.keys(messagesByChatId)) {
      if (!cacheOrder.includes(chatId)) {
        cacheOrder.push(chatId);
      }
    }

    if (touchedChatId && messagesByChatId[touchedChatId]) {
      cacheOrder = cacheOrder.filter((chatId) => chatId !== touchedChatId);
      cacheOrder.push(touchedChatId);
    }

    const protectedChatIds = new Set([
      activeDirectorChatIdRef.current,
      ...Object.keys(activeDirectorRunsRef.current),
    ].filter((chatId): chatId is string => Boolean(chatId)));
    const nextMessagesByChatId = { ...messagesByChatId };
    let retainedCount = Object.keys(nextMessagesByChatId).length;

    for (const chatId of cacheOrder) {
      if (retainedCount <= DIRECTOR_MESSAGE_CACHE_LIMIT) {
        break;
      }
      if (protectedChatIds.has(chatId)) {
        continue;
      }

      delete nextMessagesByChatId[chatId];
      delete directorMessagesCacheRef.current[chatId];
      retainedCount -= 1;
    }

    const retainedChatIds = new Set(Object.keys(nextMessagesByChatId));
    directorMessagesCacheOrderRef.current = cacheOrder.filter((chatId) => retainedChatIds.has(chatId));
    return nextMessagesByChatId;
  }, []);

  useEffect(() => {
    setDirectorChatsByThreadId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([threadId, chats]) => [
          threadId,
          chats.map((chat) => ({
            ...chat,
            isStreaming: Boolean(activeDirectorRunsByChatId[chat.id]),
          })),
        ])
      )
    );
  }, [activeDirectorRunsByChatId]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    activeSceneGroupIdRef.current = activeSceneGroupId;
  }, [activeSceneGroupId]);

  useEffect(() => {
    if (generationMode === 'scene' && isAnglePanelOpen) {
      setIsAnglePanelOpen(false);
    }
  }, [generationMode, isAnglePanelOpen]);

  useEffect(() => {
    if (generationWorkspaceMode !== 'scenes') {
      return;
    }

    setIsFocused(false);
    setIsModePickerOpen(false);
    setIsAspectRatioOpen(false);
    setIsModelPickerOpen(false);
    setIsAnglePanelOpen(false);
  }, [generationWorkspaceMode]);

  useEffect(() => {
    const activeSceneGroup =
      sceneGroups.find((sceneGroup) => sceneGroup.id === activeSceneGroupId) ?? sceneGroups[0] ?? null;

    if (!activeSceneGroup) {
      setSceneFrames(INITIAL_SCENE_FRAMES);
      setSceneGroupReferences([]);
      return;
    }

    setSceneFrames((current) =>
      activeSceneGroup.frames.map((frame) => {
        const currentFrame = current.find((item) => item.id === frame.id);
        return currentFrame
          ? {
              ...frame,
              prompt: currentFrame.prompt,
              references: currentFrame.references,
              isCollapsed: currentFrame.isCollapsed,
              isRenaming: currentFrame.isRenaming,
            }
          : frame;
      })
    );
    setSceneGroupReferences([]);
  }, [activeSceneGroupId, sceneGroups]);

  useEffect(() => {
    if (!isScenesSidebarResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = scenesSidebarResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }

      event.preventDefault();

      const deltaX = resizeState.startX - event.clientX;
      const maxWidth = Math.max(MIN_SCENES_SIDEBAR_WIDTH, window.innerWidth - 220);
      const nextWidth = clampValue(
        resizeState.startWidth + deltaX,
        MIN_SCENES_SIDEBAR_WIDTH,
        maxWidth
      );

      setScenesSidebarWidth(nextWidth);
    };

    const finishResize = (event: PointerEvent) => {
      const resizeState = scenesSidebarResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }

      scenesSidebarResizeRef.current = null;
      setIsScenesSidebarResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', finishResize);
    document.addEventListener('pointercancel', finishResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', finishResize);
      document.removeEventListener('pointercancel', finishResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isScenesSidebarResizing]);

  const startScenesSidebarResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    scenesSidebarResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: scenesSidebarWidth,
    };
    setIsScenesSidebarResizing(true);
  }, [scenesSidebarWidth]);

  const handleCheckForUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    try {
      const status = await checkForUpdates();
      setUpdateStatus(status);
    } catch (error) {
      const message = getErrorMessage(error);
      setUpdateStatus({
        state: 'error',
        message: 'Update check failed.',
        version: null,
        percent: null,
        errorMessage: message,
      });
      toast.error(message);
    } finally {
      setIsCheckingUpdates(false);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    setIsInstallingUpdate(true);
    try {
      const status = await installUpdate();
      setUpdateStatus(status);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsInstallingUpdate(false);
    }
  }, []);

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
    () =>
      isFocused ||
      hasPrompt ||
      isModePickerOpen ||
      isAspectRatioOpen ||
      isModelPickerOpen ||
      isAnglePanelOpen ||
      hasReferenceImages,
    [hasReferenceImages, isFocused, hasPrompt, isModePickerOpen, isAspectRatioOpen, isModelPickerOpen, isAnglePanelOpen]
  );
  const activeThread = useMemo(
    () =>
      projects
        .flatMap((project) => project.threads)
        .find((thread) => thread.id === selectedThreadId) ?? null,
    [projects, selectedThreadId]
  );
  const activeThreadTitle = activeThread?.name ?? null;
  const isClassicWorkspace = activeStudioView === 'generation' && generationWorkspaceMode === 'classic';
  const isScenesWorkspace = activeStudioView === 'generation' && generationWorkspaceMode === 'scenes';
  const isDirectorWorkspace = activeStudioView === 'generation' && generationWorkspaceMode === 'director';
  const activeComposerRef = isDirectorWorkspace ? directorComposerRef : classicComposerRef;
  const activeReferenceInputRef = isDirectorWorkspace ? directorReferenceInputRef : classicReferenceInputRef;
  const activeDirectorChats = selectedThreadId ? directorChatsByThreadId[selectedThreadId] ?? [] : [];
  const activeDirectorChatId = selectedThreadId ? selectedDirectorChatIdByThreadId[selectedThreadId] ?? null : null;
  const activeDirectorChat = activeDirectorChatId
    ? activeDirectorChats.find((chat) => chat.id === activeDirectorChatId) ?? null
    : null;
  const activeDirectorMessages = activeDirectorChatId ? directorMessagesByChatId[activeDirectorChatId] ?? [] : [];
  const activeDirectorRun = activeDirectorChatId ? activeDirectorRunsByChatId[activeDirectorChatId] ?? null : null;
  const activeHeaderChatTitle =
    isDirectorWorkspace && activeDirectorChat?.title && activeDirectorChat.title !== 'New chat'
      ? activeDirectorChat.title
      : null;
  const referenceMentionMatch = promptMentionMatch;
  const isUpdateBusy =
    isCheckingUpdates || updateStatus?.state === 'checking' || updateStatus?.state === 'downloading';
  const canInstallUpdate = updateStatus?.state === 'downloaded';

  useEffect(() => {
    let isMounted = true;

    void getAppInfo()
      .then((info) => {
        if (isMounted) {
          setAppInfo(info);
        }
      })
      .catch((error) => {
        console.error('[crevn:renderer] app info failed', error);
      });

    void getUpdateStatus()
      .then((status) => {
        if (isMounted) {
          setUpdateStatus(status);
        }
      })
      .catch((error) => {
        console.error('[crevn:renderer] update status failed', error);
      });

    const unsubscribe = subscribeToUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    activeDirectorChatIdRef.current = activeDirectorChatId;
  }, [activeDirectorChatId]);

  useEffect(() => {
    directorMessagesByChatIdRef.current = directorMessagesByChatId;
    for (const [chatId, messages] of Object.entries(directorMessagesByChatId)) {
      directorMessagesCacheRef.current[chatId] = messages;
    }
  }, [directorMessagesByChatId]);

  useEffect(() => {
    return () => {
      if (directorChatSelectionFrameRef.current !== null) {
        window.cancelAnimationFrame(directorChatSelectionFrameRef.current);
      }
    };
  }, []);

  const savedReferenceMentionGroups = useMemo(
    () => buildSavedReferenceMentionGroups(savedReferences),
    [savedReferences]
  );
  const referenceMentionOptions = useMemo(() => {
    if (!referenceMentionMatch) return [];

    const savedOpts = savedReferenceMentionGroups.map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      previewUrl: group.previewUrl,
      isSaved: true,
      reference: group,
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
      .slice(0, 24);
  }, [referenceMentionMatch, savedReferenceMentionGroups, referenceImages]);
  const referenceMentionCandidates = useMemo(
    () => [
      ...savedReferenceMentionGroups.map((group) => ({
        id: group.id,
        title: group.title,
      })),
      ...referenceImages.map((image) => ({
        id: image.id,
        title: image.name.replace(/\.[^/.]+$/, ''),
      })),
    ],
    [referenceImages, savedReferenceMentionGroups]
  );

  useEffect(() => {
    setActiveReferenceMentionIndex(0);
  }, [referenceMentionMatch?.query, referenceMentionOptions.length]);

  const selectedPromptReferences = useMemo(() => {
    const savedRefs = resolveSavedReferencesFromMentionIds(savedReferences, selectedPromptReferenceIds);
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
    const range = getReferenceMentionReplacementRange(referenceMentionMatch, cursorIndex);
    activeComposerRef.current?.insertMention(
      option.id,
      option.title,
      range
    );
    holdComposerOpen();
  }, [activeComposerRef, cursorIndex, holdComposerOpen, referenceMentionMatch]);

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

  const createClientRunId = useCallback(() => {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (randomUuid) {
      return randomUuid;
    }

    return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const clearComposerAfterSubmit = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.getSelection()?.removeAllRanges();
    setPrompt('');
    setSelectedPromptReferenceIds([]);
    clearReferenceImages();
    activeComposerRef.current?.clear();
    setIsFocused(false);
    setGenerationMode('manual');
    setSelectedAspectRatio('16:9');
    setShotCount(1);
    setIsModePickerOpen(false);
    setIsAspectRatioOpen(false);
    setIsModelPickerOpen(false);
    setIsAngleEnabled(false);
    setSelectedAngle('Low Angle');
    setIsAnglePanelOpen(false);
  }, [activeComposerRef, clearReferenceImages]);

  const incrementLocalRunningThread = useCallback((threadId: string) => {
    setLocalRunningCountsByThreadId((current) => ({
      ...current,
      [threadId]: (current[threadId] ?? 0) + 1,
    }));
  }, []);

  const decrementLocalRunningThread = useCallback((threadId: string) => {
    setLocalRunningCountsByThreadId((current) => {
      const nextCount = (current[threadId] ?? 0) - 1;
      if (nextCount > 0) {
        return {
          ...current,
          [threadId]: nextCount,
        };
      }

      const nextState = { ...current };
      delete nextState[threadId];
      return nextState;
    });
  }, []);

  const syncVisibleThreadImages = useCallback((threadId: string, images: GeneratedImageRecord[]) => {
    setGeneratedImages(
      mergeGeneratedImagesWithLoadingEntries(images, getLoadingEntriesForThread(activeRunsRef.current, threadId))
    );
  }, []);

  const registerActiveRun = useCallback((input: {
    clientRunId: string;
    threadId: string;
    mode: GenerationMode;
    count: number;
    provider: 'codex' | 'antigravity';
    modelId: string;
    modelLabel: string;
  }) => {
    const generationStartedAt = new Date().toISOString();
    const loadingEntries = createLoadingEntries(input.clientRunId, input.count, {
      provider: input.provider,
      modelId: input.modelId,
      modelLabel: input.modelLabel,
      generationStartedAt,
    });

    setActiveRunsById((current) => {
      const nextState = {
        ...current,
        [input.clientRunId]: {
          clientRunId: input.clientRunId,
          threadId: input.threadId,
          mode: input.mode,
          provider: input.provider,
          modelId: input.modelId,
          modelLabel: input.modelLabel,
          generationStartedAt,
          loadingEntries,
        },
      };
      activeRunsRef.current = nextState;
      return nextState;
    });

    incrementLocalRunningThread(input.threadId);

    if (selectedThreadIdRef.current === input.threadId) {
      setGeneratedImages((current) => [...loadingEntries, ...current]);
    }
  }, [incrementLocalRunningThread]);

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
          provider: image.provider,
          modelId: image.modelId,
          modelLabel: image.modelLabel ?? getModelOptionById(image.modelId ?? '')?.label ?? image.modelId,
          prompt: image.prompt,
          references: image.references ?? [],
          durationMs: image.durationMs,
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

  const openAddReferenceDialog = useCallback((route: ReferenceLibraryRoute, files: File[] = []) => {
    setAddReferenceDialogRoute(route);
    setAddReferenceDialogSeedFiles(files);
    setIsAddReferenceDialogOpen(true);
  }, []);

  const buildReferenceFilesFromGeneratedImages = useCallback(async (images: GeneratedImageRecord[]) => {
    return Promise.all(
      images.map(async (image, index) => {
        const response = await fetch(image.fileUrl);
        const blob = await response.blob();
        return new File([blob], image.fileName || `reference-${index + 1}.png`, {
          type: blob.type || 'image/png',
          lastModified: Date.now() + index,
        });
      })
    );
  }, []);

  const handleAddSelectedImagesAsReference = useCallback(async () => {
    if (selectedGeneratedImages.length === 0) {
      return;
    }

    setIsPreparingSelectedImagesReference(true);
    try {
      const files = await buildReferenceFilesFromGeneratedImages(selectedGeneratedImages);
      openAddReferenceDialog('objects', files);
    } finally {
      setIsPreparingSelectedImagesReference(false);
    }
  }, [buildReferenceFilesFromGeneratedImages, openAddReferenceDialog, selectedGeneratedImages]);

  const handleAddSavedReference = useCallback(async ({
    files,
    title,
    description,
    route,
    attachmentDescriptions,
  }: {
    files: File[];
    title: string;
    description?: string;
    route: ReferenceLibraryRoute;
    attachmentDescriptions?: Record<string, string>;
  }) => {
    const attachments = await Promise.all(
      files.map(async (file) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          name: file.name,
          mimeType: file.type || 'image/png',
          bytesBase64: bytesToBase64(bytes),
          description: attachmentDescriptions?.[`${file.name}-${file.size}-${file.lastModified}`]?.trim() || undefined,
        };
      })
    );
    const nextReferences =
      route === 'environment' || files.length > 1
        ? await createReferenceCollection({
            category: route,
            title,
            description: description?.trim() || undefined,
            attachments,
          })
        : await Promise.all(
            files.map(async (file) => {
              const bytes = new Uint8Array(await file.arrayBuffer());
              return createReference({
                name: file.name,
                title,
                description: description?.trim() || undefined,
                mimeType: file.type || 'image/png',
                bytesBase64: bytesToBase64(bytes),
                category: route,
              });
            })
          );
    setSavedReferences((current) => [...nextReferences.map(toSavedReferenceImage), ...current]);
    toast.message(nextReferences.length > 1 ? `${nextReferences.length} references added` : 'Reference added');
  }, []);

  const upsertDirectorChatsForThread = useCallback((threadId: string, chats: DirectorChatRecord[]) => {
    setDirectorChatsByThreadId((current) => ({
      ...current,
      [threadId]: chats.map((chat) => ({
        ...chat,
        isStreaming: Boolean(activeDirectorRunsRef.current?.[chat.id]),
      })),
    }));
  }, []);

  const loadDirectorChatsForThread = useCallback(async (threadId: string) => {
    const chats = await listDirectorChats(threadId);
    setDirectorChatsByThreadId((current) => ({
      ...current,
      [threadId]: chats.map((chat) => ({
        ...chat,
        isStreaming: Boolean(activeDirectorRunsRef.current?.[chat.id]),
      })),
    }));
    setSelectedDirectorChatIdByThreadId((current) => {
      const selected = current[threadId];
      if (selected && chats.some((chat) => chat.id === selected)) {
        return current;
      }
      return {
        ...current,
        [threadId]: chats[0]?.id ?? null,
      };
    });
    return chats;
  }, []);

  const loadDirectorMessagesForChat = useCallback(async (chatId: string) => {
    const cachedMessages = directorMessagesCacheRef.current[chatId];
    if (cachedMessages) {
      if (activeDirectorChatIdRef.current === chatId && !directorMessagesByChatIdRef.current[chatId]) {
        setDirectorMessagesByChatId((current) =>
          limitDirectorMessagesByChatId({
            ...current,
            [chatId]: cachedMessages,
          }, chatId)
        );
      }
      return cachedMessages;
    }

    const existingLoad = directorMessageLoadPromisesRef.current[chatId];
    if (existingLoad) {
      return existingLoad;
    }

    const loadPromise = listDirectorMessages(chatId)
      .then((messages) => {
        directorMessagesCacheRef.current[chatId] = messages;
        if (activeDirectorChatIdRef.current === chatId) {
          setDirectorMessagesByChatId((current) =>
            limitDirectorMessagesByChatId({
              ...current,
              [chatId]: messages,
            }, chatId)
          );
        }
        return messages;
      })
      .finally(() => {
        delete directorMessageLoadPromisesRef.current[chatId];
      });

    directorMessageLoadPromisesRef.current[chatId] = loadPromise;
    return loadPromise;
  }, [limitDirectorMessagesByChatId]);

  const handleCreateDirectorChat = useCallback(async () => {
    if (!selectedThreadId) {
      return;
    }

    setIsCreatingDirectorChat(true);
    try {
      const chat = await createDirectorChat(selectedThreadId);
      setDirectorChatsByThreadId((current) => ({
        ...current,
        [selectedThreadId]: [
          { ...chat, isStreaming: false },
          ...(current[selectedThreadId] ?? []),
        ],
      }));
      setSelectedDirectorChatIdByThreadId((current) => ({
        ...current,
        [selectedThreadId]: chat.id,
      }));
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [chat.id]: [],
        }, chat.id)
      );
    } finally {
      setIsCreatingDirectorChat(false);
    }
  }, [selectedThreadId]);

  const handleSelectDirectorChat = useCallback((chatId: string) => {
    if (!selectedThreadId) {
      return;
    }

    pendingDirectorChatSelectionRef.current = {
      threadId: selectedThreadId,
      chatId,
    };

    if (directorChatSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(directorChatSelectionFrameRef.current);
    }

    directorChatSelectionFrameRef.current = window.requestAnimationFrame(() => {
      directorChatSelectionFrameRef.current = null;
      const pendingSelection = pendingDirectorChatSelectionRef.current;
      pendingDirectorChatSelectionRef.current = null;

      if (!pendingSelection) {
        return;
      }

      const cachedMessages = directorMessagesCacheRef.current[pendingSelection.chatId];
      setSelectedDirectorChatIdByThreadId((current) => ({
        ...current,
        [pendingSelection.threadId]: pendingSelection.chatId,
      }));

      if (cachedMessages && !directorMessagesByChatIdRef.current[pendingSelection.chatId]) {
        setDirectorMessagesByChatId((current) =>
          limitDirectorMessagesByChatId({
            ...current,
            [pendingSelection.chatId]: cachedMessages,
          }, pendingSelection.chatId)
        );
      }
    });
  }, [limitDirectorMessagesByChatId, selectedThreadId]);

  const handleRenameDirectorChat = useCallback(async (chatId: string, title: string) => {
    const updated = await renameDirectorChat(chatId, title);
    if (!updated) return;
    setDirectorChatsByThreadId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([threadId, chats]) => [
          threadId,
          chats.map((chat) => (chat.id === chatId ? { ...chat, title: updated.title, updatedAt: updated.updatedAt } : chat)),
        ])
      )
    );
  }, []);

  const handleDeleteDirectorChat = useCallback(async (chatId: string) => {
    await deleteDirectorChat(chatId);
    setDirectorChatsByThreadId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([threadId, chats]) => [threadId, chats.filter((chat) => chat.id !== chatId)])
      )
    );
    setDirectorMessagesByChatId((current) => {
      const next = { ...current };
      delete next[chatId];
      delete directorMessagesCacheRef.current[chatId];
      delete directorMessageLoadPromisesRef.current[chatId];
      directorMessagesCacheOrderRef.current = directorMessagesCacheOrderRef.current.filter((id) => id !== chatId);
      return next;
    });
    setSelectedDirectorChatIdByThreadId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([threadId, selectedChatId]) => [threadId, selectedChatId === chatId ? null : selectedChatId])
      )
    );
  }, []);

  const handleSendDirectorPrompt = useCallback(async () => {
    const promptText = prompt.trim();
    if (!promptText || activeDirectorRun) {
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
        setSelectedThreadIdImmediately(workspace.thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to prepare workspace for Director chat', error);
        toast.error(getErrorMessage(error, 'Failed to prepare Director chat.'));
        return;
      }
    }

    if (!activeThreadId && activeProjectId) {
      try {
        const thread = await createThread(activeProjectId);
        activeThreadId = thread.id;
        setSelectedThreadIdImmediately(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before Director chat', error);
        toast.error(getErrorMessage(error, 'Failed to create thread for Director chat.'));
        return;
      }
    }

    if (!activeThreadId) {
      return;
    }

    let targetChatId = activeDirectorChatId;
    if (!targetChatId) {
      const createdChat = await createDirectorChat(activeThreadId);
      targetChatId = createdChat.id;
      setDirectorChatsByThreadId((current) => ({
        ...current,
        [activeThreadId]: [
          { ...createdChat, isStreaming: false },
          ...(current[activeThreadId] ?? []),
        ],
      }));
      setSelectedDirectorChatIdByThreadId((current) => ({
        ...current,
        [activeThreadId]: createdChat.id,
      }));
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [createdChat.id]: current[createdChat.id] ?? [],
        }, createdChat.id)
      );
    }

    const selectedSavedReferences = resolveSavedReferencesFromMentionIds(savedReferences, selectedPromptReferenceIds);
    const seenDirectorReferenceBytes = new Set<string>();
    const referencePayload = [
      ...selectedSavedReferences.map((reference) => {
        seenDirectorReferenceBytes.add(reference.bytesBase64);
        const groupSize = savedReferences.filter(
          (item) => getSavedReferenceMentionGroupId(item) === getSavedReferenceMentionGroupId(reference)
        ).length;
        return {
          name: reference.name,
          mimeType: reference.mimeType,
          bytesBase64: reference.bytesBase64,
          title: reference.title,
          description:
            groupSize > 1
              ? [`Multiple-angle reference set: ${reference.title}.`, reference.description].filter(Boolean).join(' ')
              : reference.description,
        };
      }),
      ...referenceImages
        .filter((image) => !seenDirectorReferenceBytes.has(image.bytesBase64))
        .map((image) => ({
          name: image.name,
          mimeType: image.mimeType,
          bytesBase64: image.bytesBase64,
          title: savedReferences.find((reference) => reference.id === image.id)?.title,
          description: savedReferences.find((reference) => reference.id === image.id)?.description,
        })),
    ];

    const selectedModel = getModelOptionById(selectedModelId) ?? getDefaultModelOption();
    const optimisticRunId = `director-optimistic-${Date.now()}`;
    const optimisticTimestamp = new Date().toISOString();
    const optimisticUserMessage: DirectorMessageRecord = {
      id: `${optimisticRunId}-user`,
      chatId: targetChatId,
      role: 'user',
      contentMarkdown: prompt.trim(),
      status: 'completed',
      modelId: selectedModel.providerId === 'codex' ? selectedModel.id : getDefaultModelOption().id,
      modelLabel: selectedModel.providerId === 'codex' ? selectedModel.label : getDefaultModelOption().label,
      fastMode: effectiveFastMode,
      references: [],
      createdAt: optimisticTimestamp,
      updatedAt: optimisticTimestamp,
    };
    const optimisticAssistantMessage: DirectorMessageRecord = {
      id: `${optimisticRunId}-assistant`,
      chatId: targetChatId,
      role: 'assistant',
      contentMarkdown: '',
      status: 'streaming',
      modelId: optimisticUserMessage.modelId,
      modelLabel: optimisticUserMessage.modelLabel,
      fastMode: effectiveFastMode,
      references: [],
      createdAt: optimisticTimestamp,
      updatedAt: optimisticTimestamp,
    };

    setActiveDirectorRunsByChatId((current) => ({
      ...current,
      [targetChatId]: {
        chatId: targetChatId,
        threadId: activeThreadId,
        messageId: optimisticAssistantMessage.id,
        modelId: optimisticAssistantMessage.modelId,
        modelLabel: optimisticAssistantMessage.modelLabel,
        fastMode: optimisticAssistantMessage.fastMode,
        startedAt: optimisticAssistantMessage.createdAt,
      },
    }));
    setDirectorMessagesByChatId((current) =>
      limitDirectorMessagesByChatId({
        ...current,
        [targetChatId]: mergeDirectorMessages(current[targetChatId] ?? [], [
          optimisticUserMessage,
          optimisticAssistantMessage,
        ]),
      }, targetChatId)
    );

    let result: Awaited<ReturnType<typeof sendDirectorMessage>>;
    try {
      result = await sendDirectorMessage({
        chatId: targetChatId,
        threadId: activeThreadId,
        prompt: promptText,
        modelId: selectedModel.providerId === 'codex' ? selectedModel.id : getDefaultModelOption().id,
        fastMode: effectiveFastMode,
        referenceImages: referencePayload,
      });
    } catch (error) {
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[targetChatId];
        return next;
      });
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [targetChatId]: mergeDirectorMessages(
            (current[targetChatId] ?? []).filter((message) => message.id !== optimisticAssistantMessage.id),
            [
              {
                ...optimisticAssistantMessage,
                status: 'failed',
                contentMarkdown: error instanceof Error ? error.message : 'Director failed to start.',
                updatedAt: new Date().toISOString(),
              },
            ]
          ),
        }, targetChatId)
      );
      throw error;
    }

    if (result.chat) {
      setDirectorChatsByThreadId((current) => ({
        ...current,
        [activeThreadId]: [
          { ...result.chat, isStreaming: true },
          ...(current[activeThreadId] ?? []).filter((chat) => chat.id !== result.chat?.id),
        ],
      }));
    }

    setDirectorMessagesByChatId((current) =>
      limitDirectorMessagesByChatId({
        ...current,
        [targetChatId]: mergeDirectorMessages(
          (current[targetChatId] ?? []).filter(
            (message) => message.id !== optimisticUserMessage.id && message.id !== optimisticAssistantMessage.id
          ),
          [result.userMessage, result.assistantMessage]
        ),
      }, targetChatId)
    );
    directorComposerRef.current?.clear();
    setPrompt('');
  }, [
    activeDirectorChatId,
    activeDirectorRun,
    effectiveFastMode,
    ensureProjectThreadWorkspace,
    prompt,
    referenceImages,
    savedReferences,
    selectedModelId,
    selectedPromptReferenceIds,
    selectedProjectId,
    setSelectedThreadIdImmediately,
    selectedThreadId,
    limitDirectorMessagesByChatId,
  ]);

  const handleCancelActiveDirectorChat = useCallback(async () => {
    if (!activeDirectorChatId) {
      return;
    }
    await cancelDirectorChat(activeDirectorChatId);
  }, [activeDirectorChatId]);

  const handleApproveDirectorAction = useCallback(async (messageId: string, actionIndex: number) => {
    try {
      const updatedMessage = await approveDirectorAction({ messageId, actionIndex });
      if (!updatedMessage) {
        return;
      }
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [updatedMessage.chatId]: mergeDirectorMessages(current[updatedMessage.chatId] ?? [], [updatedMessage]),
        }, updatedMessage.chatId)
      );
    } catch (error) {
      console.error('Failed to approve Director action', error);
      toast.error(getErrorMessage(error, 'Failed to approve Director action.'));
    }
  }, [limitDirectorMessagesByChatId]);

  const handleDeclineDirectorAction = useCallback(async (messageId: string, actionIndex: number) => {
    try {
      const updatedMessage = await declineDirectorAction({ messageId, actionIndex });
      if (!updatedMessage) {
        return;
      }
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [updatedMessage.chatId]: mergeDirectorMessages(current[updatedMessage.chatId] ?? [], [updatedMessage]),
        }, updatedMessage.chatId)
      );
    } catch (error) {
      console.error('Failed to decline Director action', error);
      toast.error(getErrorMessage(error, 'Failed to decline Director action.'));
    }
  }, [limitDirectorMessagesByChatId]);

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
    activeReferenceInputRef.current?.click();
  }, [activeReferenceInputRef]);

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
    activeComposerRef.current?.focus();
  }, [activeComposerRef, holdComposerOpen]);

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

  const loadSceneGroups = useCallback(async (threadId: string) => {
    const existingSceneGroups = await listSceneGroups(threadId);

    let sceneGroupRecords = existingSceneGroups;
    if (sceneGroupRecords.length === 0) {
      await createSceneGroup(threadId, {
        title: 'Scene 1',
        prompt: '',
        tocOrder: 1,
      });
      sceneGroupRecords = await listSceneGroups(threadId);
    }

    const nextSceneGroups = sceneGroupRecords.map(toSceneGroupUi);
    if (selectedThreadIdRef.current !== threadId) {
      return nextSceneGroups;
    }
    setSceneGroups(nextSceneGroups);
    const nextActiveSceneGroup =
      nextSceneGroups.find((sceneGroup) => sceneGroup.id === activeSceneGroupIdRef.current) ?? nextSceneGroups[0] ?? null;
    setActiveSceneGroupId(nextActiveSceneGroup?.id ?? null);
    setSceneFrames(nextActiveSceneGroup?.frames ?? INITIAL_SCENE_FRAMES);
    return nextSceneGroups;
  }, []);

  const loadThreadImages = useCallback(async (threadId: string) => {
    const images = await listGeneratedImages(threadId);
    if (selectedThreadIdRef.current !== threadId) {
      return;
    }
    syncVisibleThreadImages(threadId, images);
  }, [syncVisibleThreadImages]);

  const handleSelectThread = useCallback(async (projectId: string, threadId: string) => {
    setSelectedProjectId(projectId);
    setSelectedThreadIdImmediately(threadId);
    syncVisibleThreadImages(threadId, []);
    setSceneGroups([]);
    setActiveSceneGroupId(null);
    setSceneFrames(INITIAL_SCENE_FRAMES);
    setSceneGroupReferences([]);
    await loadThreadImages(threadId);
  }, [loadThreadImages, setSelectedThreadIdImmediately, syncVisibleThreadImages]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSceneGroups([]);
      setActiveSceneGroupId(null);
      setSceneFrames(INITIAL_SCENE_FRAMES);
      return;
    }

    if (generationWorkspaceMode !== 'scenes') {
      return;
    }

    void loadSceneGroups(selectedThreadId).catch((error) => {
      console.error('Failed to load scene groups', error);
    });
  }, [generationWorkspaceMode, loadSceneGroups, selectedThreadId]);

  const handleCreateProject = useCallback(async (projectName: string) => {
    try {
      const workspace = await createProject(projectName);
      await refreshProjects();
      setSelectedProjectId(workspace.project.id);
      setSelectedThreadIdImmediately(null);
      setGeneratedImages([]);
      toast.success('Project created');
    } catch (error) {
      console.error('Failed to create project', error);
      toast.error('Failed to create project');
    }
  }, [refreshProjects, setSelectedThreadIdImmediately]);

  const activeSceneGroup =
    sceneGroups.find((sceneGroup) => sceneGroup.id === activeSceneGroupId) ?? sceneGroups[0] ?? null;
  const activeSceneGenerationRun = activeSceneGroup
    ? activeSceneGenerationRunsByGroupId[activeSceneGroup.id] ?? null
    : null;
  const activeSceneGroupGeneratingFrameIds = activeSceneGenerationRun?.frameIds ?? [];
  const isActiveSceneGroupGenerating = activeSceneGroupGeneratingFrameIds.length > 0;
  const activeSceneWorkspaceFrameCards = useMemo(() => {
    if (!activeSceneGroup) {
      return [];
    }

    const runsById = new Map(activeSceneGroup.runs.map((run) => [run.id, run]));
    const localFramesById = new Map(sceneFrames.map((frame) => [frame.id, frame]));
    return activeSceneGroup.frames
      .map((frame, index) => {
        const persistedImages = (frame.assets ?? []).map((asset) =>
          toSceneWorkspaceImage(frame, asset, runsById.get(asset.sceneGroupRunId) ?? null)
        );
        const localFrame = localFramesById.get(frame.id);
        const loadingImages = activeSceneGroupGeneratingFrameIds.includes(frame.id) && localFrame
          ? [
              toSceneWorkspaceLoadingImage(localFrame, 0, activeSceneGenerationRun ?? undefined),
            ]
          : [];

        return {
          frameId: frame.id,
          frameTitle: frame.title || `Frame ${index + 1}`,
          images: [...loadingImages, ...persistedImages],
          isGenerating: loadingImages.length > 0,
        } satisfies SceneWorkspaceFrameCard;
      })
      .filter((card) => card.images.length > 0);
  }, [activeSceneGenerationRun, activeSceneGroup, activeSceneGroupGeneratingFrameIds, sceneFrames]);

  const handleSelectSceneGroup = useCallback((sceneGroupId: string) => {
    const nextSceneGroup = sceneGroups.find((sceneGroup) => sceneGroup.id === sceneGroupId);
    if (!nextSceneGroup) {
      return;
    }

    setActiveSceneGroupId(nextSceneGroup.id);
    setSceneFrames(nextSceneGroup.frames);
  }, [sceneGroups]);

  const handleRenameSceneGroup = useCallback(
    async (sceneGroupId: string, title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return;
      }

      const sceneGroup = sceneGroups.find((entry) => entry.id === sceneGroupId);
      if (!sceneGroup) {
        return;
      }

      setSceneGroups((current) =>
        current.map((entry) => (entry.id === sceneGroupId ? { ...entry, title: trimmedTitle } : entry))
      );

      try {
        const updatedSceneGroup = await updateSceneGroup(sceneGroupId, {
          title: trimmedTitle,
          prompt: sceneGroup.prompt,
          tocOrder: sceneGroup.tocOrder,
        });
        if (updatedSceneGroup) {
          setSceneGroups((current) =>
            current.map((entry) => (entry.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : entry))
          );
        }
      } catch (error) {
        console.error('Failed to rename scene', error);
        toast.error(getErrorMessage(error, 'Failed to rename scene.'));
      }
    },
    [sceneGroups]
  );

  const persistSceneGroupOrder = useCallback((orderedSceneGroups: SceneGroupUi[]) => {
    void Promise.all(
      orderedSceneGroups.map((sceneGroup, index) =>
        updateSceneGroup(sceneGroup.id, {
          title: sceneGroup.title,
          prompt: sceneGroup.prompt,
          tocOrder: index + 1,
        })
      )
    ).catch((error) => {
      console.error('Failed to reorder scenes', error);
      toast.error(getErrorMessage(error, 'Failed to reorder scenes.'));
    });
  }, []);

  const handleReorderSceneGroups = useCallback(
    (draggedSceneGroupId: string, targetSceneGroupId: string) => {
      if (draggedSceneGroupId === targetSceneGroupId) {
        return;
      }

      setSceneGroups((current) => {
        const draggedIndex = current.findIndex((sceneGroup) => sceneGroup.id === draggedSceneGroupId);
        const targetIndex = current.findIndex((sceneGroup) => sceneGroup.id === targetSceneGroupId);
        if (draggedIndex < 0 || targetIndex < 0) {
          return current;
        }

        const next = [...current];
        const [draggedSceneGroup] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, draggedSceneGroup);
        const reordered = next.map((sceneGroup, index) => ({ ...sceneGroup, tocOrder: index + 1 }));
        persistSceneGroupOrder(reordered);
        return reordered;
      });
    },
    [persistSceneGroupOrder]
  );

  const handleDeleteSceneGroup = useCallback(
    async (sceneGroupId: string) => {
      const sceneGroup = sceneGroups.find((entry) => entry.id === sceneGroupId);
      if (!sceneGroup || !selectedThreadId) {
        return;
      }

      const nextLocalSceneGroups = sceneGroups.filter((entry) => entry.id !== sceneGroupId);
      const nextActiveSceneGroup =
        activeSceneGroup?.id === sceneGroupId ? nextLocalSceneGroups[0] ?? null : activeSceneGroup;

      setSceneGroups(nextLocalSceneGroups);
      setActiveSceneGroupId(nextActiveSceneGroup?.id ?? null);
      setSceneFrames(nextActiveSceneGroup?.frames ?? INITIAL_SCENE_FRAMES);

      try {
        const updatedSceneGroups = (await deleteSceneGroup(sceneGroupId)).map(toSceneGroupUi);
        const nextSceneGroup =
          updatedSceneGroups.find((entry) => entry.id === nextActiveSceneGroup?.id) ?? updatedSceneGroups[0] ?? null;
        setSceneGroups(updatedSceneGroups);
        setActiveSceneGroupId(nextSceneGroup?.id ?? null);
        setSceneFrames(nextSceneGroup?.frames ?? INITIAL_SCENE_FRAMES);
      } catch (error) {
        console.error('Failed to delete scene', error);
        toast.error(getErrorMessage(error, 'Failed to delete scene.'));
        void loadSceneGroups(selectedThreadId);
      }
    },
    [activeSceneGroup, loadSceneGroups, sceneGroups, selectedThreadId]
  );

  const handleRenameSceneFrame = useCallback(
    async (frameId: string, title: string) => {
      setSceneFrames((current) => current.map((frame) => (frame.id === frameId ? { ...frame, title } : frame)));

      const frame = sceneFrames.find((entry) => entry.id === frameId);
      if (!frame) {
        return;
      }

      try {
        const updatedSceneGroup = await updateSceneFrame(frameId, {
          title,
          prompt: frame.prompt,
          frameOrder: (activeSceneGroup?.frames.findIndex((entry) => entry.id === frameId) ?? 0) + 1,
        });
        if (updatedSceneGroup) {
          setSceneGroups((current) =>
            current.map((sceneGroup) => (sceneGroup.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : sceneGroup))
          );
        }
      } catch (error) {
        console.error('Failed to rename scene frame', error);
      }
    },
    [activeSceneGroup, sceneFrames]
  );

  const handleDeleteSceneFrame = useCallback(
    async (frameId: string) => {
      if (!activeSceneGroup) {
        return;
      }

      const frame = sceneFrames.find((entry) => entry.id === frameId);
      if (!frame) {
        return;
      }

      setSceneFrames((current) => current.filter((entry) => entry.id !== frameId));
      setSceneGroups((current) =>
        current.map((sceneGroup) =>
          sceneGroup.id === activeSceneGroup.id
            ? { ...sceneGroup, frames: sceneGroup.frames.filter((entry) => entry.id !== frameId) }
            : sceneGroup
        )
      );

      try {
        const updatedSceneGroup = await deleteSceneFrame(frameId);
        if (updatedSceneGroup) {
          const nextSceneGroup = toSceneGroupUi(updatedSceneGroup);
          setSceneGroups((current) =>
            current.map((sceneGroup) => (sceneGroup.id === nextSceneGroup.id ? nextSceneGroup : sceneGroup))
          );
          setSceneFrames(nextSceneGroup.frames);
        }
      } catch (error) {
        console.error('Failed to delete scene frame', error);
        setSceneFrames((current) => {
          if (current.some((entry) => entry.id === frame.id)) {
            return current;
          }
          return [...current, frame].sort((left, right) => {
            const leftIndex = activeSceneGroup.frames.findIndex((entry) => entry.id === left.id);
            const rightIndex = activeSceneGroup.frames.findIndex((entry) => entry.id === right.id);
            return leftIndex - rightIndex;
          });
        });
        setSceneGroups((current) =>
          current.map((sceneGroup) =>
            sceneGroup.id === activeSceneGroup.id
              ? { ...sceneGroup, frames: activeSceneGroup.frames }
              : sceneGroup
          )
        );
        toast.error(getErrorMessage(error, 'Failed to delete frame.'));
      }
    },
    [activeSceneGroup, sceneFrames]
  );

  const handleAddSceneFrame = useCallback(async () => {
    let sceneGroup = activeSceneGroup;

    if (!sceneGroup) {
      if (!selectedThreadId) {
        return;
      }

      sceneGroup = await createSceneGroup(selectedThreadId, {
        title: 'Scene 1',
        prompt: '',
        tocOrder: 1,
      });
      setSceneGroups((current) => [toSceneGroupUi(sceneGroup), ...current]);
      setActiveSceneGroupId(sceneGroup.id);
    }

    const optimisticFrame: SceneFrame = {
      id: `optimistic-scene-frame-${Date.now()}`,
      title: `Frame ${sceneGroup.frames.length + 1}`,
      prompt: '',
      references: [],
      assets: [],
      isCollapsed: false,
      isRenaming: true,
    };

    setSceneFrames((current) => [...current, optimisticFrame]);

    try {
      const updatedSceneGroup = await createSceneFrame(sceneGroup.id, {
        title: `Frame ${sceneGroup.frames.length + 1}`,
        prompt: '',
        frameOrder: sceneGroup.frames.length + 1,
      });
      setSceneGroups((current) =>
        current.map((sceneGroup) => (sceneGroup.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : sceneGroup))
      );
    } catch (error) {
      console.error('Failed to create scene frame', error);
      setSceneFrames((current) => current.filter((frame) => frame.id !== optimisticFrame.id));
      toast.error('Failed to create frame');
    }
  }, [activeSceneGroup, selectedThreadId]);

  const buildSceneGenerationInput = useCallback(
    (sceneGroup: SceneGroupUi, targetFrameId?: string) => ({
      sceneGroupId: sceneGroup.id,
      targetFrameId,
      promptOverride: sceneGroup.prompt,
      frameOverrides: sceneFrames.map((frame) => ({
        id: frame.id,
        title: frame.title,
        prompt: frame.prompt,
        references: frame.references.map((reference) => ({
          id: reference.id,
          referenceKind: reference.referenceKind,
          referenceId: reference.referenceId,
          name: reference.name,
          mimeType: reference.mimeType,
          bytesBase64: reference.bytesBase64,
          createdAt: reference.createdAt,
        })),
      })),
      referenceImages: sceneGroupReferences.map((reference) => ({
        name: reference.name,
        title: reference.title,
        description: reference.description,
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
      })),
      fastMode: effectiveFastMode,
    }),
    [effectiveFastMode, sceneFrames, sceneGroupReferences]
  );

  const handleGenerateSceneFrames = useCallback(async () => {
    if (!activeSceneGroup) {
      toast.error('Scene group is still loading.');
      return;
    }

    if (activeSceneGroupGeneratingFrameIds.length > 0) {
      return;
    }

    const generationStartedAt = new Date().toISOString();
    setActiveSceneGenerationRunsByGroupId((current) => ({
      ...current,
      [activeSceneGroup.id]: {
        sceneGroupId: activeSceneGroup.id,
        frameIds: sceneFrames.map((frame) => frame.id),
        provider: selectedProviderId,
        modelId: selectedModel.id,
        modelLabel: selectedModel.label,
        generationStartedAt,
      },
    }));
    sceneGenerationCancelRequestedRef.current.delete(activeSceneGroup.id);

    try {
      const updatedSceneGroup = await generateSceneGroup(buildSceneGenerationInput(activeSceneGroup));
      if (updatedSceneGroup) {
        setSceneGroups((current) =>
          current.map((sceneGroup) => (sceneGroup.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : sceneGroup))
        );
      }
    } catch (error) {
      console.error('Failed to generate scene group', error);
      if (!sceneGenerationCancelRequestedRef.current.has(activeSceneGroup.id) && !isGenerationCanceledError(error)) {
        toast.error(getErrorMessage(error, 'Failed to generate scene frames.'));
      }
    } finally {
      sceneGenerationCancelRequestedRef.current.delete(activeSceneGroup.id);
      setActiveSceneGenerationRunsByGroupId((current) => {
        const next = { ...current };
        delete next[activeSceneGroup.id];
        return next;
      });
    }
  }, [
    activeSceneGroup,
    activeSceneGroupGeneratingFrameIds.length,
    buildSceneGenerationInput,
    sceneFrames,
    selectedModel.id,
    selectedModel.label,
    selectedProviderId,
  ]);

  const handleGenerateSingleSceneFrame = useCallback(
    async (frameId: string) => {
      if (!activeSceneGroup) {
        toast.error('Scene group is still loading.');
        return;
      }

      if (activeSceneGroupGeneratingFrameIds.length > 0) {
        return;
      }

      const generationStartedAt = new Date().toISOString();
      setActiveSceneGenerationRunsByGroupId((current) => ({
        ...current,
        [activeSceneGroup.id]: {
          sceneGroupId: activeSceneGroup.id,
          frameIds: [frameId],
          provider: selectedProviderId,
          modelId: selectedModel.id,
          modelLabel: selectedModel.label,
          generationStartedAt,
        },
      }));
      sceneGenerationCancelRequestedRef.current.delete(activeSceneGroup.id);

      try {
        const updatedSceneGroup = await generateSceneGroup(buildSceneGenerationInput(activeSceneGroup, frameId));
        if (updatedSceneGroup) {
          setSceneGroups((current) =>
            current.map((sceneGroup) => (sceneGroup.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : sceneGroup))
          );
        }
      } catch (error) {
        console.error('Failed to generate scene frame', error);
        if (!sceneGenerationCancelRequestedRef.current.has(activeSceneGroup.id) && !isGenerationCanceledError(error)) {
          toast.error(getErrorMessage(error, 'Failed to generate scene frame.'));
        }
      } finally {
        sceneGenerationCancelRequestedRef.current.delete(activeSceneGroup.id);
        setActiveSceneGenerationRunsByGroupId((current) => {
          const next = { ...current };
          delete next[activeSceneGroup.id];
          return next;
        });
      }
    },
    [
      activeSceneGroup,
      activeSceneGroupGeneratingFrameIds.length,
      buildSceneGenerationInput,
      selectedModel.id,
      selectedModel.label,
      selectedProviderId,
    ]
  );

  const handleStopSceneGeneration = useCallback(async () => {
    if (!activeSceneGroup) {
      return;
    }

    sceneGenerationCancelRequestedRef.current.add(activeSceneGroup.id);
    setActiveSceneGenerationRunsByGroupId((current) => {
      const next = { ...current };
      delete next[activeSceneGroup.id];
      return next;
    });

    try {
      await cancelSceneGroupGeneration(activeSceneGroup.id);
    } catch (error) {
      sceneGenerationCancelRequestedRef.current.delete(activeSceneGroup.id);
      console.error('Failed to stop scene generation', error);
      toast.error(getErrorMessage(error, 'Failed to stop scene generation.'));
    }
  }, [activeSceneGroup]);

  const handleStructureSceneFromClipboard = useCallback(async () => {
    if (isStructuringSceneFromClipboard) {
      return;
    }

    let clipboardText = '';
    try {
      clipboardText = (await navigator.clipboard.readText()).trim();
    } catch (error) {
      console.error('Failed to read clipboard for scene structuring', error);
      toast.error('Failed to read clipboard.');
      return;
    }

    if (!clipboardText) {
      toast.error('Clipboard is empty.');
      return;
    }

    setIsStructuringSceneFromClipboard(true);

    try {
      const structured = await structureScenePrompt({
        sourceText: clipboardText,
        modelId: 'codex-gpt-5-4-mini',
      });

      let workingSceneGroup = activeSceneGroup;
      if (!workingSceneGroup) {
        if (!selectedThreadId) {
          throw new Error('Thread is still loading.');
        }

        workingSceneGroup = await createSceneGroup(selectedThreadId, {
          title: 'Scene 1',
          prompt: '',
          tocOrder: 1,
        });
        setSceneGroups((current) => [toSceneGroupUi(workingSceneGroup), ...current]);
        setActiveSceneGroupId(workingSceneGroup.id);
      }

      let updatedSceneGroup = workingSceneGroup;
      for (let index = updatedSceneGroup.frames.length; index < structured.frames.length; index += 1) {
        updatedSceneGroup = await createSceneFrame(updatedSceneGroup.id, {
          title: `Frame ${index + 1}`,
          prompt: '',
          frameOrder: index + 1,
        });
        setSceneGroups((current) =>
          current.some((sceneGroup) => sceneGroup.id === updatedSceneGroup.id)
            ? current.map((sceneGroup) =>
                sceneGroup.id === updatedSceneGroup.id ? toSceneGroupUi(updatedSceneGroup) : sceneGroup
              )
            : [toSceneGroupUi(updatedSceneGroup), ...current]
        );
      }

      const nextFrames = updatedSceneGroup.frames.map((frame, index) => {
        const currentFrame = sceneFrames.find((item) => item.id === frame.id);
        return {
          ...toSceneFrameUi(frame),
          prompt: structured.frames[index]?.prompt ?? '',
          references: currentFrame?.references ?? frame.references,
          isCollapsed: currentFrame?.isCollapsed ?? false,
          isRenaming: currentFrame?.isRenaming ?? false,
        };
      });

      setSceneGroups((current) =>
        current.map((sceneGroup) =>
          sceneGroup.id === updatedSceneGroup.id
            ? { ...sceneGroup, prompt: structured.sceneDescription, frames: nextFrames }
            : sceneGroup
        )
      );
      setSceneFrames(nextFrames);
    } catch (error) {
      console.error('Failed to structure scene from clipboard', error);
      toast.error(getErrorMessage(error, 'Failed to structure scene from clipboard.'));
    } finally {
      setIsStructuringSceneFromClipboard(false);
    }
  }, [activeSceneGroup, isStructuringSceneFromClipboard, sceneFrames, selectedThreadId]);

  const handlePrepareThreadDraft = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedThreadIdImmediately(null);
    setGeneratedImages([]);
    setOpenProjects((current) => ({
      ...current,
      [projectId]: true,
    }));
  }, [setSelectedThreadIdImmediately]);

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

  const handleExportProject = useCallback(async (projectId: string) => {
    try {
      const result = await exportProject(projectId);
      if (result.status === 'exported') {
        toast.success(`Exported to ${getExportedFileName(result.filePath)}`);
      }
    } catch (error) {
      console.error('Failed to export project', error);
      toast.error(getErrorMessage(error, 'Export failed'));
    }
  }, []);

  const handleExportThread = useCallback(async (threadId: string) => {
    try {
      const result = await exportThread(threadId);
      if (result.status === 'exported') {
        toast.success(`Exported to ${getExportedFileName(result.filePath)}`);
      }
    } catch (error) {
      console.error('Failed to export thread', error);
      toast.error(getErrorMessage(error, 'Export failed'));
    }
  }, []);

  const handleExportReference = useCallback(async (reference: SavedReferenceImage) => {
    try {
      const result = await exportReference({
        id: reference.id,
        title: reference.title,
        category: reference.category,
        collectionId: reference.collectionId ?? null,
        environmentId: reference.environmentId ?? null,
      });
      if (result.status === 'exported') {
        toast.success(`Exported to ${getExportedFileName(result.filePath)}`);
      }
    } catch (error) {
      console.error('Failed to export reference', error);
      toast.error(getErrorMessage(error, 'Export failed'));
    }
  }, []);

  const handleImportCrenv = useCallback(async () => {
    try {
      const result = await importCrenv(selectedProjectId);
      if (result.status === 'canceled') {
        return;
      }

      const nextProjects = await refreshProjects();
      const nextProjectId = result.projectId ?? selectedProjectId ?? nextProjects[0]?.id ?? null;
      const nextThreadId =
        result.threadIds?.[0] ?? nextProjects.find((project) => project.id === nextProjectId)?.threads[0]?.id ?? null;

      if (nextProjectId && nextThreadId) {
        await handleSelectThread(nextProjectId, nextThreadId);
      } else {
        setSelectedProjectId(nextProjectId);
        setSelectedThreadIdImmediately(null);
        setGeneratedImages([]);
      }

      toast.success(result.scope === 'thread' ? 'Thread imported' : 'Project imported');
    } catch (error) {
      console.error('Failed to import project or thread', error);
      toast.error(getErrorMessage(error, 'Import failed'));
    }
  }, [handleSelectThread, refreshProjects, selectedProjectId, setSelectedThreadIdImmediately]);

  const handleImportReference = useCallback(async () => {
    try {
      const result = await importReference();
      if (result.status === 'canceled') {
        return;
      }

      const references = await listReferences();
      setSavedReferences((current) => {
        for (const reference of current) {
          revokeReferencePreviewUrl(reference);
        }
        return references.map(toSavedReferenceImage);
      });

      toast.success('Reference imported');
    } catch (error) {
      console.error('Failed to import reference', error);
      toast.error(getErrorMessage(error, 'Import failed'));
    }
  }, []);

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
        setSelectedThreadIdImmediately(workspace.thread.id);
        await loadThreadImages(workspace.thread.id);
        return;
      }

      if (selectedProjectId === projectId) {
        setSelectedProjectId(nextProjects[0]?.id ?? null);
        setSelectedThreadIdImmediately(null);
        setGeneratedImages([]);
      }
    } catch (error) {
      console.error('Failed to delete project', error);
      toast.error('Failed to delete project');
    }
  }, [loadThreadImages, refreshProjects, selectedProjectId, setSelectedThreadIdImmediately]);

  const handleDeleteThread = useCallback(async (threadId: string, projectId: string) => {
    try {
      await deleteThread(threadId);
      await refreshProjects();
      toast.message('Thread deleted');

      if (selectedThreadId === threadId) {
        setSelectedProjectId(projectId);
        setSelectedThreadIdImmediately(null);
        setGeneratedImages([]);
      }
    } catch (error) {
      console.error('Failed to delete thread', error);
      toast.error('Failed to delete thread');
    }
  }, [refreshProjects, selectedThreadId, setSelectedThreadIdImmediately]);

  const openSidebarEntityDialog = useCallback((action: Exclude<SidebarEntityAction, null>) => {
    setSidebarEntityAction(action);
    setIsSidebarEntityDialogOpen(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    let activeProjectId = selectedProjectId;
    let activeThreadId = selectedThreadId;

    if (!activeProjectId) {
      try {
        const workspace = await ensureProjectThreadWorkspace();
        activeProjectId = workspace.project.id;
        activeThreadId = workspace.thread.id;
        setSelectedProjectId(workspace.project.id);
        setSelectedThreadIdImmediately(workspace.thread.id);
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
        setSelectedThreadIdImmediately(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before generation', error);
        return;
      }
    }

    if (!activeThreadId) {
      return;
    }

    const clientRunId = createClientRunId();
    const currentGenerationMode = generationMode;
    const currentShotCount = shotCount;
    const currentSelectedAspectRatio = selectedAspectRatio;
    const currentIsAngleEnabled = isAngleEnabled;
    const currentSelectedAngle = selectedAngle;
    let currentReferenceImages = [...referenceImages];
    const currentGeneratedImages = [...generatedImages];
    const currentSavedReferences = [...savedReferences];
    const currentSelectedPromptReferenceIds = [...selectedPromptReferenceIds];

    try {
      const attachedSourceImageIds = new Set(
        currentReferenceImages.map((image) => image.sourceImageId).filter((id): id is string => Boolean(id))
      );
      const mentionedGeneratedSourceIds = new Set(
        currentSelectedPromptReferenceIds
          .map(getSourceImageIdFromGeneratedReferenceId)
          .filter((id): id is string => Boolean(id))
      );
      const generatedReferencesToAttach = currentGeneratedImages.filter(
        (image) =>
          mentionedGeneratedSourceIds.has(image.id) &&
          !attachedSourceImageIds.has(image.id) &&
          !('isLoading' in image && image.isLoading)
      );

      if (generatedReferencesToAttach.length > 0) {
        const rehydratedGeneratedReferences = await Promise.all(
          generatedReferencesToAttach.map((image) => buildGeneratedImageReference(image))
        );
        currentReferenceImages = [...currentReferenceImages, ...rehydratedGeneratedReferences];
      }

      const uniqueReferenceImages = [];
      const seenBytes = new Set<string>();

      // 1. Add mentioned saved references
      const selectedSavedReferences = resolveSavedReferencesFromMentionIds(
        currentSavedReferences,
        currentSelectedPromptReferenceIds
      );
      for (const ref of selectedSavedReferences) {
        if (ref.bytesBase64) {
          seenBytes.add(ref.bytesBase64);
        }
        const groupSize = currentSavedReferences.filter(
          (reference) => getSavedReferenceMentionGroupId(reference) === getSavedReferenceMentionGroupId(ref)
        ).length;
        uniqueReferenceImages.push({
          name: ref.name,
          title: ref.title,
          description:
            groupSize > 1
              ? [`Multiple-angle reference set: ${ref.title}.`, ref.description].filter(Boolean).join(' ')
              : ref.description ?? undefined,
          mimeType: ref.mimeType,
          bytesBase64: ref.bytesBase64,
        });
      }

      // 2. Add attached reference images (avoiding duplicates)
      for (const img of currentReferenceImages) {
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
      const refsForReplacementByTitle = new Map<string, { title: string; placeholder: string }>();
      uniqueReferenceImages.forEach((ref, index) => {
        if (!ref.title || refsForReplacementByTitle.has(ref.title)) {
          return;
        }
        refsForReplacementByTitle.set(ref.title, {
          title: ref.title,
          placeholder: `RefImage${index + 1} (${ref.title})`,
        });
      });
      const sortedRefsForReplacement = [...refsForReplacementByTitle.values()].sort(
        (left, right) => right.title.length - left.title.length
      );

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
        currentGenerationMode === 'scene'
          ? `${mappedPrompt}\n\nAspect ratio: ${currentSelectedAspectRatio}\nMode: Scene`
          : [
              mappedPrompt,
              '',
              `Aspect ratio: ${currentSelectedAspectRatio}`,
              currentIsAngleEnabled ? buildAngleDirective(currentSelectedAngle) : null,
            ]
              .filter((line): line is string => line !== null)
              .join('\n');

      registerActiveRun({
        clientRunId,
        threadId: activeThreadId,
        mode: currentGenerationMode,
        count: currentShotCount,
        provider: selectedProviderId,
        modelId: selectedModel.id,
        modelLabel: selectedModel.label,
      });
      clearComposerAfterSubmit();
      toast.message('Generation started');

      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: selectedProviderId,
        modelId: selectedModel.id,
        mode: currentGenerationMode,
        prompt: generationPrompt,
        count: currentShotCount,
        threadId: activeThreadId,
        referenceImages: formattedReferenceImages,
      });

      await refreshProjects();
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        const resultAssetIds = new Set(result.assets.map((asset) => asset.id));
        setGeneratedImages((current) => [
          ...result.assets,
          ...current.filter((image) => !isLoadingEntryForRun(image, clientRunId) && !resultAssetIds.has(image.id)),
        ]);
      }
      toast.success(result.assets.length > 0 ? `Generated ${result.assets.length} images` : 'Generation complete');
    } catch (error) {
      console.error('Failed to generate images', error);
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        setGeneratedImages((current) =>
          current.filter((image) => !isLoadingEntryForRun(image, clientRunId))
        );
      }
      await refreshProjects();
      toast.error(getErrorMessage(error, 'Failed to generate images'));
    } finally {
      decrementLocalRunningThread(activeThreadId);
    }
  }, [
    clearComposerAfterSubmit,
    createClientRunId,
    decrementLocalRunningThread,
    buildGeneratedImageReference,
    generationMode,
    generatedImages,
    isAngleEnabled,
    effectiveFastMode,
    prompt,
    referenceImages,
    refreshProjects,
    registerActiveRun,
    savedReferences,
    selectedAngle,
    selectedProjectId,
    selectedAspectRatio,
    setSelectedThreadIdImmediately,
    selectedModel,
    selectedProviderId,
    selectedPromptReferenceIds,
    selectedThreadId,
    shotCount,
  ]);

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
    if (!session || !session.point) {
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
        setSelectedThreadIdImmediately(workspace.thread.id);
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
        setSelectedThreadIdImmediately(thread.id);
        await refreshProjects();
      } catch (error) {
        console.error('Failed to create thread before generation', error);
        return;
      }
    }

    if (!activeThreadId) {
      return;
    }

    const clientRunId = createClientRunId();

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

    registerActiveRun({
      clientRunId,
      threadId: activeThreadId,
      mode: 'pinpoint',
      count: 1,
      provider: selectedProviderId,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
    });
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: selectedProviderId,
        modelId: selectedModel.id,
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
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        const resultAssetIds = new Set(result.assets.map((asset) => asset.id));
        setGeneratedImages((current) => [
          ...result.assets,
          ...current.filter((image) => !isLoadingEntryForRun(image, clientRunId) && !resultAssetIds.has(image.id)),
        ]);
      }
      toast.success(result.assets.length > 0 ? 'Generated 1 image' : 'Generation complete');
    } catch (error) {
      console.error('Failed to generate pinpoint image', error);
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        setGeneratedImages((current) =>
          current.filter((image) => !isLoadingEntryForRun(image, clientRunId))
        );
      }
      await refreshProjects();
      toast.error(getErrorMessage(error, 'Failed to generate pinpoint image'));
    } finally {
      decrementLocalRunningThread(activeThreadId);
    }
  }, [
    closePlayer,
    createClientRunId,
    decrementLocalRunningThread,
    ensurePlayerImageBytes,
    effectiveFastMode,
    playerSession,
    refreshProjects,
    registerActiveRun,
    selectedAspectRatio,
    selectedModel,
    selectedProviderId,
    selectedProjectId,
    setSelectedThreadIdImmediately,
    selectedThreadId,
  ]);

  const handleCameraGenerate = useCallback(async () => {
    const session = playerSession;
    if (!session) {
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
        setSelectedThreadIdImmediately(workspace.thread.id);
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
        setSelectedThreadIdImmediately(thread.id);
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
    const clientRunId = createClientRunId();

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
        'Use it as the exact scene anchor for a physical 3D camera perspective change.',
        'Preserve identity, aspect ratio, quality, and style while changing only camera viewpoint.',
        'Infer plausible newly visible side geometry instead of cropping, warping, or rotating the flat image.',
        `Requested camera rotation ${cameraPose.rotationDeg} degrees, tilt ${cameraPose.tiltDeg} degrees, zoom ${formatCameraZoom(cameraPose.zoom)}.`,
      ].join(' '),
      mimeType: sourceImage.mimeType,
      bytesBase64: sourceImage.bytesBase64 ?? '',
    };

    registerActiveRun({
      clientRunId,
      threadId: activeThreadId,
      mode: 'camera',
      count: outputCount,
      provider: selectedProviderId,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
    });
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: selectedProviderId,
        modelId: selectedModel.id,
        mode: 'camera',
        prompt: [
          'Camera source image: RefImage1',
          'Perspective goal: move the camera in 3D around RefImage1 while preserving the scene, subject identity, materials, lighting, and aspect ratio.',
          `Camera rotation: ${cameraPose.rotationDeg}°`,
          `Camera tilt: ${cameraPose.tiltDeg}°`,
          `Camera zoom: ${formatCameraZoom(cameraPose.zoom)}`,
          cameraPose.generateBestAngles
            ? 'Camera sweep: generate these 12 orbit/tilt camera pairs: 0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°.'
            : 'Camera sweep: single requested camera view.',
          'Do not fake the move by cropping, resizing, canvas warping, or rotating the flat image plane.',
          'Aspect ratio: match RefImage1 exactly; preserve the source canvas dimensions and proportions.',
        ].join('\n'),
        count: outputCount,
        threadId: activeThreadId,
        referenceImages: [sourceReference],
        camera: cameraPose,
      });

      await refreshProjects();
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        const resultAssetIds = new Set(result.assets.map((asset) => asset.id));
        setGeneratedImages((current) => [
          ...result.assets,
          ...current.filter((image) => !isLoadingEntryForRun(image, clientRunId) && !resultAssetIds.has(image.id)),
        ]);
      }
      toast.success(
        result.assets.length === 1
          ? 'Generated 1 image'
          : result.assets.length > 1
            ? `Generated ${result.assets.length} images`
            : 'Generation complete'
      );
    } catch (error) {
      console.error('Failed to generate camera image', error);
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      if (selectedThreadIdRef.current === activeThreadId) {
        setGeneratedImages((current) =>
          current.filter((image) => !isLoadingEntryForRun(image, clientRunId))
        );
      }
      await refreshProjects();
      toast.error(getErrorMessage(error, 'Failed to generate camera image'));
    } finally {
      decrementLocalRunningThread(activeThreadId);
    }
  }, [
    closePlayer,
    createClientRunId,
    decrementLocalRunningThread,
    ensurePlayerImageBytes,
    effectiveFastMode,
    playerSession,
    refreshProjects,
    registerActiveRun,
    selectedModel,
    selectedProviderId,
    selectedProjectId,
    setSelectedThreadIdImmediately,
    selectedThreadId,
  ]);

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
          setSelectedThreadIdImmediately(workspace.thread.id);
          syncVisibleThreadImages(workspace.thread.id, images);
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
  }, [setSelectedThreadIdImmediately, syncVisibleThreadImages]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    void loadDirectorChatsForThread(selectedThreadId).catch((error) => {
      console.error('Failed to load Director chats', error);
    });
  }, [loadDirectorChatsForThread, selectedThreadId]);

  useEffect(() => {
    if (!activeDirectorChatId) {
      return;
    }
    if (directorMessagesByChatIdRef.current[activeDirectorChatId]) {
      return;
    }
    const cachedMessages = directorMessagesCacheRef.current[activeDirectorChatId];
    if (cachedMessages) {
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [activeDirectorChatId]: cachedMessages,
        }, activeDirectorChatId)
      );
      return;
    }
    void loadDirectorMessagesForChat(activeDirectorChatId).catch((error) => {
      console.error('Failed to load Director messages', error);
    });
  }, [activeDirectorChatId, limitDirectorMessagesByChatId, loadDirectorMessagesForChat]);

  useEffect(() => {
    return subscribeToScenePlan((event) => {
      let runId = event.clientRunId;
      if (!runId) {
        const matchingRuns = Object.values(activeRunsRef.current).filter(
          (run) => run.mode === 'scene' && run.threadId === event.threadId
        );
        if (matchingRuns.length !== 1) {
          return;
        }
        runId = matchingRuns[0].clientRunId;
      }

      const currentRun = activeRunsRef.current[runId];
      if (!currentRun || currentRun.mode !== 'scene' || currentRun.threadId !== event.threadId) {
        return;
      }

      toast.message(`Generating ${event.count} images`);
      if (!event.applyToShimmers) {
        return;
      }

      const nextLoadingEntries = createLoadingEntries(runId, event.count, {
        provider: currentRun.provider,
        modelId: currentRun.modelId,
        modelLabel: currentRun.modelLabel,
        generationStartedAt: currentRun.generationStartedAt,
      });
      setActiveRunsById((current) => {
        const existingRun = current[runId];
        if (!existingRun) {
          return current;
        }

        const nextState = {
          ...current,
          [runId]: {
            ...existingRun,
            loadingEntries: nextLoadingEntries,
          },
        };
        activeRunsRef.current = nextState;
        return nextState;
      });

      if (selectedThreadIdRef.current === event.threadId) {
        setGeneratedImages((current) => [
          ...nextLoadingEntries,
          ...current.filter((image) => !isLoadingEntryForRun(image, runId)),
        ]);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToImageReady((event) => {
      const runId = event.clientRunId ?? null;
      if (runId) {
        setActiveRunsById((current) => {
          const activeRun = current[runId];
          if (!activeRun) {
            return current;
          }

          const remainingLoadingEntries = activeRun.loadingEntries.slice(1);
          const nextState = {
            ...current,
            [runId]: {
              ...activeRun,
              loadingEntries: remainingLoadingEntries,
            },
          };
          activeRunsRef.current = nextState;
          return nextState;
        });
      }

      if (selectedThreadIdRef.current === event.threadId) {
        setGeneratedImages((current) => {
          const withoutDuplicate = current.filter((image) => image.id !== event.asset.id);
          if (runId) {
            const loadingIndex = withoutDuplicate.findIndex((image) => isLoadingEntryForRun(image, runId));
            if (loadingIndex >= 0) {
              return [
                ...withoutDuplicate.slice(0, loadingIndex),
                event.asset,
                ...withoutDuplicate.slice(loadingIndex + 1),
              ];
            }
          }
          return [event.asset, ...withoutDuplicate];
        });
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToSceneFrameReady((event) => {
      void listSceneGroups(event.threadId)
        .then((nextSceneGroups) => {
          setSceneGroups(nextSceneGroups.map(toSceneGroupUi));
          setActiveSceneGenerationRunsByGroupId((current) => {
            const activeRun = current[event.sceneGroupId];
            if (!activeRun) {
              return current;
            }

            const nextFrameIds = activeRun.frameIds.filter((frameId) => frameId !== event.frameId);
            const nextState = { ...current };
            if (nextFrameIds.length === 0) {
              delete nextState[event.sceneGroupId];
            } else {
              nextState[event.sceneGroupId] = {
                ...activeRun,
                frameIds: nextFrameIds,
              };
            }
            return nextState;
          });
        })
        .catch((error) => {
          console.error('Failed to refresh scene group after frame completion', error);
        });
    });
  }, []);

  useEffect(() => {
    return subscribeToDirectorSceneReady((event) => {
      if (selectedThreadIdRef.current !== event.threadId) {
        return;
      }

      void listSceneGroups(event.threadId)
        .then((nextSceneGroups) => {
          const nextSceneGroupUi = nextSceneGroups.map(toSceneGroupUi);
          const targetSceneGroup = nextSceneGroupUi.find((sceneGroup) => sceneGroup.id === event.sceneGroupId);

          setSceneGroups(nextSceneGroupUi);
          setActiveSceneGroupId(targetSceneGroup?.id ?? nextSceneGroupUi[0]?.id ?? null);
          setSceneFrames(targetSceneGroup?.frames ?? nextSceneGroupUi[0]?.frames ?? INITIAL_SCENE_FRAMES);
          toast.message('Scene generation started');
        })
        .catch((error) => {
          console.error('Failed to refresh Director scene plan', error);
          toast.error(getErrorMessage(error, 'Failed to refresh Director scene plan.'));
        });
    });
  }, []);

  useEffect(() => {
    return subscribeToDirectorMessageStart((event) => {
      setActiveDirectorRunsByChatId((current) => ({
        ...current,
        [event.chatId]: {
          chatId: event.chatId,
          threadId: event.threadId,
          messageId: event.assistantMessage.id,
          modelId: event.assistantMessage.modelId,
          modelLabel: event.assistantMessage.modelLabel,
          fastMode: event.assistantMessage.fastMode,
          startedAt: event.assistantMessage.createdAt,
        },
      }));
      setDirectorMessagesByChatId((current) => {
        return limitDirectorMessagesByChatId({
          ...current,
          [event.chatId]: mergeDirectorMessages(current[event.chatId] ?? [], [event.userMessage, event.assistantMessage]),
        }, event.chatId);
      });
    });
  }, [limitDirectorMessagesByChatId]);

  useEffect(() => {
    return subscribeToDirectorMessageDelta((event) => {
      pendingDirectorDeltaByMessageIdRef.current[event.messageId] = {
        chatId: event.chatId,
        content: event.content,
      };

      if (directorDeltaFlushTimerRef.current !== null) {
        return;
      }

      directorDeltaFlushTimerRef.current = window.setTimeout(() => {
        const pendingDeltas = pendingDirectorDeltaByMessageIdRef.current;
        pendingDirectorDeltaByMessageIdRef.current = {};
        directorDeltaFlushTimerRef.current = null;

        setDirectorMessagesByChatId((current) => {
          const next = { ...current };
          let touchedChatId: string | undefined;
          for (const [messageId, pendingDelta] of Object.entries(pendingDeltas)) {
            touchedChatId = pendingDelta.chatId;
            next[pendingDelta.chatId] = (next[pendingDelta.chatId] ?? []).map((message) =>
              message.id === messageId
                ? { ...message, contentMarkdown: pendingDelta.content, status: 'streaming' }
                : message
            );
          }
          return limitDirectorMessagesByChatId(next, touchedChatId);
        });
      }, 48);
    });
  }, [limitDirectorMessagesByChatId]);

  useEffect(() => {
    return () => {
      if (directorDeltaFlushTimerRef.current !== null) {
        window.clearTimeout(directorDeltaFlushTimerRef.current);
      }
      directorDeltaFlushTimerRef.current = null;
      pendingDirectorDeltaByMessageIdRef.current = {};
    };
  }, []);

  useEffect(() => {
    return subscribeToDirectorMessageComplete((event) => {
      delete pendingDirectorDeltaByMessageIdRef.current[event.messageId];
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[event.chatId];
        return next;
      });
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [event.chatId]: (current[event.chatId] ?? []).map((message) =>
            message.id === event.messageId
              ? { ...message, contentMarkdown: event.content, status: 'completed', updatedAt: new Date().toISOString() }
              : message
          ),
        }, event.chatId)
      );
      void loadDirectorChatsForThread(event.threadId).catch(() => {});
    });
  }, [limitDirectorMessagesByChatId, loadDirectorChatsForThread]);

  useEffect(() => {
    return subscribeToDirectorMessageError((event) => {
      delete pendingDirectorDeltaByMessageIdRef.current[event.messageId];
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[event.chatId];
        return next;
      });
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [event.chatId]: (current[event.chatId] ?? []).map((message) =>
            message.id === event.messageId
              ? { ...message, contentMarkdown: event.content, status: 'failed', updatedAt: new Date().toISOString() }
              : message
          ),
        }, event.chatId)
      );
      toast.error(event.canceled ? 'Director chat canceled' : event.errorMessage);
      void loadDirectorChatsForThread(event.threadId).catch(() => {});
    });
  }, [limitDirectorMessagesByChatId, loadDirectorChatsForThread]);

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
    const tabsNode = workspaceTabsRef.current;
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
      const estimatedTitle = buildHeaderTitleText(activeThreadTitle, activeHeaderChatTitle);
      const headerLeft = measureNode.getBoundingClientRect().left;
      const tabsLeft = tabsNode?.getBoundingClientRect().left ?? window.innerWidth / 2;
      const availableWidth = Math.max(96, Math.floor(tabsLeft - headerLeft - 16));
      const nextHeaderWidth =
        measuredWidth > 0
          ? Math.min(measuredWidth, availableWidth)
          : Math.min(estimateHeaderTitleWidth(estimatedTitle, isSidebarCollapsed), availableWidth);
      const isHeaderClamped =
        measuredWidth > 0
          ? measuredWidth > nextHeaderWidth
          : estimateHeaderTitleWidth(estimatedTitle, isSidebarCollapsed) > nextHeaderWidth;
      const shellChromeWidth = (isSidebarCollapsed ? 36 + 8 : 0) + 24 + 24 + 2;
      const nextTextWidth = isHeaderClamped
        ? Math.max(64, nextHeaderWidth - shellChromeWidth)
        : measuredTextWidth > 0
          ? measuredTextWidth + 1
          : null;

      setHeaderTitleWidth(nextHeaderWidth);
      setHeaderTextWidth(nextTextWidth);
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
    if (tabsNode) {
      resizeObserver.observe(tabsNode);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeHeaderChatTitle, activeThreadTitle, isSidebarCollapsed]);

  return (
    <TooltipProvider>
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
        onOpenChange={(open) => {
          setIsAddReferenceDialogOpen(open);
          if (!open) {
            setAddReferenceDialogSeedFiles([]);
          }
        }}
        onSubmit={handleAddSavedReference}
        initialRoute={addReferenceDialogRoute}
        initialFiles={addReferenceDialogSeedFiles}
        onGenerateDescriptions={async (input) => describeReferenceCollection(input)}
      />
      <EditReferenceDialog
        open={editingReference !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReference(null);
          }
        }}
        reference={editingReference}
        onSubmit={async (input) => {
          if ((input.category === 'environment' && input.environmentId) || input.collectionId) {
            const updatedReferences = input.collectionId
              ? await updateReferenceCollection({
                  category: input.category,
                  collectionId: input.collectionId,
                  title: input.title,
                  description: input.description,
                  attachments: input.attachments ?? [],
                })
              : await updateEnvironmentReference({
                  environmentId: input.environmentId!,
                  title: input.title,
                  description: input.description,
                  attachments: input.attachments ?? [],
                });
            setSavedReferences((current) => [
              ...updatedReferences.map(toSavedReferenceImage),
              ...current.filter(
                (reference) => reference.collectionId !== (input.collectionId ?? input.environmentId)
              ),
            ]);
            toast.success('Reference updated');
            return;
          }

          const updated = await updateReference(input);
          setSavedReferences((current) =>
            current.map((reference) => {
              if (input.category === 'environment') {
                if (reference.environmentId !== input.environmentId) return reference;
                return {
                  ...reference,
                  title: updated.title,
                  description: updated.description ?? undefined,
                };
              }
              if (reference.id !== input.id) return reference;
              return {
                ...reference,
                title: updated.title,
                description: updated.description ?? undefined,
              };
            })
          );
          toast.success('Reference updated');
        }}
      />
      {deletingReference ? (
        <ConfirmDeleteDialog
          open={deletingReference !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingReference(null);
            }
          }}
          title={
            deletingReference.category === 'environment'
              ? 'Delete environment'
              : `Delete ${deletingReference.category === 'objects' ? 'object' : 'character'}`
          }
          description={
            deletingReference.category === 'environment'
              ? `Delete "${deletingReference.title}" and all images in this environment set?`
              : `Delete "${deletingReference.title}" from references?`
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteReference({
              id: deletingReference.id,
              category: deletingReference.category,
              collectionId: deletingReference.collectionId,
              environmentId: deletingReference.environmentId,
            });
            setSavedReferences((current) =>
              deletingReference.collectionId
                ? current.filter((reference) => reference.collectionId !== deletingReference.collectionId)
                : deletingReference.category === 'environment'
                ? current.filter((reference) => reference.environmentId !== deletingReference.environmentId)
                : current.filter((reference) => reference.id !== deletingReference.id)
            );
            setDeletingReference(null);
            toast.success('Reference deleted');
          }}
        />
      ) : null}

      <div
        className={[
          'absolute inset-0 z-0 overflow-y-auto pt-[60px]',
          'transition-[padding-left,padding-right,padding-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          activeStudioView === 'generation'
            ? isClassicWorkspace || isDirectorWorkspace
              ? isExpanded
                ? 'pb-[360px]'
                : 'pb-[180px]'
              : 'pb-10'
            : 'pb-10',
          isSidebarCollapsed ? 'pl-0' : 'pl-[260px]',
        ].join(' ')}
        style={{ paddingRight: isScenesWorkspace || isDirectorWorkspace ? scenesSidebarWidth + 24 : 0 }}
      >
        <AnimatePresence initial={false}>
          {activeStudioView === 'references' ? (
            <ReferencesWorkspace
              key="references-workspace"
              references={savedReferences}
              route={activeReferenceLibraryRoute}
              onAddReference={() => openAddReferenceDialog(activeReferenceLibraryRoute)}
              onEditReference={(reference) =>
                setEditingReference({
                  id: reference.id,
                  category: reference.category,
                  collectionId: reference.collectionId,
                  environmentId: reference.environmentId,
                  title: reference.title,
                  description: reference.description,
                  attachments: reference.collectionId
                    ? savedReferences
                        .filter((item) => item.collectionId === reference.collectionId)
                        .map((item) => ({
                          id: item.id,
                          name: item.name,
                          mimeType: item.mimeType,
                          bytesBase64: item.bytesBase64,
                          description: item.description,
                        }))
                    : reference.category === 'environment'
                      ? savedReferences
                          .filter((item) => item.environmentId === reference.environmentId)
                          .map((item) => ({
                            id: item.id,
                            name: item.name,
                            mimeType: item.mimeType,
                            bytesBase64: item.bytesBase64,
                            description: item.description,
                          }))
                      : undefined,
                })
              }
              onDeleteReference={(reference) =>
                setDeletingReference({
                  id: reference.id,
                  category: reference.category,
                  collectionId: reference.collectionId,
                  environmentId: reference.environmentId,
                  title: reference.title,
                })
              }
              onExportReference={handleExportReference}
              onImportReference={() => void handleImportReference()}
            />
          ) : (
            <div
              key="generation-workspace"
              className="min-h-full w-full"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isClassicWorkspace ? (
                  <motion.section
                    key="classic-workspace"
                    initial={{ opacity: 0, x: -10, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: 10, filter: 'blur(6px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
                  </motion.section>
                ) : null}

                {isScenesWorkspace ? (
                  <motion.section
                    key="scenes-workspace-panel"
                    initial={{ opacity: 0, x: 10, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -10, filter: 'blur(6px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-full w-full"
                  >
                  <ScenesWorkspace
                    sceneGroups={sceneGroups}
                    activeSceneGroupId={activeSceneGroup?.id ?? null}
                    frameCards={activeSceneWorkspaceFrameCards}
                    onSelectSceneGroup={handleSelectSceneGroup}
                    onRenameSceneGroup={handleRenameSceneGroup}
                    onReorderSceneGroups={handleReorderSceneGroups}
                    onDeleteSceneGroup={handleDeleteSceneGroup}
                    onOpenImage={openGeneratedImagePlayer}
                  />
                  </motion.section>
                ) : null}

                {isDirectorWorkspace ? (
                  <motion.section
                    key="director-workspace-panel"
                    initial={{ opacity: 0, x: 10, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -10, filter: 'blur(6px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-full w-full"
                  >
                    <DirectorWorkspace
                      chatId={activeDirectorChatId}
                      messages={activeDirectorMessages}
                      onApproveDirectorAction={handleApproveDirectorAction}
                      onDeclineDirectorAction={handleDeclineDirectorAction}
                    />
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </div>
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
        <div className="flex items-center gap-3">
          {activeThreadTitle ? (
            <>
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
                <div
                  ref={headerTitleMeasureRef}
                  className="inline-flex items-center whitespace-nowrap text-[18px] font-medium leading-none tracking-[0] text-transparent"
                >
                  <span ref={headerThreadMeasureRef}>{activeThreadTitle}</span>
                  {activeHeaderChatTitle ? (
                    <>
                      <span className="mx-2.5">{'>'}</span>
                      <span ref={headerChatMeasureRef}>{activeHeaderChatTitle}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <AnimatePresence initial={false}>
                <motion.div
                  key="thread-header"
                  initial={{ opacity: 0, filter: 'blur(6px)', y: 4 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(6px)', y: -3 }}
                  transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                className={[
                  't-resize flex h-12 items-center overflow-hidden px-3',
                  isScenesWorkspace
                    ? 'rounded-full border border-[var(--border-soft)] bg-[var(--surface)] shadow-none backdrop-blur-none'
                    : 'rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl',
                ].join(' ')}
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
                    className="flex h-full min-w-0 shrink items-center justify-start overflow-hidden text-left leading-none"
                    style={headerTextWidth ? { width: `${headerTextWidth}px` } : undefined}
                  >
                    <div className="flex min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap align-middle text-left text-[18px] font-medium leading-none tracking-[0] text-[var(--foreground)]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={activeThreadTitle}
                          initial={{ opacity: 0, y: 4, filter: 'blur(6px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -3, filter: 'blur(6px)' }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="block min-w-0 shrink truncate"
                          title={activeThreadTitle}
                        >
                          {activeThreadTitle}
                        </motion.span>
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {activeHeaderChatTitle ? (
                          <motion.span
                            key={`chat-header-${activeDirectorChatId ?? activeHeaderChatTitle}`}
                            initial={{ width: 0, opacity: 0, filter: 'blur(8px)' }}
                            animate={{ width: 'auto', opacity: 1, filter: 'blur(0px)' }}
                            exit={{ width: 0, opacity: 0, filter: 'blur(8px)' }}
                            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-flex min-w-0 flex-1 items-center overflow-hidden"
                          >
                            <span className="mx-2.5 shrink-0 text-[var(--muted-foreground)]">{'>'}</span>
                            <span className="block min-w-0 truncate" title={activeHeaderChatTitle}>
                              {activeHeaderChatTitle}
                            </span>
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </h1>
                </motion.div>
              </AnimatePresence>
            </>
          ) : null}

        </div>
      </header>

      <div ref={workspaceTabsRef} className="fixed left-1/2 top-[8px] z-40 -translate-x-1/2">
        <GenerationWorkspaceTabs
          selectedMode={generationWorkspaceMode}
          onSelectMode={setGenerationWorkspaceMode}
        />
      </div>

      <AnimatePresence initial={false}>
        {isClassicWorkspace && selectedGeneratedImages.length > 0 ? (
          <motion.div
            key="selected-image-header-actions"
            initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: 'blur(8px)' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-[64px] z-40 -translate-x-1/2"
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
                  aria-label="Add selected images as reference"
                  className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                  disabled={isPreparingSelectedImagesReference}
                  onClick={() => {
                    void handleAddSelectedImagesAsReference().catch((error) => {
                      console.error('Failed to prepare selected generated images as references', error);
                      toast.error(getErrorMessage(error, 'Failed to prepare reference images.'));
                    });
                  }}
                >
                  {isPreparingSelectedImagesReference ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                  Add as reference
                </Button>

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
          <img src={logo} alt="crevn logo" className="h-5 w-auto shrink-0" />
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Import project or thread"
                    onClick={() => void handleImportCrenv()}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                  >
                    <Upload className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Create new project"
                    onClick={() => setIsCreateProjectDialogOpen(true)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                  >
                    <FolderPlus className="size-3.5" />
                  </button>
                </div>
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
                        onExport={handleExportProject}
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
                                  isRunning={thread.hasRunningJob || (localRunningCountsByThreadId[thread.id] ?? 0) > 0}
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
                                  onExport={handleExportThread}
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
              <div className="space-y-2 px-2">
                <div className="px-3 text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                  References
                </div>
                {(['characters', 'environment', 'objects'] as const).map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => {
                      setActiveReferenceLibraryRoute(route);
                      setActiveStudioView('references');
                    }}
                    className={[
                      'flex h-10 w-full items-center rounded-[12px] px-3 text-left text-[14px] capitalize transition-colors',
                      activeStudioView === 'references' && activeReferenceLibraryRoute === route
                        ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface2)]',
                    ].join(' ')}
                  >
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-3 px-2">
                <div className="px-3 text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                  Updates
                </div>
                <div className="space-y-3 rounded-[18px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.42)] p-3">
                  <div className="min-h-9">
                    <p className="text-[13px] leading-5 tracking-[0] text-[var(--foreground)]">
                      {updateStatus?.message ?? 'Updates have not been checked yet.'}
                    </p>
                    {updateStatus?.errorMessage ? (
                      <p className="mt-1 text-[12px] leading-4 text-[rgb(245,178,178)]">
                        {updateStatus.errorMessage}
                      </p>
                    ) : updateStatus?.version ? (
                      <p className="mt-1 text-[12px] leading-4 text-[var(--muted-foreground)]">
                        Version {updateStatus.version}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="surface"
                      onClick={() => void handleCheckForUpdates()}
                      disabled={isUpdateBusy}
                      className="h-9 flex-1 rounded-full px-3 text-[13px]"
                    >
                      {isUpdateBusy ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                      {isUpdateBusy ? 'Checking' : 'Check for updates'}
                    </Button>
                    {canInstallUpdate ? (
                      <Button
                        type="button"
                        onClick={() => void handleInstallUpdate()}
                        disabled={isInstallingUpdate}
                        className="h-9 rounded-full px-3 text-[13px]"
                      >
                        {isInstallingUpdate ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Install
                      </Button>
                    ) : null}
                  </div>
                  {updateStatus?.percent !== null && updateStatus?.percent !== undefined ? (
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
                        style={{ width: `${updateStatus.percent}%` }}
                      />
                    </div>
                  ) : null}
                </div>
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
                  setActiveReferenceLibraryRoute('characters');
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
          <div className="mt-2 px-3 text-[11px] leading-4 tracking-[0] text-[var(--muted-foreground)]">
            {appInfo ? `${appInfo.name} v${appInfo.version}` : 'crevn'}
          </div>
        </div>
        </div>
      </aside>

      <AnimatePresence initial={false}>
        {isScenesWorkspace ? (
          <motion.div
            key="scenes-sidebar"
            data-testid="scenes-sidebar-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={[
              'fixed bottom-0 right-0 top-0 z-20 overflow-hidden border-l border-[var(--border-soft)] bg-[var(--surface)] will-change-[width]',
              isScenesSidebarResizing
                ? ''
                : 'transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            ].join(' ')}
            style={{ width: scenesSidebarWidth, minWidth: MIN_SCENES_SIDEBAR_WIDTH }}
          >
            <button
              type="button"
              aria-label="Resize scenes sidebar"
              onPointerDown={startScenesSidebarResize}
              className="absolute bottom-0 left-0 top-0 z-30 w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
            />
            <div
              data-testid="scenes-sidebar"
              className="h-full w-full overflow-hidden bg-[var(--surface)]"
              data-open="true"
            >
              <ScenesSidebar
                scenePrompt={activeSceneGroup?.prompt ?? ''}
                sceneReferences={sceneGroupReferences}
                frames={sceneFrames}
                savedReferences={savedReferences}
                isGenerating={isActiveSceneGroupGenerating}
                generatingFrameIds={activeSceneGroupGeneratingFrameIds}
                isStructuringFromClipboard={isStructuringSceneFromClipboard}
                isFastModeEnabled={effectiveFastMode}
                onStructureFromClipboard={() => {
                  void handleStructureSceneFromClipboard();
                }}
                onToggleFastMode={() => setIsFastModeEnabled((current) => !current)}
                onGenerateFrames={() => {
                  void handleGenerateSceneFrames();
                }}
                onGenerateFrame={(frameId) => {
                  void handleGenerateSingleSceneFrame(frameId);
                }}
                onStopGeneration={() => {
                  void handleStopSceneGeneration();
                }}
                onScenePromptChange={(prompt) => {
                  setSceneGroups((current) =>
                    current.map((sceneGroup) => {
                      const targetId = activeSceneGroup?.id ?? current[0]?.id;
                      if (sceneGroup.id !== targetId || sceneGroup.prompt === prompt) {
                        return sceneGroup;
                      }
                      return { ...sceneGroup, prompt };
                    })
                  );
                }}
                onSceneReferencesChange={setSceneGroupReferences}
                onToggleFrame={(frameId) => {
                  setSceneFrames((current) =>
                    current.map((frame) =>
                      frame.id === frameId ? { ...frame, isCollapsed: !frame.isCollapsed } : frame
                    )
                  );
                }}
                onRenameFrame={handleRenameSceneFrame}
                onDeleteFrame={handleDeleteSceneFrame}
                onUpdateFramePrompt={(frameId, prompt) => {
                  setSceneFrames((current) =>
                    current.map((frame) =>
                      frame.id === frameId && frame.prompt !== prompt ? { ...frame, prompt } : frame
                    )
                  );
                }}
                onUpdateFrameReferences={(frameId, references) => {
                  setSceneFrames((current) =>
                    current.map((frame) => (frame.id === frameId ? { ...frame, references } : frame))
                  );
                }}
                onToggleRenameFrame={(frameId) => {
                  setSceneFrames((current) =>
                    current.map((frame) =>
                      frame.id === frameId ? { ...frame, isRenaming: !frame.isRenaming } : frame
                    )
                  );
                }}
                onAddFrame={() => {
                  void handleAddSceneFrame();
                }}
              />
            </div>
          </motion.div>
        ) : null}
        {isDirectorWorkspace ? (
          <motion.div
            key="director-sidebar"
            data-testid="director-sidebar-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={[
              'fixed bottom-0 right-0 top-0 z-20 overflow-hidden border-l border-[var(--border-soft)] bg-[var(--surface)] will-change-[width]',
              isScenesSidebarResizing
                ? ''
                : 'transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            ].join(' ')}
            style={{ width: scenesSidebarWidth, minWidth: MIN_SCENES_SIDEBAR_WIDTH }}
          >
            <button
              type="button"
              aria-label="Resize director sidebar"
              onPointerDown={startScenesSidebarResize}
              className="absolute bottom-0 left-0 top-0 z-30 w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
            />
            <div
              data-testid="director-sidebar"
              className="h-full w-full overflow-hidden bg-[var(--surface)]"
              data-open="true"
            >
              <DirectorChatsSidebar
                chats={activeDirectorChats}
                selectedChatId={activeDirectorChatId}
                isCreatingChat={isCreatingDirectorChat}
                onCreateChat={() => {
                  void handleCreateDirectorChat().catch((error) => {
                    console.error('Failed to create Director chat', error);
                    toast.error(getErrorMessage(error, 'Failed to create Director chat.'));
                  });
                }}
                onSelectChat={handleSelectDirectorChat}
                onRenameChat={(chatId, title) => {
                  void handleRenameDirectorChat(chatId, title).catch((error) => {
                    console.error('Failed to rename Director chat', error);
                    toast.error(getErrorMessage(error, 'Failed to rename Director chat.'));
                  });
                }}
                onDeleteChat={(chatId) => {
                  void handleDeleteDirectorChat(chatId).catch((error) => {
                    console.error('Failed to delete Director chat', error);
                    toast.error(getErrorMessage(error, 'Failed to delete Director chat.'));
                  });
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
      {isClassicWorkspace ? (
      <motion.div
        key="classic-composer"
        {...COMPOSER_SHELL_MOTION}
        data-testid="classic-composer"
        className="fixed inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-6 sm:pb-6"
      >
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
                className="absolute left-5 z-40 max-h-[min(320px,calc(100vh-220px))] w-[260px] overflow-y-auto overscroll-contain rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
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
            style={COMPOSER_GLASS_STYLE}
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
              ref={classicReferenceInputRef}
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
                ref={classicComposerRef}
                placeholder="Escreva algo..."
                isExpanded={isExpanded}
                hasReferenceImages={hasReferenceImages}
                mentionCandidates={referenceMentionCandidates}
                onTextChange={setPrompt}
                onMentionMatch={setPromptMentionMatch}
                onMentionIdsChange={setSelectedPromptReferenceIds}
                onCursorIndexChange={setCursorIndex}
                onScrollTopChange={handleScrollTop}
                onMentionNavigationKey={handleReferenceMentionNavigation}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  if (
                    isReferencePickerOpenRef.current ||
                    isModePickerOpen ||
                    isAspectRatioOpen ||
                    isModelPickerOpen ||
                    isAnglePanelOpen
                  ) {
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
              <div className="flex min-w-0 flex-1 items-center">
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
                    'flex min-w-0 items-center gap-2 overflow-hidden transition-[max-width,opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isExpanded ? 'max-w-full opacity-100 translate-y-0' : 'max-w-0 opacity-0 translate-y-1',
                  ].join(' ')}
                  aria-hidden={!isExpanded}
                >
                  <ModelPicker
                    isOpen={isModelPickerOpen}
                    selectedModel={selectedModel}
                    selectedProviderId={selectedProviderId}
                    onOpenChange={setIsModelPickerOpen}
                    onProviderChange={(providerId) => {
                      const fallbackModel =
                        providerId === 'codex'
                          ? getModelOptionById('codex-gpt-5-4-mini')
                          : getModelOptionById('antigravity-gemini-3-5-flash-low');
                      if (fallbackModel) {
                        setSelectedModelId(fallbackModel.id);
                      }
                    }}
                    onModelSelect={setSelectedModelId}
                    onKeepOpen={holdComposerOpen}
                  />

                  <Popover open={isAspectRatioOpen} onOpenChange={setIsAspectRatioOpen}>
                    <PopoverTrigger asChild>
                      <button
                        ref={aspectRatioButtonRef}
                        type="button"
                        tabIndex={isExpanded ? 0 : -1}
                        onMouseDown={holdComposerOpen}
                        className="pointer-events-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-3.5 text-[13px] font-medium text-[var(--foreground)] backdrop-blur-xl transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]"
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

                  <button
                    type="button"
                    tabIndex={isExpanded ? 0 : -1}
                    aria-label="Fast"
                    aria-pressed={effectiveFastMode}
                    disabled={selectedProviderId !== 'codex'}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      holdComposerOpen();
                    }}
                    onClick={() => setIsFastModeEnabled((current) => !current)}
                    className={[
                      'pointer-events-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium backdrop-blur-xl transition-[background-color,border-color,color] duration-200',
                      effectiveFastMode
                        ? 'border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.82))] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--accent)_58%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_24%,rgba(32,32,33,0.88))]'
                        : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:hover:border-[var(--border-soft)] disabled:hover:bg-[rgba(32,32,33,0.72)] disabled:hover:text-[var(--muted-foreground)]',
                    ].join(' ')}
                  >
                    <Zap className={['size-3.5 shrink-0', effectiveFastMode ? 'text-[var(--accent)]' : ''].join(' ')} />
                    Fast
                  </button>

                  <div
                    className={[
                      'pointer-events-auto inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] backdrop-blur-xl',
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

              <div className="flex shrink-0 items-center gap-2">
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
                  disabled={!hasPrompt}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      ) : null}
      {isDirectorWorkspace ? (
      <DirectorComposerBar
        inputId={inputId}
        prompt={prompt}
        isExpanded={isExpanded}
        hasReferenceImages={hasReferenceImages}
        referenceImages={referenceImages}
        referenceMentionOptions={referenceMentionOptions}
        referenceMentionCandidates={referenceMentionCandidates}
        activeReferenceMentionIndex={activeReferenceMentionIndex}
        popoverBottom={popoverBottom}
        isFocused={isFocused}
        isReferenceDragActive={isReferenceDragActive}
        isModelPickerOpen={isModelPickerOpen}
        selectedModel={selectedModel}
        selectedProviderId={selectedProviderId}
        effectiveFastMode={effectiveFastMode}
        isStreaming={Boolean(activeDirectorRun)}
        composerRef={directorComposerRef}
        referenceInputRef={directorReferenceInputRef}
        plusButtonRef={plusButtonRef}
        sendButtonRef={sendFxRef}
        onPromptChange={setPrompt}
        onMentionMatch={setPromptMentionMatch}
        onMentionIdsChange={setSelectedPromptReferenceIds}
        onCursorIndexChange={setCursorIndex}
        onScrollTopChange={handleScrollTop}
        onMentionNavigationKey={handleReferenceMentionNavigation}
        onComposerFocus={() => setIsFocused(true)}
        onComposerBlur={() => {
          if (isReferencePickerOpenRef.current || isModelPickerOpen) {
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
        onAddReference={openReferencePicker}
        onAppendReferenceImages={(files) => {
          void appendReferenceImages(files);
        }}
        onOpenReference={openAttachedImagePlayer}
        onRemoveReference={removeReferenceImage}
        onInsertReferenceMention={insertReferenceMention}
        onKeepOpen={holdComposerOpen}
        onOpenModelPicker={setIsModelPickerOpen}
        onProviderChange={(providerId) => {
          const fallbackModel =
            providerId === 'codex'
              ? getModelOptionById('codex-gpt-5-4-mini')
              : getModelOptionById('antigravity-gemini-3-5-flash-low');
          if (fallbackModel) {
            setSelectedModelId(fallbackModel.id);
          }
        }}
        onModelSelect={setSelectedModelId}
        onToggleFastMode={() => setIsFastModeEnabled((current) => !current)}
        onSubmit={() => {
          void handleSendDirectorPrompt().catch((error) => {
            console.error('Failed to send Director prompt', error);
            toast.error(getErrorMessage(error, 'Failed to send Director prompt.'));
          });
        }}
        onStop={() => {
          void handleCancelActiveDirectorChat().catch((error) => {
            console.error('Failed to stop Director chat', error);
            toast.error(getErrorMessage(error, 'Failed to stop Director chat.'));
          });
        }}
        onSurfaceInteract={focusComposerFromEvent}
        onReferenceDragEnter={(event) => {
          if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
          event.preventDefault();
          referenceDragDepthRef.current += 1;
          setIsReferenceDragActive(true);
          holdComposerOpen();
        }}
        onReferenceDragOver={(event) => {
          if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setIsReferenceDragActive(true);
        }}
        onReferenceDragLeave={(event) => {
          if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
          event.preventDefault();
          referenceDragDepthRef.current = Math.max(0, referenceDragDepthRef.current - 1);
          if (referenceDragDepthRef.current === 0) {
            setIsReferenceDragActive(false);
          }
        }}
        onReferenceDrop={(event) => {
          if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
          event.preventDefault();
          referenceDragDepthRef.current = 0;
          setIsReferenceDragActive(false);
          void appendReferenceImages(event.dataTransfer.files);
        }}
        onMentionOptionHover={setActiveReferenceMentionIndex}
        leftInset={isSidebarCollapsed ? 16 : 276}
        rightInset={scenesSidebarWidth + 40}
      />
      ) : null}
      </AnimatePresence>

      </main>
    </TooltipProvider>
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

const COMPOSER_GLASS_STYLE = {
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
} as const;

export const COMPOSER_SHELL_MOTION = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 22 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

function SceneGenerateButton({
  onClick,
  onStop,
  isGenerating,
}: {
  onClick: () => void;
  onStop: () => void;
  isGenerating: boolean;
}) {
  return (
    <motion.button
      layout
      type="button"
      aria-label={isGenerating ? 'Stop generation' : 'Generate frames'}
      onClick={isGenerating ? onStop : onClick}
      className={[
        'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-medium backdrop-blur-xl transition-[background-color,border-color,color] duration-250',
        isGenerating
          ? 'border-[color-mix(in_srgb,#cf5c5c_55%,transparent)] bg-[rgba(51,24,24,0.72)] text-[rgb(244,208,208)] hover:bg-[rgba(66,28,28,0.84)]'
          : 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.82))] text-white hover:bg-[color-mix(in_srgb,var(--accent)_28%,rgba(32,32,33,0.88))]',
      ].join(' ')}
    >
      <motion.span
        key={isGenerating ? 'stop' : 'generate'}
        initial={{ opacity: 0, y: 4, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -4, filter: 'blur(6px)' }}
        transition={{ duration: 0.18 }}
        className="inline-flex items-center gap-2"
      >
        {isGenerating ? <X className="size-3.5" /> : null}
        <span>{isGenerating ? 'Stop' : 'Generate frames'}</span>
      </motion.span>
    </motion.button>
  );
}

function GenerationWorkspaceTabs({
  selectedMode,
  onSelectMode,
}: {
  selectedMode: GenerationWorkspaceMode;
  onSelectMode: (mode: GenerationWorkspaceMode) => void;
}) {
  const options: Array<{ value: GenerationWorkspaceMode; label: string }> = [
    { value: 'classic', label: 'Classic' },
    { value: 'scenes', label: 'Scenes' },
    { value: 'director', label: 'Director' },
  ];
  const activeIndex = options.findIndex((option) => option.value === selectedMode);

  return (
    <div className="relative inline-grid h-12 grid-cols-3 items-center rounded-full bg-[rgba(15,16,16,0.88)] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: `${Math.max(0, activeIndex) * 100}%` }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-1 left-1 top-1 w-[calc(33.333%_-_5px)] rounded-full bg-[var(--border-soft)]"
      />
      {options.map((option) => {
        const isSelected = option.value === selectedMode;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isSelected}
            onClick={() => onSelectMode(option.value)}
            className={[
              'relative z-10 inline-flex h-10 min-w-[84px] items-center justify-center rounded-full px-5 text-[13px] font-medium tracking-[0] transition-colors duration-200',
              isSelected
                ? 'text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ScenesWorkspace({
  sceneGroups,
  activeSceneGroupId,
  frameCards,
  onSelectSceneGroup,
  onRenameSceneGroup,
  onReorderSceneGroups,
  onDeleteSceneGroup,
  onOpenImage,
}: {
  sceneGroups: SceneGroupUi[];
  activeSceneGroupId: string | null;
  frameCards: SceneWorkspaceFrameCard[];
  onSelectSceneGroup: (sceneGroupId: string) => void;
  onRenameSceneGroup: (sceneGroupId: string, title: string) => void;
  onReorderSceneGroups: (draggedSceneGroupId: string, targetSceneGroupId: string) => void;
  onDeleteSceneGroup: (sceneGroupId: string) => void;
  onOpenImage: (image: GeneratedImageRecord) => void;
}) {
  if (frameCards.length > 0) {
    return (
      <motion.div
        data-testid="scenes-workspace"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-[calc(100vh-60px)] w-full px-8 pb-10 pt-8"
      >
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
          <SceneWorkspaceRail
            sceneGroups={sceneGroups}
            activeSceneGroupId={activeSceneGroupId}
            onSelectSceneGroup={onSelectSceneGroup}
            onRenameSceneGroup={onRenameSceneGroup}
            onReorderSceneGroups={onReorderSceneGroups}
            onDeleteSceneGroup={onDeleteSceneGroup}
          />
          {frameCards.map((card) => (
            <div
              key={card.frameId}
              className="overflow-hidden rounded-[26px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.82)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
                <div>
                  <div className="text-[14px] font-medium text-[var(--foreground)]">{card.frameTitle}</div>
                  <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                    {card.isGenerating ? 'Generating frame output...' : `${card.images.filter((image) => !image.isLoading).length} output${card.images.filter((image) => !image.isLoading).length === 1 ? '' : 's'}`}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-3 py-1 text-[11px] text-[var(--muted-foreground)]">
                  {card.isGenerating ? 'Loading' : `${card.images.filter((image) => !image.isLoading).length} output${card.images.filter((image) => !image.isLoading).length === 1 ? '' : 's'}`}
                </div>
              </div>
              <div className="p-5">
                <GeneratedImageGrid
                  images={card.images}
                  className="w-full"
                  columnCount={card.images.length > 1 ? 2 : 1}
                  cardHeight={card.images.length > 1 ? 280 : 360}
                  rowGap={16}
                  fitHeight
                  onImageOpen={(image) => onOpenImage(image as GeneratedImageRecord)}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid="scenes-workspace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-[calc(100vh-60px)] w-full px-8 pb-10 pt-8"
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
        <SceneWorkspaceRail
          sceneGroups={sceneGroups}
          activeSceneGroupId={activeSceneGroupId}
          onSelectSceneGroup={onSelectSceneGroup}
          onRenameSceneGroup={onRenameSceneGroup}
          onReorderSceneGroups={onReorderSceneGroups}
          onDeleteSceneGroup={onDeleteSceneGroup}
        />
        <div className="flex min-h-[360px] items-center justify-center rounded-[26px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.62)]">
          <h2 className="m-0 text-[24px] font-medium leading-none tracking-[0] text-[var(--foreground)]">
            No scenes generated yet
          </h2>
        </div>
      </div>
    </motion.div>
  );
}

function SceneWorkspaceRail({
  sceneGroups,
  activeSceneGroupId,
  onSelectSceneGroup,
  onRenameSceneGroup,
  onReorderSceneGroups,
  onDeleteSceneGroup,
}: {
  sceneGroups: SceneGroupUi[];
  activeSceneGroupId: string | null;
  onSelectSceneGroup: (sceneGroupId: string) => void;
  onRenameSceneGroup: (sceneGroupId: string, title: string) => void;
  onReorderSceneGroups: (draggedSceneGroupId: string, targetSceneGroupId: string) => void;
  onDeleteSceneGroup: (sceneGroupId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedSceneGroupId, setDraggedSceneGroupId] = useState<string | null>(null);
  const [renamingSceneGroupId, setRenamingSceneGroupId] = useState<string | null>(null);
  const [sceneTitleDraft, setSceneTitleDraft] = useState('');
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleSceneGroups = normalizedSearchQuery
    ? sceneGroups.filter((sceneGroup) => sceneGroup.title.toLowerCase().includes(normalizedSearchQuery))
    : sceneGroups;
  const visibleSceneGroupIds = visibleSceneGroups.map((sceneGroup) => sceneGroup.id);

  const startRenamingScene = (sceneGroup: SceneGroupUi) => {
    setRenamingSceneGroupId(sceneGroup.id);
    setSceneTitleDraft(sceneGroup.title);
  };

  const commitSceneRename = () => {
    if (!renamingSceneGroupId) {
      return;
    }
    const nextTitle = sceneTitleDraft.trim();
    const sceneGroup = sceneGroups.find((entry) => entry.id === renamingSceneGroupId);
    setRenamingSceneGroupId(null);
    if (!sceneGroup || !nextTitle || sceneGroup.title === nextTitle) {
      return;
    }
    onRenameSceneGroup(sceneGroup.id, nextTitle);
  };

  const handleSortableDragStart = (event: DragStartEvent) => {
    setDraggedSceneGroupId(String(event.active.id));
  };

  const handleSortableDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    setDraggedSceneGroupId(null);
    if (!overId || activeId === overId) {
      return;
    }
    onReorderSceneGroups(activeId, overId);
  };

  return (
    <div
      data-testid="scene-workspace-rail"
      className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.82)] px-5 py-4 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="search"
            aria-label="Search scenes"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search scenes"
            className="h-10 w-full rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] pl-9 pr-4 text-[13px] font-medium text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_58%,transparent)]"
          />
        </div>
        <div className="rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-3 py-1 text-[12px] font-medium text-[var(--muted-foreground)]">
          <NumberFlow value={sceneGroups.length} />
          <span className="ml-1">scene{sceneGroups.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="mt-4 flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1">
        {visibleSceneGroups.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleSortableDragStart}
            onDragEnd={handleSortableDragEnd}
            onDragCancel={() => setDraggedSceneGroupId(null)}
          >
            <SortableContext items={visibleSceneGroupIds} strategy={verticalListSortingStrategy}>
              {visibleSceneGroups.map((sceneGroup) => (
                <SortableSceneRailItem
                  key={sceneGroup.id}
                  sceneGroup={sceneGroup}
                  isActive={sceneGroup.id === activeSceneGroupId}
                  isDragging={draggedSceneGroupId === sceneGroup.id}
                  isRenaming={renamingSceneGroupId === sceneGroup.id}
                  sceneTitleDraft={sceneTitleDraft}
                  onSceneTitleDraftChange={setSceneTitleDraft}
                  onCommitSceneRename={commitSceneRename}
                  onCancelSceneRename={() => setRenamingSceneGroupId(null)}
                  onSelectSceneGroup={onSelectSceneGroup}
                  onStartRenamingScene={startRenamingScene}
                  onDeleteSceneGroup={onDeleteSceneGroup}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--border-soft)] px-4 py-5 text-center text-[13px] text-[var(--muted-foreground)]">
            No scenes match this search.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableSceneRailItem({
  sceneGroup,
  isActive,
  isDragging,
  isRenaming,
  sceneTitleDraft,
  onSceneTitleDraftChange,
  onCommitSceneRename,
  onCancelSceneRename,
  onSelectSceneGroup,
  onStartRenamingScene,
  onDeleteSceneGroup,
}: {
  sceneGroup: SceneGroupUi;
  isActive: boolean;
  isDragging: boolean;
  isRenaming: boolean;
  sceneTitleDraft: string;
  onSceneTitleDraftChange: (title: string) => void;
  onCommitSceneRename: () => void;
  onCancelSceneRename: () => void;
  onSelectSceneGroup: (sceneGroupId: string) => void;
  onStartRenamingScene: (sceneGroup: SceneGroupUi) => void;
  onDeleteSceneGroup: (sceneGroupId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: sceneGroup.id, disabled: isRenaming });
  const itemStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isSortableDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      data-testid={`scene-rail-item-${sceneGroup.id}`}
      data-dragging={isDragging || isSortableDragging}
      className={[
        'group flex min-h-12 items-center gap-2 rounded-[18px] border px-2.5 py-2 transition-[background-color,border-color,box-shadow,opacity]',
        isDragging || isSortableDragging
          ? 'border-[color-mix(in_srgb,var(--accent)_68%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.76))] opacity-80 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_26%,transparent)]'
          : isActive
            ? 'border-[var(--border-soft)] bg-[var(--surface2)]'
            : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.52)] hover:bg-[rgba(39,39,40,0.72)]',
      ].join(' ')}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag scene ${sceneGroup.title}`}
        className={[
          'inline-flex size-8 shrink-0 touch-none items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]',
          isDragging || isSortableDragging ? 'cursor-grabbing text-[var(--foreground)]' : 'cursor-grab',
        ].join(' ')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {isRenaming ? (
        <input
          value={sceneTitleDraft}
          aria-label={`Rename ${sceneGroup.title}`}
          autoFocus
          onChange={(event) => onSceneTitleDraftChange(event.target.value)}
          onBlur={onCommitSceneRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onCommitSceneRename();
            }
            if (event.key === 'Escape') {
              onCancelSceneRename();
            }
          }}
          className="h-9 min-w-0 flex-1 rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.68)] px-3 text-[13px] font-medium text-[var(--foreground)] outline-none"
        />
      ) : (
        <button
          type="button"
          aria-pressed={isActive}
          onClick={() => onSelectSceneGroup(sceneGroup.id)}
          className="h-9 min-w-0 flex-1 truncate rounded-full px-2 text-left text-[13px] font-medium text-[var(--foreground)]"
        >
          {sceneGroup.title}
        </button>
      )}
      <button
        type="button"
        aria-label={`Rename scene ${sceneGroup.title}`}
        onClick={() => onStartRenamingScene(sceneGroup)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Delete scene ${sceneGroup.title}`}
        onClick={() => onDeleteSceneGroup(sceneGroup.id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[rgba(122,44,44,0.26)] hover:text-[rgb(244,208,208)]"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function DirectorWorkspace({
  chatId,
  messages,
  onApproveDirectorAction,
  onDeclineDirectorAction,
}: {
  chatId: string | null;
  messages: DirectorMessageRecord[];
  onApproveDirectorAction: (messageId: string, actionIndex: number) => void;
  onDeclineDirectorAction: (messageId: string, actionIndex: number) => void;
}) {
  return (
    <div data-testid="director-workspace" className="h-[calc(100vh-60px)] w-full overflow-hidden">
      <div className="mx-auto h-full w-full max-w-[1400px]">
        <div className="h-full min-w-0">
          <DirectorMessageList
            chatId={chatId}
            messages={messages}
            onApproveDirectorAction={onApproveDirectorAction}
            onDeclineDirectorAction={onDeclineDirectorAction}
          />
        </div>
      </div>
    </div>
  );
}

function DirectorChatsSidebar({
  chats,
  selectedChatId,
  isCreatingChat,
  onCreateChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}: {
  chats: DirectorChatUi[];
  selectedChatId: string | null;
  isCreatingChat: boolean;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-[var(--border-soft)] px-5">
        <div className="text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">Chats</div>
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-full px-3"
          disabled={isCreatingChat}
          onClick={onCreateChat}
        >
          {isCreatingChat ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          New
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {chats.length > 0 ? (
          <div className="space-y-1">
            {chats.map((chat) => {
              return (
                <DirectorChatThreadRow
                  key={chat.id}
                  chat={chat}
                  isSelected={chat.id === selectedChatId}
                  onClick={onSelectChat}
                  onRename={onRenameChat}
                  onDelete={onDeleteChat}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-[220px] text-center">
              <div className="text-[15px] font-medium text-[var(--foreground)]">No chats yet</div>
              <div className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                Start a Director chat to plan shots, continuity, and scene coverage.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DirectorChatThreadRow({
  chat,
  isSelected,
  onClick,
  onRename,
  onDelete,
}: {
  chat: DirectorChatUi;
  isSelected: boolean;
  onClick: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chatId: string) => void;
}) {
  const handleRename = () => {
    const nextTitle = window.prompt('Rename chat', chat.title);
    if (nextTitle && nextTitle.trim()) {
      onRename(chat.id, nextTitle);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative">
          <button
            type="button"
            onClick={() => onClick(chat.id)}
            className={[
              'flex h-[40px] w-full items-center justify-between rounded-[10px] px-2 text-left transition-colors',
              isSelected ? 'bg-[var(--surface2)]' : 'hover:bg-white/4',
            ].join(' ')}
          >
            <span className="flex min-w-0 items-center gap-2 pr-16">
              {chat.isStreaming ? (
                <span className="inline-flex w-3 shrink-0 items-center justify-center">
                  <span className="size-2 rounded-full bg-[var(--accent)]" />
                </span>
              ) : (
                <span className="inline-flex w-3 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate text-[13px] text-[var(--foreground)]/88">{chat.title}</span>
            </span>
            <span className="ml-3 shrink-0 text-[12px] text-[var(--muted-foreground)] transition-opacity duration-150 group-hover:opacity-0">
              {chat.isStreaming ? (
                <Shimmer className="text-[12px]" duration={1.6}>
                  Thinking...
                </Shimmer>
              ) : (
                formatRelativeTime(chat.updatedAt)
              )}
            </span>
          </button>

          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Rename ${chat.title}`}
              onClick={(event) => {
                event.stopPropagation();
                handleRename();
              }}
              className="pointer-events-auto inline-flex size-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${chat.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(chat.id);
              }}
              className="pointer-events-auto inline-flex size-7 items-center justify-center rounded-full text-[rgb(245,178,178)] transition-colors hover:bg-[rgba(190,58,58,0.18)]"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRename}>Rename chat</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
          onClick={() => onDelete(chat.id)}
        >
          Delete chat
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DirectorMessageRow({
  message,
  onApproveDirectorAction,
  onDeclineDirectorAction,
}: {
  message: DirectorMessageRecord;
  onApproveDirectorAction: (messageId: string, actionIndex: number) => void;
  onDeclineDirectorAction: (messageId: string, actionIndex: number) => void;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreamingAssistant = isAssistant && message.status === 'streaming';
  const hasAssistantContent = message.contentMarkdown.trim().length > 0;
  const isThinking = isStreamingAssistant && !hasAssistantContent;
  const isCompleteAssistant = isAssistant && message.status === 'completed' && message.contentMarkdown.trim().length > 0;
  const durationLabel = isCompleteAssistant ? formatDurationBetween(message.createdAt, message.updatedAt) : null;
  const renderedBlocks = useMemo(
    () => (isAssistant ? parseDirectorRenderedBlocks(message.contentMarkdown) : []),
    [isAssistant, message.contentMarkdown]
  );
  const statusByActionIndex = useMemo(() => {
    const nextStatusByActionIndex = new Map<number, Record<string, unknown>>();
    for (const block of renderedBlocks) {
      if (block.type !== 'status' || !block.data) {
        continue;
      }
      const actionIndex = Number(block.data.actionIndex);
      if (Number.isInteger(actionIndex)) {
        nextStatusByActionIndex.set(actionIndex, block.data);
      }
    }
    return nextStatusByActionIndex;
  }, [renderedBlocks]);
  let actionBlockIndex = -1;

  async function copyMessage() {
    if (!message.contentMarkdown.trim()) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(message.contentMarkdown);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 1400);
    } catch (error) {
      console.error('Failed to copy Director response', error);
      toast.error('Failed to copy response');
    }
  }

  return (
    <div className="px-6 py-3">
      <Message
        from={isUser ? 'user' : 'assistant'}
        className={[
          isUser ? 'ml-auto max-w-[min(680px,78%)] items-end' : 'max-w-[min(900px,100%)] items-start py-3',
        ].join(' ')}
      >
        <MessageContent
          data-testid="director-message-content"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          className={
            isUser
              ? 'select-text whitespace-pre-wrap rounded-full bg-[var(--foreground)] px-4 py-2.5 text-[14px] leading-5 text-[var(--background)] shadow-[0_12px_30px_rgba(0,0,0,0.24)]'
              : 'w-full select-text overflow-visible text-[14px] leading-6 text-[var(--foreground)]'
          }
        >
          {isThinking ? (
            <Shimmer className="text-[14px] leading-6" duration={1.6}>
              Thinking...
            </Shimmer>
          ) : isUser ? (
            message.contentMarkdown
          ) : (
            <div className="space-y-3">
              {renderedBlocks.map((block, blockIndex) => {
                if (block.type === 'action') {
                  actionBlockIndex += 1;
                  const actionIndex = actionBlockIndex;
                  return (
                    <DirectorActionBlock
                      key={`${message.id}-action-${blockIndex}`}
                      messageId={message.id}
                      actionIndex={actionIndex}
                      data={block.data}
                      status={statusByActionIndex.get(actionIndex) ?? null}
                      onApprove={onApproveDirectorAction}
                      onDecline={onDeclineDirectorAction}
                    />
                  );
                }
                if (block.type === 'status') {
                  const actionIndex = Number(block.data?.actionIndex);
                  if (Number.isInteger(actionIndex)) {
                    return null;
                  }
                  return <DirectorStatusBlock key={`${message.id}-status-${blockIndex}`} data={block.data} />;
                }
                return (
                  <MessageResponse
                    key={`${message.id}-markdown-${blockIndex}`}
                    isAnimating={message.status === 'streaming'}
                    className="director-markdown text-[14px] leading-6 text-[var(--foreground)] [&_*]:tracking-[0] [&_a]:text-[var(--accent)] [&_a]:underline-offset-4 [&_code]:rounded-[6px] [&_code]:bg-white/8 [&_code]:px-1 [&_code]:py-0.5 [&_li]:my-1 [&_ol]:my-3 [&_p]:my-0 [&_p+p]:mt-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-[14px] [&_pre]:border [&_pre]:border-[var(--border-soft)] [&_pre]:bg-[rgba(15,16,16,0.72)] [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-3"
                  >
                  {block.content}
                </MessageResponse>
              );
              })}
              {isStreamingAssistant && hasAssistantContent ? (
                <Shimmer className="text-[14px] leading-6 text-[var(--muted-foreground)]" duration={1.6}>
                  Thinking...
                </Shimmer>
              ) : null}
            </div>
          )}
          {message.status === 'failed' ? (
            <div className="mt-3 text-[12px] text-[rgb(245,178,178)]">This response ended with an error.</div>
          ) : null}
        </MessageContent>
        {isCompleteAssistant ? (
          <MessageToolbar className="mt-2 justify-start text-[12px] text-[var(--muted-foreground)]">
            <div className="flex min-w-0 items-center gap-2">
              {durationLabel ? <span>{durationLabel}</span> : null}
              {message.modelLabel ? (
                <>
                  <span className="text-[var(--border-soft)]">/</span>
                  <span className="truncate">{message.modelLabel}</span>
                </>
              ) : null}
            </div>
            <MessageActions>
              <button
                type="button"
                aria-label="Copy Director response"
                onClick={() => {
                  void copyMessage();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] px-3 text-[12px] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface2)] hover:text-[var(--foreground)]"
              >
                {hasCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {hasCopied ? 'Copied' : 'Copy'}
              </button>
            </MessageActions>
          </MessageToolbar>
        ) : null}
      </Message>
    </div>
  );
}

interface DirectorMessageVirtualRowProps {
  messages: DirectorMessageRecord[];
  onApproveDirectorAction: (messageId: string, actionIndex: number) => void;
  onDeclineDirectorAction: (messageId: string, actionIndex: number) => void;
}

function DirectorMessageVirtualRow({
  ariaAttributes,
  index,
  style,
  messages,
  onApproveDirectorAction,
  onDeclineDirectorAction,
}: RowComponentProps<DirectorMessageVirtualRowProps>) {
  const message = messages[index];

  if (!message) {
    return null;
  }

  return (
    <div
      {...ariaAttributes}
      className={[index === 0 ? 'pt-8' : '', index === messages.length - 1 ? 'pb-[320px]' : ''].join(' ')}
      style={style as CSSProperties}
    >
      <DirectorMessageRow
        message={message}
        onApproveDirectorAction={onApproveDirectorAction}
        onDeclineDirectorAction={onDeclineDirectorAction}
      />
    </div>
  );
}

function DirectorActionBlock({
  messageId,
  actionIndex,
  data,
  status,
  onApprove,
  onDecline,
}: {
  messageId: string;
  actionIndex: number;
  data: Record<string, unknown> | null;
  status: Record<string, unknown> | null;
  onApprove: (messageId: string, actionIndex: number) => void;
  onDecline: (messageId: string, actionIndex: number) => void;
}) {
  const action = getDirectorBlockText(data, 'action', 'unknown');
  const summary = getDirectorBlockText(data, 'summary', 'Director prepared an app action.');
  const statusValue = getDirectorBlockText(status, 'status', 'pending');
  const payload = data?.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
    ? data.payload as Record<string, unknown>
    : null;
  const progress = status?.progress && typeof status.progress === 'object' && !Array.isArray(status.progress)
    ? status.progress as Record<string, unknown>
    : null;
  const generatedProgress = typeof progress?.generated === 'number' ? progress.generated : 0;
  const totalProgress =
    typeof progress?.total === 'number'
      ? progress.total
      : action === 'create_scene' && Array.isArray(payload?.frames)
        ? payload.frames.length
        : typeof payload?.count === 'number'
          ? payload.count
          : 0;
  const sceneTitle = typeof payload?.title === 'string' ? payload.title : '';
  const scenePrompt = typeof payload?.scenePrompt === 'string' ? payload.scenePrompt : '';
  const frames = Array.isArray(payload?.frames)
    ? payload.frames.filter((frame): frame is Record<string, unknown> => Boolean(frame) && typeof frame === 'object' && !Array.isArray(frame))
    : [];
  const targetLabel = action === 'create_scene' ? 'Scenes' : action === 'generate_classic' ? 'Classic' : 'Action';
  const isPending = statusValue === 'pending';
  const isRunning = statusValue === 'running';
  const statusLabel = statusValue === 'failed' ? 'failed' : statusValue === 'declined' ? 'declined' : 'needs approval';
  const statusTitle = status ? getDirectorBlockText(status, 'title') : '';
  const statusDetail = status ? getDirectorBlockText(status, 'detail') : '';
  const count =
    action === 'create_scene' && Array.isArray(payload?.frames)
      ? `${payload.frames.length} frame${payload.frames.length === 1 ? '' : 's'}`
      : typeof payload?.count === 'number'
        ? `${payload.count} image${payload.count === 1 ? '' : 's'}`
        : null;

  return (
    <div className="rounded-[16px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--muted-foreground)]">
            <WandSparkles className="size-3.5 text-[var(--accent)]" />
            Director action · {targetLabel}
          </div>
          <div className="mt-2 text-[14px] font-medium leading-5 text-[var(--foreground)]">{summary}</div>
          {count ? <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">{count}</div> : null}
          {statusTitle ? <div className="mt-2 text-[12px] font-medium text-[var(--foreground)]">{statusTitle}</div> : null}
          {statusDetail ? <div className="mt-1 text-[12px] leading-5 text-[var(--muted-foreground)]">{statusDetail}</div> : null}
        </div>
        <div
          data-testid="director-action-status"
          className="shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] px-3 py-1 text-[12px] text-[var(--foreground)]"
        >
          {isRunning || statusValue === 'succeeded' ? (
            <span className="inline-flex items-center gap-1 [font-variant-numeric:tabular-nums]">
              <span>{isRunning ? 'Gerando' : 'Gerado'}</span>
              {' '}
              <NumberFlow value={Math.max(0, generatedProgress)} className="inline-block" />
              {' '}
              <span className="text-[var(--muted-foreground)]">/ {Math.max(0, totalProgress)}</span>
            </span>
          ) : (
            statusLabel
          )}
        </div>
      </div>
      {action === 'create_scene' && payload ? (
        <div className="mt-4 space-y-3 rounded-[14px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.36)] p-3">
          {sceneTitle ? (
            <div>
              <div className="text-[12px] text-[var(--muted-foreground)]">Scene</div>
              <div className="mt-1 text-[13px] font-medium leading-5 text-[var(--foreground)]">{sceneTitle}</div>
            </div>
          ) : null}
          {scenePrompt ? (
            <div>
              <div className="text-[12px] text-[var(--muted-foreground)]">Continuity brief</div>
              <div className="mt-1 text-[13px] leading-5 text-[var(--foreground)]">{scenePrompt}</div>
            </div>
          ) : null}
          {frames.length > 0 ? (
            <div className="space-y-2">
              {frames.map((frame, frameIndex) => {
                const title = typeof frame.title === 'string' && frame.title.trim() ? frame.title.trim() : `Frame ${frameIndex + 1}`;
                const prompt = typeof frame.prompt === 'string' ? frame.prompt.trim() : '';
                const references = Array.isArray(frame.references)
                  ? frame.references.filter((reference): reference is string => typeof reference === 'string' && reference.trim().length > 0)
                  : [];
                return (
                  <details
                    key={`${title}-${frameIndex}`}
                    className="group rounded-[12px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.46)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[13px] font-medium text-[var(--foreground)] marker:hidden">
                      <span className="truncate">{title}</span>
                      <ChevronDown className="size-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-[var(--border-soft)] px-3 py-2 text-[12px] leading-5 text-[var(--muted-foreground)]">
                      {prompt ? <div className="text-[var(--foreground)]">{prompt}</div> : null}
                      {references.length > 0 ? (
                        <div className="mt-2">References: {references.join(', ')}</div>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {isPending ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onApprove(messageId, actionIndex)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,rgba(32,32,33,0.82))] px-4 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--accent)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_28%,rgba(32,32,33,0.88))]"
          >
            <Check className="size-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecline(messageId, actionIndex)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-4 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)]"
          >
            <X className="size-3.5" />
            Decline
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DirectorStatusBlock({ data }: { data: Record<string, unknown> | null }) {
  const status = getDirectorBlockText(data, 'status', 'running');
  const title = getDirectorBlockText(data, 'title', 'Director orchestration');
  const detail = getDirectorBlockText(data, 'detail');
  const isRunning = status === 'running';
  const isSucceeded = status === 'succeeded';
  const isDeclined = status === 'declined';
  const Icon = isRunning ? LoaderCircle : isSucceeded ? Check : isDeclined ? X : X;

  return (
    <div
      className={[
        'rounded-[16px] border p-4 backdrop-blur-xl',
        isSucceeded
          ? 'border-[rgba(90,180,125,0.32)] bg-[rgba(28,80,48,0.16)]'
          : status === 'failed'
            ? 'border-[rgba(190,58,58,0.38)] bg-[rgba(90,22,22,0.18)]'
            : isDeclined
              ? 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.32)]'
              : 'border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface2)] text-[var(--foreground)]">
          <Icon className={['size-4', isRunning ? 'animate-spin text-[var(--accent)]' : ''].join(' ')} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-medium leading-5 text-[var(--foreground)]">{title}</span>
          {detail ? <span className="mt-1 block text-[12px] leading-5 text-[var(--muted-foreground)]">{detail}</span> : null}
        </span>
      </div>
    </div>
  );
}

function DirectorMessageList({
  chatId,
  messages,
  onApproveDirectorAction,
  onDeclineDirectorAction,
}: {
  chatId: string | null;
  messages: DirectorMessageRecord[];
  onApproveDirectorAction: (messageId: string, actionIndex: number) => void;
  onDeclineDirectorAction: (messageId: string, actionIndex: number) => void;
}) {
  const listRef = useListRef(null);
  const isPinnedToBottomRef = useRef(true);
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 180,
    key: chatId ?? 'director-empty-chat',
  });
  const lastMessage = messages[messages.length - 1] ?? null;
  const contentSignature = lastMessage
    ? `${messages.length}:${lastMessage.id}:${lastMessage.contentMarkdown.length}:${lastMessage.status}`
    : '0';
  const rowProps = useMemo(
    () => ({
      messages,
      onApproveDirectorAction,
      onDeclineDirectorAction,
    }),
    [messages, onApproveDirectorAction, onDeclineDirectorAction]
  );

  const handleScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    isPinnedToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
  }, []);

  useLayoutEffect(() => {
    if (messages.length === 0) {
      return;
    }
    if (!isPinnedToBottomRef.current) {
      return;
    }
    listRef.current?.scrollToRow({
      align: 'end',
      behavior: 'instant',
      index: messages.length - 1,
    });
  }, [contentSignature, messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 pb-[260px] pt-8">
        <div className="max-w-[420px] text-center">
          <div className="text-[18px] font-medium text-[var(--foreground)]">Start directing this thread</div>
          <div className="mt-3 text-[14px] leading-6 text-[var(--muted-foreground)]">
            Use the Director harness to write shots, ask for coverage options, and keep continuity grounded in your references.
          </div>
        </div>
      </div>
    );
  }

  return (
    <List<DirectorMessageVirtualRowProps>
      listRef={listRef}
      rowComponent={DirectorMessageVirtualRow}
      rowCount={messages.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      overscanCount={4}
      defaultHeight={720}
      className="h-full overscroll-contain"
      onScroll={handleScroll}
      style={{ height: '100%' }}
    />
  );
}

function ScenesSidebar({
  scenePrompt,
  sceneReferences,
  frames,
  savedReferences,
  onGenerateFrames,
  onGenerateFrame,
  onStopGeneration,
  isGenerating,
  generatingFrameIds,
  isStructuringFromClipboard,
  isFastModeEnabled,
  onStructureFromClipboard,
  onToggleFastMode,
  onScenePromptChange,
  onSceneReferencesChange,
  onToggleFrame,
  onRenameFrame,
  onDeleteFrame,
  onUpdateFramePrompt,
  onUpdateFrameReferences,
  onToggleRenameFrame,
  onAddFrame,
}: {
  scenePrompt: string;
  sceneReferences: SceneReferenceAttachment[];
  frames: SceneFrame[];
  savedReferences: SavedReferenceImage[];
  onGenerateFrames: () => void;
  onGenerateFrame: (frameId: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  generatingFrameIds: string[];
  isStructuringFromClipboard: boolean;
  isFastModeEnabled: boolean;
  onStructureFromClipboard: () => void;
  onToggleFastMode: () => void;
  onScenePromptChange: (prompt: string) => void;
  onSceneReferencesChange: (references: SceneReferenceAttachment[]) => void;
  onToggleFrame: (frameId: string) => void;
  onRenameFrame: (frameId: string, title: string) => void;
  onDeleteFrame: (frameId: string) => void;
  onUpdateFramePrompt: (frameId: string, prompt: string) => void;
  onUpdateFrameReferences: (frameId: string, references: SceneReferenceAttachment[]) => void;
  onToggleRenameFrame: (frameId: string) => void;
  onAddFrame: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-[var(--border-soft)] px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">Scenes</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Structure scene from clipboard"
            aria-busy={isStructuringFromClipboard}
            onClick={onStructureFromClipboard}
            disabled={isStructuringFromClipboard || isGenerating}
            className={[
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl transition-[background-color,border-color,color] duration-200',
              isStructuringFromClipboard
                ? 'border-[var(--border-soft)] bg-[rgba(39,39,40,0.86)] text-[var(--foreground)]'
                : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)]',
            ].join(' ')}
          >
            {isStructuringFromClipboard ? (
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-[var(--accent)]" />
            ) : (
              <WandSparkles className="size-3.5 shrink-0" />
            )}
          </button>
          <button
            type="button"
            aria-label="Fast"
            aria-pressed={isFastModeEnabled}
            onClick={onToggleFastMode}
            className={[
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium backdrop-blur-xl transition-[background-color,border-color,color] duration-200',
              isFastModeEnabled
                ? 'border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.82))] text-[var(--foreground)] hover:border-[color-mix(in_srgb,var(--accent)_58%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_24%,rgba(32,32,33,0.88))]'
                : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)]',
            ].join(' ')}
          >
            <Zap className={['size-3.5 shrink-0', isFastModeEnabled ? 'text-[var(--accent)]' : ''].join(' ')} />
            Fast
          </button>
          <SceneGenerateButton onClick={onGenerateFrames} onStop={onStopGeneration} isGenerating={isGenerating} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SceneInputCard
          testId="scene-description"
          label="Scene Description"
          placeholder="Describe the overall scene, continuity, mood, and shared references"
          savedReferences={savedReferences}
          initialPrompt={scenePrompt}
          initialReferences={sceneReferences}
          onPromptChange={onScenePromptChange}
          onReferencesChange={onSceneReferencesChange}
          baseHeight={252}
          topPaddingClassName="pt-4"
          labelClassName="text-[14px] font-medium text-[var(--foreground)]"
        />
        {frames.map((frame, index) => (
          <SceneFrameAccordion
            key={frame.id}
            frame={frame}
            index={index}
            isLast={index === frames.length - 1}
            savedReferences={savedReferences}
            onRename={(title) => onRenameFrame(frame.id, title)}
            onDelete={() => onDeleteFrame(frame.id)}
            onToggleRename={() => onToggleRenameFrame(frame.id)}
            onPromptChange={(prompt) => onUpdateFramePrompt(frame.id, prompt)}
            onReferencesChange={(references) => onUpdateFrameReferences(frame.id, references)}
            onGenerate={() => onGenerateFrame(frame.id)}
            isGenerating={generatingFrameIds.includes(frame.id)}
            isGenerationDisabled={isGenerating}
            onToggle={() => onToggleFrame(frame.id)}
          />
        ))}
        <div className="flex justify-end px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onAddFrame}
            className="h-9 rounded-full border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-transparent px-4 text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-[var(--accent)]"
          >
            <Plus className="size-4" />
            New frame
          </Button>
        </div>
      </div>

    </div>
  );
}

function DirectorComposerBar({
  inputId,
  prompt,
  isExpanded,
  hasReferenceImages,
  referenceImages,
  referenceMentionOptions,
  referenceMentionCandidates,
  activeReferenceMentionIndex,
  popoverBottom,
  isFocused,
  isReferenceDragActive,
  isModelPickerOpen,
  selectedModel,
  selectedProviderId,
  effectiveFastMode,
  isStreaming,
  composerRef,
  referenceInputRef,
  plusButtonRef,
  sendButtonRef,
  onPromptChange,
  onMentionMatch,
  onMentionIdsChange,
  onCursorIndexChange,
  onScrollTopChange,
  onMentionNavigationKey,
  onComposerFocus,
  onComposerBlur,
  onAddReference,
  onAppendReferenceImages,
  onOpenReference,
  onRemoveReference,
  onInsertReferenceMention,
  onKeepOpen,
  onOpenModelPicker,
  onProviderChange,
  onModelSelect,
  onToggleFastMode,
  onSubmit,
  onStop,
  onSurfaceInteract,
  onReferenceDragEnter,
  onReferenceDragOver,
  onReferenceDragLeave,
  onReferenceDrop,
  onMentionOptionHover,
  leftInset,
  rightInset,
}: {
  inputId: string;
  prompt: string;
  isExpanded: boolean;
  hasReferenceImages: boolean;
  referenceImages: ComposerReferenceImage[];
  referenceMentionOptions: Array<{
    id: string;
    title: string;
    description: string;
    previewUrl: string;
  }>;
  referenceMentionCandidates: Array<{ id: string; title: string }>;
  activeReferenceMentionIndex: number;
  popoverBottom: number;
  isFocused: boolean;
  isReferenceDragActive: boolean;
  isModelPickerOpen: boolean;
  selectedModel: ReturnType<typeof getDefaultModelOption>;
  selectedProviderId: 'codex' | 'antigravity';
  effectiveFastMode: boolean;
  isStreaming: boolean;
  composerRef: RefObject<PromptComposerHandle | null>;
  referenceInputRef: RefObject<HTMLInputElement | null>;
  plusButtonRef: RefObject<HTMLButtonElement | null>;
  sendButtonRef: RefObject<HTMLDivElement | null>;
  onPromptChange: (value: string) => void;
  onMentionMatch: (match: { query: string; start: number } | null) => void;
  onMentionIdsChange: (ids: string[]) => void;
  onCursorIndexChange: (index: number) => void;
  onScrollTopChange: (value: number) => void;
  onMentionNavigationKey: (key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape') => boolean;
  onComposerFocus: () => void;
  onComposerBlur: () => void;
  onAddReference: () => void;
  onAppendReferenceImages: (files: FileList | File[]) => void;
  onOpenReference: (referenceImage: ComposerReferenceImage) => void;
  onRemoveReference: (referenceId: string) => void;
  onInsertReferenceMention: (reference: { id: string; title: string }) => void;
  onKeepOpen: (event?: Event | SyntheticEvent | ReactMouseEvent<HTMLElement>) => void;
  onOpenModelPicker: (open: boolean) => void;
  onProviderChange: (providerId: 'codex' | 'antigravity') => void;
  onModelSelect: (modelId: string) => void;
  onToggleFastMode: () => void;
  onSubmit: () => void;
  onStop: () => void;
  onSurfaceInteract: (event: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>) => void;
  onReferenceDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  onReferenceDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onReferenceDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onReferenceDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onMentionOptionHover: (index: number) => void;
  leftInset: number;
  rightInset: number;
}) {
  const pointerMentionSelectionRef = useRef(false);

  return (
    <motion.div
      key="director-composer"
      {...COMPOSER_SHELL_MOTION}
      data-testid="director-composer"
      className="fixed bottom-0 z-10 pb-5 pl-4 pr-4 sm:pb-6 sm:pl-6 sm:pr-6"
      style={{ left: leftInset, right: rightInset }}
    >
      <div className="relative mx-auto w-full max-w-[920px]">
        <AnimatePresence initial={false}>
          {referenceMentionOptions.length > 0 ? (
            <motion.div
              key="director-reference-mention-popover"
              initial={{ opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="listbox"
              aria-label="Prompt references"
              className="absolute left-5 z-40 max-h-[min(320px,calc(100vh-220px))] w-[260px] overflow-y-auto overscroll-contain rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
              style={{ bottom: `${popoverBottom}px` }}
              onMouseDown={onKeepOpen}
            >
              {referenceMentionOptions.map((reference, index) => (
                <button
                  key={reference.id}
                  type="button"
                  role="option"
                  aria-label={reference.title}
                  aria-selected={index === activeReferenceMentionIndex}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    pointerMentionSelectionRef.current = true;
                    onKeepOpen(event);
                    onInsertReferenceMention(reference);
                    window.setTimeout(() => {
                      pointerMentionSelectionRef.current = false;
                    }, 0);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onKeepOpen(event);
                  }}
                  onMouseEnter={() => onMentionOptionHover(index)}
                  onClick={() => {
                    if (pointerMentionSelectionRef.current) {
                      return;
                    }
                    onInsertReferenceMention(reference);
                  }}
                  className={[
                    'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors hover:bg-white/6',
                    index === activeReferenceMentionIndex ? 'bg-white/8 ring-1 ring-white/10' : '',
                  ].join(' ')}
                >
                  <img src={reference.previewUrl} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">{reference.title}</span>
                    <span className="block truncate text-[12px] text-[var(--muted-foreground)]">{reference.description}</span>
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
            isExpanded ? (hasReferenceImages ? 'h-[248px] px-5 pb-5 pt-5' : 'h-[208px] px-5 pb-5 pt-5') : 'h-[64px] px-4 py-3',
          ].join(' ')}
          style={COMPOSER_GLASS_STYLE}
          onPointerDown={onSurfaceInteract}
          onClick={onSurfaceInteract}
          onDragEnter={onReferenceDragEnter}
          onDragOver={onReferenceDragOver}
          onDragLeave={onReferenceDragLeave}
          onDrop={onReferenceDrop}
        >
          <input
            ref={referenceInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              isReferencePickerOpenRef.current = false;
              if (!event.target.files?.length) return;
              onAppendReferenceImages(event.target.files);
              event.target.value = '';
            }}
          />
          <label htmlFor={inputId} className="sr-only">Director prompt</label>

          <div
            className={[
              'z-0 transition-[inset] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isExpanded ? (hasReferenceImages ? 'absolute left-5 right-5 top-[112px] bottom-[76px]' : 'absolute left-5 right-5 top-[56px] bottom-[76px]') : 'relative',
            ].join(' ')}
          >
            <PromptComposer
              ref={composerRef}
              placeholder="Ask Director to write coverage, beats, or continuity..."
              isExpanded={isExpanded}
              hasReferenceImages={hasReferenceImages}
              mentionCandidates={referenceMentionCandidates}
              onTextChange={onPromptChange}
              onMentionMatch={onMentionMatch}
              onMentionIdsChange={onMentionIdsChange}
              onCursorIndexChange={onCursorIndexChange}
              onScrollTopChange={onScrollTopChange}
              onMentionNavigationKey={onMentionNavigationKey}
              onFocus={onComposerFocus}
              onBlur={onComposerBlur}
              onPasteFiles={onAppendReferenceImages}
              onSubmitRequested={isStreaming ? onStop : onSubmit}
              onEnterWithMention={
                referenceMentionOptions[activeReferenceMentionIndex]
                  ? () => onInsertReferenceMention(referenceMentionOptions[activeReferenceMentionIndex])
                  : undefined
              }
            />
          </div>

          {isExpanded ? (
            <div className="absolute inset-x-5 top-[16px] z-10" onMouseDown={onKeepOpen}>
              <InlineAttachmentsRow
                hasReferenceImages={hasReferenceImages}
                referenceImages={referenceImages}
                onAddReference={onAddReference}
                onOpenReference={onOpenReference}
                onRemoveReference={onRemoveReference}
                onKeepOpen={onKeepOpen}
              />
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {isReferenceDragActive ? (
              <motion.div
                key="director-reference-drop-overlay"
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
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={[
                  'overflow-hidden transition-[width,margin,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isExpanded ? 'mr-0 w-0 opacity-0' : 'mr-2.5 w-10 opacity-100',
                ].join(' ')}
              >
                <button
                  ref={plusButtonRef}
                  type="button"
                  aria-label="Add reference"
                  onClick={onAddReference}
                  tabIndex={isExpanded ? -1 : 0}
                  aria-hidden={isExpanded}
                  className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--foreground)] backdrop-blur-xl transition-[background-color,border-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <div
                className={[
                  'flex min-w-0 items-center gap-2 overflow-hidden transition-[max-width,opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isExpanded ? 'max-w-full opacity-100 translate-y-0' : 'max-w-0 opacity-0 translate-y-1',
                ].join(' ')}
                aria-hidden={!isExpanded}
              >
                <ModelPicker
                  isOpen={isModelPickerOpen}
                  selectedModel={selectedModel}
                  selectedProviderId={selectedProviderId}
                  onOpenChange={onOpenModelPicker}
                  onProviderChange={onProviderChange}
                  onModelSelect={onModelSelect}
                  onKeepOpen={onKeepOpen}
                />

                <button
                  type="button"
                  tabIndex={isExpanded ? 0 : -1}
                  aria-label="Fast"
                  aria-pressed={effectiveFastMode}
                  disabled={selectedProviderId !== 'codex'}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onKeepOpen(event);
                  }}
                  onClick={onToggleFastMode}
                  className={[
                    'pointer-events-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium backdrop-blur-xl transition-[background-color,border-color,color] duration-200',
                    effectiveFastMode
                      ? 'border-[color-mix(in_srgb,var(--accent)_44%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.82))] text-[var(--foreground)]'
                      : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)] disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <Zap className={['size-3.5 shrink-0', effectiveFastMode ? 'text-[var(--accent)]' : ''].join(' ')} />
                  Fast
                </button>
              </div>
            </div>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="pointer-events-auto inline-flex h-10 min-w-[92px] items-center justify-center rounded-full bg-[rgba(190,58,58,0.18)] px-4 text-[13px] font-medium text-[rgb(245,178,178)] transition-[width,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[rgba(190,58,58,0.24)]"
              >
                Stop
              </button>
            ) : (
              <SendButton hostRef={sendButtonRef} onClick={onSubmit} disabled={!prompt.trim()} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SceneInputCard({
  label,
  placeholder,
  savedReferences,
  initialPrompt,
  initialReferences,
  onPromptChange,
  onReferencesChange,
  testId,
  baseHeight,
  topPaddingClassName,
  labelClassName,
}: {
  label: string | null;
  placeholder: string;
  savedReferences: SavedReferenceImage[];
  initialPrompt?: string;
  initialReferences?: SceneReferenceAttachment[];
  onPromptChange?: (prompt: string) => void;
  onReferencesChange?: (references: SceneReferenceAttachment[]) => void;
  testId?: string;
  baseHeight?: number;
  topPaddingClassName?: string;
  labelClassName?: string;
}) {
  const composerRef = useRef<PromptComposerHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const topReferencesRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionMatch, setMentionMatch] = useState<{ query: string; start: number } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [attachedReferences, setAttachedReferences] = useState<SceneReferenceAttachment[]>(initialReferences ?? []);
  const [topReferencesHeight, setTopReferencesHeight] = useState(0);
  const lastSentReferencesSignatureRef = useRef(getSceneReferenceSignature(initialReferences ?? []));

  useEffect(() => {
    const nextReferences = initialReferences ?? [];
    const currentSignature = getSceneReferenceSignature(attachedReferences);
    const nextSignature = getSceneReferenceSignature(nextReferences);
    if (currentSignature !== nextSignature) {
      setAttachedReferences(nextReferences);
    }
    lastSentReferencesSignatureRef.current = nextSignature;
  }, [initialReferences]);

  const mentionCandidates = useMemo(
    () => [
      ...savedReferences.map((reference) => ({
        id: reference.id,
        name: reference.name,
        title: reference.title,
        description: reference.description ?? 'Saved library reference',
        previewUrl: reference.previewUrl,
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
        referenceKind: 'saved_reference' as const,
        referenceId: reference.id,
        createdAt: reference.createdAt,
      })),
      ...attachedReferences,
    ],
    [attachedReferences, savedReferences]
  );

  useEffect(() => {
    const nextPrompt = initialPrompt ?? '';
    if (nextPrompt === prompt) {
      return;
    }
    setPrompt(nextPrompt);
    composerRef.current?.setText(nextPrompt, mentionCandidates);
  }, [initialPrompt, mentionCandidates, prompt]);

  const mentionOptions = useMemo(() => {
    if (!mentionMatch) return [];

    return mentionCandidates
      .filter((reference) => reference.title.toLowerCase().includes(mentionMatch.query))
      .slice(0, 5);
  }, [mentionCandidates, mentionMatch]);

  useEffect(() => {
    setActiveMentionIndex(0);
  }, [mentionMatch?.query, mentionOptions.length]);

  useEffect(() => {
    return () => {
      for (const attachment of attachedReferences) {
        if (attachment.shouldRevokePreviewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    };
  }, [attachedReferences]);

  const insertMention = useCallback((option: { id: string; title: string }) => {
    composerRef.current?.insertMention(option.id, option.title);
  }, []);

  const handleMentionNavigation = useCallback(
    (key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape') => {
      if (mentionOptions.length === 0) return false;

      if (key === 'ArrowDown') {
        setActiveMentionIndex((current) => (current + 1) % mentionOptions.length);
        return true;
      }

      if (key === 'ArrowUp') {
        setActiveMentionIndex((current) => (current - 1 + mentionOptions.length) % mentionOptions.length);
        return true;
      }

      if (key === 'Enter') {
        const option = mentionOptions[Math.min(activeMentionIndex, mentionOptions.length - 1)];
        if (!option) return false;
        insertMention(option);
        return true;
      }

      return false;
    },
    [activeMentionIndex, insertMention, mentionOptions]
  );

  const selectedReferences = useMemo(
    () => mentionCandidates.filter((reference) => mentionIds.includes(reference.id)),
    [mentionCandidates, mentionIds]
  );
  const generationReferences = useMemo(() => {
    const selectedSavedReferences = selectedReferences.filter(
      (reference) => reference.referenceKind === 'saved_reference'
    );
    return [...selectedSavedReferences, ...attachedReferences];
  }, [attachedReferences, selectedReferences]);

  useEffect(() => {
    const nextSignature = getSceneReferenceSignature(generationReferences);
    if (nextSignature === lastSentReferencesSignatureRef.current) {
      return;
    }
    lastSentReferencesSignatureRef.current = nextSignature;
    onReferencesChange?.(generationReferences);
  }, [generationReferences, onReferencesChange]);

  const hasTopReferences = selectedReferences.length > 0;
  const hasBottomAttachments = attachedReferences.length > 0;
  const composerTopPadding = 8;
  const composerBottomPadding = hasBottomAttachments ? 12 : 8;
  const resolvedBaseHeight = baseHeight ?? 212;

  useLayoutEffect(() => {
    const element = topReferencesRef.current;
    if (!element) {
      setTopReferencesHeight(0);
      return;
    }

    const updateHeight = () => {
      setTopReferencesHeight(element.getBoundingClientRect().height);
    };

    updateHeight();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(element);
    return () => observer.disconnect();
  }, [selectedReferences]);

  const mentionPopoverStyle = useMemo(() => {
    if (!surfaceRef.current || mentionOptions.length === 0) return null;

    const rect = surfaceRef.current.getBoundingClientRect();
    const textBeforeCursor = prompt.slice(0, cursorIndex);
    const lineIndex = textBeforeCursor.split('\n').length - 1;
    const caretTopWithinSurface = composerTopPadding + 12 + lineIndex * 24 - scrollTop;
    const popoverHeight = Math.min(mentionOptions.length, 5) * 56 + 20;
    const upwardTop = caretTopWithinSurface - popoverHeight - 10;
    const openDownward = upwardTop < 12;

    return {
      left: 12,
      top: openDownward ? caretTopWithinSurface + 30 : upwardTop,
      width: Math.max(220, rect.width - 24),
    };
  }, [composerTopPadding, cursorIndex, mentionOptions.length, prompt, scrollTop]);

  const appendReferenceFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((item) => item.type.startsWith('image/'));
    if (files.length === 0) return;

    const nextAttachments = await Promise.all(
      files.map(async (file, index) => {
        const fileBuffer =
          typeof file.arrayBuffer === 'function' ? await file.arrayBuffer() : new ArrayBuffer(0);

        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
          name: file.name,
          mimeType: file.type || 'image/png',
          bytesBase64: bytesToBase64(new Uint8Array(fileBuffer)),
          previewUrl: URL.createObjectURL(file),
          referenceKind: 'uploaded_attachment' as const,
          referenceId: null,
          createdAt: new Date().toISOString(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: 'Attached scene reference',
          shouldRevokePreviewUrl: true,
        };
      })
    );

    setAttachedReferences((current) => [...current, ...nextAttachments]);
  }, []);

  const removeAttachedReference = useCallback((referenceId: string) => {
    setAttachedReferences((current) =>
      current.filter((attachment) => {
        if (attachment.id !== referenceId) return true;
        if (attachment.shouldRevokePreviewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
        return false;
      })
    );
  }, []);

  const inputId = testId ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : placeholder.toLowerCase().replace(/\s+/g, '-'));

  return (
    <div className={['px-5 pb-5', topPaddingClassName ?? 'pt-1'].join(' ')}>
      {label ? (
        <div className={['mb-2 px-1', labelClassName ?? 'text-[12px] font-medium text-[var(--muted-foreground)]'].join(' ')}>
          {label}
        </div>
      ) : null}
      <div
        ref={surfaceRef}
        data-scene-input={inputId}
        className={[
          'relative flex flex-col overflow-visible rounded-[26px] border border-[var(--border-soft)] bg-[rgba(21,21,22,0.92)] px-4 pb-4 pt-3 transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        ].join(' ')}
        style={{
          height: resolvedBaseHeight + (hasTopReferences ? topReferencesHeight + 12 : 0),
        }}
      >
        <div
          className={[
            'overflow-hidden transition-[max-height,opacity,margin-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            hasTopReferences ? 'mb-3 opacity-100' : 'mb-0 opacity-0',
          ].join(' ')}
          style={{ maxHeight: hasTopReferences ? topReferencesHeight || 120 : 0 }}
        >
          <div ref={topReferencesRef} className="pointer-events-none flex max-w-full flex-wrap items-start gap-2">
            {selectedReferences.map((reference) => (
              <span
                key={reference.id}
                className="inline-flex h-12 items-center gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.88)] px-3 text-[11px] text-[var(--foreground)]"
              >
                <img src={reference.previewUrl} alt="" className="size-6 rounded-[10px] object-cover" />
                <span className="truncate">{reference.title}</span>
              </span>
            ))}
          </div>
        </div>

        <div
          data-testid={`${inputId}-composer-shell`}
          className="min-h-0 flex-1 overflow-hidden rounded-[20px]"
        >
          <PromptComposer
            ref={composerRef}
            ariaLabel={label ?? placeholder}
            placeholder={placeholder}
            isExpanded
            hasReferenceImages={hasTopReferences || hasBottomAttachments}
            mentionCandidates={mentionCandidates}
            onTextChange={(value) => {
              setPrompt(value);
              onPromptChange?.(value);
            }}
            onMentionMatch={setMentionMatch}
            onMentionIdsChange={setMentionIds}
            onCursorIndexChange={setCursorIndex}
            onScrollTopChange={setScrollTop}
            onMentionNavigationKey={handleMentionNavigation}
            onPasteFiles={appendReferenceFiles}
            onEnterWithMention={
              mentionOptions[activeMentionIndex]
                ? () => insertMention(mentionOptions[activeMentionIndex])
                : undefined
            }
          />
        </div>

        <div
          data-testid={`${inputId}-attachments-row`}
          className="mt-3 flex items-end gap-2"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Add Reference"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.88)] text-[var(--foreground)] transition-colors hover:bg-[rgba(39,39,40,0.92)]"
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Add Reference</TooltipContent>
          </Tooltip>
          <div className="flex min-w-0 items-end gap-2 overflow-x-auto">
            {attachedReferences.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative h-[70px] w-[120px] shrink-0 overflow-hidden rounded-[22px] border border-[var(--border-soft)]"
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => removeAttachedReference(attachment.id)}
                  className="absolute inset-0 inline-flex items-center justify-center bg-black/0 text-white opacity-0 transition-[opacity,background-color] duration-200 hover:bg-black/48 group-hover:opacity-100"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={inputRef}
            data-testid={`${inputId}-reference-input`}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (!event.target.files?.length) return;
              void appendReferenceFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        <style>{`
          [data-scene-input="${inputId}"] [data-prompt-composer-editor="true"] {
            padding-top: ${composerTopPadding}px;
            padding-right: 2px;
            padding-bottom: ${composerBottomPadding}px;
            padding-left: 2px;
          }
          [data-scene-input="${inputId}"] [data-prompt-composer-placeholder="true"] {
            padding-top: ${composerTopPadding}px;
            padding-right: 2px;
            padding-left: 2px;
          }
        `}</style>

        <AnimatePresence initial={false}>
          {mentionOptions.length > 0 && mentionPopoverStyle ? (
            <motion.div
              key={`${label ?? placeholder}-mentions`}
              initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 4, filter: 'blur(8px)' }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto absolute z-[300] overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.96)] p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
              style={mentionPopoverStyle}
              role="listbox"
              aria-label={`${label ?? placeholder} references`}
            >
              {mentionOptions.map((reference, mentionIndex) => (
                <button
                  key={reference.id}
                  type="button"
                  role="option"
                  aria-selected={mentionIndex === activeMentionIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveMentionIndex(mentionIndex)}
                  onClick={() => insertMention(reference)}
                  className={[
                    'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left transition-colors hover:bg-white/6',
                    mentionIndex === activeMentionIndex ? 'bg-white/8 ring-1 ring-white/10' : '',
                  ].join(' ')}
                >
                  <img src={reference.previewUrl} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
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
  );
}

function SceneFrameAccordion({
  frame,
  index,
  isLast,
  savedReferences,
  onRename,
  onDelete,
  onToggleRename,
  onPromptChange,
  onReferencesChange,
  onGenerate,
  isGenerating,
  isGenerationDisabled,
  onToggle,
}: {
  frame: SceneFrame;
  index: number;
  isLast: boolean;
  savedReferences: SavedReferenceImage[];
  onRename: (title: string) => void;
  onDelete: () => void;
  onToggleRename: () => void;
  onPromptChange: (prompt: string) => void;
  onReferencesChange: (references: SceneReferenceAttachment[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isGenerationDisabled: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className={[
        index === 0 ? 'border-t border-[var(--border-soft)]' : '',
        !isLast ? 'border-b border-[var(--border-soft)]' : '',
        'bg-[var(--surface)]',
      ].join(' ')}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={frame.title}
        aria-expanded={!frame.isCollapsed}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="flex h-14 items-center justify-between gap-2 px-5 transition-colors hover:bg-white/[0.03]"
      >
        {frame.isRenaming ? (
          <input
            aria-label={`${frame.title} title`}
            value={frame.title}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onRename(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-full bg-[rgba(32,32,33,0.72)] px-4 text-[14px] font-medium text-[var(--foreground)] outline-none"
          />
        ) : (
          <div className="min-w-0 flex-1 px-3 text-[14px] font-medium text-[var(--foreground)]">{frame.title}</div>
        )}
        <button
          type="button"
          aria-label={isGenerating ? `Generating ${frame.title}` : `Generate ${frame.title}`}
          disabled={isGenerationDisabled}
          onClick={(event) => {
            event.stopPropagation();
            onGenerate();
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)] disabled:cursor-default disabled:opacity-100"
        >
          {isGenerating ? <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" /> : <Play className="size-4 fill-current" />}
        </button>
        <button
          type="button"
          aria-label={`Rename ${frame.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleRename();
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${frame.title}`}
          disabled={isGenerationDisabled}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[rgba(190,58,58,0.18)] hover:text-[rgb(245,178,178)] disabled:cursor-default disabled:opacity-40"
        >
          <Trash2 className="size-4" />
        </button>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-foreground)]">
          {frame.isCollapsed ? (
            <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronUp className="size-4 text-[var(--muted-foreground)]" />
          )}
        </div>
      </div>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          gridTemplateRows: frame.isCollapsed ? '0fr' : '1fr',
          opacity: frame.isCollapsed ? 0 : 1,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <SceneInputCard
            label={null}
            placeholder={index === 0 ? 'Describe the opening frame' : 'Describe this frame'}
            savedReferences={savedReferences}
            initialPrompt={frame.prompt}
            onPromptChange={onPromptChange}
            onReferencesChange={onReferencesChange}
            testId={`scene-frame-${index + 1}`}
            baseHeight={212}
          />
        </div>
      </div>
    </section>
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
  const generationProvider = session?.image.provider === 'antigravity' ? 'antigravity' : session?.image.provider === 'codex' ? 'codex' : null;
  const generationModelLabel = session?.image.modelLabel ?? session?.image.modelId ?? null;
  const generationDuration = formatGenerationDuration(session?.image.durationMs);
  const generationReferences = session?.image.references ?? [];
  const extraPromptMentionCandidates = useMemo(() => {
    if (!session) return [];

    return [
      ...savedReferences.map((reference) => ({
        id: reference.id,
        title: reference.title,
      })),
      ...session.characterReferences.map((reference) => ({
        id: reference.id,
        title: reference.name.replace(/\.[^/.]+$/, ''),
      })),
    ];
  }, [savedReferences, session]);
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

              {session.image.origin === 'generated' ? (
                <div className="mb-5 space-y-3 rounded-[22px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.64)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {generationProvider ? (
                        <img
                          src={generationProvider === 'antigravity' ? antigravityLogo : codexLogo}
                          alt={generationProvider === 'antigravity' ? 'Antigravity' : 'Codex'}
                          className="size-6 shrink-0 rounded-[8px] object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-[var(--foreground)]">
                          {generationModelLabel ?? 'Unknown model'}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">Generation model</div>
                      </div>
                    </div>
                    {generationDuration ? (
                      <div className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[12px] font-medium tabular-nums text-[var(--foreground)]">
                        {generationDuration}
                      </div>
                    ) : null}
                  </div>
                  {session.image.prompt ? (
                    <div>
                      <div className="mb-1.5 text-[11px] font-medium uppercase text-[var(--muted-foreground)]">
                        Prompt
                      </div>
                      <div className="max-h-[132px] overflow-y-auto whitespace-pre-wrap rounded-[16px] border border-white/6 bg-black/18 px-3 py-2 text-[12px] leading-5 text-[var(--foreground)]">
                        {session.image.prompt}
                      </div>
                    </div>
                  ) : null}
                  {generationReferences.length > 0 ? (
                    <div>
                      <div className="mb-1.5 text-[11px] font-medium uppercase text-[var(--muted-foreground)]">
                        References
                      </div>
                      <div className="max-h-[132px] space-y-1.5 overflow-y-auto">
                        {generationReferences.map((reference, index) => (
                          <div
                            key={`${reference.name}-${index}`}
                            className="rounded-[14px] border border-white/6 bg-white/[0.035] px-3 py-2"
                          >
                            <div className="truncate text-[12px] font-medium text-[var(--foreground)]">
                              {reference.title || reference.name}
                            </div>
                            {reference.description ? (
                              <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[var(--muted-foreground)]">
                                {reference.description}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

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
                        mentionCandidates={extraPromptMentionCandidates}
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
  route,
  onAddReference,
  onEditReference,
  onDeleteReference,
  onExportReference,
  onImportReference,
}: {
  references: SavedReferenceImage[];
  route: ReferenceLibraryRoute;
  onAddReference: () => void;
  onEditReference: (reference: SavedReferenceImage) => void;
  onDeleteReference: (reference: SavedReferenceImage) => void;
  onExportReference: (reference: SavedReferenceImage) => void;
  onImportReference: () => void;
}) {
  const filteredReferences = useMemo(() => {
    const scoped = references.filter((reference) => reference.category === route);
    const groupedReferences = new Map<string, SavedReferenceImage>();
    for (const reference of scoped) {
      const key = reference.collectionId ?? reference.environmentId ?? reference.id;
      const current = groupedReferences.get(key);
      if (!current) {
        groupedReferences.set(key, reference);
        continue;
      }
      const isEarlier =
        reference.createdAt < current.createdAt ||
        (reference.createdAt === current.createdAt && reference.id < current.id);
      if (isEarlier) {
        groupedReferences.set(key, reference);
      }
    }
    return [...groupedReferences.values()];
  }, [references, route]);
  const copyByRoute: Record<ReferenceLibraryRoute, { title: string; description: string; addLabel: string }> = {
    characters: {
      title: 'Characters',
      description: 'Save character visuals and identity notes for consistent people across generations.',
      addLabel: 'Add character images',
    },
    environment: {
      title: 'Environment',
      description: 'Store one environment with multiple images plus shared context so AI can keep scene continuity.',
      addLabel: 'Add environment images',
    },
    objects: {
      title: 'Objects',
      description: 'Save props, products, and object details the model should preserve between shots.',
      addLabel: 'Add item images',
    },
  };
  const routeCopy = copyByRoute[route];

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
              {routeCopy.title}
            </h1>
            <p className="mt-4 text-[16px] leading-6 tracking-[0] text-[var(--muted-foreground)]">
              {routeCopy.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="surface"
              onClick={onImportReference}
              className="h-10 rounded-full px-4"
            >
              <Upload className="size-4" />
              Import reference
            </Button>
            <Button
              type="button"
              onClick={onAddReference}
              className="h-10 rounded-full px-4"
            >
              <ImagePlus className="size-4" />
              {routeCopy.addLabel}
            </Button>
          </div>
        </div>

        {filteredReferences.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="reference-grid">
            {filteredReferences.map((reference) => (
              <ContextMenu key={reference.id}>
                <ContextMenuTrigger asChild>
                  <article
                    className="group overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] transition-[border-color,background-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface2)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface2)]">
                      <img
                        src={reference.previewUrl}
                        alt={reference.title}
                        className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.025]"
                      />
                      <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label={`Edit ${reference.title}`}
                          onClick={() => onEditReference(reference)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/70"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${reference.title}`}
                          onClick={() => onDeleteReference(reference)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-[rgba(190,58,58,0.8)]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
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
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => onExportReference(reference)}>Export reference...</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onEditReference(reference)}>Edit reference</ContextMenuItem>
                  <ContextMenuItem
                    className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                    onClick={() => onDeleteReference(reference)}
                  >
                    Delete reference
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
  initialRoute,
  initialFiles,
  onGenerateDescriptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    files: File[];
    title: string;
    description?: string;
    route: ReferenceLibraryRoute;
    attachmentDescriptions?: Record<string, string>;
  }) => void | Promise<void>;
  initialRoute: ReferenceLibraryRoute;
  initialFiles?: File[];
  onGenerateDescriptions: (input: {
    category: ReferenceLibraryRoute;
    title?: string;
    attachments: Array<{
      id: string;
      name: string;
      mimeType: string;
      bytesBase64: string;
    }>;
  }) => Promise<{
    title: string;
    description: string;
    attachments: Array<{
      id: string;
      description: string;
    }>;
  }>;
}) {
  const [route, setRoute] = useState<ReferenceLibraryRoute>(initialRoute);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentDescriptions, setAttachmentDescriptions] = useState<Record<string, string>>({});
  const [isAttachmentDescriptionDialogOpen, setIsAttachmentDescriptionDialogOpen] = useState(false);
  const [editingAttachmentKey, setEditingAttachmentKey] = useState<string | null>(null);
  const [attachmentDescriptionDraft, setAttachmentDescriptionDraft] = useState('');
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const trimmedTitle = title.trim();
  const selectedFilePreviews = useMemo(
    () =>
      files.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
      if (!open) {
        setFiles([]);
        setRoute(initialRoute);
        setIsDragActive(false);
        setTitle('');
        setDescription('');
        setAttachmentDescriptions({});
        setIsAttachmentDescriptionDialogOpen(false);
        setEditingAttachmentKey(null);
        setAttachmentDescriptionDraft('');
        setIsGeneratingDescriptions(false);
        return;
      }

      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles);
        setAttachmentDescriptions(
          Object.fromEntries(initialFiles.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, '']))
        );
      }
  }, [initialFiles, initialRoute, open]);

  useEffect(() => {
    if (open) {
      setRoute(initialRoute);
    }
  }, [initialRoute, open]);

  useEffect(() => {
    return () => {
      for (const preview of selectedFilePreviews) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    };
  }, [selectedFilePreviews]);

  function buildAttachmentKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function acceptFileList(nextInputFiles: FileList | File[]) {
    const nextFiles = Array.from(nextInputFiles).filter((item) => item.type.startsWith('image/'));
    if (nextFiles.length === 0) return;

    setFiles((current) => {
      const byKey = new Map(current.map((file) => [buildAttachmentKey(file), file]));
      for (const file of nextFiles) {
        byKey.set(buildAttachmentKey(file), file);
      }
      return [...byKey.values()];
    });
    setAttachmentDescriptions((current) => {
      const next = { ...current };
      for (const file of nextFiles) {
        const key = buildAttachmentKey(file);
        next[key] = next[key] ?? '';
      }
      return next;
    });
  }

  function removeSelectedFile(fileKey: string) {
    setFiles((current) => current.filter((file) => buildAttachmentKey(file) !== fileKey));
    setAttachmentDescriptions((current) => {
      if (!(fileKey in current)) return current;
      const next = { ...current };
      delete next[fileKey];
      return next;
    });
    if (editingAttachmentKey === fileKey) {
      setIsAttachmentDescriptionDialogOpen(false);
      setEditingAttachmentKey(null);
      setAttachmentDescriptionDraft('');
    }
  }

  function openAttachmentDescriptionDialog(fileKey: string) {
    setEditingAttachmentKey(fileKey);
    setAttachmentDescriptionDraft(attachmentDescriptions[fileKey] ?? '');
    setIsAttachmentDescriptionDialogOpen(true);
  }

  function commitAttachmentDescription() {
    if (!editingAttachmentKey) return;
    setAttachmentDescriptions((current) => ({
      ...current,
      [editingAttachmentKey]: attachmentDescriptionDraft.trim(),
    }));
    setIsAttachmentDescriptionDialogOpen(false);
    setEditingAttachmentKey(null);
    setAttachmentDescriptionDraft('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0 || !trimmedTitle) return;

    await onSubmit({
      files,
      title: trimmedTitle,
      description: description.trim() || undefined,
      route,
      attachmentDescriptions,
    });
    onOpenChange(false);
  }

  async function handleGenerateDescriptions() {
    if (files.length === 0) return;
    setIsGeneratingDescriptions(true);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          return {
            id: buildAttachmentKey(file),
            name: file.name,
            mimeType: file.type || 'image/png',
            bytesBase64: bytesToBase64(bytes),
          };
        })
      );
      const result = await onGenerateDescriptions({
        category: route,
        title: trimmedTitle || undefined,
        attachments,
      });
      setTitle((current) => current.trim() || result.title);
      setDescription(result.description);
      setAttachmentDescriptions((current) => {
        const next = { ...current };
        for (const attachment of result.attachments) {
          next[attachment.id] = attachment.description;
        }
        return next;
      });
      toast.success('Descriptions generated');
    } finally {
      setIsGeneratingDescriptions(false);
    }
  }

  const routeCopy: Record<ReferenceLibraryRoute, { title: string; description: string; titlePlaceholder: string }> = {
    objects: {
      title: 'Item reference',
      description: 'Group product, prop, or object images under one reusable reference.',
      titlePlaceholder: 'Orange race bike',
    },
    environment: {
      title: 'Environment reference',
      description: 'Group multiple environment views under one shared continuity reference.',
      titlePlaceholder: 'Sunlit transit hangar',
    },
    characters: {
      title: 'Character reference',
      description: 'Group multiple character images under one reusable identity reference.',
      titlePlaceholder: 'Curly-haired pilot kid',
    },
  };
  const routeOptions = [
    { value: 'objects', label: 'Item' },
    { value: 'environment', label: 'Environment' },
    { value: 'characters', label: 'Character' },
  ] as const;
  const currentCopy = routeCopy[route];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-reference-dialog"
        className="flex max-h-[calc(100vh-32px)] max-w-[860px] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 px-5 pt-5">
          <DialogTitle>Add reference</DialogTitle>
          <DialogDescription>{currentCopy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div data-testid="add-reference-dialog-scroll" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          <div className="space-y-2">
            <div className="text-[13px] font-medium text-[var(--foreground)]">Type</div>
            <div className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface2)] p-1">
              {routeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRoute(option.value)}
                  className={[
                    'relative inline-flex min-w-[104px] items-center justify-center rounded-full px-3 py-2 text-[13px] transition-colors',
                    route === option.value ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  ].join(' ')}
                >
                  {route === option.value ? (
                    <motion.span
                      layoutId="reference-route-pill"
                      className="absolute inset-0 rounded-full bg-[var(--surface)]"
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                  <span className="relative z-10">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="reference-image" className="text-[13px] font-medium text-[var(--foreground)]">
                Images
              </label>
              <Button
                type="button"
                variant="surface"
                size="sm"
                className="h-8 rounded-full border-white/8 bg-[var(--surface2)] px-3 hover:bg-[var(--surface)]"
                onClick={() => {
                  void handleGenerateDescriptions().catch((error) => {
                    console.error('Failed to generate reference descriptions', error);
                    toast.error(getErrorMessage(error, 'Failed to generate descriptions.'));
                  });
                }}
                disabled={files.length === 0 || isGeneratingDescriptions}
              >
                {isGeneratingDescriptions ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <WandSparkles className="size-3.5" />
                )}
                Describe all
              </Button>
            </div>
            <div
              onClick={() => {
                if (files.length === 0) {
                  attachmentInputRef.current?.click();
                }
              }}
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
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => acceptFileList(event.target.files ?? [])}
                />
              {files.length === 0 ? (
                <motion.div
                  initial={false}
                  animate={{
                    opacity: 1,
                    y: isDragActive ? -2 : 0,
                    filter: 'blur(0px)',
                  }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="flex w-full flex-col items-center"
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      attachmentInputRef.current?.click();
                    }}
                    className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]"
                  >
                    <ImagePlus className="size-5" />
                  </button>
                  <div className="text-[14px] font-medium text-[var(--foreground)]">
                    {isDragActive ? 'Release to add images' : 'Drop an image here'}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                    Use + or drop multiple files
                  </div>
                </motion.div>
              ) : (
                <div className="w-full">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[12px] text-[var(--muted-foreground)]">{files.length} selected</div>
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]"
                      aria-label="Add images"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <div className="grid max-h-[min(44vh,420px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedFilePreviews.map((file) => (
                      <div
                        key={file.key}
                        className="group relative overflow-hidden rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface)]"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-4">
                            <div className="line-clamp-1 text-[11px] text-white/92">{file.name}</div>
                          </div>
                          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openAttachmentDescriptionDialog(file.key)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/70"
                              aria-label={`Edit description for ${file.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(file.key)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-[rgba(190,58,58,0.65)]"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-[var(--border-soft)] px-2 py-1.5 text-[11px] text-[var(--muted-foreground)]">
                          {attachmentDescriptions[file.key]?.trim() ? 'Description added' : 'No description yet'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reference-title" className="text-[13px] font-medium text-[var(--foreground)]">
              Title
            </label>
            <Input
              id="reference-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={currentCopy.titlePlaceholder}
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
              placeholder="Shared guidance. Individual image notes are edited with the pencil icon."
              className="min-h-[104px] w-full resize-none rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)] px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-strong)]"
            />
          </div>
          </div>

          <div
            data-testid="add-reference-dialog-footer"
            className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-5 py-4 backdrop-blur-xl"
          >
            <Button
              type="button"
              variant="surface"
              className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={files.length === 0 || !trimmedTitle}>
              Save reference
            </Button>
          </div>
        </form>
      </DialogContent>
      <Dialog open={isAttachmentDescriptionDialogOpen} onOpenChange={setIsAttachmentDescriptionDialogOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Attachment Description</DialogTitle>
            <DialogDescription>Add image-specific notes for this reference image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              value={attachmentDescriptionDraft}
              onChange={(event) => setAttachmentDescriptionDraft(event.target.value)}
              placeholder="Describe this image's key details, composition, or constraints."
              className="min-h-[140px] w-full resize-none rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)] px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-strong)]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="surface"
                className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
                onClick={() => setIsAttachmentDescriptionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={commitAttachmentDescription}>
                Save description
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function EditReferenceDialog({
  open,
  onOpenChange,
  reference,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: {
    id: string;
    category: ReferenceLibraryRoute;
    collectionId?: string;
    environmentId?: string;
    title: string;
    description?: string;
    attachments?: Array<{
      id?: string;
      name: string;
      mimeType: string;
      bytesBase64: string;
      description?: string;
    }>;
  } | null;
  onSubmit: (input: {
    id: string;
    category: ReferenceLibraryRoute;
    collectionId?: string;
    environmentId?: string;
    title: string;
    description?: string;
    attachments?: Array<{
      id?: string;
      name: string;
      mimeType: string;
      bytesBase64: string;
      description?: string;
    }>;
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{
      localKey: string;
      id?: string;
      name: string;
      mimeType: string;
      bytesBase64: string;
      description?: string;
      previewUrl: string;
      shouldRevokePreviewUrl?: boolean;
    }>
  >([]);
  const [editingAttachmentKey, setEditingAttachmentKey] = useState<string | null>(null);
  const [attachmentDescriptionDraft, setAttachmentDescriptionDraft] = useState('');
  const [isAttachmentDescriptionDialogOpen, setIsAttachmentDescriptionDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      for (const attachment of attachments) {
        if (attachment.shouldRevokePreviewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    };
  }, [attachments]);

  useEffect(() => {
    if (!open || !reference) {
      setTitle('');
      setDescription('');
      setAttachments((current) => {
        for (const attachment of current) {
          if (attachment.shouldRevokePreviewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
          }
        }
        return [];
      });
      return;
    }
    setTitle(reference.title);
    setDescription(reference.description ?? '');
    setAttachments((current) => {
      for (const attachment of current) {
        if (attachment.shouldRevokePreviewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
      return (reference.attachments ?? []).map((attachment, index) => ({
        localKey: attachment.id ?? `${attachment.name}-${index}`,
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        bytesBase64: attachment.bytesBase64,
        description: attachment.description,
        previewUrl: base64ToObjectUrl(attachment.bytesBase64, attachment.mimeType),
        shouldRevokePreviewUrl: true,
      }));
    });
  }, [open, reference]);

  const trimmedTitle = title.trim();
  const categoryLabel =
    reference?.category === 'environment'
      ? 'environment'
      : reference?.category === 'objects'
        ? 'object'
        : 'character';
  const isCollection = (reference?.attachments?.length ?? 0) > 0 || Boolean(reference?.collectionId) || reference?.category === 'environment';

  function openAttachmentDescriptionDialog(localKey: string) {
    const attachment = attachments.find((item) => item.localKey === localKey);
    if (!attachment) return;
    setEditingAttachmentKey(localKey);
    setAttachmentDescriptionDraft(attachment.description ?? '');
    setIsAttachmentDescriptionDialogOpen(true);
  }

  function saveAttachmentDescription() {
    if (!editingAttachmentKey) return;
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.localKey === editingAttachmentKey
          ? { ...attachment, description: attachmentDescriptionDraft.trim() || undefined }
          : attachment
      )
    );
    setIsAttachmentDescriptionDialogOpen(false);
    setEditingAttachmentKey(null);
    setAttachmentDescriptionDraft('');
  }

  function removeAttachment(localKey: string) {
    setAttachments((current) =>
      current.filter((attachment) => {
        if (attachment.localKey !== localKey) return true;
        if (attachment.shouldRevokePreviewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
        return false;
      })
    );
  }

  async function appendFiles(fileList: FileList | File[]) {
    const imageFiles = Array.from(fileList).filter((item) => item.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const prepared = await Promise.all(
      imageFiles.map(async (file, index) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
          localKey: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
          name: file.name,
          mimeType: file.type || 'image/png',
          bytesBase64: bytesToBase64(bytes),
          description: '',
          previewUrl: URL.createObjectURL(file),
          shouldRevokePreviewUrl: true,
        };
      })
    );
    setAttachments((current) => [...current, ...prepared]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          'flex max-h-[calc(100vh-32px)] flex-col overflow-hidden p-0',
          isCollection ? 'max-w-[860px]' : 'max-w-[560px]',
        ].join(' ')}
      >
        <DialogHeader className="shrink-0 px-5 pt-5">
          <DialogTitle>Edit {categoryLabel}</DialogTitle>
          <DialogDescription>Update the reference metadata.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!reference || !trimmedTitle) return;
            await onSubmit({
              id: reference.id,
              category: reference.category,
              collectionId: reference.collectionId,
              environmentId: reference.environmentId,
              title: trimmedTitle,
              description: description.trim() || undefined,
              attachments: isCollection
                ? attachments.map((attachment) => ({
                    id: attachment.id,
                    name: attachment.name,
                    mimeType: attachment.mimeType,
                    bytesBase64: attachment.bytesBase64,
                    description: attachment.description,
                  }))
                : undefined,
            });
            onOpenChange(false);
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
            {isCollection ? (
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-[var(--foreground)]">Images</div>
                <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface2)] p-3">
                  <Input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      void appendFiles(event.target.files ?? []);
                    }}
                  />
                  <div className="mb-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface3)]"
                      aria-label="Add images"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {attachments.length > 0 ? (
                    <div className="grid max-h-[min(44vh,420px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.localKey}
                          className="group relative overflow-hidden rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface)]"
                        >
                          <div className="relative aspect-square overflow-hidden">
                            <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-4">
                              <div className="line-clamp-1 text-[11px] text-white/92">{attachment.name}</div>
                            </div>
                            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openAttachmentDescriptionDialog(attachment.localKey)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/70"
                                aria-label={`Edit description for ${attachment.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAttachment(attachment.localKey)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-[rgba(190,58,58,0.65)]"
                                aria-label={`Remove ${attachment.name}`}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="border-t border-[var(--border-soft)] px-2 py-1.5 text-[11px] text-[var(--muted-foreground)]">
                            {attachment.description?.trim() ? 'Description added' : 'No description yet'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[14px] border border-dashed border-[var(--border-soft)] bg-[var(--surface)] px-4 py-6 text-center text-[12px] text-[var(--muted-foreground)]">
                      No images selected
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="edit-reference-title" className="text-[13px] font-medium text-[var(--foreground)]">
                Reference title
              </label>
              <Input
                id="edit-reference-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Reference title"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-reference-description" className="text-[13px] font-medium text-[var(--foreground)]">
                Reference description
              </label>
              <textarea
                id="edit-reference-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                className="min-h-[120px] w-full resize-none rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)] px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-strong)]"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-5 py-4 backdrop-blur-xl">
            <Button
              type="button"
              variant="surface"
              className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedTitle || (isCollection && attachments.length === 0)}>
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
      <Dialog open={isAttachmentDescriptionDialogOpen} onOpenChange={setIsAttachmentDescriptionDialogOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Attachment Description</DialogTitle>
            <DialogDescription>Add image-specific notes for this reference image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              value={attachmentDescriptionDraft}
              onChange={(event) => setAttachmentDescriptionDraft(event.target.value)}
              placeholder="Describe this image's key details, composition, or constraints."
              className="min-h-[140px] w-full resize-none rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface2)] px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-strong)]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="surface"
                className="border-transparent bg-[var(--surface2)] hover:bg-[var(--surface3)]"
                onClick={() => setIsAttachmentDescriptionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveAttachmentDescription}>
                Save description
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
