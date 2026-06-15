const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');

const { nanoid } = require('nanoid');
const { createClient } = require('@libsql/client/node');
const { and, desc, eq, inArray, sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/libsql');
const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const yazl = require('yazl');
const yauzl = require('yauzl');
const { runImageGenerationBatch } = require('./features/generation/codexOutput.cjs');
const {
  createAiSdkDirectorChatTitle,
  createAiSdkDirectorPartStream,
  getTextFromParts,
  toDirectorModelMessages,
} = require('./features/generation/directorAiSdk.cjs');
const { buildSkillCatalogPrompt } = require('./features/generation/skills.cjs');

const DEFAULT_PROJECT_NAME = 'Documents';
const DEFAULT_THREAD_NAME = 'New Thread';
const MANUAL_PROJECT_NAME = 'New Project';
const DEFAULT_SCENE_FRAME_CONCURRENCY = 3;
const MAX_SCENE_FRAME_CONCURRENCY = 6;
const DIRECTOR_MODEL_OPTIONS = [
  {
    id: 'google-gemini-3-5-flash',
    label: 'Gemini 3.5 Flash',
    providerId: 'google',
    runtimeModel: 'gemini-3.5-flash',
  },
  {
    id: 'google-gemini-3-1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    providerId: 'google',
    runtimeModel: 'gemini-3.1-flash-lite-preview',
  },
  {
    id: 'google-gemini-3-pro',
    label: 'Gemini 3 Pro',
    providerId: 'google',
    runtimeModel: 'gemini-3-pro-preview',
  },
  {
    id: 'anthropic-claude-opus-4-8',
    label: 'Claude Opus 4.8',
    providerId: 'anthropic',
    runtimeModel: 'claude-opus-4-8',
    supportsReasoningEffort: true,
  },
  {
    id: 'anthropic-claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    providerId: 'anthropic',
    runtimeModel: 'claude-sonnet-4-6',
    supportsReasoningEffort: true,
  },
  {
    id: 'anthropic-claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    providerId: 'anthropic',
    runtimeModel: 'claude-haiku-4-5',
    supportsReasoningEffort: false,
  },
];
const DEFAULT_DIRECTOR_MODEL_ID = 'google-gemini-3-5-flash';

function getStartupDurationMs(startedAt) {
  return Math.max(0, Date.now() - startedAt);
}

function logStartup(label, startedAt, fields = {}) {
  console.info(
    `[crenv:startup] ${label} ${JSON.stringify({
      durationMs: getStartupDurationMs(startedAt),
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) =>
          ['string', 'number', 'boolean'].includes(typeof value) || value === null
        )
      ),
    })}`
  );
}

const IMAGE_MODEL_OPTIONS = [
  {
    id: 'codex-gpt-5-4-mini',
    label: 'GPT Image (Codex)',
    providerId: 'codex',
    runtimeModel: 'gpt-5.4',
  },
];

function resolveDirectorModel(modelId) {
  return (
    DIRECTOR_MODEL_OPTIONS.find((model) => model.id === modelId) ??
    DIRECTOR_MODEL_OPTIONS.find((model) => model.id === DEFAULT_DIRECTOR_MODEL_ID) ??
    DIRECTOR_MODEL_OPTIONS[0]
  );
}

function resolveImageModel(modelId) {
  return IMAGE_MODEL_OPTIONS.find((model) => model.id === modelId) ?? IMAGE_MODEL_OPTIONS[0];
}

function normalizeDirectorPromptContent(content) {
  return String(content ?? '').trim();
}

const DIRECTOR_SYSTEM_PROMPT = [
  'You are Director for Imagen, a professional AI image and video editing studio.',
  'Respond with normal concise markdown by default.',
  'When the user explicitly wants one or more still images, call the generateImages tool.',
  'Do not claim that generation already happened before approval.',
  'Use @Reference names only when they are actually relevant.',
  buildSkillCatalogPrompt(),
]
  .filter(Boolean)
  .join('\n\n');

function parseDirectorParts(partsJson) {
  try {
    const parts = JSON.parse(partsJson || '[]');
    return Array.isArray(parts) ? parts : [];
  } catch {
    return [];
  }
}

function serializeDirectorParts(parts) {
  return JSON.stringify(Array.isArray(parts) ? parts : []);
}

function getDirectorMessageText(message) {
  return getTextFromParts(message?.parts ?? parseDirectorParts(message?.partsJson));
}

function buildDirectorMessages({ previousMessages, prompt, referenceImages }) {
  const messages = [{ role: 'system', content: DIRECTOR_SYSTEM_PROMPT }, ...toDirectorModelMessages(
    previousMessages
      .filter((message) => message?.status === 'completed')
      .map((message) => ({
        ...message,
        parts: message.parts ?? parseDirectorParts(message.partsJson),
      }))
  )];

  if (referenceImages.length === 0) {
    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  messages.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: [
          prompt,
          '',
          'Attached reference metadata:',
          ...referenceImages.map((reference, index) =>
            [
              `${index + 1}. ${reference.title || reference.name}`,
              reference.description ? ` - ${reference.description}` : '',
            ].join('')
          ),
        ].join('\n'),
      },
      ...referenceImages
        .filter((reference) => typeof reference.bytesBase64 === 'string' && reference.bytesBase64.length > 0)
        .map((reference) => ({
          type: 'image',
          image: `data:${reference.mimeType || 'image/png'};base64,${reference.bytesBase64}`,
        })),
    ],
  });

  return messages;
}

function normalizeDirectorReferenceLabel(value) {
  return String(value ?? '')
    .replace(/^@+/, '')
    .trim()
    .toLowerCase();
}

