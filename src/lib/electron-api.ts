import type { GeneratedImageGridImage } from '@/components/generated-image-grid';

export interface ThreadRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  hasRunningJob: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  systemInstructions: string;
  artStyle: string;
  createdAt: string;
  updatedAt: string;
  threads: ThreadRecord[];
}

export interface UpdateProjectSettingsPayload {
  systemInstructions: string;
  artStyle: string;
}

export interface CodexLimitWindowSnapshot {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
}

export interface CodexCreditsSnapshot {
  hasCredits: boolean;
  unlimited: boolean;
  balance: string | null;
}

export interface CodexIndividualLimitSnapshot {
  limit: string;
  used: string;
  remainingPercent: number;
  resetsAt: number;
}

export interface CodexRateLimitSnapshot {
  limitId: string;
  limitName: string | null;
  primary: CodexLimitWindowSnapshot | null;
  secondary: CodexLimitWindowSnapshot | null;
  credits: CodexCreditsSnapshot | null;
  individualLimit: CodexIndividualLimitSnapshot | null;
  planType: string | null;
  rateLimitReachedType: string | null;
}

export interface CodexImageAccount {
  id: string;
  accountId: string;
  email: string | null;
  planType: string | null;
  chatgptUserId: string | null;
  isFedrampAccount: boolean;
  lastRefresh: string | null;
  limits: CodexRateLimitSnapshot[];
  limitsLastCheckedAt: string | null;
  limitsError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderSettings {
  text: {
    gemini: {
      apiKey: string;
    };
    anthropic: {
      apiKey: string;
    };
  };
  image: {
    codex: {
      activeAccountId: string | null;
      accounts: CodexImageAccount[];
    };
  };
}

export type UpdateProviderSettingsPayload = {
  text: ProviderSettings['text'];
};

export type ExportResult =
  | {
      status: 'exported';
      filePath: string;
    }
  | {
      status: 'canceled';
    };

export type ImportResult =
  | {
      status: 'imported';
      scope?: 'project' | 'thread';
      projectId?: string | null;
      threadIds?: string[];
      category?: ReferenceCategory;
      collectionId?: string | null;
      environmentId?: string | null;
      referenceIds?: string[];
    }
  | {
      status: 'canceled';
    };

export interface WorkspaceRecord {
  project: ProjectRecord;
  thread: ThreadRecord;
}

export interface ReferenceImageRecord {
  id: string;
  name: string;
  title: string;
  description: string | null;
  groupTitle?: string | null;
  groupDescription?: string | null;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string | null;
  environmentId?: string | null;
  parentFolderId?: string | null;
  section?: 'primary' | 'angles' | null;
}

export interface CreateReferenceFolderPayload {
  category: 'characters' | 'environment' | 'objects';
  title: string;
  parentFolderId?: string | null;
}

export interface ReferenceFolderRecord {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string | null;
  parentFolderId?: string | null;
  voiceUrl?: string | null;
  createdAt: string;
}

export interface SetCharacterVoiceUrlPayload {
  collectionId: string;
  voiceUrl: string | null;
}

export interface CreateReferencePayload {
  name: string;
  title: string;
  description?: string;
  mimeType: string;
  bytesBase64: string;
  category: 'characters' | 'objects';
}

export interface CreateEnvironmentReferencePayload {
  title: string;
  description?: string;
  attachments: Array<{
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
    section?: 'primary' | 'angles';
  }>;
}

export interface CreateReferenceCollectionPayload {
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string;
  attachments: Array<{
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
    section?: 'primary' | 'angles';
  }>;
}

export interface UpdateReferencePayload {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string;
  environmentId?: string;
}

export interface UpdateEnvironmentReferencePayload {
  environmentId: string;
  title: string;
  description?: string;
  attachments: Array<{
    id?: string;
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
    section?: 'primary' | 'angles';
  }>;
}

export interface UpdateReferenceCollectionPayload {
  category: 'characters' | 'environment' | 'objects';
  collectionId: string;
  title: string;
  description?: string;
  attachments: Array<{
    id?: string;
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
    section?: 'primary' | 'angles';
  }>;
}

export interface DescribeReferenceCollectionPayload {
  category: 'characters' | 'environment' | 'objects';
  title?: string;
  attachments: Array<{
    id: string;
    name: string;
    mimeType: string;
    bytesBase64: string;
  }>;
}

export interface DescribeReferenceCollectionResult {
  title: string;
  description: string;
  attachments: Array<{
    id: string;
    description: string;
  }>;
}

export interface DeleteReferencePayload {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string;
  environmentId?: string;
}

export interface ExportReferencePayload {
  id: string;
  title: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string | null;
  environmentId?: string | null;
}

export interface GenerateImagesPayload {
  clientRunId?: string;
  fastMode?: boolean;
  provider?: string;
  modelId?: string;
  mode?: 'manual' | 'scene' | 'pinpoint' | 'camera';
  prompt: string;
  count: number;
  threadId: string;
  referenceImages: Array<{
    name: string;
    title?: string;
    description?: string;
    mimeType: string;
    bytesBase64: string;
  }>;
  pinPoint?: {
    point: {
      x: number;
      y: number;
    };
    extraPrompt?: string;
    hasCharacterReferences: boolean;
  };
  camera?: {
    rotationDeg: number;
    tiltDeg: number;
    zoom: number;
    generateBestAngles: boolean;
  };
}

export interface GeneratedImageRecord extends GeneratedImageGridImage {
  createdAt: string;
  outputIndex?: number | null;
  provider?: string | null;
  modelId?: string | null;
  modelLabel?: string | null;
  prompt?: string | null;
  references?: Array<{
    name: string;
    title?: string | null;
    description?: string | null;
    mimeType: string;
    previewUrl?: string | null;
  }>;
  durationMs?: number | null;
  generationStartedAt?: string;
  favorite?: boolean;
}

export interface ScenePlanEvent {
  jobId: string;
  clientRunId?: string;
  threadId: string;
  count: number;
  applyToShimmers: boolean;
}

export interface SceneFrameReadyEvent {
  threadId: string;
  sceneGroupId: string;
  frameId: string;
}

export interface DirectorSceneReadyEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  sceneGroupId: string;
}

