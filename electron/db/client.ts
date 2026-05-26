import fs from 'node:fs';
import path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { desc, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import {
  CREATE_GENERATED_ASSETS_TABLE_SQL,
  CREATE_GENERATION_JOBS_TABLE_SQL,
  generatedAssetsTable,
  generationJobsTable,
} from './schema';

export type GenerationJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface GenerationJobRecord {
  id: string;
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

export interface GenerationDatabase {
  upsertJob(job: GenerationJobRecord): void;
  insertAsset(asset: GenerationAssetRecord): void;
  listJobs(): GenerationJobRecord[];
  listAssets(): GenerationAssetRecord[];
  close(): void;
}

function ensureParentDirectory(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export function createGenerationDatabase(databasePath: string): GenerationDatabase {
  ensureParentDirectory(databasePath);

  const client = new BetterSqlite3(databasePath);
  const database = drizzle({ client });

  database.run(sql.raw(CREATE_GENERATION_JOBS_TABLE_SQL));
  database.run(sql.raw(CREATE_GENERATED_ASSETS_TABLE_SQL));

  return {
    upsertJob(job) {
      database
        .insert(generationJobsTable)
        .values(job)
        .onConflictDoUpdate({
          target: generationJobsTable.id,
          set: {
            prompt: job.prompt,
            requestedCount: job.requestedCount,
            status: job.status,
            workingDirectory: job.workingDirectory,
            manifestPath: job.manifestPath,
            errorMessage: job.errorMessage,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          },
        })
        .run();
    },
    insertAsset(asset) {
      database.insert(generatedAssetsTable).values(asset).run();
    },
    listJobs() {
      return database
        .select()
        .from(generationJobsTable)
        .orderBy(desc(generationJobsTable.createdAt))
        .all() as GenerationJobRecord[];
    },
    listAssets() {
      return database
        .select()
        .from(generatedAssetsTable)
        .orderBy(desc(generatedAssetsTable.createdAt), desc(generatedAssetsTable.id))
        .all() as GenerationAssetRecord[];
    },
    close() {
      client.close();
    },
  };
}
