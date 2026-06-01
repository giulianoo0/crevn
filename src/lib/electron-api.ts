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

export interface WorkspaceRecord {
  project: ProjectRecord;
  thread: ThreadRecord;
}

export interface ReferenceImageRecord {
  id: string;
  name: string;
  title: string;
  description: string | null;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
  category: 'characters' | 'environment' | 'objects';
  environmentId?: string | null;
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
    mimeType: string;
    bytesBase64: string;
    description?: string;
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
    mimeType: string;
    bytesBase64: string;
    description?: string;
  }>;
}

export interface DeleteReferencePayload {
  id: string;
  category: 'characters' | 'environment' | 'objects';
  environmentId?: string;
}

export interface GenerateImagesPayload {
  clientRunId?: string;
  fastMode?: boolean;
  provider?: 'codex' | 'antigravity';
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
  provider?: 'codex' | 'antigravity' | null;
  modelId?: string | null;
  modelLabel?: string | null;
  prompt?: string | null;
  references?: Array<{
    name: string;
    title?: string | null;
    description?: string | null;
    mimeType: string;
  }>;
  durationMs?: number | null;
  generationStartedAt?: string;
}

export interface ScenePlanEvent {
  jobId: string;
  clientRunId?: string;
  threadId: string;
  count: number;
  applyToShimmers: boolean;
}

function getElectronApi() {
  if (!window.electronAPI) {
    return {
      listGeneratedImages: async () => [],
      listProjectsWithThreads: async () => [],
      listReferences: async () => [],
      createReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      createEnvironmentReference: async () => [],
      updateReference: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
      updateEnvironmentReference: async () => [],
      deleteReference: async () => {
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
      subscribeToScenePlan: () => () => {},
    };
  }

  return window.electronAPI;
}

export function listGeneratedImages(threadId: string) {
  return getElectronApi().listGeneratedImages(threadId) as Promise<GeneratedImageRecord[]>;
}

export function listProjectsWithThreads() {
  return getElectronApi().listProjectsWithThreads() as Promise<ProjectRecord[]>;
}

export function listReferences() {
  return getElectronApi().listReferences() as Promise<ReferenceImageRecord[]>;
}

export function createReference(payload: CreateReferencePayload) {
  return getElectronApi().createReference(payload) as Promise<ReferenceImageRecord>;
}

export function createEnvironmentReference(payload: CreateEnvironmentReferencePayload) {
  return getElectronApi().createEnvironmentReference(payload) as Promise<ReferenceImageRecord[]>;
}

export function updateReference(payload: UpdateReferencePayload) {
  return getElectronApi().updateReference(payload) as Promise<ReferenceImageRecord>;
}

export function updateEnvironmentReference(payload: UpdateEnvironmentReferencePayload) {
  return getElectronApi().updateEnvironmentReference(payload) as Promise<ReferenceImageRecord[]>;
}

export function deleteReference(payload: DeleteReferencePayload) {
  return getElectronApi().deleteReference(payload) as Promise<void>;
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

export function subscribeToScenePlan(listener: (event: ScenePlanEvent) => void) {
  return getElectronApi().subscribeToScenePlan(listener) as () => void;
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
