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
const CODEX_DEEP_TRACE_ENABLED = process.env.CRENV_CODEX_TRACE !== '0';
const CANCEL_EXIT_GRACE_MS = 2000;

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

function formatTraceElapsedMs(startedAtMs) {
  return `+${Date.now() - startedAtMs}ms`;
}

function registerSceneGroupCancelableRun(activeSceneGroupCancellations, sceneGroupId, cancelableRun) {
  const current = activeSceneGroupCancellations.get(sceneGroupId) ?? [];
  current.push(cancelableRun);
  activeSceneGroupCancellations.set(sceneGroupId, current);
}

function cancelSceneGroupCancelableRuns(activeSceneGroupCancellations, sceneGroupId, reason = 'user_requested_scene_stop') {
  const activeRuns = activeSceneGroupCancellations.get(sceneGroupId) ?? [];
  let canceled = false;
  for (const activeRun of activeRuns) {
    canceled = activeRun.cancel(reason) === true || canceled;
  }
  return canceled;
}

function buildSceneFramePrompt({
  sceneGroupTitle,
  scenePrompt,
  frames,
  targetFrameId,
  frameOverrideMap,
  referencesByFrameId,
}) {
  const targetIndex = frames.findIndex((frame) => frame.id === targetFrameId);
  if (targetIndex === -1) {
    throw new Error('Target frame not found.');
  }

  const targetFrame = frames[targetIndex];
  const targetOverride = frameOverrideMap.get(targetFrame.id);
  const targetReferences = referencesByFrameId.get(targetFrame.id) ?? [];

  return [
    `Scene group: ${sceneGroupTitle}`,
    scenePrompt
      ? `Scene continuity brief: ${scenePrompt}`
      : 'Scene continuity brief: keep the environment coherent across all frames.',
    `You are generating only one frame from a larger scene sequence: Frame ${targetIndex + 1}.`,
    `Generate only this target frame: ${targetOverride?.title || targetFrame.title}.`,
    'Use only the scene continuity brief, attached references, and this target frame prompt.',
    'Keep environment identity, materials, layout, lighting direction, palette, and character continuity stable.',
    'Let angle, framing, and conversational coverage change only as needed for this target frame.',
    targetReferences.length > 0 ? `Target frame references: ${targetReferences.map((reference) => reference.name).join(', ')}.` : 'Target frame references: none.',
    `Target frame prompt: ${targetOverride?.prompt || targetFrame.prompt || 'Preserve scene continuity and choose an appropriate shot.'}`,
  ].join('\n');
}

function buildSceneFrameGenerationTasks({
  sceneGroupTitle,
  scenePrompt,
  frames,
  targetFrameId = null,
  frameOverrideMap,
  referencesByFrameId,
  sceneReferenceImages,
}) {
  const sharedReferenceImages = [
    ...sceneReferenceImages,
    ...frames.flatMap((frame) =>
      (referencesByFrameId.get(frame.id) ?? []).map((reference) => ({
        name: reference.name,
        title: frameOverrideMap.get(frame.id)?.title || frame.title,
        description:
          reference.referenceKind === 'saved_reference'
            ? 'Saved frame reference'
            : 'Uploaded frame attachment',
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
      }))
    ),
  ];

  const targetFrames = targetFrameId ? frames.filter((frame) => frame.id === targetFrameId) : frames;
  return targetFrames.map((frame) => ({
    frameId: frame.id,
    prompt: buildSceneFramePrompt({
      sceneGroupTitle,
      scenePrompt,
      frames,
      targetFrameId: frame.id,
      frameOverrideMap,
      referencesByFrameId,
    }),
    referenceImages: sharedReferenceImages,
  }));
}

function truncateDirectorChatTitle(prompt) {
  const normalized = typeof prompt === 'string' ? prompt.trim().replace(/\s+/g, ' ') : '';
  if (!normalized) {
    return 'New chat';
  }
  return normalized.length > 56 ? `${normalized.slice(0, 56).trimEnd()}…` : normalized;
}

function buildDirectorChatPrompt({
  projectName,
  threadName,
  systemInstructions,
  artStyle,
  history,
  referenceImages,
  userPrompt,
}) {
  const historyLines = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.contentMarkdown}`);

  return [
    'You are the Director workspace inside the Imagen app.',
    'Help the user develop shots, scene coverage, continuity notes, and production-ready creative direction.',
    'Answer in clean Markdown.',
    'Be concise by default, but expand when the user asks for detail.',
    'Do not generate images, manifests, or file paths in this mode.',
    projectName ? `Project: ${projectName}` : null,
    threadName ? `Thread: ${threadName}` : null,
    systemInstructions ? `Project instructions: ${systemInstructions}` : null,
    artStyle ? `Project art style: ${artStyle}` : null,
    '',
    referenceImages.length > 0 ? 'Attached reference images:' : null,
    ...referenceImages.map((referenceImage) => {
      const metadata = [
        referenceImage.title ? `title: ${referenceImage.title}` : null,
        referenceImage.description ? `description: ${referenceImage.description}` : null,
      ].filter(Boolean);
      return metadata.length > 0
        ? `- ${referenceImage.path} (${metadata.join('; ')})`
        : `- ${referenceImage.path}`;
    }),
    referenceImages.length > 0 ? 'Use attached references when discussing environments, characters, props, or shot continuity.' : null,
    '',
    historyLines.length > 0 ? 'Conversation so far:' : null,
    ...historyLines,
    '',
    `User: ${userPrompt.trim()}`,
    'Assistant:',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildReferenceCollectionDescriptionPrompt({ category, title, attachmentPaths }) {
  const categoryLabel =
    category === 'environment' ? 'environment' : category === 'objects' ? 'item' : 'character';

  return [
    'You are helping an Electron app turn a grouped set of image references into reusable production metadata.',
    'Inspect every attached image file before answering.',
    `Reference category: ${categoryLabel}.`,
    title ? `Existing title hint: ${title}` : 'No reliable title was provided. Infer one from the images.',
    'Return exactly one JSON object with this shape:',
    '{"title":"...","description":"...","attachments":[{"id":"...","description":"..."}]}',
    'Rules:',
    '- `title` must be concise and production-friendly.',
    '- `description` must describe the shared identity, style, materials, silhouette, and constraints that should persist across shots.',
    '- Each attachment description must focus only on what is specific to that single image angle or crop.',
    '- Keep descriptions plain text. No markdown.',
    '- Preserve the provided attachment ids exactly.',
    'Attachment files:',
    ...attachmentPaths.map((attachment) => `- id=${attachment.id} path=${attachment.path}`),
  ].join('\n');
}

function classifyCodexTraceLine(line) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) {
    return 'plain';
  }
  if (
    normalized.startsWith('thinking') ||
    normalized.startsWith('reasoning') ||
    normalized.startsWith('analyzing') ||
    normalized.startsWith('analysis:') ||
    normalized.startsWith('plan:')
  ) {
    return 'reasoning';
  }
  if (
    normalized.includes('calling tool') ||
    normalized.includes('running tool') ||
    normalized.includes('invoking tool') ||
    normalized.includes('tool call') ||
    normalized.includes('using tool')
  ) {
    return 'tool_call';
  }
  return 'plain';
}

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

const characterReferenceCollectionsTable = sqliteTable('character_reference_collections', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const characterReferenceAttachmentsTable = sqliteTable('character_reference_attachments', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => characterReferenceCollectionsTable.id),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const objectReferenceCollectionsTable = sqliteTable('object_reference_collections', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const objectReferenceAttachmentsTable = sqliteTable('object_reference_attachments', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => objectReferenceCollectionsTable.id),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
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

const sceneGroupsTable = sqliteTable('scene_groups', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => threadsTable.id),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  tocOrder: integer('toc_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const sceneFramesTable = sqliteTable('scene_frames', {
  id: text('id').primaryKey(),
  sceneGroupId: text('scene_group_id')
    .notNull()
    .references(() => sceneGroupsTable.id),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  frameOrder: integer('frame_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const sceneFrameReferencesTable = sqliteTable('scene_frame_references', {
  id: text('id').primaryKey(),
  sceneFrameId: text('scene_frame_id')
    .notNull()
    .references(() => sceneFramesTable.id),
  referenceKind: text('reference_kind').notNull(),
  referenceId: text('reference_id'),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  createdAt: text('created_at').notNull(),
});

const sceneGroupRunsTable = sqliteTable('scene_group_runs', {
  id: text('id').primaryKey(),
  sceneGroupId: text('scene_group_id')
    .notNull()
    .references(() => sceneGroupsTable.id),
  threadId: text('thread_id')
    .notNull()
    .references(() => threadsTable.id),
  status: text('status').notNull(),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  modelLabel: text('model_label').notNull(),
  requestedFrameCount: integer('requested_frame_count').notNull(),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const sceneFrameAssetsTable = sqliteTable('scene_frame_assets', {
  id: text('id').primaryKey(),
  sceneGroupRunId: text('scene_group_run_id')
    .notNull()
    .references(() => sceneGroupRunsTable.id),
  sceneFrameId: text('scene_frame_id')
    .notNull()
    .references(() => sceneFramesTable.id),
  outputIndex: integer('output_index').notNull(),
  originalPath: text('original_path').notNull(),
  storedPath: text('stored_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: text('created_at').notNull(),
});

const directorChatsTable = sqliteTable('director_chats', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => threadsTable.id),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const directorMessagesTable = sqliteTable('director_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => directorChatsTable.id),
  role: text('role').notNull(),
  contentMarkdown: text('content_markdown').notNull(),
  status: text('status').notNull(),
  modelId: text('model_id'),
  modelLabel: text('model_label'),
  fastMode: integer('fast_mode').notNull().default(0),
  referenceImagesJson: text('reference_images_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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

const CREATE_CHARACTER_REFERENCE_COLLECTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS character_reference_collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_CHARACTER_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS character_reference_attachments (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES character_reference_collections(id)
  )
`;

