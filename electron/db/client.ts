import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client/node';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';

import {
  CREATE_GENERATED_ASSETS_TABLE_SQL,
  CREATE_GENERATION_JOBS_TABLE_SQL,
  CREATE_PROJECTS_TABLE_SQL,
  CREATE_REFERENCE_IMAGES_TABLE_SQL,
  CREATE_THREADS_TABLE_SQL,
  generatedAssetsTable,
  generationJobsTable,
  projectsTable,
  referenceImagesTable,
  threadsTable,
} from './schema';

export type GenerationJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

export interface GenerationDatabase {
  createProject(project: ProjectRecord): Promise<ProjectRecord>;
  createThread(thread: ThreadRecord): Promise<ThreadRecord>;
  renameProject(projectId: string, name: string): Promise<void>;
  renameThread(threadId: string, name: string): Promise<void>;
  deleteProject(projectId: string): Promise<GenerationAssetRecord[]>;
  deleteThread(threadId: string): Promise<GenerationAssetRecord[]>;
  upsertJob(job: GenerationJobRecord): Promise<void>;
  insertAsset(asset: GenerationAssetRecord): Promise<void>;
  createReference(reference: ReferenceImageRecord): Promise<ReferenceImageRecord>;
  listReferences(): Promise<ReferenceImageRecord[]>;
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
  await ensureGenerationJobsThreadColumn(database);
}

async function ensureGenerationJobsThreadColumn(database: ReturnType<typeof drizzle<Client>>) {
  const tableInfo = await database.all<{ name: string }>(sql.raw("PRAGMA table_info('generation_jobs')"));
  const hasThreadId = tableInfo.some((column) => column.name === 'thread_id');

  if (!hasThreadId) {
    await database.run(sql.raw("ALTER TABLE generation_jobs ADD COLUMN thread_id TEXT REFERENCES threads(id)"));
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

  await deleteThreadsRow();

  return deletedAssets;
}
