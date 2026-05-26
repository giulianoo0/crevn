import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  it('creates schema, stores jobs and assets, and lists assets newest first', () => {
    const database = createGenerationDatabase(makeTempDatabasePath());

    const job: GenerationJobRecord = {
      id: 'job_1',
      prompt: 'cinematic portrait of a woman in neon rain',
      requestedCount: 2,
      status: 'succeeded',
      workingDirectory: '/tmp/crenv/job_1',
      manifestPath: '/tmp/crenv/job_1/manifest.json',
      errorMessage: null,
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:05.000Z',
    };

    database.upsertJob(job);

    database.insertAsset({
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

    database.insertAsset({
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

    const jobs = database.listJobs();
    const assets = database.listAssets();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(job);

    expect(assets).toHaveLength(2);
    expect(assets.map((asset: GenerationAssetRecord) => asset.id)).toEqual([
      'asset_newer',
      'asset_older',
    ]);

    database.close();
  });
});
