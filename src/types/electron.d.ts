interface ElectronGeneratedImageRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
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

interface ElectronReferenceImageRecord {
  id: string;
  name: string;
  title: string;
  description: string | null;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
}

interface ElectronCreateReferencePayload {
  name: string;
  title: string;
  description?: string;
  mimeType: string;
  bytesBase64: string;
}

interface ElectronGenerateImagesPayload {
  clientRunId?: string;
  fastMode?: boolean;
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

interface Window {
  electronAPI?: {
    platform: string;
    listGeneratedImages: (threadId: string) => Promise<ElectronGeneratedImageRecord[]>;
    listProjectsWithThreads: () => Promise<ElectronProjectRecord[]>;
    listReferences: () => Promise<ElectronReferenceImageRecord[]>;
    createReference: (payload: ElectronCreateReferencePayload) => Promise<ElectronReferenceImageRecord>;
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
    renameThread: (threadId: string, name: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    generateImages: (
      payload: ElectronGenerateImagesPayload
    ) => Promise<{ jobId: string; assets: ElectronGeneratedImageRecord[] }>;
    copyGeneratedImage: (imageId: string) => Promise<void>;
    downloadGeneratedImage: (imageId: string) => Promise<boolean>;
    deleteGeneratedImage: (imageId: string) => Promise<void>;
    subscribeToScenePlan: (listener: (event: ElectronScenePlanEvent) => void) => () => void;
  };
}
