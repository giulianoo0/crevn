const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const { nanoid } = require('nanoid');
const { createClient } = require('@libsql/client/node');
const { and, desc, eq, inArray, sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/libsql');
const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const DEFAULT_PROJECT_NAME = 'Documents';
const DEFAULT_THREAD_NAME = 'New Thread';
const MANUAL_PROJECT_NAME = 'New Project';
const CODEX_MODEL = 'gpt-5.4-mini';

const projectsTable = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemInstructions: text('system_instructions').notNull().default(''),
  artStyle: text('art_style').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const threadsTable = sqliteTable('threads', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projectsTable.id),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const generationJobsTable = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => threadsTable.id),
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

const referenceImagesTable = sqliteTable('reference_images', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  createdAt: text('created_at').notNull(),
});

const CREATE_PROJECTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_instructions TEXT NOT NULL DEFAULT '',
    art_style TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_THREADS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`;

const CREATE_GENERATION_JOBS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    requested_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    working_directory TEXT NOT NULL,
    manifest_path TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
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

const CREATE_REFERENCE_IMAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS reference_images (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
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

async function resetCodexJobsDirectory(codexJobsTempDir) {
  await fsp.rm(codexJobsTempDir, { recursive: true, force: true });
  await fsp.mkdir(codexJobsTempDir, { recursive: true });
}

async function createGenerationStore(userDataDir, options = {}) {
  const paths = getAppDataPaths(userDataDir);
  fs.mkdirSync(path.dirname(paths.databasePath), { recursive: true });
  await resetCodexJobsDirectory(paths.codexJobsTempDir);

  console.info('[crenv:codex] initialized store');
  console.info('[crenv:codex] userDataDir:', paths.userDataDir);
  console.info('[crenv:codex] databasePath:', paths.databasePath);
  console.info('[crenv:codex] generatedImagesDir:', paths.generatedImagesDir);
  console.info('[crenv:codex] cleared codexJobsTempDir:', paths.codexJobsTempDir);

  const client = createClient({
    url: pathToFileURL(paths.databasePath).toString(),
  });
  const db = drizzle({ client });

  await db.run(sql.raw(CREATE_PROJECTS_TABLE_SQL));
  await db.run(sql.raw(CREATE_THREADS_TABLE_SQL));
  await db.run(sql.raw(CREATE_GENERATION_JOBS_TABLE_SQL));
  await db.run(sql.raw(CREATE_GENERATED_ASSETS_TABLE_SQL));
  await db.run(sql.raw(CREATE_REFERENCE_IMAGES_TABLE_SQL));
  await ensureProjectSettingsColumns(db);
  await ensureGenerationJobsThreadColumn(db);

  async function ensureProjectThreadWorkspace() {
    const projects = await listProjectsWithThreads();
    const firstProject = projects[0];

    if (!firstProject) {
      const project = await createProjectRecord(DEFAULT_PROJECT_NAME);
      const thread = await createThreadRecord(project.id);
      return {
        project: { ...project, threads: [thread] },
        thread,
      };
    }

    const firstThread = firstProject.threads[0];
    if (firstThread) {
      return { project: firstProject, thread: firstThread };
    }

    const thread = await createThreadRecord(firstProject.id);
    return {
      project: {
        ...firstProject,
        threads: [thread],
      },
      thread,
    };
  }

  async function createProject(projectName) {
    const name = typeof projectName === 'string' && projectName.trim() ? projectName.trim() : MANUAL_PROJECT_NAME;
    const project = await createProjectRecord(name);
    const thread = await createThreadRecord(project.id);
    return {
      project: { ...project, threads: [thread] },
      thread,
    };
  }

  async function createThread(projectId) {
    return createThreadRecord(projectId);
  }

  async function renameProject(projectId, name) {
    await db
      .update(projectsTable)
      .set({ name: name.trim() })
      .where(eq(projectsTable.id, projectId));
  }

  async function updateProjectSettings(projectId, input) {
    await db
      .update(projectsTable)
      .set({
        systemInstructions: input.systemInstructions,
        artStyle: input.artStyle,
      })
      .where(eq(projectsTable.id, projectId));
  }

  async function renameThread(threadId, name) {
    await db
      .update(threadsTable)
      .set({ name: name.trim() })
      .where(eq(threadsTable.id, threadId));
  }

  async function deleteProject(projectId) {
    const threadIds = await db
      .select({ id: threadsTable.id })
      .from(threadsTable)
      .where(eq(threadsTable.projectId, projectId));

    const deletedAssets = await deleteThreads(threadIds.map((thread) => thread.id), async () => {
      if (threadIds.length > 0) {
        await db.delete(threadsTable).where(inArray(threadsTable.id, threadIds.map((thread) => thread.id)));
      }
      await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    });

    await removeStoredAssets(deletedAssets);
  }

  async function deleteThread(threadId) {
    const deletedAssets = await deleteThreads([threadId], async () => {
      await db.delete(threadsTable).where(eq(threadsTable.id, threadId));
    });

    await removeStoredAssets(deletedAssets);
  }

  async function listProjectsWithThreads() {
    const projects = await db
      .select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.createdAt), desc(projectsTable.id));
    const threads = await db
      .select()
      .from(threadsTable)
      .orderBy(desc(threadsTable.createdAt), desc(threadsTable.id));

    const threadIds = threads.map((thread) => thread.id);
    const runningJobs = threadIds.length
      ? await db
          .select({ threadId: generationJobsTable.threadId })
          .from(generationJobsTable)
          .where(
            and(
              inArray(generationJobsTable.threadId, threadIds),
              inArray(generationJobsTable.status, ['pending', 'running'])
            )
          )
      : [];
    const runningThreadIds = new Set(runningJobs.map((job) => job.threadId));

    const threadsByProjectId = new Map();
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
  }

  async function createReference(payload) {
    const timestamp = new Date().toISOString();
    const reference = {
      id: nanoid(),
      name: payload.name,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      mimeType: payload.mimeType || 'image/png',
      bytesBase64: payload.bytesBase64,
      createdAt: timestamp,
    };

    await db.insert(referenceImagesTable).values(reference);
    return reference;
  }

  async function listReferences() {
    return db
      .select()
      .from(referenceImagesTable)
      .orderBy(desc(referenceImagesTable.createdAt), desc(referenceImagesTable.id));
  }

  async function generateImages({ prompt, count, threadId, mode = 'manual', referenceImages = [], pinPoint, camera }) {
    const jobId = nanoid();
    const timestamp = new Date().toISOString();
    const workingDirectory = path.join(paths.codexJobsTempDir, jobId);
    const outputDirectory = path.join(workingDirectory, 'output');
    const manifestPath = path.join(workingDirectory, 'manifest.json');
    const stagedReferenceImages = await stageReferenceImages({
      workingDirectory,
      referenceImages,
    });

    await fsp.mkdir(outputDirectory, { recursive: true });

    console.info(`[crenv:codex:${jobId}] starting image generation`);
    console.info(`[crenv:codex:${jobId}] workingDirectory: ${workingDirectory}`);
    console.info(`[crenv:codex:${jobId}] outputDirectory: ${outputDirectory}`);
    console.info(`[crenv:codex:${jobId}] manifestPath: ${manifestPath}`);
    console.info(`[crenv:codex:${jobId}] requestedCount: ${count}`);
    console.info(`[crenv:codex:${jobId}] threadId: ${threadId}`);

    await upsertJob({
      id: jobId,
      threadId,
      prompt,
      requestedCount: count,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    try {
      const result = await runCodexJob({
        jobId,
        workingDirectory,
        prompt: buildCodexImageGenerationPrompt({
          mode,
          userPrompt: prompt,
          outputDirectory,
          manifestPath,
          imageCount: count,
          referenceImages: stagedReferenceImages,
          pinPoint,
          camera,
        }),
        requestedCount: count,
        threadId,
        onScenePlan: options.onScenePlan,
      });

      if (!result.success) {
        console.error(`[crenv:codex:${jobId}] generation failed`);
        throw new Error(result.errorMessage);
      }

      await fsp.access(manifestPath);
      const manifest = parseGenerationManifest(await fsp.readFile(manifestPath, 'utf8'));
      console.info(`[crenv:codex:${jobId}] manifest contains ${manifest.images.length} image(s)`);
      const assets = [];

      for (const image of manifest.images) {
        const assetId = nanoid();
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

        await db.insert(generatedAssetsTable).values(assetRecord);
        assets.push(toRendererAsset(assetRecord));
        console.info(`[crenv:codex:${jobId}] imported asset: ${imported.storedPath}`);
      }

      await upsertJob({
        id: jobId,
        threadId,
        prompt,
        requestedCount: count,
        status: 'succeeded',
        workingDirectory,
        manifestPath,
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: new Date().toISOString(),
      });

      console.info(`[crenv:codex:${jobId}] generation succeeded`);

      return { jobId, assets };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await upsertJob({
        id: jobId,
        threadId,
        prompt,
        requestedCount: count,
        status: 'failed',
        workingDirectory,
        manifestPath,
        errorMessage,
        createdAt: timestamp,
        updatedAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  async function listGeneratedImages(threadId) {
    if (!threadId) {
      return [];
    }

    const assets = await db
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
      .orderBy(desc(generatedAssetsTable.createdAt), desc(generatedAssetsTable.id));

    return assets.map(toRendererAsset);
  }

  async function getGeneratedImage(imageId) {
    const assets = await db
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
      .where(eq(generatedAssetsTable.id, imageId))
      .limit(1);

    return assets[0] ?? null;
  }

  async function deleteGeneratedImage(imageId) {
    const asset = await getGeneratedImage(imageId);
    if (!asset) {
      throw new Error('Generated image not found.');
    }

    await db.delete(generatedAssetsTable).where(eq(generatedAssetsTable.id, imageId));
    await fsp.rm(asset.storedPath, { force: true });
  }

  function close() {
    client.close();
  }

  return {
    createProject,
    createThread,
    renameProject,
    updateProjectSettings,
    renameThread,
    deleteProject,
    deleteThread,
    ensureProjectThreadWorkspace,
    generateImages,
    getGeneratedImage,
    deleteGeneratedImage,
    listGeneratedImages,
    listProjectsWithThreads,
    listReferences,
    createReference,
    close,
  };

  async function createProjectRecord(name) {
    const timestamp = new Date().toISOString();
    const project = {
      id: nanoid(),
      name,
      systemInstructions: '',
      artStyle: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(projectsTable).values(project);
    return project;
  }

  async function createThreadRecord(projectId) {
    const timestamp = new Date().toISOString();
    const threadCount = await countThreadsByProject(projectId);
    const nextIndex = threadCount + 1;
    const thread = {
      id: nanoid(),
      projectId,
      name: nextIndex === 1 ? DEFAULT_THREAD_NAME : `${DEFAULT_THREAD_NAME} ${nextIndex}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      hasRunningJob: false,
    };
    await db.insert(threadsTable).values({
      id: thread.id,
      projectId: thread.projectId,
      name: thread.name,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    });
    return thread;
  }

  async function countProjects() {
    const result = await db.select({ count: sql`count(*)` }).from(projectsTable);
    return Number(result[0]?.count ?? 0);
  }

  async function countThreadsByProject(projectId) {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(threadsTable)
      .where(eq(threadsTable.projectId, projectId));
    return Number(result[0]?.count ?? 0);
  }

  function upsertJob(job) {
    return db
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
  }

  async function deleteThreads(threadIds, deleteThreadsRow) {
    if (threadIds.length === 0) {
      await deleteThreadsRow();
      return [];
    }

    const jobs = await db
      .select({ id: generationJobsTable.id })
      .from(generationJobsTable)
      .where(inArray(generationJobsTable.threadId, threadIds));
    const jobIds = jobs.map((job) => job.id);

    const deletedAssets = jobIds.length
      ? await db.select().from(generatedAssetsTable).where(inArray(generatedAssetsTable.jobId, jobIds))
      : [];

    if (jobIds.length > 0) {
      await db.delete(generatedAssetsTable).where(inArray(generatedAssetsTable.jobId, jobIds));
      await db.delete(generationJobsTable).where(inArray(generationJobsTable.id, jobIds));
    }

    await deleteThreadsRow();
    return deletedAssets;
  }

  async function removeStoredAssets(assets) {
    await Promise.all(
      assets.map((asset) =>
        fsp.rm(asset.storedPath, { force: true }).catch((error) => {
          console.error(`[crenv:codex] failed to remove asset file ${asset.storedPath}: ${error.message}`);
        })
      )
    );
  }
}

