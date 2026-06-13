import fs from 'node:fs/promises';
import path from 'node:path';

import type { AppDataPaths } from '../../appPaths';
import type {
  GenerationAssetRecord,
  GenerationDatabase,
  GenerationJobRecord,
  ProjectRecord,
  ThreadRecord,
} from '../../db/client';
import type { GenerateImagesInput, ImportedGeneratedImage, ReferenceImageInput } from './generationTypes';
import { importGeneratedImage } from './imageImport';
import { parseGenerationManifest } from './manifest';

interface GenerationJobRunInput {
  workingDirectory: string;
  outputDirectory: string;
  manifestPath: string;
  prompt: string;
}

type GenerationJobRunResult =
  | { success: true }
  | {
      success: false;
      errorMessage: string;
    };

interface CreateGenerationServiceInput {
  database: GenerationDatabase;
  paths: AppDataPaths;
  runGenerationJob: (input: GenerationJobRunInput) => Promise<GenerationJobRunResult>;
  now?: () => string;
  createId?: () => string;
}

const DEFAULT_PROJECT_NAME = 'Documents';
const DEFAULT_THREAD_NAME = 'New Thread';

export function createGenerationService(input: CreateGenerationServiceInput) {
  const now = input.now ?? (() => new Date().toISOString());
  const createId = input.createId ?? crypto.randomUUID;

  async function ensureProjectThreadWorkspace() {
    const existing = await input.database.listProjectsWithThreads();
    const firstProject = existing[0];

    if (!firstProject) {
      const timestamp = now();
      const project = await input.database.createProject({
        id: createId(),
        name: DEFAULT_PROJECT_NAME,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const thread = await input.database.createThread({
        id: createId(),
        projectId: project.id,
        name: DEFAULT_THREAD_NAME,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return { project, thread };
    }

    const firstThread = firstProject.threads[0];
    if (firstThread) {
      return { project: firstProject, thread: firstThread };
    }

    const thread = await createThread({ projectId: firstProject.id });
    return { project: firstProject, thread };
  }

  async function createThread({ projectId }: { projectId: string }) {
    const timestamp = now();
    const threadCount = await input.database.countThreadsByProject(projectId);
    const nextIndex = threadCount + 1;

    const thread: ThreadRecord = {
      id: createId(),
      projectId,
      name: nextIndex === 1 ? DEFAULT_THREAD_NAME : `${DEFAULT_THREAD_NAME} ${nextIndex}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return input.database.createThread(thread);
  }

  async function generateImages(request: GenerateImagesInput) {
    const jobId = createId();
    const createdAt = now();
    const workingDirectory = path.join(input.paths.generationJobsTempDir, jobId);
    const outputDirectory = path.join(workingDirectory, 'output');
    const manifestPath = path.join(workingDirectory, 'manifest.json');
    await stageReferenceImages({
      workingDirectory,
      referenceImages: request.referenceImages,
    });

    await fs.mkdir(outputDirectory, { recursive: true });

    const pendingJob: GenerationJobRecord = {
      id: jobId,
      threadId: request.threadId,
      prompt: request.prompt,
      requestedCount: request.count,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      createdAt,
      updatedAt: createdAt,
    };

    await input.database.upsertJob(pendingJob);

    try {
      const runResult = await input.runGenerationJob({
        workingDirectory,
        outputDirectory,
        manifestPath,
        prompt: request.prompt,
      });

      if (!runResult.success) {
        throw new Error(runResult.errorMessage);
      }

      await fs.access(manifestPath);
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = parseGenerationManifest(manifestContent);

      const assets: GenerationAssetRecord[] = [];

      for (const image of manifest.images) {
        const assetId = createId();
        const imported = await importGeneratedImage({
          assetId,
          sourcePath: image.path,
          generatedImagesDir: input.paths.generatedImagesDir,
          createdAt: now(),
        });

        const assetRecord = toAssetRecord({
          jobId,
          assetId,
          originalPath: image.path,
          imported,
        });

        await input.database.insertAsset(assetRecord);
        assets.push(assetRecord);
      }

      await input.database.upsertJob({
        ...pendingJob,
        status: 'succeeded',
        updatedAt: now(),
      });

      return { jobId, assets };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await input.database.upsertJob({
        ...pendingJob,
        status: 'failed',
        errorMessage,
        updatedAt: now(),
      });
      throw error;
    }
  }

  return {
    ensureProjectThreadWorkspace,
    createThread,
    generateImages,
  };
}

async function stageReferenceImages(input: {
  workingDirectory: string;
  referenceImages: ReferenceImageInput[];
}) {
  if (input.referenceImages.length === 0) {
    return [];
  }

  const referencesDirectory = path.join(input.workingDirectory, 'references');
  await fs.mkdir(referencesDirectory, { recursive: true });

  const stagedReferences: Array<{ path: string; title?: string; description?: string }> = [];

  for (const [index, referenceImage] of input.referenceImages.entries()) {
    const fileName = sanitizeReferenceImageFileName(referenceImage.name, referenceImage.mimeType, index);
    const referenceImagePath = path.join(referencesDirectory, fileName);
    await fs.writeFile(referenceImagePath, Buffer.from(referenceImage.bytesBase64, 'base64'));
    stagedReferences.push({
      path: referenceImagePath,
      title: referenceImage.title,
      description: referenceImage.description,
    });
  }

  return stagedReferences;
}

function sanitizeReferenceImageFileName(name: string, mimeType: string, index: number) {
  const rawBaseName = path.basename(name, path.extname(name));
  const baseName = rawBaseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `reference-${index + 1}`;
  const extension = path.extname(name).toLowerCase() || mimeTypeToExtension(mimeType);
  return `${baseName}${extension}`;
}

function mimeTypeToExtension(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.png';
  }
}

function toAssetRecord(input: {
  jobId: string;
  assetId: string;
  originalPath: string;
  imported: ImportedGeneratedImage;
}): GenerationAssetRecord {
  return {
    id: input.assetId,
    jobId: input.jobId,
    originalPath: input.originalPath,
    storedPath: input.imported.storedPath,
    fileName: input.imported.fileName,
    mimeType: input.imported.mimeType,
    width: null,
    height: null,
    createdAt: input.imported.createdAt,
  };
}
