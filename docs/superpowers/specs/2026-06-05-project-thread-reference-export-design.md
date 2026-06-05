# Project, Thread, And Reference Export Design

**Status:** Approved in chat

## Goal

Add context-menu export actions for projects, threads, and individual reference cards. Project and thread exports produce `.crenv` archives; reference exports produce `.refc` archives. Both formats are regular zip files containing structured JSON data and copied assets.

## Scope

- Add `Export project...` to the project row context menu.
- Add `Export thread...` to the thread row context menu.
- Add `Export reference...` to each reference card context menu.
- Use `yazl` to write zip archives in the Electron main process.
- Use the Electron save dialog so the user chooses the output path.
- Export only. Importing `.crenv` or `.refc` is out of scope for this feature.

## Product Behavior

Project export captures one project and all of its threads. Thread export captures one thread. Reference export captures one clicked reference card only. If that card represents a collection or environment reference, the export includes all images in that one collection or environment group.

The UI should stay quiet and tool-like:

- context menu items use existing menu primitives
- successful export shows a compact success toast
- canceled save dialog does not show an error
- failures show a concise error toast

## Archive Types

### `.crenv`

`.crenv` is a zip archive for creative workspace exports.

Project exports include:

- project metadata and settings
- all threads in the project
- generation jobs for included threads
- generated image asset records and copied image files
- director chats and messages for included threads
- scene groups, frames, frame references, runs, and scene frame assets for included threads

Thread exports include the same thread-scoped data without sibling threads.

### `.refc`

`.refc` is a zip archive for one saved reference.

Single-image reference exports include:

- reference metadata
- the image data as a file

Collection or environment reference exports include:

- group metadata
- every image in the clicked reference group
- per-image title, description, mime type, and creation metadata

## Archive Layout

Use a stable package layout that future import code can read without depending on source database table names.

```text
data/manifest.json
assets/generated/<asset-id>-<safe-file-name>
assets/scenes/<asset-id>-<safe-file-name>
assets/references/<reference-id>-<safe-file-name>
```

`data/manifest.json` contains:

- `format`: `crenv` or `refc`
- `version`: `1`
- `exportedAt`
- `scope`: `project`, `thread`, or `reference`
- `sourceApp`: app identity and version when available
- `data`: normalized records for the selected scope
- `assets`: archive-path mappings for copied files
- `missingAssets`: records for stored file paths that could not be read

Generated and scene output assets should be copied from their stored paths. Reference images and scene-frame reference attachments already live in SQLite as base64, so exporters should decode them into files and include metadata in the manifest.

## Electron Design

The main process owns archive creation because it already owns desktop integration and file system access.

Add IPC methods exposed through preload:

- `exportProject(projectId): Promise<ExportResult>`
- `exportThread(threadId): Promise<ExportResult>`
- `exportReference(payload): Promise<ExportResult>`

`ExportResult` should distinguish:

- `status: 'exported'`, with `filePath`
- `status: 'canceled'`

Errors should reject with normal structured messages so renderer toast handling can reuse existing `getErrorMessage`.

The save dialog should:

- default project exports to a sanitized project name with `.crenv`
- default thread exports to a sanitized thread name with `.crenv`
- default reference exports to a sanitized reference title with `.refc`
- filter extensions appropriately

## Data Access Design

Add database read methods that collect export snapshots without deleting or mutating data:

- project snapshot by project id
- thread snapshot by thread id
- reference snapshot from `id`, `category`, `collectionId`, and `environmentId`

The snapshot methods should return plain serializable objects and leave file copying to the export service. This keeps database code focused on records and export code focused on archive assembly.

For thread and project snapshots, include every currently persisted workflow:

- `projects`
- `threads`
- `generation_jobs`
- `generated_assets`
- `director_chats`
- `director_messages`
- `scene_groups`
- `scene_frames`
- `scene_frame_references`
- `scene_group_runs`
- `scene_frame_assets`

## Renderer Design

Project and thread row components receive optional `onExport` callbacks and render `Export project...` or `Export thread...` above destructive actions.

The references workspace wraps each reference card in the existing context-menu primitive and exposes `onExportReference(reference)`.

The top-level `App` handlers call the Electron API and display toasts:

- exported: `Exported to <file name>`
- canceled: no toast
- failed: `Export failed: <message>`

## Error Handling

The exporter should continue if an expected stored asset file is missing. It records the missing file in `missingAssets` and still creates the archive. This protects metadata and base64-backed references even when some generated files were removed externally.

Hard failures:

- selected project, thread, or reference does not exist
- output file cannot be written
- zip stream fails
- database snapshot fails

## Testing

Electron tests should cover:

- project snapshot includes all threads and thread-scoped workflow records
- thread snapshot excludes sibling project threads
- reference snapshot includes only the clicked single reference or clicked group
- `.crenv` manifest has the expected format, scope, version, data, asset mappings, and missing asset records
- `.refc` manifest includes the clicked reference assets only
- canceled save dialog returns `status: 'canceled'`

Renderer tests should cover:

- project row context menu includes export and calls the provided callback
- thread row context menu includes export and calls the provided callback
- reference card context menu includes export and calls the provided callback

## Compatibility

Existing creation, generation, director, scenes, reference editing, and delete flows must remain unchanged. Export actions are read-only except for writing the selected archive file.
