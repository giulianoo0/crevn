import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client/node';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';

import {
  CREATE_SCENE_FRAMES_TABLE_SQL,
  CREATE_SCENE_FRAME_ASSETS_TABLE_SQL,
  CREATE_SCENE_FRAME_REFERENCES_TABLE_SQL,
  CREATE_SCENE_GROUP_RUNS_TABLE_SQL,
  CREATE_SCENE_GROUPS_TABLE_SQL,
  CREATE_GENERATED_ASSETS_TABLE_SQL,
  CREATE_GENERATION_JOBS_TABLE_SQL,
  CREATE_PROJECTS_TABLE_SQL,
  CREATE_REFERENCE_IMAGES_TABLE_SQL,
  CREATE_THREADS_TABLE_SQL,
  generatedAssetsTable,
  generationJobsTable,
  projectsTable,
  referenceImagesTable,
  sceneFramesTable,
  sceneFrameAssetsTable,
  sceneFrameReferencesTable,
  sceneGroupsTable,
  sceneGroupRunsTable,
  threadsTable,
} from './schema';

export type GenerationJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface ProjectRecord {
  id: string;
  name: string;
  systemInstructions: string;
  artStyle: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectSettingsInput {
  systemInstructions: string;
  artStyle: string;
}

export interface ThreadRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadListRecord extends ThreadRecord {
  hasRunningJob: boolean;
}

export interface ProjectWithThreads extends ProjectRecord {
  threads: ThreadListRecord[];
}

export interface GenerationJobRecord {
  id: string;
  threadId: string;
  prompt: string;
  requestedCount: number;
  status: GenerationJobStatus;
  workingDirectory: string;
  manifestPath: string;
  errorMessage: string | null;
  provider?: string | null;
  modelId?: string | null;
  modelLabel?: string | null;
  referenceImagesJson?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationAssetRecord {
  id: string;
  jobId: string;
  originalPath: string;
  storedPath: string;
  fileName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface ReferenceImageRecord {
  id: string;
  name: string;
  title: string;
  description: string | null;
  mimeType: string;
  bytesBase64: string;
  createdAt: string;
}

export interface SceneGroupRecord {
  id: string;
  threadId: string;
  title: string;
  prompt: string;
  tocOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneFrameRecord {
  id: string;
  sceneGroupId: string;
  title: string;
  prompt: string;
  frameOrder: number;
  createdAt: string;
  updatedAt: string;
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

export interface SceneGroupDetails extends SceneGroupRecord {
  frames: Array<
    SceneFrameRecord & {
      references: SceneFrameReferenceRecord[];
      assets: SceneFrameAssetRecord[];
    }
  >;
  runs: SceneGroupRunRecord[];
}

export interface GenerationDatabase {
  createProject(project: ProjectRecord): Promise<ProjectRecord>;
  createThread(thread: ThreadRecord): Promise<ThreadRecord>;
  renameProject(projectId: string, name: string): Promise<void>;
  updateProjectSettings(projectId: string, input: UpdateProjectSettingsInput): Promise<void>;
  renameThread(threadId: string, name: string): Promise<void>;
  deleteProject(projectId: string): Promise<GenerationAssetRecord[]>;
  deleteThread(threadId: string): Promise<GenerationAssetRecord[]>;
  upsertJob(job: GenerationJobRecord): Promise<void>;
  insertAsset(asset: GenerationAssetRecord): Promise<void>;
  createReference(reference: ReferenceImageRecord): Promise<ReferenceImageRecord>;
  listReferences(): Promise<ReferenceImageRecord[]>;
  listSceneGroupsByThread(threadId: string): Promise<SceneGroupDetails[]>;
  createSceneGroup(sceneGroup: SceneGroupRecord): Promise<SceneGroupRecord>;
  updateSceneGroup(
    sceneGroupId: string,
    input: Pick<SceneGroupRecord, 'title' | 'prompt' | 'tocOrder' | 'updatedAt'>
  ): Promise<void>;
  createSceneFrame(sceneFrame: SceneFrameRecord): Promise<SceneFrameRecord>;
  updateSceneFrame(
    sceneFrameId: string,
    input: Pick<SceneFrameRecord, 'title' | 'prompt' | 'frameOrder' | 'updatedAt'>
  ): Promise<void>;
  replaceSceneFrameReferences(
    sceneFrameId: string,
    references: SceneFrameReferenceRecord[]
  ): Promise<SceneFrameReferenceRecord[]>;
  createSceneGroupRun(run: SceneGroupRunRecord): Promise<SceneGroupRunRecord>;
  updateSceneGroupRun(
    runId: string,
    input: Pick<SceneGroupRunRecord, 'status' | 'errorMessage' | 'durationMs' | 'updatedAt'>
  ): Promise<void>;
  insertSceneFrameAsset(asset: SceneFrameAssetRecord): Promise<void>;
  listProjectsWithThreads(): Promise<ProjectWithThreads[]>;
  listJobs(): Promise<GenerationJobRecord[]>;
  listAssets(): Promise<GenerationAssetRecord[]>;
  listAssetsByThread(threadId: string): Promise<GenerationAssetRecord[]>;
  countThreadsByProject(projectId: string): Promise<number>;
  close(): void;
}

function ensureParentDirectory(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export function createGenerationDatabase(databasePath: string): GenerationDatabase {
  ensureParentDirectory(databasePath);

  const client = createClient({
    url: pathToFileURL(databasePath).toString(),
  });
  const database = drizzle({ client });
  const ready = initializeDatabase(database);

  return {
    async createProject(project) {
      await ready;
      await database.insert(projectsTable).values(project);
      return project;
    },
    async createThread(thread) {
      await ready;
      await database.insert(threadsTable).values(thread);
      return thread;
    },
    async renameProject(projectId, name) {
      await ready;
      await database
        .update(projectsTable)
        .set({ name })
        .where(eq(projectsTable.id, projectId));
    },
    async updateProjectSettings(projectId, input) {
      await ready;
      await database
        .update(projectsTable)
        .set({
          systemInstructions: input.systemInstructions,
          artStyle: input.artStyle,
        })
        .where(eq(projectsTable.id, projectId));
    },
    async renameThread(threadId, name) {
      await ready;
      await database
        .update(threadsTable)
        .set({ name })
        .where(eq(threadsTable.id, threadId));
    },
    async deleteProject(projectId) {
      await ready;
      const threadIds = await database
        .select({ id: threadsTable.id })
        .from(threadsTable)
        .where(eq(threadsTable.projectId, projectId));
      return deleteThreads(database, threadIds.map((thread) => thread.id), async () => {
        if (threadIds.length > 0) {
          await database.delete(threadsTable).where(inArray(threadsTable.id, threadIds.map((thread) => thread.id)));
        }
        await database.delete(projectsTable).where(eq(projectsTable.id, projectId));
      });
    },
    async deleteThread(threadId) {
      await ready;
      return deleteThreads(database, [threadId], async () => {
        await database.delete(threadsTable).where(eq(threadsTable.id, threadId));
      });
    },
    async upsertJob(job) {
      await ready;
      await database
        .insert(generationJobsTable)
        .values(job)
        .onConflictDoUpdate({
          target: generationJobsTable.id,
          set: {
            threadId: job.threadId,
            prompt: job.prompt,
            requestedCount: job.requestedCount,
            status: job.status,
            workingDirectory: job.workingDirectory,
            manifestPath: job.manifestPath,
            errorMessage: job.errorMessage,
            provider: job.provider,
            modelId: job.modelId,
            modelLabel: job.modelLabel,
            referenceImagesJson: job.referenceImagesJson,
            durationMs: job.durationMs,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          },
        });
    },
    async insertAsset(asset) {
      await ready;
      await database.insert(generatedAssetsTable).values(asset);
    },
    async createReference(reference) {
      await ready;
      await database.insert(referenceImagesTable).values(reference);
      return reference;
    },
    async listReferences() {
      await ready;
      return (await database
        .select()
        .from(referenceImagesTable)
        .orderBy(desc(referenceImagesTable.createdAt), desc(referenceImagesTable.id))) as ReferenceImageRecord[];
    },
    async listSceneGroupsByThread(threadId) {
      await ready;
      const sceneGroups = await database
        .select()
        .from(sceneGroupsTable)
        .where(eq(sceneGroupsTable.threadId, threadId))
        .orderBy(sceneGroupsTable.tocOrder, desc(sceneGroupsTable.createdAt), desc(sceneGroupsTable.id));
      const sceneGroupIds = sceneGroups.map((sceneGroup) => sceneGroup.id);
      const sceneFrames =
        sceneGroupIds.length === 0
          ? []
          : await database
              .select()
              .from(sceneFramesTable)
              .where(inArray(sceneFramesTable.sceneGroupId, sceneGroupIds))
              .orderBy(sceneFramesTable.frameOrder, desc(sceneFramesTable.createdAt), desc(sceneFramesTable.id));
      const sceneFrameIds = sceneFrames.map((sceneFrame) => sceneFrame.id);
      const sceneFrameReferences =
        sceneFrameIds.length === 0
          ? []
          : await database
              .select()
              .from(sceneFrameReferencesTable)
              .where(inArray(sceneFrameReferencesTable.sceneFrameId, sceneFrameIds))
              .orderBy(desc(sceneFrameReferencesTable.createdAt), desc(sceneFrameReferencesTable.id));
      const runs =
        sceneGroupIds.length === 0
          ? []
          : await database
              .select()
              .from(sceneGroupRunsTable)
              .where(inArray(sceneGroupRunsTable.sceneGroupId, sceneGroupIds))
              .orderBy(desc(sceneGroupRunsTable.createdAt), desc(sceneGroupRunsTable.id));
      const runIds = runs.map((run) => run.id);
      const assets =
        runIds.length === 0
          ? []
          : await database
              .select()
              .from(sceneFrameAssetsTable)
              .where(inArray(sceneFrameAssetsTable.sceneGroupRunId, runIds))
              .orderBy(sceneFrameAssetsTable.outputIndex, desc(sceneFrameAssetsTable.createdAt), desc(sceneFrameAssetsTable.id));

      const referencesByFrameId = new Map<string, SceneFrameReferenceRecord[]>();
      for (const reference of sceneFrameReferences as SceneFrameReferenceRecord[]) {
        const current = referencesByFrameId.get(reference.sceneFrameId) ?? [];
        current.push(reference);
        referencesByFrameId.set(reference.sceneFrameId, current);
      }

      const assetsByFrameId = new Map<string, SceneFrameAssetRecord[]>();
      for (const asset of assets as SceneFrameAssetRecord[]) {
        const current = assetsByFrameId.get(asset.sceneFrameId) ?? [];
        current.push(asset);
        assetsByFrameId.set(asset.sceneFrameId, current);
      }

      const framesBySceneGroupId = new Map<string, SceneGroupDetails['frames']>();
      for (const frame of sceneFrames as SceneFrameRecord[]) {
        const current = framesBySceneGroupId.get(frame.sceneGroupId) ?? [];
        current.push({
          ...frame,
          references: referencesByFrameId.get(frame.id) ?? [],
          assets: assetsByFrameId.get(frame.id) ?? [],
        });
        framesBySceneGroupId.set(frame.sceneGroupId, current);
      }

      const runsBySceneGroupId = new Map<string, SceneGroupRunRecord[]>();
      for (const run of runs as SceneGroupRunRecord[]) {
        const current = runsBySceneGroupId.get(run.sceneGroupId) ?? [];
        current.push(run);
        runsBySceneGroupId.set(run.sceneGroupId, current);
      }

      return (sceneGroups as SceneGroupRecord[]).map((sceneGroup) => ({
        ...sceneGroup,
        frames: framesBySceneGroupId.get(sceneGroup.id) ?? [],
        runs: runsBySceneGroupId.get(sceneGroup.id) ?? [],
      }));
    },
    async createSceneGroup(sceneGroup) {
      await ready;
      await database.insert(sceneGroupsTable).values(sceneGroup);
      return sceneGroup;
    },
    async updateSceneGroup(sceneGroupId, input) {
      await ready;
      await database.update(sceneGroupsTable).set(input).where(eq(sceneGroupsTable.id, sceneGroupId));
    },
    async createSceneFrame(sceneFrame) {
      await ready;
      await database.insert(sceneFramesTable).values(sceneFrame);
      return sceneFrame;
    },
    async updateSceneFrame(sceneFrameId, input) {
      await ready;
      await database.update(sceneFramesTable).set(input).where(eq(sceneFramesTable.id, sceneFrameId));
    },
    async replaceSceneFrameReferences(sceneFrameId, references) {
      await ready;
      await database.delete(sceneFrameReferencesTable).where(eq(sceneFrameReferencesTable.sceneFrameId, sceneFrameId));
      if (references.length > 0) {
        await database.insert(sceneFrameReferencesTable).values(references);
      }
      return references;
    },
    async createSceneGroupRun(run) {
      await ready;
      await database.insert(sceneGroupRunsTable).values(run);
      return run;
    },
    async updateSceneGroupRun(runId, input) {
      await ready;
      await database.update(sceneGroupRunsTable).set(input).where(eq(sceneGroupRunsTable.id, runId));
    },
    async insertSceneFrameAsset(asset) {
      await ready;
      await database.insert(sceneFrameAssetsTable).values(asset);
    },
    async listProjectsWithThreads() {
      await ready;
      const projects = await database
        .select()
        .from(projectsTable)
        .orderBy(desc(projectsTable.createdAt), desc(projectsTable.id));
      const threads = await database
        .select()
        .from(threadsTable)
        .orderBy(desc(threadsTable.createdAt), desc(threadsTable.id));

      const threadIds = threads.map((thread) => thread.id);
      const runningJobs =
        threadIds.length === 0
          ? []
          : await database
              .select({ threadId: generationJobsTable.threadId })
              .from(generationJobsTable)
              .where(
                and(
                  inArray(generationJobsTable.threadId, threadIds),
                  inArray(generationJobsTable.status, ['pending', 'running'])
                )
              );
      const runningThreadIds = new Set(runningJobs.map((job) => job.threadId));

      const threadsByProjectId = new Map<string, ThreadListRecord[]>();
      for (const thread of threads) {
        const projectThreads = threadsByProjectId.get(thread.projectId) ?? [];
        projectThreads.push({
          ...thread,
          hasRunningJob: runningThreadIds.has(thread.id),
        });
        threadsByProjectId.set(thread.projectId, projectThreads);
      }

      return projects.map((project) => ({
        ...project,
        threads: threadsByProjectId.get(project.id) ?? [],
      }));
    },
    async listJobs() {
      await ready;
      return (await database
        .select()
        .from(generationJobsTable)
        .orderBy(desc(generationJobsTable.createdAt))) as GenerationJobRecord[];
    },
    async listAssets() {
      await ready;
      return (await database
        .select()
        .from(generatedAssetsTable)
        .orderBy(desc(generatedAssetsTable.createdAt), desc(generatedAssetsTable.id))) as GenerationAssetRecord[];
    },
    async listAssetsByThread(threadId) {
      await ready;
      return (await database
        .select({
          id: generatedAssetsTable.id,
          jobId: generatedAssetsTable.jobId,
          originalPath: generatedAssetsTable.originalPath,
          storedPath: generatedAssetsTable.storedPath,
          fileName: generatedAssetsTable.fileName,
          mimeType: generatedAssetsTable.mimeType,
          width: generatedAssetsTable.width,
          height: generatedAssetsTable.height,
          createdAt: generatedAssetsTable.createdAt,
          prompt: generationJobsTable.prompt,
          provider: generationJobsTable.provider,
          modelId: generationJobsTable.modelId,
          modelLabel: generationJobsTable.modelLabel,
          referenceImagesJson: generationJobsTable.referenceImagesJson,
          durationMs: generationJobsTable.durationMs,
        })
        .from(generatedAssetsTable)
        .innerJoin(generationJobsTable, eq(generatedAssetsTable.jobId, generationJobsTable.id))
        .where(eq(generationJobsTable.threadId, threadId))
        .orderBy(desc(generatedAssetsTable.createdAt), desc(generatedAssetsTable.id))) as GenerationAssetRecord[];
    },
    async countThreadsByProject(projectId) {
      await ready;
      const result = await database
        .select({ count: sql<number>`count(*)` })
        .from(threadsTable)
        .where(eq(threadsTable.projectId, projectId));
      return Number(result[0]?.count ?? 0);
    },
    close() {
      client.close();
    },
  };
}

async function initializeDatabase(database: ReturnType<typeof drizzle<Client>>) {
  await database.run(sql.raw(CREATE_PROJECTS_TABLE_SQL));
  await database.run(sql.raw(CREATE_THREADS_TABLE_SQL));
  await database.run(sql.raw(CREATE_GENERATION_JOBS_TABLE_SQL));
  await database.run(sql.raw(CREATE_GENERATED_ASSETS_TABLE_SQL));
  await database.run(sql.raw(CREATE_REFERENCE_IMAGES_TABLE_SQL));
  await database.run(sql.raw(CREATE_SCENE_GROUPS_TABLE_SQL));
  await database.run(sql.raw(CREATE_SCENE_FRAMES_TABLE_SQL));
  await database.run(sql.raw(CREATE_SCENE_FRAME_REFERENCES_TABLE_SQL));
  await database.run(sql.raw(CREATE_SCENE_GROUP_RUNS_TABLE_SQL));
  await database.run(sql.raw(CREATE_SCENE_FRAME_ASSETS_TABLE_SQL));
  await ensureProjectSettingsColumns(database);
  await ensureGenerationJobsThreadColumn(database);
  await ensureGenerationJobMetadataColumns(database);
}

async function ensureProjectSettingsColumns(database: ReturnType<typeof drizzle<Client>>) {
  const tableInfo = await database.all<{ name: string }>(sql.raw("PRAGMA table_info('projects')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('system_instructions')) {
    await database.run(
      sql.raw("ALTER TABLE projects ADD COLUMN system_instructions TEXT NOT NULL DEFAULT ''")
    );
  }

  if (!columnNames.has('art_style')) {
    await database.run(sql.raw("ALTER TABLE projects ADD COLUMN art_style TEXT NOT NULL DEFAULT ''"));
  }
}

async function ensureGenerationJobsThreadColumn(database: ReturnType<typeof drizzle<Client>>) {
  const tableInfo = await database.all<{ name: string }>(sql.raw("PRAGMA table_info('generation_jobs')"));
  const hasThreadId = tableInfo.some((column) => column.name === 'thread_id');

  if (!hasThreadId) {
    await database.run(sql.raw("ALTER TABLE generation_jobs ADD COLUMN thread_id TEXT REFERENCES threads(id)"));
  }
}

async function ensureGenerationJobMetadataColumns(database: ReturnType<typeof drizzle<Client>>) {
  const tableInfo = await database.all<{ name: string }>(sql.raw("PRAGMA table_info('generation_jobs')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('provider')) {
    await database.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN provider TEXT'));
  }

  if (!columnNames.has('model_id')) {
    await database.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN model_id TEXT'));
  }

  if (!columnNames.has('model_label')) {
    await database.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN model_label TEXT'));
  }

  if (!columnNames.has('reference_images_json')) {
    await database.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN reference_images_json TEXT'));
  }

  if (!columnNames.has('duration_ms')) {
    await database.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN duration_ms INTEGER'));
  }
}

async function deleteThreads(
  database: ReturnType<typeof drizzle<Client>>,
  threadIds: string[],
  deleteThreadsRow: () => Promise<void>
) {
  if (threadIds.length === 0) {
    await deleteThreadsRow();
    return [];
  }

  const jobIds = await database
    .select({ id: generationJobsTable.id })
    .from(generationJobsTable)
    .where(inArray(generationJobsTable.threadId, threadIds));
  const jobIdValues = jobIds.map((job) => job.id);

  const deletedAssets =
    jobIdValues.length === 0
      ? []
      : ((await database
          .select()
          .from(generatedAssetsTable)
          .where(inArray(generatedAssetsTable.jobId, jobIdValues))) as GenerationAssetRecord[]);

  if (jobIdValues.length > 0) {
    await database.delete(generatedAssetsTable).where(inArray(generatedAssetsTable.jobId, jobIdValues));
    await database.delete(generationJobsTable).where(inArray(generationJobsTable.id, jobIdValues));
  }

  const sceneGroups = await database
    .select({ id: sceneGroupsTable.id })
    .from(sceneGroupsTable)
    .where(inArray(sceneGroupsTable.threadId, threadIds));
  const sceneGroupIds = sceneGroups.map((sceneGroup) => sceneGroup.id);

  if (sceneGroupIds.length > 0) {
    const sceneFrames = await database
      .select({ id: sceneFramesTable.id })
      .from(sceneFramesTable)
      .where(inArray(sceneFramesTable.sceneGroupId, sceneGroupIds));
    const sceneFrameIds = sceneFrames.map((sceneFrame) => sceneFrame.id);
    const sceneRuns = await database
      .select({ id: sceneGroupRunsTable.id })
      .from(sceneGroupRunsTable)
      .where(inArray(sceneGroupRunsTable.sceneGroupId, sceneGroupIds));
    const sceneRunIds = sceneRuns.map((sceneRun) => sceneRun.id);

    if (sceneRunIds.length > 0) {
      await database
        .delete(sceneFrameAssetsTable)
        .where(inArray(sceneFrameAssetsTable.sceneGroupRunId, sceneRunIds));
      await database.delete(sceneGroupRunsTable).where(inArray(sceneGroupRunsTable.id, sceneRunIds));
    }

    if (sceneFrameIds.length > 0) {
      await database
        .delete(sceneFrameReferencesTable)
        .where(inArray(sceneFrameReferencesTable.sceneFrameId, sceneFrameIds));
      await database.delete(sceneFramesTable).where(inArray(sceneFramesTable.id, sceneFrameIds));
    }

    await database.delete(sceneGroupsTable).where(inArray(sceneGroupsTable.id, sceneGroupIds));
  }

  await deleteThreadsRow();

  return deletedAssets;
}
