interface ElectronGeneratedImageRecord {
  id: string;
  fileName: string;
  fileUrl: string;
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
}

type ElectronUpdateStatusState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'disabled'
  | 'error';

interface ElectronUpdateStatus {
  state: ElectronUpdateStatusState;
  message: string;
  version: string | null;
  percent: number | null;
  errorMessage: string | null;
}

interface ElectronAppInfo {
  name: string;
  version: string;
}

interface ElectronThreadRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  hasRunningJob: boolean;
}

interface ElectronProjectRecord {
  id: string;
  name: string;
  systemInstructions: string;
  artStyle: string;
  createdAt: string;
  updatedAt: string;
  threads: ElectronThreadRecord[];
}

interface ElectronUpdateProjectSettingsPayload {
  systemInstructions: string;
  artStyle: string;
}

interface ElectronProviderSettings {
  text: {
    gemini: {
      apiKey: string;
    };
  };
}

type ElectronExportResult =
  | {
      status: 'exported';
      filePath: string;
    }
  | {
      status: 'canceled';
    };

type ElectronImportResult =
  | {
      status: 'imported';
      scope?: 'project' | 'thread';
      projectId?: string;
      threadIds?: string[];
      category?: 'characters' | 'environment' | 'objects';
      collectionId?: string | null;
      environmentId?: string | null;
      referenceIds?: string[];
    }
  | {
      status: 'canceled';
    };

interface ElectronReferenceImageRecord {
  id: string;
  name: string;
  title: string;
  groupTitle?: string | null;
  description: string | null;
  groupDescription?: string | null;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string | null;
  environmentId?: string | null;
  parentFolderId?: string | null;
}

interface ElectronReferenceFolderRecord {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string | null;
  parentFolderId?: string | null;
  createdAt: string;
}

interface ElectronCreateReferencePayload {
  name: string;
  title: string;
  description?: string;
  mimeType: string;
  bytesBase64: string;
  category: 'characters' | 'objects';
}

interface ElectronCreateReferenceFolderPayload {
  category: 'characters' | 'environment' | 'objects';
  title: string;
  parentFolderId?: string | null;
}

interface ElectronCreateEnvironmentReferencePayload {
  title: string;
  description?: string;
  attachments: Array<{
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
  }>;
}

interface ElectronCreateReferenceCollectionPayload {
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string;
  attachments: Array<{
    name: string;
    title?: string;
    mimeType: string;
    bytesBase64: string;
    description?: string;
  }>;
}

interface ElectronUpdateReferencePayload {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  title: string;
  description?: string;
  environmentId?: string;
}

interface ElectronUpdateEnvironmentReferencePayload {
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
  }>;
}

interface ElectronUpdateReferenceCollectionPayload {
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
  }>;
}

interface ElectronDescribeReferenceCollectionPayload {
  category: 'characters' | 'environment' | 'objects';
  title?: string;
  attachments: Array<{
    id: string;
    name: string;
    mimeType: string;
    bytesBase64: string;
  }>;
}

interface ElectronDescribeReferenceCollectionResult {
  title: string;
  description: string;
  attachments: Array<{
    id: string;
    description: string;
  }>;
}

interface ElectronDeleteReferencePayload {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string;
  environmentId?: string;
}

interface ElectronExportReferencePayload {
  id: string;
  title: string;
  category: 'characters' | 'environment' | 'objects';
  collectionId?: string | null;
  environmentId?: string | null;
}

interface ElectronGenerateImagesPayload {
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

interface ElectronScenePlanEvent {
  jobId: string;
  clientRunId?: string;
  threadId: string;
  count: number;
  applyToShimmers: boolean;
}

interface ElectronSceneFrameReadyEvent {
  threadId: string;
  sceneGroupId: string;
  frameId: string;
}

interface ElectronDirectorSceneReadyEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  sceneGroupId: string;
}

interface ElectronImageReadyEvent {
  jobId: string;
  clientRunId?: string | null;
  threadId: string;
  asset: ElectronGeneratedImageRecord;
  providerThreadId?: string | null;
  providerTurnId?: string | null;
}

interface ElectronDirectorChatRecord {
  id: string;
  threadId: string;
  title: string;
  providerThreadId?: string | null;
  providerRuntime?: string | null;
  createdAt: string;
  updatedAt: string;
}

type ElectronDirectorMessagePart =
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
        assets?: ElectronGeneratedImageRecord[];
        [key: string]: unknown;
      };
      errorText?: string;
    };

