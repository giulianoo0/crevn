const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');

const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { desc, sql } = require('drizzle-orm');
const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const generationJobsTable = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(),
  prompt: text('prompt').notNull(),
  requestedCount: integer('requested_count').notNull(),
  status: text('status').notNull(),
  workingDirectory: text('working_directory').notNull(),
  manifestPath: text('manifest_path').notNull(),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const generatedAssetsTable = sqliteTable('generated_assets', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => generationJobsTable.id),
  originalPath: text('original_path').notNull(),
  storedPath: text('stored_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: text('created_at').notNull(),
});

const CREATE_GENERATION_JOBS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    requested_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    working_directory TEXT NOT NULL,
    manifest_path TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_GENERATED_ASSETS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS generated_assets (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    original_path TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES generation_jobs(id)
  )
`;

function getAppDataPaths(userDataDir) {
  return {
    userDataDir,
    databasePath: path.join(userDataDir, 'crenv.sqlite'),
    generatedImagesDir: path.join(userDataDir, 'generated-images'),
    codexJobsTempDir: path.join(userDataDir, 'tmp', 'codex-jobs'),
  };
}

function createGenerationStore(userDataDir) {
  const paths = getAppDataPaths(userDataDir);
  fs.mkdirSync(path.dirname(paths.databasePath), { recursive: true });

  const client = new Database(paths.databasePath);
  const db = drizzle({ client });

  db.run(sql.raw(CREATE_GENERATION_JOBS_TABLE_SQL));
  db.run(sql.raw(CREATE_GENERATED_ASSETS_TABLE_SQL));

  async function generateImages({ prompt, count }) {
    const jobId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const workingDirectory = path.join(paths.codexJobsTempDir, jobId);
    const outputDirectory = path.join(workingDirectory, 'output');
    const manifestPath = path.join(workingDirectory, 'manifest.json');

    await fsp.mkdir(outputDirectory, { recursive: true });

    upsertJob({
      id: jobId,
      prompt,
      requestedCount: count,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const result = await runCodexJob({
      workingDirectory,
      prompt: buildCodexImageGenerationPrompt({
        userPrompt: prompt,
        outputDirectory,
        manifestPath,
        imageCount: count,
      }),
    });

    if (!result.success) {
      upsertJob({
        id: jobId,
        prompt,
        requestedCount: count,
        status: 'failed',
        workingDirectory,
        manifestPath,
        errorMessage: result.errorMessage,
        createdAt: timestamp,
        updatedAt: new Date().toISOString(),
      });
      throw new Error(result.errorMessage);
    }

    const manifest = parseGenerationManifest(await fsp.readFile(manifestPath, 'utf8'));
    const assets = [];

    for (const image of manifest.images) {
      const assetId = crypto.randomUUID();
      const imported = await importGeneratedImage({
        assetId,
        sourcePath: image.path,
        generatedImagesDir: paths.generatedImagesDir,
        createdAt: new Date().toISOString(),
      });

      const assetRecord = {
        id: assetId,
        jobId,
        originalPath: image.path,
        storedPath: imported.storedPath,
        fileName: imported.fileName,
        mimeType: imported.mimeType,
        width: null,
        height: null,
        createdAt: imported.createdAt,
      };

      db.insert(generatedAssetsTable).values(assetRecord).run();
      assets.push(toRendererAsset(assetRecord));
    }

    upsertJob({
      id: jobId,
      prompt,
      requestedCount: count,
      status: 'succeeded',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: new Date().toISOString(),
    });

    return { jobId, assets };
  }

  function listGeneratedImages() {
    const assets = db
      .select()
      .from(generatedAssetsTable)
      .orderBy(desc(generatedAssetsTable.createdAt), desc(generatedAssetsTable.id))
      .all();

    return assets.map(toRendererAsset);
  }

  function close() {
    client.close();
  }

  return {
    generateImages,
    listGeneratedImages,
    close,
  };

  function upsertJob(job) {
    db.insert(generationJobsTable)
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
  }
}

function toRendererAsset(asset) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileUrl: pathToFileURL(asset.storedPath).toString(),
    createdAt: asset.createdAt,
  };
}

function buildCodexImageGenerationPrompt(input) {
  return [
    'Generate image files for the following prompt.',
    '',
    `Creative prompt: ${input.userPrompt}`,
    '',
    `Create exactly ${input.imageCount} image file(s).`,
    `Save every generated image inside this output directory: ${input.outputDirectory}`,
    `Write a JSON manifest to this exact path: ${input.manifestPath}`,
    '',
    'The manifest must have this shape:',
    '{',
    '  "images": [',
    '    { "path": "/absolute/path/to/generated-image.png" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Use only absolute paths in the manifest.',
    '- Include every generated image in the manifest.',
    '- Do not rely on prose output as the result contract.',
  ].join('\n');
}

function parseGenerationManifest(manifestContent) {
  const parsed = JSON.parse(manifestContent);
  if (!Array.isArray(parsed.images) || parsed.images.length === 0) {
    throw new Error('Manifest must include at least one generated image.');
  }

  return {
    images: parsed.images.map((entry) => {
      if (typeof entry.path !== 'string' || !path.isAbsolute(entry.path)) {
        throw new Error('Manifest image paths must be absolute.');
      }
      return { path: entry.path };
    }),
  };
}

async function importGeneratedImage(input) {
  const extension = path.extname(input.sourcePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[extension];

  if (!mimeType) {
    throw new Error(`Unsupported image type: ${extension || 'unknown'}`);
  }

  const sourceStat = await fsp.stat(input.sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error('Generated image path must point to a file.');
  }

  await fsp.mkdir(input.generatedImagesDir, { recursive: true });

  const fileName = `${input.assetId}${extension}`;
  const storedPath = path.join(input.generatedImagesDir, fileName);

  await fsp.copyFile(input.sourcePath, storedPath);

  return {
    fileName,
    storedPath,
    mimeType,
    createdAt: input.createdAt,
  };
}

function runCodexJob({ workingDirectory, prompt }) {
  return new Promise((resolve) => {
    const child = spawn(
      'codex',
      [
        'exec',
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
        '--skip-git-repo-check',
        '-',
      ],
      {
        cwd: workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        errorMessage: error.code === 'ENOENT' ? 'Codex CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
        return;
      }

      const errorMessage = stderr.trim() || stdout.trim() || `Codex exited with code ${code}.`;
      resolve({
        success: false,
        errorMessage,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = {
  createGenerationStore,
  getAppDataPaths,
};
