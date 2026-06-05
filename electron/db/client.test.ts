import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client/node';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createGenerationDatabase,
  type GenerationAssetRecord,
  type GenerationJobRecord,
} from './client';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDatabasePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crenv-db-test-'));
  tempDirs.push(dir);
  return path.join(dir, 'crenv.sqlite');
}

describe('createGenerationDatabase', () => {
  it('creates schema, stores jobs and assets, and lists assets newest first', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());
    const project = await database.createProject({
      id: 'project_1',
      name: 'Documents',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-05-26T10:59:00.000Z',
      updatedAt: '2026-05-26T10:59:00.000Z',
    });
    const thread = await database.createThread({
      id: 'thread_1',
      projectId: project.id,
      name: 'New Thread',
      createdAt: '2026-05-26T10:59:30.000Z',
      updatedAt: '2026-05-26T10:59:30.000Z',
    });

    const job: GenerationJobRecord = {
      id: 'job_1',
      threadId: thread.id,
      prompt: 'cinematic portrait of a woman in neon rain',
      requestedCount: 2,
      status: 'succeeded',
      workingDirectory: '/tmp/crenv/job_1',
      manifestPath: '/tmp/crenv/job_1/manifest.json',
      errorMessage: null,
      provider: null,
      modelId: null,
      modelLabel: null,
      referenceImagesJson: null,
      durationMs: null,
      providerThreadId: null,
      providerTurnId: null,
      runtime: 'codex-app-server',
      importedCount: 0,
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:05.000Z',
    };

    await database.upsertJob(job);

    await database.insertAsset({
      id: 'asset_older',
      jobId: 'job_1',
      originalPath: '/tmp/crenv/job_1/output/older.png',
      storedPath: '/data/generated-images/asset_older.png',
      fileName: 'asset_older.png',
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      createdAt: '2026-05-26T11:00:10.000Z',
    });

    await database.insertAsset({
      id: 'asset_newer',
      jobId: 'job_1',
      originalPath: '/tmp/crenv/job_1/output/newer.png',
      storedPath: '/data/generated-images/asset_newer.png',
      fileName: 'asset_newer.png',
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      createdAt: '2026-05-26T11:00:11.000Z',
    });

    const jobs = await database.listJobs();
    const assets = await database.listAssets();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(job);

    expect(assets).toHaveLength(2);
    expect(assets.map((asset: GenerationAssetRecord) => asset.id)).toEqual([
      'asset_newer',
      'asset_older',
    ]);

    database.close();
  });

  it('stores projects and threads and reports running activity per thread', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    const project = await database.createProject({
      id: 'project_1',
      name: 'Documents',
      systemInstructions: 'Always preserve character silhouette language.',
      artStyle: 'cartoon',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
    });

    const threadOne = await database.createThread({
      id: 'thread_1',
      projectId: project.id,
      name: 'New Thread',
      createdAt: '2026-05-26T11:01:00.000Z',
      updatedAt: '2026-05-26T11:01:00.000Z',
    });
    const threadTwo = await database.createThread({
      id: 'thread_2',
      projectId: project.id,
      name: 'New Thread 2',
      createdAt: '2026-05-26T11:02:00.000Z',
      updatedAt: '2026-05-26T11:02:00.000Z',
    });

    await database.upsertJob({
      id: 'job_running',
      threadId: threadTwo.id,
      prompt: 'scene in progress',
      requestedCount: 1,
      status: 'running',
      workingDirectory: '/tmp/crenv/job_running',
      manifestPath: '/tmp/crenv/job_running/manifest.json',
      errorMessage: null,
      createdAt: '2026-05-26T11:03:00.000Z',
      updatedAt: '2026-05-26T11:03:00.000Z',
    });

    const projects = await database.listProjectsWithThreads();

    expect(projects).toEqual([
      {
        id: 'project_1',
        name: 'Documents',
        systemInstructions: 'Always preserve character silhouette language.',
        artStyle: 'cartoon',
        createdAt: '2026-05-26T11:00:00.000Z',
        updatedAt: '2026-05-26T11:00:00.000Z',
        threads: [
          {
            id: 'thread_2',
            projectId: 'project_1',
            name: 'New Thread 2',
            createdAt: '2026-05-26T11:02:00.000Z',
            updatedAt: '2026-05-26T11:02:00.000Z',
            hasRunningJob: true,
          },
          {
            id: 'thread_1',
            projectId: 'project_1',
            name: 'New Thread',
            createdAt: '2026-05-26T11:01:00.000Z',
            updatedAt: '2026-05-26T11:01:00.000Z',
            hasRunningJob: false,
          },
        ],
      },
    ]);

    database.close();
  });

  it('updates project settings without mutating other projects', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createProject({
      id: 'project_1',
      name: 'Project One',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
    });
    await database.createProject({
      id: 'project_2',
      name: 'Project Two',
      systemInstructions: 'Keep loose brushwork.',
      artStyle: 'illustration',
      createdAt: '2026-05-26T11:01:00.000Z',
      updatedAt: '2026-05-26T11:01:00.000Z',
    });

    await database.updateProjectSettings('project_1', {
      systemInstructions: 'Use a sharp visual hierarchy and strong rim light.',
      artStyle: 'photoreal',
    });

    expect(await database.listProjectsWithThreads()).toEqual([
      {
        id: 'project_2',
        name: 'Project Two',
        systemInstructions: 'Keep loose brushwork.',
        artStyle: 'illustration',
        createdAt: '2026-05-26T11:01:00.000Z',
        updatedAt: '2026-05-26T11:01:00.000Z',
        threads: [],
      },
      {
        id: 'project_1',
        name: 'Project One',
        systemInstructions: 'Use a sharp visual hierarchy and strong rim light.',
        artStyle: 'photoreal',
        createdAt: '2026-05-26T11:00:00.000Z',
        updatedAt: '2026-05-26T11:00:00.000Z',
        threads: [],
      },
    ]);

    database.close();
  });

  it('migrates older project tables to include settings columns', async () => {
    const databasePath = makeTempDatabasePath();
    const client = createClient({
      url: pathToFileURL(databasePath).toString(),
    });

    await client.execute(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await client.execute(`
      INSERT INTO projects (id, name, created_at, updated_at)
      VALUES ('project_legacy', 'Legacy Project', '2026-05-26T10:00:00.000Z', '2026-05-26T10:00:00.000Z')
    `);
    client.close();

    const database = createGenerationDatabase(databasePath);

    expect(await database.listProjectsWithThreads()).toEqual([
      {
        id: 'project_legacy',
        name: 'Legacy Project',
        systemInstructions: '',
        artStyle: '',
        createdAt: '2026-05-26T10:00:00.000Z',
        updatedAt: '2026-05-26T10:00:00.000Z',
        threads: [],
      },
    ]);

    database.close();
  });

  it('renames threads and projects and cascades thread deletion through jobs and assets', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createProject({
      id: 'project_1',
      name: 'Documents',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
    });
    await database.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T11:01:00.000Z',
      updatedAt: '2026-05-26T11:01:00.000Z',
    });
    await database.upsertJob({
      id: 'job_1',
      threadId: 'thread_1',
      prompt: 'scene in progress',
      requestedCount: 1,
      status: 'succeeded',
      workingDirectory: '/tmp/crenv/job_1',
      manifestPath: '/tmp/crenv/job_1/manifest.json',
      errorMessage: null,
      createdAt: '2026-05-26T11:03:00.000Z',
      updatedAt: '2026-05-26T11:03:00.000Z',
    });
    await database.insertAsset({
      id: 'asset_1',
      jobId: 'job_1',
      originalPath: '/tmp/crenv/job_1/output/result.png',
      storedPath: '/data/generated-images/asset_1.png',
      fileName: 'asset_1.png',
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      createdAt: '2026-05-26T11:03:10.000Z',
    });

    await database.renameProject('project_1', 'Campaign Boards');
    await database.renameThread('thread_1', 'Wide selects');

    const deletedAssets = await database.deleteThread('thread_1');
    const projects = await database.listProjectsWithThreads();
    const jobs = await database.listJobs();
    const assets = await database.listAssets();

    expect(projects[0]?.name).toBe('Campaign Boards');
    expect(projects[0]?.threads).toEqual([]);
    expect(jobs).toEqual([]);
    expect(assets).toEqual([]);
    expect(deletedAssets.map((asset) => asset.id)).toEqual(['asset_1']);

    database.close();
  });

  it('cascades project deletion through its threads, jobs, and assets', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createProject({
      id: 'project_1',
      name: 'Documents',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
    });
    await database.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'New Thread',
      createdAt: '2026-05-26T11:01:00.000Z',
      updatedAt: '2026-05-26T11:01:00.000Z',
    });
    await database.upsertJob({
      id: 'job_1',
      threadId: 'thread_1',
      prompt: 'scene in progress',
      requestedCount: 1,
      status: 'succeeded',
      workingDirectory: '/tmp/crenv/job_1',
      manifestPath: '/tmp/crenv/job_1/manifest.json',
      errorMessage: null,
      createdAt: '2026-05-26T11:03:00.000Z',
      updatedAt: '2026-05-26T11:03:00.000Z',
    });
    await database.insertAsset({
      id: 'asset_1',
      jobId: 'job_1',
      originalPath: '/tmp/crenv/job_1/output/result.png',
      storedPath: '/data/generated-images/asset_1.png',
      fileName: 'asset_1.png',
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      createdAt: '2026-05-26T11:03:10.000Z',
    });

    const deletedAssets = await database.deleteProject('project_1');

    expect(await database.listProjectsWithThreads()).toEqual([]);
    expect(await database.listJobs()).toEqual([]);
    expect(await database.listAssets()).toEqual([]);
    expect(deletedAssets.map((asset) => asset.id)).toEqual(['asset_1']);

    database.close();
  });

  it('stores reusable reference images newest first', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createReference({
      id: 'reference_older',
      name: 'older.png',
      title: 'Older reference',
      description: null,
      mimeType: 'image/png',
      bytesBase64: 'AQID',
      createdAt: '2026-05-26T11:00:00.000Z',
    });
    await database.createReference({
      id: 'reference_newer',
      name: 'newer.png',
      title: 'Newer reference',
      description: 'Use the softer rim light.',
      mimeType: 'image/png',
      bytesBase64: 'BAUG',
      createdAt: '2026-05-26T11:01:00.000Z',
    });

    expect(await database.listReferences()).toEqual([
      {
        id: 'reference_newer',
        name: 'newer.png',
        title: 'Newer reference',
        description: 'Use the softer rim light.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T11:01:00.000Z',
      },
      {
        id: 'reference_older',
        name: 'older.png',
        title: 'Older reference',
        description: null,
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T11:00:00.000Z',
      },
    ]);

    database.close();
  });

  it('stores scene groups, frames, references, runs, and frame assets by thread', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createProject({
      id: 'project_1',
      name: 'Scenes',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    });
    await database.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'Thread One',
      createdAt: '2026-06-01T10:01:00.000Z',
      updatedAt: '2026-06-01T10:01:00.000Z',
    });

    await database.createSceneGroup({
      id: 'scene_1',
      threadId: 'thread_1',
      title: 'Scene 1',
      prompt: 'Base control room continuity.',
      tocOrder: 1,
      createdAt: '2026-06-01T10:02:00.000Z',
      updatedAt: '2026-06-01T10:02:00.000Z',
    });
    await database.createSceneFrame({
      id: 'frame_1',
      sceneGroupId: 'scene_1',
      title: 'Frame 1',
      prompt: 'Wide arrival shot.',
      frameOrder: 1,
      createdAt: '2026-06-01T10:03:00.000Z',
      updatedAt: '2026-06-01T10:03:00.000Z',
    });
    await database.createSceneFrame({
      id: 'frame_2',
      sceneGroupId: 'scene_1',
      title: 'Frame 2',
      prompt: 'Closer console angle.',
      frameOrder: 2,
      createdAt: '2026-06-01T10:04:00.000Z',
      updatedAt: '2026-06-01T10:04:00.000Z',
    });
    await database.replaceSceneFrameReferences('frame_2', [
      {
        id: 'frame_ref_1',
        sceneFrameId: 'frame_2',
        referenceKind: 'uploaded_attachment',
        referenceId: null,
        name: 'console.png',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-06-01T10:05:00.000Z',
      },
    ]);
    await database.createSceneGroupRun({
      id: 'scene_run_1',
      sceneGroupId: 'scene_1',
      threadId: 'thread_1',
      status: 'succeeded',
      provider: 'codex',
      modelId: 'gpt-5.4-mini',
      modelLabel: 'Codex / GPT-5.4 mini',
      requestedFrameCount: 2,
      errorMessage: null,
      durationMs: 12500,
      createdAt: '2026-06-01T10:06:00.000Z',
      updatedAt: '2026-06-01T10:06:12.000Z',
    });
    await database.insertSceneFrameAsset({
      id: 'scene_asset_1',
      sceneGroupRunId: 'scene_run_1',
      sceneFrameId: 'frame_2',
      outputIndex: 0,
      originalPath: '/tmp/scenes/frame-2-a.png',
      storedPath: '/data/scenes/frame-2-a.png',
      fileName: 'frame-2-a.png',
      mimeType: 'image/png',
      width: 1920,
      height: 1080,
      createdAt: '2026-06-01T10:06:13.000Z',
    });
    await database.insertSceneFrameAsset({
      id: 'scene_asset_2',
      sceneGroupRunId: 'scene_run_1',
      sceneFrameId: 'frame_2',
      outputIndex: 1,
      originalPath: '/tmp/scenes/frame-2-b.png',
      storedPath: '/data/scenes/frame-2-b.png',
      fileName: 'frame-2-b.png',
      mimeType: 'image/png',
      width: 1920,
      height: 1080,
      createdAt: '2026-06-01T10:06:14.000Z',
    });

    await database.updateSceneFrame('frame_1', {
      title: 'Frame 1 Updated',
      prompt: 'Updated wide arrival shot.',
      frameOrder: 1,
      updatedAt: '2026-06-01T10:07:00.000Z',
    });

    expect(await database.listSceneGroupsByThread('thread_1')).toEqual([
      {
        id: 'scene_1',
        threadId: 'thread_1',
        title: 'Scene 1',
        prompt: 'Base control room continuity.',
        tocOrder: 1,
        createdAt: '2026-06-01T10:02:00.000Z',
        updatedAt: '2026-06-01T10:02:00.000Z',
        frames: [
          {
            id: 'frame_1',
            sceneGroupId: 'scene_1',
            title: 'Frame 1 Updated',
            prompt: 'Updated wide arrival shot.',
            frameOrder: 1,
            createdAt: '2026-06-01T10:03:00.000Z',
            updatedAt: '2026-06-01T10:07:00.000Z',
            references: [],
            assets: [],
          },
          {
            id: 'frame_2',
            sceneGroupId: 'scene_1',
            title: 'Frame 2',
            prompt: 'Closer console angle.',
            frameOrder: 2,
            createdAt: '2026-06-01T10:04:00.000Z',
            updatedAt: '2026-06-01T10:04:00.000Z',
            references: [
              {
                id: 'frame_ref_1',
                sceneFrameId: 'frame_2',
                referenceKind: 'uploaded_attachment',
                referenceId: null,
                name: 'console.png',
                mimeType: 'image/png',
                bytesBase64: 'AQID',
                createdAt: '2026-06-01T10:05:00.000Z',
              },
            ],
            assets: [
              {
                id: 'scene_asset_1',
                sceneGroupRunId: 'scene_run_1',
                sceneFrameId: 'frame_2',
                outputIndex: 0,
                originalPath: '/tmp/scenes/frame-2-a.png',
                storedPath: '/data/scenes/frame-2-a.png',
                fileName: 'frame-2-a.png',
                mimeType: 'image/png',
                width: 1920,
                height: 1080,
                createdAt: '2026-06-01T10:06:13.000Z',
              },
              {
                id: 'scene_asset_2',
                sceneGroupRunId: 'scene_run_1',
                sceneFrameId: 'frame_2',
                outputIndex: 1,
                originalPath: '/tmp/scenes/frame-2-b.png',
                storedPath: '/data/scenes/frame-2-b.png',
                fileName: 'frame-2-b.png',
                mimeType: 'image/png',
                width: 1920,
                height: 1080,
                createdAt: '2026-06-01T10:06:14.000Z',
              },
            ],
          },
        ],
        runs: [
          {
            id: 'scene_run_1',
            sceneGroupId: 'scene_1',
            threadId: 'thread_1',
            status: 'succeeded',
            provider: 'codex',
            modelId: 'gpt-5.4-mini',
            modelLabel: 'Codex / GPT-5.4 mini',
            requestedFrameCount: 2,
            errorMessage: null,
            durationMs: 12500,
            createdAt: '2026-06-01T10:06:00.000Z',
            updatedAt: '2026-06-01T10:06:12.000Z',
          },
        ],
      },
    ]);

    database.close();
  });

  it('deletes thread-scoped scene data before deleting the thread row', async () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    await database.createProject({
      id: 'project_1',
      name: 'Scenes',
      systemInstructions: '',
      artStyle: '',
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    });
    await database.createThread({
      id: 'thread_1',
      projectId: 'project_1',
      name: 'Thread One',
      createdAt: '2026-06-01T10:01:00.000Z',
      updatedAt: '2026-06-01T10:01:00.000Z',
    });
    await database.createSceneGroup({
      id: 'scene_1',
      threadId: 'thread_1',
      title: 'Scene 1',
      prompt: 'Keep the room coherent.',
      tocOrder: 1,
      createdAt: '2026-06-01T10:02:00.000Z',
      updatedAt: '2026-06-01T10:02:00.000Z',
    });
    await database.createSceneFrame({
      id: 'frame_1',
      sceneGroupId: 'scene_1',
      title: 'Frame 1',
      prompt: 'Wide room shot.',
      frameOrder: 1,
      createdAt: '2026-06-01T10:03:00.000Z',
      updatedAt: '2026-06-01T10:03:00.000Z',
    });
    await database.replaceSceneFrameReferences('frame_1', [
      {
        id: 'frame_ref_1',
        sceneFrameId: 'frame_1',
        referenceKind: 'uploaded_attachment',
        referenceId: null,
        name: 'layout.png',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-06-01T10:04:00.000Z',
      },
    ]);
    await database.createSceneGroupRun({
      id: 'scene_run_1',
      sceneGroupId: 'scene_1',
      threadId: 'thread_1',
      status: 'succeeded',
      provider: 'codex',
      modelId: 'gpt-5.4-mini',
      modelLabel: 'Codex / GPT-5.4 mini',
      requestedFrameCount: 1,
      errorMessage: null,
      durationMs: 1000,
      createdAt: '2026-06-01T10:05:00.000Z',
      updatedAt: '2026-06-01T10:05:01.000Z',
    });
    await database.insertSceneFrameAsset({
      id: 'scene_asset_1',
      sceneGroupRunId: 'scene_run_1',
      sceneFrameId: 'frame_1',
      outputIndex: 0,
      originalPath: '/tmp/scenes/frame-1-a.png',
      storedPath: '/data/scenes/frame-1-a.png',
      fileName: 'frame-1-a.png',
      mimeType: 'image/png',
      width: 1280,
      height: 720,
      createdAt: '2026-06-01T10:05:02.000Z',
    });

    await expect(database.deleteThread('thread_1')).resolves.toEqual([]);
    await expect(database.listProjectsWithThreads()).resolves.toEqual([
      expect.objectContaining({
        id: 'project_1',
        threads: [],
      }),
    ]);
    await expect(database.listSceneGroupsByThread('thread_1')).resolves.toEqual([]);

    database.close();
  });
});
