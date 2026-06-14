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
  Fragment,
  type RefObject,
  type CSSProperties,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { BorderBeam } from 'border-beam';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Crop,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  Folder,
  GripVertical,
  ImagePlus,
  MoreHorizontal,
  KeyRound,
  LoaderCircle,
  Pencil,
  Minus,
  PanelLeftOpen,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Square,
  Trash2,
  Upload,
  WandSparkles,
  X,
  Zap,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { List, useDynamicRowHeight, useListRef, type RowComponentProps } from 'react-window';
import 'streamdown/styles.css';
import { SlotText } from 'slot-text/react';
import 'slot-text/style.css';

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
import geminiIcon from './assets/gemini.svg';
import logo from './assets/logo.svg';
import { ImageGeneration } from 'img-fx';
import { ConfirmDeleteDialog } from './components/confirm-delete-dialog';
import { CreateProjectDialog } from './components/create-project-dialog';
import { EntityNameDialog } from './components/entity-name-dialog';
import { GeneratedImageGrid } from './components/generated-image-grid';
import { LiquidMetalFrame } from './components/liquid-metal-frame';
import {
  ProjectPropertiesDialog,
  type ProjectPropertiesDraft,
} from './components/project-properties-dialog';
import { ProjectRow } from './components/project-row';
import { TextShimmer } from './components/ai-elements/shimmer';
import {
  Attachment,
  Attachments,
  type AttachmentRecord,
} from './components/ai-elements/attachments';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from './components/ai-elements/chain-of-thought';
import { ToolCall, type ToolStatus } from './components/ai-elements/tool';
import {
  Message,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from './components/ai-elements/message';
import { ThreadRow } from './components/thread-row';
import { PromptComposer, type PromptComposerHandle } from './components/prompt-composer';
import {
  ReferenceMetadataDialog,
  type ReferenceMetadataDraft,
} from './components/reference-metadata-dialog';
import { ModelPicker } from './components/model-picker';
import { getErrorMessage } from './lib/errors';
import { sounds } from './lib/sounds';
import {
  applyOrder,
  getFolderOrder,
  setFolderOrder,
  getImageOrder,
  setImageOrder,
} from './lib/reference-order';
import {
  approveDirectorAction,
  cancelSceneGroupGeneration,
  declineDirectorAction,
  copyGeneratedImage,
  createProject,
  createReferenceCollection,
  createReferenceFolder,
  createReference,
  createDirectorChat,
  createSceneFrame,
  createSceneGroup,
  deleteDirectorChat,
  deleteSceneGroup,
  deleteSceneFrame,
  deleteReference,
  generateSceneGroup,
  listDirectorChats,
  listDirectorMessages,
  regenerateDirectorMessage,
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
  getProviderSettings,
  getUpdateStatus,
  generateImages,
  importCrenv,
  importReference,
  installUpdate,
  listGeneratedImages,
  listProjectsWithThreads,
  listReferenceFolders,
  listReferences,
  listSceneGroups,
  renameProject,
  renameThread,
  pasteClipboardImageToSceneFrame,
  checkForUpdates,
  subscribeToImageReady,
  subscribeToSceneFrameReady,
  structureScenePrompt,
  subscribeToScenePlan,
  subscribeToUpdateStatus,
  type SceneGroupRecord,
  updateProjectSettings,
  updateProviderSettings,
  updateSceneFrame,
  updateSceneGroup,
  type GeneratedImageRecord,
  type DirectorChatRecord,
  type DirectorMessageRecord,
  type DirectorMessagePart,
  type ProjectRecord,
  type ReferenceFolderRecord,
  type ReferenceImageRecord,
  type AppInfo,
  type UpdateStatus,
  cancelDirectorChat,
} from './lib/electron-api';
import {
  getDefaultModelOption,
  getModelOptionById,
  getModelsForProvider,
  type GenerationProviderId,
} from './lib/model-catalog';
import { COMPOSER_SHELL_MOTION } from './lib/composer-motion';
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
const DIRECTOR_STREAM_FLUSH_INTERVAL_MS = 16;

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
  const headerHorizontalPadding = 10 * 2;
  const shellBorderWidth = 2;
  const toggleWidth = includesSidebarToggle ? 28 + 8 : 0;
  return Math.ceil(headerHorizontalPadding + shellBorderWidth + toggleWidth + Math.max(title.length, 8) * 8.3);
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

function isOptimisticDirectorMessage(message: DirectorMessageRecord) {
  return message.id.startsWith('director-optimistic-');
}

function getDirectorText(parts: DirectorMessagePart[]) {
  return parts
    .filter((part): part is Extract<DirectorMessagePart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function removeMatchingOptimisticDirectorMessages(
  messages: DirectorMessageRecord[],
  incomingMessages: DirectorMessageRecord[]
) {
  const incomingUserMessage = incomingMessages.find((message) => message.role === 'user');
  const incomingAssistantMessage = incomingMessages.find((message) => message.role === 'assistant');

  return messages.filter((message) => {
    if (!isOptimisticDirectorMessage(message)) {
      return true;
    }

    if (
      incomingUserMessage &&
      message.role === 'user' &&
      getDirectorText(message.parts).trim() === getDirectorText(incomingUserMessage.parts).trim()
    ) {
      return false;
    }

    if (
      incomingAssistantMessage &&
      message.role === 'assistant' &&
      message.status === 'streaming' &&
      message.parts.length === 0
    ) {
      return false;
    }

    return true;
  });
}

interface DirectorRenderableActionStatus {
  rawStatus: string;
  title?: string | null;
  detail?: string | null;
  progress?: {
    generated: number;
    total: number;
  } | null;
  result?: unknown;
}

interface DirectorRenderableAction {
  id: string;
  actionIndex: number;
  kind: string;
  summary: string;
  payload?: unknown;
  source: 'legacy-action' | 'tool-call';
  approval?: {
    id: string;
    needsApproval: boolean;
    approved?: boolean;
  } | null;
  latestStatus: DirectorRenderableActionStatus | null;
}

function updateDirectorMessageContent(
  messages: DirectorMessageRecord[],
  messageId: string,
  parts: DirectorMessagePart[],
  status: DirectorMessageRecord['status'],
  updatedAt?: string,
  errorMessage?: string | null
) {
  let didUpdate = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    if (
      message.parts === parts &&
      message.status === status &&
      (!updatedAt || message.updatedAt === updatedAt)
    ) {
      return message;
    }

    didUpdate = true;
    return {
      ...message,
      parts,
      status,
      ...(updatedAt ? { updatedAt } : null),
      ...(errorMessage !== undefined ? { errorMessage } : null),
    };
  });

  return didUpdate ? nextMessages : messages;
}

function updateDirectorMessagesByChat(
  messagesByChatId: Record<string, DirectorMessageRecord[]>,
  chatId: string,
  messageId: string,
  parts: DirectorMessagePart[],
  status: DirectorMessageRecord['status'],
  updatedAt?: string,
  errorMessage?: string | null
) {
  const currentMessages = messagesByChatId[chatId] ?? [];
  const nextMessages = updateDirectorMessageContent(
    currentMessages,
    messageId,
    parts,
    status,
    updatedAt,
    errorMessage
  );

  if (nextMessages === currentMessages) {
    return messagesByChatId;
  }

  return {
    ...messagesByChatId,
    [chatId]: nextMessages,
  };
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

function deriveReferenceAttachmentTitle(name: string) {
  return name.replace(/\.[^/.]+$/, '').trim() || name.trim() || 'Untitled image';
}

function getUniqueAttachmentName(name: string, occupiedNames: Iterable<string>) {
  const trimmedName = name.trim() || 'image';
  const extensionMatch = /\.([^.]+)$/.exec(trimmedName);
  const extension = extensionMatch ? `.${extensionMatch[1]}` : '';
  const baseName = extension ? trimmedName.slice(0, -extension.length) : trimmedName;
  const normalizedBaseName = baseName.trim() || 'image';
  const taken = new Set(Array.from(occupiedNames, (value) => value.toLowerCase()));
  let candidate = `${normalizedBaseName}${extension}`;
  let suffix = 2;

  while (taken.has(candidate.toLowerCase())) {
    candidate = `${normalizedBaseName}-${suffix}${extension}`;
    suffix += 1;
  }

  return candidate;
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
    provider: string;
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
    groupTitle: reference.groupTitle ?? undefined,
    groupDescription: reference.groupDescription ?? undefined,
    mimeType: reference.mimeType,
    bytesBase64: reference.bytesBase64,
    previewUrl: base64ToObjectUrl(reference.bytesBase64, reference.mimeType),
    size: 0,
    createdAt: reference.createdAt,
    category: reference.category,
    collectionId: reference.collectionId ?? reference.environmentId ?? undefined,
    environmentId: reference.environmentId ?? undefined,
    parentFolderId: reference.parentFolderId ?? undefined,
    section: reference.section ?? undefined,
    shouldRevokePreviewUrl: true,
  };
}

function sortReferenceFolders(folders: ReferenceFolderRecord[]) {
  return [...folders].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return b.id.localeCompare(a.id);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function upsertReferenceFolderRecord(folders: ReferenceFolderRecord[], folder: ReferenceFolderRecord) {
  const nextFolders = new Map(folders.map((entry) => [entry.id, entry]));
  nextFolders.set(folder.id, folder);
  return sortReferenceFolders([...nextFolders.values()]);
}

function removeReferenceFolderRecord(folders: ReferenceFolderRecord[], folderId: string) {
  const idsToRemove = new Set([folderId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentFolderId && idsToRemove.has(folder.parentFolderId) && !idsToRemove.has(folder.id)) {
        idsToRemove.add(folder.id);
        changed = true;
      }
    }
  }

  return folders.filter((folder) => !idsToRemove.has(folder.id));
}

function toReferenceCollectionAttachment(img: SavedReferenceImage) {
  return {
    id: img.id,
    name: img.name,
    title: img.title,
    mimeType: img.mimeType,
    bytesBase64: img.bytesBase64,
    description: img.description,
    section: img.section,
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
  groupTitle?: string;
  groupDescription?: string;
  createdAt: string;
  category: ReferenceLibraryRoute;
  collectionId?: string;
  environmentId?: string;
  parentFolderId?: string;
  section?: 'primary' | 'angles';
};

// A node in the composer's reference mention tree. Mirrors the Reference
// Library folder tree: organizational folders (ReferenceFolderRecord) plus
// collections / solo images keyed by `collectionId ?? environmentId ?? id`,
// all linked through `parentFolderId`. Top-level nodes have `parentFolderId`
// === null.
type ReferenceTreeNode = {
  id: string;
  title: string;
  description: string;
  previewUrl: string;
  parentFolderId: string | null;
  kind: 'folder' | 'collection';
  images: SavedReferenceImage[];
};

type ReferenceLibraryRoute = 'characters' | 'environment' | 'objects';

const referenceRouteLabels: Record<ReferenceLibraryRoute, string> = {
  characters: 'Characters',
  environment: 'Environment',
  objects: 'Objects',
};

const referenceRouteHeaderLabels: Record<ReferenceLibraryRoute, string> = {
  characters: 'Character',
  environment: 'Environment',
  objects: 'Item',
};

function getSavedReferenceMentionGroupId(reference: SavedReferenceImage) {
  return reference.collectionId ?? reference.environmentId ?? reference.id;
}

function getSharedReferenceTitle(reference: Pick<SavedReferenceImage, 'title' | 'groupTitle'>) {
  return reference.groupTitle?.trim() || reference.title;
}

function getReferenceMentionLookupQuery(query: string) {
  return query.split(/[#/:.]/, 1)[0]?.toLowerCase() ?? '';
}


function normalizeReferenceSelectorValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugifyReferenceSelectorValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

function extractReferenceSelectorMatches(promptText: string, mentionTitle: string, allowPlainMention = false) {
  if (!promptText.trim() || !mentionTitle.trim()) {
    return [];
  }

  // The selector group allows internal separators (`.`/`#`/`/`/`:`) so a full
  // nested path like `.subfolder.image` is captured in one go. It still stops
  // at whitespace and sentence punctuation; a dangling trailing separator is
  // dropped later when the path is split into segments.
  const pattern = new RegExp(
    `(^|[\\s([{'"\`])${allowPlainMention ? '@?' : '@'}(${escapeRegExp(mentionTitle)})([#/:.][^\\s,!?;()\\[\\]{}'"\\\`]+)`,
    'gi',
  );
  const matches: Array<{ matchText: string; selectorText: string }> = [];

  for (const match of promptText.matchAll(pattern)) {
    const matchedTitle = match[2];
    const matchedSelector = match[3];
    if (!matchedTitle || !matchedSelector) {
      continue;
    }

    matches.push({
      matchText: `${matchedTitle}${matchedSelector}`,
      selectorText: matchedSelector.slice(1),
    });
  }

  return matches;
}

function promptContainsReferenceMention(promptText: string, mentionTitle: string) {
  if (!promptText.trim() || !mentionTitle.trim()) {
    return false;
  }

  const pattern = new RegExp(
    `(^|[\\s([{'"\`])@${escapeRegExp(mentionTitle)}(?=$|[\\s.,!?;:)\\[\\]{}'"\\\`#/:])`,
    'i',
  );
  return pattern.test(promptText);
}

function referenceMatchesSelector(reference: SavedReferenceImage, selectorText: string) {
  const normalizedSelector = normalizeReferenceSelectorValue(selectorText);
  if (!normalizedSelector) {
    return false;
  }

  const candidates = [
    reference.title,
    deriveReferenceAttachmentTitle(reference.name),
    reference.name,
  ]
    .map(normalizeReferenceSelectorValue)
    .filter((value) => value.length > 0);

  return candidates.some(
    (candidate) =>
      candidate === normalizedSelector ||
      candidate.includes(normalizedSelector) ||
      normalizedSelector.includes(candidate),
  );
}

type ResolvedSavedReferenceSelection = {
  reference: SavedReferenceImage;
  mentionTitle: string;
  mentionDescription?: string;
  groupSize: number;
  selectorApplied: boolean;
  matchText: string;
};

type ReferenceSelectorOption = {
  id: string;
  title: string;
  description: string;
  previewUrl: string;
  insertId: string;
  insertTitle: string;
  selectorSuffix?: string;
  folderTitle?: string;
  selectorSlug?: string;
  section?: 'primary' | 'angles';
  // Navigable folders/collections keep the caret on the chip after insertion so
  // typing the next `.` keeps drilling instead of landing after a space.
  keepSelectorOpen?: boolean;
};

function getReferencePrimaryTabLabel(route: ReferenceLibraryRoute) {
  return route === 'environment' ? 'Ambiente' : route === 'characters' ? 'Personagem' : 'Objeto';
}

function buildReferenceMentionTree(
  savedReferences: SavedReferenceImage[],
  referenceFolders: ReferenceFolderRecord[],
): ReferenceTreeNode[] {
  const map = new Map<string, ReferenceTreeNode>();

  // Organizational folders first so collections/images can attach under them.
  for (const folder of referenceFolders) {
    map.set(folder.id, {
      id: folder.id,
      title: folder.title,
      description: folder.description ?? '',
      previewUrl: '',
      parentFolderId: folder.parentFolderId ?? null,
      kind: 'folder',
      images: [],
    });
  }

  for (const reference of savedReferences) {
    const nodeId = getSavedReferenceMentionGroupId(reference);
    const existing = map.get(nodeId);
    if (existing && existing.kind === 'collection') {
      existing.images.push(reference);
      existing.title = getSharedReferenceTitle(reference);
      if (reference.groupDescription) {
        existing.description = reference.groupDescription;
      }
      if (!existing.previewUrl) {
        existing.previewUrl = reference.previewUrl;
      }
      existing.parentFolderId = reference.parentFolderId ?? existing.parentFolderId ?? null;
      continue;
    }
    map.set(nodeId, {
      id: nodeId,
      title: getSharedReferenceTitle(reference),
      description: reference.groupDescription ?? reference.description ?? '',
      previewUrl: reference.previewUrl,
      parentFolderId: reference.parentFolderId ?? null,
      kind: 'collection',
      images: [reference],
    });
  }

  const nodes = [...map.values()];
  // Give organizational folders a thumbnail from their first descendant image.
  for (const node of nodes) {
    if (node.kind === 'folder' && !node.previewUrl) {
      node.previewUrl = getReferenceSubtreeImages(node, nodes)[0]?.previewUrl ?? '';
    }
  }
  return nodes;
}

function getReferenceTreeChildren(
  nodes: ReferenceTreeNode[],
  parentId: string | null,
): ReferenceTreeNode[] {
  return nodes.filter((node) => node.parentFolderId === parentId);
}

function getReferenceSubtreeImages(
  node: ReferenceTreeNode,
  nodes: ReferenceTreeNode[],
): SavedReferenceImage[] {
  const result: SavedReferenceImage[] = [...node.images];
  for (const child of nodes) {
    if (child.parentFolderId === node.id) {
      result.push(...getReferenceSubtreeImages(child, nodes));
    }
  }
  return result;
}

// Resolve a single path segment to a node among the given candidates, using the
// same exact-then-unique-partial strategy as `resolveReferenceSelectorGroup`.
function resolveReferenceTreeNodeByTitle(
  candidates: ReferenceTreeNode[],
  segment: string,
): ReferenceTreeNode | null {
  const normalized = normalizeReferenceSelectorValue(segment);
  if (!normalized) {
    return null;
  }
  const exact = candidates.find(
    (node) => normalizeReferenceSelectorValue(node.title) === normalized,
  );
  if (exact) {
    return exact;
  }
  const partial = candidates.filter((node) =>
    normalizeReferenceSelectorValue(node.title).includes(normalized),
  );
  return partial.length === 1 ? partial[0] : null;
}

// Walk a `base.step1.step2...` path through the tree, descending only into
// folder/collection nodes. Returns the node the path lands inside, or null if
// any segment fails to resolve uniquely.
function resolveReferenceMentionPathNode(
  nodes: ReferenceTreeNode[],
  base: string,
  steps: string[],
): ReferenceTreeNode | null {
  // The base matches the current chip, which may be a top-level node or a
  // subfolder the user already drilled into (its chip replaced the parent), so
  // resolve it against every node by title.
  let current =
    resolveReferenceTreeNodeByTitle(getReferenceTreeChildren(nodes, null), base) ??
    resolveReferenceTreeNodeByTitle(nodes, base);
  if (!current) {
    return null;
  }
  for (const step of steps) {
    const next = resolveReferenceTreeNodeByTitle(getReferenceTreeChildren(nodes, current.id), step);
    if (!next) {
      return null;
    }
    current = next;
  }
  return current;
}

// A node is navigable (the user drills into it with `.`) when it is an
// organizational folder, a multi-image collection, or has any child nodes.
function isNavigableReferenceNode(node: ReferenceTreeNode, nodes: ReferenceTreeNode[]): boolean {
  return (
    node.kind === 'folder' ||
    node.images.length > 1 ||
    getReferenceTreeChildren(nodes, node.id).length > 0
  );
}

// Titles from the top-level ancestor down to `node` (inclusive).
function getReferenceNodeTitlePath(node: ReferenceTreeNode, nodes: ReferenceTreeNode[]): string[] {
  const chain: ReferenceTreeNode[] = [];
  let current: ReferenceTreeNode | null = node;
  while (current) {
    chain.unshift(current);
    current = current.parentFolderId
      ? nodes.find((entry) => entry.id === current?.parentFolderId) ?? null
      : null;
  }
  return chain.map((entry) => entry.title);
}

function splitReferenceMentionPath(query: string): {
  base: string;
  steps: string[];
  trailing: string;
  hasSeparator: boolean;
} {
  if (!/[#/:.]/.test(query)) {
    return { base: query.toLowerCase(), steps: [], trailing: '', hasSeparator: false };
  }
  const parts = query.split(/[#/:.]/);
  const base = (parts.shift() ?? '').toLowerCase();
  const remaining = parts.map((part) => part.toLowerCase());
  const endsWithSeparator = /[#/:.]$/.test(query);
  const trailing = endsWithSeparator ? '' : (remaining.pop() ?? '');
  // Drop empty segments left by consecutive/trailing separators so completed
  // path steps stay resolvable.
  const steps = remaining.filter((part) => part.length > 0);
  return { base, steps, trailing, hasSeparator: true };
}

function resolveSavedReferencesFromMentionIds(
  savedReferences: SavedReferenceImage[],
  selectedReferenceIds: string[],
  referenceFolders: ReferenceFolderRecord[] = [],
) {
  const selectedIds = new Set(selectedReferenceIds);
  const resolved = new Map<string, SavedReferenceImage>();

  for (const reference of savedReferences) {
    if (selectedIds.has(reference.id) || selectedIds.has(getSavedReferenceMentionGroupId(reference))) {
      resolved.set(reference.id, reference);
    }
  }

  // A selected id can be an organizational folder chip — expand it to every
  // image in that folder's subtree.
  if (referenceFolders.length > 0) {
    const tree = buildReferenceMentionTree(savedReferences, referenceFolders);
    for (const node of tree) {
      if (node.kind === 'folder' && selectedIds.has(node.id)) {
        for (const image of getReferenceSubtreeImages(node, tree)) {
          resolved.set(image.id, image);
        }
      }
    }
  }

  return [...resolved.values()];
}

// Walk a selector path (`segments`) starting inside `startNode`, descending
// through folder/collection nodes. Returns the specific image the path lands
// on, the sub-node it lands on, or null when it cannot be resolved.
function resolveReferencePathTarget(
  startNode: ReferenceTreeNode,
  nodes: ReferenceTreeNode[],
  segments: string[],
): { image: SavedReferenceImage } | { node: ReferenceTreeNode } | null {
  let current = startNode;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const childNode = resolveReferenceTreeNodeByTitle(
      getReferenceTreeChildren(nodes, current.id),
      segment,
    );
    if (childNode) {
      current = childNode;
      continue;
    }
    // Not a folder/collection: the last segment may name a direct image.
    const image = current.images.find((reference) => referenceMatchesSelector(reference, segment));
    if (image && isLast) {
      return { image };
    }
    return null;
  }
  return { node: current };
}

function resolveSavedReferenceSelections(
  savedReferences: SavedReferenceImage[],
  selectedReferenceIds: string[],
  promptText: string,
  referenceFolders: ReferenceFolderRecord[] = [],
): ResolvedSavedReferenceSelection[] {
  const selectedIds = new Set(selectedReferenceIds);
  const nodes = buildReferenceMentionTree(savedReferences, referenceFolders);
  const resolved = new Map<string, ResolvedSavedReferenceSelection>();

  // A more specific (selector-applied) selection must not be clobbered by a
  // broader whole-folder fallback for the same image.
  const register = (selection: ResolvedSavedReferenceSelection) => {
    const existing = resolved.get(selection.reference.id);
    if (existing && existing.selectorApplied && !selection.selectorApplied) {
      return;
    }
    resolved.set(selection.reference.id, selection);
  };

  for (const node of nodes) {
    const subtreeImages = getReferenceSubtreeImages(node, nodes);
    const isNodeSelectedById = selectedIds.has(node.id);
    const isNodeSelected =
      isNodeSelectedById || promptContainsReferenceMention(promptText, node.title);

    // A folded image chip is selected by the image's own id (not the node).
    // The chip renders the image title, so label it with the folder context.
    for (const reference of node.images) {
      if (!selectedIds.has(reference.id)) {
        continue;
      }
      register({
        reference,
        mentionTitle: node.title,
        mentionDescription: node.description || undefined,
        groupSize: node.images.length,
        selectorApplied: node.images.length > 1,
        matchText: reference.title,
      });
    }

    if (!isNodeSelected) {
      continue;
    }

    // Selector paths attached to this node's mention, e.g. `@Root.Sub.image`.
    const selectorMatches = extractReferenceSelectorMatches(promptText, node.title, isNodeSelectedById);
    let matchedSelector = false;

    for (const selectorMatch of selectorMatches) {
      const segments = selectorMatch.selectorText.split(/[#/:.]/).filter(Boolean);
      if (segments.length === 0) {
        continue;
      }
      const target = resolveReferencePathTarget(node, nodes, segments);
      if (!target) {
        continue;
      }
      matchedSelector = true;
      if ('image' in target) {
        register({
          reference: target.image,
          mentionTitle: node.title,
          mentionDescription: node.description || undefined,
          groupSize: subtreeImages.length,
          selectorApplied: true,
          matchText: selectorMatch.matchText,
        });
      } else {
        // The path lands on a sub-folder/collection — send its whole subtree.
        const targetImages = getReferenceSubtreeImages(target.node, nodes);
        for (const image of targetImages) {
          register({
            reference: image,
            mentionTitle: target.node.title,
            mentionDescription: target.node.description || undefined,
            groupSize: targetImages.length,
            selectorApplied: false,
            matchText: selectorMatch.matchText,
          });
        }
      }
    }

    if (matchedSelector) {
      continue;
    }

    // Fallback: a bare folder/collection mention sends every subtree image.
    for (const image of subtreeImages) {
      register({
        reference: image,
        mentionTitle: node.title,
        mentionDescription: node.description || undefined,
        groupSize: subtreeImages.length,
        selectorApplied: false,
        matchText: node.title,
      });
    }
  }

  return [...resolved.values()];
}

function buildSavedReferenceDescription(selection: ResolvedSavedReferenceSelection) {
  if (selection.groupSize > 1) {
    const folderContext = selection.mentionDescription?.trim()
      ? ` ${selection.mentionDescription.trim()}`
      : '';
    const imageContext = selection.reference.description?.trim()
      ? ` ${selection.reference.description.trim()}`
      : '';
    return `Reference set: ${selection.mentionTitle}.${folderContext} Image: ${selection.reference.title}.${imageContext}`;
  }
  return selection.reference.description ?? undefined;
}

type ComposerGenerationMode = (typeof generationModeOptions)[number]['value'];
type GenerationWorkspaceMode = 'classic' | 'scenes' | 'director';
type SceneFrame = {
  id: string;
  title: string;
  prompt: string;
  references: SceneReferenceAttachment[];
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
type GenerationMode = ComposerGenerationMode | 'pinpoint' | 'camera' | 'director';
type ActiveGenerationRun = {
  clientRunId: string;
  threadId: string;
  mode: GenerationMode;
  provider: string;
  modelId: string;
  modelLabel: string;
  generationStartedAt: string;
  loadingEntries: GeneratedImageRecord[];
};

type ActiveSceneGenerationRun = {
  sceneGroupId: string;
  frameIds: string[];
  provider: string;
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
  provider?: string | null;
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
const STARTUP_WORKSPACE_TIMEOUT_MS = 12_000;
const DEFAULT_SCENES_SIDEBAR_WIDTH = 180;
const MIN_SCENES_SIDEBAR_WIDTH = 160;
const SCENE_OUTPUT_EAGER_FRAME_COUNT = 3;
const SCENE_OUTPUT_LAZY_ROOT_MARGIN = '900px 0px';
const SCENE_OUTPUT_MAX_GRID_HEIGHT = 640;
const SCENE_OUTPUT_FRAME_ROW_GAP = 16;
const SCENE_FRAME_ACCORDION_EXPANDED_HEIGHT = 318;
const SCENE_FRAME_ACCORDION_COLLAPSED_HEIGHT = 58;
const SCENE_SIDEBAR_FRAME_LIST_MAX_HEIGHT = 720;

function withStartupTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${STARTUP_WORKSPACE_TIMEOUT_MS}ms.`));
    }, STARTUP_WORKSPACE_TIMEOUT_MS);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function toSceneReferenceAttachment(reference: SceneGroupRecord['frames'][number]['references'][number]): SceneReferenceAttachment {
  return {
    ...reference,
    previewUrl: base64ToObjectUrl(reference.bytesBase64, reference.mimeType),
    title: reference.name.replace(/\.[^/.]+$/, ''),
    description: 'Frame reference',
    shouldRevokePreviewUrl: true,
  };
}

function toSceneFrameUi(frame: SceneGroupRecord['frames'][number]): SceneFrame {
  return {
    id: frame.id,
    title: frame.title,
    prompt: frame.prompt,
    references: frame.references.map(toSceneReferenceAttachment),
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
    provider: run?.provider ?? null,
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
    provider: metadata?.provider ?? null,
    modelId: metadata?.modelId ?? null,
    modelLabel: metadata?.modelLabel ?? null,
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

type DirectorMessageStreamSnapshot = {
  chatId: string;
  messageId: string;
  parts: DirectorMessagePart[];
  status: DirectorMessageRecord['status'];
};

type DirectorMessageStreamListener = (snapshot: DirectorMessageStreamSnapshot) => void;

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
  const [selectedModelId, setSelectedModelId] = useState(getDefaultModelOption('image').id);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
  const [isAppReady, setIsAppReady] = useState(false);
  // Pre-warm the img-fx WebGL renderer + shader once at startup (during idle,
  // behind the splash) so the first image generation doesn't pay the
  // synchronous Three.js renderer creation + shader compile cost — which was
  // freezing the main thread when the first loading tile mounted.
  const [shouldWarmImageFx, setShouldWarmImageFx] = useState(false);
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
  const [activeStudioView, setActiveStudioView] = useState<'generation' | 'references' | 'providers'>('generation');
  const [activeReferenceLibraryRoute, setActiveReferenceLibraryRoute] = useState<ReferenceLibraryRoute>('characters');
  const [providerGeminiApiKey, setProviderGeminiApiKey] = useState('');
  const [providerGeminiApiKeyDraft, setProviderGeminiApiKeyDraft] = useState('');
  const [isProviderKeyVisible, setIsProviderKeyVisible] = useState(false);
  const [isSavingProviderSettings, setIsSavingProviderSettings] = useState(false);
  const [isPreparingSelectedImagesReference, setIsPreparingSelectedImagesReference] = useState(false);
  const [referenceSeedFiles, setReferenceSeedFiles] = useState<File[]>([]);
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
  const [referenceFolders, setReferenceFolders] = useState<ReferenceFolderRecord[]>([]);
  const [selectedPromptReferenceIds, setSelectedPromptReferenceIds] = useState<string[]>([]);
  const [localRunningCountsByThreadId, setLocalRunningCountsByThreadId] = useState<Record<string, number>>({});
  const [activeRunsById, setActiveRunsById] = useState<Record<string, ActiveGenerationRun>>({});
  const [isReferenceDragActive, setIsReferenceDragActive] = useState(false);
  const [isClassicGridDragActive, setIsClassicGridDragActive] = useState(false);
  const classicGridDragDepthRef = useRef(0);
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
  const pendingDirectorDeltaByMessageIdRef = useRef<
    Record<string, { chatId: string; parts: DirectorMessagePart[] }>
  >({});
  const directorDeltaFlushTimerRef = useRef<number | null>(null);
  const directorMessageStreamListenersRef = useRef(new Set<DirectorMessageStreamListener>());
  const latestDirectorMessageStreamSnapshotsRef = useRef(new Map<string, DirectorMessageStreamSnapshot>());
  const activeDirectorRunsRef = useRef<Record<string, DirectorActiveRun>>({});
  const selectedThreadIdRef = useRef<string | null>(null);
  const activeSceneGroupIdRef = useRef<string | null>(null);
  const selectedModel = useMemo(
    () => getModelOptionById(selectedModelId) ?? getDefaultModelOption('image'),
    [selectedModelId]
  );
  const selectedProviderId = selectedModel.providerId;
  const effectiveFastMode = false;

  useEffect(() => {
    if (generationWorkspaceMode === 'classic' && !selectedModel.capabilities.includes('image')) {
      setSelectedModelId(getDefaultModelOption('image').id);
    }
    if (generationWorkspaceMode === 'director' && !selectedModel.capabilities.includes('text')) {
      setSelectedModelId(getDefaultModelOption('text').id);
    }
  }, [generationWorkspaceMode, selectedModel]);

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

  const subscribeToDirectorMessageStream = useCallback((listener: DirectorMessageStreamListener) => {
    directorMessageStreamListenersRef.current.add(listener);
    for (const snapshot of latestDirectorMessageStreamSnapshotsRef.current.values()) {
      listener(snapshot);
    }
    return () => {
      directorMessageStreamListenersRef.current.delete(listener);
    };
  }, []);

  const emitDirectorMessageStreamSnapshot = useCallback((snapshot: DirectorMessageStreamSnapshot) => {
    latestDirectorMessageStreamSnapshotsRef.current.set(snapshot.messageId, snapshot);
    for (const listener of directorMessageStreamListenersRef.current) {
      listener(snapshot);
    }
  }, []);

  const getDirectorMessageStreamSnapshots = useCallback((chatId: string) => {
    return Array.from(latestDirectorMessageStreamSnapshotsRef.current.values()).filter(
      (snapshot) => snapshot.chatId === chatId
    );
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

    setSceneFrames((current) => {
      const nextFrames = activeSceneGroup.frames.map((frame) => {
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
      });

      if (
        current.length === nextFrames.length &&
        current.every((frame, index) => {
          const nextFrame = nextFrames[index];
          return (
            nextFrame &&
            frame.id === nextFrame.id &&
            frame.title === nextFrame.title &&
            frame.prompt === nextFrame.prompt &&
            frame.isCollapsed === nextFrame.isCollapsed &&
            frame.isRenaming === nextFrame.isRenaming &&
            frame.assets === nextFrame.assets &&
            frame.references === nextFrame.references
          );
        })
      ) {
        return current;
      }

      return nextFrames;
    });
    setSceneGroupReferences((current) => (current.length === 0 ? current : []));
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
  const referenceMentionOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
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

    void getProviderSettings()
      .then((settings) => {
        if (isMounted) {
          setProviderGeminiApiKey(settings.text.gemini.apiKey);
          setProviderGeminiApiKeyDraft(settings.text.gemini.apiKey);
        }
      })
      .catch((error) => {
        console.error('[crevn:renderer] provider settings failed', error);
      });

    const unsubscribe = subscribeToUpdateStatus((status) => {
      setUpdateStatus(status);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSaveProviderSettings = useCallback(async () => {
    setIsSavingProviderSettings(true);
    try {
      const settings = await updateProviderSettings({
        text: {
          gemini: {
            apiKey: providerGeminiApiKeyDraft,
          },
        },
      });
      setProviderGeminiApiKey(settings.text.gemini.apiKey);
      setProviderGeminiApiKeyDraft(settings.text.gemini.apiKey);
      toast.success('Provider key saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save provider key.'));
    } finally {
      setIsSavingProviderSettings(false);
    }
  }, [providerGeminiApiKeyDraft]);

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

  const referenceMentionTree = useMemo(
    () => buildReferenceMentionTree(savedReferences, referenceFolders),
    [savedReferences, referenceFolders]
  );
  const referenceMentionOptions = useMemo<ReferenceSelectorOption[]>(() => {
    if (!referenceMentionMatch) return [];

    const sortImages = (images: SavedReferenceImage[]) =>
      [...images].sort((left, right) => {
        const leftSection = left.section ?? 'angles';
        const rightSection = right.section ?? 'angles';
        if (leftSection !== rightSection) {
          return leftSection === 'primary' ? -1 : 1;
        }
        if (left.createdAt !== right.createdAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        return left.id.localeCompare(right.id);
      });

    const describeNode = (node: ReferenceTreeNode) => {
      if (node.kind === 'folder') {
        const childCount = getReferenceTreeChildren(referenceMentionTree, node.id).length;
        return childCount > 0
          ? `Pasta · ${childCount} ${childCount === 1 ? 'item' : 'itens'} — digite "." para abrir`
          : 'Pasta · digite "." para abrir';
      }
      if (node.images.length > 1) {
        const detail = node.description?.trim();
        return `${node.images.length} angles${detail ? ` · ${detail}` : ''}`;
      }
      return node.description?.trim() || 'Saved library reference';
    };

    const { base, steps, trailing, hasSeparator } = splitReferenceMentionPath(referenceMentionMatch.query);

    // --- Drill-down mode: a separator was typed after a mention chip. ---
    if (hasSeparator) {
      const currentNode = resolveReferenceMentionPathNode(referenceMentionTree, base, steps);
      if (!currentNode) return [];

      const folderTitle = getReferenceNodeTitlePath(currentNode, referenceMentionTree).join(' › ');

      const childNodes = getReferenceTreeChildren(referenceMentionTree, currentNode.id);
      const childOptions: ReferenceSelectorOption[] = childNodes.map((child) => {
        if (isNavigableReferenceNode(child, referenceMentionTree)) {
          // Replace the current chip with this folder's chip (no dangling
          // dotted text) and keep the caret on it so the next `.` drills in.
          return {
            id: `${currentNode.id}:${child.id}`,
            title: child.title,
            description: describeNode(child),
            previewUrl: child.previewUrl,
            insertId: child.id,
            insertTitle: child.title,
            selectorSuffix: '',
            folderTitle,
            keepSelectorOpen: true,
          };
        }
        // Single-image collection / solo image child: fold straight to it.
        const image = child.images[0];
        return {
          id: `${currentNode.id}:${child.id}`,
          title: image?.title ?? child.title,
          description: image?.description ?? child.description,
          previewUrl: image?.previewUrl ?? child.previewUrl,
          insertId: image?.id ?? child.id,
          insertTitle: image?.title ?? child.title,
          selectorSuffix: '',
          folderTitle,
        };
      });

      const imageOptions: ReferenceSelectorOption[] = sortImages(currentNode.images).map((reference, index) => ({
        id: `${currentNode.id}:${reference.id}`,
        title: reference.title,
        description: reference.description ?? currentNode.description,
        previewUrl: reference.previewUrl,
        // Fold the chosen image into the mention chip itself and clear the
        // dangling `.suffix` so nothing trails after the chip.
        insertId: reference.id,
        insertTitle: reference.title,
        selectorSuffix: '',
        folderTitle,
        selectorSlug: slugifyReferenceSelectorValue(reference.title || deriveReferenceAttachmentTitle(reference.name)),
        section: reference.section ?? (index === 0 ? 'primary' : 'angles'),
      }));

      return [...childOptions, ...imageOptions]
        .filter((option) =>
          trailing
            ? option.title.toLowerCase().includes(trailing) ||
              (option.selectorSlug ?? '').includes(slugifyReferenceSelectorValue(trailing))
            : true,
        )
        .slice(0, 24);
    }

    // --- Top level: list top-level folders / collections / solo images. ---
    const topNodes = getReferenceTreeChildren(referenceMentionTree, null);
    const savedOpts: ReferenceSelectorOption[] = topNodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: describeNode(node),
      previewUrl: node.previewUrl,
      insertId: node.id,
      insertTitle: node.title,
      keepSelectorOpen: isNavigableReferenceNode(node, referenceMentionTree),
    }));

    const attachedOpts: ReferenceSelectorOption[] = referenceImages.map((img) => {
      const titleWithoutExt = img.name.replace(/\.[^/.]+$/, "");
      return {
        id: img.id,
        title: titleWithoutExt,
        description: 'Attached inline image',
        previewUrl: img.previewUrl,
        insertId: img.id,
        insertTitle: titleWithoutExt,
      };
    });

    return [...savedOpts, ...attachedOpts]
      .filter((option) => option.title.toLowerCase().includes(base))
      .slice(0, 24);
  }, [referenceMentionMatch, referenceMentionTree, referenceImages]);
  const referenceMentionCandidates = useMemo(
    () => [
      ...referenceMentionTree.map((node) => ({
        id: node.id,
        title: node.title,
        previewUrl: node.previewUrl,
      })),
      ...referenceImages.map((image) => ({
        id: image.id,
        title: image.name.replace(/\.[^/.]+$/, ''),
        previewUrl: image.previewUrl,
      })),
    ],
    [referenceImages, referenceMentionTree]
  );

  useEffect(() => {
    setActiveReferenceMentionIndex(0);
  }, [referenceMentionMatch?.query, referenceMentionOptions.length]);

  useEffect(() => {
    if (referenceMentionOptions.length === 0) {
      referenceMentionOptionRefs.current = [];
      return;
    }

    referenceMentionOptionRefs.current[activeReferenceMentionIndex]?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [activeReferenceMentionIndex, referenceMentionOptions]);

  const selectedPromptReferences = useMemo(() => {
    const savedRefs = resolveSavedReferencesFromMentionIds(savedReferences, selectedPromptReferenceIds, referenceFolders);
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

  const insertReferenceMention = useCallback((option: ReferenceSelectorOption) => {
    const range = getReferenceMentionReplacementRange(referenceMentionMatch, cursorIndex);
    activeComposerRef.current?.insertMention(
      option.insertId,
      option.insertTitle,
      range,
      option.selectorSuffix,
      option.previewUrl,
      option.keepSelectorOpen,
    );
    holdComposerOpen();
  }, [activeComposerRef, cursorIndex, holdComposerOpen, referenceMentionMatch]);

  const handleReferenceMentionNavigation = useCallback(
    (key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape' | 'Tab') => {
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

      if (key === 'Enter' || key === 'Tab') {
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
    provider: string;
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
    sounds.select();
    toast.success('Image copied');
  }, []);

  const handleCopyGeneratedImagePrompt = useCallback(async (image: GeneratedImageRecord) => {
    const prompt = image.prompt?.trim();
    if (!prompt) {
      toast.error('No prompt saved for this image');
      return;
    }

    await navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied');
  }, []);

  const handleDownloadGeneratedImage = useCallback(async (image: GeneratedImageRecord) => {
    const didDownload = await downloadGeneratedImage(image.id);
    if (didDownload) {
      sounds.select();
      toast.success('Image downloaded');
    }
  }, []);

  const handleDeleteGeneratedImage = useCallback(async (image: GeneratedImageRecord) => {
    if (!image.fileUrl?.startsWith('blob:')) {
      await deleteGeneratedImage(image.id);
    }
    setGeneratedImages((current) => current.filter((entry) => entry.id !== image.id));
    setReferenceImages((current) => current.filter((reference) => reference.sourceImageId !== image.id));
    setPlayerSession((current) => {
      if (current?.image.sourceImageId === image.id) {
        revokePlayerSessionResources(current);
        return null;
      }
      return current;
    });
    sounds.select();
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
      setReferenceSeedFiles(files);
      setActiveStudioView('references');
      setActiveReferenceLibraryRoute('objects');
    } finally {
      setIsPreparingSelectedImagesReference(false);
    }
  }, [buildReferenceFilesFromGeneratedImages, selectedGeneratedImages]);

  const handleCreateReferenceFolder = useCallback(async (
    title: string,
    route: ReferenceLibraryRoute,
    parentFolderId?: string | null,
  ) => {
    const folder = await createReferenceFolder({ category: route, title, parentFolderId });
    setReferenceFolders((current) => upsertReferenceFolderRecord(current, folder));
    return folder;
  }, []);

  const handleAddImagesToFolder = useCallback(async ({
    folderId,
    category,
    folderTitle,
    newFiles,
    existingImages,
  }: {
    folderId: string;
    category: ReferenceLibraryRoute;
    folderTitle: string;
    newFiles: File[];
    existingImages: SavedReferenceImage[];
  }) => {
    const newAttachments = await Promise.all(newFiles.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return {
        name: file.name,
        title: deriveReferenceAttachmentTitle(file.name),
        mimeType: file.type || 'image/png',
        bytesBase64: bytesToBase64(bytes),
      };
    }));
    const existingAttachments = existingImages.map((img) => ({
      ...toReferenceCollectionAttachment(img),
    }));
    const folderDescription = existingImages[0]?.groupDescription;
    const updatedReferences = await updateReferenceCollection({
      category,
      collectionId: folderId,
      title: folderTitle,
      description: folderDescription,
      attachments: [...existingAttachments, ...newAttachments],
    });
    setSavedReferences((current) => [
      ...updatedReferences.map(toSavedReferenceImage),
      ...current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId),
    ]);
  }, []);

  const handleRenameFolder = useCallback(async ({
    folderId,
    category,
    newTitle,
  }: {
    folderId: string;
    category: ReferenceLibraryRoute;
    newTitle: string;
  }) => {
    const existingImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId) === folderId
    );
    const attachments = existingImages.map(toReferenceCollectionAttachment);
    const folderDescription = existingImages[0]?.groupDescription;
    const updatedReferences = await updateReferenceCollection({
      category,
      collectionId: folderId,
      title: newTitle,
      description: folderDescription,
      attachments,
    });
    setSavedReferences((current) => [
      ...updatedReferences.map(toSavedReferenceImage),
      ...current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId),
    ]);
    setReferenceFolders((current) => {
      const existingFolder = current.find((folder) => folder.id === folderId);
      if (!existingFolder) {
        return current;
      }
      return upsertReferenceFolderRecord(current, { ...existingFolder, title: newTitle });
    });
  }, []);

  const handleDeleteImageFromFolder = useCallback(async ({
    imageId,
    folderId,
    category,
    folderTitle,
  }: {
    imageId: string;
    folderId: string;
    category: ReferenceLibraryRoute;
    folderTitle: string;
  }) => {
    const remainingImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId) === folderId && ref.id !== imageId
    );
    if (remainingImages.length === 0) {
      await deleteReference({ id: imageId, category, collectionId: folderId });
      setSavedReferences((current) =>
        current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId)
      );
      setReferenceFolders((current) => removeReferenceFolderRecord(current, folderId));
      return;
    }
    const attachments = remainingImages.map(toReferenceCollectionAttachment);
    const folderDescription = remainingImages[0]?.groupDescription;
    const updatedReferences = await updateReferenceCollection({
      category,
      collectionId: folderId,
      title: folderTitle,
      description: folderDescription,
      attachments,
    });
    setSavedReferences((current) => [
      ...updatedReferences.map(toSavedReferenceImage),
      ...current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId),
    ]);
  }, []);

  const handleRenameReferenceImage = useCallback(async ({
    imageId,
    folderId,
    category,
    newTitle,
  }: {
    imageId: string;
    folderId: string;
    category: ReferenceLibraryRoute;
    newTitle: string;
  }) => {
    const folderImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId ?? ref.id) === folderId
    );
    const isCollection = folderImages.some((ref) => ref.collectionId || ref.environmentId);
    if (!isCollection) {
      const currentImage = folderImages.find((img) => img.id === imageId);
      const updated = await updateReference({
        id: imageId,
        category,
        title: newTitle,
        description: currentImage?.description,
      });
      setSavedReferences((current) =>
        current.map((ref) => (ref.id === imageId ? toSavedReferenceImage(updated) : ref))
      );
      return;
    }
    const folderTitle = folderImages[0]?.groupTitle?.trim() || folderImages[0]?.title || '';
    const attachments = folderImages.map((img) => ({
      ...toReferenceCollectionAttachment(img),
      title: img.id === imageId ? newTitle : img.title,
    }));
    const folderDescription = folderImages[0]?.groupDescription;
    const updatedReferences = await updateReferenceCollection({
      category,
      collectionId: folderId,
      title: folderTitle,
      description: folderDescription,
      attachments,
    });
    setSavedReferences((current) => [
      ...updatedReferences.map(toSavedReferenceImage),
      ...current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId),
    ]);
  }, []);

  const handleGroupReferenceImages = useCallback(async ({
    imageIds,
    category,
    newFolderTitle,
    sourceFolderId,
  }: {
    imageIds: string[];
    category: ReferenceLibraryRoute;
    newFolderTitle: string;
    sourceFolderId: string;
  }) => {
    const sourceImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId ?? ref.id) === sourceFolderId
    );
    const selected = sourceImages.filter((img) => imageIds.includes(img.id));
    if (selected.length === 0) return;

    // 1. Create the new folder and populate it with copies of the selected images.
    const folder = await createReferenceFolder({ category, title: newFolderTitle, parentFolderId: sourceFolderId });
    const createdRefs = await updateReferenceCollection({
      category,
      collectionId: folder.id,
      title: newFolderTitle,
      attachments: selected.map((img) => ({
        name: img.name,
        title: img.title,
        mimeType: img.mimeType,
        bytesBase64: img.bytesBase64,
        description: img.description,
        section: img.section,
      })),
    });

    // 2. Remove the selected images from the source folder.
    const remaining = sourceImages.filter((img) => !imageIds.includes(img.id));
    const sourceTitle = sourceImages[0]?.groupTitle?.trim() || sourceImages[0]?.title || '';
    const remainingRefs = await updateReferenceCollection({
      category,
      collectionId: sourceFolderId,
      title: sourceTitle,
      description: sourceImages[0]?.groupDescription,
      attachments: remaining.map(toReferenceCollectionAttachment),
    });

    setSavedReferences((current) => [
      ...createdRefs.map(toSavedReferenceImage),
      ...remainingRefs.map(toSavedReferenceImage),
      ...current.filter(
        (ref) =>
          (ref.collectionId ?? ref.environmentId) !== sourceFolderId &&
          (ref.collectionId ?? ref.environmentId) !== folder.id
      ),
    ]);
    setReferenceFolders((current) => upsertReferenceFolderRecord(current, folder));
  }, []);

  const handleMoveReferenceImages = useCallback(async ({
    imageIds,
    category,
    sourceFolderId,
    targetFolderId,
    targetFolderTitle,
  }: {
    imageIds: string[];
    category: ReferenceLibraryRoute;
    sourceFolderId: string;
    targetFolderId: string;
    targetFolderTitle: string;
  }) => {
    const sourceImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId ?? ref.id) === sourceFolderId
    );
    const targetImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId ?? ref.id) === targetFolderId
    );
    const selected = sourceImages.filter((img) => imageIds.includes(img.id));
    if (selected.length === 0) return;

    // Optimistic update: immediately remove from source so UI is snappy
    setSavedReferences((current) =>
      current.filter((ref) => !imageIds.includes(ref.id))
    );
    sounds.move();
    toast.success(`Moved ${selected.length === 1 ? '1 image' : `${selected.length} images`} to ${targetFolderTitle}`);

    const movedRefs = await updateReferenceCollection({
      category,
      collectionId: targetFolderId,
      title: targetFolderTitle,
      attachments: [
        ...targetImages.map(toReferenceCollectionAttachment),
        ...selected.map((img) => ({
          name: img.name,
          title: img.title,
          mimeType: img.mimeType,
          bytesBase64: img.bytesBase64,
          description: img.description,
          section: img.section,
        })),
      ],
    });

    const remaining = sourceImages.filter((img) => !imageIds.includes(img.id));
    const sourceTitle = sourceImages[0]?.groupTitle?.trim() || sourceImages[0]?.title || '';
    const remainingRefs = await updateReferenceCollection({
      category,
      collectionId: sourceFolderId,
      title: sourceTitle,
      description: sourceImages[0]?.groupDescription,
      attachments: remaining.map(toReferenceCollectionAttachment),
    });

    setSavedReferences((current) => [
      ...movedRefs.map(toSavedReferenceImage),
      ...remainingRefs.map(toSavedReferenceImage),
      ...current.filter(
        (ref) =>
          (ref.collectionId ?? ref.environmentId) !== sourceFolderId &&
          (ref.collectionId ?? ref.environmentId) !== targetFolderId
      ),
    ]);
  }, []);

  const handleUpdateReferenceMetadata = useCallback(async ({
    folderId,
    category,
    draft,
  }: {
    folderId: string;
    category: ReferenceLibraryRoute;
    draft: ReferenceMetadataDraft;
  }) => {
    const folderImages = savedReferencesRef.current.filter(
      (ref) => (ref.collectionId ?? ref.environmentId ?? ref.id) === folderId
    );
    const isCollection = folderImages.some((ref) => ref.collectionId || ref.environmentId);

    if (!isCollection && draft.images.length === 1) {
      const imageDraft = draft.images[0];
      if (!imageDraft) return;
      const updated = await updateReference({
        id: imageDraft.id,
        category,
        title: imageDraft.title,
        description: imageDraft.description,
      });
      setSavedReferences((current) =>
        current.map((ref) => (ref.id === imageDraft.id ? toSavedReferenceImage(updated) : ref))
      );
      return;
    }

    const updatedReferences = await updateReferenceCollection({
      category,
      collectionId: folderId,
      title: draft.title,
      description: draft.description,
      attachments: draft.images.map((imageDraft) => {
        const currentImage = folderImages.find((image) => image.id === imageDraft.id);
        return {
          id: imageDraft.id,
          name: currentImage?.name ?? imageDraft.name,
          title: imageDraft.title,
          mimeType: currentImage?.mimeType ?? 'image/png',
          bytesBase64: currentImage?.bytesBase64 ?? '',
          description: imageDraft.description,
          section: currentImage?.section,
        };
      }),
    });
    setSavedReferences((current) => [
      ...updatedReferences.map(toSavedReferenceImage),
      ...current.filter((ref) => ref.collectionId !== folderId && ref.environmentId !== folderId),
    ]);
    setReferenceFolders((current) => {
      const existingFolder = current.find((folder) => folder.id === folderId);
      if (!existingFolder) return current;
      return upsertReferenceFolderRecord(current, {
        ...existingFolder,
        title: draft.title,
        description: draft.description,
      });
    });
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

  const runDirectorTurn = useCallback(async ({
    chatId,
    threadId,
    promptText,
    optimisticReferences,
    optimisticModelId,
    optimisticModelLabel,
    replaceAssistantMessageId,
    performRequest,
  }: {
    chatId: string;
    threadId: string;
    promptText: string;
    optimisticReferences: AttachmentRecord[];
    optimisticModelId?: string | null;
    optimisticModelLabel?: string | null;
    replaceAssistantMessageId?: string | null;
    performRequest: () => Promise<Awaited<ReturnType<typeof sendDirectorMessage>>>;
  }) => {
    const optimisticRunId = `director-optimistic-${Date.now()}`;
    const optimisticTimestamp = new Date().toISOString();
    const optimisticUserMessage: DirectorMessageRecord = {
      id: `${optimisticRunId}-user`,
      chatId,
      role: 'user',
      parts: [{ type: 'text', text: promptText }],
      status: 'completed',
      modelId: null,
      modelLabel: null,
      fastMode: false,
      references: optimisticReferences,
      createdAt: optimisticTimestamp,
      updatedAt: optimisticTimestamp,
    };
    const optimisticAssistantMessage: DirectorMessageRecord = {
      id: `${optimisticRunId}-assistant`,
      chatId,
      role: 'assistant',
      parts: [],
      status: 'streaming',
      modelId: optimisticModelId ?? null,
      modelLabel: optimisticModelLabel ?? null,
      fastMode: effectiveFastMode,
      references: [],
      createdAt: optimisticTimestamp,
      updatedAt: optimisticTimestamp,
    };

    setActiveDirectorRunsByChatId((current) => ({
      ...current,
      [chatId]: {
        chatId,
        threadId,
        messageId: replaceAssistantMessageId ?? optimisticAssistantMessage.id,
        modelId: optimisticAssistantMessage.modelId,
        modelLabel: optimisticAssistantMessage.modelLabel,
        fastMode: false,
        startedAt: optimisticAssistantMessage.createdAt,
      },
    }));
    setDirectorMessagesByChatId((current) => {
      const currentMessages =
        current[chatId] ??
        directorMessagesByChatIdRef.current[chatId] ??
        directorMessagesCacheRef.current[chatId] ??
        [];
      const nextAssistantMessage = replaceAssistantMessageId
        ? { ...optimisticAssistantMessage, id: replaceAssistantMessageId }
        : optimisticAssistantMessage;
      const nextMessages = replaceAssistantMessageId
        ? mergeDirectorMessages(currentMessages, [nextAssistantMessage])
        : mergeDirectorMessages(currentMessages, [
            optimisticUserMessage,
            nextAssistantMessage,
          ]);
      return limitDirectorMessagesByChatId({
        ...current,
        [chatId]: nextMessages,
      }, chatId);
    });

    let result: Awaited<ReturnType<typeof sendDirectorMessage>>;
    try {
      result = await performRequest();
    } catch (error) {
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[chatId];
        return next;
      });
      setDirectorMessagesByChatId((current) =>
        limitDirectorMessagesByChatId({
          ...current,
          [chatId]: mergeDirectorMessages(
            (current[chatId] ?? []).filter((message) =>
              replaceAssistantMessageId ? message.id !== replaceAssistantMessageId : message.id !== optimisticAssistantMessage.id
            ),
            [
              {
                ...optimisticAssistantMessage,
                id: replaceAssistantMessageId ?? optimisticAssistantMessage.id,
                status: 'failed',
                parts: [
                  {
                    type: 'text',
                    text: error instanceof Error ? error.message : 'Director failed to start.',
                  },
                ],
                updatedAt: new Date().toISOString(),
              },
            ]
          ),
        }, chatId)
      );
      sounds.error();
      throw error;
    }

    sounds.notification();

    if (result.chat) {
      setDirectorChatsByThreadId((current) => ({
        ...current,
        [threadId]: [
          { ...result.chat, isStreaming: false },
          ...(current[threadId] ?? []).filter((chat) => chat.id !== result.chat?.id),
        ],
      }));
    }

    setActiveDirectorRunsByChatId((current) => {
      const next = { ...current };
      delete next[chatId];
      return next;
    });

    setDirectorMessagesByChatId((current) =>
      limitDirectorMessagesByChatId({
        ...current,
        [chatId]: mergeDirectorMessages(
          (current[chatId] ?? []).filter(
            (message) =>
              message.id !== optimisticUserMessage.id &&
              message.id !== optimisticAssistantMessage.id &&
              message.id !== replaceAssistantMessageId
          ),
          [result.userMessage, result.assistantMessage]
        ),
      }, chatId)
    );

    return result;
  }, [effectiveFastMode, limitDirectorMessagesByChatId]);

  const applyUpdatedDirectorMessage = useCallback((message: DirectorMessageRecord | null) => {
    if (!message) {
      return;
    }

    setDirectorMessagesByChatId((current) => {
      const currentMessages =
        current[message.chatId] ??
        directorMessagesByChatIdRef.current[message.chatId] ??
        directorMessagesCacheRef.current[message.chatId] ??
        [];
      const nextMessagesByChatId = limitDirectorMessagesByChatId({
        ...current,
        [message.chatId]: mergeDirectorMessages(currentMessages, [message]),
      }, message.chatId);
      directorMessagesByChatIdRef.current = nextMessagesByChatId;
      directorMessagesCacheRef.current[message.chatId] = nextMessagesByChatId[message.chatId] ?? [];
      return nextMessagesByChatId;
    });
  }, [limitDirectorMessagesByChatId]);

  const handleApproveDirectorAction = useCallback(async (messageId: string, actionIndex: number) => {
    const clientRunId = `director-${messageId}-${actionIndex}`;
    const messages =
      (activeDirectorChatId ? directorMessagesByChatIdRef.current[activeDirectorChatId] : null) ??
      Object.values(directorMessagesByChatIdRef.current).find((entries) =>
        entries.some((message) => message.id === messageId)
      ) ??
      [];
    const sourceMessage = messages.find((message) => message.id === messageId);
    const toolParts = sourceMessage?.parts.filter(
      (part): part is Extract<DirectorMessagePart, { type: 'tool-generateImages' }> =>
        part.type === 'tool-generateImages'
    ) ?? [];
    const targetPart = toolParts[actionIndex] ?? null;
    const requestedCount = Math.max(1, targetPart?.input.count ?? 1);
    const generationStartedAt = new Date().toISOString();
    const loadingEntries = createLoadingEntries(clientRunId, requestedCount, {
      provider: 'codex',
      modelId: 'codex-gpt-5-4-mini',
      modelLabel: 'GPT-5.4 Mini',
      generationStartedAt,
    });

    if (selectedThreadId) {
      setActiveRunsById((current) => {
        const nextState = {
          ...current,
          [clientRunId]: {
            clientRunId,
            threadId: selectedThreadId,
            mode: 'director' as const,
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'GPT-5.4 Mini',
            generationStartedAt,
            loadingEntries,
          },
        };
        activeRunsRef.current = nextState;
        return nextState;
      });
      setGeneratedImages((current) => [
        ...loadingEntries,
        ...current.filter((image) => !isLoadingEntryForRun(image, clientRunId)),
      ]);
    }

    try {
      const updatedMessage = await approveDirectorAction({ messageId, actionIndex, clientRunId });
      applyUpdatedDirectorMessage(updatedMessage);
    } catch (error) {
      setActiveRunsById((current) => {
        const nextState = { ...current };
        delete nextState[clientRunId];
        activeRunsRef.current = nextState;
        return nextState;
      });
      setGeneratedImages((current) => current.filter((image) => !isLoadingEntryForRun(image, clientRunId)));
      throw error;
    }
  }, [activeDirectorChatId, applyUpdatedDirectorMessage, selectedThreadId]);

  const handleDeclineDirectorAction = useCallback(async (messageId: string, actionIndex: number) => {
    const updatedMessage = await declineDirectorAction({ messageId, actionIndex });
    applyUpdatedDirectorMessage(updatedMessage);
  }, [applyUpdatedDirectorMessage]);

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

    clearComposerAfterSubmit();

    const selectedSavedReferences = resolveSavedReferenceSelections(
      savedReferences,
      selectedPromptReferenceIds,
      prompt.trim(),
      referenceFolders,
    );
    const seenDirectorReferenceBytes = new Set<string>();
    const referencePayload = [
      ...selectedSavedReferences.map((selection) => {
        const reference = selection.reference;
        seenDirectorReferenceBytes.add(reference.bytesBase64);
        return {
          name: reference.name,
          mimeType: reference.mimeType,
          bytesBase64: reference.bytesBase64,
          title: reference.title,
          description: buildSavedReferenceDescription(selection),
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
    const optimisticReferenceAttachments = referencePayload.map((reference) => ({
      name: reference.name,
      title: reference.title ?? null,
      description: reference.description ?? null,
      mimeType: reference.mimeType,
      previewUrl: `data:${reference.mimeType};base64,${reference.bytesBase64}`,
    }));
    await runDirectorTurn({
      chatId: targetChatId,
      threadId: activeThreadId,
      promptText,
      optimisticReferences: optimisticReferenceAttachments,
      optimisticModelId: selectedModel.id,
      optimisticModelLabel: selectedModel.label,
      performRequest: () =>
        sendDirectorMessage({
          chatId: targetChatId,
          threadId: activeThreadId,
          prompt: promptText,
          modelId: selectedModel.id,
          referenceImages: referencePayload,
        }),
    });
  }, [
    activeDirectorChatId,
    activeDirectorRun,
    clearComposerAfterSubmit,
    ensureProjectThreadWorkspace,
    runDirectorTurn,
    prompt,
    referenceImages,
    savedReferences,
    selectedModel.id,
    selectedModel.label,
    selectedPromptReferenceIds,
    selectedProjectId,
    setSelectedThreadIdImmediately,
    selectedThreadId,
  ]);

  const handleRegenerateDirectorResponse = useCallback(async (assistantMessageId: string) => {
    const activeThreadId = selectedThreadId;
    const chatId = activeDirectorChatId;
    if (!activeThreadId || !chatId || activeDirectorRunsRef.current[chatId]) {
      return;
    }

    const messages =
      directorMessagesByChatIdRef.current[chatId] ??
      directorMessagesCacheRef.current[chatId] ??
      [];
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantMessageId && message.role === 'assistant'
    );
    if (assistantIndex <= 0) {
      return;
    }

    const sourceUserMessage = messages[assistantIndex - 1];
    const sourceAssistantMessage = messages[assistantIndex];
    if (sourceUserMessage?.role !== 'user') {
      return;
    }

    const promptText = getDirectorText(sourceUserMessage.parts).trim();
    if (!promptText) {
      return;
    }

    await runDirectorTurn({
      chatId,
      threadId: activeThreadId,
      promptText,
      optimisticReferences: (sourceUserMessage.references ?? []) as AttachmentRecord[],
      optimisticModelId: sourceAssistantMessage?.modelId ?? null,
      optimisticModelLabel: sourceAssistantMessage?.modelLabel ?? null,
      replaceAssistantMessageId: assistantMessageId,
      performRequest: () =>
        regenerateDirectorMessage({
          chatId,
          threadId: activeThreadId,
          assistantMessageId,
        }),
    });
  }, [activeDirectorChatId, runDirectorTurn, selectedThreadId]);

  const handleCancelActiveDirectorChat = useCallback(async () => {
    if (!activeDirectorChatId) {
      return;
    }
    await cancelDirectorChat(activeDirectorChatId);
  }, [activeDirectorChatId]);

  const appendReferenceImages = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const existingNames = referenceImagesRef.current.map((reference) => reference.name);
    const nextNames: string[] = [];

    const nextReferenceImages = await Promise.all(
      imageFiles.map(async (file, index) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const uniqueName = getUniqueAttachmentName(file.name, [...existingNames, ...nextNames]);
        nextNames.push(uniqueName);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${index}`,
          name: uniqueName,
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

  const handlePasteSceneFrameOutput = useCallback(async (frameId: string) => {
    try {
      const updatedSceneGroup = await pasteClipboardImageToSceneFrame(frameId);
      if (!updatedSceneGroup) {
        toast.error('Clipboard does not contain an image.');
        return;
      }

      const nextSceneGroup = toSceneGroupUi(updatedSceneGroup);
      setSceneGroups((current) =>
        current.map((sceneGroup) => (sceneGroup.id === nextSceneGroup.id ? nextSceneGroup : sceneGroup))
      );
      if (activeSceneGroupId === nextSceneGroup.id) {
        setSceneFrames(nextSceneGroup.frames);
      }
      toast.success('Clipboard image added');
    } catch (error) {
      console.error('Failed to paste clipboard image into frame output', error);
      toast.error(getErrorMessage(error, 'Failed to paste clipboard image.'));
    }
  }, [activeSceneGroupId]);

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
        modelId: selectedModel.capabilities.includes('text') ? selectedModel.id : getDefaultModelOption('text').id,
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

  const handleImportCrenv = useCallback(async (targetProjectId: string | null = selectedProjectId) => {
    try {
      const result = await importCrenv(targetProjectId);
      if (result.status === 'canceled') {
        return;
      }

      const nextProjects = await refreshProjects();
      const nextProjectId = result.projectId ?? targetProjectId ?? nextProjects[0]?.id ?? null;
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

      const [references, folders] = await Promise.all([
        listReferences(),
        listReferenceFolders(),
      ]);
      setSavedReferences((current) => {
        for (const reference of current) {
          revokeReferencePreviewUrl(reference);
        }
        return references.map(toSavedReferenceImage);
      });
      setReferenceFolders(sortReferenceFolders(folders));

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
    const currentShotCount = shotCount;
    const currentSelectedAspectRatio = selectedAspectRatio;
    let currentReferenceImages = [...referenceImages];
    const currentGeneratedImages = [...generatedImages];
    const currentSavedReferences = [...savedReferences];
    const currentReferenceFolders = [...referenceFolders];
    const currentSelectedPromptReferenceIds = [...selectedPromptReferenceIds];

    // Show the loading state immediately so the first generation feels instant,
    // before any (potentially slow) reference rehydration/encoding work runs.
    registerActiveRun({
      clientRunId,
      threadId: activeThreadId,
      mode: 'manual',
      count: currentShotCount,
      provider: selectedProviderId,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
    });
    clearComposerAfterSubmit();
    toast.message('Generation started');

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

      const uniqueReferenceImages: Array<{
        name: string;
        title: string;
        description?: string;
        mimeType: string;
        bytesBase64: string;
        matchText: string;
        promptLabel: string;
      }> = [];
      const seenBytes = new Set<string>();

      // 1. Add mentioned saved references
      const selectedSavedReferences = resolveSavedReferenceSelections(
        currentSavedReferences,
        currentSelectedPromptReferenceIds,
        trimmedPrompt,
        currentReferenceFolders,
      );
      for (const selection of selectedSavedReferences) {
        const ref = selection.reference;
        if (ref.bytesBase64) {
          seenBytes.add(ref.bytesBase64);
        }
        uniqueReferenceImages.push({
          name: ref.name,
          title: ref.title,
          description: buildSavedReferenceDescription(selection),
          mimeType: ref.mimeType,
          bytesBase64: ref.bytesBase64,
          matchText: selection.matchText,
          promptLabel:
            selection.groupSize > 1 && selection.selectorApplied
              ? `${selection.mentionTitle} - ${ref.title}`
              : selection.mentionTitle,
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
          title: img.name.replace(/\.[^/.]+$/, ''),
          mimeType: img.mimeType,
          bytesBase64: img.bytesBase64,
          matchText: img.name.replace(/\.[^/.]+$/, ''),
          promptLabel: img.name.replace(/\.[^/.]+$/, ''),
        });
      }

      // 3. Map prompt reference names to RefImageX (Name) placeholder format
      let mappedPrompt = trimmedPrompt;
      const refsForReplacementByTitle = new Map<string, { title: string; placeholder: string }>();
      uniqueReferenceImages.forEach((ref, index) => {
        if (!ref.matchText || refsForReplacementByTitle.has(ref.matchText)) {
          return;
        }
        refsForReplacementByTitle.set(ref.matchText, {
          title: ref.matchText,
          placeholder: `RefImage${index + 1} (${ref.promptLabel})`,
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

      const generationPrompt = [mappedPrompt, '', `Aspect ratio: ${currentSelectedAspectRatio}`].join('\n');

      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: selectedProviderId,
        modelId: selectedModel.id,
        mode: 'manual',
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
      sounds.success();
      toast.success(result.assets.length > 0 ? `Generated ${result.assets.length} images` : 'Generation complete');
    } catch (error) {
      sounds.error();
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
    generatedImages,
    effectiveFastMode,
    prompt,
    referenceImages,
    refreshProjects,
    registerActiveRun,
    savedReferences,
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

    const existingNames = playerSession?.characterReferences.map((reference) => reference.name) ?? [];
    const nextNames: string[] = [];

    const nextReferenceImages = await Promise.all(
      imageFiles.map(async (file, index) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const uniqueName = getUniqueAttachmentName(file.name, [...existingNames, ...nextNames]);
        nextNames.push(uniqueName);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${index}`,
          name: uniqueName,
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
    const imageModel = selectedModel.capabilities.includes('image') ? selectedModel : getDefaultModelOption('image');
    const imageProviderId = imageModel.providerId;

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
      provider: imageProviderId,
      modelId: imageModel.id,
      modelLabel: imageModel.label,
    });
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: imageProviderId,
        modelId: imageModel.id,
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
      sounds.success();
      toast.success(result.assets.length > 0 ? 'Generated 1 image' : 'Generation complete');
    } catch (error) {
      sounds.error();
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
    selectedProjectId,
    setSelectedThreadIdImmediately,
    selectedThreadId,
  ]);

  const handleCameraGenerate = useCallback(async () => {
    const session = playerSession;
    if (!session) {
      return;
    }
    const imageModel = selectedModel.capabilities.includes('image') ? selectedModel : getDefaultModelOption('image');
    const imageProviderId = imageModel.providerId;

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
      provider: imageProviderId,
      modelId: imageModel.id,
      modelLabel: imageModel.label,
    });
    closePlayer();
    toast.message('Generation started');

    try {
      const result = await generateImages({
        clientRunId,
        fastMode: effectiveFastMode,
        provider: imageProviderId,
        modelId: imageModel.id,
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
      sounds.success();
      toast.success(
        result.assets.length === 1
          ? 'Generated 1 image'
          : result.assets.length > 1
            ? `Generated ${result.assets.length} images`
            : 'Generation complete'
      );
    } catch (error) {
      sounds.error();
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
        const workspace = await withStartupTimeout(ensureProjectThreadWorkspace(), 'Startup workspace load');
        const [nextProjects, images, references, folders] = await withStartupTimeout(
          Promise.all([
            listProjectsWithThreads(),
            listGeneratedImages(workspace.thread.id),
            listReferences(),
            listReferenceFolders(),
          ]),
          'Startup project data load'
        );
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
          setReferenceFolders(sortReferenceFolders(folders));
        }
      } catch (error) {
        console.error('Failed to load workspace', error);
        if (!cancelled) {
          toast.error(getErrorMessage(error, 'Startup took too long. Opening the app shell.'));
        }
      } finally {
        if (!cancelled) {
          setIsAppReady(true);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [setSelectedThreadIdImmediately, syncVisibleThreadImages]);

  // Warm up the img-fx shared renderer once the app has settled, while the
  // browser is idle, so the GPU/shader init happens off the critical path.
  useEffect(() => {
    if (!isAppReady) {
      return undefined;
    }

    const idle = window.requestIdleCallback?.bind(window);
    if (idle) {
      const handle = idle(() => setShouldWarmImageFx(true), { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setShouldWarmImageFx(true), 1200);
    return () => window.clearTimeout(timer);
  }, [isAppReady]);

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
      latestDirectorMessageStreamSnapshotsRef.current.delete(event.assistantMessage.id);
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
        const incomingMessages = [event.userMessage, event.assistantMessage];
        const currentMessages = removeMatchingOptimisticDirectorMessages(
          current[event.chatId] ?? [],
          incomingMessages
        );
        const nextMessagesByChatId = limitDirectorMessagesByChatId({
          ...current,
          [event.chatId]: mergeDirectorMessages(currentMessages, incomingMessages),
        }, event.chatId);
        directorMessagesByChatIdRef.current = nextMessagesByChatId;
        directorMessagesCacheRef.current[event.chatId] = nextMessagesByChatId[event.chatId] ?? [];
        return nextMessagesByChatId;
      });
    });
  }, [limitDirectorMessagesByChatId]);

  useEffect(() => {
    return subscribeToDirectorMessageDelta((event) => {
      pendingDirectorDeltaByMessageIdRef.current[event.messageId] = {
        chatId: event.chatId,
        parts: event.parts,
      };

      if (directorDeltaFlushTimerRef.current !== null) {
        return;
      }

      directorDeltaFlushTimerRef.current = window.setTimeout(() => {
        const pendingDeltas = pendingDirectorDeltaByMessageIdRef.current;
        pendingDirectorDeltaByMessageIdRef.current = {};
        directorDeltaFlushTimerRef.current = null;

        let nextMessagesByChatId = directorMessagesByChatIdRef.current;
        let touchedChatId: string | undefined;

        for (const [messageId, pendingDelta] of Object.entries(pendingDeltas)) {
          touchedChatId = pendingDelta.chatId;
          if (!nextMessagesByChatId[pendingDelta.chatId] && directorMessagesCacheRef.current[pendingDelta.chatId]) {
            nextMessagesByChatId = {
              ...nextMessagesByChatId,
              [pendingDelta.chatId]: directorMessagesCacheRef.current[pendingDelta.chatId],
            };
          }
          nextMessagesByChatId = updateDirectorMessagesByChat(
            nextMessagesByChatId,
            pendingDelta.chatId,
            messageId,
            pendingDelta.parts,
            'streaming'
          );
          directorMessagesCacheRef.current[pendingDelta.chatId] =
            nextMessagesByChatId[pendingDelta.chatId] ?? directorMessagesCacheRef.current[pendingDelta.chatId] ?? [];
          emitDirectorMessageStreamSnapshot({
            chatId: pendingDelta.chatId,
            messageId,
            parts: pendingDelta.parts,
            status: 'streaming',
          });
        }

        directorMessagesByChatIdRef.current = limitDirectorMessagesByChatId(nextMessagesByChatId, touchedChatId);
      }, DIRECTOR_STREAM_FLUSH_INTERVAL_MS);
    });
  }, [emitDirectorMessageStreamSnapshot, limitDirectorMessagesByChatId]);

  useEffect(() => {
    return () => {
      if (directorDeltaFlushTimerRef.current !== null) {
        window.clearTimeout(directorDeltaFlushTimerRef.current);
      }
      directorDeltaFlushTimerRef.current = null;
      pendingDirectorDeltaByMessageIdRef.current = {};
      latestDirectorMessageStreamSnapshotsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return subscribeToDirectorMessageComplete((event) => {
      delete pendingDirectorDeltaByMessageIdRef.current[event.messageId];
      latestDirectorMessageStreamSnapshotsRef.current.delete(event.messageId);
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[event.chatId];
        return next;
      });
      setDirectorMessagesByChatId((current) => {
        const nextMessagesByChatId = limitDirectorMessagesByChatId(
          updateDirectorMessagesByChat(
            current,
            event.chatId,
            event.messageId,
            event.parts,
            'completed',
            new Date().toISOString()
          ),
          event.chatId
        );
        directorMessagesByChatIdRef.current = nextMessagesByChatId;
        directorMessagesCacheRef.current[event.chatId] = nextMessagesByChatId[event.chatId] ?? [];
        return nextMessagesByChatId;
      });
      void loadDirectorChatsForThread(event.threadId).catch(() => {});
    });
  }, [limitDirectorMessagesByChatId, loadDirectorChatsForThread]);

  useEffect(() => {
    return subscribeToDirectorMessageError((event) => {
      delete pendingDirectorDeltaByMessageIdRef.current[event.messageId];
      latestDirectorMessageStreamSnapshotsRef.current.delete(event.messageId);
      setActiveDirectorRunsByChatId((current) => {
        const next = { ...current };
        delete next[event.chatId];
        return next;
      });
      setDirectorMessagesByChatId((current) => {
        const nextMessagesByChatId = limitDirectorMessagesByChatId(
          updateDirectorMessagesByChat(
            current,
            event.chatId,
            event.messageId,
            event.parts,
            'failed',
            new Date().toISOString(),
            event.errorMessage
          ),
          event.chatId
        );
        directorMessagesByChatIdRef.current = nextMessagesByChatId;
        directorMessagesCacheRef.current[event.chatId] = nextMessagesByChatId[event.chatId] ?? [];
        return nextMessagesByChatId;
      });
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
      const shellChromeWidth = (isSidebarCollapsed ? 28 + 8 : 0) + 20 + 20 + 2;
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
      <AnimatePresence>
        {!isAppReady ? (
          <motion.div
            key="app-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]"
          >
            <motion.div
              className="relative inline-block"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <img src={logo} alt="crevn logo" className="app-splash-logo block h-10 w-auto" />
              <span
                aria-hidden
                className="logo-shimmer"
                style={{
                  maskImage: `url(${logo})`,
                  WebkitMaskImage: `url(${logo})`,
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {shouldWarmImageFx ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            width: 8,
            height: 8,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <ImageGeneration
            preset="pixels-organic"
            theme="dark"
            paused
            strength={1}
            cardBg="rgb(32, 32, 33)"
            borderRadius={0}
            className="h-full w-full"
          >
            <div className="h-full w-full" />
          </ImageGeneration>
        </div>
      ) : null}
      <Toaster position="bottom-right" />
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
            if (deletingReference.collectionId || deletingReference.environmentId) {
              setReferenceFolders((current) =>
                removeReferenceFolderRecord(
                  current,
                  deletingReference.collectionId ?? deletingReference.environmentId ?? deletingReference.id,
                ),
              );
            }
            setDeletingReference(null);
            toast.success('Reference deleted');
          }}
        />
      ) : null}

      <div
        className={[
          'absolute inset-0 z-0',
          isDirectorWorkspace ? 'overflow-hidden' : 'overflow-y-auto pt-[60px]',
          'transition-[padding-left,padding-right,padding-bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isDirectorWorkspace
            ? ''
            : activeStudioView === 'generation'
              ? isClassicWorkspace
                ? isExpanded
                  ? 'pb-[360px]'
                  : 'pb-[180px]'
                : 'pb-10'
              : 'pb-10',
          isSidebarCollapsed ? 'pl-0' : 'pl-[260px]',
        ].join(' ')}
        style={{ paddingRight: isScenesWorkspace || isDirectorWorkspace || activeStudioView === 'references' ? scenesSidebarWidth + 24 : 0 }}
      >
        <AnimatePresence initial={false}>
          {activeStudioView === 'references' ? (
            <ReferencesWorkspace
              key="references-workspace"
              folders={referenceFolders}
              references={savedReferences}
              route={activeReferenceLibraryRoute}
              sidebarWidth={scenesSidebarWidth}
              isSidebarCollapsed={isSidebarCollapsed}
              isSidebarResizing={isScenesSidebarResizing}
              onStartSidebarResize={startScenesSidebarResize}
              seedFiles={referenceSeedFiles}
              onSeedFilesConsumed={() => setReferenceSeedFiles([])}
              onCreateFolder={handleCreateReferenceFolder}
              onAddImages={handleAddImagesToFolder}
              onRenameFolder={handleRenameFolder}
              onRenameImage={handleRenameReferenceImage}
              onGroupImages={handleGroupReferenceImages}
              onMoveImages={handleMoveReferenceImages}
              onUpdateReferenceMetadata={handleUpdateReferenceMetadata}
              onDeleteImageFromFolder={handleDeleteImageFromFolder}
              onDeleteReference={(reference) =>
                setDeletingReference({
                  id: reference.id,
                  category: reference.category,
                  collectionId: reference.collectionId,
                  environmentId: reference.environmentId,
                  title: getSharedReferenceTitle(reference),
                })
              }
              onExportReference={handleExportReference}
              onImportReference={() => void handleImportReference()}
            />
          ) : activeStudioView === 'providers' ? (
            <ProvidersWorkspace
              key="providers-workspace"
              geminiApiKey={providerGeminiApiKey}
              geminiApiKeyDraft={providerGeminiApiKeyDraft}
              isKeyVisible={isProviderKeyVisible}
              isSaving={isSavingProviderSettings}
              onGeminiApiKeyChange={setProviderGeminiApiKeyDraft}
              onKeyVisibleChange={setIsProviderKeyVisible}
              onSave={() => void handleSaveProviderSettings()}
            />
          ) : (
            <div
              key="generation-workspace"
              className={isDirectorWorkspace ? 'relative h-full w-full' : 'relative min-h-full w-full'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isClassicWorkspace ? (
                  <motion.section
                    key="classic-workspace"
                    initial={{ opacity: 0, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative min-h-full w-full"
                    onDragEnter={(event) => {
                      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
                      event.preventDefault();
                      classicGridDragDepthRef.current += 1;
                      setIsClassicGridDragActive(true);
                    }}
                    onDragOver={(event) => {
                      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                    }}
                    onDragLeave={(event) => {
                      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
                      event.preventDefault();
                      classicGridDragDepthRef.current = Math.max(0, classicGridDragDepthRef.current - 1);
                      if (classicGridDragDepthRef.current === 0) {
                        setIsClassicGridDragActive(false);
                      }
                    }}
                    onDrop={(event) => {
                      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
                      event.preventDefault();
                      classicGridDragDepthRef.current = 0;
                      setIsClassicGridDragActive(false);
                      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                      if (files.length === 0) return;
                      const newImages = files.map((file) => ({
                        id: crypto.randomUUID(),
                        fileUrl: URL.createObjectURL(file),
                        fileName: file.name,
                        createdAt: new Date().toISOString(),
                        provider: null as string | null,
                        modelId: null as string | null,
                        modelLabel: 'Imported',
                      }));
                      setGeneratedImages((current) => [...newImages, ...current]);
                    }}
                  >
                    {isClassicGridDragActive ? (
                      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-[var(--accent)] bg-[var(--surface)]/90 px-10 py-8 shadow-xl">
                          <ImagePlus className="size-8 text-[var(--accent)]" />
                          <span className="text-[16px] font-medium text-[var(--foreground)]">Solte para adicionar ao painel</span>
                        </div>
                      </div>
                    ) : null}
                    <GeneratedImageGrid
                      images={generatedImages}
                      className="min-h-full w-full"
                      loadingEffect="img-fx"
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
                      onImageCopyPrompt={(image) => {
                        void handleCopyGeneratedImagePrompt(image as GeneratedImageRecord).catch((error) => {
                          console.error('Failed to copy generated image prompt', error);
                          toast.error(getErrorMessage(error, 'Failed to copy generated image prompt.'));
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
                    initial={{ opacity: 0, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
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
                    onPasteFrameOutput={handlePasteSceneFrameOutput}
                    onOpenImage={openGeneratedImagePlayer}
                    onCopyImage={(image) => {
                      void handleCopyGeneratedImage(image).catch((error) => {
                        console.error('Failed to copy scene output image', error);
                        toast.error(getErrorMessage(error, 'Failed to copy scene output image.'));
                      });
                    }}
                  />
                  </motion.section>
                ) : null}

                {isDirectorWorkspace ? (
                  <motion.section
                    key="director-workspace-panel"
                    initial={{ opacity: 0, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full w-full"
                  >
                    <DirectorWorkspace
                      chatId={activeDirectorChatId}
                      messages={activeDirectorMessages}
                      isComposerExpanded={isExpanded}
                      hasReferenceImages={hasReferenceImages}
                      onSubscribeMessageStream={subscribeToDirectorMessageStream}
                      onGetMessageStreamSnapshots={getDirectorMessageStreamSnapshots}
                      onApproveAction={handleApproveDirectorAction}
                      onDeclineAction={handleDeclineDirectorAction}
                      onRegenerateMessage={(messageId) => {
                        void handleRegenerateDirectorResponse(messageId).catch((error) => {
                          console.error('Failed to regenerate Director response', error);
                          toast.error(getErrorMessage(error, 'Failed to regenerate Director response.'));
                        });
                      }}
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
                className="pointer-events-none absolute left-0 top-0 inline-flex h-9 items-center rounded-full border border-transparent px-2.5 opacity-0"
              >
                <div
                  className="overflow-hidden"
                  style={{
                    width: isSidebarCollapsed ? 28 : 0,
                    marginRight: isSidebarCollapsed ? 8 : 0,
                  }}
                >
                  <span className="block h-7 w-7" />
                </div>
                <div
                  ref={headerTitleMeasureRef}
                  className="inline-flex items-center whitespace-nowrap text-[16px] font-medium leading-none tracking-[0] text-transparent"
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
                  data-testid="thread-header-chrome"
                className={[
                  't-resize flex h-9 items-center overflow-hidden px-2.5',
                  isScenesWorkspace
                    ? 'rounded-full border border-[var(--border-soft)] bg-[var(--surface)] shadow-none backdrop-blur-none'
                    : 'rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl',
                ].join(' ')}
                style={headerTitleWidth ? { width: `${headerTitleWidth}px` } : undefined}
              >
                  <motion.div
                    initial={false}
                    animate={{
                      width: isSidebarCollapsed ? 28 : 0,
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
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-transparent hover:text-[var(--foreground)]"
                    >
                      <PanelLeftOpen className="size-3.5" />
                    </button>
                  </motion.div>
                  <h1
                    className="flex h-full min-w-0 shrink items-center justify-start overflow-hidden text-left leading-none"
                    style={headerTextWidth ? { width: `${headerTextWidth}px` } : undefined}
                  >
                    <div
                      data-testid="thread-header-title-text"
                      className="flex min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap align-middle text-left text-[16px] font-medium leading-none tracking-[0] text-[var(--foreground)]"
                    >
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
          <span className="text-[11px] text-[var(--muted-foreground)]">v{appInfo?.version ?? '...'}</span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {sidebarView === 'projects' ? (
            <motion.div
              key="sidebar-projects"
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full w-full"
            >
            <div className="min-h-0 w-full overflow-y-auto px-2 pb-3 pt-3">
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
                        onImport={(projectId) => void handleImportCrenv(projectId)}
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
            </motion.div>
            ) : (
            <motion.div
              key="sidebar-settings"
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full w-full"
            >
            <div className="min-h-0 w-full overflow-y-auto px-2 pb-3 pt-3">
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
              <div className="mt-6 space-y-2 px-2">
                <div className="px-3 text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                  Providers
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioView('providers');
                  }}
                  className={[
                    'flex h-10 w-full items-center rounded-[12px] px-3 text-left text-[14px] transition-colors',
                    activeStudioView === 'providers'
                      ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface2)]',
                  ].join(' ')}
                >
                  Text
                </button>
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
            )}
          </AnimatePresence>
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
                {referenceMentionOptions[0]?.folderTitle ? (
                  <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                    <Folder className="size-3" />
                    <span className="truncate">{referenceMentionOptions[0].folderTitle}</span>
                    <span className="opacity-60">· escolha uma imagem ou abra uma subpasta</span>
                  </div>
                ) : null}
                {referenceMentionOptions.map((reference, index) => (
                  <Fragment key={reference.id}>
                    {index > 0 && reference.section && reference.section !== referenceMentionOptions[index - 1]?.section ? (
                      <div className="mx-2 my-1 border-t border-white/8 pt-1 text-[11px] text-[var(--muted-foreground)]">
                        {reference.section === 'primary' ? 'Referência principal' : 'Ângulos'}
                      </div>
                    ) : null}
                    <button
                      ref={(node) => {
                        referenceMentionOptionRefs.current[index] = node;
                      }}
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
                  </Fragment>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            data-testid="classic-composer-shell"
            className={[
              'prompt-composer-card relative overflow-hidden border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)]',
              'shadow-[0_24px_72px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
              'transition-[height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isExpanded
                ? hasReferenceImages
                  ? 'h-[268px] rounded-[24px] px-5 pb-5 pt-5'
                  : 'h-[228px] rounded-[24px] px-5 pb-5 pt-5'
                : 'h-[60px] rounded-full px-3.5 py-2.5',
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
                placeholder="Type anything"
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
                isExpanded ? 'left-5 right-5 bottom-4' : 'left-4 right-4 bottom-2.5',
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
                  className={[
                    'pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-[background-color,border-color,color,transform] duration-200',
                    isExpanded
                      ? 'border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] backdrop-blur-xl hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]'
                      : 'border border-transparent bg-transparent hover:text-[var(--foreground)]',
                  ].join(' ')}
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
                    capability="image"
                    isOpen={isModelPickerOpen}
                    selectedModel={selectedModel}
                    selectedProviderId={selectedProviderId}
                    onOpenChange={setIsModelPickerOpen}
                    onProviderChange={(providerId) => {
                      const fallbackModel = getModelsForProvider(providerId, 'image')[0] ?? getDefaultModelOption('image');
                      setSelectedModelId(fallbackModel.id);
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
                    hidden
                    tabIndex={isExpanded ? 0 : -1}
                    aria-label="Fast"
                    aria-pressed={effectiveFastMode}
                    disabled
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
          const fallbackModel = getModelsForProvider(providerId, 'text')[0] ?? getDefaultModelOption('text');
          setSelectedModelId(fallbackModel.id);
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
        optionRefs={referenceMentionOptionRefs}
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
  state = 'send',
  ariaLabel = 'Enviar',
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  onClick: () => void;
  disabled: boolean;
  state?: 'send' | 'stop';
  ariaLabel?: string;
}) {
  const colorVariant = state === 'stop' ? 'sunset' : 'colorful';

  return (
    <BorderBeam
      ref={hostRef}
      borderRadius={999}
      className="pointer-events-auto relative z-30 h-10 w-10 shrink-0"
      colorVariant={colorVariant}
      data-send-button-state={state}
      data-send-button-variant={colorVariant}
      size="sm"
      strength={1}
      theme="dark"
    >
      <div className="relative h-10 w-10 rounded-full bg-[rgba(15,16,16,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          disabled={disabled}
          className="absolute inset-0 inline-flex items-center justify-center rounded-full text-[var(--foreground)] transition-[opacity,transform] duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="t-icon-swap size-4" data-state={state} aria-hidden="true">
            <ArrowUp className="t-icon size-4" data-icon="send" />
            <Square className="t-icon size-4" data-icon="stop" />
          </span>
        </button>
      </div>
    </BorderBeam>
  );
}

const COMPOSER_GLASS_STYLE = {
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
} as const;

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
    <div
      data-testid="generation-workspace-tabs"
      className="relative inline-grid h-9 grid-cols-3 items-center rounded-full bg-[rgba(15,16,16,0.88)] p-1 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
    >
      <motion.span
        data-testid="generation-workspace-tabs-indicator"
        aria-hidden="true"
        initial={false}
        animate={{ x: `${Math.max(0, activeIndex) * 100}%` }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-1 left-1 top-1 w-[calc((100%_-_8px)/3)] rounded-full bg-[var(--border-soft)]"
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
              'relative z-10 inline-flex h-7 min-w-[82px] items-center justify-center rounded-full px-4 text-[12px] font-medium tracking-[0] transition-colors duration-200',
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
  onPasteFrameOutput,
  onOpenImage,
  onCopyImage,
}: {
  sceneGroups: SceneGroupUi[];
  activeSceneGroupId: string | null;
  frameCards: SceneWorkspaceFrameCard[];
  onSelectSceneGroup: (sceneGroupId: string) => void;
  onRenameSceneGroup: (sceneGroupId: string, title: string) => void;
  onReorderSceneGroups: (draggedSceneGroupId: string, targetSceneGroupId: string) => void;
  onDeleteSceneGroup: (sceneGroupId: string) => void;
  onPasteFrameOutput: (frameId: string) => void;
  onOpenImage: (image: GeneratedImageRecord) => void;
  onCopyImage: (image: GeneratedImageRecord) => void;
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
          {frameCards.map((card, index) => {
            const outputCount = card.images.filter((image) => !image.isLoading).length;

            return (
              <div
                key={card.frameId}
                className="overflow-hidden rounded-[26px] border border-[var(--border-soft)] bg-[rgba(15,16,16,0.82)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
                  <div>
                    <div className="text-[14px] font-medium text-[var(--foreground)]">{card.frameTitle}</div>
                    <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                      {card.isGenerating ? 'Generating frame output...' : `${outputCount} output${outputCount === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Paste clipboard image as ${card.frameTitle} output`}
                      onClick={() => onPasteFrameOutput(card.frameId)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)] hover:text-[var(--foreground)]"
                    >
                      <ClipboardPaste className="size-4" />
                    </button>
                    <div className="rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] px-3 py-1 text-[11px] text-[var(--muted-foreground)]">
                      {card.isGenerating ? 'Loading' : `${outputCount} output${outputCount === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <LazySceneFrameOutputGrid
                    frameTitle={card.frameTitle}
                    images={card.images}
                    columnCount={card.images.length > 1 ? 2 : 1}
                    cardHeight={card.images.length > 1 ? 280 : 360}
                    rowGap={SCENE_OUTPUT_FRAME_ROW_GAP}
                    isInitiallyVisible={index < SCENE_OUTPUT_EAGER_FRAME_COUNT}
                    onImageOpen={(image) => onOpenImage(image as GeneratedImageRecord)}
                    onImageCopy={(image) => onCopyImage(image as GeneratedImageRecord)}
                  />
                </div>
              </div>
            );
          })}
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

function LazySceneFrameOutputGrid({
  frameTitle,
  images,
  columnCount,
  cardHeight,
  rowGap,
  isInitiallyVisible,
  onImageOpen,
  onImageCopy,
}: {
  frameTitle: string;
  images: GeneratedImageRecord[];
  columnCount: number;
  cardHeight: number;
  rowGap: number;
  isInitiallyVisible: boolean;
  onImageOpen: (image: GeneratedImageRecord) => void;
  onImageCopy: (image: GeneratedImageRecord) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRenderGrid, setShouldRenderGrid] = useState(isInitiallyVisible);
  const rowCount = Math.max(1, Math.ceil(Math.max(images.length, 1) / columnCount));
  const totalGridHeight = rowCount * (cardHeight + rowGap);
  const renderedGridHeight = Math.min(totalGridHeight, SCENE_OUTPUT_MAX_GRID_HEIGHT);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (typeof window.IntersectionObserver !== 'function') {
      setShouldRenderGrid(true);
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        setShouldRenderGrid(entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0));
      },
      { root: null, rootMargin: SCENE_OUTPUT_LAZY_ROOT_MARGIN, threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {shouldRenderGrid ? (
        <GeneratedImageGrid
          images={images}
          className="w-full"
          columnCount={columnCount}
          cardHeight={cardHeight}
          rowGap={rowGap}
          fitHeight
          maxFitHeight={SCENE_OUTPUT_MAX_GRID_HEIGHT}
          onImageOpen={(image) => onImageOpen(image as GeneratedImageRecord)}
          onImageCopy={(image) => onImageCopy(image as GeneratedImageRecord)}
        />
      ) : (
        <div
          aria-label={`${frameTitle} outputs pending viewport`}
          className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.32)]"
          style={{ minHeight: renderedGridHeight }}
        />
      )}
    </div>
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
  const beatCount = sceneGroup.frames.length;
  const beatLabel = `${beatCount} beat${beatCount === 1 ? '' : 's'}`;

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
          className="flex h-9 min-w-0 flex-1 items-center justify-between gap-3 rounded-full px-2 text-left text-[13px] font-medium text-[var(--foreground)]"
        >
          <span className="min-w-0 truncate">{sceneGroup.title}</span>
          <span
            className={[
              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              beatCount > 4
                ? 'border-[rgba(182,65,65,0.35)] bg-[rgba(122,44,44,0.26)] text-[rgb(245,178,178)]'
                : 'border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)]',
            ].join(' ')}
          >
            {beatLabel}
          </span>
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
  isComposerExpanded,
  hasReferenceImages,
  onSubscribeMessageStream,
  onGetMessageStreamSnapshots,
  onRegenerateMessage,
  onApproveAction,
  onDeclineAction,
}: {
  chatId: string | null;
  messages: DirectorMessageRecord[];
  isComposerExpanded: boolean;
  hasReferenceImages: boolean;
  onSubscribeMessageStream: (listener: DirectorMessageStreamListener) => () => void;
  onGetMessageStreamSnapshots: (chatId: string) => DirectorMessageStreamSnapshot[];
  onRegenerateMessage: (messageId: string) => void;
  onApproveAction: (messageId: string, actionIndex: number) => Promise<void>;
  onDeclineAction: (messageId: string, actionIndex: number) => Promise<void>;
}) {
  return (
    <div data-testid="director-workspace" className="h-full w-full overflow-hidden">
      <div className="mx-auto h-full w-full max-w-[1400px]">
        <div className="h-full min-w-0">
          <DirectorMessageList
            chatId={chatId}
            messages={messages}
            isComposerExpanded={isComposerExpanded}
            hasReferenceImages={hasReferenceImages}
            onSubscribeMessageStream={onSubscribeMessageStream}
            onGetMessageStreamSnapshots={onGetMessageStreamSnapshots}
            onRegenerateMessage={onRegenerateMessage}
            onApproveAction={onApproveAction}
            onDeclineAction={onDeclineAction}
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
                <TextShimmer className="text-[12px]" duration={1.6}>
                  Thinking...
                </TextShimmer>
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

function directorActionToolStatus(rawStatus: string | null): ToolStatus {
  if (rawStatus === 'running') {
    return 'running';
  }
  if (rawStatus === 'succeeded' || rawStatus === 'completed') {
    return 'completed';
  }
  if (rawStatus === 'failed' || rawStatus === 'declined') {
    return 'failed';
  }
  return 'pending';
}

function directorActionStatusLabel(status: DirectorRenderableActionStatus | null) {
  if (!status?.progress) {
    if (status?.rawStatus === 'declined') {
      return 'Declined';
    }
    return null;
  }

  if (status.rawStatus === 'running') {
    return `Gerando ${status.progress.generated} / ${status.progress.total}`;
  }

  if (status.rawStatus === 'succeeded' || status.rawStatus === 'completed') {
    return `Gerado ${status.progress.generated} / ${status.progress.total}`;
  }

  return null;
}

function directorActionResultAssets(action: DirectorRenderableAction) {
  if (!action.latestStatus?.result || typeof action.latestStatus.result !== 'object') {
    return [] as GeneratedImageRecord[];
  }

  const resultRecord = action.latestStatus.result as Record<string, unknown>;
  return Array.isArray(resultRecord.assets) ? (resultRecord.assets as GeneratedImageRecord[]) : [];
}

function DirectorActionCard({
  messageId,
  action,
  onApprove,
  onDecline,
}: {
  messageId: string;
  action: DirectorRenderableAction;
  onApprove?: ((messageId: string, actionIndex: number) => Promise<void>) | null;
  onDecline?: ((messageId: string, actionIndex: number) => Promise<void>) | null;
}) {
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'decline' | null>(null);
  const [generationStartedAt] = useState(() => new Date().toISOString());
  const hasAutoApprovedRef = useRef(false);
  const payload =
    action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
      ? (action.payload as Record<string, unknown>)
      : null;
  const frames = Array.isArray(payload?.frames)
    ? payload.frames.filter(
        (frame): frame is { title?: string; prompt?: string } =>
          Boolean(frame) && typeof frame === 'object' && !Array.isArray(frame)
      )
    : [];
  const activeFrame = frames[activeFrameIndex] ?? null;
  const actionStatus = action.latestStatus;
  const statusLabel = directorActionStatusLabel(actionStatus);
  const resultAssets = directorActionResultAssets(action);
  const loadingAssets =
    pendingDecision === 'approve' || actionStatus?.rawStatus === 'running'
      ? createLoadingEntries(
          `director-${messageId}-${action.actionIndex}`,
          typeof payload?.count === 'number' ? payload.count : 1,
          {
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'GPT-5.4 Mini',
            generationStartedAt,
          }
        )
      : [];
  const displayedAssets = resultAssets.length > 0 ? resultAssets : loadingAssets;
  const showPayloadDetails = displayedAssets.length === 0;
  const isAwaitingApproval =
    actionStatus === null &&
    (action.kind === 'generateImages' || action.kind === 'generate_classic') &&
    action.approval?.needsApproval === true;

  useEffect(() => {
    if (isAwaitingApproval && onApprove && !hasAutoApprovedRef.current) {
      hasAutoApprovedRef.current = true;
      void handleApprove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAwaitingApproval]);

  const payloadTitle =
    action.kind === 'create_scene' && typeof payload?.title === 'string' ? payload.title.trim() : '';
  const cardTitle = actionStatus?.title?.trim() || payloadTitle || action.summary;

  async function handleApprove() {
    if (!onApprove) {
      return;
    }
    setPendingDecision('approve');
    try {
      await onApprove(messageId, action.actionIndex);
    } finally {
      setPendingDecision(null);
    }
  }

  async function handleDecline() {
    if (!onDecline) {
      return;
    }
    setPendingDecision('decline');
    try {
      await onDecline(messageId, action.actionIndex);
    } finally {
      setPendingDecision(null);
    }
  }

  return (
    <ToolCall
      name={action.kind === 'generate_classic' ? 'generateImages' : action.kind}
      status={directorActionToolStatus(actionStatus?.rawStatus ?? null)}
      className="overflow-visible"
    >
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="text-[13px] font-medium text-[var(--foreground)]">{cardTitle}</div>
          {actionStatus?.detail ? (
            <div className="text-[12px] leading-5 text-[var(--muted-foreground)]">{actionStatus.detail}</div>
          ) : action.summary && action.summary !== cardTitle ? (
            <div className="text-[12px] leading-5 text-[var(--muted-foreground)]">{action.summary}</div>
          ) : null}
        </div>

        {statusLabel ? (
          <div
            data-testid="director-action-status"
            className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--surface2)]/75 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
          >
            {statusLabel}
          </div>
        ) : null}

        {action.kind === 'create_scene' ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {frames.map((frame, index) => (
                <button
                  key={`${action.id}-frame-${index}`}
                  type="button"
                  onClick={() => setActiveFrameIndex(index)}
                  className={[
                    'inline-flex rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                    index === activeFrameIndex
                      ? 'border-[var(--accent)] bg-[var(--surface2)] text-[var(--foreground)]'
                      : 'border-[var(--border-soft)] bg-[var(--surface)]/72 text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                  ].join(' ')}
                >
                  {frame.title?.trim() || `Frame ${index + 1}`}
                </button>
              ))}
            </div>
            {activeFrame?.prompt ? (
              <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface2)]/60 p-3 text-[12px] leading-5 text-[var(--muted-foreground)]">
                {activeFrame.prompt}
              </div>
            ) : null}
          </div>
        ) : null}

        {showPayloadDetails && payload && (action.kind === 'generateImages' || action.kind === 'generate_classic') ? (
          <div className="grid gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface2)]/60 p-3">
            {typeof payload.prompt === 'string' && payload.prompt.trim() ? (
              <div className="text-[12px] leading-5 text-[var(--foreground)]">{payload.prompt}</div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted-foreground)]">
              {typeof payload.count === 'number' ? (
                <span className="rounded-full border border-[var(--border-soft)] px-2 py-1">{payload.count} image</span>
              ) : null}
              {typeof payload.aspectRatio === 'string' ? (
                <span className="rounded-full border border-[var(--border-soft)] px-2 py-1">{payload.aspectRatio}</span>
              ) : null}
              {Array.isArray(payload.references) && payload.references.length > 0 ? (
                <span className="rounded-full border border-[var(--border-soft)] px-2 py-1">
                  {(payload.references as string[]).join(', ')}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {displayedAssets.length > 0 ? (
          <GeneratedImageGrid
            images={displayedAssets}
            columnCount={Math.min(3, Math.max(1, displayedAssets.length))}
            fitHeight
            loadingEffect="shimmer"
            className="overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface2)]/45 py-2"
          />
        ) : null}

      </div>
    </ToolCall>
  );
}

function DirectorMessageErrorAlert({ reason }: { reason: string }) {
  return (
    <div
      role="alert"
      className="rounded-[18px] border border-[rgba(245,118,118,0.28)] bg-[rgba(52,24,24,0.52)] px-4 py-3 text-[13px] leading-5 text-[rgb(248,214,214)]"
    >
      <div className="mb-1 flex items-center gap-2 text-[13px] font-medium text-[rgb(255,226,226)]">
        <AlertTriangle className="size-4 shrink-0" />
        <span>Director stream failed</span>
      </div>
      <div className="whitespace-pre-wrap break-words text-[rgb(238,184,184)]">{reason}</div>
    </div>
  );
}

type DirectorReasoningPart = Extract<DirectorMessagePart, { type: 'reasoning' }>;
type DirectorSkillPart = Extract<DirectorMessagePart, { type: 'tool-loadSkill' }>;

function formatSkillLabel(part: DirectorSkillPart) {
  const name = part.title || part.skillName || 'skill';
  if (part.state === 'running') {
    return `Consulting skill: ${name}`;
  }
  if (part.state === 'output-error' || part.found === false) {
    return `Skill unavailable: ${name}`;
  }
  return `Consulted skill: ${name}`;
}

function DirectorReasoningBlock({
  hasReasoning,
  isThinking,
  messageId,
  reasoningParts,
  skillParts,
  storageKey,
  title,
}: {
  hasReasoning: boolean;
  isThinking: boolean;
  messageId: string;
  reasoningParts: DirectorReasoningPart[];
  skillParts: DirectorSkillPart[];
  storageKey: string;
  title: string;
}) {
  const hasSteps = hasReasoning || skillParts.length > 0;
  return (
    <ChainOfThought
      defaultOpen
      isExpandable={hasSteps}
      storageKey={storageKey}
    >
      <ChainOfThoughtHeader isShimmering={isThinking}>{title}</ChainOfThoughtHeader>
      {hasSteps ? (
        <ChainOfThoughtContent className="space-y-3">
          {skillParts.map((skill) => (
            <ChainOfThoughtStep
              key={`${messageId}-skill-${skill.toolCallId}`}
              icon={BookOpen}
              status={skill.state === 'running' ? 'active' : 'complete'}
              label={formatSkillLabel(skill)}
              description={skill.reference ? `reference: ${skill.reference}` : undefined}
            />
          ))}
          {reasoningParts.map((reasoning, index) => (
            <MessageResponse
              key={`${messageId}-reasoning-${index}`}
              className="director-markdown text-[13px] leading-5"
            >
              {reasoning.text}
            </MessageResponse>
          ))}
        </ChainOfThoughtContent>
      ) : null}
    </ChainOfThought>
  );
}

function DirectorMessageRow({
  message,
  onRegenerate,
  onApproveAction,
  onDeclineAction,
}: {
  message: DirectorMessageRecord;
  onRegenerate?: ((messageId: string) => void) | null;
  onApproveAction?: ((messageId: string, actionIndex: number) => Promise<void>) | null;
  onDeclineAction?: ((messageId: string, actionIndex: number) => Promise<void>) | null;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreamingAssistant = isAssistant && message.status === 'streaming';
  const textContent = getDirectorText(message.parts);
  const reasoningParts = message.parts.filter(
    (part): part is Extract<DirectorMessagePart, { type: 'reasoning' }> => part.type === 'reasoning'
  );
  const toolParts = message.parts.filter(
    (part): part is Extract<DirectorMessagePart, { type: 'tool-generateImages' }> =>
      part.type === 'tool-generateImages'
  );
  const skillParts = message.parts.filter(
    (part): part is Extract<DirectorMessagePart, { type: 'tool-loadSkill' }> =>
      part.type === 'tool-loadSkill'
  );
  const isCompleteAssistant = isAssistant && message.status === 'completed' && message.parts.length > 0;
  const isSettledAssistant = isAssistant && message.status !== 'streaming';
  const durationLabel = isSettledAssistant ? formatDurationBetween(message.createdAt, message.updatedAt) : null;
  const referenceAttachments = (message.references ?? []) as AttachmentRecord[];
  const hasReferenceAttachments = referenceAttachments.length > 0;
  const visibleReasoningParts = reasoningParts.filter((part) => part.text.trim().length > 0);
  const hasReasoning = visibleReasoningParts.length > 0;
  const hasVisibleAssistantContent = textContent.trim().length > 0;
  const failureReason =
    message.status === 'failed'
      ? message.errorMessage?.trim() || textContent.trim() || 'The Director stream ended before returning a response.'
      : null;
  const showAssistantMarkdown =
    hasVisibleAssistantContent && (!failureReason || textContent.trim() !== failureReason);
  const showReasoningBlock =
    isAssistant && (isStreamingAssistant || hasReasoning || skillParts.length > 0 || Boolean(durationLabel));
  const chainOfThoughtStorageKey = `director-message-cot:${message.id}`;
  const reasoningDurationLabel =
    message.status !== 'streaming' && durationLabel
      ? `Thought for ${durationLabel}`
      : 'Thinking';
  const isReasoningTitleShimmering = isStreamingAssistant;
  async function copyMessage() {
    if (!textContent.trim()) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(textContent);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 1400);
    } catch (error) {
      console.error('Failed to copy Director response', error);
      toast.error('Failed to copy response');
    }
  }

  return (
    <div data-testid="director-message-row" className="mx-auto w-full max-w-[920px] px-6 py-3">
      <Message
        from={isUser ? 'user' : 'assistant'}
        className={[
          isUser ? 'ml-auto max-w-[min(680px,78%)] items-end' : 'w-full items-start py-3',
        ].join(' ')}
      >
        <MessageContent
          data-testid="director-message-content"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          className={
            isUser
              ? 'select-text whitespace-pre-wrap rounded-[24px] bg-[var(--surface2)]/86 px-4 py-3 text-[14px] leading-5 text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
              : 'w-full select-text overflow-visible text-[14px] leading-6 text-[var(--foreground)]'
          }
        >
          {isUser ? (
            <>
              {textContent}
              {hasReferenceAttachments ? (
                <Attachments className={textContent.trim() ? 'mt-3' : undefined}>
                  {referenceAttachments.map((attachment, index) => (
                    <Attachment
                      key={`${message.id}-attachment-${index}-${attachment.name}`}
                      attachment={attachment}
                    />
                  ))}
                </Attachments>
              ) : null}
            </>
          ) : (
            <div className="grid gap-3">
              {showReasoningBlock ? (
                <DirectorReasoningBlock
                  hasReasoning={hasReasoning}
                  isThinking={isReasoningTitleShimmering}
                  messageId={message.id}
                  reasoningParts={visibleReasoningParts}
                  skillParts={skillParts}
                  storageKey={chainOfThoughtStorageKey}
                  title={reasoningDurationLabel}
                />
              ) : null}
              {showAssistantMarkdown ? (
                <MessageResponse
                  isAnimating={message.status === 'streaming'}
                  className="director-markdown"
                >
                  {textContent}
                </MessageResponse>
              ) : null}
              {failureReason ? <DirectorMessageErrorAlert reason={failureReason} /> : null}
              {toolParts.map((part, actionIndex) => (
                <DirectorActionCard
                  key={`${message.id}-action-${part.toolCallId}`}
                  messageId={message.id}
                  action={{
                    id: part.toolCallId,
                    actionIndex,
                    kind: 'generateImages',
                    summary: 'Generate images',
                    payload: part.input,
                    source: 'tool-call',
                    approval: {
                      id: part.approvalId ?? part.toolCallId,
                      needsApproval: part.state === 'approval-requested',
                    },
                    latestStatus:
                      part.state === 'approval-requested'
                        ? null
                        : {
                            rawStatus:
                              part.state === 'output-available'
                                ? 'succeeded'
                                : part.state === 'output-error'
                                  ? 'failed'
                                  : part.state,
                            title:
                              part.state === 'output-available'
                                ? 'Image generation finished'
                                : part.state === 'output-error'
                                  ? 'Image generation failed'
                                  : part.state === 'declined'
                                    ? 'Image generation declined'
                                    : 'Generating images',
                            detail: part.errorText ?? null,
                            progress:
                              part.state === 'output-available' && Array.isArray(part.output?.assets)
                                ? {
                                    generated: part.output.assets.length,
                                    total: part.input.count ?? part.output.assets.length,
                                  }
                                : null,
                            result: part.output,
                          },
                  }}
                  onApprove={onApproveAction}
                  onDecline={onDeclineAction}
                />
              ))}
            </div>
          )}
        </MessageContent>
        {isCompleteAssistant ? (
          <MessageToolbar className="mt-2 justify-start text-[12px] text-[var(--muted-foreground)]">
            <div className="flex min-w-0 items-center gap-2">
              {message.modelLabel ? (
                <span className="truncate">{message.modelLabel}</span>
              ) : null}
            </div>
            <MessageActions>
              {onRegenerate ? (
                <button
                  type="button"
                  aria-label="Regenerate Director response"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-[color,opacity,transform] duration-150 hover:text-[var(--foreground)] active:translate-y-px"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Copy Director response"
                onClick={() => {
                  void copyMessage();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-[color,opacity,transform] duration-150 hover:text-[var(--foreground)] active:translate-y-px"
              >
                <span
                  className="t-icon-swap size-3.5"
                  data-state={hasCopied ? 'copied' : 'copy'}
                  aria-hidden="true"
                >
                  <Copy className="t-icon size-3.5" data-icon="copy" />
                  <Check className="t-icon size-3.5 text-[rgb(96,226,255)]" data-icon="copied" />
                </span>
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
  onRegenerateMessage?: (messageId: string) => void;
  onApproveAction?: (messageId: string, actionIndex: number) => Promise<void>;
  onDeclineAction?: (messageId: string, actionIndex: number) => Promise<void>;
}

function DirectorMessageVirtualRow({
  ariaAttributes,
  index,
  style,
  messages,
  onRegenerateMessage,
  onApproveAction,
  onDeclineAction,
}: RowComponentProps<DirectorMessageVirtualRowProps>) {
  const message = messages[index];

  if (!message) {
    return null;
  }

  return (
    <div
      {...ariaAttributes}
      className={[index === 0 ? 'pt-[68px]' : '', index === messages.length - 1 ? 'pb-[120px]' : ''].join(' ')}
      style={style as CSSProperties}
    >
      <DirectorMessageRow
        message={message}
        onRegenerate={onRegenerateMessage}
        onApproveAction={onApproveAction}
        onDeclineAction={onDeclineAction}
      />
    </div>
  );
}

function DirectorMessageList({
  chatId,
  messages,
  isComposerExpanded,
  hasReferenceImages,
  onSubscribeMessageStream,
  onGetMessageStreamSnapshots,
  onRegenerateMessage,
  onApproveAction,
  onDeclineAction,
}: {
  chatId: string | null;
  messages: DirectorMessageRecord[];
  isComposerExpanded: boolean;
  hasReferenceImages: boolean;
  onSubscribeMessageStream: (listener: DirectorMessageStreamListener) => () => void;
  onGetMessageStreamSnapshots: (chatId: string) => DirectorMessageStreamSnapshot[];
  onRegenerateMessage: (messageId: string) => void;
  onApproveAction: (messageId: string, actionIndex: number) => Promise<void>;
  onDeclineAction: (messageId: string, actionIndex: number) => Promise<void>;
}) {
  const listRef = useListRef(null);
  const isPinnedToBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [displayMessages, setDisplayMessages] = useState(messages);
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 180,
    key: chatId ?? 'director-empty-chat',
  });
  const lastMessage = displayMessages[displayMessages.length - 1] ?? null;
  const contentSignature = lastMessage
    ? `${displayMessages.length}:${lastMessage.id}:${JSON.stringify(lastMessage.parts).length}:${lastMessage.status}`
    : '0';
  const rowProps = useMemo(
    () => ({
      messages: displayMessages,
      onRegenerateMessage,
      onApproveAction,
      onDeclineAction,
    }),
    [displayMessages, onRegenerateMessage, onApproveAction, onDeclineAction]
  );

  useEffect(() => {
    isPinnedToBottomRef.current = true;
    setIsAtBottom(true);

    if (!chatId) {
      setDisplayMessages(messages);
      return;
    }

    const messagesWithSnapshots = onGetMessageStreamSnapshots(chatId).reduce(
      (nextMessages, snapshot) =>
        updateDirectorMessageContent(nextMessages, snapshot.messageId, snapshot.parts, snapshot.status),
      messages
    );
    setDisplayMessages(messagesWithSnapshots);
  }, [chatId, messages, onGetMessageStreamSnapshots]);

  useEffect(() => {
    const count = displayMessages.length;
    if (count === 0) return;
    // double rAF so the virtual list has time to measure rows before scrolling
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        listRef.current?.scrollToRow({ align: 'end', behavior: 'instant', index: count - 1 });
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  // only run when the chat switches, not on every message update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      return;
    }

    return onSubscribeMessageStream((snapshot) => {
      if (snapshot.chatId !== chatId) {
        return;
      }

      setDisplayMessages((current) =>
        updateDirectorMessageContent(current, snapshot.messageId, snapshot.parts, snapshot.status)
      );
    });
  }, [chatId, onSubscribeMessageStream]);

  const handleScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
    isPinnedToBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToRow({
      align: 'end',
      behavior: 'smooth',
      index: displayMessages.length - 1,
    });
  }, [displayMessages.length]);

  useLayoutEffect(() => {
    if (displayMessages.length === 0) {
      return;
    }
    if (!isPinnedToBottomRef.current) {
      return;
    }
    listRef.current?.scrollToRow({
      align: 'end',
      behavior: 'instant',
      index: displayMessages.length - 1,
    });
  }, [contentSignature, displayMessages.length]);

  if (displayMessages.length === 0) {
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
    <div className="relative h-full">
      <List<DirectorMessageVirtualRowProps>
        listRef={listRef}
        rowComponent={DirectorMessageVirtualRow}
        rowCount={displayMessages.length}
        rowHeight={rowHeight}
        rowProps={rowProps}
        overscanCount={4}
        defaultHeight={720}
        className="h-full overscroll-contain"
        onScroll={handleScroll}
        style={{ height: '100%' }}
      />
      <AnimatePresence>
        {!isAtBottom ? (
          <motion.button
            key="scroll-to-bottom"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              bottom: (isComposerExpanded ? (hasReferenceImages ? 248 : 208) : 60) + 16 + 24,
            }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            type="button"
            onClick={scrollToBottom}
            className="group absolute left-1/2 z-10 flex -translate-x-1/2 items-center overflow-hidden rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.82)] shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-[padding,color] duration-200 hover:text-[var(--foreground)] p-2 hover:px-3.5 hover:py-2 text-[var(--muted-foreground)]"
          >
            <ChevronDown className="size-4 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] transition-[max-width,margin] duration-200 group-hover:ml-1.5 group-hover:max-w-[120px]">
              Scroll to bottom
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
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
  const frameRowProps = useMemo(
    () => ({
      frames,
      savedReferences,
      onRenameFrame,
      onDeleteFrame,
      onUpdateFramePrompt,
      onUpdateFrameReferences,
      onGenerateFrame,
      onToggleFrame,
      onToggleRenameFrame,
      generatingFrameIds,
      isGenerating,
    }),
    [
      frames,
      savedReferences,
      onRenameFrame,
      onDeleteFrame,
      onUpdateFramePrompt,
      onUpdateFrameReferences,
      onGenerateFrame,
      onToggleFrame,
      onToggleRenameFrame,
      generatingFrameIds,
      isGenerating,
    ]
  );
  const frameListHeight = Math.min(
    Math.max(frames.length * SCENE_FRAME_ACCORDION_EXPANDED_HEIGHT, SCENE_FRAME_ACCORDION_EXPANDED_HEIGHT),
    SCENE_SIDEBAR_FRAME_LIST_MAX_HEIGHT
  );

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
        {frames.length > 0 ? (
          <List<SceneFrameVirtualRowProps>
            rowComponent={SceneFrameVirtualRow}
            rowCount={frames.length}
            rowHeight={(index, props) =>
              props.frames[index]?.isCollapsed ? SCENE_FRAME_ACCORDION_COLLAPSED_HEIGHT : SCENE_FRAME_ACCORDION_EXPANDED_HEIGHT
            }
            rowProps={frameRowProps}
            overscanCount={2}
            defaultHeight={SCENE_SIDEBAR_FRAME_LIST_MAX_HEIGHT}
            className="overscroll-contain"
            style={{ height: frameListHeight, width: '100%' }}
          />
        ) : null}
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

type SceneFrameVirtualRowProps = {
  frames: SceneFrame[];
  savedReferences: SavedReferenceImage[];
  onRenameFrame: (frameId: string, title: string) => void;
  onDeleteFrame: (frameId: string) => void;
  onUpdateFramePrompt: (frameId: string, prompt: string) => void;
  onUpdateFrameReferences: (frameId: string, references: SceneReferenceAttachment[]) => void;
  onGenerateFrame: (frameId: string) => void;
  onToggleFrame: (frameId: string) => void;
  onToggleRenameFrame: (frameId: string) => void;
  generatingFrameIds: string[];
  isGenerating: boolean;
};

function SceneFrameVirtualRow({
  index,
  style,
  frames,
  savedReferences,
  onRenameFrame,
  onDeleteFrame,
  onUpdateFramePrompt,
  onUpdateFrameReferences,
  onGenerateFrame,
  onToggleFrame,
  onToggleRenameFrame,
  generatingFrameIds,
  isGenerating,
}: RowComponentProps<SceneFrameVirtualRowProps>) {
  const frame = frames[index];
  if (!frame) {
    return null;
  }

  return (
    <div style={style}>
      <SceneFrameAccordion
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
  optionRefs,
}: {
  inputId: string;
  prompt: string;
  isExpanded: boolean;
  hasReferenceImages: boolean;
  referenceImages: ComposerReferenceImage[];
  referenceMentionOptions: ReferenceSelectorOption[];
  referenceMentionCandidates: Array<{ id: string; title: string; previewUrl?: string }>;
  activeReferenceMentionIndex: number;
  popoverBottom: number;
  isFocused: boolean;
  isReferenceDragActive: boolean;
  isModelPickerOpen: boolean;
  selectedModel: ReturnType<typeof getDefaultModelOption>;
  selectedProviderId: GenerationProviderId;
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
  onInsertReferenceMention: (reference: ReferenceSelectorOption) => void;
  onKeepOpen: (event?: Event | SyntheticEvent | ReactMouseEvent<HTMLElement>) => void;
  onOpenModelPicker: (open: boolean) => void;
  onProviderChange: (providerId: GenerationProviderId) => void;
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
  optionRefs: RefObject<Array<HTMLButtonElement | null>>;
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
                <Fragment key={reference.id}>
                  {index > 0 && reference.section && reference.section !== referenceMentionOptions[index - 1]?.section ? (
                    <div className="mx-2 my-1 border-t border-white/8 pt-1 text-[11px] text-[var(--muted-foreground)]">
                      {reference.section === 'primary' ? 'Referência principal' : 'Ângulos'}
                    </div>
                  ) : null}
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
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
                </Fragment>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <BorderBeam
          active={isStreaming}
          borderRadius={isExpanded ? 24 : 999}
          className="w-full"
          colorVariant="colorful"
          size="md"
          strength={1}
          theme="dark"
        >
          <div
            data-testid="director-composer-shell"
            className={[
              'prompt-composer-card relative overflow-hidden border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)]',
              'shadow-[0_24px_72px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
              'transition-[height,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isExpanded
                ? hasReferenceImages
                  ? 'h-[248px] rounded-[24px] px-5 pb-5 pt-5'
                  : 'h-[208px] rounded-[24px] px-5 pb-5 pt-5'
                : 'h-[60px] rounded-full px-3.5 py-2.5',
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
              placeholder="Type anything"
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
              isExpanded ? 'left-5 right-5 bottom-4' : 'left-4 right-4 bottom-2.5',
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
                  className={[
                    'pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--foreground)] transition-[background-color,border-color,color,transform] duration-200',
                    isExpanded
                      ? 'border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] backdrop-blur-xl hover:border-[var(--border-strong)] hover:bg-[rgba(39,39,40,0.78)]'
                      : 'border border-transparent bg-transparent hover:text-[var(--foreground)]',
                  ].join(' ')}
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
                  capability="text"
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
                  hidden
                  tabIndex={isExpanded ? 0 : -1}
                  aria-label="Fast"
                  aria-pressed={effectiveFastMode}
                  disabled
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

            <SendButton
              hostRef={sendButtonRef}
              onClick={isStreaming ? onStop : onSubmit}
              disabled={!isStreaming && !prompt.trim()}
              state={isStreaming ? 'stop' : 'send'}
              ariaLabel={isStreaming ? 'Stop' : 'Enviar'}
            />
          </div>
          </div>
        </BorderBeam>
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
      .filter((reference) => reference.title.toLowerCase().includes(getReferenceMentionLookupQuery(mentionMatch.query)))
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

  const insertMention = useCallback((option: { id: string; title: string; previewUrl?: string }) => {
    composerRef.current?.insertMention(option.id, option.title, undefined, undefined, option.previewUrl);
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
  const generationModelLabel = session?.image.modelLabel ?? session?.image.modelId ?? null;
  const generationDuration = formatGenerationDuration(session?.image.durationMs);
  const generationReferences = session?.image.references ?? [];
  const extraPromptMentionCandidates = useMemo(() => {
    if (!session) return [];

    return [
      ...savedReferences.map((reference) => ({
        id: reference.id,
        title: reference.title,
        previewUrl: reference.previewUrl,
      })),
      ...session.characterReferences.map((reference) => ({
        id: reference.id,
        title: reference.name.replace(/\.[^/.]+$/, ''),
        previewUrl: reference.previewUrl,
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
      .filter((option) =>
        option.title.toLowerCase().includes(getReferenceMentionLookupQuery(extraPromptMentionMatch.query)),
      )
      .slice(0, 5);
  }, [extraPromptMentionMatch, savedReferences, session]);

  useEffect(() => {
    setActiveExtraPromptMentionIndex(0);
  }, [extraPromptMentionMatch?.query, extraPromptMentionOptions.length]);

  const insertExtraPromptMention = useCallback((option: { id: string; title: string; previewUrl?: string }) => {
    extraPromptComposerRef.current?.insertMention(option.id, option.title, undefined, undefined, option.previewUrl);
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
          'inline-flex shrink-0 items-center justify-center border border-[var(--border-soft)] bg-[var(--surface2)]/80 text-[var(--foreground)] backdrop-blur-xl',
          'transition-[width,height,border-radius,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--border-strong)] hover:bg-[var(--surface2)]',
          hasReferenceImages ? 'h-20 w-20 rounded-[28px]' : 'h-8 w-8 rounded-[13px]',
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
          <ContextMenu key={referenceImage.id}>
            <ContextMenuTrigger asChild>
              <div
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface2)]/80 backdrop-blur-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                title={referenceImage.name}
              >
                <button
                  type="button"
                  aria-label={`Open ${referenceImage.name}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onKeepOpen();
                  }}
                  onDoubleClick={() => onOpenReference(referenceImage)}
                  onClick={() => onOpenReference(referenceImage)}
                  className="h-full w-full"
                >
                  <img
                    src={referenceImage.previewUrl}
                    alt={referenceImage.name}
                    className="h-full w-full object-cover opacity-90 saturate-[0.94]"
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
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[160px]">
              <ContextMenuItem
                onClick={() => {
                  onKeepOpen();
                  onOpenReference(referenceImage);
                }}
              >
                Open
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  onKeepOpen();
                  onRemoveReference(referenceImage.id);
                }}
                className="text-red-400 focus:text-red-300"
              >
                Remove
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}

function ProvidersWorkspace({
  geminiApiKey,
  geminiApiKeyDraft,
  isKeyVisible,
  isSaving,
  onGeminiApiKeyChange,
  onKeyVisibleChange,
  onSave,
}: {
  geminiApiKey: string;
  geminiApiKeyDraft: string;
  isKeyVisible: boolean;
  isSaving: boolean;
  onGeminiApiKeyChange: (apiKey: string) => void;
  onKeyVisibleChange: (isVisible: boolean) => void;
  onSave: () => void;
}) {
  const hasSavedGeminiKey = geminiApiKey.trim().length > 0;
  const hasDraftChanged = geminiApiKeyDraft !== geminiApiKey;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-full px-8 pb-10 pt-8"
    >
      <div className="mx-auto flex w-full max-w-[1060px] flex-col gap-8">
        <div>
          <h1 className="text-[26px] font-semibold leading-none tracking-[0] text-[var(--foreground)]">
            Providers
          </h1>
          <p className="mt-4 max-w-[640px] text-[16px] leading-6 tracking-[0] text-[var(--muted-foreground)]">
            Add provider credentials for Director and future text generation workflows.
          </p>
        </div>

        <section className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-11 items-center justify-center rounded-[16px] bg-[var(--surface2)]">
                <KeyRound className="size-5 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <h2 className="text-[16px] font-medium leading-5 tracking-[0] text-[var(--foreground)]">
                  Text provider
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[var(--muted-foreground)]">
                  Only Gemini is available right now.
                </p>
              </div>
            </div>
            <span
              className={[
                'inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium',
                hasSavedGeminiKey
                  ? 'border-[rgba(84,190,120,0.28)] bg-[rgba(84,190,120,0.12)] text-[rgb(147,220,169)]'
                  : 'border-[var(--border-soft)] bg-[var(--surface2)] text-[var(--muted-foreground)]',
              ].join(' ')}
            >
              {hasSavedGeminiKey ? 'Configured' : 'Missing key'}
            </span>
          </div>

          <div className="mt-6 rounded-[22px] border border-[var(--border-soft)] bg-[rgba(32,32,33,0.42)] p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-10 items-center justify-center rounded-[14px] bg-[var(--surface2)]">
                <img src={geminiIcon} alt="" aria-hidden="true" className="size-6 object-contain" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium leading-5 tracking-[0] text-[var(--foreground)]">
                  Gemini
                </h3>
                <p className="text-[12px] leading-4 text-[var(--muted-foreground)]">
                  Used by the Google model picker and Director text responses.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="grid gap-2">
                <span className="text-[12px] font-medium leading-4 tracking-[0] text-[var(--muted-foreground)]">
                  Gemini API key
                </span>
                <div className="flex h-11 items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3">
                  <Input
                    aria-label="Gemini API key"
                    type={isKeyVisible ? 'text' : 'password'}
                    value={geminiApiKeyDraft}
                    onChange={(event) => onGeminiApiKeyChange(event.target.value)}
                    placeholder="GEMINI_API_KEY"
                    className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label={isKeyVisible ? 'Hide Gemini API key' : 'Show Gemini API key'}
                    onClick={() => onKeyVisibleChange(!isKeyVisible)}
                    className="ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                  >
                    {isKeyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving || !hasDraftChanged}
                className="h-11 rounded-full px-4"
              >
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                Save provider key
              </Button>
            </div>
          </div>
        </section>
      </div>
    </motion.section>
  );
}

function SortableRefFolderGridCard({
  folder,
  onDoubleClick,
  contextMenu,
}: {
  folder: { id: string; title: string; images: SavedReferenceImage[] };
  onDoubleClick: () => void;
  contextMenu: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const cover = folder.images[0];
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={`group/sortable ${isDragging ? 'opacity-95 shadow-2xl scale-[1.02]' : ''}`}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onDoubleClick={onDoubleClick}
            className="group relative w-full overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] text-left transition-[border-color,box-shadow] duration-200 hover:border-[var(--border-strong)] hover:shadow-md"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface2)]">
              {cover ? (
                <img src={cover.previewUrl} alt={folder.title} className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]" draggable={false} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Folder className="size-10 text-[var(--muted-foreground)]/30" />
                </div>
              )}
              {/* Drag handle — top-left, opposite the ellipsis */}
              <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-2 z-20 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-xl bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/sortable:opacity-100 active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="size-3.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
                <div className="flex items-end justify-between gap-2">
                  <h2 className="line-clamp-1 text-[14px] font-semibold text-white">{folder.title}</h2>
                  <span className="shrink-0 text-[12px] text-white/60">{folder.images.length} {folder.images.length === 1 ? 'imagem' : 'imagens'}</span>
                </div>
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        {contextMenu}
      </ContextMenu>
    </div>
  );
}

function SortableRefFolderListRow({
  folder,
  onEdit,
  onDeleteImage,
  onReorderImages,
  contextMenu,
}: {
  folder: { id: string; title: string; images: SavedReferenceImage[] };
  onEdit: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onReorderImages: (newIds: string[]) => void;
  contextMenu: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const cover = folder.images[0];
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={`group/sortable ${isDragging ? 'opacity-95 shadow-2xl scale-[1.01]' : ''}`}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="group/card relative grid" style={{ gridTemplateColumns: '1fr 2.25fr', gap: '16px' }}>
            <div className="relative overflow-hidden rounded-2xl bg-[var(--surface2)] border border-[var(--border-soft)]">
              {cover ? (
                <img src={cover.previewUrl} alt={folder.title} className="block w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.03]" draggable={false} />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <Folder className="size-8 text-[var(--muted-foreground)]/30" />
                </div>
              )}
              {/* Drag handle — top-left */}
              <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-2 z-20 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-xl bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/sortable:opacity-100 active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="size-3.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10">
                <div className="flex items-end justify-between gap-2">
                  <h2 className="line-clamp-1 text-[14px] font-semibold text-white">{folder.title}</h2>
                  <span className="shrink-0 text-[12px] text-white/60">{folder.images.length} {folder.images.length === 1 ? 'imagem' : 'imagens'}</span>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-[rgba(7,7,7,0.72)] border border-[var(--border-soft)]">
              <FolderImageCarousel
                images={folder.images}
                onEdit={onEdit}
                onDelete={onDeleteImage}
                onReorder={onReorderImages}
              />
            </div>
          </div>
        </ContextMenuTrigger>
        {contextMenu}
      </ContextMenu>
    </div>
  );
}

function SortableRefImageGridCard({
  image,
  isSelected,
  isSoloFolder,
  onClick,
  onDoubleClick,
  onDelete,
  contextMenu,
}: {
  image: SavedReferenceImage;
  isSelected: boolean;
  isSoloFolder: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDelete: () => void;
  contextMenu: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={`group/sortable ${isDragging ? 'opacity-95 shadow-2xl scale-[1.02]' : ''}`}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            aria-label={image.title || deriveReferenceAttachmentTitle(image.name)}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            style={{ aspectRatio: '1 / 1' }}
            className={[
              'group relative w-full overflow-hidden rounded-[20px] border bg-[var(--surface2)] text-left outline-none',
              'transition-[border-color,box-shadow,transform,opacity] duration-150',
              isSelected
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] opacity-90'
                : 'border-[var(--border-soft)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            <img
              src={image.previewUrl}
              alt={image.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              draggable={false}
            />
            {/* Drag handle — top-left */}
            <div
              {...attributes}
              {...listeners}
              className="absolute left-2 top-2 z-20 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-xl bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/sortable:opacity-100 active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="size-3.5" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="block truncate text-[11px] font-medium text-white/90">
                {image.title || deriveReferenceAttachmentTitle(image.name)}
              </span>
            </div>
            {isSelected ? (
              <span className="absolute inset-0 rounded-[19px] ring-2 ring-[var(--accent)] ring-inset pointer-events-none" />
            ) : null}
            {!isSoloFolder ? (
              <div className="absolute right-2 top-2 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Remover ${image.title}`}
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-[rgba(190,58,58,0.7)]"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : null}
          </button>
        </ContextMenuTrigger>
        {contextMenu}
      </ContextMenu>
    </div>
  );
}

function SortableRefImageListRow({
  image,
  isSelected,
  isSoloFolder,
  onClick,
  onDoubleClick,
  onDownload,
  onDelete,
  contextMenu,
}: {
  image: SavedReferenceImage;
  isSelected: boolean;
  isSoloFolder: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDownload: () => void;
  onDelete: () => void;
  contextMenu: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        zIndex: isDragging ? 30 : undefined,
        position: 'relative',
      }}
      className={`group/sortable ${isDragging ? 'opacity-95 shadow-2xl scale-[1.01]' : ''}`}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="group/card relative grid cursor-pointer"
            style={{ gridTemplateColumns: '1fr 2.25fr', gap: '16px' }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
          >
            <div className={[
              'relative overflow-hidden rounded-2xl bg-[var(--surface2)] border transition-colors',
              isSelected ? 'border-[var(--accent)]' : 'border-[var(--border-soft)]',
            ].join(' ')}>
              <img
                src={image.previewUrl}
                alt={image.title}
                className="block w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.02]"
                draggable={false}
              />
              {/* Drag handle — top-left, opposite the action buttons (bottom-right) */}
              <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-2 z-20 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-xl bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/sortable:opacity-100 active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="size-3.5" />
              </div>
              {isSelected ? (
                <span className="absolute inset-0 rounded-2xl ring-2 ring-[var(--accent)] ring-inset pointer-events-none" />
              ) : null}
            </div>
            <div className="relative flex flex-col gap-2 bg-[rgba(7,7,7,0.72)] rounded-2xl p-4 pb-12 border border-[var(--border-soft)]">
              <p className="text-[13px] font-semibold text-[var(--foreground)] leading-snug">
                {image.title || deriveReferenceAttachmentTitle(image.name)}
              </p>
              {image.description ? (
                <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.5] line-clamp-6">{image.description}</p>
              ) : (
                <p className="text-[12px] text-[var(--muted-foreground)] italic opacity-40">Sem descrição</p>
              )}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDownload(); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[rgba(15,16,16,0.88)] px-2 py-1 text-[11px] text-[var(--muted-foreground)] backdrop-blur-sm transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Download
                </button>
                {!isSoloFolder ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(229,112,112,0.3)] bg-[rgba(15,16,16,0.88)] px-2 py-1 text-[11px] text-[rgb(229,112,112)] backdrop-blur-sm transition-colors hover:border-[rgba(229,112,112,0.6)] hover:text-[rgb(245,178,178)]"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        {contextMenu}
      </ContextMenu>
    </div>
  );
}

function SimpleImageEditDialog({
  open,
  title: initialTitle,
  description: initialDescription,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; description: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/8 bg-[rgba(15,16,16,0.96)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-[var(--foreground)]">Edit image</DialogTitle>
          <DialogDescription className="sr-only">Edit image name and description.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-[14px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-3 text-[13px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
              placeholder="Image name…"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">When to use</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Angle, detail, pose, or situation…"
              className="resize-none rounded-[14px] border border-[var(--border-soft)] bg-[rgba(7,7,7,0.72)] px-3 py-3 text-[13px] leading-5 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[color-mix(in_srgb,var(--accent)_45%,white_6%)]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-full border border-[var(--border-soft)] px-4 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try { await onSave({ title, description }); } finally { setSaving(false); }
              }}
              className="h-9 rounded-full bg-[var(--accent)] px-4 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function copyImageFromUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

async function downloadImageFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function SortableCarouselImage({
  image,
  onEdit,
  onDelete,
}: {
  image: { id: string; previewUrl: string; title: string };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
        flex: '0 0 calc(28% - 4px)',
        aspectRatio: '1 / 1',
        padding: '8px',
        zIndex: isDragging ? 30 : undefined,
      }}
      className="group/img relative shrink-0"
    >
      <div className={`relative h-full w-full overflow-hidden rounded-xl bg-[var(--surface2)] transition-shadow duration-150 ${isDragging ? 'shadow-2xl ring-2 ring-[var(--accent)]' : ''}`}>
        <img
          src={image.previewUrl}
          alt={image.title}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6">
          <span className="block truncate text-[10px] font-medium text-white/90">
            {image.title || image.previewUrl.split('/').pop()}
          </span>
        </div>
        {/* Drag handle — top-left, opposite ellipsis column (top-right) */}
        <div
          {...attributes}
          {...listeners}
          data-drag-handle
          className="absolute left-1.5 top-1.5 z-20 inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-lg bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/img:opacity-100 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3" />
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 flex flex-col items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity duration-150">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-32 p-1" onClick={(e) => e.stopPropagation()}>
              {onEdit ? (
                <button type="button" onClick={() => onEdit(image.id)} className="flex w-full items-center rounded-md px-2 py-1.5 text-[13px] text-[var(--foreground)] transition-colors hover:bg-white/6">Edit</button>
              ) : null}
              {onDelete ? (
                <button type="button" onClick={() => { sounds.select(); onDelete(image.id); }} className="flex w-full items-center rounded-md px-2 py-1.5 text-[13px] text-[rgb(229,112,112)] transition-colors hover:bg-[rgba(190,58,58,0.18)]">Delete</button>
              ) : null}
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); sounds.select(); void copyImageFromUrl(image.previewUrl); }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); sounds.select(); void downloadImageFromUrl(image.previewUrl, image.title || 'image'); }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderImageCarousel({
  images,
  onEdit,
  onDelete,
  onReorder,
}: {
  images: { id: string; previewUrl: string; title: string }[];
  onEdit?: (imageId: string) => void;
  onDelete?: (imageId: string) => void;
  onReorder?: (newIds: string[]) => void;
}) {
  const orderedIds = images.map((img) => img.id);
  // Embla powers free-scroll browsing; watchDrag bails out when the pointer
  // starts on a drag handle so dnd-kit owns reordering and Embla owns scrolling.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
    watchDrag: (_, event) => {
      const target = event.target as HTMLElement | null;
      return !(target && target.closest('[data-drag-handle]'));
    },
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  // Merge Embla's ref with our own so we can read the viewport rect for edge
  // auto-scroll during a drag.
  const setViewport = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    emblaRef(node);
  }, [emblaRef]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current != null) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction: 'prev' | 'next') => {
    if (autoScrollRef.current != null) return;
    autoScrollRef.current = setInterval(() => {
      if (!emblaApi) return;
      if (direction === 'next') emblaApi.scrollNext();
      else emblaApi.scrollPrev();
    }, 180);
  }, [emblaApi]);

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const activator = event.activatorEvent as MouseEvent | TouchEvent;
    const startX = 'clientX' in activator
      ? activator.clientX
      : activator.touches?.[0]?.clientX ?? 0;
    const pointerX = startX + event.delta.x;
    const edge = 56;
    if (pointerX < rect.left + edge) startAutoScroll('prev');
    else if (pointerX > rect.right - edge) startAutoScroll('next');
    else stopAutoScroll();
  }, [startAutoScroll, stopAutoScroll]);

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Folder className="size-8 text-[var(--muted-foreground)]/20" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragMove={handleDragMove}
      onDragEnd={(e) => {
        stopAutoScroll();
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const from = orderedIds.indexOf(String(active.id));
        const to = orderedIds.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        onReorder?.(arrayMove(orderedIds, from, to));
      }}
      onDragCancel={stopAutoScroll}
    >
      <SortableContext items={orderedIds} strategy={horizontalListSortingStrategy}>
        <div className="overflow-hidden h-full" ref={setViewport}>
          <div className="flex h-full gap-1.5 p-1.5">
            {images.map((image) => (
              <SortableCarouselImage
                key={image.id}
                image={image}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ReferencesWorkspace({
  folders: referenceFolders,
  references,
  route,
  sidebarWidth,
  isSidebarCollapsed,
  isSidebarResizing,
  onStartSidebarResize,
  seedFiles,
  onSeedFilesConsumed,
  onCreateFolder,
  onAddImages,
  onRenameFolder,
  onRenameImage,
  onGroupImages,
  onMoveImages,
  onUpdateReferenceMetadata,
  onDeleteImageFromFolder,
  onDeleteReference,
  onExportReference,
  onImportReference,
}: {
  folders: ReferenceFolderRecord[];
  references: SavedReferenceImage[];
  route: ReferenceLibraryRoute;
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  isSidebarResizing: boolean;
  onStartSidebarResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  seedFiles: File[];
  onSeedFilesConsumed: () => void;
  onCreateFolder: (
    title: string,
    route: ReferenceLibraryRoute,
    parentFolderId?: string | null,
  ) => Promise<ReferenceFolderRecord>;
  onAddImages: (args: { folderId: string; category: ReferenceLibraryRoute; folderTitle: string; newFiles: File[]; existingImages: SavedReferenceImage[] }) => Promise<void>;
  onRenameFolder: (args: { folderId: string; category: ReferenceLibraryRoute; newTitle: string }) => Promise<void>;
  onRenameImage: (args: { imageId: string; folderId: string; category: ReferenceLibraryRoute; newTitle: string }) => Promise<void>;
  onGroupImages: (args: { imageIds: string[]; category: ReferenceLibraryRoute; newFolderTitle: string; sourceFolderId: string }) => Promise<void>;
  onMoveImages: (args: { imageIds: string[]; category: ReferenceLibraryRoute; sourceFolderId: string; targetFolderId: string; targetFolderTitle: string }) => Promise<void>;
  onUpdateReferenceMetadata: (args: { folderId: string; category: ReferenceLibraryRoute; draft: ReferenceMetadataDraft }) => Promise<void>;
  onDeleteImageFromFolder: (args: { imageId: string; folderId: string; category: ReferenceLibraryRoute; folderTitle: string }) => Promise<void>;
  onDeleteReference: (reference: SavedReferenceImage) => void;
  onExportReference: (reference: SavedReferenceImage) => void;
  onImportReference: () => void;
}) {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [renameImageTarget, setRenameImageTarget] = useState<SavedReferenceImage | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: string; title: string } | null>(null);
  const [metadataTarget, setMetadataTarget] = useState<{ folderId: string; imageId: string | null } | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isMovePopoverOpen, setIsMovePopoverOpen] = useState(false);
  const [imageEditTarget, setImageEditTarget] = useState<{ imageId: string; folderId: string; title: string; description: string } | null>(null);
  const [animatedTitleText, setAnimatedTitleText] = useState(referenceRouteHeaderLabels[route]);
  const [refViewMode, setRefViewMode] = useState<'grid' | 'list'>('grid');
  const [refGridZoom, setRefGridZoom] = useState(50);
  const [orderVersion, setOrderVersion] = useState(0);
  const refDndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  const hasInitializedRouteRef = useRef(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImageIds((current) =>
      current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId]
    );
  }, []);

  const scopedReferences = useMemo(
    () => references.filter((r) => r.category === route),
    [references, route]
  );

  const scopedFolderRecords = useMemo(
    () => referenceFolders.filter((folder) => folder.category === route),
    [referenceFolders, route]
  );

  const folders = useMemo(() => {
    const map = new Map<string, {
      id: string;
      title: string;
      description: string;
      images: SavedReferenceImage[];
      isSolo: boolean;
      parentFolderId: string | null;
      createdAt: string;
      latestActivityAt: string;
    }>();

    for (const folder of scopedFolderRecords) {
      map.set(folder.id, {
        id: folder.id,
        title: folder.title,
        description: folder.description ?? '',
        images: [],
        isSolo: false,
        parentFolderId: folder.parentFolderId ?? null,
        createdAt: folder.createdAt,
        latestActivityAt: folder.createdAt,
      });
    }

    for (const ref of scopedReferences) {
      const folderId = ref.collectionId ?? ref.environmentId ?? ref.id;
      const title = ref.groupTitle?.trim() || ref.title;
      const isSolo = !ref.collectionId && !ref.environmentId;
      if (!map.has(folderId)) {
        map.set(folderId, {
          id: folderId,
          title,
          description: ref.groupDescription ?? ref.description ?? '',
          images: [],
          isSolo,
          parentFolderId: ref.parentFolderId ?? null,
          createdAt: ref.createdAt,
          latestActivityAt: ref.createdAt,
        });
      }
      const folder = map.get(folderId)!;
      folder.title = title;
      folder.description = ref.groupDescription ?? folder.description ?? '';
      folder.isSolo = isSolo;
      folder.parentFolderId = ref.parentFolderId ?? folder.parentFolderId ?? null;
      folder.createdAt = folder.createdAt || ref.createdAt;
      if (ref.createdAt > folder.latestActivityAt) {
        folder.latestActivityAt = ref.createdAt;
      }
      folder.images.push(ref);
    }
    return [...map.values()].sort((a, b) => b.latestActivityAt.localeCompare(a.latestActivityAt));
  }, [scopedFolderRecords, scopedReferences]);

  const openFolder = openFolderId ? (folders.find((f) => f.id === openFolderId) ?? null) : null;
  const topLevelFolders = useMemo(
    () => folders.filter((folder) => folder.parentFolderId === null),
    [folders]
  );
  const displayFolder = openFolder ?? topLevelFolders[0] ?? null;
  const activeFolderId = openFolderId ?? displayFolder?.id ?? null;
  const activeSidebarFolderId = useMemo(() => {
    if (!activeFolderId) {
      return topLevelFolders[0]?.id ?? null;
    }

    let currentFolder = folders.find((folder) => folder.id === activeFolderId) ?? null;
    while (currentFolder?.parentFolderId) {
      currentFolder = folders.find((folder) => folder.id === currentFolder?.parentFolderId) ?? null;
    }

    return currentFolder?.id ?? activeFolderId;
  }, [activeFolderId, folders, topLevelFolders]);
  const openFolderPath = useMemo(() => {
    if (!displayFolder) {
      return [] as typeof folders;
    }

    const chain: typeof folders = [];
    let currentFolder: (typeof folders)[number] | null = displayFolder;
    while (currentFolder) {
      chain.unshift(currentFolder);
      currentFolder = currentFolder.parentFolderId
        ? folders.find((folder) => folder.id === currentFolder?.parentFolderId) ?? null
        : null;
    }

    return chain;
  }, [displayFolder, folders]);
  const parentFolder = openFolderPath.length > 1 ? openFolderPath[openFolderPath.length - 2] ?? null : null;
  const breadcrumbAriaLabel = useMemo(() => {
    const parts = [referenceRouteHeaderLabels[route], ...openFolderPath.map((folder) => folder.title)];
    return parts.join(' > ');
  }, [openFolderPath, route]);

  // Clear any image selection when leaving / switching folders.
  useEffect(() => {
    setSelectedImageIds([]);
  }, [openFolderId]);

  useLayoutEffect(() => {
    if (!openFolder && topLevelFolders.length > 0) {
      setOpenFolderId(topLevelFolders[0].id);
    }
  }, [openFolder, topLevelFolders]);

  useEffect(() => {
    if (seedFiles.length > 0) {
      setIsNewFolderDialogOpen(true);
    }
  }, [seedFiles]);

  useEffect(() => {
    if (!hasInitializedRouteRef.current) {
      hasInitializedRouteRef.current = true;
      return;
    }
    dragDepthRef.current = 0;
    setOpenFolderId(null);
    setIsNewFolderDialogOpen(false);
    setIsDragActive(false);
    setIsRenamingTitle(false);
    setTitleDraft('');
    setSelectedImageIds([]);
    setRenameImageTarget(null);
    setRenameFolderTarget(null);
    setIsGroupDialogOpen(false);
    setIsMovePopoverOpen(false);
    setAnimatedTitleText(referenceRouteHeaderLabels[route]);
    setRefViewMode('grid');
  }, [route]);

  useEffect(() => {
    if (isRenamingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenamingTitle]);

  useEffect(() => {
    if (!displayFolder) {
      setAnimatedTitleText(referenceRouteHeaderLabels[route]);
      return;
    }

    setAnimatedTitleText('');
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedTitleText(displayFolder.title);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [displayFolder, route]);

  async function handleCreateFolder(title: string) {
    setIsSaving(true);
    try {
      const folder = await onCreateFolder(title, route);
      setOpenFolderId(folder.id);
      if (seedFiles.length > 0) {
        const folderImages = references.filter(
          (r) => (r.collectionId ?? r.environmentId) === folder.id
        );
        await onAddImages({
          folderId: folder.id,
          category: route,
          folderTitle: title,
          newFiles: seedFiles,
          existingImages: folderImages,
        });
        onSeedFilesConsumed();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDropFiles(fileList: FileList | File[]) {
    if (!activeFolderId || !displayFolder) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setIsSaving(true);
    try {
      await onAddImages({
        folderId: activeFolderId,
        category: route,
        folderTitle: displayFolder.title,
        newFiles: imageFiles,
        existingImages: displayFolder.images,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function commitRename() {
    if (!activeFolderId || !displayFolder || !titleDraft.trim()) {
      setIsRenamingTitle(false);
      return;
    }
    const newTitle = titleDraft.trim();
    if (newTitle === displayFolder.title) {
      setIsRenamingTitle(false);
      return;
    }
    setIsRenamingTitle(false);
    await onRenameFolder({ folderId: activeFolderId, category: route, newTitle });
  }

  function downloadReferenceImage(image: SavedReferenceImage) {
    const ext = image.mimeType?.split('/')[1]?.split('+')[0] || 'png';
    const baseName = (image.title || deriveReferenceAttachmentTitle(image.name) || 'referencia')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .trim();
    const anchor = document.createElement('a');
    anchor.href = image.previewUrl;
    anchor.download = `${baseName}.${ext}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const folderImages = displayFolder?.images ?? [];
  const childFolders = displayFolder ? folders.filter((entry) => entry.parentFolderId === displayFolder.id) : [];

  // Saved order (localStorage) wins, alphabetical is the default. orderVersion
  // forces a recompute after a drag persists a new order.
  const sortedChildFolders = useMemo(() => {
    void orderVersion;
    if (!displayFolder) return childFolders;
    return applyOrder(childFolders, getFolderOrder(displayFolder.id), (f) => f.id, (f) => f.title);
  }, [childFolders, displayFolder, orderVersion]);

  const sortedFolderImages = useMemo(() => {
    void orderVersion;
    if (!displayFolder) return folderImages;
    return applyOrder(folderImages, getImageOrder(displayFolder.id), (img) => img.id, (img) => img.title || img.name);
  }, [folderImages, displayFolder, orderVersion]);
  const isSoloFolder = displayFolder?.isSolo ?? false;
  const representativeRef = folderImages[0];
  const selectedImages = folderImages.filter((img) => selectedImageIds.includes(img.id));
  const metadataFolder = metadataTarget
    ? (folders.find((folder) => folder.id === metadataTarget.folderId) ?? null)
    : null;
  const metadataDraft = metadataFolder
    ? {
        title: metadataFolder.title,
        description: metadataFolder.description,
        images: metadataFolder.images.map((image) => ({
          id: image.id,
          name: image.name,
          title: image.title,
          description: image.description ?? '',
          previewUrl: image.previewUrl,
        })),
      }
    : null;

  function openMetadataDialog(folderId: string, imageId: string | null = null) {
    setMetadataTarget({ folderId, imageId });
  }

  function handleRefFolderDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !displayFolder) return;
    const ids = sortedChildFolders.map((f) => f.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    setFolderOrder(displayFolder.id, arrayMove(ids, from, to));
    setOrderVersion((v) => v + 1);
  }

  function handleRefImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !displayFolder) return;
    const ids = sortedFolderImages.map((img) => img.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    setImageOrder(displayFolder.id, arrayMove(ids, from, to));
    setOrderVersion((v) => v + 1);
  }

  function renderFolderCard(folder: {
    id: string;
    title: string;
    description: string;
    images: SavedReferenceImage[];
  }) {
    const coverImage = folder.images[0];
    return (
      <ContextMenu key={folder.id}>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onDoubleClick={() => openMetadataDialog(folder.id)}
            className="group relative overflow-hidden rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] text-left transition-[border-color,box-shadow] duration-200 hover:border-[var(--border-strong)] hover:shadow-md"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface2)]">
              {coverImage ? (
                <img
                  src={coverImage.previewUrl}
                  alt={folder.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Folder className="size-10 text-[var(--muted-foreground)]/30" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
                <div className="flex items-end justify-between gap-2">
                  <h2 className="line-clamp-1 text-[14px] font-semibold text-white">
                    {folder.title}
                  </h2>
                  <span className="shrink-0 text-[12px] text-white/60">
                    {folder.images.length} {folder.images.length === 1 ? 'imagem' : 'imagens'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => openMetadataDialog(folder.id)}>Editar metadata...</ContextMenuItem>
          <ContextMenuItem onClick={() => setRenameFolderTarget({ id: folder.id, title: folder.title })}>Renomear...</ContextMenuItem>
          {coverImage ? (
            <ContextMenuItem onClick={() => onExportReference(coverImage)}>Exportar pasta...</ContextMenuItem>
          ) : null}
          {coverImage ? <ContextMenuSeparator /> : null}
          {coverImage ? (
            <ContextMenuItem
              className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
              onClick={() => onDeleteReference(coverImage)}
            >
              Excluir pasta
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <>
      <EntityNameDialog
        open={isNewFolderDialogOpen}
        onOpenChange={(open) => {
          setIsNewFolderDialogOpen(open);
          if (!open) onSeedFilesConsumed();
        }}
        title="Nova pasta"
        description="Dê um nome para sua pasta de referências."
        label="Nome da pasta"
        initialValue=""
        submitLabel="Criar pasta"
        onSubmit={(name) => { void handleCreateFolder(name); }}
      />
      <EntityNameDialog
        open={renameFolderTarget !== null}
        onOpenChange={(open) => { if (!open) setRenameFolderTarget(null); }}
        title="Renomear pasta"
        description="Dê um novo nome para esta pasta de referências."
        label="Nome da pasta"
        initialValue={renameFolderTarget?.title ?? ''}
        submitLabel="Salvar"
        onSubmit={async (name) => {
          const target = renameFolderTarget;
          setRenameFolderTarget(null);
          if (!target) return;
          await onRenameFolder({ folderId: target.id, category: route, newTitle: name });
        }}
      />
      <EntityNameDialog
        open={renameImageTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameImageTarget(null);
        }}
        title="Renomear imagem"
        description="Dê um novo nome para esta referência."
        label="Nome da imagem"
        initialValue={renameImageTarget?.title ?? ''}
        submitLabel="Salvar"
        onSubmit={async (name) => {
          const target = renameImageTarget;
          setRenameImageTarget(null);
          if (!target || !activeFolderId) return;
          await onRenameImage({ imageId: target.id, folderId: activeFolderId, category: route, newTitle: name });
        }}
      />
      <EntityNameDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        title="Nova subpasta"
        description="Dê um nome para a pasta que agrupará as imagens selecionadas."
        label="Nome da pasta"
        initialValue=""
        submitLabel="Agrupar"
        onSubmit={async (name) => {
          const ids = selectedImageIds;
          setIsGroupDialogOpen(false);
          if (!openFolderId || ids.length === 0) return;
          setSelectedImageIds([]);
          await onGroupImages({ imageIds: ids, category: route, newFolderTitle: name, sourceFolderId: activeFolderId });
        }}
      />
      {imageEditTarget ? (
        <SimpleImageEditDialog
          open
          title={imageEditTarget.title}
          description={imageEditTarget.description}
          onOpenChange={(open) => { if (!open) setImageEditTarget(null); }}
          onSave={async ({ title, description }) => {
            const folder = folders.find((f) => f.id === imageEditTarget.folderId);
            if (!folder) return;
            await onUpdateReferenceMetadata({
              folderId: imageEditTarget.folderId,
              category: route,
              draft: {
                title: folder.title,
                description: folder.description,
                images: folder.images.map((img) =>
                  img.id === imageEditTarget.imageId
                    ? { id: img.id, name: img.name, title, description, previewUrl: img.previewUrl }
                    : { id: img.id, name: img.name, title: img.title, description: img.description ?? '', previewUrl: img.previewUrl }
                ),
              },
            });
            setImageEditTarget(null);
          }}
        />
      ) : null}
      {metadataFolder && metadataDraft ? (
        <ReferenceMetadataDialog
          open
          folderId={metadataFolder.id}
          initialDraft={metadataDraft}
          initialImageId={metadataTarget?.imageId ?? null}
          onOpenChange={(open) => {
            if (!open) setMetadataTarget(null);
          }}
          onSave={(draft) =>
            onUpdateReferenceMetadata({
              folderId: metadataFolder.id,
              category: route,
              draft,
            })
          }
          onDeleteImage={(imageId) => {
            if (!metadataFolder) return;
            void onDeleteImageFromFolder({
              imageId,
              folderId: metadataFolder.id,
              category: route,
              folderTitle: metadataFolder.title,
            });
          }}
        />
      ) : null}

      <header
        className={[
          'fixed top-[8px] z-40 flex items-center gap-2',
          'transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isSidebarCollapsed ? 'left-3' : 'left-[272px]',
        ].join(' ')}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`reference-header-${route}-${displayFolder?.id ?? 'empty'}-${isRenamingTitle ? 'editing' : 'view'}`}
            initial={{ opacity: 0, filter: 'blur(6px)', y: 4 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(6px)', y: -3 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            data-testid="reference-header-chrome"
            className="flex h-9 items-center gap-1.5 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.72)] px-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
          >
            {parentFolder ? (
              <button
                type="button"
                aria-label={`Voltar para ${parentFolder.title}`}
                onClick={() => {
                  setOpenFolderId(parentFolder.id);
                  setIsRenamingTitle(false);
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : null}
            <h1
              aria-label={breadcrumbAriaLabel}
              className="min-w-0 text-[16px] font-medium leading-none tracking-[0] text-[var(--foreground)]"
            >
              {isRenamingTitle && displayFolder ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    void commitRename();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commitRename();
                    }
                    if (e.key === 'Escape') {
                      setIsRenamingTitle(false);
                    }
                  }}
                  className="min-w-[240px] bg-transparent text-[16px] font-medium leading-none tracking-[0] text-[var(--foreground)] outline-none"
                />
              ) : displayFolder ? (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(displayFolder.title);
                    setIsRenamingTitle(true);
                  }}
                  className="group inline-flex min-w-0 max-w-full items-center text-left"
                  title="Clique para renomear"
                >
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted-foreground)]">
                    <span className="rounded-full border border-white/8 bg-[rgba(32,32,33,0.78)] px-2.5 py-1 text-[11px] uppercase">
                      {referenceRouteHeaderLabels[route]}
                    </span>
                    {openFolderPath.slice(0, -1).map((folder) => (
                      <Fragment key={`reference-breadcrumb-parent-${folder.id}`}>
                        <ChevronRight className="size-3.5 text-[var(--muted-foreground)]/70" />
                        <span className="max-w-[160px] truncate text-[13px] text-[var(--muted-foreground)]">
                          {folder.title}
                        </span>
                      </Fragment>
                    ))}
                    <ChevronRight className="size-3.5 text-[var(--muted-foreground)]/70" />
                  </span>
                  <span className="relative min-w-0 max-w-[320px] pr-0">
                    <SlotText text={animatedTitleText} className="truncate text-[16px] text-[var(--foreground)]" />
                    <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-4 group-hover:opacity-55">
                      <Pencil className="size-3.5" />
                    </span>
                  </span>
                </button>
              ) : (
                <SlotText text={animatedTitleText} className="truncate" />
              )}
            </h1>
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <div className="relative inline-grid h-8 grid-cols-2 items-center rounded-full bg-[rgba(15,16,16,0.88)] p-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ x: refViewMode === 'grid' ? '0%' : '100%' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-1 left-1 top-1 w-[calc((100%_-_8px)/2)] rounded-full bg-[var(--border-soft)]"
            />
            {(['grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={refViewMode === mode}
                onClick={() => setRefViewMode(mode)}
                className={[
                  'relative z-10 inline-flex h-6 min-w-[48px] items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors duration-200 capitalize',
                  refViewMode === mode ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                ].join(' ')}
              >
                {mode === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>
          {refViewMode === 'grid' ? (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(15,16,16,0.88)] px-3 h-8 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
              <span className="text-[10px] text-[var(--muted-foreground)]">{refGridZoom}%</span>
              <input
                type="range"
                min={20}
                max={100}
                value={refGridZoom}
                onChange={(e) => setRefGridZoom(Number(e.target.value))}
                className="w-20 h-1 cursor-pointer accent-[var(--accent)]"
                aria-label="Image size"
              />
            </div>
          ) : null}
        </div>
      </header>

      <AnimatePresence initial={false}>
        <motion.div
          key={`reference-sidebar-${route}`}
          data-testid="reference-sidebar-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={[
            'fixed bottom-0 right-0 top-0 z-20 overflow-hidden border-l border-[var(--border-soft)] bg-[var(--surface)] will-change-[width]',
            isSidebarResizing ? '' : 'transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
          ].join(' ')}
          style={{ width: sidebarWidth, minWidth: MIN_SCENES_SIDEBAR_WIDTH }}
        >
          <button
            type="button"
            aria-label="Resize references sidebar"
            onPointerDown={onStartSidebarResize}
            className="absolute bottom-0 left-0 top-0 z-30 w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
          />
          <div data-testid="reference-sidebar" className="flex h-full w-full flex-col overflow-hidden bg-[var(--surface)]">
            <div className="border-b border-[var(--border-soft)] p-4">
              <div className="flex items-center justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Import references"
                      onClick={onImportReference}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(32,32,33,0.72)] text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                    >
                      <Upload className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Import references</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Create reference folder"
                      onClick={() => setIsNewFolderDialogOpen(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,rgba(32,32,33,0.82))] text-white transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_28%,rgba(32,32,33,0.88))]"
                    >
                      <FolderPlus className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Create reference folder</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <div className="px-3 text-[11px] font-medium uppercase tracking-[0] text-[var(--muted-foreground)]">
                {referenceRouteLabels[route]}
              </div>
              <div className="mt-2 space-y-1">
                {topLevelFolders.map((topLevelFolder) => {
                  const isActive = topLevelFolder.id === activeSidebarFolderId;
                  const cover = topLevelFolder.images[0];
                  return (
                    <ContextMenu key={topLevelFolder.id}>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFolderId(topLevelFolder.id);
                            setIsRenamingTitle(false);
                          }}
                          className={[
                            'flex min-h-10 w-full items-center rounded-[12px] px-3 text-left text-[13px] transition-colors',
                            isActive
                              ? 'bg-[var(--surface2)] text-[var(--foreground)]'
                              : 'text-[var(--muted-foreground)] hover:bg-white/6 hover:text-[var(--foreground)]',
                          ].join(' ')}
                        >
                          <span className="truncate">{topLevelFolder.title}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setRenameFolderTarget({ id: topLevelFolder.id, title: topLevelFolder.title })}>Renomear...</ContextMenuItem>
                        {cover ? <ContextMenuItem onClick={() => onExportReference(cover)}>Duplicar...</ContextMenuItem> : null}
                        {cover ? <ContextMenuSeparator /> : null}
                        {cover ? (
                          <ContextMenuItem
                            className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                            onClick={() => onDeleteReference(cover)}
                          >
                            Excluir pasta
                          </ContextMenuItem>
                        ) : null}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {topLevelFolders.length === 0 ? (
                  <p className="px-3 pt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                    Crie uma pasta para organizar suas referências visuais.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -4, filter: 'blur(6px)' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full px-8 pb-10 pt-8"
        onDragEnter={(e) => {
          if (isSoloFolder || !displayFolder) return;
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsDragActive(true);
        }}
        onDragOver={(e) => {
          if (isSoloFolder || !displayFolder) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          if (isSoloFolder || !displayFolder) return;
          e.preventDefault();
          dragDepthRef.current -= 1;
          if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setIsDragActive(false);
          }
        }}
        onDrop={(e) => {
          if (isSoloFolder || !displayFolder) return;
          e.preventDefault();
          dragDepthRef.current = 0;
          setIsDragActive(false);
          void handleDropFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleDropFiles(e.target.files ?? []);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        {isDragActive ? (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-[var(--accent)] bg-[var(--surface)]/90 px-10 py-8 shadow-xl">
              <FolderPlus className="size-8 text-[var(--accent)]" />
              <span className="text-[16px] font-medium text-[var(--foreground)]">Solte para adicionar à pasta</span>
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pt-6">
          {displayFolder ? (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`ref-view-${refViewMode}`}
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(6px)', position: 'absolute', inset: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="flex flex-col gap-8"
                >
                  {/* Subfolders */}
                  {childFolders.length > 0 ? (
                    refViewMode === 'grid' ? (
                      <DndContext
                        sensors={refDndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleRefFolderDragEnd}
                      >
                        <SortableContext items={sortedChildFolders.map((f) => f.id)} strategy={rectSortingStrategy}>
                          <div className="grid gap-6" data-testid="reference-subfolder-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(200 + refGridZoom * 3)}px, 1fr))` }}>
                            {sortedChildFolders.map((childFolder) => {
                              const cover = childFolder.images[0];
                              return (
                                <SortableRefFolderGridCard
                                  key={childFolder.id}
                                  folder={childFolder}
                                  onDoubleClick={() => openMetadataDialog(childFolder.id)}
                                  contextMenu={
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => openMetadataDialog(childFolder.id)}>Editar metadata...</ContextMenuItem>
                                      <ContextMenuItem onClick={() => setRenameFolderTarget({ id: childFolder.id, title: childFolder.title })}>Renomear...</ContextMenuItem>
                                      {cover ? <ContextMenuItem onClick={() => onExportReference(cover)}>Exportar pasta...</ContextMenuItem> : null}
                                      {cover ? <ContextMenuSeparator /> : null}
                                      {cover ? <ContextMenuItem className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]" onClick={() => onDeleteReference(cover)}>Excluir pasta</ContextMenuItem> : null}
                                    </ContextMenuContent>
                                  }
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <DndContext
                        sensors={refDndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleRefFolderDragEnd}
                      >
                        <SortableContext items={sortedChildFolders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                          <div className="flex flex-col gap-3" style={{ alignItems: 'stretch' }}>
                            {sortedChildFolders.map((childFolder) => {
                              const orderedImages = applyOrder(childFolder.images, getImageOrder(childFolder.id), (img) => img.id, (img) => img.title || img.name);
                              const cover = orderedImages[0];
                              return (
                                <SortableRefFolderListRow
                                  key={childFolder.id}
                                  folder={{ ...childFolder, images: orderedImages }}
                                  onEdit={(imageId) => {
                                    const img = childFolder.images.find((i) => i.id === imageId);
                                    if (img) setImageEditTarget({ imageId, folderId: childFolder.id, title: img.title, description: img.description ?? '' });
                                  }}
                                  onDeleteImage={(imageId) => {
                                    void onDeleteImageFromFolder({ imageId, folderId: childFolder.id, category: route, folderTitle: childFolder.title });
                                  }}
                                  onReorderImages={(newIds) => {
                                    setImageOrder(childFolder.id, newIds);
                                    setOrderVersion((v) => v + 1);
                                  }}
                                  contextMenu={
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => openMetadataDialog(childFolder.id)}>Editar metadata...</ContextMenuItem>
                                      <ContextMenuItem onClick={() => setRenameFolderTarget({ id: childFolder.id, title: childFolder.title })}>Renomear...</ContextMenuItem>
                                      {cover ? <ContextMenuItem onClick={() => onExportReference(cover)}>Exportar pasta...</ContextMenuItem> : null}
                                      {cover ? <ContextMenuSeparator /> : null}
                                      {cover ? <ContextMenuItem className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]" onClick={() => onDeleteReference(cover)}>Excluir pasta</ContextMenuItem> : null}
                                    </ContextMenuContent>
                                  }
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )
                  ) : null}

                  {/* Images */}
                  {folderImages.length === 0 && childFolders.length === 0 ? (
                    <div
                      onClick={() => !isSoloFolder && fileInputRef.current?.click()}
                      className={[
                        'flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed',
                        'transition-[border-color,background-color] duration-200',
                        isDragActive
                          ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]'
                          : 'border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
                      ].join(' ')}
                    >
                      <FolderPlus className="mb-3 size-10 text-[var(--muted-foreground)]/50" />
                      <p className="text-[15px] font-medium text-[var(--foreground)]">Pasta vazia</p>
                      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                        {isSoloFolder ? 'Esta referência não suporta imagens adicionais.' : 'Arraste imagens ou clique para adicionar.'}
                      </p>
                    </div>
                  ) : folderImages.length > 0 || (refViewMode === 'grid' && childFolders.length > 0 && !isSoloFolder) ? (
                    refViewMode === 'grid' ? (
                      <DndContext
                        sensors={refDndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleRefImageDragEnd}
                      >
                        <SortableContext items={sortedFolderImages.map((img) => img.id)} strategy={rectSortingStrategy}>
                          <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(150 + refGridZoom * 3)}px, 1fr))` }}>
                            {sortedFolderImages.map((image) => {
                              const isSelected = selectedImageIds.includes(image.id);
                              return (
                                <SortableRefImageGridCard
                                  key={image.id}
                                  image={image}
                                  isSelected={isSelected}
                                  isSoloFolder={isSoloFolder}
                                  onClick={() => toggleImageSelection(image.id)}
                                  onDoubleClick={() => openMetadataDialog(displayFolder.id, image.id)}
                                  onDelete={() => {
                                    setSelectedImageIds((current) => current.filter((id) => id !== image.id));
                                    void onDeleteImageFromFolder({ imageId: image.id, folderId: displayFolder.id, category: route, folderTitle: displayFolder.title });
                                  }}
                                  contextMenu={
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => setRenameImageTarget(image)}>Renomear...</ContextMenuItem>
                                      <ContextMenuItem onClick={() => downloadReferenceImage(image)}>Baixar</ContextMenuItem>
                                      {!isSoloFolder ? (
                                        <>
                                          <ContextMenuSeparator />
                                          <ContextMenuItem
                                            className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                                            onClick={() => {
                                              setSelectedImageIds((current) => current.filter((id) => id !== image.id));
                                              void onDeleteImageFromFolder({ imageId: image.id, folderId: displayFolder.id, category: route, folderTitle: displayFolder.title });
                                            }}
                                          >
                                            Excluir imagem
                                          </ContextMenuItem>
                                        </>
                                      ) : null}
                                    </ContextMenuContent>
                                  }
                                />
                              );
                            })}
                            {!isSoloFolder ? (
                              <button
                                type="button"
                                aria-label="Add images to folder"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ aspectRatio: '1 / 1' }}
                                className="flex w-full flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted-foreground)] transition-[border-color,background-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface2)] hover:text-[var(--foreground)]"
                              >
                                <Plus className="size-7" />
                              </button>
                            ) : null}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <DndContext
                        sensors={refDndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleRefImageDragEnd}
                      >
                        <SortableContext items={sortedFolderImages.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                          <div className="flex flex-col gap-3">
                            {sortedFolderImages.map((image) => {
                              const isSelected = selectedImageIds.includes(image.id);
                              return (
                                <SortableRefImageListRow
                                  key={image.id}
                                  image={image}
                                  isSelected={isSelected}
                                  isSoloFolder={isSoloFolder}
                                  onClick={() => toggleImageSelection(image.id)}
                                  onDoubleClick={() => openMetadataDialog(displayFolder.id, image.id)}
                                  onDownload={() => { sounds.select(); downloadReferenceImage(image); }}
                                  onDelete={() => {
                                    sounds.select();
                                    setSelectedImageIds((current) => current.filter((id) => id !== image.id));
                                    void onDeleteImageFromFolder({ imageId: image.id, folderId: displayFolder.id, category: route, folderTitle: displayFolder.title });
                                  }}
                                  contextMenu={
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => setRenameImageTarget(image)}>Renomear...</ContextMenuItem>
                                      <ContextMenuItem onClick={() => { sounds.select(); downloadReferenceImage(image); }}>Baixar</ContextMenuItem>
                                      {!isSoloFolder ? (
                                        <>
                                          <ContextMenuSeparator />
                                          <ContextMenuItem
                                            className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                                            onClick={() => {
                                              sounds.select();
                                              setSelectedImageIds((current) => current.filter((id) => id !== image.id));
                                              void onDeleteImageFromFolder({ imageId: image.id, folderId: displayFolder.id, category: route, folderTitle: displayFolder.title });
                                            }}
                                          >
                                            Excluir imagem
                                          </ContextMenuItem>
                                        </>
                                      ) : null}
                                    </ContextMenuContent>
                                  }
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-[var(--border-soft)] bg-[var(--surface)]">
              <div className="flex max-w-[340px] flex-col items-center text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface2)] text-[var(--muted-foreground)]">
                  <FolderPlus className="size-5" />
                </div>
                <h2 className="text-[15px] font-medium tracking-[0] text-[var(--foreground)]">Nenhuma pasta ainda</h2>
                <p className="mt-2 text-[13px] leading-5 text-[var(--muted-foreground)]">
                  Crie uma pasta para organizar suas referências visuais.
                </p>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {selectedImages.length > 0 ? (
            <motion.div
              key="reference-selection-actions"
              initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -4, filter: 'blur(8px)' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-[64px] z-40 -translate-x-1/2"
            >
              <LiquidMetalFrame className="h-12 min-w-[176px]" innerClassName="bg-[rgba(15,16,16,0.9)]">
                <div className="flex h-full items-center gap-1.5 px-2.5">
                  <span className="px-2 text-[12px] text-white/60">
                    {selectedImages.length} {selectedImages.length === 1 ? 'selecionada' : 'selecionadas'}
                  </span>
                  <Button
                    variant="surface"
                    size="sm"
                    aria-label="Baixar imagens selecionadas"
                    className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                    onClick={() => selectedImages.forEach(downloadReferenceImage)}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                  {!isSoloFolder ? (
                    <Button
                      variant="surface"
                      size="sm"
                      aria-label="Agrupar imagens selecionadas em uma pasta"
                      className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                      onClick={() => setIsGroupDialogOpen(true)}
                    >
                      <FolderPlus className="size-3.5" />
                      Group
                    </Button>
                  ) : null}
                  {!isSoloFolder && activeFolderId ? (() => {
                    const moveTargets = folders.filter((f) => f.parentFolderId === activeFolderId && !f.isSolo);
                    if (moveTargets.length === 0) return null;
                    return (
                      <Popover open={isMovePopoverOpen} onOpenChange={setIsMovePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="surface"
                            size="sm"
                            aria-label="Mover imagens selecionadas para outra pasta"
                            className="h-8 rounded-full border-white/8 bg-transparent px-3 text-[13px] hover:bg-white/6"
                          >
                            <Folder className="size-3.5" />
                            Move
                            <ChevronDown className="size-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="start"
                          className="w-[220px] border border-white/8 bg-[rgba(15,16,16,0.96)] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
                        >
                          <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                            Mover para
                          </p>
                          {moveTargets.map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[13px] text-[var(--foreground)] transition-colors hover:bg-white/6"
                              onClick={async () => {
                                setIsMovePopoverOpen(false);
                                const ids = selectedImageIds;
                                setSelectedImageIds([]);
                                if (!activeFolderId) return;
                                await onMoveImages({
                                  imageIds: ids,
                                  category: route,
                                  sourceFolderId: activeFolderId,
                                  targetFolderId: target.id,
                                  targetFolderTitle: target.title,
                                });
                              }}
                            >
                              <Folder className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
                              <span className="truncate">{target.title}</span>
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    );
                  })() : null}
                  {representativeRef ? (
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Ações da pasta"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-white/6 hover:text-[var(--foreground)]"
                        >
                          <span className="text-[18px] leading-none">···</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => onExportReference(representativeRef)}>Exportar pasta...</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-[rgb(229,112,112)] data-[highlighted]:bg-[rgba(190,58,58,0.18)] data-[highlighted]:text-[rgb(245,178,178)]"
                          onClick={() => {
                            setOpenFolderId(parentFolder?.id ?? null);
                            onDeleteReference(representativeRef);
                          }}
                        >
                          Excluir pasta
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : null}
                </div>
              </LiquidMetalFrame>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </>
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
