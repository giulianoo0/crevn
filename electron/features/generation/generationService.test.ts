import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGenerationDatabase } from '../../db/client';
import { createGenerationService } from './generationService';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crenv-generation-service-'));
  tempDirs.push(dir);
  return dir;
}

function writeTinyPng(filePath: string) {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
}

describe('createGenerationService', () => {
  it('creates a job workspace, runs the runner, imports assets, and persists succeeded state', async () => {
    const rootDir = makeTempDir();
    const db = createGenerationDatabase(path.join(rootDir, 'crenv.sqlite'));
    await db.createProject({
      id: 'project_1',
      name: 'Documents',
      createdAt: '2026-05-26T10:59:00.000Z',
      updatedAt: '2026-05-26T10:59:00.000Z',
    });
    await db.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T10:59:30.000Z',
      updatedAt: '2026-05-26T10:59:30.000Z',
    });
    const runner = vi.fn(async (input: { outputDirectory: string; manifestPath: string }) => {
      const imagePath = path.join(input.outputDirectory, 'result.png');
      fs.mkdirSync(input.outputDirectory, { recursive: true });
      writeTinyPng(imagePath);
      fs.writeFileSync(
        input.manifestPath,
        JSON.stringify({
          images: [{ path: imagePath }],
        })
      );
      return { success: true };
    });

    const service = createGenerationService({
      database: db,
      paths: {
        userDataDir: rootDir,
        databasePath: path.join(rootDir, 'crenv.sqlite'),
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        codexJobsTempDir: path.join(rootDir, 'tmp', 'codex-jobs'),
      },
      runCodexJob: runner,
      now: () => '2026-05-26T11:00:00.000Z',
      createId: (() => {
        let value = 0;
        return () => `id_${++value}`;
      })(),
    });

    const result = await service.generateImages({
      prompt: 'steel-and-glass atrium, rain outside, editorial lighting',
      count: 1,
      threadId: 'thread_1',
      referenceImages: [],
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.fileName).toBe('id_2.png');
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner.mock.calls[0]?.[0].workingDirectory).toContain(path.join('tmp', 'codex-jobs', 'id_1'));

    const jobs = await db.listJobs();
    const assets = await db.listAssets();

    expect(jobs[0]?.status).toBe('succeeded');
    expect(jobs[0]?.threadId).toBe('thread_1');
    expect(assets).toHaveLength(1);

    db.close();
  });

  it('persists failed job state when the runner fails', async () => {
    const rootDir = makeTempDir();
    const db = createGenerationDatabase(path.join(rootDir, 'crenv.sqlite'));
    await db.createProject({
      id: 'project_1',
      name: 'Documents',
      createdAt: '2026-05-26T10:59:00.000Z',
      updatedAt: '2026-05-26T10:59:00.000Z',
    });
    await db.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T10:59:30.000Z',
      updatedAt: '2026-05-26T10:59:30.000Z',
    });

    const service = createGenerationService({
      database: db,
      paths: {
        userDataDir: rootDir,
        databasePath: path.join(rootDir, 'crenv.sqlite'),
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        codexJobsTempDir: path.join(rootDir, 'tmp', 'codex-jobs'),
      },
      runCodexJob: async () => ({ success: false, errorMessage: 'Codex exited non-zero.' }),
      now: () => '2026-05-26T11:00:00.000Z',
      createId: () => 'id_1',
    });

    await expect(
      service.generateImages({
        prompt: 'failed run',
        count: 1,
        threadId: 'thread_1',
        referenceImages: [],
      })
    ).rejects.toThrow('Codex exited non-zero.');

    const jobs = await db.listJobs();
    expect(jobs[0]?.status).toBe('failed');
    expect(jobs[0]?.errorMessage).toBe('Codex exited non-zero.');

    db.close();
  });

  it('persists failed job state when asset ingestion fails after codex succeeds', async () => {
    const rootDir = makeTempDir();
    const db = createGenerationDatabase(path.join(rootDir, 'crenv.sqlite'));
    await db.createProject({
      id: 'project_1',
      name: 'Documents',
      createdAt: '2026-05-26T10:59:00.000Z',
      updatedAt: '2026-05-26T10:59:00.000Z',
    });
    await db.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T10:59:30.000Z',
      updatedAt: '2026-05-26T10:59:30.000Z',
    });

    const service = createGenerationService({
      database: db,
      paths: {
        userDataDir: rootDir,
        databasePath: path.join(rootDir, 'crenv.sqlite'),
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        codexJobsTempDir: path.join(rootDir, 'tmp', 'codex-jobs'),
      },
      runCodexJob: async (input) => {
        fs.mkdirSync(input.outputDirectory, { recursive: true });
        fs.writeFileSync(
          input.manifestPath,
          JSON.stringify({
            images: [{ path: path.join(input.outputDirectory, 'result.bmp') }],
          })
        );
        fs.writeFileSync(path.join(input.outputDirectory, 'result.bmp'), 'not-a-supported-image');
        return { success: true };
      },
      now: () => '2026-05-26T11:00:00.000Z',
      createId: () => 'id_1',
    });

    await expect(
      service.generateImages({
        prompt: 'failed import',
        count: 1,
        threadId: 'thread_1',
        referenceImages: [],
      })
    ).rejects.toThrow('Unsupported image type: .bmp');

    const jobs = await db.listJobs();
    expect(jobs[0]?.status).toBe('failed');
    expect(jobs[0]?.errorMessage).toBe('Unsupported image type: .bmp');

    db.close();
  });

  it('can auto-create a default project and numbered thread titles', async () => {
    const rootDir = makeTempDir();
    const db = createGenerationDatabase(path.join(rootDir, 'crenv.sqlite'));

    const service = createGenerationService({
      database: db,
      paths: {
        userDataDir: rootDir,
        databasePath: path.join(rootDir, 'crenv.sqlite'),
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        codexJobsTempDir: path.join(rootDir, 'tmp', 'codex-jobs'),
      },
      runCodexJob: async () => ({ success: false, errorMessage: 'stop after bootstrap' }),
      now: () => '2026-05-26T11:00:00.000Z',
      createId: (() => {
        let value = 0;
        return () => `id_${++value}`;
      })(),
    });

    const bootstrap = await service.ensureProjectThreadWorkspace();
    const anotherThread = await service.createThread({ projectId: bootstrap.project.id });

    expect(bootstrap.project.name).toBe('Documents');
    expect(bootstrap.thread.name).toBe('New Thread');
    expect(anotherThread.name).toBe('New Thread 2');

    db.close();
  });

  it('stages reference images into the codex workspace and includes them in the prompt', async () => {
    const rootDir = makeTempDir();
    const db = createGenerationDatabase(path.join(rootDir, 'crenv.sqlite'));
    await db.createProject({
      id: 'project_1',
      name: 'Documents',
      createdAt: '2026-05-26T10:59:00.000Z',
      updatedAt: '2026-05-26T10:59:00.000Z',
    });
    await db.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T10:59:30.000Z',
      updatedAt: '2026-05-26T10:59:30.000Z',
    });

    const runner = vi.fn(async (input: { outputDirectory: string; manifestPath: string; prompt: string }) => {
      const referencesDir = path.join(path.dirname(input.manifestPath), 'references');
      const stagedReferencePath = path.join(referencesDir, 'reference-one.png');
      const imagePath = path.join(input.outputDirectory, 'result.png');

      expect(fs.existsSync(stagedReferencePath)).toBe(true);
      expect(fs.readFileSync(stagedReferencePath)).toEqual(Buffer.from([1, 2, 3, 4]));
      expect(input.prompt).toContain(stagedReferencePath);

      fs.mkdirSync(input.outputDirectory, { recursive: true });
      writeTinyPng(imagePath);
      fs.writeFileSync(
        input.manifestPath,
        JSON.stringify({
          images: [{ path: imagePath }],
        })
      );

      return { success: true };
    });

    const service = createGenerationService({
      database: db,
      paths: {
        userDataDir: rootDir,
        databasePath: path.join(rootDir, 'crenv.sqlite'),
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        codexJobsTempDir: path.join(rootDir, 'tmp', 'codex-jobs'),
      },
      runCodexJob: runner,
      now: () => '2026-05-26T11:00:00.000Z',
      createId: (() => {
        let value = 0;
        return () => `id_${++value}`;
      })(),
    });

    await service.generateImages({
      prompt: 'use the reference framing',
      count: 1,
      threadId: 'thread_1',
      referenceImages: [
        {
          name: 'reference one.png',
          mimeType: 'image/png',
          bytesBase64: Buffer.from([1, 2, 3, 4]).toString('base64'),
        },
      ],
    });

    expect(runner).toHaveBeenCalledTimes(1);

    db.close();
  });
});