interface ElectronDirectorMessageRecord {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  parts: ElectronDirectorMessagePart[];
  status: 'streaming' | 'completed' | 'failed';
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

interface ElectronSendDirectorMessagePayload {
  chatId: string;
  threadId: string;
  prompt: string;
  modelId?: string;
  fastMode?: boolean;
  referenceImages: Array<{
    name: string;
    title?: string;
    description?: string;
    mimeType: string;
    bytesBase64: string;
  }>;
}

interface ElectronRegenerateDirectorMessagePayload {
  chatId: string;
  threadId: string;
  assistantMessageId: string;
}

interface ElectronDirectorActionDecisionPayload {
  messageId: string;
  actionIndex: number;
  clientRunId?: string;
}

interface ElectronDirectorMessageStartEvent {
  threadId: string;
  chatId: string;
  userMessage: ElectronDirectorMessageRecord;
  assistantMessage: ElectronDirectorMessageRecord;
}

interface ElectronDirectorMessageDeltaEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  parts: ElectronDirectorMessagePart[];
}

interface ElectronDirectorMessageCompleteEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  parts: ElectronDirectorMessagePart[];
}

interface ElectronDirectorMessageErrorEvent {
  threadId: string;
  chatId: string;
  messageId: string;
  errorMessage: string;
  parts: ElectronDirectorMessagePart[];
  canceled?: boolean;
}

interface ElectronStructuredScenePrompt {
  sceneDescription: string;
  frames: Array<{
    prompt: string;
  }>;
}

interface ElectronSceneFrameReferenceRecord {
  id: string;
  sceneFrameId: string;
  referenceKind: 'saved_reference' | 'uploaded_attachment';
  referenceId: string | null;
  name: string;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
}

