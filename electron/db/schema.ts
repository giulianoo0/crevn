import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projectsTable = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemInstructions: text('system_instructions').notNull().default(''),
  artStyle: text('art_style').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const threadsTable = sqliteTable('threads', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projectsTable.id),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const generationJobsTable = sqliteTable('generation_jobs', {
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

export const generatedAssetsTable = sqliteTable('generated_assets', {
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

export const referenceImagesTable = sqliteTable('reference_images', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  mimeType: text('mime_type').notNull(),
  bytesBase64: text('bytes_base64').notNull(),
  createdAt: text('created_at').notNull(),
});

export const sceneGroupsTable = sqliteTable('scene_groups', {
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

export const sceneFramesTable = sqliteTable('scene_frames', {
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

export const sceneFrameReferencesTable = sqliteTable('scene_frame_references', {
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

export const sceneGroupRunsTable = sqliteTable('scene_group_runs', {
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

export const sceneFrameAssetsTable = sqliteTable('scene_frame_assets', {
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

export const CREATE_PROJECTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_instructions TEXT NOT NULL DEFAULT '',
    art_style TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

export const CREATE_THREADS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`;

export const CREATE_GENERATION_JOBS_TABLE_SQL = `
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

export const CREATE_GENERATED_ASSETS_TABLE_SQL = `
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

export const CREATE_REFERENCE_IMAGES_TABLE_SQL = `
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

export const CREATE_SCENE_GROUPS_TABLE_SQL = `
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

export const CREATE_SCENE_FRAMES_TABLE_SQL = `
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

export const CREATE_SCENE_FRAME_REFERENCES_TABLE_SQL = `
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

export const CREATE_SCENE_GROUP_RUNS_TABLE_SQL = `
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

export const CREATE_SCENE_FRAME_ASSETS_TABLE_SQL = `
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