const CREATE_OBJECT_REFERENCE_COLLECTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS object_reference_collections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_OBJECT_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS object_reference_attachments (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES object_reference_collections(id)
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

const CREATE_SCENE_GROUPS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scene_groups (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    toc_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
  )
`;

const CREATE_SCENE_FRAMES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scene_frames (
    id TEXT PRIMARY KEY,
    scene_group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    frame_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_group_id) REFERENCES scene_groups(id)
  )
`;

const CREATE_SCENE_FRAME_REFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scene_frame_references (
    id TEXT PRIMARY KEY,
    scene_frame_id TEXT NOT NULL,
    reference_kind TEXT NOT NULL,
    reference_id TEXT,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (scene_frame_id) REFERENCES scene_frames(id)
  )
`;

const CREATE_SCENE_GROUP_RUNS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scene_group_runs (
    id TEXT PRIMARY KEY,
    scene_group_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    model_label TEXT NOT NULL,
    requested_frame_count INTEGER NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scene_group_id) REFERENCES scene_groups(id),
    FOREIGN KEY (thread_id) REFERENCES threads(id)
  )
`;

const CREATE_SCENE_FRAME_ASSETS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scene_frame_assets (
    id TEXT PRIMARY KEY,
    scene_group_run_id TEXT NOT NULL,
    scene_frame_id TEXT NOT NULL,
    output_index INTEGER NOT NULL,
    original_path TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (scene_group_run_id) REFERENCES scene_group_runs(id),
    FOREIGN KEY (scene_frame_id) REFERENCES scene_frames(id)
  )
`;

const CREATE_DIRECTOR_CHATS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS director_chats (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
  )
`;

const CREATE_DIRECTOR_MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS director_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    status TEXT NOT NULL,
    model_id TEXT,
    model_label TEXT,
    fast_mode INTEGER NOT NULL DEFAULT 0,
    reference_images_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES director_chats(id)
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
  const activeSceneGroupCancellations = new Map();
  const activeDirectorChatCancellations = new Map();
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
  await db.run(sql.raw(CREATE_CHARACTER_REFERENCE_COLLECTIONS_TABLE_SQL));
  await db.run(sql.raw(CREATE_CHARACTER_REFERENCE_ATTACHMENTS_TABLE_SQL));
  await db.run(sql.raw(CREATE_OBJECT_REFERENCE_COLLECTIONS_TABLE_SQL));
  await db.run(sql.raw(CREATE_OBJECT_REFERENCE_ATTACHMENTS_TABLE_SQL));
  await db.run(sql.raw(CREATE_ENVIRONMENT_REFERENCES_TABLE_SQL));
  await db.run(sql.raw(CREATE_ENVIRONMENT_REFERENCE_ATTACHMENTS_TABLE_SQL));
  await db.run(sql.raw(CREATE_SCENE_GROUPS_TABLE_SQL));
  await db.run(sql.raw(CREATE_SCENE_FRAMES_TABLE_SQL));
  await db.run(sql.raw(CREATE_SCENE_FRAME_REFERENCES_TABLE_SQL));
  await db.run(sql.raw(CREATE_SCENE_GROUP_RUNS_TABLE_SQL));
  await db.run(sql.raw(CREATE_SCENE_FRAME_ASSETS_TABLE_SQL));
  await db.run(sql.raw(CREATE_DIRECTOR_CHATS_TABLE_SQL));
  await db.run(sql.raw(CREATE_DIRECTOR_MESSAGES_TABLE_SQL));
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

  function normalizeReferenceCollectionCategory(category) {
    if (category === 'environment') {
      return 'environment';
    }
    return category === 'objects' ? 'objects' : 'characters';
  }

  function mapReferenceCollectionAttachment({
    attachment,
    category,
    collectionId,
    collectionTitle,
    collectionDescription,
    timestamp,
  }) {
    return {
      id: attachment.id ?? nanoid(),
      collectionId,
      name: attachment.name,
      title: collectionTitle,
      description: attachment.description?.trim() || collectionDescription || null,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      createdAt: timestamp,
      category,
      environmentId: category === 'environment' ? collectionId : null,
    };
  }

  async function createReferenceCollection(payload) {
    const category = normalizeReferenceCollectionCategory(payload.category);
    if (!Array.isArray(payload.attachments) || payload.attachments.length === 0) {
      return [];
    }

    if (category === 'environment') {
      return createEnvironmentReference(payload);
    }

    const timestamp = new Date().toISOString();
    const collectionId = nanoid();
    const title = payload.title.trim();
    const description = payload.description?.trim() || null;
    const collectionTable =
      category === 'objects' ? objectReferenceCollectionsTable : characterReferenceCollectionsTable;
    const attachmentTable =
      category === 'objects' ? objectReferenceAttachmentsTable : characterReferenceAttachmentsTable;

    await db.insert(collectionTable).values({
      id: collectionId,
      title,
      description,
      createdAt: timestamp,
    });

    const attachments = payload.attachments.map((attachment) => ({
      id: nanoid(),
      collectionId,
      name: attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      createdAt: timestamp,
    }));

    await db.insert(attachmentTable).values(attachments);

    return attachments.map((attachment) =>
      mapReferenceCollectionAttachment({
        attachment,
        category,
        collectionId,
        collectionTitle: title,
        collectionDescription: description,
        timestamp: attachment.createdAt,
      })
    );
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
      collectionId: environmentId,
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
        collectionId: environmentId,
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
      collectionId: null,
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
      collectionId: environmentId,
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

  async function updateReferenceCollection(payload) {
    const category = normalizeReferenceCollectionCategory(payload.category);
    if (category === 'environment') {
      return updateEnvironmentReference({
        environmentId: payload.collectionId,
        title: payload.title,
        description: payload.description,
        attachments: payload.attachments,
      });
    }

    const title = payload.title.trim();
    const description = payload.description?.trim() || null;
    const collectionId = payload.collectionId;
    const collectionTable =
      category === 'objects' ? objectReferenceCollectionsTable : characterReferenceCollectionsTable;
    const attachmentTable =
      category === 'objects' ? objectReferenceAttachmentsTable : characterReferenceAttachmentsTable;

    await db
      .update(collectionTable)
      .set({
        title,
        description,
      })
      .where(eq(collectionTable.id, collectionId));

    await db.delete(attachmentTable).where(eq(attachmentTable.collectionId, collectionId));

    const timestamp = new Date().toISOString();
    const attachments = (payload.attachments ?? []).map((attachment) => ({
      id: attachment.id ?? nanoid(),
      collectionId,
      name: attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      createdAt: timestamp,
    }));

    if (attachments.length > 0) {
      await db.insert(attachmentTable).values(attachments);
    }

    return attachments.map((attachment) =>
      mapReferenceCollectionAttachment({
        attachment,
        category,
        collectionId,
        collectionTitle: title,
        collectionDescription: description,
        timestamp: attachment.createdAt,
      })
    );
  }

  async function deleteReference(payload) {
    if (payload.category === 'environment') {
      const environmentId = payload.collectionId ?? payload.environmentId;
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

    if (payload.collectionId) {
      const collectionTable =
        payload.category === 'objects' ? objectReferenceCollectionsTable : characterReferenceCollectionsTable;
      const attachmentTable =
        payload.category === 'objects' ? objectReferenceAttachmentsTable : characterReferenceAttachmentsTable;
      await db.delete(attachmentTable).where(eq(attachmentTable.collectionId, payload.collectionId));
      await db.delete(collectionTable).where(eq(collectionTable.id, payload.collectionId));
      return;
    }

    const table = payload.category === 'objects' ? objectReferencesTable : characterReferencesTable;
    await db.delete(table).where(eq(table.id, payload.id));
  }

  async function listReferences() {
    const [characters, objects, groupedCharacters, groupedObjects, environments] = await Promise.all([
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
          id: characterReferenceAttachmentsTable.id,
          collectionId: characterReferenceAttachmentsTable.collectionId,
          name: characterReferenceAttachmentsTable.name,
          title: characterReferenceCollectionsTable.title,
          collectionDescription: characterReferenceCollectionsTable.description,
          description: characterReferenceAttachmentsTable.description,
          mimeType: characterReferenceAttachmentsTable.mimeType,
          bytesBase64: characterReferenceAttachmentsTable.bytesBase64,
          createdAt: characterReferenceAttachmentsTable.createdAt,
        })
        .from(characterReferenceAttachmentsTable)
        .innerJoin(
          characterReferenceCollectionsTable,
          eq(characterReferenceAttachmentsTable.collectionId, characterReferenceCollectionsTable.id)
        )
        .orderBy(desc(characterReferenceAttachmentsTable.createdAt), desc(characterReferenceAttachmentsTable.id)),
      db
        .select({
          id: objectReferenceAttachmentsTable.id,
          collectionId: objectReferenceAttachmentsTable.collectionId,
          name: objectReferenceAttachmentsTable.name,
          title: objectReferenceCollectionsTable.title,
          collectionDescription: objectReferenceCollectionsTable.description,
          description: objectReferenceAttachmentsTable.description,
          mimeType: objectReferenceAttachmentsTable.mimeType,
          bytesBase64: objectReferenceAttachmentsTable.bytesBase64,
          createdAt: objectReferenceAttachmentsTable.createdAt,
        })
        .from(objectReferenceAttachmentsTable)
        .innerJoin(
          objectReferenceCollectionsTable,
          eq(objectReferenceAttachmentsTable.collectionId, objectReferenceCollectionsTable.id)
        )
        .orderBy(desc(objectReferenceAttachmentsTable.createdAt), desc(objectReferenceAttachmentsTable.id)),
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
      ...characters.map((reference) => ({
        ...reference,
        category: 'characters',
        collectionId: null,
        environmentId: null,
      })),
      ...objects.map((reference) => ({
        ...reference,
        category: 'objects',
        collectionId: null,
        environmentId: null,
      })),
      ...groupedCharacters.map((reference) => ({
        ...reference,
        category: 'characters',
        collectionId: reference.collectionId,
        environmentId: null,
        description: reference.description ?? reference.collectionDescription ?? null,
      })),
      ...groupedObjects.map((reference) => ({
        ...reference,
        category: 'objects',
        collectionId: reference.collectionId,
        environmentId: null,
        description: reference.description ?? reference.collectionDescription ?? null,
      })),
      ...environments.map((reference) => ({
        ...reference,
        category: 'environment',
        collectionId: reference.environmentId,
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

  async function listDirectorChats(threadId) {
    if (typeof threadId !== 'string' || !threadId.trim()) {
      return [];
    }

    return db
      .select()
      .from(directorChatsTable)
      .where(eq(directorChatsTable.threadId, threadId.trim()))
      .orderBy(desc(directorChatsTable.updatedAt), desc(directorChatsTable.id));
  }

  async function createDirectorChat(threadId) {
    const timestamp = new Date().toISOString();
    const chat = {
      id: nanoid(),
      threadId: threadId.trim(),
      title: 'New chat',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(directorChatsTable).values(chat);
    return chat;
  }

  async function renameDirectorChat(chatId, title) {
    const nextTitle = typeof title === 'string' && title.trim() ? title.trim() : 'New chat';
    const updatedAt = new Date().toISOString();
    await db
      .update(directorChatsTable)
      .set({ title: nextTitle, updatedAt })
      .where(eq(directorChatsTable.id, chatId));

    const [chat] = await db.select().from(directorChatsTable).where(eq(directorChatsTable.id, chatId)).limit(1);
    return chat ?? null;
  }

  async function deleteDirectorChat(chatId) {
    const activeRun = activeDirectorChatCancellations.get(chatId);
    if (activeRun) {
      activeRun.cancel('chat_deleted');
      activeDirectorChatCancellations.delete(chatId);
    }
    await db.delete(directorMessagesTable).where(eq(directorMessagesTable.chatId, chatId));
    await db.delete(directorChatsTable).where(eq(directorChatsTable.id, chatId));
  }

  async function listDirectorMessages(chatId) {
    if (typeof chatId !== 'string' || !chatId.trim()) {
      return [];
    }

    const messages = await db
      .select()
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.chatId, chatId.trim()))
      .orderBy(directorMessagesTable.createdAt, directorMessagesTable.id);

    return messages.map((message) => ({
      ...message,
      fastMode: Boolean(message.fastMode),
      references: parseGenerationReferenceMetadata(message.referenceImagesJson),
    }));
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
    onScenePlan,
    onCancelableRun,
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
    if (CODEX_DEEP_TRACE_ENABLED) {
      console.info(`${logPrefix} deepTrace: enabled`);
      console.info(`${logPrefix} stagedReferenceCount: ${stagedReferenceImages.length}`);
      for (const referenceImage of stagedReferenceImages) {
        const metadata = [
          referenceImage.title ? `title=${referenceImage.title}` : null,
          referenceImage.description ? `description=${referenceImage.description}` : null,
        ]
          .filter(Boolean)
          .join(' ');
        console.info(
          `${logPrefix} stagedReference: ${referenceImage.path}${metadata ? ` ${metadata}` : ''}`
        );
      }
    }

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
              onScenePlan: (payload) => {
                options.onScenePlan?.(payload);
                onScenePlan?.(payload);
              },
              onCancelableRun: (cancelableRun) => {
                options.onCancelableRun?.(cancelableRun);
                onCancelableRun?.(cancelableRun);
              },
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
              onScenePlan: (payload) => {
                options.onScenePlan?.(payload);
                onScenePlan?.(payload);
              },
              onCancelableRun: (cancelableRun) => {
                options.onCancelableRun?.(cancelableRun);
                onCancelableRun?.(cancelableRun);
              },
            });

      if (!result.success) {
        if (result.canceled) {
          console.info(`${logPrefix} generation canceled`);
          const canceledError = new Error(result.errorMessage);
          canceledError.name = 'GenerationCanceledError';
          canceledError.code = 'GENERATION_CANCELED';
          throw canceledError;
        }

        console.error(`${logPrefix} generation failed`);
        throw new Error(result.errorMessage);
      }

      let manifest = result.manifest ?? null;
      if (manifest) {
        if (CODEX_DEEP_TRACE_ENABLED) {
          console.info(`${logPrefix} manifest sourced from stdout`);
        }
        await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      } else {
        await fsp.access(manifestPath);
        if (CODEX_DEEP_TRACE_ENABLED) {
          console.info(`${logPrefix} manifest sourced from disk`);
        }
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

  async function listSceneGroups(threadId) {
    if (!threadId) {
      return [];
    }

    const sceneGroups = await db
      .select()
      .from(sceneGroupsTable)
      .where(eq(sceneGroupsTable.threadId, threadId))
      .orderBy(sceneGroupsTable.tocOrder, desc(sceneGroupsTable.createdAt), desc(sceneGroupsTable.id));
    const sceneGroupIds = sceneGroups.map((sceneGroup) => sceneGroup.id);
    const sceneFrames =
      sceneGroupIds.length === 0
        ? []
        : await db
            .select()
            .from(sceneFramesTable)
            .where(inArray(sceneFramesTable.sceneGroupId, sceneGroupIds))
            .orderBy(sceneFramesTable.frameOrder, desc(sceneFramesTable.createdAt), desc(sceneFramesTable.id));
    const sceneFrameIds = sceneFrames.map((sceneFrame) => sceneFrame.id);
    const sceneFrameReferences =
      sceneFrameIds.length === 0
        ? []
        : await db
            .select()
            .from(sceneFrameReferencesTable)
            .where(inArray(sceneFrameReferencesTable.sceneFrameId, sceneFrameIds))
            .orderBy(desc(sceneFrameReferencesTable.createdAt), desc(sceneFrameReferencesTable.id));
    const runs =
      sceneGroupIds.length === 0
        ? []
        : await db
            .select()
            .from(sceneGroupRunsTable)
            .where(inArray(sceneGroupRunsTable.sceneGroupId, sceneGroupIds))
            .orderBy(desc(sceneGroupRunsTable.createdAt), desc(sceneGroupRunsTable.id));
    const runIds = runs.map((run) => run.id);
    const assets =
      runIds.length === 0
        ? []
        : await db
            .select()
            .from(sceneFrameAssetsTable)
            .where(inArray(sceneFrameAssetsTable.sceneGroupRunId, runIds))
            .orderBy(sceneFrameAssetsTable.outputIndex, desc(sceneFrameAssetsTable.createdAt), desc(sceneFrameAssetsTable.id));

    const referencesByFrameId = new Map();
    for (const reference of sceneFrameReferences) {
      const current = referencesByFrameId.get(reference.sceneFrameId) ?? [];
      current.push(reference);
      referencesByFrameId.set(reference.sceneFrameId, current);
    }

    const assetsByFrameId = new Map();
    for (const asset of assets) {
      const current = assetsByFrameId.get(asset.sceneFrameId) ?? [];
      current.push(asset);
      assetsByFrameId.set(asset.sceneFrameId, current);
    }

    const framesBySceneGroupId = new Map();
    for (const frame of sceneFrames) {
      const current = framesBySceneGroupId.get(frame.sceneGroupId) ?? [];
      current.push({
        ...frame,
        references: referencesByFrameId.get(frame.id) ?? [],
        assets: assetsByFrameId.get(frame.id) ?? [],
      });
      framesBySceneGroupId.set(frame.sceneGroupId, current);
    }

    const runsBySceneGroupId = new Map();
    for (const run of runs) {
      const current = runsBySceneGroupId.get(run.sceneGroupId) ?? [];
      current.push(run);
      runsBySceneGroupId.set(run.sceneGroupId, current);
    }

    return sceneGroups.map((sceneGroup) => ({
      ...sceneGroup,
      frames: framesBySceneGroupId.get(sceneGroup.id) ?? [],
      runs: runsBySceneGroupId.get(sceneGroup.id) ?? [],
    }));
  }

  async function createSceneGroup(threadId, input) {
    const timestamp = new Date().toISOString();
    const sceneGroup = {
      id: nanoid(),
      threadId,
      title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : 'Scene 1',
      prompt: typeof input?.prompt === 'string' ? input.prompt : '',
      tocOrder: Number.isInteger(input?.tocOrder) ? input.tocOrder : 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(sceneGroupsTable).values(sceneGroup);
    return (await listSceneGroups(threadId))[0];
  }

  async function updateSceneGroup(sceneGroupId, input) {
    const existing = await db.select().from(sceneGroupsTable).where(eq(sceneGroupsTable.id, sceneGroupId)).limit(1);
    const sceneGroup = existing[0];
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }
    await db
      .update(sceneGroupsTable)
      .set({
        title: typeof input?.title === 'string' ? input.title : sceneGroup.title,
        prompt: typeof input?.prompt === 'string' ? input.prompt : sceneGroup.prompt,
        tocOrder: Number.isInteger(input?.tocOrder) ? input.tocOrder : sceneGroup.tocOrder,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sceneGroupsTable.id, sceneGroupId));
    const sceneGroups = await listSceneGroups(sceneGroup.threadId);
    return sceneGroups.find((item) => item.id === sceneGroupId) ?? null;
  }

  async function createSceneFrame(sceneGroupId, input) {
    const existing = await db.select().from(sceneGroupsTable).where(eq(sceneGroupsTable.id, sceneGroupId)).limit(1);
    const sceneGroup = existing[0];
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }
    const timestamp = new Date().toISOString();
    await db.insert(sceneFramesTable).values({
      id: nanoid(),
      sceneGroupId,
      title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : 'Frame',
      prompt: typeof input?.prompt === 'string' ? input.prompt : '',
      frameOrder: Number.isInteger(input?.frameOrder) ? input.frameOrder : 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const sceneGroups = await listSceneGroups(sceneGroup.threadId);
    return sceneGroups.find((item) => item.id === sceneGroupId) ?? null;
  }

  async function updateSceneFrame(sceneFrameId, input) {
    const existing = await db.select().from(sceneFramesTable).where(eq(sceneFramesTable.id, sceneFrameId)).limit(1);
    const sceneFrame = existing[0];
    if (!sceneFrame) {
      throw new Error('Scene frame not found.');
    }
    const sceneGroups = await db
      .select()
      .from(sceneGroupsTable)
      .where(eq(sceneGroupsTable.id, sceneFrame.sceneGroupId))
      .limit(1);
    const sceneGroup = sceneGroups[0];
    await db
      .update(sceneFramesTable)
      .set({
        title: typeof input?.title === 'string' ? input.title : sceneFrame.title,
        prompt: typeof input?.prompt === 'string' ? input.prompt : sceneFrame.prompt,
        frameOrder: Number.isInteger(input?.frameOrder) ? input.frameOrder : sceneFrame.frameOrder,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sceneFramesTable.id, sceneFrameId));
    const details = await listSceneGroups(sceneGroup.threadId);
    return details.find((item) => item.id === sceneGroup.id) ?? null;
  }

  async function saveSceneFrameReferences(sceneFrameId, references) {
    const existing = await db.select().from(sceneFramesTable).where(eq(sceneFramesTable.id, sceneFrameId)).limit(1);
    const sceneFrame = existing[0];
    if (!sceneFrame) {
      throw new Error('Scene frame not found.');
    }
    const sceneGroups = await db
      .select()
      .from(sceneGroupsTable)
      .where(eq(sceneGroupsTable.id, sceneFrame.sceneGroupId))
      .limit(1);
    const sceneGroup = sceneGroups[0];
    await db.delete(sceneFrameReferencesTable).where(eq(sceneFrameReferencesTable.sceneFrameId, sceneFrameId));
    if (Array.isArray(references) && references.length > 0) {
      await db.insert(sceneFrameReferencesTable).values(
        references.map((reference) => ({
          id: reference.id ?? nanoid(),
          sceneFrameId,
          referenceKind: reference.referenceKind,
          referenceId: reference.referenceId ?? null,
          name: reference.name,
          mimeType: reference.mimeType,
          bytesBase64: reference.bytesBase64,
          createdAt: reference.createdAt ?? new Date().toISOString(),
        }))
      );
    }
    const details = await listSceneGroups(sceneGroup.threadId);
    return details.find((item) => item.id === sceneGroup.id) ?? null;
  }

  async function generateSceneGroup(input) {
    const sceneGroupId = typeof input === 'string' ? input : input?.sceneGroupId;
    const targetFrameId =
      typeof input?.targetFrameId === 'string' && input.targetFrameId.trim() ? input.targetFrameId.trim() : null;
    const promptOverride = typeof input?.promptOverride === 'string' ? input.promptOverride : null;
    const frameOverrideMap = new Map(
      Array.isArray(input?.frameOverrides)
        ? input.frameOverrides
            .filter((frame) => frame && typeof frame.id === 'string')
            .map((frame) => [frame.id, frame])
        : []
    );
    const sceneReferenceImages = Array.isArray(input?.referenceImages) ? input.referenceImages : [];
    const fastMode = input?.fastMode === true;
    const existing = await db.select().from(sceneGroupsTable).where(eq(sceneGroupsTable.id, sceneGroupId)).limit(1);
    const sceneGroup = existing[0];
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }
    const frames = await db
      .select()
      .from(sceneFramesTable)
      .where(eq(sceneFramesTable.sceneGroupId, sceneGroupId))
      .orderBy(sceneFramesTable.frameOrder, desc(sceneFramesTable.createdAt), desc(sceneFramesTable.id));

    if (frames.length === 0) {
      throw new Error('Scene group has no frames to generate.');
    }
    if (targetFrameId && !frames.some((frame) => frame.id === targetFrameId)) {
      throw new Error('Target frame not found.');
    }

    const frameIds = frames.map((frame) => frame.id);
    const persistedFrameReferences =
      frameIds.length === 0
        ? []
        : await db
            .select()
            .from(sceneFrameReferencesTable)
            .where(inArray(sceneFrameReferencesTable.sceneFrameId, frameIds))
            .orderBy(desc(sceneFrameReferencesTable.createdAt), desc(sceneFrameReferencesTable.id));

    const startedAtMs = Date.now();
    const timestamp = new Date(startedAtMs).toISOString();
    const runId = nanoid();
    const modelId = DEFAULT_CODEX_MODEL_ID;
    const modelLabel = `Codex / ${MODEL_LABEL_BY_ID[modelId]}`;

    await db.insert(sceneGroupRunsTable).values({
      id: runId,
      sceneGroupId,
      threadId: sceneGroup.threadId,
      status: 'running',
      provider: 'codex',
      modelId: 'gpt-5.4-mini',
      modelLabel,
      requestedFrameCount: targetFrameId ? 1 : frames.length,
      errorMessage: null,
      durationMs: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const referencesByFrameId = new Map();
    for (const reference of persistedFrameReferences) {
      const current = referencesByFrameId.get(reference.sceneFrameId) ?? [];
      current.push(reference);
      referencesByFrameId.set(reference.sceneFrameId, current);
    }

    for (const frame of frames) {
      const override = frameOverrideMap.get(frame.id);
      if (!Array.isArray(override?.references)) {
        continue;
      }
      referencesByFrameId.set(
        frame.id,
        override.references.map((reference) => ({
          sceneFrameId: frame.id,
          ...reference,
        }))
      );
    }

    const tasks = buildSceneFrameGenerationTasks({
      sceneGroupTitle: sceneGroup.title,
      scenePrompt: promptOverride || sceneGroup.prompt,
      frames,
      targetFrameId,
      frameOverrideMap,
      referencesByFrameId,
      sceneReferenceImages,
    });

    try {
      const settledResults = await Promise.allSettled(
        tasks.map(async (task) => {
          const result = await generateImages({
            prompt: task.prompt,
            count: 1,
            threadId: sceneGroup.threadId,
            mode: 'scene',
            provider: 'codex',
            modelId,
            referenceImages: task.referenceImages,
            fastMode,
            onCancelableRun: (cancelableRun) => {
              registerSceneGroupCancelableRun(activeSceneGroupCancellations, sceneGroupId, cancelableRun);
            },
          });
          return { task, result };
        })
      );

      const firstRejected = settledResults.find((result) => result.status === 'rejected');
      if (firstRejected) {
        cancelSceneGroupCancelableRuns(activeSceneGroupCancellations, sceneGroupId, 'peer_failed_scene_generation');
        throw firstRejected.reason;
      }

      for (const settledResult of settledResults) {
        const { task, result } = settledResult.value;
        for (const [index, asset] of result.assets.entries()) {
          const generatedAsset = await getGeneratedImage(asset.id);
          if (!generatedAsset) {
            continue;
          }

          await db.insert(sceneFrameAssetsTable).values({
            id: nanoid(),
            sceneGroupRunId: runId,
            sceneFrameId: task.frameId,
            outputIndex: index,
            originalPath: generatedAsset.originalPath,
            storedPath: generatedAsset.storedPath,
            fileName: generatedAsset.fileName,
            mimeType: generatedAsset.mimeType,
            width: generatedAsset.width ?? null,
            height: generatedAsset.height ?? null,
            createdAt: generatedAsset.createdAt,
          });
        }

          options.onSceneFrameReady?.({
            threadId: sceneGroup.threadId,
            sceneGroupId,
            frameId: task.frameId,
          });
      }

      await db
        .update(sceneGroupRunsTable)
        .set({
          status: 'succeeded',
          durationMs: Date.now() - startedAtMs,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sceneGroupRunsTable.id, runId));
    } catch (error) {
      await db
        .update(sceneGroupRunsTable)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAtMs,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sceneGroupRunsTable.id, runId));
      throw error;
    } finally {
      activeSceneGroupCancellations.delete(sceneGroupId);
    }

    const sceneGroups = await listSceneGroups(sceneGroup.threadId);
    return sceneGroups.find((item) => item.id === sceneGroupId) ?? null;
  }

  async function cancelSceneGroupGeneration(sceneGroupId) {
    const activeRuns = activeSceneGroupCancellations.get(sceneGroupId);
    if (!activeRuns || activeRuns.length === 0) {
      return false;
    }

    return cancelSceneGroupCancelableRuns(activeSceneGroupCancellations, sceneGroupId);
  }

  async function structureScenePrompt(input) {
    const sourceText = typeof input?.sourceText === 'string' ? input.sourceText.trim() : '';
    const selection = resolveGenerationSelection('codex', input?.modelId ?? DEFAULT_CODEX_MODEL_ID);

    if (!sourceText) {
      throw new Error('Clipboard is empty.');
    }

    const jobId = nanoid();
    const workingDirectory = resolveJobWorkingDirectory({
      provider: 'codex',
      jobId,
      codexJobsTempDir: paths.codexJobsTempDir,
    });

    await fsp.mkdir(workingDirectory, { recursive: true });

    const result = await runCodexStructuredOutputJob({
      jobId,
      workingDirectory,
      prompt: buildCodexSceneStructuringPrompt(sourceText),
      model: selection.codexModel,
    });

    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    const parsed = parseStructuredJsonObject(result.output);
    const sceneDescription =
      typeof parsed?.sceneDescription === 'string' ? parsed.sceneDescription.trim() : '';
    const frames = Array.isArray(parsed?.frames)
      ? parsed.frames
          .filter((frame) => frame && typeof frame.prompt === 'string')
          .map((frame) => ({ prompt: frame.prompt.trim() }))
          .filter((frame) => frame.prompt.length > 0)
      : [];

    if (!sceneDescription || frames.length === 0) {
      throw new Error('Codex returned an incomplete scene breakdown.');
    }

    return {
      sceneDescription,
      frames,
    };
  }

  async function describeReferenceCollection(input) {
    const attachments = Array.isArray(input?.attachments) ? input.attachments : [];
    if (attachments.length === 0) {
      throw new Error('Reference description generation requires at least one image.');
    }

    const category = normalizeReferenceCollectionCategory(input?.category);
    const selection = resolveGenerationSelection('codex', DEFAULT_CODEX_MODEL_ID);
    const jobId = nanoid();
    const workingDirectory = resolveJobWorkingDirectory({
      provider: 'codex',
      jobId,
      codexJobsTempDir: paths.codexJobsTempDir,
    });

    await fsp.mkdir(workingDirectory, { recursive: true });

    const stagedAttachments = await Promise.all(
      attachments.map(async (attachment, index) => {
        const extension = attachment.mimeType === 'image/jpeg' ? '.jpg' : '.png';
        const filePath = path.join(workingDirectory, `${attachment.id || `attachment-${index + 1}`}${extension}`);
        await fsp.writeFile(filePath, Buffer.from(attachment.bytesBase64, 'base64'));
        return {
          id: attachment.id,
          path: filePath,
        };
      })
    );

    const result = await runCodexStructuredOutputJob({
      jobId,
      workingDirectory,
      prompt: buildReferenceCollectionDescriptionPrompt({
        category,
        title: typeof input?.title === 'string' ? input.title.trim() : '',
        attachmentPaths: stagedAttachments,
      }),
      model: selection.codexModel,
    });

    if (!result.success) {
      throw new Error(result.errorMessage);
    }

    const parsed = parseStructuredJsonObject(result.output);
    const suggestedTitle = typeof parsed?.title === 'string' ? parsed.title.trim() : '';
    const suggestedDescription = typeof parsed?.description === 'string' ? parsed.description.trim() : '';
    const describedAttachments = Array.isArray(parsed?.attachments)
      ? parsed.attachments
          .filter((attachment) => attachment && typeof attachment.id === 'string' && typeof attachment.description === 'string')
          .map((attachment) => ({
            id: attachment.id,
            description: attachment.description.trim(),
          }))
          .filter((attachment) => attachment.description.length > 0)
      : [];

    if (!suggestedTitle || !suggestedDescription) {
      throw new Error('Codex returned an incomplete reference description result.');
    }

    return {
      title: suggestedTitle,
      description: suggestedDescription,
      attachments: describedAttachments,
    };
  }

  async function sendDirectorMessage(input) {
    const chatId = typeof input?.chatId === 'string' ? input.chatId.trim() : '';
    const threadId = typeof input?.threadId === 'string' ? input.threadId.trim() : '';
    const prompt = typeof input?.prompt === 'string' ? input.prompt.trim() : '';

    if (!chatId || !threadId || !prompt) {
      throw new Error('Director chat requires chatId, threadId, and prompt.');
    }

    const [chat] = await db.select().from(directorChatsTable).where(eq(directorChatsTable.id, chatId)).limit(1);
    if (!chat || chat.threadId !== threadId) {
      throw new Error('Director chat not found.');
    }

    if (activeDirectorChatCancellations.has(chatId)) {
      throw new Error('This Director chat is already generating.');
    }

    const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId)).limit(1);
    const [project] = thread
      ? await db.select().from(projectsTable).where(eq(projectsTable.id, thread.projectId)).limit(1)
      : [];
    const historyRows = await db
      .select()
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.chatId, chatId))
      .orderBy(directorMessagesTable.createdAt, directorMessagesTable.id);

    const selection = resolveGenerationSelection('codex', input?.modelId ?? DEFAULT_CODEX_MODEL_ID);
    const resolvedModelId = selection.provider === 'codex' ? selection.modelId : DEFAULT_CODEX_MODEL_ID;
    const resolvedModelLabel =
      selection.provider === 'codex' ? selection.modelLabel : MODEL_LABEL_BY_ID[DEFAULT_CODEX_MODEL_ID];
    const resolvedCodexModel =
      selection.provider === 'codex' ? selection.codexModel : CODEX_MODEL_BY_ID[DEFAULT_CODEX_MODEL_ID];
    const fastMode = input?.fastMode === true;
    const referenceImages = Array.isArray(input?.referenceImages) ? input.referenceImages : [];
    const referenceImagesJson = JSON.stringify(toGenerationReferenceMetadata(referenceImages));
    const timestamp = new Date().toISOString();
    const userMessage = {
      id: nanoid(),
      chatId,
      role: 'user',
      contentMarkdown: prompt,
      status: 'completed',
      modelId: resolvedModelId,
      modelLabel: resolvedModelLabel,
      fastMode: fastMode ? 1 : 0,
      referenceImagesJson,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const assistantMessage = {
      id: nanoid(),
      chatId,
      role: 'assistant',
      contentMarkdown: '',
      status: 'streaming',
      modelId: resolvedModelId,
      modelLabel: resolvedModelLabel,
      fastMode: fastMode ? 1 : 0,
      referenceImagesJson,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(directorMessagesTable).values([userMessage, assistantMessage]);
    await db
      .update(directorChatsTable)
      .set({
        title: chat.title === 'New chat' ? truncateDirectorChatTitle(prompt) : chat.title,
        updatedAt: timestamp,
      })
      .where(eq(directorChatsTable.id, chatId));

    options.onDirectorMessageStart?.({
      threadId,
      chatId,
      userMessage: {
        ...userMessage,
        fastMode,
        references: parseGenerationReferenceMetadata(referenceImagesJson),
      },
      assistantMessage: {
        ...assistantMessage,
        fastMode,
        references: parseGenerationReferenceMetadata(referenceImagesJson),
      },
    });

    const jobId = nanoid();
    const workingDirectory = resolveJobWorkingDirectory({
      provider: 'codex',
      jobId,
      codexJobsTempDir: paths.codexJobsTempDir,
    });

    await fsp.mkdir(workingDirectory, { recursive: true });
    const stagedReferenceImages = await stageReferenceImages({
      workingDirectory,
      referenceImages,
    });
    const promptText = buildDirectorChatPrompt({
      projectName: project?.name ?? '',
      threadName: thread?.name ?? '',
      systemInstructions: project?.systemInstructions ?? '',
      artStyle: project?.artStyle ?? '',
      history: historyRows.map((message) => ({
        role: message.role,
        contentMarkdown: message.contentMarkdown,
      })),
      referenceImages: stagedReferenceImages,
      userPrompt: prompt,
    });

    void runDirectorChatCompletion({
      activeDirectorChatCancellations,
      assistantMessageId: assistantMessage.id,
      chatId,
      threadId,
      fastMode,
      jobId,
      model: resolvedCodexModel,
      prompt: promptText,
      workingDirectory,
    });

    const chats = await listDirectorChats(threadId);
    return {
      chat: chats.find((item) => item.id === chatId) ?? null,
      userMessage: {
        ...userMessage,
        fastMode,
        references: parseGenerationReferenceMetadata(referenceImagesJson),
      },
      assistantMessage: {
        ...assistantMessage,
        fastMode,
        references: parseGenerationReferenceMetadata(referenceImagesJson),
      },
    };
  }

  async function runDirectorChatCompletion({
    activeDirectorChatCancellations,
    assistantMessageId,
    chatId,
    threadId,
    fastMode,
    jobId,
    model,
    prompt,
    workingDirectory,
  }) {
    try {
      const result = await runCodexTextStreamJob({
        jobId,
        workingDirectory,
        prompt,
        fastMode,
        model,
        onCancelableRun(cancelableRun) {
          activeDirectorChatCancellations.set(chatId, cancelableRun);
        },
        onDelta(delta, aggregate) {
          const updatedAt = new Date().toISOString();
          void db
            .update(directorMessagesTable)
            .set({
              contentMarkdown: aggregate,
              updatedAt,
            })
            .where(eq(directorMessagesTable.id, assistantMessageId));
          void db
            .update(directorChatsTable)
            .set({ updatedAt })
            .where(eq(directorChatsTable.id, chatId));
          options.onDirectorMessageDelta?.({
            threadId,
            chatId,
            messageId: assistantMessageId,
            delta,
            content: aggregate,
          });
        },
      });

      const updatedAt = new Date().toISOString();
      await db
        .update(directorMessagesTable)
        .set({
          contentMarkdown: result.output,
          status: result.canceled ? 'failed' : result.success ? 'completed' : 'failed',
          updatedAt,
        })
        .where(eq(directorMessagesTable.id, assistantMessageId));
      await db.update(directorChatsTable).set({ updatedAt }).where(eq(directorChatsTable.id, chatId));

      if (result.success) {
        options.onDirectorMessageComplete?.({
          threadId,
          chatId,
          messageId: assistantMessageId,
          content: result.output,
        });
      } else {
        options.onDirectorMessageError?.({
          threadId,
          chatId,
          messageId: assistantMessageId,
          errorMessage: result.errorMessage,
          content: result.output,
          canceled: result.canceled === true,
        });
      }
    } finally {
      activeDirectorChatCancellations.delete(chatId);
    }
  }

  async function cancelDirectorChat(chatId) {
    const activeRun = activeDirectorChatCancellations.get(chatId);
    if (!activeRun) {
      return false;
    }
    return activeRun.cancel('user_requested_director_stop') === true;
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
    listSceneGroups,
    listDirectorChats,
    createDirectorChat,
    renameDirectorChat,
    deleteDirectorChat,
    listDirectorMessages,
    sendDirectorMessage,
    cancelDirectorChat,
    listProjectsWithThreads,
    listReferences,
    createReference,
    createEnvironmentReference,
    createReferenceCollection,
    updateReference,
    updateEnvironmentReference,
    updateReferenceCollection,
    deleteReference,
    describeReferenceCollection,
    createSceneGroup,
    updateSceneGroup,
    createSceneFrame,
    updateSceneFrame,
    saveSceneFrameReferences,
    generateSceneGroup,
    structureScenePrompt,
    cancelSceneGroupGeneration,
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

    const sceneGroups = await db
      .select({ id: sceneGroupsTable.id })
      .from(sceneGroupsTable)
      .where(inArray(sceneGroupsTable.threadId, threadIds));
    const sceneGroupIds = sceneGroups.map((sceneGroup) => sceneGroup.id);

    if (sceneGroupIds.length > 0) {
      const sceneFrames = await db
        .select({ id: sceneFramesTable.id })
        .from(sceneFramesTable)
        .where(inArray(sceneFramesTable.sceneGroupId, sceneGroupIds));
      const sceneFrameIds = sceneFrames.map((sceneFrame) => sceneFrame.id);
      const sceneRuns = await db
        .select({ id: sceneGroupRunsTable.id })
        .from(sceneGroupRunsTable)
        .where(inArray(sceneGroupRunsTable.sceneGroupId, sceneGroupIds));
      const sceneRunIds = sceneRuns.map((sceneRun) => sceneRun.id);

      if (sceneRunIds.length > 0) {
        await db
          .delete(sceneFrameAssetsTable)
          .where(inArray(sceneFrameAssetsTable.sceneGroupRunId, sceneRunIds));
        await db.delete(sceneGroupRunsTable).where(inArray(sceneGroupRunsTable.id, sceneRunIds));
      }

      if (sceneFrameIds.length > 0) {
        await db
          .delete(sceneFrameReferencesTable)
          .where(inArray(sceneFrameReferencesTable.sceneFrameId, sceneFrameIds));
        await db.delete(sceneFramesTable).where(inArray(sceneFramesTable.id, sceneFrameIds));
      }

      await db.delete(sceneGroupsTable).where(inArray(sceneGroupsTable.id, sceneGroupIds));
    }

    const directorChats = await db
      .select({ id: directorChatsTable.id })
      .from(directorChatsTable)
      .where(inArray(directorChatsTable.threadId, threadIds));
    const directorChatIds = directorChats.map((chat) => chat.id);

    if (directorChatIds.length > 0) {
      await db.delete(directorMessagesTable).where(inArray(directorMessagesTable.chatId, directorChatIds));
      await db.delete(directorChatsTable).where(inArray(directorChatsTable.id, directorChatIds));
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
          'Print that JSON line directly to stdout yourself.',
          'Do not use shell commands, exec, tool calls, or helper scripts to emit the scene plan.',
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

function buildCodexSceneStructuringPrompt(sourceText) {
  return [
    'You are restructuring a pasted scene document for an Electron app.',
    'Return exactly one JSON object and nothing else.',
    'Do not use markdown fences.',
    'Do not call tools.',
    'Do not run shell commands.',
    'Extract the general scene description and every frame prompt from the pasted document.',
    'If the document contains both Portuguese and English versions, prefer the English frame prompts.',
    'If the general scene description is only in Portuguese, translate it to English.',
    'All output text must be in English.',
    'Preserve character @mentions exactly when they appear.',
    'Output JSON in this exact shape:',
    '{"sceneDescription":"string","frames":[{"prompt":"string"}]}',
    'Include one frames entry for each frame found in the source, in order.',
    'If a frame title exists, do not output it separately; keep only the prompt text.',
    '',
    'Source document:',
    sourceText,
  ].join('\n');
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

function parseStructuredJsonObject(outputText) {
  const trimmed = outputText.trim();
  if (!trimmed) {
    throw new Error('Codex returned an empty response.');
  }

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1].trim());
  }

  throw new Error('Codex did not return valid JSON.');
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
    args.push('-c', 'features.fast_mode=true');
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

function runCodexJob({
  jobId,
  clientRunId,
  workingDirectory,
  prompt,
  requestedCount = 1,
  threadId,
  fastMode = false,
  model,
  onScenePlan,
  onCancelableRun,
}) {
  return new Promise((resolve) => {
    const logPrefix = `[crenv:codex:${jobId}]`;
    const startedAtMs = Date.now();
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
    let cancellationRequested = false;
    let firstStdoutAtMs = null;
    let firstStderrAtMs = null;

    console.info(`${logPrefix} spawn: codex ${codexArgs.join(' ')}`);
    console.info(`${logPrefix} cwd: ${workingDirectory}`);
    console.info(`${logPrefix} pid: ${child.pid ?? 'unknown'}`);
    onCancelableRun?.({
      jobId,
      cancel(reason = 'user_requested') {
        if (child.exitCode !== null || child.killed) {
          return false;
        }

        cancellationRequested = true;
        console.warn(`${logPrefix} cancel requested (${reason}) ${formatTraceElapsedMs(startedAtMs)}`);
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null && !child.killed) {
            console.warn(`${logPrefix} cancel escalation: SIGKILL ${formatTraceElapsedMs(startedAtMs)}`);
            child.kill('SIGKILL');
          }
        }, CANCEL_EXIT_GRACE_MS).unref();
        return true;
      },
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (firstStdoutAtMs === null) {
        firstStdoutAtMs = Date.now();
        console.info(`${logPrefix} first stdout ${formatTraceElapsedMs(startedAtMs)}`);
      }
      if (CODEX_DEEP_TRACE_ENABLED) {
        console.info(`${logPrefix} stdout chunk (${text.length} chars) ${formatTraceElapsedMs(startedAtMs)}`);
      }
      stdoutLineBuffer += text;
      const lines = stdoutLineBuffer.split('\n');
      stdoutLineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        processStdoutLine(line);
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (firstStderrAtMs === null) {
        firstStderrAtMs = Date.now();
        console.info(`${logPrefix} first stderr ${formatTraceElapsedMs(startedAtMs)}`);
      }
      if (CODEX_DEEP_TRACE_ENABLED) {
        console.info(`${logPrefix} stderr chunk (${text.length} chars) ${formatTraceElapsedMs(startedAtMs)}`);
      }
      stderr += text;
      for (const line of text.split('\n')) {
        if (line.trim()) {
          processPotentialScenePlan(line);
          const traceKind = classifyCodexTraceLine(line);
          console.error(`${logPrefix} stderr:${traceKind}: ${line}`);
        }
      }
    });

    child.on('error', (error) => {
      console.error(`${logPrefix} process error ${formatTraceElapsedMs(startedAtMs)}: ${error.message}`);
      resolve({
        success: false,
        errorMessage: error.code === 'ENOENT' ? 'Codex CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code, signal) => {
      if (stdoutLineBuffer.trim()) {
        processStdoutLine(stdoutLineBuffer);
      }

      if (code === 0) {
        console.info(`${logPrefix} process exited successfully ${formatTraceElapsedMs(startedAtMs)}`);
        resolve({ success: true });
        return;
      }

      if (cancellationRequested) {
        console.warn(`${logPrefix} process canceled ${formatTraceElapsedMs(startedAtMs)} signal=${signal ?? 'none'}`);
        resolve({
          success: false,
          canceled: true,
          errorMessage: 'Generation canceled.',
        });
        return;
      }

      const errorMessage = stderr.trim() || stdout.trim() || `Codex exited with code ${code}.`;
      console.error(`${logPrefix} process exited with code ${code} ${formatTraceElapsedMs(startedAtMs)}`);
      resolve({
        success: false,
        errorMessage,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
    console.info(`${logPrefix} stdin:end ${formatTraceElapsedMs(startedAtMs)}`);

    function processStdoutLine(line) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return;
      }

      if (processPotentialScenePlan(trimmedLine)) {
        return;
      }

      stdout += `${line}\n`;
      const traceKind = classifyCodexTraceLine(line);
      console.info(`${logPrefix} stdout:${traceKind}: ${line}`);
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

function runCodexTextStreamJob({
  jobId,
  workingDirectory,
  prompt,
  fastMode = false,
  model,
  onCancelableRun,
  onDelta,
}) {
  return new Promise((resolve) => {
    const logPrefix = `[crenv:codex:${jobId}:director]`;
    const startedAtMs = Date.now();
    const env = buildCodexSpawnEnv(workingDirectory);
    const codexArgs = buildCodexExecArgs({ model, fastMode });

    for (const directoryPath of [env.XDG_CACHE_HOME, env.XDG_CONFIG_HOME, env.XDG_STATE_HOME, env.TMPDIR]) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const child = spawn('codex', codexArgs, {
      cwd: workingDirectory,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let stderr = '';
    let cancellationRequested = false;

    console.info(`${logPrefix} spawn: codex ${codexArgs.join(' ')}`);
    onCancelableRun?.({
      jobId,
      cancel(reason = 'user_requested') {
        if (child.exitCode !== null || child.killed) {
          return false;
        }

        cancellationRequested = true;
        console.warn(`${logPrefix} cancel requested (${reason}) ${formatTraceElapsedMs(startedAtMs)}`);
        child.kill('SIGTERM');
        setTimeout(() => {
          if (child.exitCode === null && !child.killed) {
            child.kill('SIGKILL');
          }
        }, CANCEL_EXIT_GRACE_MS).unref();
        return true;
      },
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (!text) return;
      output += text;
      onDelta?.(text, output);
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output,
        errorMessage: error.code === 'ENOENT' ? 'Codex CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output,
        });
        return;
      }

      if (cancellationRequested) {
        resolve({
          success: false,
          canceled: true,
          output,
          errorMessage: 'Director chat canceled.',
        });
        return;
      }

      resolve({
        success: false,
        output,
        errorMessage: stderr.trim() || output.trim() || `Codex exited with code ${code}.`,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function runCodexStructuredOutputJob({ jobId, workingDirectory, prompt, model }) {
  return new Promise((resolve) => {
    const logPrefix = `[crenv:codex:${jobId}]`;
    const startedAtMs = Date.now();
    const env = buildCodexSpawnEnv(workingDirectory);
    const codexArgs = buildCodexExecArgs({ model, fastMode: false });

    for (const directoryPath of [env.XDG_CACHE_HOME, env.XDG_CONFIG_HOME, env.XDG_STATE_HOME, env.TMPDIR]) {
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

    console.info(`${logPrefix} structured spawn: codex ${codexArgs.join(' ')}`);
    console.info(`${logPrefix} structured cwd: ${workingDirectory}`);
    console.info(`${logPrefix} structured pid: ${child.pid ?? 'unknown'}`);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutLineBuffer += text;
      const lines = stdoutLineBuffer.split('\n');
      stdoutLineBuffer = lines.pop() ?? '';

      if (CODEX_DEEP_TRACE_ENABLED) {
        console.info(`${logPrefix} structured stdout chunk (${text.length} chars) ${formatTraceElapsedMs(startedAtMs)}`);
      }
      for (const line of lines) {
        if (!line.trim()) continue;
        console.info(`${logPrefix} structured stdout:${classifyCodexTraceLine(line)}: ${line}`);
      }
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (CODEX_DEEP_TRACE_ENABLED) {
        console.info(`${logPrefix} structured stderr chunk (${text.length} chars) ${formatTraceElapsedMs(startedAtMs)}`);
      }
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        console.error(`${logPrefix} structured stderr:${classifyCodexTraceLine(line)}: ${line}`);
      }
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        errorMessage: error.code === 'ENOENT' ? 'Codex CLI is not installed.' : error.message,
      });
    });

    child.on('close', (code) => {
      if (stdoutLineBuffer.trim()) {
        console.info(
          `${logPrefix} structured stdout:${classifyCodexTraceLine(stdoutLineBuffer)}: ${stdoutLineBuffer}`
        );
      }

      if (code === 0) {
        resolve({
          success: true,
          output: stdout,
        });
        return;
      }

      resolve({
        success: false,
        errorMessage: stderr.trim() || stdout.trim() || `Codex exited with code ${code}.`,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
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
    buildCodexImageGenerationPrompt,
    buildCodexSceneStructuringPrompt,
    buildCodexExecArgs,
    classifyCodexTraceLine,
    buildAntigravitySpawnEnv,
    buildCodexSpawnEnv,
    buildSceneFrameGenerationTasks,
    buildSceneFramePrompt,
    buildDirectorChatPrompt,
    prepareAntigravityHomeDirectory,
    parseImageManifestLine,
    parseScenePlanLine,
    parseGenerationReferenceMetadata,
    resolveAntigravityCloseResult,
    resolveJobWorkingDirectory,
    resolveGenerationSelection,
    truncateDirectorChatTitle,
    toGenerationReferenceMetadata,
    toRendererAsset,
  },
};