function extractDirectorErrorMessageCandidate(value, depth = 0) {
  if (depth > 4 || value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.includes('This model is currently experiencing high demand')) {
      return trimmed;
    }

    try {
      return extractDirectorErrorMessageCandidate(JSON.parse(trimmed), depth + 1);
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = extractDirectorErrorMessageCandidate(entry, depth + 1);
      if (match) {
        return match;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const match = extractDirectorErrorMessageCandidate(entry, depth + 1);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function normalizeDirectorErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const candidate = extractDirectorErrorMessageCandidate(rawMessage) ?? rawMessage;
  if (candidate.includes('This model is currently experiencing high demand')) {
    return 'Gemini is temporarily unavailable due to high demand. Try again in a moment.';
  }
  return candidate;
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
    'This output is a static keyframe for later animation in Seedance.',
    'The later seedance-macal stage will use this frame as a reference image, so make identity, environment, pose, lighting, and composition stable enough for Seedance-ready planning.',
    'Reference discipline:',
    '- References are authoritative anchors, not loose inspiration.',
    '- If text conflicts with references, references win for identity, layout, materials, palette, and fixed prop placement.',
    '- Change only the camera angle, framing, expression, pose, action beat, or local edit requested by this target frame.',
    '- Preserve visible character face shape, proportions, wardrobe, hair silhouette, palette, and distinguishing marks.',
    '- Preserve environment geometry, materials, object positions, lighting direction, scale, and local texture continuity.',
    '- Do not average, blend, or redesign identities when several references are attached; assign each reference a clear role.',
    'Keep environment identity, materials, layout, lighting direction, palette, and character continuity stable.',
    'Use environment coverage plates and closest detail plates for the visible area; preserve local textures, trim, props, and fixed object placement.',
    'Keep visible character identity locked to character sheets: face shape, proportions, wardrobe, hair silhouette, palette, and distinguishing details.',
    'Give visible characters a clear performance beat: emotion, eye line, expression, posture, weight shift, hand occupation, walk phase, and interaction with the set.',
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

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

async function runWithConcurrencyLimit(items, limit, worker) {
  const normalizedLimit = clampInteger(limit, 1, Math.max(items.length, 1), 1);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(normalizedLimit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runNext));
  return results;
}

function resolveSceneFrameConcurrencyLimit(taskCount) {
  if (taskCount <= 1) {
    return 1;
  }
  return Math.min(
    taskCount,
    clampInteger(
      process.env.CRENV_SCENE_FRAME_CONCURRENCY,
      1,
      MAX_SCENE_FRAME_CONCURRENCY,
      DEFAULT_SCENE_FRAME_CONCURRENCY
    )
  );
}

function normalizeSceneLookupText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildDirectorSceneContextLines(sceneGroups) {
  if (!Array.isArray(sceneGroups) || sceneGroups.length === 0) {
    return ['Existing editable scenes: none yet.'];
  }

  const lines = ['Existing editable scenes and frames:'];
  for (const sceneGroup of sceneGroups.slice(0, 12)) {
    lines.push(
      `- sceneGroupId=${sceneGroup.id}; title="${sceneGroup.title}"; prompt="${String(sceneGroup.prompt ?? '').slice(0, 320)}"`
    );
    for (const frame of (sceneGroup.frames ?? []).slice(0, 36)) {
      lines.push(
        `  - frameId=${frame.id}; title="${frame.title}"; prompt="${String(frame.prompt ?? '').slice(0, 260)}"; generatedAssets=${(frame.assets ?? []).length}`
      );
    }
  }
  return lines;
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
  providerThreadId: text('provider_thread_id'),
  providerTurnId: text('provider_turn_id'),
  requestStartedAt: text('request_started_at'),
  firstEventAt: text('first_event_at'),
  imageToolCallStartedAt: text('image_tool_call_started_at'),
  imageToolGeneratingAt: text('image_tool_generating_at'),
  firstPartialImageAt: text('first_partial_image_at'),
  completedAt: text('completed_at'),
  runtime: text('runtime').notNull().default('api-backend'),
  importedCount: integer('imported_count').notNull().default(0),
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
  providerImageId: text('provider_image_id'),
  outputIndex: integer('output_index'),
  reviewStatus: text('review_status'),
  favorite: integer('favorite').notNull().default(0),
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
  parentFolderId: text('parent_folder_id'),
  voiceUrl: text('voice_url'),
  createdAt: text('created_at').notNull(),
});

const characterReferenceAttachmentsTable = sqliteTable('character_reference_attachments', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => characterReferenceCollectionsTable.id),
  name: text('name').notNull(),
  title: text('title'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const objectReferenceCollectionsTable = sqliteTable('object_reference_collections', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  parentFolderId: text('parent_folder_id'),
  createdAt: text('created_at').notNull(),
});

const objectReferenceAttachmentsTable = sqliteTable('object_reference_attachments', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => objectReferenceCollectionsTable.id),
  name: text('name').notNull(),
  title: text('title'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

const environmentReferencesTable = sqliteTable('environment_references', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  parentFolderId: text('parent_folder_id'),
  createdAt: text('created_at').notNull(),
});

const environmentReferenceAttachmentsTable = sqliteTable('environment_reference_attachments', {
  id: text('id').primaryKey(),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environmentReferencesTable.id),
  name: text('name').notNull(),
  title: text('title'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  description: text('description'),
  section: text('section').notNull(),
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
  providerThreadId: text('provider_thread_id'),
  providerRuntime: text('provider_runtime').notNull().default('api-backend'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

const directorMessagesTable = sqliteTable('director_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => directorChatsTable.id),
  role: text('role').notNull(),
  partsJson: text('parts_json').notNull(),
  status: text('status').notNull(),
  modelId: text('model_id'),
  modelLabel: text('model_label'),
  fastMode: integer('fast_mode').notNull().default(0),
  referenceImagesJson: text('reference_images_json'),
  messageOrder: integer('message_order'),
  providerTurnId: text('provider_turn_id'),
  providerItemId: text('provider_item_id'),
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
    provider_thread_id TEXT,
    provider_turn_id TEXT,
    request_started_at TEXT,
    first_event_at TEXT,
    image_tool_call_started_at TEXT,
    image_tool_generating_at TEXT,
    first_partial_image_at TEXT,
    completed_at TEXT,
    runtime TEXT NOT NULL DEFAULT 'api-backend',
    imported_count INTEGER NOT NULL DEFAULT 0,
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
    provider_image_id TEXT,
    output_index INTEGER,
    review_status TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
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
    parent_folder_id TEXT,
    voice_url TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_CHARACTER_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS character_reference_attachments (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
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
    parent_folder_id TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_OBJECT_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS object_reference_attachments (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
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
    parent_folder_id TEXT,
    created_at TEXT NOT NULL
  )
`;

const CREATE_ENVIRONMENT_REFERENCE_ATTACHMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS environment_reference_attachments (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    mime_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    description TEXT,
    section TEXT NOT NULL DEFAULT 'angles',
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
    provider_thread_id TEXT,
    provider_runtime TEXT NOT NULL DEFAULT 'api-backend',
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
    parts_json TEXT NOT NULL,
    status TEXT NOT NULL,
    model_id TEXT,
    model_label TEXT,
    fast_mode INTEGER NOT NULL DEFAULT 0,
    reference_images_json TEXT,
    message_order INTEGER,
    provider_turn_id TEXT,
    provider_item_id TEXT,
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
    generationJobsTempDir: path.join(userDataDir, 'tmp', 'generation-jobs'),
  };
}

function sanitizeArchiveSegment(value, fallback = 'asset') {
  const sanitized = String(value ?? '')
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || fallback;
}

function getExportAssetArchivePath(kind, asset) {
  const directory =
    kind === 'scene'
      ? 'assets/scenes'
      : kind === 'reference' || kind === 'scene-reference'
      ? 'assets/references'
      : 'assets/generated';
  const fileName = sanitizeArchiveSegment(asset.fileName ?? asset.name ?? `${asset.id}.bin`, `${asset.id}.bin`);
  return `${directory}/${sanitizeArchiveSegment(asset.id, 'asset')}-${fileName}`;
}

async function collectFileAssetEntry({ type, id, sourcePath, archivePath }) {
  try {
    await fsp.access(sourcePath);
    return {
      entry: {
        type,
        id,
        sourcePath,
        archivePath,
      },
      missing: null,
    };
  } catch {
    return {
      entry: null,
      missing: {
        id,
        type,
        sourcePath,
        archivePath,
      },
    };
  }
}

function collectBufferAssetEntry({ type, id, bytesBase64, archivePath }) {
  return {
    type,
    id,
    archivePath,
    buffer: Buffer.from(bytesBase64 || '', 'base64'),
  };
}

async function writeExportArchive({ filePath, format, snapshot, exportedAt, sourceApp }) {
  const fileEntries = [];
  const bufferEntries = [];
  const assets = [];
  const missingAssets = [];

  for (const asset of snapshot.generatedAssets ?? []) {
    const archivePath = getExportAssetArchivePath('generated', asset);
    const collected = await collectFileAssetEntry({
      type: 'generated',
      id: asset.id,
      sourcePath: asset.storedPath,
      archivePath,
    });
    if (collected.entry) {
      fileEntries.push(collected.entry);
      assets.push({
        id: asset.id,
        type: 'generated',
        sourcePath: asset.storedPath,
        archivePath,
      });
    }
    if (collected.missing) {
      missingAssets.push(collected.missing);
    }
  }

  for (const asset of snapshot.sceneFrameAssets ?? []) {
    const archivePath = getExportAssetArchivePath('scene', asset);
    const collected = await collectFileAssetEntry({
      type: 'scene',
      id: asset.id,
      sourcePath: asset.storedPath,
      archivePath,
    });
    if (collected.entry) {
      fileEntries.push(collected.entry);
      assets.push({
        id: asset.id,
        type: 'scene',
        sourcePath: asset.storedPath,
        archivePath,
      });
    }
    if (collected.missing) {
      missingAssets.push(collected.missing);
    }
  }

  for (const reference of snapshot.references ?? []) {
    const archivePath = getExportAssetArchivePath('reference', reference);
    bufferEntries.push(
      collectBufferAssetEntry({
        type: 'reference',
        id: reference.id,
        bytesBase64: reference.bytesBase64,
        archivePath,
      })
    );
    assets.push({
      id: reference.id,
      type: 'reference',
      archivePath,
    });
  }

  for (const reference of snapshot.sceneFrameReferences ?? []) {
    const archivePath = getExportAssetArchivePath('scene-reference', reference);
    bufferEntries.push(
      collectBufferAssetEntry({
        type: 'scene-reference',
        id: reference.id,
        bytesBase64: reference.bytesBase64,
        archivePath,
      })
    );
    assets.push({
      id: reference.id,
      type: 'scene-reference',
      archivePath,
    });
  }

  const manifest = {
    format,
    version: 1,
    exportedAt: exportedAt ?? new Date().toISOString(),
    scope: snapshot.scope,
    sourceApp: sourceApp ?? null,
    data: snapshot,
    assets,
    missingAssets,
  };

  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  await new Promise((resolve, reject) => {
    const zipFile = new yazl.ZipFile();
    const output = fs.createWriteStream(filePath);

    output.on('close', resolve);
    output.on('error', reject);
    zipFile.outputStream.on('error', reject);
    zipFile.outputStream.pipe(output);

    zipFile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'data/manifest.json');
    for (const entry of fileEntries) {
      zipFile.addFile(entry.sourcePath, entry.archivePath);
    }
    for (const entry of bufferEntries) {
      zipFile.addBuffer(entry.buffer, entry.archivePath);
    }
    zipFile.end();
  });

  return {
    filePath,
    missingAssets,
  };
}

async function readZipArchiveEntries(filePath) {
  return new Promise((resolve, reject) => {
    const entries = new Map();
    yauzl.open(filePath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError) {
        reject(openError);
        return;
      }
      if (!zipFile) {
        reject(new Error('Failed to open archive.'));
        return;
      }

      zipFile.on('error', reject);
      zipFile.on('end', () => resolve(entries));
      zipFile.readEntry();
      zipFile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipFile.readEntry();
          return;
        }
        zipFile.openReadStream(entry, (streamError, readStream) => {
          if (streamError) {
            reject(streamError);
            return;
          }
          if (!readStream) {
            reject(new Error(`Failed to read archive entry ${entry.fileName}.`));
            return;
          }
          const chunks = [];
          readStream.on('data', (chunk) => chunks.push(chunk));
          readStream.on('error', reject);
          readStream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zipFile.readEntry();
          });
        });
      });
    });
  });
}

async function readExportManifestFromArchive(filePath, extensionLabel = 'export') {
  let entries;
  try {
    entries = await readZipArchiveEntries(filePath);
  } catch {
    throw new Error(`Selected file is not a valid ${extensionLabel} export archive.`);
  }
  const manifestBuffer = entries.get('data/manifest.json');
  if (!manifestBuffer) {
    throw new Error('Archive is missing data/manifest.json.');
  }

  const manifest = JSON.parse(manifestBuffer.toString('utf8'));
  return { manifest, entries };
}

function findArchiveAsset(manifest, type, id) {
  return Array.isArray(manifest.assets)
    ? manifest.assets.find((asset) => asset.type === type && asset.id === id)
    : null;
}

function extensionForImportedAsset(fileName, mimeType) {
  const extension = path.extname(fileName ?? '').toLowerCase();
  if (extension) return extension;
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.png';
}

function mimeTypeForImportedAsset(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  return 'image/png';
}

async function writeImportedAssetBuffer({ buffer, assetId, fileName, mimeType, generatedImagesDir }) {
  await fsp.mkdir(generatedImagesDir, { recursive: true });
  const storedFileName = `${assetId}${extensionForImportedAsset(fileName, mimeType)}`;
  const storedPath = path.join(generatedImagesDir, storedFileName);
  await fsp.writeFile(storedPath, buffer);
  return {
    fileName: storedFileName,
    storedPath,
  };
}

async function importGeneratedAssetFile({ sourcePath, generatedImagesDir }) {
  const buffer = await fsp.readFile(sourcePath);
  const assetId = nanoid();
  const mimeType = mimeTypeForImportedAsset(sourcePath);
  const imported = await writeImportedAssetBuffer({
    buffer,
    assetId,
    fileName: path.basename(sourcePath),
    mimeType,
    generatedImagesDir,
  });
  return {
    id: assetId,
    fileName: imported.fileName,
    storedPath: imported.storedPath,
    mimeType,
  };
}

function mergeIsoTimestamp(currentValue, nextValue, prefer = 'earliest') {
  if (!nextValue) {
    return currentValue ?? null;
  }

  if (!currentValue) {
    return nextValue;
  }

  const currentTime = Date.parse(currentValue);
  const nextTime = Date.parse(nextValue);
  if (!Number.isFinite(currentTime) || !Number.isFinite(nextTime)) {
    return prefer === 'latest' ? nextValue : currentValue;
  }

  if (prefer === 'latest') {
    return nextTime > currentTime ? nextValue : currentValue;
  }

  return nextTime < currentTime ? nextValue : currentValue;
}

function toGenerationBenchmarkPatch(currentJob, benchmark = {}) {
  return {
    requestStartedAt: mergeIsoTimestamp(currentJob.requestStartedAt, benchmark.requestStartedAt),
    firstEventAt: mergeIsoTimestamp(currentJob.firstEventAt, benchmark.firstEventAt),
    imageToolCallStartedAt: mergeIsoTimestamp(currentJob.imageToolCallStartedAt, benchmark.imageToolCallStartedAt),
    imageToolGeneratingAt: mergeIsoTimestamp(currentJob.imageToolGeneratingAt, benchmark.imageToolGeneratingAt),
    firstPartialImageAt: mergeIsoTimestamp(currentJob.firstPartialImageAt, benchmark.firstPartialImageAt),
    completedAt: mergeIsoTimestamp(currentJob.completedAt, benchmark.completedAt, 'latest'),
  };
}

function truncateGenerationLogText(value, maxLength = 140) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function summarizeGenerationReferenceForLog(reference, index) {
  return {
    index: index + 1,
    name: reference?.name ?? `reference-${index + 1}`,
    mimeType: reference?.mimeType ?? 'image/png',
    title: reference?.title ? truncateGenerationLogText(reference.title, 80) : null,
    description: reference?.description ? truncateGenerationLogText(reference.description, 120) : null,
    hasInlineBytes: typeof reference?.bytesBase64 === 'string' && reference.bytesBase64.length > 0,
  };
}

function sanitizeReferenceImageFileName(name, mimeType, index) {
  const rawBaseName = path.basename(name, path.extname(name));
  const baseName =
    rawBaseName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `reference-${index + 1}`;
  const extension = path.extname(name).toLowerCase() || extensionForImportedAsset(name, mimeType);
  return `${baseName}${extension}`;
}

async function stageReferenceImages({ workingDirectory, referenceImages }) {
  if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
    return [];
  }

  const referencesDirectory = path.join(workingDirectory, 'references');
  await fsp.mkdir(referencesDirectory, { recursive: true });

  const stagedReferences = [];
  for (const [index, referenceImage] of referenceImages.entries()) {
    const fileName = sanitizeReferenceImageFileName(referenceImage.name, referenceImage.mimeType, index);
    const stagedPath = path.join(referencesDirectory, fileName);
    await fsp.writeFile(stagedPath, Buffer.from(referenceImage.bytesBase64, 'base64'));
    stagedReferences.push({
      path: stagedPath,
      title: referenceImage.title,
      description: referenceImage.description,
    });
  }

  return stagedReferences;
}

async function resetGenerationJobsDirectory(generationJobsTempDir) {
  await fsp.rm(generationJobsTempDir, { recursive: true, force: true });
  await fsp.mkdir(generationJobsTempDir, { recursive: true });
}

async function createGenerationStore(userDataDir, options = {}) {
  const storeStartupStartedAt = Date.now();
  const paths = getAppDataPaths(userDataDir);
  const activeSceneGroupCancellations = new Map();
  const activeDirectorChatCancellations = new Map();
  const createDirectorPartStream = options.createDirectorPartStream ?? createAiSdkDirectorPartStream;
  const generateDirectorChatTitle = options.generateDirectorChatTitle ?? createAiSdkDirectorChatTitle;
  const executeImageGenerationBatch = options.runImageGenerationBatch ?? runImageGenerationBatch;
  const getActiveCodexImageAuth = options.getActiveCodexImageAuth ?? (async () => null);
  const refreshAllCodexImageAccountLimits = options.refreshAllCodexImageAccountLimits ?? (async () => undefined);
  const directoriesStartedAt = Date.now();
  fs.mkdirSync(path.dirname(paths.databasePath), { recursive: true });
  logStartup('generation paths ready', directoriesStartedAt, {
    databasePath: paths.databasePath,
  });
  console.info('[crenv:generation] initialized store');
  console.info('[crenv:generation] userDataDir:', paths.userDataDir);
  console.info('[crenv:generation] databasePath:', paths.databasePath);
  console.info('[crenv:generation] generatedImagesDir:', paths.generatedImagesDir);

  const dbClientStartedAt = Date.now();
  const client = createClient({
    url: pathToFileURL(paths.databasePath).toString(),
  });
  const db = drizzle({ client });
  logStartup('generation db client created', dbClientStartedAt);

  const schemaStartedAt = Date.now();
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
  await ensureStructuredDirectorMessagesTable(db);
  logStartup('generation schema ensured', schemaStartedAt);

  const migrationsStartedAt = Date.now();
  await migrateLegacyReferencesTable(db);
  await ensureEnvironmentAttachmentDescriptionColumn(db);
  await ensureReferenceAttachmentTitleColumns(db);
  await ensureEnvironmentAttachmentSectionColumn(db);
  await ensureReferenceFolderParentColumns(db);
  await ensureCharacterVoiceUrlColumn(db);
  await ensureProjectSettingsColumns(db);
  await ensureGenerationJobsThreadColumn(db);
  await ensureGenerationJobMetadataColumns(db);
  await ensureGenerationRuntimeColumns(db);
  await ensureGenerationBenchmarkColumns(db);
  await ensureGeneratedAssetProviderColumns(db);
  await ensureDirectorRuntimeColumns(db);
  logStartup('generation migrations ensured', migrationsStartedAt);

  const interruptedJobsStartedAt = Date.now();
  await failInterruptedGenerationJobs(db);
  logStartup('generation interrupted jobs reconciled', interruptedJobsStartedAt);
  logStartup('generation store created', storeStartupStartedAt);

  async function ensureProjectThreadWorkspace() {
    const startedAt = Date.now();
    const projects = await listProjectsWithThreads();
    const firstProject = projects[0];

    if (!firstProject) {
      const project = await createProjectRecord(DEFAULT_PROJECT_NAME);
      const thread = await createThreadRecord(project.id);
      logStartup('generation ensure workspace completed', startedAt, {
        projectId: project.id,
        threadId: thread.id,
        createdProject: true,
      });
      return {
        project: { ...project, threads: [thread] },
        thread,
      };
    }

    const firstThread = firstProject.threads[0];
    if (firstThread) {
      logStartup('generation ensure workspace completed', startedAt, {
        projectId: firstProject.id,
        threadId: firstThread.id,
        createdProject: false,
      });
      return { project: firstProject, thread: firstThread };
    }

    const thread = await createThreadRecord(firstProject.id);
    logStartup('generation ensure workspace completed', startedAt, {
      projectId: firstProject.id,
      threadId: thread.id,
      createdThread: true,
    });
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
    const startedAt = Date.now();
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

    const result = projects.map((project) => ({
      ...project,
      threads: threadsByProjectId.get(project.id) ?? [],
    }));
    logStartup('generation listProjectsWithThreads completed', startedAt, {
      projects: result.length,
      threads: threads.length,
      runningThreads: runningThreadIds.size,
    });
    return result;
  }

  async function collectThreadExportRecords(threadIds) {
    if (threadIds.length === 0) {
      return {
        generationJobs: [],
        generatedAssets: [],
        directorChats: [],
        directorMessages: [],
        sceneGroups: [],
        sceneFrames: [],
        sceneFrameReferences: [],
        sceneGroupRuns: [],
        sceneFrameAssets: [],
      };
    }

    const generationJobs = await db
      .select()
      .from(generationJobsTable)
      .where(inArray(generationJobsTable.threadId, threadIds))
      .orderBy(generationJobsTable.createdAt, generationJobsTable.id);
    const generationJobIds = generationJobs.map((job) => job.id);
    const generatedAssets = generationJobIds.length
      ? await db
          .select()
          .from(generatedAssetsTable)
          .where(inArray(generatedAssetsTable.jobId, generationJobIds))
          .orderBy(generatedAssetsTable.createdAt, generatedAssetsTable.id)
      : [];

    const directorChats = await db
      .select()
      .from(directorChatsTable)
      .where(inArray(directorChatsTable.threadId, threadIds))
      .orderBy(directorChatsTable.createdAt, directorChatsTable.id);
    const directorChatIds = directorChats.map((chat) => chat.id);
    const directorMessages = directorChatIds.length
      ? await db
          .select()
          .from(directorMessagesTable)
          .where(inArray(directorMessagesTable.chatId, directorChatIds))
          .orderBy(directorMessagesTable.messageOrder, directorMessagesTable.createdAt, directorMessagesTable.id)
      : [];

    const sceneGroups = await db
      .select()
      .from(sceneGroupsTable)
      .where(inArray(sceneGroupsTable.threadId, threadIds))
      .orderBy(sceneGroupsTable.tocOrder, sceneGroupsTable.createdAt, sceneGroupsTable.id);
    const sceneGroupIds = sceneGroups.map((sceneGroup) => sceneGroup.id);
    const sceneFrames = sceneGroupIds.length
      ? await db
          .select()
          .from(sceneFramesTable)
          .where(inArray(sceneFramesTable.sceneGroupId, sceneGroupIds))
          .orderBy(sceneFramesTable.frameOrder, sceneFramesTable.createdAt, sceneFramesTable.id)
      : [];
    const sceneFrameIds = sceneFrames.map((sceneFrame) => sceneFrame.id);
    const sceneFrameReferences = sceneFrameIds.length
      ? await db
          .select()
          .from(sceneFrameReferencesTable)
          .where(inArray(sceneFrameReferencesTable.sceneFrameId, sceneFrameIds))
          .orderBy(sceneFrameReferencesTable.createdAt, sceneFrameReferencesTable.id)
      : [];
    const sceneGroupRuns = sceneGroupIds.length
      ? await db
          .select()
          .from(sceneGroupRunsTable)
          .where(inArray(sceneGroupRunsTable.sceneGroupId, sceneGroupIds))
          .orderBy(sceneGroupRunsTable.createdAt, sceneGroupRunsTable.id)
      : [];
    const sceneGroupRunIds = sceneGroupRuns.map((run) => run.id);
    const sceneFrameAssets = sceneGroupRunIds.length
      ? await db
          .select()
          .from(sceneFrameAssetsTable)
          .where(inArray(sceneFrameAssetsTable.sceneGroupRunId, sceneGroupRunIds))
          .orderBy(sceneFrameAssetsTable.outputIndex, sceneFrameAssetsTable.createdAt, sceneFrameAssetsTable.id)
      : [];

    return {
      generationJobs,
      generatedAssets,
      directorChats,
      directorMessages,
      sceneGroups,
      sceneFrames,
      sceneFrameReferences,
      sceneGroupRuns,
      sceneFrameAssets,
    };
  }

  async function createThreadExportSnapshot(threadId) {
    const [thread] = await db
      .select()
      .from(threadsTable)
      .where(eq(threadsTable.id, threadId))
      .limit(1);
    if (!thread) {
      throw new Error('Thread not found.');
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, thread.projectId))
      .limit(1);
    if (!project) {
      throw new Error('Project not found.');
    }

    return {
      scope: 'thread',
      project,
      threads: [thread],
      ...(await collectThreadExportRecords([thread.id])),
    };
  }

  async function createProjectExportSnapshot(projectId) {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!project) {
      throw new Error('Project not found.');
    }

    const threads = await db
      .select()
      .from(threadsTable)
      .where(eq(threadsTable.projectId, projectId))
      .orderBy(threadsTable.createdAt, threadsTable.id);

    return {
      scope: 'project',
      project,
      threads,
      ...(await collectThreadExportRecords(threads.map((thread) => thread.id))),
    };
  }

  async function createReferenceExportSnapshot(payload) {
    const category = normalizeReferenceCollectionCategory(payload?.category);
    const collectionId = payload?.collectionId ?? null;
    const environmentId = payload?.environmentId ?? collectionId ?? null;

    if (category === 'environment') {
      if (!environmentId) {
        throw new Error('Environment reference export requires environmentId.');
      }
      const [environment] = await db
        .select()
        .from(environmentReferencesTable)
        .where(eq(environmentReferencesTable.id, environmentId))
        .limit(1);
      if (!environment) {
        throw new Error('Reference not found.');
      }
      const attachments = await db
        .select()
        .from(environmentReferenceAttachmentsTable)
        .where(eq(environmentReferenceAttachmentsTable.environmentId, environmentId))
        .orderBy(environmentReferenceAttachmentsTable.createdAt, environmentReferenceAttachmentsTable.id);
      const references = attachments.map((attachment) => ({
        id: attachment.id,
        collectionId: environment.id,
        environmentId: environment.id,
        name: attachment.name,
        title: environment.title,
        description: attachment.description ?? environment.description ?? null,
        mimeType: attachment.mimeType,
        bytesBase64: attachment.bytesBase64,
        createdAt: attachment.createdAt,
        category: 'environment',
      }));
      return {
        scope: 'reference',
        reference: {
          id: environment.id,
          title: environment.title,
          description: environment.description,
          category: 'environment',
          collectionId: environment.id,
          environmentId: environment.id,
          createdAt: environment.createdAt,
        },
        references,
      };
    }

    if (collectionId) {
      const collectionTable =
        category === 'objects' ? objectReferenceCollectionsTable : characterReferenceCollectionsTable;
      const attachmentTable =
        category === 'objects' ? objectReferenceAttachmentsTable : characterReferenceAttachmentsTable;
      const [collection] = await db
        .select()
        .from(collectionTable)
        .where(eq(collectionTable.id, collectionId))
        .limit(1);
      if (!collection) {
        throw new Error('Reference not found.');
      }
      const attachments = await db
        .select()
        .from(attachmentTable)
        .where(eq(attachmentTable.collectionId, collectionId))
        .orderBy(attachmentTable.createdAt, attachmentTable.id);
      const references = attachments.map((attachment) => ({
        id: attachment.id,
        collectionId,
        environmentId: null,
        name: attachment.name,
        title: collection.title,
        description: attachment.description ?? collection.description ?? null,
        mimeType: attachment.mimeType,
        bytesBase64: attachment.bytesBase64,
        createdAt: attachment.createdAt,
        category,
      }));
      return {
        scope: 'reference',
        reference: {
          id: collection.id,
          title: collection.title,
          description: collection.description,
          category,
          collectionId,
          environmentId: null,
          createdAt: collection.createdAt,
        },
        references,
      };
    }

    const table = category === 'objects' ? objectReferencesTable : characterReferencesTable;
    const [reference] = await db
      .select()
      .from(table)
      .where(eq(table.id, payload?.id))
      .limit(1);
    if (!reference) {
      throw new Error('Reference not found.');
    }
    return {
      scope: 'reference',
      reference: {
        id: reference.id,
        title: reference.title,
        description: reference.description,
        category,
        collectionId: null,
        environmentId: null,
        createdAt: reference.createdAt,
      },
      references: [
        {
          ...reference,
          category,
          collectionId: null,
          environmentId: null,
        },
      ],
    };
  }

  async function exportProject(projectId, filePath, options = {}) {
    const snapshot = await createProjectExportSnapshot(projectId);
    return writeExportArchive({
      filePath,
      format: 'crenv',
      snapshot,
      exportedAt: options.exportedAt,
      sourceApp: options.sourceApp,
    });
  }

  async function exportThread(threadId, filePath, options = {}) {
    const snapshot = await createThreadExportSnapshot(threadId);
    return writeExportArchive({
      filePath,
      format: 'crenv',
      snapshot,
      exportedAt: options.exportedAt,
      sourceApp: options.sourceApp,
    });
  }

  async function exportReference(payload, filePath, options = {}) {
    const snapshot = await createReferenceExportSnapshot(payload);
    return writeExportArchive({
      filePath,
      format: 'refc',
      snapshot,
      exportedAt: options.exportedAt,
      sourceApp: options.sourceApp,
    });
  }

  async function importCrenvArchive(filePath, importOptions = {}) {
    const { manifest, entries } = await readExportManifestFromArchive(filePath, '.crenv');
    if (manifest.format !== 'crenv' || manifest.version !== 1) {
      throw new Error('Unsupported .crenv archive.');
    }

    const snapshot = manifest.data;
    if (!snapshot || (snapshot.scope !== 'project' && snapshot.scope !== 'thread')) {
      throw new Error('Archive does not contain a project or thread export.');
    }

    const timestamp = new Date().toISOString();
    const projectIdMap = new Map();
    const threadIdMap = new Map();
    const jobIdMap = new Map();
    const assetIdMap = new Map();
    const chatIdMap = new Map();
    const messageIdMap = new Map();
    const sceneGroupIdMap = new Map();
    const sceneFrameIdMap = new Map();
    const sceneRunIdMap = new Map();

    let targetProjectId = null;
    if (snapshot.scope === 'project') {
      const importedProjectId = nanoid();
      projectIdMap.set(snapshot.project.id, importedProjectId);
      targetProjectId = importedProjectId;
      await db.insert(projectsTable).values({
        id: importedProjectId,
        name: snapshot.project.name || 'Imported Project',
        systemInstructions: snapshot.project.systemInstructions ?? '',
        artStyle: snapshot.project.artStyle ?? '',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      targetProjectId = importOptions.targetProjectId;
      if (!targetProjectId) {
        throw new Error('Thread import requires a target project.');
      }
      const [targetProject] = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.id, targetProjectId))
        .limit(1);
      if (!targetProject) {
        throw new Error('Target project not found.');
      }
      if (snapshot.project?.id) {
        projectIdMap.set(snapshot.project.id, targetProjectId);
      }
    }

    const importedThreads = [];
    for (const thread of snapshot.threads ?? []) {
      const importedThreadId = nanoid();
      threadIdMap.set(thread.id, importedThreadId);
      importedThreads.push(importedThreadId);
      await db.insert(threadsTable).values({
        id: importedThreadId,
        projectId: snapshot.scope === 'project' ? projectIdMap.get(thread.projectId) ?? targetProjectId : targetProjectId,
        name: thread.name || 'Imported Thread',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    for (const job of snapshot.generationJobs ?? []) {
      const importedThreadId = threadIdMap.get(job.threadId);
      if (!importedThreadId) continue;
      const importedJobId = nanoid();
      jobIdMap.set(job.id, importedJobId);
      await db.insert(generationJobsTable).values({
        id: importedJobId,
        threadId: importedThreadId,
        prompt: job.prompt ?? '',
        requestedCount: Number.isInteger(job.requestedCount) ? job.requestedCount : 1,
        status: job.status ?? 'succeeded',
        workingDirectory: '',
        manifestPath: '',
        errorMessage: job.errorMessage ?? null,
        provider: job.provider ?? null,
        modelId: job.modelId ?? null,
        modelLabel: job.modelLabel ?? null,
        referenceImagesJson: job.referenceImagesJson ?? null,
        durationMs: Number.isInteger(job.durationMs) ? job.durationMs : null,
        providerThreadId: job.providerThreadId ?? null,
        providerTurnId: job.providerTurnId ?? null,
        runtime: job.runtime ?? 'imported',
        importedCount: Number.isInteger(job.importedCount) ? job.importedCount : 0,
        createdAt: job.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    }

    for (const asset of snapshot.generatedAssets ?? []) {
      const importedJobId = jobIdMap.get(asset.jobId);
      if (!importedJobId) continue;
      const archiveAsset = findArchiveAsset(manifest, 'generated', asset.id);
      const buffer = archiveAsset ? entries.get(archiveAsset.archivePath) : null;
      if (!buffer) continue;
      const importedAssetId = nanoid();
      assetIdMap.set(asset.id, importedAssetId);
      const imported = await writeImportedAssetBuffer({
        buffer,
        assetId: importedAssetId,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        generatedImagesDir: paths.generatedImagesDir,
      });
      await db.insert(generatedAssetsTable).values({
        id: importedAssetId,
        jobId: importedJobId,
        originalPath: asset.originalPath ?? '',
        storedPath: imported.storedPath,
        fileName: imported.fileName,
        mimeType: asset.mimeType ?? 'image/png',
        width: Number.isInteger(asset.width) ? asset.width : null,
        height: Number.isInteger(asset.height) ? asset.height : null,
        providerImageId: asset.providerImageId ?? null,
        outputIndex: Number.isInteger(asset.outputIndex) ? asset.outputIndex : null,
        reviewStatus: asset.reviewStatus ?? null,
        createdAt: asset.createdAt ?? timestamp,
      });
    }

    for (const chat of snapshot.directorChats ?? []) {
      const importedThreadId = threadIdMap.get(chat.threadId);
      if (!importedThreadId) continue;
      const importedChatId = nanoid();
      chatIdMap.set(chat.id, importedChatId);
      await db.insert(directorChatsTable).values({
        id: importedChatId,
        threadId: importedThreadId,
        title: chat.title ?? 'Imported chat',
        providerThreadId: chat.providerThreadId ?? null,
        providerRuntime: chat.providerRuntime ?? 'imported',
        createdAt: chat.createdAt ?? timestamp,
        updatedAt: chat.updatedAt ?? timestamp,
      });
    }

    for (const message of snapshot.directorMessages ?? []) {
      const importedChatId = chatIdMap.get(message.chatId);
      if (!importedChatId) continue;
      const importedMessageId = nanoid();
      messageIdMap.set(message.id, importedMessageId);
      await db.insert(directorMessagesTable).values({
        id: importedMessageId,
        chatId: importedChatId,
        role: message.role ?? 'assistant',
        partsJson: message.partsJson ?? serializeDirectorParts(message.parts),
        status: message.status ?? 'completed',
        modelId: message.modelId ?? null,
        modelLabel: message.modelLabel ?? null,
        fastMode: message.fastMode ? 1 : 0,
        referenceImagesJson: message.referenceImagesJson ?? null,
        messageOrder: Number.isInteger(message.messageOrder) ? message.messageOrder : null,
        providerTurnId: message.providerTurnId ?? null,
        providerItemId: message.providerItemId ?? null,
        createdAt: message.createdAt ?? timestamp,
        updatedAt: message.updatedAt ?? timestamp,
      });
    }

    for (const sceneGroup of snapshot.sceneGroups ?? []) {
      const importedThreadId = threadIdMap.get(sceneGroup.threadId);
      if (!importedThreadId) continue;
      const importedSceneGroupId = nanoid();
      sceneGroupIdMap.set(sceneGroup.id, importedSceneGroupId);
      await db.insert(sceneGroupsTable).values({
        id: importedSceneGroupId,
        threadId: importedThreadId,
        title: sceneGroup.title ?? 'Imported scene',
        prompt: sceneGroup.prompt ?? '',
        tocOrder: Number.isInteger(sceneGroup.tocOrder) ? sceneGroup.tocOrder : 1,
        createdAt: sceneGroup.createdAt ?? timestamp,
        updatedAt: sceneGroup.updatedAt ?? timestamp,
      });
    }

    for (const sceneFrame of snapshot.sceneFrames ?? []) {
      const importedSceneGroupId = sceneGroupIdMap.get(sceneFrame.sceneGroupId);
      if (!importedSceneGroupId) continue;
      const importedSceneFrameId = nanoid();
      sceneFrameIdMap.set(sceneFrame.id, importedSceneFrameId);
      await db.insert(sceneFramesTable).values({
        id: importedSceneFrameId,
        sceneGroupId: importedSceneGroupId,
        title: sceneFrame.title ?? 'Imported frame',
        prompt: sceneFrame.prompt ?? '',
        frameOrder: Number.isInteger(sceneFrame.frameOrder) ? sceneFrame.frameOrder : 1,
        createdAt: sceneFrame.createdAt ?? timestamp,
        updatedAt: sceneFrame.updatedAt ?? timestamp,
      });
    }

    for (const reference of snapshot.sceneFrameReferences ?? []) {
      const importedSceneFrameId = sceneFrameIdMap.get(reference.sceneFrameId);
      if (!importedSceneFrameId) continue;
      await db.insert(sceneFrameReferencesTable).values({
        id: nanoid(),
        sceneFrameId: importedSceneFrameId,
        referenceKind: reference.referenceKind ?? 'uploaded_attachment',
        referenceId: reference.referenceId ?? null,
        name: reference.name ?? 'reference.png',
        mimeType: reference.mimeType ?? 'image/png',
        bytesBase64: reference.bytesBase64 ?? '',
        createdAt: reference.createdAt ?? timestamp,
      });
    }

    for (const run of snapshot.sceneGroupRuns ?? []) {
      const importedSceneGroupId = sceneGroupIdMap.get(run.sceneGroupId);
      const importedThreadId = threadIdMap.get(run.threadId);
      if (!importedSceneGroupId || !importedThreadId) continue;
      const importedRunId = nanoid();
      sceneRunIdMap.set(run.id, importedRunId);
      await db.insert(sceneGroupRunsTable).values({
        id: importedRunId,
        sceneGroupId: importedSceneGroupId,
        threadId: importedThreadId,
        status: run.status ?? 'succeeded',
        provider: run.provider ?? 'api',
        modelId: run.modelId ?? 'unknown',
        modelLabel: run.modelLabel ?? 'Imported',
        requestedFrameCount: Number.isInteger(run.requestedFrameCount) ? run.requestedFrameCount : 0,
        errorMessage: run.errorMessage ?? null,
        durationMs: Number.isInteger(run.durationMs) ? run.durationMs : null,
        createdAt: run.createdAt ?? timestamp,
        updatedAt: run.updatedAt ?? timestamp,
      });
    }

    for (const asset of snapshot.sceneFrameAssets ?? []) {
      const importedRunId = sceneRunIdMap.get(asset.sceneGroupRunId);
      const importedSceneFrameId = sceneFrameIdMap.get(asset.sceneFrameId);
      if (!importedRunId || !importedSceneFrameId) continue;
      const archiveAsset = findArchiveAsset(manifest, 'scene', asset.id);
      const buffer = archiveAsset ? entries.get(archiveAsset.archivePath) : null;
      if (!buffer) continue;
      const importedAssetId = nanoid();
      const imported = await writeImportedAssetBuffer({
        buffer,
        assetId: importedAssetId,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        generatedImagesDir: paths.generatedImagesDir,
      });
      await db.insert(sceneFrameAssetsTable).values({
        id: importedAssetId,
        sceneGroupRunId: importedRunId,
        sceneFrameId: importedSceneFrameId,
        outputIndex: Number.isInteger(asset.outputIndex) ? asset.outputIndex : 0,
        originalPath: asset.originalPath ?? '',
        storedPath: imported.storedPath,
        fileName: imported.fileName,
        mimeType: asset.mimeType ?? 'image/png',
        width: Number.isInteger(asset.width) ? asset.width : null,
        height: Number.isInteger(asset.height) ? asset.height : null,
        createdAt: asset.createdAt ?? timestamp,
      });
    }

    return {
      status: 'imported',
      scope: snapshot.scope,
      projectId: targetProjectId,
      threadIds: importedThreads,
    };
  }

  async function importReferenceArchive(filePath) {
    const { manifest } = await readExportManifestFromArchive(filePath, '.refc');
    if (manifest.format !== 'refc' || manifest.version !== 1) {
      throw new Error('Unsupported .refc archive.');
    }
    const snapshot = manifest.data;
    if (!snapshot || snapshot.scope !== 'reference' || !Array.isArray(snapshot.references)) {
      throw new Error('Archive does not contain a reference export.');
    }

    const timestamp = new Date().toISOString();
    const category = normalizeReferenceCollectionCategory(snapshot.reference?.category);
    const title = snapshot.reference?.title || snapshot.references[0]?.title || 'Imported reference';
    const description = snapshot.reference?.description ?? snapshot.references[0]?.description ?? null;

    if (category === 'environment') {
      const environmentId = nanoid();
      await db.insert(environmentReferencesTable).values({
        id: environmentId,
        title,
        description,
        createdAt: timestamp,
      });
      const attachments = snapshot.references.map((reference) => ({
        id: nanoid(),
        environmentId,
        name: reference.name ?? 'reference.png',
        mimeType: reference.mimeType ?? 'image/png',
        bytesBase64: reference.bytesBase64 ?? '',
        description: reference.description ?? null,
        createdAt: reference.createdAt ?? timestamp,
      }));
      if (attachments.length > 0) {
        await db.insert(environmentReferenceAttachmentsTable).values(attachments);
      }
      return {
        status: 'imported',
        category: 'environment',
        collectionId: environmentId,
        environmentId,
        referenceIds: attachments.map((attachment) => attachment.id),
      };
    }

    const isCollection = Boolean(snapshot.reference?.collectionId) || snapshot.references.length > 1;
    if (isCollection) {
      const collectionId = nanoid();
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
      const attachments = snapshot.references.map((reference) => ({
        id: nanoid(),
        collectionId,
        name: reference.name ?? 'reference.png',
        mimeType: reference.mimeType ?? 'image/png',
        bytesBase64: reference.bytesBase64 ?? '',
        description: reference.description ?? null,
        createdAt: reference.createdAt ?? timestamp,
      }));
      if (attachments.length > 0) {
        await db.insert(attachmentTable).values(attachments);
      }
      return {
        status: 'imported',
        category,
        collectionId,
        environmentId: null,
        referenceIds: attachments.map((attachment) => attachment.id),
      };
    }

    const reference = snapshot.references[0];
    if (!reference) {
      throw new Error('Reference archive is empty.');
    }
    const referenceId = nanoid();
    const table = category === 'objects' ? objectReferencesTable : characterReferencesTable;
    await db.insert(table).values({
      id: referenceId,
      name: reference.name ?? 'reference.png',
      title,
      description,
      mimeType: reference.mimeType ?? 'image/png',
      bytesBase64: reference.bytesBase64 ?? '',
      createdAt: timestamp,
    });
    return {
      status: 'imported',
      category,
      collectionId: null,
      environmentId: null,
      referenceIds: [referenceId],
    };
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

  function normalizeReferenceAttachmentSection(section, fallback = 'angles') {
    return section === 'primary' || section === 'angles' ? section : fallback;
  }

function mapReferenceCollectionAttachment({
  attachment,
  category,
  collectionId,
  collectionTitle,
  collectionDescription,
  parentFolderId,
  timestamp,
}) {
  return {
    id: attachment.id ?? nanoid(),
    collectionId,
    name: attachment.name,
    title: attachment.title?.trim() || attachment.name,
    groupTitle: collectionTitle,
    description: attachment.description?.trim() || collectionDescription || null,
    groupDescription: collectionDescription,
    mimeType: attachment.mimeType || 'image/png',
    bytesBase64: attachment.bytesBase64,
    createdAt: timestamp,
    category,
    environmentId: category === 'environment' ? collectionId : null,
    parentFolderId: parentFolderId ?? null,
  };
}

async function listReferenceFolders() {
  const startedAt = Date.now();
  const [characterFolders, objectFolders, environmentFolders] = await Promise.all([
    db
      .select({
        id: characterReferenceCollectionsTable.id,
        title: characterReferenceCollectionsTable.title,
        description: characterReferenceCollectionsTable.description,
        parentFolderId: characterReferenceCollectionsTable.parentFolderId,
        voiceUrl: characterReferenceCollectionsTable.voiceUrl,
        createdAt: characterReferenceCollectionsTable.createdAt,
      })
      .from(characterReferenceCollectionsTable)
      .orderBy(desc(characterReferenceCollectionsTable.createdAt), desc(characterReferenceCollectionsTable.id)),
    db
      .select({
        id: objectReferenceCollectionsTable.id,
        title: objectReferenceCollectionsTable.title,
        description: objectReferenceCollectionsTable.description,
        parentFolderId: objectReferenceCollectionsTable.parentFolderId,
        createdAt: objectReferenceCollectionsTable.createdAt,
      })
      .from(objectReferenceCollectionsTable)
      .orderBy(desc(objectReferenceCollectionsTable.createdAt), desc(objectReferenceCollectionsTable.id)),
    db
      .select({
        id: environmentReferencesTable.id,
        title: environmentReferencesTable.title,
        description: environmentReferencesTable.description,
        parentFolderId: environmentReferencesTable.parentFolderId,
        createdAt: environmentReferencesTable.createdAt,
      })
      .from(environmentReferencesTable)
      .orderBy(desc(environmentReferencesTable.createdAt), desc(environmentReferencesTable.id)),
  ]);

  const folders = [
    ...characterFolders.map((folder) => ({ ...folder, category: 'characters' })),
    ...objectFolders.map((folder) => ({ ...folder, category: 'objects' })),
    ...environmentFolders.map((folder) => ({ ...folder, category: 'environment' })),
  ];
  logStartup('generation listReferenceFolders completed', startedAt, {
    folders: folders.length,
    characterFolders: characterFolders.length,
    objectFolders: objectFolders.length,
    environmentFolders: environmentFolders.length,
  });
  return folders;
}

  async function createReferenceFolder(payload) {
    const category = normalizeReferenceCollectionCategory(payload.category);
    const title = (payload.title ?? '').trim() || 'Nova pasta';
    const parentFolderId = payload?.parentFolderId ?? null;
    const timestamp = new Date().toISOString();

    if (category === 'environment') {
      const environmentId = nanoid();
      await db.insert(environmentReferencesTable).values({
        id: environmentId,
        title,
        description: null,
        parentFolderId,
        createdAt: timestamp,
      });
      return { id: environmentId, category: 'environment', title, parentFolderId, createdAt: timestamp };
    }

    const collectionTable =
      category === 'objects' ? objectReferenceCollectionsTable : characterReferenceCollectionsTable;
    const collectionId = nanoid();
    await db.insert(collectionTable).values({
      id: collectionId,
      title,
      description: null,
      parentFolderId,
      createdAt: timestamp,
    });
    return { id: collectionId, category, title, parentFolderId, createdAt: timestamp };
  }

  async function setCharacterVoiceUrl(payload) {
    const collectionId = payload?.collectionId;
    if (!collectionId) {
      throw new Error('setCharacterVoiceUrl requires a collectionId.');
    }
    const voiceUrl = (payload?.voiceUrl ?? '').trim() || null;
    await db
      .update(characterReferenceCollectionsTable)
      .set({ voiceUrl })
      .where(eq(characterReferenceCollectionsTable.id, collectionId));
    return { collectionId, voiceUrl };
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
      parentFolderId: null,
      createdAt: timestamp,
    });

    const attachments = payload.attachments.map((attachment) => ({
      id: nanoid(),
      collectionId,
      name: attachment.name,
      title: attachment.title?.trim() || attachment.name,
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
        parentFolderId: null,
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
      parentFolderId: null,
      createdAt: timestamp,
    });

    const attachments = payload.attachments.map((attachment, index) => ({
      id: nanoid(),
      environmentId,
      name: attachment.name,
      title: attachment.title?.trim() || attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      section: normalizeReferenceAttachmentSection(attachment.section, index === 0 ? 'primary' : 'angles'),
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
      title: attachment.title?.trim() || attachment.name,
      groupTitle: payload.title.trim(),
      description: attachment.description?.trim() || payload.description?.trim() || null,
      groupDescription: payload.description?.trim() || null,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: attachment.createdAt,
      category: 'environment',
      parentFolderId: null,
      section: attachment.section,
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
        section: firstAttachment.section,
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
      parentFolderId: null,
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

    const [environment] = await db
      .select({
        parentFolderId: environmentReferencesTable.parentFolderId,
      })
      .from(environmentReferencesTable)
      .where(eq(environmentReferencesTable.id, environmentId))
      .limit(1);

    await db
      .delete(environmentReferenceAttachmentsTable)
      .where(eq(environmentReferenceAttachmentsTable.environmentId, environmentId));

    const timestamp = new Date().toISOString();
    const attachments = (payload.attachments ?? []).map((attachment, index) => ({
      id: attachment.id ?? nanoid(),
      environmentId,
      name: attachment.name,
      title: attachment.title?.trim() || attachment.name,
      mimeType: attachment.mimeType || 'image/png',
      bytesBase64: attachment.bytesBase64,
      description: attachment.description?.trim() || null,
      section: normalizeReferenceAttachmentSection(attachment.section, index === 0 ? 'primary' : 'angles'),
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
      title: attachment.title?.trim() || attachment.name,
      groupTitle: title,
      description: attachment.description ?? description,
      groupDescription: description,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: attachment.createdAt,
      category: 'environment',
      parentFolderId: environment?.parentFolderId ?? null,
      section: attachment.section,
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

    const [collection] = await db
      .select({
        parentFolderId: collectionTable.parentFolderId,
      })
      .from(collectionTable)
      .where(eq(collectionTable.id, collectionId))
      .limit(1);

    await db.delete(attachmentTable).where(eq(attachmentTable.collectionId, collectionId));

    const timestamp = new Date().toISOString();
    const attachments = (payload.attachments ?? []).map((attachment) => ({
      id: attachment.id ?? nanoid(),
      collectionId,
      name: attachment.name,
      title: attachment.title?.trim() || attachment.name,
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
        parentFolderId: collection?.parentFolderId ?? null,
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
    const startedAt = Date.now();
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
          parentFolderId: characterReferenceCollectionsTable.parentFolderId,
          name: characterReferenceAttachmentsTable.name,
          title: characterReferenceAttachmentsTable.title,
          groupTitle: characterReferenceCollectionsTable.title,
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
          parentFolderId: objectReferenceCollectionsTable.parentFolderId,
          name: objectReferenceAttachmentsTable.name,
          title: objectReferenceAttachmentsTable.title,
          groupTitle: objectReferenceCollectionsTable.title,
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
          parentFolderId: environmentReferencesTable.parentFolderId,
          name: environmentReferenceAttachmentsTable.name,
          title: environmentReferenceAttachmentsTable.title,
          groupTitle: environmentReferencesTable.title,
          environmentDescription: environmentReferencesTable.description,
          description: environmentReferenceAttachmentsTable.description,
          mimeType: environmentReferenceAttachmentsTable.mimeType,
          bytesBase64: environmentReferenceAttachmentsTable.bytesBase64,
          section: environmentReferenceAttachmentsTable.section,
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
        parentFolderId: null,
      })),
      ...objects.map((reference) => ({
        ...reference,
        category: 'objects',
        collectionId: null,
        environmentId: null,
        parentFolderId: null,
      })),
      ...groupedCharacters.map((reference) => ({
        ...reference,
        category: 'characters',
        collectionId: reference.collectionId,
        environmentId: null,
        description: reference.description ?? reference.collectionDescription ?? null,
        title: reference.title ?? reference.name,
        groupTitle: reference.groupTitle ?? null,
        groupDescription: reference.collectionDescription ?? null,
        parentFolderId: reference.parentFolderId ?? null,
      })),
      ...groupedObjects.map((reference) => ({
        ...reference,
        category: 'objects',
        collectionId: reference.collectionId,
        environmentId: null,
        description: reference.description ?? reference.collectionDescription ?? null,
        title: reference.title ?? reference.name,
        groupTitle: reference.groupTitle ?? null,
        groupDescription: reference.collectionDescription ?? null,
        parentFolderId: reference.parentFolderId ?? null,
      })),
      ...environments.map((reference) => ({
        ...reference,
        category: 'environment',
        collectionId: reference.environmentId,
        description: reference.description ?? reference.environmentDescription ?? null,
        title: reference.title ?? reference.name,
        groupTitle: reference.groupTitle ?? null,
        groupDescription: reference.environmentDescription ?? null,
        parentFolderId: reference.parentFolderId ?? null,
        section: normalizeReferenceAttachmentSection(reference.section),
      })),
    ];

    allReferences.sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return b.id.localeCompare(a.id);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    logStartup('generation listReferences completed', startedAt, {
      references: allReferences.length,
      characters: characters.length,
      objects: objects.length,
      groupedCharacters: groupedCharacters.length,
      groupedObjects: groupedObjects.length,
      environments: environments.length,
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

  async function cancelDirectorChat(chatId) {
    const activeRun = activeDirectorChatCancellations.get(chatId);
    if (!activeRun) {
      return false;
    }

    const canceled = activeRun.cancel('user_requested_chat_stop') === true;
    activeDirectorChatCancellations.delete(chatId);
    return canceled;
  }

  async function listDirectorMessages(chatId) {
    if (typeof chatId !== 'string' || !chatId.trim()) {
      return [];
    }

    const messages = await loadDirectorMessageRows(chatId.trim());

    return sortDirectorMessageRecords(messages).map((message) => toRendererDirectorMessage(message));
  }

  async function loadDirectorMessageRows(chatId) {
    return db
      .select({
        id: directorMessagesTable.id,
        chatId: directorMessagesTable.chatId,
        role: directorMessagesTable.role,
        partsJson: directorMessagesTable.partsJson,
        status: directorMessagesTable.status,
        modelId: directorMessagesTable.modelId,
        modelLabel: directorMessagesTable.modelLabel,
        fastMode: directorMessagesTable.fastMode,
        referenceImagesJson: directorMessagesTable.referenceImagesJson,
        messageOrder: directorMessagesTable.messageOrder,
        providerTurnId: directorMessagesTable.providerTurnId,
        providerItemId: directorMessagesTable.providerItemId,
        createdAt: directorMessagesTable.createdAt,
        updatedAt: directorMessagesTable.updatedAt,
      })
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.chatId, chatId))
      .orderBy(directorMessagesTable.messageOrder, directorMessagesTable.createdAt, directorMessagesTable.id);
  }

  async function runDirectorMessage({
    chatId,
    threadId,
    prompt,
    modelId,
    fastMode = false,
    reasoningEffort,
    referenceImages = [],
    previousMessagesOverride,
    regenerateSourceUserMessage = null,
    regenerateAssistantMessage = null,
  }) {
    if (!chatId) {
      throw new Error('Director chat id is required.');
    }
    if (!threadId) {
      throw new Error('Director thread id is required.');
    }
    if (!prompt) {
      throw new Error('Director prompt cannot be empty.');
    }

    const [chat] = await db.select().from(directorChatsTable).where(eq(directorChatsTable.id, chatId)).limit(1);
    if (!chat || chat.threadId !== threadId) {
      throw new Error('Director chat not found.');
    }

    const referenceImagesJson = JSON.stringify(toGenerationReferenceSnapshot(referenceImages));
    const rendererReferenceMetadata = toGenerationReferenceMetadata(referenceImages);
    const previousMessages = previousMessagesOverride ?? (await listDirectorMessages(chatId));
    const selectedModel = resolveDirectorModel(modelId);
    const nextFastMode = fastMode === true ? 1 : 0;
    const timestamp = new Date().toISOString();
    const nextMessageOrder = await getNextDirectorMessageOrder(chatId);
    const isRegeneration = regenerateSourceUserMessage && regenerateAssistantMessage;
    const userMessage = isRegeneration
      ? regenerateSourceUserMessage
      : {
          id: nanoid(),
          chatId,
          role: 'user',
          partsJson: serializeDirectorParts([{ type: 'text', text: prompt }]),
          status: 'completed',
          modelId: null,
          modelLabel: null,
          fastMode: nextFastMode,
          referenceImagesJson,
          messageOrder: nextMessageOrder,
          providerTurnId: null,
          providerItemId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    const assistantMessage = isRegeneration
      ? {
          ...regenerateAssistantMessage,
          partsJson: '[]',
          status: 'streaming',
          modelId: selectedModel.id,
          modelLabel: selectedModel.label,
          fastMode: nextFastMode,
          referenceImagesJson,
          providerTurnId: null,
          providerItemId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      : {
          id: nanoid(),
          chatId,
          role: 'assistant',
          partsJson: '[]',
          status: 'streaming',
          modelId: selectedModel.id,
          modelLabel: selectedModel.label,
          fastMode: nextFastMode,
          referenceImagesJson,
          messageOrder: nextMessageOrder + 1,
          providerTurnId: null,
          providerItemId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    const abortController = new AbortController();
    const cancelableRun = {
      cancel(reason) {
        if (!abortController.signal.aborted) {
          abortController.abort(reason);
        }
        return true;
      },
    };
    const shouldGenerateTitle = !isRegeneration && chat.title === 'New chat';
    const fallbackChatTitle = shouldGenerateTitle ? truncateDirectorChatTitle(prompt) : chat.title;
    const generatedTitlePromise = shouldGenerateTitle
      ? Promise.resolve()
          .then(() => generateDirectorChatTitle({ prompt, abortSignal: abortController.signal }))
          .then((title) => (typeof title === 'string' && title.trim() ? title.trim() : fallbackChatTitle))
          .catch((error) => {
            if (!abortController.signal.aborted) {
              console.warn('[crenv:director] Director chat title generation failed', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
            return fallbackChatTitle;
          })
      : Promise.resolve(fallbackChatTitle);

    if (isRegeneration) {
      await db
        .update(directorMessagesTable)
        .set({
          partsJson: assistantMessage.partsJson,
          status: assistantMessage.status,
          modelId: assistantMessage.modelId,
          modelLabel: assistantMessage.modelLabel,
          fastMode: assistantMessage.fastMode,
          referenceImagesJson: assistantMessage.referenceImagesJson,
          providerTurnId: assistantMessage.providerTurnId,
          providerItemId: assistantMessage.providerItemId,
          createdAt: assistantMessage.createdAt,
          updatedAt: assistantMessage.updatedAt,
        })
        .where(eq(directorMessagesTable.id, assistantMessage.id));
    } else {
      await db.insert(directorMessagesTable).values([userMessage, assistantMessage]);
    }
    await db
      .update(directorChatsTable)
      .set({
        title: fallbackChatTitle,
        updatedAt: timestamp,
      })
      .where(eq(directorChatsTable.id, chatId));

    const rendererUserMessage = toRendererDirectorMessage(userMessage, rendererReferenceMetadata);
    const rendererAssistantMessage = toRendererDirectorMessage(assistantMessage, rendererReferenceMetadata);
    options.onDirectorMessageStart?.({
      threadId,
      chatId,
      userMessage: rendererUserMessage,
      assistantMessage: rendererAssistantMessage,
    });

    activeDirectorChatCancellations.set(chatId, cancelableRun);

    let parts = [];
    let completedAssistantMessage = assistantMessage;
    try {
      const messages = buildDirectorMessages({
        previousMessages,
        prompt,
        referenceImages: parseGenerationReferenceSnapshot(referenceImagesJson),
      });

      for await (const nextParts of createDirectorPartStream({
        providerId: selectedModel.providerId,
        reasoningEffort,
        supportsReasoningEffort: selectedModel.supportsReasoningEffort !== false,
        modelId: selectedModel.runtimeModel,
        messages,
        abortController,
      })) {
        if (abortController.signal.aborted) {
          break;
        }
        parts = nextParts;
        const updatedAt = new Date().toISOString();
        await db
          .update(directorMessagesTable)
          .set({
            partsJson: serializeDirectorParts(parts),
            status: 'streaming',
            updatedAt,
          })
          .where(eq(directorMessagesTable.id, assistantMessage.id));
        options.onDirectorMessageDelta?.({
          threadId,
          chatId,
          messageId: assistantMessage.id,
          parts,
        });
      }

      if (abortController.signal.aborted) {
        throw new Error('Director chat canceled.');
      }

      const completedAt = new Date().toISOString();
      completedAssistantMessage = {
        ...assistantMessage,
        partsJson: serializeDirectorParts(parts),
        status: 'completed',
        updatedAt: completedAt,
      };
      await db
        .update(directorMessagesTable)
        .set({
          partsJson: serializeDirectorParts(parts),
          status: 'completed',
          updatedAt: completedAt,
        })
        .where(eq(directorMessagesTable.id, assistantMessage.id));
      options.onDirectorMessageComplete?.({
        threadId,
        chatId,
        messageId: assistantMessage.id,
        parts,
      });
    } catch (error) {
      const canceled = abortController.signal.aborted;
      const errorMessage = canceled ? 'Director chat canceled.' : normalizeDirectorErrorMessage(error);
      const failedAt = new Date().toISOString();
      completedAssistantMessage = {
        ...assistantMessage,
        partsJson: serializeDirectorParts(
          parts.length > 0 ? parts : [{ type: 'text', text: errorMessage }]
        ),
        status: 'failed',
        updatedAt: failedAt,
      };
      await db
        .update(directorMessagesTable)
        .set({
          partsJson: completedAssistantMessage.partsJson,
          status: 'failed',
          updatedAt: failedAt,
        })
        .where(eq(directorMessagesTable.id, assistantMessage.id));
      options.onDirectorMessageError?.({
        threadId,
        chatId,
        messageId: assistantMessage.id,
        errorMessage,
        parts: parseDirectorParts(completedAssistantMessage.partsJson),
        canceled,
      });
      if (!canceled) {
        throw new Error(errorMessage);
      }
    } finally {
      if (activeDirectorChatCancellations.get(chatId) === cancelableRun) {
        activeDirectorChatCancellations.delete(chatId);
      }
    }

    if (shouldGenerateTitle && !abortController.signal.aborted) {
      const generatedTitle = await generatedTitlePromise;
      if (generatedTitle && generatedTitle !== fallbackChatTitle) {
        await db
          .update(directorChatsTable)
          .set({
            title: generatedTitle,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(directorChatsTable.id, chatId));
      }
    }

    const chats = await listDirectorChats(threadId);
    return {
      chat: chats.find((item) => item.id === chatId) ?? null,
      userMessage: rendererUserMessage,
      assistantMessage: toRendererDirectorMessage(completedAssistantMessage, rendererReferenceMetadata),
    };
  }

  async function sendDirectorMessage(input) {
    const chatId = typeof input?.chatId === 'string' ? input.chatId.trim() : '';
    const threadId = typeof input?.threadId === 'string' ? input.threadId.trim() : '';
    const prompt = typeof input?.prompt === 'string' ? input.prompt.trim() : '';

    return runDirectorMessage({
      chatId,
      threadId,
      prompt,
      modelId: input?.modelId,
      fastMode: input?.fastMode === true,
      reasoningEffort: input?.reasoningEffort,
      referenceImages: Array.isArray(input?.referenceImages) ? input.referenceImages : [],
    });
  }

  async function regenerateDirectorMessage(input) {
    const chatId = typeof input?.chatId === 'string' ? input.chatId.trim() : '';
    const threadId = typeof input?.threadId === 'string' ? input.threadId.trim() : '';
    const assistantMessageId = typeof input?.assistantMessageId === 'string' ? input.assistantMessageId.trim() : '';

    if (!chatId) {
      throw new Error('Director chat id is required.');
    }
    if (!threadId) {
      throw new Error('Director thread id is required.');
    }
    if (!assistantMessageId) {
      throw new Error('Director assistant message id is required.');
    }

    const messages = sortDirectorMessageRecords(await loadDirectorMessageRows(chatId));
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantMessageId && message.role === 'assistant'
    );
    if (assistantIndex === -1) {
      throw new Error('Director assistant message not found.');
    }

    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && messages[userIndex]?.role !== 'user') {
      userIndex -= 1;
    }
    if (userIndex < 0) {
      throw new Error('Director source prompt not found.');
    }

    const sourceUserMessage = messages[userIndex];
    const sourceAssistantMessage = messages[assistantIndex];

    return runDirectorMessage({
      chatId,
      threadId,
      prompt: normalizeDirectorPromptContent(getDirectorMessageText(sourceUserMessage)),
      modelId: sourceAssistantMessage.modelId ?? undefined,
      fastMode: Boolean(sourceAssistantMessage.fastMode),
      referenceImages: parseGenerationReferenceSnapshot(sourceUserMessage.referenceImagesJson),
      previousMessagesOverride: messages.slice(0, userIndex),
      regenerateSourceUserMessage: sourceUserMessage,
      regenerateAssistantMessage: sourceAssistantMessage,
    });
  }

  async function resolveDirectorActionContext(messageId, actionIndex) {
    const [message] = await db
      .select()
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.id, messageId))
      .limit(1);
    if (!message || message.role !== 'assistant') {
      throw new Error('Director assistant message not found.');
    }

    const [chat] = await db
      .select()
      .from(directorChatsTable)
      .where(eq(directorChatsTable.id, message.chatId))
      .limit(1);
    if (!chat) {
      throw new Error('Director chat not found.');
    }

    const messages = sortDirectorMessageRecords(await loadDirectorMessageRows(chat.id));
    const assistantIndex = messages.findIndex((entry) => entry.id === messageId && entry.role === 'assistant');
    if (assistantIndex === -1) {
      throw new Error('Director assistant message not found.');
    }

    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && messages[userIndex]?.role !== 'user') {
      userIndex -= 1;
    }

    const sourceUserMessage = userIndex >= 0 ? messages[userIndex] : null;
    const parts = parseDirectorParts(message.partsJson);
    const toolParts = parts
      .map((part, partIndex) => ({ part, partIndex }))
      .filter(({ part }) => part?.type === 'tool-generateImages');
    const target = toolParts[actionIndex] ?? null;
    const targetAction = target
      ? {
          kind: 'generateImages',
          payload: target.part.input,
          partIndex: target.partIndex,
          part: target.part,
        }
      : null;
    if (!targetAction) {
      throw new Error('Director action not found.');
    }

    return {
      chat,
      message,
      sourceUserMessage,
      targetAction,
      parts,
    };
  }

  async function updateDirectorAssistantMessage(messageId, parts) {
    const updatedAt = new Date().toISOString();
    await db
      .update(directorMessagesTable)
      .set({
        partsJson: serializeDirectorParts(parts),
        updatedAt,
      })
      .where(eq(directorMessagesTable.id, messageId));

    const [updatedMessage] = await db
      .select()
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.id, messageId))
      .limit(1);

    return updatedMessage
      ? toRendererDirectorMessage(updatedMessage, parseGenerationReferenceMetadata(updatedMessage.referenceImagesJson))
      : null;
  }

  async function buildDirectorGenerateImagesRequest({ threadId, targetAction, sourceUserMessage }) {
    const payload =
      targetAction.payload && typeof targetAction.payload === 'object' && !Array.isArray(targetAction.payload)
        ? targetAction.payload
        : {};
    const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
    if (!prompt) {
      throw new Error('Director generateImages action is missing a prompt.');
    }

    const count =
      typeof payload.count === 'number' && Number.isInteger(payload.count) && payload.count > 0 ? payload.count : 1;
    const aspectRatio =
      typeof payload.aspectRatio === 'string' && payload.aspectRatio.trim() ? payload.aspectRatio.trim() : '16:9';
    const requestedReferences = Array.isArray(payload.references) ? payload.references : [];
    const normalizedRequestedReferences = new Set(
      requestedReferences.map((reference) => normalizeDirectorReferenceLabel(reference)).filter(Boolean)
    );
    const attachedReferences = sourceUserMessage
      ? parseGenerationReferenceSnapshot(sourceUserMessage.referenceImagesJson)
      : [];
    const savedReferences = await listReferences();
    const seenReferenceBytes = new Set();
    const resolvedReferences = [];

    for (const reference of savedReferences) {
      const normalizedTitle = normalizeDirectorReferenceLabel(reference.title);
      const normalizedName = normalizeDirectorReferenceLabel(reference.name);
      if (
        !normalizedRequestedReferences.has(normalizedTitle) &&
        !normalizedRequestedReferences.has(normalizedName)
      ) {
        continue;
      }
      if (seenReferenceBytes.has(reference.bytesBase64)) {
        continue;
      }
      seenReferenceBytes.add(reference.bytesBase64);
      resolvedReferences.push({
        name: reference.name,
        title: reference.title ?? reference.name,
        description: reference.description ?? undefined,
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
      });
    }

    for (const reference of attachedReferences) {
      const normalizedTitle = normalizeDirectorReferenceLabel(reference.title);
      const normalizedName = normalizeDirectorReferenceLabel(reference.name);
      if (
        normalizedRequestedReferences.size > 0 &&
        !normalizedRequestedReferences.has(normalizedTitle) &&
        !normalizedRequestedReferences.has(normalizedName)
      ) {
        continue;
      }
      if (seenReferenceBytes.has(reference.bytesBase64)) {
        continue;
      }
      seenReferenceBytes.add(reference.bytesBase64);
      resolvedReferences.push({
        name: reference.name,
        title: reference.title,
        description: reference.description,
        mimeType: reference.mimeType,
        bytesBase64: reference.bytesBase64,
      });
    }

    return {
      threadId,
      provider: 'codex',
      modelId: IMAGE_MODEL_OPTIONS[0]?.id,
      mode: 'manual',
      prompt: `${prompt}\n\nAspect ratio: ${aspectRatio}`,
      count,
      referenceImages: resolvedReferences,
    };
  }

  async function approveDirectorAction(input) {
    const messageId = typeof input?.messageId === 'string' ? input.messageId.trim() : '';
    const actionIndex = typeof input?.actionIndex === 'number' ? input.actionIndex : -1;
    const clientRunId = typeof input?.clientRunId === 'string' ? input.clientRunId.trim() : '';
    if (!messageId) {
      throw new Error('Director message id is required.');
    }
    if (!Number.isInteger(actionIndex) || actionIndex < 0) {
      throw new Error('Director action index is required.');
    }

    const { chat, sourceUserMessage, targetAction, parts } = await resolveDirectorActionContext(messageId, actionIndex);
    const runningParts = parts.map((part, index) =>
      index === targetAction.partIndex ? { ...part, state: 'running' } : part
    );
    await updateDirectorAssistantMessage(messageId, runningParts);
    options.onDirectorMessageDelta?.({
      threadId: chat.threadId,
      chatId: chat.id,
      messageId,
      parts: runningParts,
    });

    const request = await buildDirectorGenerateImagesRequest({
      threadId: chat.threadId,
      targetAction,
      sourceUserMessage,
    });
    if (clientRunId) {
      request.clientRunId = clientRunId;
    }

    try {
      const result = await generateImages(request);
      const completedParts = runningParts.map((part, index) =>
        index === targetAction.partIndex
          ? { ...part, state: 'output-available', output: result }
          : part
      );
      const updatedMessage = await updateDirectorAssistantMessage(
        messageId,
        completedParts
      );
      options.onDirectorMessageDelta?.({
        threadId: chat.threadId,
        chatId: chat.id,
        messageId,
        parts: completedParts,
      });
      return updatedMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failedParts = runningParts.map((part, index) =>
        index === targetAction.partIndex
          ? { ...part, state: 'output-error', errorText: errorMessage }
          : part
      );
      await updateDirectorAssistantMessage(messageId, failedParts);
      options.onDirectorMessageDelta?.({
        threadId: chat.threadId,
        chatId: chat.id,
        messageId,
        parts: failedParts,
      });
      throw error;
    }
  }

  async function declineDirectorAction(input) {
    const messageId = typeof input?.messageId === 'string' ? input.messageId.trim() : '';
    const actionIndex = typeof input?.actionIndex === 'number' ? input.actionIndex : -1;
    if (!messageId) {
      throw new Error('Director message id is required.');
    }
    if (!Number.isInteger(actionIndex) || actionIndex < 0) {
      throw new Error('Director action index is required.');
    }

    const { targetAction, parts } = await resolveDirectorActionContext(messageId, actionIndex);
    return updateDirectorAssistantMessage(
      messageId,
      parts.map((part, index) =>
        index === targetAction.partIndex ? { ...part, state: 'declined' } : part
      )
    );
  }

  async function generateImages() {
    const request = arguments[0] ?? {};
    const provider = request.provider ?? 'codex';
    if (provider !== 'codex') {
      throw new Error(`Unsupported image generation provider: ${provider}`);
    }

    const codexAuth = await getActiveCodexImageAuth();
    if (!codexAuth?.accessToken || !codexAuth?.accountId) {
      throw new Error('Add a Codex image account in Providers > Image before generating images.');
    }

    const imageModel = resolveImageModel(request.modelId);
    const jobId = nanoid();
    const createdAt = new Date().toISOString();
    const workingDirectory = path.join(paths.generationJobsTempDir, jobId);
    const outputDirectory = path.join(workingDirectory, 'output');
    const artifactsDirectory = path.join(workingDirectory, 'artifacts');
    const manifestPath = '';
    const references = request.referenceImages ?? [];

    await fsp.mkdir(outputDirectory, { recursive: true });

    console.info('[crenv:generation] starting image job', {
      jobId,
      clientRunId: request.clientRunId ?? null,
      threadId: request.threadId,
      provider,
      modelId: imageModel.id,
      runtimeModel: imageModel.runtimeModel,
      count: Number.isInteger(request.count) ? request.count : 1,
      references: references.length,
      prompt: truncateGenerationLogText(request.prompt ?? '', 180),
    });
    for (const [index, reference] of references.entries()) {
      console.info(`[crenv:generation] reference[${index + 1}]`, summarizeGenerationReferenceForLog(reference, index));
    }

    const pendingJob = {
      id: jobId,
      threadId: request.threadId,
      prompt: request.prompt ?? '',
      requestedCount: Number.isInteger(request.count) ? request.count : 1,
      status: 'running',
      workingDirectory,
      manifestPath,
      errorMessage: null,
      provider,
      modelId: imageModel.id,
      modelLabel: imageModel.label,
      referenceImagesJson: JSON.stringify(
        references.map((reference) => ({
          name: reference.name,
          title: reference.title ?? null,
          description: reference.description ?? null,
          mimeType: reference.mimeType,
        }))
      ),
      durationMs: null,
      providerThreadId: null,
      providerTurnId: null,
      requestStartedAt: null,
      firstEventAt: null,
      imageToolCallStartedAt: null,
      imageToolGeneratingAt: null,
      firstPartialImageAt: null,
      completedAt: null,
      runtime: 'chatgpt-codex-responses',
      importedCount: 0,
      createdAt,
      updatedAt: createdAt,
    };

    let currentJob = pendingJob;
    const importedAssetsByRun = new Map();

    async function persistJobPatch(patch) {
      currentJob = {
        ...currentJob,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await upsertJob(currentJob);
    }

    async function upsertImportedAsset(update) {
      const outputIndex = Math.max(0, Number(update.run) - 1);
      const createdAt = new Date().toISOString();
      const mimeType = update.mimeType ?? mimeTypeForImportedAsset(update.savedPath);
      const sourceBuffer = await fsp.readFile(update.savedPath);
      const existingAsset = importedAssetsByRun.get(update.run) ?? null;

      if (!existingAsset) {
        const assetId = nanoid();
        const imported = await writeImportedAssetBuffer({
          buffer: sourceBuffer,
          assetId,
          fileName: path.basename(update.savedPath),
          mimeType,
          generatedImagesDir: paths.generatedImagesDir,
        });
        const assetRecord = {
          id: assetId,
          jobId,
          originalPath: update.savedPath,
          storedPath: imported.storedPath,
          fileName: imported.fileName,
          mimeType,
          width: null,
          height: null,
          providerImageId: update.providerImageId ?? null,
          outputIndex,
          reviewStatus: update.isFinal ? 'accepted' : 'preview',
          createdAt,
        };
        await db.insert(generatedAssetsTable).values(assetRecord);
        console.info(`[crenv:generation] stored ${update.isFinal ? 'final' : 'preview'} asset`, {
          jobId,
          run: update.run,
          assetId,
          outputIndex,
          storedPath: imported.storedPath,
          providerImageId: update.providerImageId ?? null,
        });

        const rendererAsset = toRendererAsset({
          ...assetRecord,
          provider,
          modelId: imageModel.id,
          modelLabel: imageModel.label,
          prompt: request.prompt ?? '',
          referenceImagesJson: currentJob.referenceImagesJson,
          durationMs: currentJob.durationMs,
        });
        importedAssetsByRun.set(update.run, rendererAsset);
        options.onImageReady?.({
          jobId,
          clientRunId: request.clientRunId ?? null,
          threadId: request.threadId,
          asset: rendererAsset,
          providerThreadId: update.providerThreadId ?? currentJob.providerThreadId,
          providerTurnId: update.providerTurnId ?? currentJob.providerTurnId,
        });
        await persistJobPatch({
          importedCount: importedAssetsByRun.size,
          providerThreadId: update.providerThreadId ?? currentJob.providerThreadId,
          providerTurnId: update.providerTurnId ?? currentJob.providerTurnId,
          ...toGenerationBenchmarkPatch(currentJob, update.benchmark),
        });
        return rendererAsset;
      }

      const previousStoredPath = decodeGeneratedAssetStoredPath(existingAsset.fileUrl);
      const imported = await writeImportedAssetBuffer({
        buffer: sourceBuffer,
        assetId: existingAsset.id,
        fileName: path.basename(update.savedPath),
        mimeType,
        generatedImagesDir: paths.generatedImagesDir,
      });

      if (previousStoredPath && previousStoredPath !== imported.storedPath) {
        await fsp.rm(previousStoredPath, { force: true }).catch(() => {});
      }

      await db
        .update(generatedAssetsTable)
        .set({
          originalPath: update.savedPath,
          storedPath: imported.storedPath,
          fileName: imported.fileName,
          mimeType,
          providerImageId: update.providerImageId ?? null,
          reviewStatus: update.isFinal ? 'accepted' : 'preview',
          createdAt,
        })
        .where(eq(generatedAssetsTable.id, existingAsset.id));
      console.info(`[crenv:generation] updated ${update.isFinal ? 'final' : 'preview'} asset`, {
        jobId,
        run: update.run,
        assetId: existingAsset.id,
        outputIndex,
        storedPath: imported.storedPath,
        providerImageId: update.providerImageId ?? null,
      });

      const rendererAsset = toRendererAsset({
        id: existingAsset.id,
        storedPath: imported.storedPath,
        fileName: imported.fileName,
        createdAt,
        prompt: request.prompt ?? '',
        provider,
        modelId: imageModel.id,
        modelLabel: imageModel.label,
        referenceImagesJson: currentJob.referenceImagesJson,
        durationMs: currentJob.durationMs,
        outputIndex,
      });
      importedAssetsByRun.set(update.run, rendererAsset);
      options.onImageReady?.({
        jobId,
        clientRunId: request.clientRunId ?? null,
        threadId: request.threadId,
        asset: rendererAsset,
        providerThreadId: update.providerThreadId ?? currentJob.providerThreadId,
        providerTurnId: update.providerTurnId ?? currentJob.providerTurnId,
      });
      await persistJobPatch({
        importedCount: importedAssetsByRun.size,
        providerThreadId: update.providerThreadId ?? currentJob.providerThreadId,
        providerTurnId: update.providerTurnId ?? currentJob.providerTurnId,
        ...toGenerationBenchmarkPatch(currentJob, update.benchmark),
      });
      return rendererAsset;
    }

    await upsertJob(pendingJob);

    try {
      const batch = await executeImageGenerationBatch({
        workingDirectory,
        outputDirectory,
        artifactsDirectory,
        model: imageModel.runtimeModel,
        prompt: request.prompt ?? '',
        count: pendingJob.requestedCount,
        references: request.referenceImages ?? [],
        auth: codexAuth,
        onImageUpdated: upsertImportedAsset,
      });

      const successfulResults = batch.results.filter((result) => !result.failed && result.savedPath);
      for (const result of successfulResults) {
        if (!importedAssetsByRun.has(result.run)) {
          await upsertImportedAsset({
            run: result.run,
            savedPath: result.savedPath,
            isFinal: true,
          });
        }
      }

      const failedResults = batch.results.filter((result) => result.failed);

      await persistJobPatch({
        status: failedResults.length > 0 ? 'failed' : 'succeeded',
        errorMessage:
          failedResults.length > 0
            ? failedResults.map((result) => `run ${result.run}: ${result.errorMessage || 'unknown failure'}`).join('; ')
            : null,
        durationMs: batch.wallClockMs,
        importedCount: importedAssetsByRun.size,
        ...batch.results.reduce(
          (patch, result) => ({
            ...patch,
            ...toGenerationBenchmarkPatch({ ...currentJob, ...patch }, result.benchmark),
          }),
          {}
        ),
      });
      console.info('[crenv:generation] image job completed', {
        jobId,
        status: failedResults.length > 0 ? 'failed' : 'succeeded',
        importedCount: importedAssetsByRun.size,
        failedRuns: failedResults.length,
        durationMs: batch.wallClockMs,
        references: references.length,
      });

      const importedAssets = successfulResults
        .map((result) => {
          const asset = importedAssetsByRun.get(result.run);
          if (!asset) {
            return null;
          }
          return {
            ...asset,
            durationMs: batch.wallClockMs,
          };
        })
        .filter(Boolean);

      if (failedResults.length > 0) {
        throw new Error(
          failedResults.map((result) => `run ${result.run}: ${result.errorMessage || 'unknown failure'}`).join('; ')
        );
      }

      return {
        jobId,
        assets: importedAssets,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await persistJobPatch({
        status: 'failed',
        errorMessage,
      });
      console.info('[crenv:generation] image job failed', {
        jobId,
        error: errorMessage,
      });
      throw error;
    } finally {
      await refreshAllCodexImageAccountLimits().catch((refreshError) => {
        console.info('[crenv:generation] Codex image account limit refresh failed', {
          jobId,
          error: refreshError instanceof Error ? refreshError.message : String(refreshError),
        });
      });
    }
  }

  async function listGeneratedImages(threadId) {
    const startedAt = Date.now();
    if (!threadId) {
      logStartup('generation listGeneratedImages completed', startedAt, {
        threadId: null,
        assets: 0,
      });
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
        outputIndex: generatedAssetsTable.outputIndex,
        favorite: generatedAssetsTable.favorite,
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

    const result = assets.map(toRendererAsset);
    logStartup('generation listGeneratedImages completed', startedAt, {
      threadId,
      assets: result.length,
    });
    return result;
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

  async function listSceneGroupOutlines(threadId) {
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

    const framesBySceneGroupId = new Map();
    for (const frame of sceneFrames) {
      const current = framesBySceneGroupId.get(frame.sceneGroupId) ?? [];
      current.push({
        ...frame,
        references: [],
        assets: [],
      });
      framesBySceneGroupId.set(frame.sceneGroupId, current);
    }

    return sceneGroups.map((sceneGroup) => ({
      ...sceneGroup,
      frames: framesBySceneGroupId.get(sceneGroup.id) ?? [],
      runs: [],
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
    const sceneGroups = await listSceneGroups(threadId);
    return sceneGroups.find((item) => item.id === sceneGroup.id) ?? null;
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

  async function deleteSceneGroup(sceneGroupId) {
    const existing = await db.select().from(sceneGroupsTable).where(eq(sceneGroupsTable.id, sceneGroupId)).limit(1);
    const sceneGroup = existing[0];
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }

    const frames = await db
      .select({ id: sceneFramesTable.id })
      .from(sceneFramesTable)
      .where(eq(sceneFramesTable.sceneGroupId, sceneGroupId));
    const frameIds = frames.map((frame) => frame.id);
    const runs = await db
      .select({ id: sceneGroupRunsTable.id })
      .from(sceneGroupRunsTable)
      .where(eq(sceneGroupRunsTable.sceneGroupId, sceneGroupId));
    const runIds = runs.map((run) => run.id);

    if (runIds.length > 0) {
      await db.delete(sceneFrameAssetsTable).where(inArray(sceneFrameAssetsTable.sceneGroupRunId, runIds));
    }
    if (frameIds.length > 0) {
      await db.delete(sceneFrameReferencesTable).where(inArray(sceneFrameReferencesTable.sceneFrameId, frameIds));
      await db.delete(sceneFramesTable).where(inArray(sceneFramesTable.id, frameIds));
    }
    await db.delete(sceneGroupRunsTable).where(eq(sceneGroupRunsTable.sceneGroupId, sceneGroupId));
    await db.delete(sceneGroupsTable).where(eq(sceneGroupsTable.id, sceneGroupId));

    return listSceneGroups(sceneGroup.threadId);
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

  async function deleteSceneFrame(sceneFrameId) {
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
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }

    await db.delete(sceneFrameAssetsTable).where(eq(sceneFrameAssetsTable.sceneFrameId, sceneFrameId));
    await db.delete(sceneFrameReferencesTable).where(eq(sceneFrameReferencesTable.sceneFrameId, sceneFrameId));
    await db.delete(sceneFramesTable).where(eq(sceneFramesTable.id, sceneFrameId));

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

  async function pasteClipboardImageToSceneFrame(sceneFrameId, image) {
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
    if (!sceneGroup) {
      throw new Error('Scene group not found.');
    }

    if (!image?.bytesBase64) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const runId = nanoid();
    const assetId = nanoid();
    const buffer = Buffer.from(image.bytesBase64, 'base64');
    if (buffer.length === 0) {
      return null;
    }

    await fsp.mkdir(paths.generatedImagesDir, { recursive: true });
    const fileName = `${assetId}.png`;
    const storedPath = path.join(paths.generatedImagesDir, fileName);
    await fsp.writeFile(storedPath, buffer);

    const existingAssets = await db
      .select({ id: sceneFrameAssetsTable.id })
      .from(sceneFrameAssetsTable)
      .where(eq(sceneFrameAssetsTable.sceneFrameId, sceneFrameId));

    await db.insert(sceneGroupRunsTable).values({
      id: runId,
      sceneGroupId: sceneGroup.id,
      threadId: sceneGroup.threadId,
      status: 'succeeded',
      provider: 'api',
      modelId: 'clipboard',
      modelLabel: 'Clipboard',
      requestedFrameCount: 1,
      errorMessage: null,
      durationMs: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.insert(sceneFrameAssetsTable).values({
      id: assetId,
      sceneGroupRunId: runId,
      sceneFrameId,
      outputIndex: existingAssets.length,
      originalPath: 'clipboard',
      storedPath,
      fileName,
      mimeType: image.mimeType || 'image/png',
      width: null,
      height: null,
      createdAt: timestamp,
    });

    const details = await listSceneGroups(sceneGroup.threadId);
    return details.find((item) => item.id === sceneGroup.id) ?? null;
  }

  async function generateSceneGroup() {
    throw new Error('Scene generation backend is not configured yet.');
  }

  async function cancelSceneGroupGeneration(sceneGroupId) {
    const activeRuns = activeSceneGroupCancellations.get(sceneGroupId);
    if (!activeRuns || activeRuns.length === 0) {
      return false;
    }

    return cancelSceneGroupCancelableRuns(activeSceneGroupCancellations, sceneGroupId);
  }

  async function structureScenePrompt() {
    throw new Error('Scene structuring backend is not configured yet.');
  }

  async function describeReferenceCollection() {
    throw new Error('Reference description backend is not configured yet.');
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

    if (assets[0]) {
      return assets[0];
    }

    const sceneAssets = await db
      .select({
        id: sceneFrameAssetsTable.id,
        jobId: sceneFrameAssetsTable.sceneGroupRunId,
        originalPath: sceneFrameAssetsTable.originalPath,
        storedPath: sceneFrameAssetsTable.storedPath,
        fileName: sceneFrameAssetsTable.fileName,
        mimeType: sceneFrameAssetsTable.mimeType,
        width: sceneFrameAssetsTable.width,
        height: sceneFrameAssetsTable.height,
        createdAt: sceneFrameAssetsTable.createdAt,
        prompt: sceneFramesTable.prompt,
        provider: sceneGroupRunsTable.provider,
        modelId: sceneGroupRunsTable.modelId,
        modelLabel: sceneGroupRunsTable.modelLabel,
        referenceImagesJson: sql`NULL`,
        durationMs: sceneGroupRunsTable.durationMs,
      })
      .from(sceneFrameAssetsTable)
      .innerJoin(sceneGroupRunsTable, eq(sceneFrameAssetsTable.sceneGroupRunId, sceneGroupRunsTable.id))
      .innerJoin(sceneFramesTable, eq(sceneFrameAssetsTable.sceneFrameId, sceneFramesTable.id))
      .where(eq(sceneFrameAssetsTable.id, imageId))
      .limit(1);

    return sceneAssets[0] ?? null;
  }

  async function deleteGeneratedImage(imageId) {
    const asset = await getGeneratedImage(imageId);
    if (!asset) {
      throw new Error('Generated image not found.');
    }

    await db.delete(generatedAssetsTable).where(eq(generatedAssetsTable.id, imageId));
    await fsp.rm(asset.storedPath, { force: true });
  }

  async function setGeneratedImageFavorite(imageId, favorite) {
    const asset = await getGeneratedImage(imageId);
    if (!asset) {
      throw new Error('Generated image not found.');
    }

    await db
      .update(generatedAssetsTable)
      .set({ favorite: favorite ? 1 : 0 })
      .where(eq(generatedAssetsTable.id, imageId));
    return { id: imageId, favorite: Boolean(favorite) };
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
    exportProject,
    exportThread,
    exportReference,
    importCrenvArchive,
    importReferenceArchive,
    createProjectExportSnapshot,
    createThreadExportSnapshot,
    createReferenceExportSnapshot,
    ensureProjectThreadWorkspace,
    generateImages,
    getGeneratedImage,
    deleteGeneratedImage,
    setGeneratedImageFavorite,
    listGeneratedImages,
    listSceneGroups,
    listDirectorChats,
    createDirectorChat,
    renameDirectorChat,
    deleteDirectorChat,
    listDirectorMessages,
    sendDirectorMessage,
    regenerateDirectorMessage,
    approveDirectorAction,
    declineDirectorAction,
    cancelDirectorChat,
    listProjectsWithThreads,
    listReferences,
    listReferenceFolders,
    createReference,
    createReferenceFolder,
    setCharacterVoiceUrl,
    createEnvironmentReference,
    createReferenceCollection,
    updateReference,
    updateEnvironmentReference,
    updateReferenceCollection,
    deleteReference,
    describeReferenceCollection,
    createSceneGroup,
    updateSceneGroup,
    deleteSceneGroup,
    createSceneFrame,
    updateSceneFrame,
    deleteSceneFrame,
    saveSceneFrameReferences,
    pasteClipboardImageToSceneFrame,
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

  async function getNextDirectorMessageOrder(chatId) {
    const result = await db
      .select({ maxOrder: sql`max(${directorMessagesTable.messageOrder})` })
      .from(directorMessagesTable)
      .where(eq(directorMessagesTable.chatId, chatId));
    const maxOrder = Number(result[0]?.maxOrder ?? 0);
    return Number.isFinite(maxOrder) ? maxOrder + 1 : 1;
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
          providerThreadId: job.providerThreadId,
          providerTurnId: job.providerTurnId,
          requestStartedAt: job.requestStartedAt,
          firstEventAt: job.firstEventAt,
          imageToolCallStartedAt: job.imageToolCallStartedAt,
          imageToolGeneratingAt: job.imageToolGeneratingAt,
          firstPartialImageAt: job.firstPartialImageAt,
          completedAt: job.completedAt,
          runtime: job.runtime,
          importedCount: job.importedCount,
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
          console.error(`[crenv:generation] failed to remove asset file ${asset.storedPath}: ${error.message}`);
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

async function ensureGenerationRuntimeColumns(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('generation_jobs')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('provider_thread_id')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN provider_thread_id TEXT'));
  }

  if (!columnNames.has('provider_turn_id')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN provider_turn_id TEXT'));
  }

  if (!columnNames.has('runtime')) {
    await db.run(sql.raw("ALTER TABLE generation_jobs ADD COLUMN runtime TEXT NOT NULL DEFAULT 'api-backend'"));
  }

  if (!columnNames.has('imported_count')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN imported_count INTEGER NOT NULL DEFAULT 0'));
  }

  await db.run(sql.raw('CREATE INDEX IF NOT EXISTS generation_jobs_provider_thread_id_idx ON generation_jobs(provider_thread_id)'));
}

async function ensureGenerationBenchmarkColumns(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('generation_jobs')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('request_started_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN request_started_at TEXT'));
  }

  if (!columnNames.has('first_event_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN first_event_at TEXT'));
  }

  if (!columnNames.has('image_tool_call_started_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN image_tool_call_started_at TEXT'));
  }

  if (!columnNames.has('image_tool_generating_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN image_tool_generating_at TEXT'));
  }

  if (!columnNames.has('first_partial_image_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN first_partial_image_at TEXT'));
  }

  if (!columnNames.has('completed_at')) {
    await db.run(sql.raw('ALTER TABLE generation_jobs ADD COLUMN completed_at TEXT'));
  }
}

async function failInterruptedGenerationJobs(db) {
  const interruptedAt = new Date().toISOString();
  await db
    .update(generationJobsTable)
    .set({
      status: 'failed',
      errorMessage: 'Image generation was interrupted when the app closed.',
      completedAt: interruptedAt,
      updatedAt: interruptedAt,
    })
    .where(eq(generationJobsTable.status, 'running'));
}

async function ensureGeneratedAssetProviderColumns(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('generated_assets')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('provider_image_id')) {
    await db.run(sql.raw('ALTER TABLE generated_assets ADD COLUMN provider_image_id TEXT'));
  }

  if (!columnNames.has('output_index')) {
    await db.run(sql.raw('ALTER TABLE generated_assets ADD COLUMN output_index INTEGER'));
  }

  if (!columnNames.has('review_status')) {
    await db.run(sql.raw('ALTER TABLE generated_assets ADD COLUMN review_status TEXT'));
  }

  if (!columnNames.has('favorite')) {
    await db.run(sql.raw('ALTER TABLE generated_assets ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0'));
  }

  await db.run(
    sql.raw(
      'CREATE UNIQUE INDEX IF NOT EXISTS generated_assets_job_provider_image_id_unique ON generated_assets(job_id, provider_image_id) WHERE provider_image_id IS NOT NULL'
    )
  );
}

async function ensureDirectorRuntimeColumns(db) {
  const chatInfo = await db.all(sql.raw("PRAGMA table_info('director_chats')"));
  const chatColumns = new Set(chatInfo.map((column) => column.name));

  if (!chatColumns.has('provider_thread_id')) {
    await db.run(sql.raw('ALTER TABLE director_chats ADD COLUMN provider_thread_id TEXT'));
  }

  if (!chatColumns.has('provider_runtime')) {
    await db.run(sql.raw("ALTER TABLE director_chats ADD COLUMN provider_runtime TEXT NOT NULL DEFAULT 'api-backend'"));
  }

  const messageInfo = await db.all(sql.raw("PRAGMA table_info('director_messages')"));
  const messageColumns = new Set(messageInfo.map((column) => column.name));

  if (!messageColumns.has('message_order')) {
    await db.run(sql.raw('ALTER TABLE director_messages ADD COLUMN message_order INTEGER'));
  }

  if (!messageColumns.has('provider_turn_id')) {
    await db.run(sql.raw('ALTER TABLE director_messages ADD COLUMN provider_turn_id TEXT'));
  }

  if (!messageColumns.has('provider_item_id')) {
    await db.run(sql.raw('ALTER TABLE director_messages ADD COLUMN provider_item_id TEXT'));
  }

  await backfillDirectorMessageOrder(db);
  await db.run(sql.raw('CREATE INDEX IF NOT EXISTS director_messages_chat_order_idx ON director_messages(chat_id, message_order)'));
}

async function backfillDirectorMessageOrder(db) {
  const messages = await db.all(
    sql.raw(
      "SELECT id, chat_id, role, created_at FROM director_messages ORDER BY chat_id, created_at, CASE role WHEN 'system' THEN 0 WHEN 'user' THEN 1 WHEN 'assistant' THEN 2 ELSE 99 END, id"
    )
  );
  const nextOrderByChatId = new Map();

  for (const message of messages) {
    const nextOrder = nextOrderByChatId.get(message.chat_id) ?? 1;
    nextOrderByChatId.set(message.chat_id, nextOrder + 1);
    await db.run(sql.raw(`UPDATE director_messages SET message_order = ${nextOrder} WHERE id = '${escapeSqlLiteral(message.id)}' AND message_order IS NULL`));
  }
}

async function ensureStructuredDirectorMessagesTable(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('director_messages')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));
  if (columnNames.has('content_markdown') || (columnNames.size > 0 && !columnNames.has('parts_json'))) {
    await db.run(sql.raw('DROP TABLE director_messages'));
  }
  await db.run(sql.raw(CREATE_DIRECTOR_MESSAGES_TABLE_SQL));
}

async function ensureEnvironmentAttachmentDescriptionColumn(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('environment_reference_attachments')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));
  if (!columnNames.has('description')) {
    await db.run(sql.raw('ALTER TABLE environment_reference_attachments ADD COLUMN description TEXT'));
  }
}

async function ensureEnvironmentAttachmentSectionColumn(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('environment_reference_attachments')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));

  if (!columnNames.has('section')) {
    await db.run(sql.raw("ALTER TABLE environment_reference_attachments ADD COLUMN section TEXT NOT NULL DEFAULT 'angles'"));
    const attachments = await db.all(
      sql.raw(
        'SELECT id, environment_id AS environmentId FROM environment_reference_attachments ORDER BY environment_id, created_at, id'
      )
    );
    const seenEnvironmentIds = new Set();

    for (const attachment of attachments) {
      const environmentId = attachment.environmentId ?? attachment.environment_id;
      const section = seenEnvironmentIds.has(environmentId) ? 'angles' : 'primary';
      seenEnvironmentIds.add(environmentId);
      await db.run(
        sql.raw(
          `UPDATE environment_reference_attachments SET section = '${section}' WHERE id = '${escapeSqlLiteral(attachment.id)}'`
        )
      );
    }
  }

  await db.run(
    sql.raw(
      "UPDATE environment_reference_attachments SET section = 'angles' WHERE section IS NULL OR section NOT IN ('primary', 'angles')"
    )
  );
}

async function ensureReferenceFolderParentColumns(db) {
  const tables = [
    'character_reference_collections',
    'object_reference_collections',
    'environment_references',
  ];

  for (const tableName of tables) {
    const tableInfo = await db.all(sql.raw(`PRAGMA table_info('${tableName}')`));
    const columnNames = new Set(tableInfo.map((column) => column.name));
    if (!columnNames.has('parent_folder_id')) {
      await db.run(sql.raw(`ALTER TABLE ${tableName} ADD COLUMN parent_folder_id TEXT`));
    }
  }
}

async function ensureCharacterVoiceUrlColumn(db) {
  const tableInfo = await db.all(sql.raw("PRAGMA table_info('character_reference_collections')"));
  const columnNames = new Set(tableInfo.map((column) => column.name));
  if (!columnNames.has('voice_url')) {
    await db.run(sql.raw('ALTER TABLE character_reference_collections ADD COLUMN voice_url TEXT'));
  }
}

async function ensureReferenceAttachmentTitleColumns(db) {
  const tables = [
    'character_reference_attachments',
    'object_reference_attachments',
    'environment_reference_attachments',
  ];
  for (const tableName of tables) {
    const tableInfo = await db.all(sql.raw(`PRAGMA table_info('${tableName}')`));
    const columnNames = new Set(tableInfo.map((column) => column.name));
    if (!columnNames.has('title')) {
      await db.run(sql.raw(`ALTER TABLE ${tableName} ADD COLUMN title TEXT`));
    }
    await db.run(
      sql.raw(
        `UPDATE ${tableName}
         SET title = COALESCE(NULLIF(title, ''), name)
         WHERE title IS NULL OR title = ''`
      )
    );
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
    fileUrl: `crenv-asset://generated?path=${encodeURIComponent(asset.storedPath)}&v=${encodeURIComponent(asset.createdAt)}`,
    createdAt: asset.createdAt,
    provider: asset.provider ?? null,
    modelId: asset.modelId ?? null,
    modelLabel: asset.modelLabel ?? null,
    prompt: asset.prompt ?? null,
    references: parseGenerationReferenceMetadata(asset.referenceImagesJson),
    durationMs: asset.durationMs ?? null,
    outputIndex: asset.outputIndex ?? null,
    favorite: Boolean(asset.favorite),
  };
}

function decodeGeneratedAssetStoredPath(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl) {
    return null;
  }

  try {
    const query = fileUrl.split('?', 2)[1] ?? '';
    const params = new URLSearchParams(query);
    const storedPath = params.get('path');
    return storedPath ? decodeURIComponent(storedPath) : null;
  } catch {
    return null;
  }
}

function toRendererDirectorMessage(message, references = []) {
  const {
    referenceImagesJson: _referenceImagesJson,
    partsJson: _partsJson,
    ...rendererMessage
  } = message;
  return {
    ...rendererMessage,
    parts: parseDirectorParts(message.partsJson),
    fastMode: Boolean(message.fastMode),
    references,
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

function toGenerationReferenceSnapshot(referenceImages) {
  return referenceImages.map((referenceImage) => ({
    name: referenceImage.name,
    title: referenceImage.title ?? null,
    description: referenceImage.description ?? null,
    mimeType: referenceImage.mimeType,
    bytesBase64: typeof referenceImage.bytesBase64 === 'string' ? referenceImage.bytesBase64 : null,
  }));
}

function parseGenerationReferenceSnapshot(referenceImagesJson) {
  if (!referenceImagesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(referenceImagesJson);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (referenceImage) =>
          referenceImage &&
          typeof referenceImage.name === 'string' &&
          typeof referenceImage.bytesBase64 === 'string' &&
          referenceImage.bytesBase64.length > 0
      )
      .map((referenceImage) => ({
        name: referenceImage.name,
        title: typeof referenceImage.title === 'string' ? referenceImage.title : null,
        description: typeof referenceImage.description === 'string' ? referenceImage.description : null,
        mimeType: typeof referenceImage.mimeType === 'string' ? referenceImage.mimeType : 'image/png',
        bytesBase64: referenceImage.bytesBase64,
      }));
  } catch {
    return [];
  }
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

function sortDirectorMessageRecords(messages) {
  const roleOrder = {
    system: 0,
    user: 1,
    assistant: 2,
  };

  return [...messages].sort((left, right) => {
    const leftOrder = Number.isInteger(left.messageOrder) ? left.messageOrder : null;
    const rightOrder = Number.isInteger(right.messageOrder) ? right.messageOrder : null;

    if (leftOrder !== null || rightOrder !== null) {
      if (leftOrder === null) {
        return 1;
      }
      if (rightOrder === null) {
        return -1;
      }
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
    }

    const createdAtOrder = String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? ''));
    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    const roleDelta = (roleOrder[left.role] ?? 99) - (roleOrder[right.role] ?? 99);
    if (roleDelta !== 0) {
      return roleDelta;
    }

    return String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = {
  createGenerationStore,
  getAppDataPaths,
};