interface ElectronSceneFrameAssetRecord {
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

interface ElectronSceneFrameRecord {
  id: string;
  sceneGroupId: string;
  title: string;
  prompt: string;
  frameOrder: number;
  createdAt: string;
  updatedAt: string;
  references: ElectronSceneFrameReferenceRecord[];
  assets: ElectronSceneFrameAssetRecord[];
}

interface ElectronSceneGroupRunRecord {
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

interface ElectronSceneGroupRecord {
  id: string;
  threadId: string;
  title: string;
  prompt: string;
  tocOrder: number;
  createdAt: string;
  updatedAt: string;
  frames: ElectronSceneFrameRecord[];
  runs: ElectronSceneGroupRunRecord[];
}

interface Window {
  electronAPI?: {
    platform: string;
    getAppInfo: () => Promise<ElectronAppInfo>;
    getUpdateStatus: () => Promise<ElectronUpdateStatus>;
    getProviderSettings: () => Promise<ElectronProviderSettings>;
    updateProviderSettings: (payload: ElectronProviderSettings) => Promise<ElectronProviderSettings>;
    checkForUpdates: () => Promise<ElectronUpdateStatus>;
    installUpdate: () => Promise<ElectronUpdateStatus>;
    listGeneratedImages: (threadId: string) => Promise<ElectronGeneratedImageRecord[]>;
    listProjectsWithThreads: () => Promise<ElectronProjectRecord[]>;
    listReferences: () => Promise<ElectronReferenceImageRecord[]>;
    listReferenceFolders: () => Promise<ElectronReferenceFolderRecord[]>;
    listDirectorChats: (threadId: string) => Promise<ElectronDirectorChatRecord[]>;
    createDirectorChat: (threadId: string) => Promise<ElectronDirectorChatRecord>;
    renameDirectorChat: (chatId: string, title: string) => Promise<ElectronDirectorChatRecord | null>;
    deleteDirectorChat: (chatId: string) => Promise<void>;
    listDirectorMessages: (chatId: string) => Promise<ElectronDirectorMessageRecord[]>;
    sendDirectorMessage: (payload: ElectronSendDirectorMessagePayload) => Promise<{
      chat: ElectronDirectorChatRecord | null;
      userMessage: ElectronDirectorMessageRecord;
      assistantMessage: ElectronDirectorMessageRecord;
    }>;
    regenerateDirectorMessage: (payload: ElectronRegenerateDirectorMessagePayload) => Promise<{
      chat: ElectronDirectorChatRecord | null;
      userMessage: ElectronDirectorMessageRecord;
      assistantMessage: ElectronDirectorMessageRecord;
    }>;
    approveDirectorAction: (
      payload: ElectronDirectorActionDecisionPayload
    ) => Promise<ElectronDirectorMessageRecord | null>;
    declineDirectorAction: (
      payload: ElectronDirectorActionDecisionPayload
    ) => Promise<ElectronDirectorMessageRecord | null>;
    cancelDirectorChat: (chatId: string) => Promise<boolean>;
    createReference: (payload: ElectronCreateReferencePayload) => Promise<ElectronReferenceImageRecord>;
    createReferenceFolder: (
      payload: ElectronCreateReferenceFolderPayload
    ) => Promise<ElectronReferenceFolderRecord>;
    createEnvironmentReference: (
      payload: ElectronCreateEnvironmentReferencePayload
    ) => Promise<ElectronReferenceImageRecord[]>;
    createReferenceCollection: (
      payload: ElectronCreateReferenceCollectionPayload
    ) => Promise<ElectronReferenceImageRecord[]>;
    updateReference: (payload: ElectronUpdateReferencePayload) => Promise<ElectronReferenceImageRecord>;
    updateEnvironmentReference: (
      payload: ElectronUpdateEnvironmentReferencePayload
    ) => Promise<ElectronReferenceImageRecord[]>;
    updateReferenceCollection: (
      payload: ElectronUpdateReferenceCollectionPayload
    ) => Promise<ElectronReferenceImageRecord[]>;
    deleteReference: (payload: ElectronDeleteReferencePayload) => Promise<void>;
    describeReferenceCollection: (
      payload: ElectronDescribeReferenceCollectionPayload
    ) => Promise<ElectronDescribeReferenceCollectionResult>;
    ensureProjectThreadWorkspace: () => Promise<{
      project: ElectronProjectRecord;
      thread: ElectronThreadRecord;
    }>;
    createProject: (projectName: string) => Promise<{
      project: ElectronProjectRecord;
      thread: ElectronThreadRecord;
    }>;
    createThread: (projectId: string) => Promise<ElectronThreadRecord>;
    renameProject: (projectId: string, name: string) => Promise<void>;
    updateProjectSettings: (
      projectId: string,
      payload: ElectronUpdateProjectSettingsPayload
    ) => Promise<void>;
    exportProject: (projectId: string) => Promise<ElectronExportResult>;
    exportThread: (threadId: string) => Promise<ElectronExportResult>;
    exportReference: (payload: ElectronExportReferencePayload) => Promise<ElectronExportResult>;
    importCrenv: (targetProjectId: string | null) => Promise<ElectronImportResult>;
    importReference: () => Promise<ElectronImportResult>;
    renameThread: (threadId: string, name: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    generateImages: (
      payload: ElectronGenerateImagesPayload
    ) => Promise<{ jobId: string; assets: ElectronGeneratedImageRecord[] }>;
    listSceneGroups: (threadId: string) => Promise<ElectronSceneGroupRecord[]>;
    createSceneGroup: (
      threadId: string,
      input: { title: string; prompt: string; tocOrder: number }
    ) => Promise<ElectronSceneGroupRecord>;
    updateSceneGroup: (
      sceneGroupId: string,
      input: { title: string; prompt: string; tocOrder: number }
    ) => Promise<ElectronSceneGroupRecord>;
    deleteSceneGroup: (sceneGroupId: string) => Promise<ElectronSceneGroupRecord[]>;
    createSceneFrame: (
      sceneGroupId: string,
      input: { title: string; prompt: string; frameOrder: number }
    ) => Promise<ElectronSceneGroupRecord>;
    updateSceneFrame: (
      sceneFrameId: string,
      input: { title: string; prompt: string; frameOrder: number }
    ) => Promise<ElectronSceneGroupRecord>;
    deleteSceneFrame: (sceneFrameId: string) => Promise<ElectronSceneGroupRecord>;
    saveSceneFrameReferences: (
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
    ) => Promise<ElectronSceneGroupRecord>;
    pasteClipboardImageToSceneFrame: (sceneFrameId: string) => Promise<ElectronSceneGroupRecord | null>;
    generateSceneGroup: (input: {
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
    }) => Promise<ElectronSceneGroupRecord>;
    structureScenePrompt: (input: {
      sourceText: string;
      modelId?: string;
    }) => Promise<ElectronStructuredScenePrompt>;
    cancelSceneGroupGeneration: (sceneGroupId: string) => Promise<boolean>;
    copyGeneratedImage: (imageId: string) => Promise<void>;
    downloadGeneratedImage: (imageId: string) => Promise<boolean>;
    deleteGeneratedImage: (imageId: string) => Promise<void>;
    subscribeToUpdateStatus: (listener: (event: ElectronUpdateStatus) => void) => () => void;
    subscribeToScenePlan: (listener: (event: ElectronScenePlanEvent) => void) => () => void;
    subscribeToSceneFrameReady: (listener: (event: ElectronSceneFrameReadyEvent) => void) => () => void;
    subscribeToDirectorSceneReady: (listener: (event: ElectronDirectorSceneReadyEvent) => void) => () => void;
    subscribeToImageReady: (listener: (event: ElectronImageReadyEvent) => void) => () => void;
    subscribeToDirectorMessageStart: (listener: (event: ElectronDirectorMessageStartEvent) => void) => () => void;
    subscribeToDirectorMessageDelta: (listener: (event: ElectronDirectorMessageDeltaEvent) => void) => () => void;
    subscribeToDirectorMessageComplete: (
      listener: (event: ElectronDirectorMessageCompleteEvent) => void
    ) => () => void;
    subscribeToDirectorMessageError: (listener: (event: ElectronDirectorMessageErrorEvent) => void) => () => void;
  };
}