export interface ImageReadyEvent {
  jobId: string;
  clientRunId?: string | null;
  threadId: string;
  asset: GeneratedImageRecord;
  providerThreadId?: string | null;
  providerTurnId?: string | null;
}

export interface DirectorChatRecord {
  id: string;
  threadId: string;
  title: string;
  providerThreadId?: string | null;
  providerRuntime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DirectorMessagePart =
  | {
      type: 'text' | 'reasoning';
      text: string;
      providerMetadata?: Record<string, unknown>;
    }
  | {
      type: 'tool-generateImages';
      toolCallId: string;
      input: {
        prompt?: string;
        count?: number;
        aspectRatio?: string;
        references?: string[];
      };
      state: 'approval-requested' | 'running' | 'output-available' | 'output-error' | 'declined';
      approvalId?: string;
      output?: {
        assets?: GeneratedImageRecord[];
        [key: string]: unknown;
      };
      errorText?: string;
    }
  | {
      type: 'tool-loadSkill';
      toolCallId: string;
      skillName: string;
      reference?: string;
      state: 'running' | 'output-available' | 'output-error';
      title?: string;
      found?: boolean;
    };

export interface DirectorMessageRecord {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  parts: DirectorMessagePart[];
  status: 'streaming' | 'completed' | 'failed';
  errorMessage?: string | null;
  modelId?: string | null;
  modelLabel?: string | null;
  fastMode: boolean;
  messageOrder?: number | null;
  providerTurnId?: string | null;
  providerItemId?: string | null;
  references?: Array<{
    name: string;
    title?: string | null;
    description?: string | null;
    mimeType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface SendDirectorMessagePayload {
  chatId: string;
  threadId: string;
  prompt: string;
  modelId?: string;
  fastMode?: boolean;
  reasoningEffort?: ReasoningEffort;
  referenceImages: Array<{
    name: string;
    title?: string;
    description?: string;
    mimeType: string;
    bytesBase64: string;
  }>;
}

export interface RegenerateDirectorMessagePayload {
  chatId: string;
  threadId: string;
  assistantMessageId: string;
}

export interface DirectorActionDecisionPayload {
  messageId: string;
  actionIndex: number;
  clientRunId?: string;
}

export interface DirectorMessageStartEvent {
  threadId: string;
  chatId: string;
  userMessage: DirectorMessageRecord;
  assistantMessage: DirectorMessageRecord;
}

export interface DirectorMessageDeltaEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  parts: DirectorMessagePart[];
}

export interface DirectorMessageCompleteEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  parts: DirectorMessagePart[];
}

export interface DirectorMessageErrorEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  errorMessage: string;
  parts: DirectorMessagePart[];
  canceled?: boolean;
}