async function ensureProjectSettingsColumns(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('projects')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('system_instructions')) {
    await db.run(sql.raw("ALTER TABLE projects ADD COLUMN system_instructions TEXT NOT NULL DEFAULT ''"));
  }

  if (!columnNames.has('art_style')) {
    await db.run(sql.raw("ALTER TABLE projects ADD COLUMN art_style TEXT NOT NULL DEFAULT ''"));
  }
}

async function ensureGenerationJobsThreadColumn(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('generation_jobs')"));
  const hasThreadId = tableInfo.some((column) => column.name === 'thread_id');

  if (!hasThreadId) {
    await db.run(sql.raw("ALTER TABLE generation_jobs ADD COLUMN thread_id TEXT REFERENCES threads(id)"));
  }
}

function toRendererAsset(asset) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileUrl: `crenv-asset://generated?path=${encodeURIComponent(asset.storedPath)}`,
    createdAt: asset.createdAt,
  };
}

function buildCodexImageGenerationPrompt(input) {
  const mode = input.mode ?? 'manual';

  return [
    'You are running inside a Codex batch job for an Electron app.',
    'Use Codex image generation capabilities to create image files for the following prompt.',
    `Generation mode: ${mode}`,
    '',
    `Creative prompt: ${input.userPrompt}`,
    '',
    ...(input.referenceImages.length > 0
      ? [
          'Reference image files:',
          ...input.referenceImages.map((referenceImage) => {
            const metadata = [
              referenceImage.title ? `title: ${referenceImage.title}` : null,
              referenceImage.description ? `description: ${referenceImage.description}` : null,
            ].filter(Boolean);
            return metadata.length > 0
              ? `- ${referenceImage.path} (${metadata.join('; ')})`
              : `- ${referenceImage.path}`;
          }),
          'Analyze all attached reference images before generating anything.',
          'Decide the role of each reference image: exact edit target, scene anchor, subject anchor, style-only reference, or supporting mood/material reference.',
          'If one or more references define the exact scene or asset to continue, preserve and extend that scene instead of inventing a different one.',
          'If the references are only stylistic, material, or mood guidance, create a new asset that borrows those qualities without copying unrelated scene layout.',
          'Use those reference images as visual guidance for composition, subject, color, materials, and mood when relevant.',
          '',
        ]
      : []),
    ...(mode === 'scene'
      ? [
          `The user requested at least ${input.imageCount} image file(s). Never create fewer than that.`,
          'You may create more image files when useful, but never fewer.',
          'Decide whether the scene already has a strong anchor from the prompt or references, or whether you should create a canonical master scene first.',
          'If a master scene is useful, create it first and then derive additional views from it.',
          'If existing references already define the scene strongly, reuse them as the anchor instead of creating a new master image.',
          'Use the attached references to decide whether this is a continuation/edit of an existing scene or a fresh scene that only borrows style/material cues.',
          'Preserve environment identity, materials, layout, lighting direction, palette, and spatial continuity whenever the request calls for the same scene.',
          'Choose camera coverage yourself and hide explicit angle-selection logic from the final output behavior.',
          'If you choose a scene-coverage workflow, the final output must contain at least 4 image files total.',
          'Before generating final images, print exactly one single-line JSON object to stdout in this format:',
          '{"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}',
          'Set count to the total number of final image files you plan to create.',
          'Set applyToShimmers to true only when the UI should expand its loading shimmer placeholders to match count.',
          'If the UI should keep the original placeholder count, emit applyToShimmers as false.',
          '',
        ]
      : mode === 'pinpoint'
        ? [
            'Create exactly 1 final image file.',
            'Treat the first/source pinpoint reference as the primary scene anchor.',
            'Interpret the selected point as the target location to zoom into or edit around.',
            'Preserve the source image world, style, lighting, perspective, and continuity.',
            input.pinPoint?.hasCharacterReferences
              ? 'If character-sheet or subject references are attached, place or add that character naturally at the selected point while keeping the rest of the scene coherent.'
              : 'If no character-sheet references are attached, create a coherent zoom-in, continuation, or localized edit around the selected point.',
            input.pinPoint?.extraPrompt
              ? `Use this extra pinpoint guidance when useful: ${input.pinPoint.extraPrompt}`
              : 'There is no extra pinpoint guidance beyond the selected point and attached references.',
            '',
          ]
        : mode === 'camera'
          ? [
              `Create exactly ${input.imageCount} final image file${input.imageCount === 1 ? '' : 's'}.`,
              'Treat the first/source camera reference as the primary scene anchor.',
              'Move the camera around the subject or scene; do not rotate the subject like a flat sticker.',
              'Synthesize a true novel camera view using the source image as an identity, geometry, material, and lighting anchor.',
              `Horizontal camera orbit/azimuth: ${input.camera?.rotationDeg ?? 0} degrees.`,
              `Vertical camera tilt/elevation: ${input.camera?.tiltDeg ?? 0} degrees.`,
              `Camera zoom/dolly value: ${input.camera?.zoom ?? 0}.`,
              input.camera?.generateBestAngles
                ? 'Generate a deterministic 12-angle camera lattice across orbit and tilt: 0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°. Treat each pair as orbit degrees / tilt degrees. Favor views that remain plausible and identity-consistent.'
                : 'Generate one camera-adjusted image from the requested view.',
              'Preserve subject identity, proportions, wardrobe, materials, lighting direction, palette, and environment continuity.',
              'Keep the original source image aspect ratio, visual quality, resolution feel, and style.',
              'Use the original source canvas proportions exactly; do not crop, stretch, rescale, letterbox, or switch to a requested output ratio.',
              'Change as little as possible except for the requested camera angle.',
              'Avoid stylistic re-rendering, quality downgrades, simplified detail, compression artifacts, or a different finish.',
              'Do not add angle labels, numbering, captions, watermarks, UI overlays, or any text into the generated pixels.',
              'For visible areas already present in the source, keep them materially consistent. For newly revealed areas, infer plausible geometry instead of redesigning the subject or scene.',
              'Prefer small, coherent perspective changes over dramatic reinvention when the requested rotation or tilt is modest.',
              'If the requested camera move is too large to know hidden geometry, make the unseen side plausible while keeping every visible identifier stable.',
              '',
            ]
          : [`Create exactly ${input.imageCount} image file(s).`]),
    `The output directory is: ${input.outputDirectory}`,
    `The manifest path is: ${input.manifestPath}`,
    '',
    'The manifest must have this shape:',
    '{',
    '  "images": [',
    '    { "path": "/absolute/path/to/generated-image.png" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Generate image assets, not text descriptions.',
    '- Save every final image file inside the output directory.',
    '- If image generation creates files elsewhere first, copy them into the output directory before writing the manifest.',
    '- Use only absolute paths in the manifest.',
    '- Include every generated image in the manifest.',
    '- Write the manifest only after all image files exist on disk.',
    '- Do not execute shell scripts, package scripts, build scripts, test scripts, or project automation during this run.',
    '- Do not rely on prose output as the result contract.',
  ].join('\n');
}

