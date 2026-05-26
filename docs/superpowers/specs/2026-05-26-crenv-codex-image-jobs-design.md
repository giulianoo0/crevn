# Crenv Codex Image Jobs Design

**Status:** Approved in chat

**Goal**

Add a first-pass Codex-powered image generation flow to the Electron app that runs one-shot jobs, imports the generated image files into persistent app storage, records them in SQLite, and renders them in a simple 3-row background grid in the renderer.

## Context

The current app is a Vite + React renderer with a minimal Electron shell:

- `electron/main.ts` creates the window and owns desktop integration.
- `electron/preload.ts` currently exposes a tiny bridge.
- `src/App.tsx` is the main renderer surface.

The product direction is a professional AI editing studio. For this phase, the integration should stay narrow:

- no persistent Codex app-server runtime
- no in-renderer process execution
- no complex job management UI
- no source-tree asset storage

The useful lesson from `pingdotgg/t3code` is architectural, not framework-level: keep Codex orchestration in the backend layer, surface only structured results to the UI, and avoid having the renderer talk directly to the CLI.

## Selected Approach

Use a **one-shot Codex batch job plus app ingestion** flow:

1. Electron main starts a single Codex CLI job in a temporary working folder.
2. The job is given a strict contract:
   - generate one or more image files
   - save them inside a known output directory
   - write a JSON manifest at a known path
3. The app validates the manifest and files.
4. The app copies the files into persistent app data storage under the `crenv` app identity.
5. The app records the job and imported assets in SQLite.
6. The renderer loads the latest assets and displays them in a basic 3-row grid.

## Rejected Alternatives

### Parse stdout for image paths

Rejected because it is brittle. Any prompt drift or extra Codex prose would break ingestion.

### Stand up `codex app-server` now

Rejected because it adds session/runtime complexity that phase 1 does not need. The first requirement is batch generation and import, not a live multi-turn Codex workspace.

### Store generated files in `src/assets`

Rejected because installed apps need writable persistent storage outside the bundled renderer tree.

## Architecture

### Electron main process

The main process owns the full integration surface:

- launching Codex jobs
- creating temp job directories
- locating the persistent app data root
- importing generated files
- writing to SQLite
- exposing IPC handlers to the renderer

This logic should live in small focused modules under `electron/`, not inline inside the window bootstrap file.

### Preload bridge

The preload layer exposes a small safe API such as:

- `generateImages(input)`
- `listGeneratedImages()`
- `listGenerationJobs()` if needed for debugging

Phase 1 does not require streaming job events. A simple request/response shape is enough.

### Renderer

The renderer remains thin:

- call preload API
- fetch current generated assets on load
- render them in a calm 3-row background grid

No Node access, file system access, or Codex invocation should exist in React components.

## Storage Design

### App identity

Use the app name `crenv` for storage and database naming.

### Persistent paths

Use Electron's `app.getPath("userData")` as the persistent root.

Planned layout:

- `<userData>/crenv.sqlite`
- `<userData>/generated-images/`
- `<userData>/tmp/codex-jobs/`

Notes:

- `generated-images/` holds imported assets only.
- `tmp/codex-jobs/` is for short-lived Codex working directories and manifests.
- temp job directories should be deleted after successful import, with an option to keep failed jobs for debugging later if needed.

## SQLite Design

Phase 1 needs two tables.

### `generation_jobs`

Purpose:

- track each one-shot Codex execution
- keep prompt/debuggable job metadata

Suggested fields:

- `id`
- `prompt`
- `requested_count`
- `status` (`pending`, `running`, `succeeded`, `failed`)
- `working_directory`
- `manifest_path`
- `error_message`
- `created_at`
- `updated_at`

### `generated_assets`

Purpose:

- track imported image files shown in the UI

Suggested fields:

- `id`
- `job_id`
- `original_path`
- `stored_path`
- `file_name`
- `mime_type`
- `width` nullable
- `height` nullable
- `created_at`

Phase 1 does not need tags, variants, folders, or user annotations.

## Codex Job Contract

The Codex integration must be deterministic.

Each job will receive:

- a working directory
- an output directory inside that working directory
- a required manifest file path
- the user prompt
- the requested image count

The Codex prompt must explicitly require:

1. generate the requested images
2. save image files only into the provided output directory
3. write a JSON manifest to the provided path
4. include every generated file in that manifest
5. avoid using freeform prose as the machine contract

### Manifest shape

Phase 1 should use a minimal shape like:

```json
{
  "images": [
    {
      "path": "/absolute/path/to/image-1.png"
    }
  ]
}
```

Optional metadata can be added later, but the app only needs paths for phase 1.

## Ingestion Rules

After Codex exits:

1. verify the manifest exists
2. parse manifest JSON
3. verify each referenced path exists and is a file
4. verify file type is a supported image format
5. copy file to `<userData>/generated-images/<asset-id>.<ext>`
6. insert DB rows for the job and each imported asset

The app should trust only manifest-listed files, not everything inside the output directory.

## Error Handling

Phase 1 should handle these failure classes cleanly:

- Codex CLI missing
- Codex CLI exits non-zero
- manifest missing
- manifest invalid JSON
- manifest contains nonexistent files
- generated file is not a supported image
- copy/import failure
- SQLite write failure

For the renderer, failures should become structured user-facing errors, not raw stack traces.

## UI Design

The first UI target is intentionally basic:

- keep the current dark shell
- render generated assets in a simple 3-row grid in the background area
- newest assets first
- no nested cards or marketing layout

Phase 1 can use:

- `object-cover`
- quiet rounded corners
- token-based dark surfaces
- dense spacing consistent with the existing shell

No light theme work is included.

## Security and Boundaries

- Renderer never executes Codex directly.
- Renderer never gets arbitrary filesystem access.
- Preload exposes only specific IPC-backed methods.
- Main process validates all paths before import.
- Persistent storage lives under app data, not repo files.

## Testing Strategy

Phase 1 should focus on main-process tests and small renderer smoke coverage:

- manifest parsing and validation
- import path generation
- SQLite insert/query behavior
- Codex runner result normalization using mocked process output
- renderer grid renders asset records returned from preload

Tests should avoid invoking real Codex in CI by default.

## Phase 1 Deliverable

Phase 1 is complete when:

1. the app can start a one-shot Codex generation job
2. Codex-generated images are imported into persistent `crenv` app data storage
3. jobs and assets are stored in SQLite
4. the renderer shows imported images in a simple 3-row background grid

## Out of Scope

- persistent Codex sessions
- multi-turn conversation UI
- asset deletion flows
- asset tagging or search
- compare/version history
- video generation
- cloud sync
- advanced queue management
