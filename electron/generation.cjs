const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

const { nanoid } = require('nanoid');
const { createClient } = require('@libsql/client/node');
const { and, desc, eq, inArray, sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/libsql');
const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const DEFAULT_PROJECT_NAME = 'Documents';
const DEFAULT_THREAD_NAME = 'New Thread';
const MANUAL_PROJECT_NAME = 'New Project';
const DEFAULT_GENERATION_PROVIDER = 'codex';
const DEFAULT_CODEX_MODEL_ID = 'codex-gpt-5-4-mini';
const DEFAULT_ANTIGRAVITY_MODEL_ID = 'antigravity-gemini-3-5-flash-low';

const CODEX_MODEL_BY_ID = {
  'codex-gpt-5-4-mini': 'gpt-5.4-mini',
  'codex-gpt-5-4': 'gpt-5.4',
  'codex-gpt-5-5': 'gpt-5.5',
  'codex-gpt-5-3-codex': 'gpt-5.3-codex',
  'codex-gpt-5-2-codex': 'gpt-5.2-codex',
};

const MODEL_LABEL_BY_ID = {
  'codex-gpt-5-4-mini': 'GPT-5.4 Mini',
  'codex-gpt-5-4': 'GPT-5.4',
  'codex-gpt-5-5': 'GPT-5.5',
  'codex-gpt-5-3-codex': 'GPT-5.3 Codex',
  'codex-gpt-5-2-codex': 'GPT-5.2 Codex',
  'antigravity-gemini-3-5-flash-low': 'Gemini 3.5 Flash (Low)',
  'antigravity-gemini-3-5-flash': 'Gemini 3.5 Flash',
  'antigravity-claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'antigravity-claude-opus-4-6': 'Claude Opus 4.6',
  'antigravity-gpt-oss-120b': 'GPT-OSS-120b',
};

const ANTIGRAVITY_MODEL_BY_ID = {
  'antigravity-gemini-3-5-flash-low': 'Gemini 3.5 Flash (Low)',
  'antigravity-gemini-3-5-flash': 'Gemini 3.5 Flash',
  'antigravity-claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'antigravity-claude-opus-4-6': 'Claude Opus 4.6',
  'antigravity-gpt-oss-120b': 'GPT-OSS-120b',
};

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
  provider: text('provider'),
  modelId: text('model_id'),
  modelLabel: text('model_label'),
  referenceImagesJson: text('reference_images_json'),
  durationMs: integer('duration_ms'),
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

const characterReferencesTable = sqliteTable('character_references', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  createdAt: text('created_at').notNull(),
});

const objectReferencesTable = sqliteTable('object_references', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  createdAt: text('created_at').notNull(),
});