export interface StructuredScenePrompt {
  sceneDescription: string;
  frames: Array<{
    prompt: string;
  }>;
}

export interface SceneFrameReferenceRecord {
  id: string;
  sceneFrameId: string;
  referenceKind: 'saved_reference' | 'uploaded_attachment';
  referenceId: string | null;
  name: string;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
}

export interface SceneFrameAssetRecord {
  id: string;
  sceneGroupRunId: string;
  sceneFrameId: string;
  outputIndex: number;
  originalPath: string;
  storedPath: string;
  fileName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface SceneFrameRecord {
  id: string;
  sceneGroupId: string;
  title: string;
  prompt: string;
  frameOrder: number;
  createdAt: string;
  updatedAt: string;
  references: SceneFrameReferenceRecord[];
  assets: SceneFrameAssetRecord[];
}

export interface SceneGroupRunRecord {
  id: string;
  sceneGroupId: string;
  threadId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  provider: string;
  modelId: string;
  modelLabel: string;
  requestedFrameCount: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SceneGroupRecord {
  id: string;
  threadId: string;
  title: string;
  prompt: string;
  tocOrder: number;
  createdAt: string;
  updatedAt: string;
  frames: SceneFrameRecord[];
  runs: SceneGroupRunRecord[];
}

export type UpdateStatusState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'disabled'
  | 'error';

export interface UpdateStatus {
  state: UpdateStatusState;
  message: string;
  version: string | null;
  percent: number | null;
  errorMessage: string | null;
}

export interface AppInfo {
  name: string;
  version: string;
}

export type StartupLogFields = Record<string, string | number | boolean | null | undefined>;

const fallbackUpdateStatus: UpdateStatus = {
  state: 'disabled',
  message: 'Electron API bridge is unavailable.',
  version: null,
  percent: null,
  errorMessage: null,
};

function getElectronApi() {
  if (!window.electronAPI) {
    return {
      logStartup: (label: string, fields: StartupLogFields = {}) => {
        console.info(`[crevn:startup] ${label} ${JSON.stringify(fields)}`);
      },
      getAppInfo: async () => ({ name: 'crevn', version: '0.0.0' }),
      getUpdateStatus: async () => fallbackUpdateStatus,
      getProviderSettings: async () => ({
        text: {
          gemini: {
            apiKey: '',
          },
          anthropic: {
            apiKey: '',
          },
        },
        image: {
          codex: {
            activeAccountId: null,
            accounts: [],
          },
        },
      }),
      updateProviderSettings: async (payload: UpdateProviderSettingsPayload) => ({
        ...payload,
        image: {
          codex: {
            activeAccountId: null,
            accounts: [],
          },
        },
      }),
      startCodexImageOAuth: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      selectCodexImageAccount: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      removeCodexImageAccount: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      refreshCodexImageAccountLimits: async () => ({
        text: {
          gemini: {
            apiKey: '',
          },
          anthropic: {
            apiKey: '',
          },
        },
        image: {
          codex: {
            activeAccountId: null,
            accounts: [],
          },
        },
      }),
      checkForUpdates: async () => fallbackUpdateStatus,
      installUpdate: async () => fallbackUpdateStatus,
      openExternal: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      enhancePrompt: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      listGeneratedImages: async () => [],
      listProjectsWithThreads: async () => [],
      listReferences: async () => [],
      listReferenceFolders: async () => [],
      listDirectorChats: async () => [],
      createDirectorChat: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      renameDirectorChat: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteDirectorChat: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      listDirectorMessages: async () => [],
      sendDirectorMessage: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      regenerateDirectorMessage: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      approveDirectorAction: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      declineDirectorAction: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      cancelDirectorChat: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createReferenceFolder: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      setCharacterVoiceUrl: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createEnvironmentReference: async () => [],
      createReferenceCollection: async () => [],
      updateReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      updateEnvironmentReference: async () => [],
      updateReferenceCollection: async () => [],
      deleteReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      describeReferenceCollection: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      ensureProjectThreadWorkspace: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createProject: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createThread: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      renameProject: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      updateProjectSettings: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      exportProject: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      exportThread: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      exportReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      importCrenv: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      importReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      renameThread: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteProject: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteThread: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      generateImages: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      copyGeneratedImage: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      downloadGeneratedImage: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteGeneratedImage: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      setGeneratedImageFavorite: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      listSceneGroups: async () => [],
      createSceneGroup: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      updateSceneGroup: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteSceneGroup: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createSceneFrame: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      updateSceneFrame: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      deleteSceneFrame: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      saveSceneFrameReferences: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      pasteClipboardImageToSceneFrame: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      generateSceneGroup: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      structureScenePrompt: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      cancelSceneGroupGeneration: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      subscribeToUpdateStatus: () => () => {},
      subscribeToScenePlan: () => () => {},
      subscribeToSceneFrameReady: () => () => {},
      subscribeToDirectorSceneReady: () => () => {},
      subscribeToImageReady: () => () => {},
      subscribeToDirectorMessageStart: () => () => {},
      subscribeToDirectorMessageDelta: () => () => {},
      subscribeToDirectorMessageComplete: () => () => {},
      subscribeToDirectorMessageError: () => () => {},
    };
  }

  return window.electronAPI;
}

export function writeStartupLog(label: string, fields: StartupLogFields = {}) {
  return getElectronApi().logStartup(label, fields);
}

export function listGeneratedImages(threadId: string) {
  return getElectronApi().listGeneratedImages(threadId) as Promise<GeneratedImageRecord[]>;
}

export function getAppInfo() {
  return getElectronApi().getAppInfo() as Promise<AppInfo>;
}

export function getUpdateStatus() {
  return getElectronApi().getUpdateStatus() as Promise<UpdateStatus>;
}

export function getProviderSettings() {
  return getElectronApi().getProviderSettings() as Promise<ProviderSettings>;
}

export function updateProviderSettings(payload: UpdateProviderSettingsPayload) {
  return getElectronApi().updateProviderSettings(payload) as Promise<ProviderSettings>;
}

export function startCodexImageOAuth() {
  return getElectronApi().startCodexImageOAuth() as Promise<ProviderSettings>;
}

export function selectCodexImageAccount(accountId: string) {
  return getElectronApi().selectCodexImageAccount(accountId) as Promise<ProviderSettings>;
}

export function removeCodexImageAccount(accountId: string) {
  return getElectronApi().removeCodexImageAccount(accountId) as Promise<ProviderSettings>;
}

export function refreshCodexImageAccountLimits() {
  return getElectronApi().refreshCodexImageAccountLimits() as Promise<ProviderSettings>;
}

export function checkForUpdates() {
  return getElectronApi().checkForUpdates() as Promise<UpdateStatus>;
}

export function installUpdate() {
  return getElectronApi().installUpdate() as Promise<UpdateStatus>;
}

export function enhancePrompt(payload: { prompt: string; referenceNames?: string[] }) {
  return getElectronApi().enhancePrompt(payload) as Promise<{ text: string }>;
}

export function subscribeToUpdateStatus(listener: (event: UpdateStatus) => void) {
  return getElectronApi().subscribeToUpdateStatus(listener) as () => void;
}

export function listProjectsWithThreads() {
  return getElectronApi().listProjectsWithThreads() as Promise<ProjectRecord[]>;
}

export function listReferences() {
  return getElectronApi().listReferences() as Promise<ReferenceImageRecord[]>;
}

export function listDirectorChats(threadId: string) {
  return getElectronApi().listDirectorChats(threadId) as Promise<DirectorChatRecord[]>;
}

export function createDirectorChat(threadId: string) {
  return getElectronApi().createDirectorChat(threadId) as Promise<DirectorChatRecord>;
}

export function renameDirectorChat(chatId: string, title: string) {
  return getElectronApi().renameDirectorChat(chatId, title) as Promise<DirectorChatRecord | null>;
}

export function deleteDirectorChat(chatId: string) {
  return getElectronApi().deleteDirectorChat(chatId) as Promise<void>;
}

export function listDirectorMessages(chatId: string) {
  return getElectronApi().listDirectorMessages(chatId) as Promise<DirectorMessageRecord[]>;
}

export function sendDirectorMessage(payload: SendDirectorMessagePayload) {
  return getElectronApi().sendDirectorMessage(payload) as Promise<{
    chat: DirectorChatRecord | null;
    userMessage: DirectorMessageRecord;
    assistantMessage: DirectorMessageRecord;
  }>;
}

export function regenerateDirectorMessage(payload: RegenerateDirectorMessagePayload) {
  return getElectronApi().regenerateDirectorMessage(payload) as Promise<{
    chat: DirectorChatRecord | null;
    userMessage: DirectorMessageRecord;
    assistantMessage: DirectorMessageRecord;
  }>;
}

export function approveDirectorAction(payload: DirectorActionDecisionPayload) {
  return getElectronApi().approveDirectorAction(payload) as Promise<DirectorMessageRecord | null>;
}

export function declineDirectorAction(payload: DirectorActionDecisionPayload) {
  return getElectronApi().declineDirectorAction(payload) as Promise<DirectorMessageRecord | null>;
}

export function cancelDirectorChat(chatId: string) {
  return getElectronApi().cancelDirectorChat(chatId) as Promise<boolean>;
}

export function createReference(payload: CreateReferencePayload) {
  return getElectronApi().createReference(payload) as Promise<ReferenceImageRecord>;
}

export function listReferenceFolders() {
  return getElectronApi().listReferenceFolders() as Promise<ReferenceFolderRecord[]>;
}

export function createReferenceFolder(payload: CreateReferenceFolderPayload) {
  return getElectronApi().createReferenceFolder(payload) as Promise<ReferenceFolderRecord>;
}

export function setCharacterVoiceUrl(payload: SetCharacterVoiceUrlPayload) {
  return getElectronApi().setCharacterVoiceUrl(payload) as Promise<{
    collectionId: string;
    voiceUrl: string | null;
  }>;
}

export function openExternal(url: string) {
  return getElectronApi().openExternal(url) as Promise<boolean>;
}

export function createEnvironmentReference(payload: CreateEnvironmentReferencePayload) {
  return getElectronApi().createEnvironmentReference(payload) as Promise<ReferenceImageRecord[]>;
}

export function createReferenceCollection(payload: CreateReferenceCollectionPayload) {
  return getElectronApi().createReferenceCollection(payload) as Promise<ReferenceImageRecord[]>;
}

export function updateReference(payload: UpdateReferencePayload) {
  return getElectronApi().updateReference(payload) as Promise<ReferenceImageRecord>;
}

export function updateEnvironmentReference(payload: UpdateEnvironmentReferencePayload) {
  return getElectronApi().updateEnvironmentReference(payload) as Promise<ReferenceImageRecord[]>;
}

export function updateReferenceCollection(payload: UpdateReferenceCollectionPayload) {
  return getElectronApi().updateReferenceCollection(payload) as Promise<ReferenceImageRecord[]>;
}

export function deleteReference(payload: DeleteReferencePayload) {
  return getElectronApi().deleteReference(payload) as Promise<void>;
}

export function describeReferenceCollection(payload: DescribeReferenceCollectionPayload) {
  return getElectronApi().describeReferenceCollection(payload) as Promise<DescribeReferenceCollectionResult>;
}

export function ensureProjectThreadWorkspace() {
  return getElectronApi().ensureProjectThreadWorkspace() as Promise<WorkspaceRecord>;
}

export function createProject(projectName: string) {
  return getElectronApi().createProject(projectName) as Promise<WorkspaceRecord>;
}

export function createThread(projectId: string) {
  return getElectronApi().createThread(projectId) as Promise<ThreadRecord>;
}

export function renameProject(projectId: string, name: string) {
  return getElectronApi().renameProject(projectId, name) as Promise<void>;
}

export function updateProjectSettings(projectId: string, payload: UpdateProjectSettingsPayload) {
  return getElectronApi().updateProjectSettings(projectId, payload) as Promise<void>;
}

export function exportProject(projectId: string) {
  return getElectronApi().exportProject(projectId) as Promise<ExportResult>;
}

export function exportThread(threadId: string) {
  return getElectronApi().exportThread(threadId) as Promise<ExportResult>;
}

export function exportReference(payload: ExportReferencePayload) {
  return getElectronApi().exportReference(payload) as Promise<ExportResult>;
}

export function importCrenv(targetProjectId: string | null) {
  return getElectronApi().importCrenv(targetProjectId) as Promise<ImportResult>;
}

export function importReference() {
  return getElectronApi().importReference() as Promise<ImportResult>;
}

export function renameThread(threadId: string, name: string) {
  return getElectronApi().renameThread(threadId, name) as Promise<void>;
}

export function deleteProject(projectId: string) {
  return getElectronApi().deleteProject(projectId) as Promise<void>;
}

export function deleteThread(threadId: string) {
  return getElectronApi().deleteThread(threadId) as Promise<void>;
}

export function generateImages(payload: GenerateImagesPayload) {
  return getElectronApi().generateImages(payload) as Promise<{
    jobId: string;
    assets: GeneratedImageRecord[];
  }>;
}

export function listSceneGroups(threadId: string) {
  return getElectronApi().listSceneGroups(threadId) as Promise<SceneGroupRecord[]>;
}

export function createSceneGroup(threadId: string, input: { title: string; prompt: string; tocOrder: number }) {
  return getElectronApi().createSceneGroup(threadId, input) as Promise<SceneGroupRecord>;
}

export function updateSceneGroup(
  sceneGroupId: string,
  input: { title: string; prompt: string; tocOrder: number }
) {
  return getElectronApi().updateSceneGroup(sceneGroupId, input) as Promise<SceneGroupRecord>;
}

export function deleteSceneGroup(sceneGroupId: string) {
  return getElectronApi().deleteSceneGroup(sceneGroupId) as Promise<SceneGroupRecord[]>;
}

export function createSceneFrame(
  sceneGroupId: string,
  input: { title: string; prompt: string; frameOrder: number }
) {
  return getElectronApi().createSceneFrame(sceneGroupId, input) as Promise<SceneGroupRecord>;
}

export function updateSceneFrame(
  sceneFrameId: string,
  input: { title: string; prompt: string; frameOrder: number }
) {
  return getElectronApi().updateSceneFrame(sceneFrameId, input) as Promise<SceneGroupRecord>;
}

export function deleteSceneFrame(sceneFrameId: string) {
  return getElectronApi().deleteSceneFrame(sceneFrameId) as Promise<SceneGroupRecord>;
}

export function saveSceneFrameReferences(
  sceneFrameId: string,
  references: Array<{
    id: string;
    referenceKind: 'saved_reference' | 'uploaded_attachment';
    referenceId: string | null;
    name: string;
    mimeType: string;
    bytesBase64: string;
    createdAt: string;
  }>
) {
  return getElectronApi().saveSceneFrameReferences(sceneFrameId, references) as Promise<SceneGroupRecord>;
}

export function pasteClipboardImageToSceneFrame(sceneFrameId: string) {
  return getElectronApi().pasteClipboardImageToSceneFrame(sceneFrameId) as Promise<SceneGroupRecord | null>;
}

export function generateSceneGroup(input: {
  sceneGroupId: string;
  targetFrameId?: string;
  promptOverride?: string;
  frameOverrides?: Array<{
    id: string;
    title: string;
    prompt: string;
    references?: Array<{
      id: string;
      referenceKind: 'saved_reference' | 'uploaded_attachment';
      referenceId: string | null;
      name: string;
      mimeType: string;
      bytesBase64: string;
      createdAt: string;
    }>;
  }>;
  referenceImages?: Array<{
    name: string;
    title?: string;
    description?: string;
    mimeType: string;
    bytesBase64: string;
  }>;
  fastMode?: boolean;
}) {
  return getElectronApi().generateSceneGroup(input) as Promise<SceneGroupRecord>;
}

export function structureScenePrompt(input: { sourceText: string; modelId?: string }) {
  return getElectronApi().structureScenePrompt(input) as Promise<StructuredScenePrompt>;
}

export function cancelSceneGroupGeneration(sceneGroupId: string) {
  return getElectronApi().cancelSceneGroupGeneration(sceneGroupId) as Promise<boolean>;
}

export function subscribeToScenePlan(listener: (event: ScenePlanEvent) => void) {
  return getElectronApi().subscribeToScenePlan(listener) as () => void;
}

export function subscribeToSceneFrameReady(listener: (event: SceneFrameReadyEvent) => void) {
  return getElectronApi().subscribeToSceneFrameReady(listener) as () => void;
}

export function subscribeToDirectorSceneReady(listener: (event: DirectorSceneReadyEvent) => void) {
  return getElectronApi().subscribeToDirectorSceneReady(listener) as () => void;
}

export function subscribeToImageReady(listener: (event: ImageReadyEvent) => void) {
  return getElectronApi().subscribeToImageReady(listener) as () => void;
}

export function subscribeToDirectorMessageStart(listener: (event: DirectorMessageStartEvent) => void) {
  return getElectronApi().subscribeToDirectorMessageStart(listener) as () => void;
}

export function subscribeToDirectorMessageDelta(listener: (event: DirectorMessageDeltaEvent) => void) {
  return getElectronApi().subscribeToDirectorMessageDelta(listener) as () => void;
}

export function subscribeToDirectorMessageComplete(listener: (event: DirectorMessageCompleteEvent) => void) {
  return getElectronApi().subscribeToDirectorMessageComplete(listener) as () => void;
}

export function subscribeToDirectorMessageError(listener: (event: DirectorMessageErrorEvent) => void) {
  return getElectronApi().subscribeToDirectorMessageError(listener) as () => void;
}

export function copyGeneratedImage(imageId: string) {
  return getElectronApi().copyGeneratedImage(imageId) as Promise<void>;
}

export function downloadGeneratedImage(imageId: string) {
  return getElectronApi().downloadGeneratedImage(imageId) as Promise<boolean>;
}

export function deleteGeneratedImage(imageId: string) {
  return getElectronApi().deleteGeneratedImage(imageId) as Promise<void>;
}

export function setGeneratedImageFavorite(imageId: string, favorite: boolean) {
  return getElectronApi().setGeneratedImageFavorite(imageId, favorite) as Promise<{
    id: string;
    favorite: boolean;
  }>;
}
