import fs from 'node:fs/promises';
import path from 'node:path';

import type { AppDataPaths } from '../../appPaths';
import type { GenerationAssetRecord, GenerationDatabase, GenerationJobRecord } from '../../db/client';
import { buildCodexImageGenerationPrompt } from './codexPrompt';
import type { GenerateImagesInput, ImportedGeneratedImage } from './generationTypes';
import { importGeneratedImage } from './imageImport';
import { parseGenerationManifest } from './manifest';

interface CodexJobRunInput {
  workingDirectory: string;
  outputDirectory: string;
  manifestPath: string;
  prompt: string;
}

type CodexJobRunResult =
  | { success: true }
  | {
      success: false;
      errorMessage: string;
    };

interface CreateGenerationServiceInput {
  database: GenerationDatabase;
  paths: AppDataPaths;
  runCodexJob: (input: CodexJobRunInput) => Promise<CodexJobRunResult>;
  now?: () => string;
  createId?: () => string;
}

export function createGenerationService(input: CreateGenerationServiceInput) {
  const now = input.now ?? (() => new Date().toISOString());
  const createId = input.createId ?? crypto.randomUUID;

  async function generateImages(request: GenerateImagesInput) {
    const jobId = createId();
    const createdAt = now();
    const workingDirectory = path.join(input.paths.codexJobsTempDir, jobId);
    const outputDirectory = path.join(workingDirectory, 'output');
    const manifestPath = path.join(workingDirectory, 'manifest.json');

    await fs.mkdir(outputDirectory, { recursive: true });

    const pendingJob: GenerationJobRecord = {
      id: jobId,
      prompt: request.prompt,
      requestedCount: request.count,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      createdAt,
      updatedAt: createdAt,
    };

    input.database.upsertJob(pendingJob);

    const codexPrompt = buildCodexImageGenerationPrompt({
      userPrompt: request.prompt,
      outputDirectory,
      manifestPath,
      imageCount: request.count,
    });

    const runResult = await input.runCodexJob({
      workingDirectory,
      outputDirectory,
      manifestPath,
      prompt: codexPrompt,
    });

    if (!runResult.success) {
      input.database.upsertJob({
        ...pendingJob,
        status: 'failed',
        errorMessage: runResult.errorMessage,
        updatedAt: now(),
      });
      throw new Error(runResult.errorMessage);
    }

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

      input.database.insertAsset(assetRecord);
      assets.push(assetRecord);
    }

    input.database.upsertJob({
      ...pendingJob,
      status: 'succeeded',
      updatedAt: now(),
    });

    return { jobId, assets };
  }

  return {
    generateImages,
  };
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