const environmentReferencesTable = sqliteTable('environment_references', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const environmentReferenceAttachmentsTable = sqliteTable('environment_reference_attachments', {
  id: text('id').primaryKey(),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environmentReferencesTable.id),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
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
    provider TEXT,
    model_id TEXT,
    model_label TEXT,
    reference_images_json TEXT,
    duration_ms INTEGER,
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

const CREATE_CHARACTER_REFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS character_references (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const CREATE_OBJECT_REFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS object_references (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`;

const CREATE_ENVIRONMENT_REFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS environment_references (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_ENVIRONMENT_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS environment_reference_attachments (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (environment_id) REFERENCES environment_references(id)
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

function resolveGenerationSelection(provider, modelId) {
  if (ANTIGRAVITY_MODEL_BY_ID[modelId]) {
    return {
      provider: 'antigravity',
      modelId,
      modelLabel: MODEL_LABEL_BY_ID[modelId],
      codexModel: null,
      antigravityModel: ANTIGRAVITY_MODEL_BY_ID[modelId],
    };
  }

  if (CODEX_MODEL_BY_ID[modelId]) {
    return {
      provider: DEFAULT_GENERATION_PROVIDER,
      modelId,
      modelLabel: MODEL_LABEL_BY_ID[modelId],
      codexModel: CODEX_MODEL_BY_ID[modelId],
      antigravityModel: null,
    };
  }

  if (provider === 'antigravity') {
    const resolvedModelId = ANTIGRAVITY_MODEL_BY_ID[modelId] ? modelId : DEFAULT_ANTIGRAVITY_MODEL_ID;
    return {
      provider: 'antigravity',
      modelId: resolvedModelId,
      modelLabel: MODEL_LABEL_BY_ID[resolvedModelId],
      codexModel: null,
      antigravityModel: ANTIGRAVITY_MODEL_BY_ID[resolvedModelId],
    };
  }

  const resolvedModelId = CODEX_MODEL_BY_ID[modelId] ? modelId : DEFAULT_CODEX_MODEL_ID;
  return {
    provider: DEFAULT_GENERATION_PROVIDER,
    modelId: resolvedModelId,
    modelLabel: MODEL_LABEL_BY_ID[resolvedModelId],
    codexModel: CODEX_MODEL_BY_ID[resolvedModelId],
    antigravityModel: null,
  };
}

function resolveJobWorkingDirectory({ provider, jobId, codexJobsTempDir }) {
  if (provider === 'antigravity') {
    return path.join('/tmp', 'crenv-antigravity-jobs', jobId);
  }

  return path.join(codexJobsTempDir, jobId);
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
  await db.run(sql.raw(CREATE_CHARACTER_REFERENCES_TABLE_SQL));
  await db.run(sql.raw(CREATE_OBJECT_REFERENCES_TABLE_SQL));
  await db.run(sql.raw(CREATE_ENVIRONMENT_REFERENCES_TABLE_SQL));
  await db.run(sql.raw(CREATE_ENVIRONMENT_REFERENCE_ATTACHMENTS_TABLE_SQL));
  await migrateLegacyReferencesTable(db);
  await ensureEnvironmentAttachmentDescriptionColumn(db);
  await ensureProjectSettingsColumns(db);
  await ensureGenerationJobsThreadColumn(db);
  await ensureGenerationJobMetadataColumns(db);

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
    const category = payload.category === 'objects' ? 'objects' : 'characters';
    const reference = {
      id: nanoid(),
      name: payload.name,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      mimeType: payload.mimeType || 'image/png',
      bytesBase64: payload.bytesBase64,
      createdAt: timestamp,
      category,
      environmentId: null,
    };

    if (category === 'objects') {
      await db.insert(objectReferencesTable).values({
        id: reference.id,
        name: reference.name,
        title: reference.title,
        description: reference.description,
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
        createdAt: reference.createdAt,
      });
      return reference;
    }

    await db.insert(characterReferencesTable).values({
      id: reference.id,
      name: reference.name,
      title: reference.title,
      description: reference.description,
      mimeType: reference.mimeType,
      bytesBase64: reference.bytesBase64,
      createdAt: reference.createdAt,
    });
    return reference;
  }

  async function createEnvironmentReference(payload) {
    if (!Array.isArray(payload.attachments) || payload.attachments.length === 0) {
      return [];
    }
    const timestamp = new Date().toISOString();
    const environmentId = nanoid();
    await db.insert(environmentReferencesTable).values({
      id: environmentId,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      createdAt: timestamp,
    });

    const attachments = payload.attachments.map((attachment) => ({
      id: nanoid(),
      environmentId,
      name: attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      createdAt: timestamp,
    }));
    if (attachments.length > 0) {
      await db.insert(environmentReferenceAttachmentsTable).values(attachments);
    }

    return attachments.map((attachment) => ({
      id: attachment.id,
      environmentId,
      name: attachment.name,
      title: payload.title.trim(),
      description: attachment.description?.trim() || payload.description?.trim() || null,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: attachment.createdAt,
      category: 'environment',
    }));
  }

  async function updateReference(payload) {
    const title = payload.title.trim();
    const description = payload.description?.trim() || null;

    if (payload.category === 'environment') {
      const environmentId = payload.environmentId;
      if (!environmentId) {
        throw new Error('Environment reference update requires environmentId.');
      }
      await db
        .update(environmentReferencesTable)
        .set({
          title,
          description,
        })
        .where(eq(environmentReferencesTable.id, environmentId));

      const [firstAttachment] = await db
        .select()
        .from(environmentReferenceAttachmentsTable)
        .where(eq(environmentReferenceAttachmentsTable.environmentId, environmentId))
        .orderBy(environmentReferenceAttachmentsTable.createdAt, environmentReferenceAttachmentsTable.id)
        .limit(1);
      if (!firstAttachment) {
        throw new Error('Environment attachment not found.');
      }
      return {
        id: firstAttachment.id,
        environmentId,
        name: firstAttachment.name,
        title,
        description,
        mimeType: firstAttachment.mimeType,
        bytesBase64: firstAttachment.bytesBase64,
        createdAt: firstAttachment.createdAt,
        category: 'environment',
      };
    }

    const table = payload.category === 'objects' ? objectReferencesTable : characterReferencesTable;
    await db
      .update(table)
      .set({
        title,
        description,
      })
      .where(eq(table.id, payload.id));

    const [updated] = await db.select().from(table).where(eq(table.id, payload.id)).limit(1);
    if (!updated) {
      throw new Error('Reference not found.');
    }
    return {
      ...updated,
      category: payload.category,
      environmentId: null,
    };
  }

  async function updateEnvironmentReference(payload) {
    const title = payload.title.trim();
    const description = payload.description?.trim() || null;
    const environmentId = payload.environmentId;

    await db
      .update(environmentReferencesTable)
      .set({
        title,
        description,
      })
      .where(eq(environmentReferencesTable.id, environmentId));

    await db
      .delete(environmentReferenceAttachmentsTable)
      .where(eq(environmentReferenceAttachmentsTable.environmentId, environmentId));

    const timestamp = new Date().toISOString();
    const attachments = (payload.attachments ?? []).map((attachment) => ({
      id: attachment.id ?? nanoid(),
      environmentId,
      name: attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      createdAt: timestamp,
    }));

    if (attachments.length > 0) {
      await db.insert(environmentReferenceAttachmentsTable).values(attachments);
    }

    return attachments.map((attachment) => ({
      id: attachment.id,
      environmentId,
      name: attachment.name,
      title,
      description: attachment.description ?? description,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: attachment.createdAt,
      category: 'environment',
    }));
  }

  async function deleteReference(payload) {
    if (payload.category === 'environment') {
      const environmentId = payload.environmentId;
      if (!environmentId) {
        throw new Error('Environment reference delete requires environmentId.');
      }
      await db
        .delete(environmentReferenceAttachmentsTable)
        .where(eq(environmentReferenceAttachmentsTable.environmentId, environmentId));
      await db
        .delete(environmentReferencesTable)
        .where(eq(environmentReferencesTable.id, environmentId));
      return;
    }

    const table = payload.category === 'objects' ? objectReferencesTable : characterReferencesTable;
    await db.delete(table).where(eq(table.id, payload.id));
  }

  async function listReferences() {
    const [characters, objects, environments] = await Promise.all([
      db
        .select()
        .from(characterReferencesTable)
        .orderBy(desc(characterReferencesTable.createdAt), desc(characterReferencesTable.id)),
      db
        .select()
        .from(objectReferencesTable)
        .orderBy(desc(objectReferencesTable.createdAt), desc(objectReferencesTable.id)),
      db
        .select({
          id: environmentReferenceAttachmentsTable.id,
          environmentId: environmentReferenceAttachmentsTable.environmentId,
          name: environmentReferenceAttachmentsTable.name,
          title: environmentReferencesTable.title,
          environmentDescription: environmentReferencesTable.description,
          description: environmentReferenceAttachmentsTable.description,
          mimeType: environmentReferenceAttachmentsTable.mimeType,
          bytesBase64: environmentReferenceAttachmentsTable.bytesBase64,
          createdAt: environmentReferenceAttachmentsTable.createdAt,
        })
        .from(environmentReferenceAttachmentsTable)
        .innerJoin(
          environmentReferencesTable,
          eq(environmentReferenceAttachmentsTable.environmentId, environmentReferencesTable.id)
        )
        .orderBy(desc(environmentReferenceAttachmentsTable.createdAt), desc(environmentReferenceAttachmentsTable.id)),
    ]);

    const allReferences = [
      ...characters.map((reference) => ({ ...reference, category: 'characters', environmentId: null })),
      ...objects.map((reference) => ({ ...reference, category: 'objects', environmentId: null })),
      ...environments.map((reference) => ({
        ...reference,
        category: 'environment',
        description: reference.description ?? reference.environmentDescription ?? null,
      })),
    ];

    allReferences.sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return b.id.localeCompare(a.id);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return allReferences;
  }

  async function generateImages({
    prompt,
    count,
    threadId,
    mode = 'manual',
    referenceImages = [],
    pinPoint,
    camera,
    fastMode = false,
    clientRunId = null,
    provider = DEFAULT_GENERATION_PROVIDER,
    modelId = null,
  }) {
    const jobId = nanoid();
    const startedAtMs = Date.now();
    const timestamp = new Date(startedAtMs).toISOString();
    const selection = resolveGenerationSelection(provider, modelId);
    const workingDirectory = resolveJobWorkingDirectory({
      provider: selection.provider,
      jobId,
      codexJobsTempDir: paths.codexJobsTempDir,
    });
    const outputDirectory = path.join(workingDirectory, 'output');
    const manifestPath = path.join(workingDirectory, 'manifest.json');
    const logPrefix = `[crenv:${selection.provider}:${jobId}]`;
    const referenceImagesJson = JSON.stringify(toGenerationReferenceMetadata(referenceImages));
    const stagedReferenceImages = await stageReferenceImages({
      workingDirectory,
      referenceImages,
    });

    await fsp.mkdir(outputDirectory, { recursive: true });

    console.info(`${logPrefix} starting image generation`);
    console.info(`${logPrefix} workingDirectory: ${workingDirectory}`);
    console.info(`${logPrefix} outputDirectory: ${outputDirectory}`);
    console.info(`${logPrefix} manifestPath: ${manifestPath}`);
    console.info(`${logPrefix} requestedCount: ${count}`);
    console.info(`${logPrefix} threadId: ${threadId}`);
    console.info(`${logPrefix} modelId: ${selection.modelId}`);

    await upsertJob({
      id: jobId,
      threadId,
      prompt,
      requestedCount: count,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      provider: selection.provider,
      modelId: selection.modelId,
      modelLabel: selection.modelLabel,
      referenceImagesJson,
      durationMs: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    try {
      const providerPromptInput = {
        mode,
        userPrompt: prompt,
        outputDirectory,
        manifestPath,
        imageCount: count,
        referenceImages: stagedReferenceImages,
        pinPoint,
        camera,
      };
      const result =
        selection.provider === 'antigravity'
          ? await runAntigravityJob({
              jobId,
              clientRunId,
              workingDirectory,
              prompt: buildAntigravityImageGenerationPrompt({
                ...providerPromptInput,
                antigravityModel: selection.antigravityModel,
              }),
              requestedCount: count,
              threadId,
              model: selection.antigravityModel,
              onScenePlan: options.onScenePlan,
            })
          : await runCodexJob({
              jobId,
              clientRunId,
              workingDirectory,
              prompt: buildCodexImageGenerationPrompt(providerPromptInput),
              requestedCount: count,
              threadId,
              fastMode,
              model: selection.codexModel,
              onScenePlan: options.onScenePlan,
            });

      if (!result.success) {
        console.error(`${logPrefix} generation failed`);
        throw new Error(result.errorMessage);
      }

      let manifest = result.manifest ?? null;
      if (manifest) {
        await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      } else {
        await fsp.access(manifestPath);
        manifest = parseGenerationManifest(await fsp.readFile(manifestPath, 'utf8'));
      }
      console.info(`${logPrefix} manifest contains ${manifest.images.length} image(s)`);
      const assetRecords = [];

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
        assetRecords.push(assetRecord);
        console.info(`${logPrefix} imported asset: ${imported.storedPath}`);
      }

      const durationMs = Date.now() - startedAtMs;
      await upsertJob({
        id: jobId,
        threadId,
        prompt,
        requestedCount: count,
        status: 'succeeded',
        workingDirectory,
        manifestPath,
        errorMessage: null,
        provider: selection.provider,
        modelId: selection.modelId,
        modelLabel: selection.modelLabel,
        referenceImagesJson,
        durationMs,
        createdAt: timestamp,
        updatedAt: new Date().toISOString(),
      });

      console.info(`${logPrefix} generation succeeded`);

      return {
        jobId,
        assets: assetRecords.map((assetRecord) =>
          toRendererAsset({
            ...assetRecord,
            prompt,
            provider: selection.provider,
            modelId: selection.modelId,
            modelLabel: selection.modelLabel,
            referenceImagesJson,
            durationMs,
          })
        ),
      };
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
        provider: selection.provider,
        modelId: selection.modelId,
        modelLabel: selection.modelLabel,
        referenceImagesJson,
        durationMs: Date.now() - startedAtMs,
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
        prompt: generationJobsTable.prompt,
        provider: generationJobsTable.provider,
        modelId: generationJobsTable.modelId,
        modelLabel: generationJobsTable.modelLabel,
        referenceImagesJson: generationJobsTable.referenceImagesJson,
        durationMs: generationJobsTable.durationMs,
      })
      .from(generatedAssetsTable)
      .innerJoin(generationJobsTable, eq(generatedAssetsTable.jobId, generationJobsTable.id))
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
    createEnvironmentReference,
    updateReference,
    updateEnvironmentReference,
    deleteReference,
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
          provider: job.provider,
          modelId: job.modelId,
          modelLabel: job.modelLabel,
          referenceImagesJson: job.referenceImagesJson,
          durationMs: job.durationMs,
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

async function ensureGenerationJobMetadataColumns(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('generation_jobs')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('provider')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN provider TEXT'));
  }

  if (!columnNames.has('model_id')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN model_id TEXT'));
  }

  if (!columnNames.has('model_label')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN model_label TEXT'));
  }

  if (!columnNames.has('reference_images_json')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN reference_images_json TEXT'));
  }

  if (!columnNames.has('duration_ms')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN duration_ms INTEGER'));
  }
}

async function ensureEnvironmentAttachmentDescriptionColumn(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('environment_reference_attachments')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));
  if (!columnNames.has('description')) {
    await db.run(sql.raw('ALTER TABLE environment_reference_attachments ADD COLUMN description TEXT'));
  }
}

async function migrateLegacyReferencesTable(db) {
  const tables = await db.all(sql.raw("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reference_images'"));
  if (tables.length === 0) {
    return;
  }

  const legacyReferences = await db.all(
    sql.raw(
      `SELECT id, name, title, description, mime_type AS mimeType, bytes_base64 AS bytesBase64, created_at AS createdAt
       FROM reference_images`
    )
  );

  if (legacyReferences.length === 0) {
    return;
  }

  for (const reference of legacyReferences) {
    await db
      .insert(characterReferencesTable)
      .values(reference)
      .onConflictDoNothing();
  }
}

function toRendererAsset(asset) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileUrl: `crenv-asset://generated?path=${encodeURIComponent(asset.storedPath)}`,
    createdAt: asset.createdAt,
    provider: asset.provider ?? null,
    modelId: asset.modelId ?? null,
    modelLabel: asset.modelLabel ?? null,
    prompt: asset.prompt ?? null,
    references: parseGenerationReferenceMetadata(asset.referenceImagesJson),
    durationMs: asset.durationMs ?? null,
  };
}

function toGenerationReferenceMetadata(referenceImages) {
  return referenceImages.map((referenceImage) => ({
    name: referenceImage.name,
    title: referenceImage.title ?? null,
    description: referenceImage.description ?? null,
    mimeType: referenceImage.mimeType,
  }));
}

function parseGenerationReferenceMetadata(referenceImagesJson) {
  if (!referenceImagesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(referenceImagesJson);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((referenceImage) => referenceImage && typeof referenceImage.name === 'string')
      .map((referenceImage) => ({
        name: referenceImage.name,
        title: typeof referenceImage.title === 'string' ? referenceImage.title : null,
        description: typeof referenceImage.description === 'string' ? referenceImage.description : null,
        mimeType: typeof referenceImage.mimeType === 'string' ? referenceImage.mimeType : 'image/png',
      }));
  } catch {
    return [];
  }
}

function buildProviderImageGenerationPrompt(input, providerLabel, capabilityInstruction) {
  const mode = input.mode ?? 'manual';

  return [
    `You are running inside a ${providerLabel} batch job for an Electron app.`,
    capabilityInstruction,
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
              'Interpret rotation, tilt, and zoom as a physical 3D camera move around the scene, producing new perspective, parallax, occlusion, and visible side geometry.',
              'Synthesize a true novel camera view using the source image as an identity, geometry, material, and lighting anchor.',
              `Horizontal camera orbit/azimuth: ${input.camera?.rotationDeg ?? 0} degrees.`,
              `Vertical camera tilt/elevation: ${input.camera?.tiltDeg ?? 0} degrees.`,
              `Camera zoom/dolly value: ${input.camera?.zoom ?? 0}.`,
              'Treat zoom as camera dolly or field-of-view change, not as a flat crop or resize of the original pixels.',
              input.camera?.generateBestAngles
                ? 'Generate a deterministic 12-angle camera lattice across orbit and tilt: 0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°. Treat each pair as orbit degrees / tilt degrees. Favor views that remain plausible and identity-consistent.'
                : 'Generate one camera-adjusted image from the requested view.',
              'Preserve subject identity, proportions, wardrobe, materials, lighting direction, palette, and environment continuity.',
              'Keep the original source image aspect ratio, visual quality, resolution feel, and style.',
              'Use the original source canvas proportions exactly; do not crop, stretch, rescale, letterbox, or switch to a requested output ratio.',
              'Keep composition and framing as close as possible while changing only the requested camera perspective.',
              'Do not satisfy the request by cropping, panning a flat image, warping the canvas, or simply tilting the existing picture plane.',
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

function buildCodexImageGenerationPrompt(input) {
  return buildProviderImageGenerationPrompt(
    input,
    'Codex',
    'Use Codex image generation capabilities to create image files for the following prompt.'
  );
}

function buildAntigravityImageGenerationPrompt(input) {
  const mode = input.mode ?? 'manual';
  const selectedModel =
    input.antigravityModel ?? ANTIGRAVITY_MODEL_BY_ID[DEFAULT_ANTIGRAVITY_MODEL_ID];

  return [
    'You are running inside an Antigravity CLI print-mode batch job for an Electron app.',
    'Use Antigravity\'s built-in image generation workflow to create raster image assets.',
    'Use Nano Banana Pro for image generation.',
    'Do not do software-engineering work, do not inspect unrelated project files, and do not edit code.',
    `Selected Antigravity reasoning model: ${selectedModel}`,
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
          'Use only the listed reference image files as visual guidance when relevant.',
          'Prefer the most relevant references for subject identity, composition, and style. Ignore unrelated references.',
          '',
        ]
      : []),
    ...(mode === 'scene'
      ? [
          `Create at least ${input.imageCount} final image file(s); never create fewer.`,
          'If useful, create a canonical anchor image first and derive the remaining scene coverage from it.',
          'Preserve scene continuity when references or the prompt define a stable environment.',
          'If you decide to expand the visible output count, print one single-line JSON scene-plan object first in this exact format:',
          '{"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}',
          '',
        ]
      : mode === 'pinpoint'
        ? [
            'Create exactly 1 final image file.',
            'Treat the first pinpoint reference as the source scene anchor.',
            'Focus on the selected point while preserving the surrounding scene continuity.',
            input.pinPoint?.hasCharacterReferences
              ? 'If character references are attached, place or add that character naturally at the selected point.'
              : 'If no character references are attached, create a coherent zoom-in or localized continuation around the selected point.',
            input.pinPoint?.extraPrompt
              ? `Extra pinpoint guidance: ${input.pinPoint.extraPrompt}`
              : null,
            '',
          ].filter(Boolean)
        : mode === 'camera'
          ? [
              `Create exactly ${input.imageCount} final image file${input.imageCount === 1 ? '' : 's'}.`,
              'Treat the first camera reference as the primary scene anchor.',
              'Move the camera around the subject or scene; do not rotate the subject like a flat sticker.',
              'Interpret rotation, tilt, and zoom as a physical 3D camera move around the scene, producing new perspective, parallax, occlusion, and visible side geometry.',
              `Horizontal orbit: ${input.camera?.rotationDeg ?? 0} degrees.`,
              `Vertical tilt: ${input.camera?.tiltDeg ?? 0} degrees.`,
              `Zoom/dolly value: ${input.camera?.zoom ?? 0}.`,
              'Treat zoom as camera dolly or field-of-view change, not as a flat crop or resize of the original pixels.',
              input.camera?.generateBestAngles
                ? 'Generate the requested best-angle lattice while keeping identity and materials stable.'
                : 'Generate one camera-adjusted image from the requested view.',
              'Preserve identity, materials, lighting direction, palette, and continuity.',
              'Keep composition and framing as close as possible while changing only the requested camera perspective.',
              'Do not satisfy the request by cropping, panning a flat image, warping the canvas, or simply tilting the existing picture plane.',
              '',
            ]
          : [`Create exactly ${input.imageCount} final image file${input.imageCount === 1 ? '' : 's'}.`, '']),
    `Save every final image file inside this output directory: ${input.outputDirectory}`,
    '',
    'After all image files exist on disk, print exactly one single-line JSON object to stdout in this shape and nothing else:',
    '{"images":[{"path":"/absolute/path/to/generated-image.png"}]}',
    '',
    'Rules:',
    '- Use only absolute paths in the JSON output.',
    '- Include every generated image in the JSON output.',
    '- Generate image assets, not prose descriptions.',
    '- Do not read or modify unrelated files.',
    '- Do not execute shell scripts, package scripts, build scripts, tests, or project automation.',
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

function buildCodexExecArgs({ model = CODEX_MODEL_BY_ID[DEFAULT_CODEX_MODEL_ID], fastMode = false } = {}) {
  const args = ['--model', model, '--ask-for-approval', 'never'];

  if (fastMode) {
    args.push('-c', 'service_tier="fast"');
  }

  args.push('exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', '-');

  return args;
}

function buildAntigravityExecArgs({ logFilePath } = {}) {
  const args = ['--dangerously-skip-permissions', '--print-timeout', '5m', '--print'];

  if (logFilePath) {
    args.splice(3, 0, '--log-file', logFilePath);
  }

  return args;
}

async function prepareAntigravityHomeDirectory({ workingDirectory, model }) {
  const actualHomeDirectory = process.env.HOME;
  const homeDirectory = path.join(workingDirectory, '.antigravity-home');
  const targetCliDirectory = path.join(homeDirectory, '.gemini', 'antigravity-cli');
  const targetConfigDirectory = path.join(homeDirectory, '.gemini', 'config');
  const targetProjectsDirectory = path.join(targetConfigDirectory, 'projects');
  const projectMarkerDirectory = path.join(workingDirectory, '.antigravitycli');
  const projectId = randomUUID();
  const projectPath = path.join(targetProjectsDirectory, `${projectId}.json`);
  const projectMarkerPath = path.join(projectMarkerDirectory, `${projectId}.json`);
  const logFilePath = path.join(workingDirectory, 'antigravity-cli.log');

  await fsp.mkdir(targetCliDirectory, { recursive: true });
  await fsp.mkdir(targetConfigDirectory, { recursive: true });
  await fsp.mkdir(targetProjectsDirectory, { recursive: true });
  await fsp.mkdir(projectMarkerDirectory, { recursive: true });

  let sourceSettings = {};
  if (actualHomeDirectory) {
    const sourceCliDirectory = path.join(actualHomeDirectory, '.gemini', 'antigravity-cli');
    const sourceSettingsPath = path.join(sourceCliDirectory, 'settings.json');

    try {
      sourceSettings = JSON.parse(await fsp.readFile(sourceSettingsPath, 'utf8'));
    } catch {
      sourceSettings = {};
    }

    for (const fileName of ['antigravity-oauth-token', 'installation_id', 'keybindings.json']) {
      const sourcePath = path.join(sourceCliDirectory, fileName);
      const targetPath = path.join(targetCliDirectory, fileName);
      try {
        await fsp.copyFile(sourcePath, targetPath);
      } catch {
        // Best-effort copy only. Missing files should not block the runner.
      }
    }
  }

  const sanitizedSettings = {
    colorScheme:
      typeof sourceSettings.colorScheme === 'string' ? sourceSettings.colorScheme : undefined,
    enableTelemetry:
      typeof sourceSettings.enableTelemetry === 'boolean' ? sourceSettings.enableTelemetry : false,
    model,
    trustedWorkspaces: [],
  };

  await fsp.writeFile(
    path.join(targetCliDirectory, 'settings.json'),
    JSON.stringify(sanitizedSettings, null, 2)
  );
  await fsp.writeFile(path.join(targetConfigDirectory, 'mcp_config.json'), '{}');
  await fsp.writeFile(
    projectPath,
    JSON.stringify(
      {
        id: projectId,
        name: workingDirectory,
        projectResources: {
          resources: [
            {
              gitFolder: {
                folderUri: pathToFileURL(workingDirectory).href,
                allowWrite: true,
              },
            },
          ],
        },
      },
      null,
      2
    )
  );

  try {
    await fsp.symlink(projectPath, projectMarkerPath);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  return {
    homeDirectory,
    logFilePath,
    projectId,
  };
}

function runCodexJob({ jobId, clientRunId, workingDirectory, prompt, requestedCount = 1, threadId, fastMode = false, model, onScenePlan }) {
  return new Promise((resolve) => {
    const logPrefix = `[crenv:codex:${jobId}]`;
    const env = buildCodexSpawnEnv(workingDirectory);
    const codexArgs = buildCodexExecArgs({ model, fastMode });

    for (const directoryPath of [
      env.XDG_CACHE_HOME,
      env.XDG_CONFIG_HOME,
      env.XDG_STATE_HOME,
      env.TMPDIR,
    ]) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const child = spawn('codex', codexArgs, {
      cwd: workingDirectory,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stdoutLineBuffer = '';
    let stderr = '';
    let hasDispatchedScenePlan = false;

    console.info(`${logPrefix} spawn: codex ${codexArgs.join(' ')}`);
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
        clientRunId,
        threadId,
        count: plannedCount,
        applyToShimmers: scenePlan.applyToShimmers,
      });
      console.info(`${logPrefix} scene plan: ${JSON.stringify({ ...scenePlan, count: plannedCount })}`);
      return true;
    }
  });
}

async function runAntigravityJob({
  jobId,
  clientRunId,
  workingDirectory,
  prompt,
  requestedCount = 1,
  threadId,
  model,
  onScenePlan,
}) {
  const profile = await prepareAntigravityHomeDirectory({
    workingDirectory,
    model,
  });

  return new Promise((resolve) => {
    const logPrefix = `[crenv:antigravity:${jobId}]`;
    const env = buildAntigravitySpawnEnv(workingDirectory, profile.homeDirectory);
    const antigravityArgs = [...buildAntigravityExecArgs({ logFilePath: profile.logFilePath }), prompt];

    for (const directoryPath of [
      env.XDG_CACHE_HOME,
      env.XDG_CONFIG_HOME,
      env.XDG_STATE_HOME,
      env.XDG_DATA_HOME,
      env.TMPDIR,
    ]) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const stopLogTail = followAntigravityLogFile(profile.logFilePath, logPrefix);
    const child = spawn('agy', antigravityArgs, {
      cwd: workingDirectory,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stdoutLineBuffer = '';
    let stderr = '';
    let hasDispatchedScenePlan = false;
    let manifest = null;

    console.info(`${logPrefix} spawn: agy ${antigravityArgs.slice(0, -1).join(' ')}`);
    console.info(`${logPrefix} cwd: ${workingDirectory}`);
    console.info(`${logPrefix} logFile: ${profile.logFilePath}`);
    console.info(`${logPrefix} projectId: ${profile.projectId}`);
    console.info(`${logPrefix} selected reasoning model: ${model}`);

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
      stopLogTail();
      console.error(`${logPrefix} process error: ${error.message}`);
      resolve({
        success: false,
        errorMessage: error.code === 'ENOENT' ? 'Antigravity CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code) => {
      stopLogTail();
      if (stdoutLineBuffer.trim()) {
        processStdoutLine(stdoutLineBuffer);
      }

      const result = resolveAntigravityCloseResult({ code, manifest, stdout, stderr });

      if (result.success) {
        console.info(`${logPrefix} process exited successfully`);
        resolve(result);
        return;
      }

      console.error(`${logPrefix} process exited with code ${code}`);
      resolve(result);
    });

    function processStdoutLine(line) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return;
      }

      if (processPotentialScenePlan(trimmedLine)) {
        return;
      }

      const manifestLine = parseImageManifestLine(trimmedLine);
      if (manifestLine) {
        manifest = manifestLine;
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
        clientRunId,
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

function buildAntigravitySpawnEnv(workingDirectory, homeDirectory) {
  return {
    ...process.env,
    HOME: homeDirectory,
    XDG_CACHE_HOME: path.join(workingDirectory, '.antigravity-cache'),
    XDG_CONFIG_HOME: path.join(workingDirectory, '.antigravity-config'),
    XDG_STATE_HOME: path.join(workingDirectory, '.antigravity-state'),
    XDG_DATA_HOME: path.join(workingDirectory, '.antigravity-data'),
    TMPDIR: path.join(workingDirectory, '.tmp'),
  };
}

function followAntigravityLogFile(logFilePath, logPrefix) {
  let offset = 0;
  let stopped = false;
  let lineBuffer = '';

  function readAvailableLogLines() {
    try {
      const stat = fs.statSync(logFilePath);
      if (stat.size <= offset) {
        return;
      }

      const fd = fs.openSync(logFilePath, 'r');
      try {
        const buffer = Buffer.alloc(stat.size - offset);
        fs.readSync(fd, buffer, 0, buffer.length, offset);
        offset = stat.size;
        lineBuffer += buffer.toString('utf8');
      } finally {
        fs.closeSync(fd);
      }

      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        logAntigravityInternalLine(logPrefix, line);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`${logPrefix} agy-log-tail error: ${error.message}`);
      }
    }
  }

  const interval = setInterval(() => {
    if (stopped) {
      return;
    }

    readAvailableLogLines();
  }, 1000);

  return () => {
    stopped = true;
    clearInterval(interval);
    readAvailableLogLines();
    if (lineBuffer.trim()) {
      logAntigravityInternalLine(logPrefix, lineBuffer);
    }
  };
}

function logAntigravityInternalLine(logPrefix, line) {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return;
  }

  if (!shouldPrintAntigravityInternalLine(trimmedLine)) {
    return;
  }

  console.info(`${logPrefix} agy-log: ${trimmedLine}`);
}

function shouldPrintAntigravityInternalLine(line) {
  return /Print mode|project:|Propagating selected model|OAuth: authenticated|Tool confirmation|checkpoint model generated tool calls|failed to read project file|PlannerResponse without ModifiedResponse|text_drip|timed out|Stream completed|CLI store manager shutting down/.test(
    line
  );
}

function resolveAntigravityCloseResult({ code, manifest, stdout, stderr }) {
  const stdoutText = stdout.trim();
  const stderrText = stderr.trim();
  const errorText = stderrText || stdoutText;

  if (code !== 0) {
    return {
      success: false,
      errorMessage: errorText || `Antigravity exited with code ${code}.`,
    };
  }

  if (manifest) {
    return {
      success: true,
      manifest,
    };
  }

  if (/timed out waiting for response|Error:/i.test(stdoutText)) {
    return {
      success: false,
      errorMessage: stdoutText,
    };
  }

  return {
    success: false,
    errorMessage:
      errorText ||
      'Antigravity exited successfully without printing the expected image manifest.',
  };
}

function parseImageManifestLine(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith('{') || !trimmedLine.endsWith('}')) {
    return null;
  }

  try {
    return parseGenerationManifest(trimmedLine);
  } catch {
    return null;
  }
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
    buildAntigravityExecArgs,
    buildAntigravityImageGenerationPrompt,
    buildCodexExecArgs,
    buildAntigravitySpawnEnv,
    buildCodexSpawnEnv,
    prepareAntigravityHomeDirectory,
    parseImageManifestLine,
    parseScenePlanLine,
    parseGenerationReferenceMetadata,
    resolveAntigravityCloseResult,
    resolveJobWorkingDirectory,
    resolveGenerationSelection,
    toGenerationReferenceMetadata,
    toRendererAsset,
  },
};