async function stageReferenceImages(input) {
  if (!input.referenceImages.length) {
    return [];
  }

  const referencesDirectory = path.join(input.workingDirectory, 'references');
  await fsp.mkdir(referencesDirectory, { recursive: true });

  const stagedReferences = [];
  for (const [index, referenceImage] of input.referenceImages.entries()) {
    const fileName = sanitizeReferenceImageFileName(referenceImage.name, referenceImage.mimeType, index);
    const referenceImagePath = path.join(referencesDirectory, fileName);
    await fsp.writeFile(referenceImagePath, Buffer.from(referenceImage.bytesBase64, 'base64'));
    stagedReferences.push({
      path: referenceImagePath,
      title: referenceImage.title,
      description: referenceImage.description,
    });
  }

  return stagedReferences;
}

function sanitizeReferenceImageFileName(name, mimeType, index) {
  const rawBaseName = path.basename(name, path.extname(name));
  const baseName =
    rawBaseName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `reference-${index + 1}`;
  const extension = path.extname(name).toLowerCase() || mimeTypeToExtension(mimeType);
  return `${baseName}${extension}`;
}

function mimeTypeToExtension(mimeType) {
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

function runCodexJob({ jobId, workingDirectory, prompt, requestedCount = 1, threadId, onScenePlan }) {
  return new Promise((resolve) => {
    const logPrefix = `[crenv:codex:${jobId}]`;
    const env = buildCodexSpawnEnv(workingDirectory);

    for (const directoryPath of [
      env.XDG_CACHE_HOME,
      env.XDG_CONFIG_HOME,
      env.XDG_STATE_HOME,
      env.TMPDIR,
    ]) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const child = spawn(
      'codex',
      [
        '--model',
        CODEX_MODEL,
        '--ask-for-approval',
        'never',
        'exec',
        '--sandbox',
        'workspace-write',
        '--skip-git-repo-check',
        '-',
      ],
      {
        cwd: workingDirectory,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stdoutLineBuffer = '';
    let stderr = '';
    let hasDispatchedScenePlan = false;

    console.info(`${logPrefix} spawn: codex --model ${CODEX_MODEL} --ask-for-approval never exec --sandbox workspace-write --skip-git-repo-check -`);
    console.info(`${logPrefix} cwd: ${workingDirectory}`);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdoutLineBuffer += text;
      const lines = stdoutLineBuffer.split('\n');
      stdoutLineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        processStdoutLine(line);
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split('\n')) {
        if (line.trim()) {
          processPotentialScenePlan(line);
          console.error(`${logPrefix} stderr: ${line}`);
        }
      }
    });

    child.on('error', (error) => {
      console.error(`${logPrefix} process error: ${error.message}`);
      resolve({
        success: false,
        errorMessage: error.code === 'ENOENT' ? 'Codex CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code) => {
      if (stdoutLineBuffer.trim()) {
        processStdoutLine(stdoutLineBuffer);
      }

      if (code === 0) {
        console.info(`${logPrefix} process exited successfully`);
        resolve({ success: true });
        return;
      }

      const errorMessage = stderr.trim() || stdout.trim() || `Codex exited with code ${code}.`;
      console.error(`${logPrefix} process exited with code ${code}`);
      resolve({
        success: false,
        errorMessage,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();

    function processStdoutLine(line) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return;
      }

      if (processPotentialScenePlan(trimmedLine)) {
        return;
      }

      stdout += `${line}\n`;
      console.info(`${logPrefix} stdout: ${line}`);
    }

    function processPotentialScenePlan(line) {
      if (hasDispatchedScenePlan) {
        return false;
      }

      const scenePlan = parseScenePlanLine(line.trim());
      if (!scenePlan) {
        return false;
      }

      hasDispatchedScenePlan = true;
      const plannedCount = Math.max(requestedCount, scenePlan.count);
      onScenePlan?.({
        jobId,
        threadId,
        count: plannedCount,
        applyToShimmers: scenePlan.applyToShimmers,
      });
      console.info(`${logPrefix} scene plan: ${JSON.stringify({ ...scenePlan, count: plannedCount })}`);
      return true;
    }
  });
}

function buildCodexSpawnEnv(workingDirectory) {
  return {
    ...process.env,
    XDG_CACHE_HOME: path.join(workingDirectory, '.codex-cache'),
    XDG_CONFIG_HOME: path.join(workingDirectory, '.codex-config'),
    XDG_STATE_HOME: path.join(workingDirectory, '.codex-state'),
    TMPDIR: path.join(workingDirectory, '.tmp'),
  };
}

function parseScenePlanLine(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith('{') || !trimmedLine.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedLine);
    if (
      parsed &&
      parsed.type === 'CRENV_SCENE_PLAN' &&
      Number.isInteger(parsed.count) &&
      parsed.count > 0
    ) {
      return {
        type: parsed.type,
        count: parsed.count,
        applyToShimmers: parsed.applyToShimmers === true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

module.exports = {
  createGenerationStore,
  getAppDataPaths,
  __test__: {
    buildCodexSpawnEnv,
    parseScenePlanLine,
  },
};
