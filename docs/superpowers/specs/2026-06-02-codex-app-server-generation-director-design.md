# Codex App-Server Generation And Director Design

**Status:** Draft

**Goal**

Replace the current per-job `codex exec` image and Director paths with a Codex-only app-server runtime that is faster to start, easier to cancel, safer to order in the UI, and still uses Codex account limits instead of OpenAI API image billing.

## Context

The app is Electron + Vite + React. The renderer owns the studio UI, while Electron main owns desktop integration, SQLite persistence, filesystem access, and all Codex orchestration.

The current implementation has two separate Codex paths:

- Classic image jobs and Scenes frame jobs call `generateImages`, which creates a temp job directory, launches `codex exec`, asks Codex to generate image files, then imports a manifest.
- Director calls `sendDirectorMessage`, inserts user and assistant rows, then launches another one-shot `codex exec` text stream.

The slow logs are consistent with this shape. The `find | cp` commands are effectively instant; the long gaps are waiting for repeated Codex runs and image generation. Starting a full Codex CLI agent for every image/frame/message also makes cancellation and event ordering harder.

OpenAI's Codex app-server docs describe a persistent server lifecycle: start `codex app-server`, send `initialize`, emit `initialized`, call `thread/start` or `thread/resume`, call `turn/start`, read notifications such as `item/agentMessage/delta`, and finish on `turn/completed`. The API overview also exposes `turn/interrupt`, `model/list`, and thread resume/list operations. Those docs are the right source for the Director rewrite and for replacing repeated CLI bootstraps with a durable Codex runtime.

This design intentionally does **not** use the OpenAI Image API or Responses image generation. Image work must remain Codex-owned so it consumes Codex limits rather than API billing.

## Selected Approach

Use a **Codex-only persistent runtime**:

1. Electron main owns one app-server process manager.
2. Director chats use app-server threads and turns directly.
3. Classic and Scenes image jobs use app-server turns that run in job-scoped working directories and emit one accepted-image event per output.
4. The renderer continues to receive structured IPC events and never talks to Codex, the filesystem, or shell processes directly.
5. SQLite gets explicit ordering and provider-runtime fields so streaming events are idempotent and restart-safe.

This keeps the useful part of the current architecture: Codex generates files, Electron imports them, SQLite is the source of truth, and the renderer only displays structured records. It removes the repeated `codex exec` bootstrap from the hot path.

## Architecture

### Codex app-server runtime

Add a small CommonJS runtime layer because the active Electron main path uses `.cjs` files.

Responsibilities:

- spawn `codex app-server` over stdio
- send `initialize` and `initialized`
- expose request helpers for `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, `model/list`, and `thread/unsubscribe`
- route app-server notifications by thread id and turn id
- restart the process after unexpected exit
- reject in-flight requests with a clear Codex runtime error on crash
- shut down on Electron app quit

The process manager must be main-process only. No app-server transport details should leak to the renderer.

### Director runtime

Director becomes a thin chat adapter on top of app-server:

- each Director chat stores the Codex app-server thread id
- sending a message creates the user and assistant placeholder rows before starting the turn
- the placeholder emits immediately so the UI can render the user message and `Thinking...`
- deltas update only the assistant row for the active turn
- completion marks the assistant row `completed`, `failed`, or `interrupted`
- cancel calls `turn/interrupt`

Director history should be app-server-native after migration. The local SQLite messages remain the app UI cache and ordering source. Existing legacy chats without app-server thread ids should start a new app-server thread on their first post-migration turn and include a compact local-history preamble in that first turn.

### Image job runtime

Classic and Scenes generation still use Codex to create files in a known output directory. The difference is that Electron starts a Codex app-server turn instead of launching `codex exec`, and images are registered as soon as Codex marks each one ready.

Each image job gets:

- a job id
- a working directory under `tmp/codex-jobs`
- an output directory
- staged reference images
- a strict prompt contract
- an app-server thread id recorded against the generation job
- one active app-server turn id for cancellation and progress

For Classic, one app-server turn should handle the requested image count in a single job whenever possible.

For Scenes, frame generation should still produce one `generation_jobs` record per frame or per target frame, but jobs should run through a bounded app-server queue instead of launching unbounded one-shot CLIs. The default concurrency should be conservative, for example two active frame turns, to avoid making the Codex runtime unstable.

### Streaming image registration

The final manifest should be removed from the required success path. Electron should not wait for all requested images before importing the first accepted output.

Each image job should use this directory shape:

- `output/tmp/` for images still being generated or reviewed
- `output/ready/` for accepted images and their sidecar records
- `output/events.jsonl` for append-only ready events

For each accepted image, Codex must:

1. write the candidate image under `output/tmp/`
2. review or regenerate it as needed
3. atomically move the accepted image into `output/ready/`
4. write a sidecar JSON record into `output/ready/`
5. append the same record to `output/events.jsonl`
6. print a single-line event to stdout/app-server output

The stdout event format should be:

```text
CRENV_IMAGE_READY {"schema":"crenv.image.ready.v1","jobId":"job-id","imageId":"image-id","outputIndex":0,"path":"output/ready/000.png","role":"master_wide","reviewStatus":"accepted","sha256":"optional","width":1536,"height":1024}
```

Electron should treat `CRENV_IMAGE_READY` as the fastest signal, then validate the sidecar/image file before importing. The sidecar and `events.jsonl` are the recovery path if stdout/app-server notifications are missed or duplicated.

The per-image ingestion path is:

1. receive or discover a ready event
2. validate `jobId`, `imageId`, `outputIndex`, `reviewStatus`, and path containment under `output/ready/`
3. import the single image into persistent generated image storage
4. insert `generated_assets` idempotently by `jobId + imageId`
5. insert `scene_frame_assets` for Scenes when applicable
6. emit existing renderer events immediately

When the Codex turn completes, Electron should scan `output/ready/*.json` and `output/events.jsonl` once more to register any accepted images missed during streaming. Job success should be based on imported accepted image count, requested count, and turn status, not on a final manifest file.

### Message ordering

The Director ordering bug must be fixed at the persistence layer.

Add `director_messages.message_order INTEGER NOT NULL`. Sort by `message_order` first everywhere. For future sends, insert the user and assistant rows in one transaction with adjacent orders:

- user: next order
- assistant: next order + 1

Existing rows should be backfilled by the legacy display order. After migration, frontend sorting by timestamp or role should be fallback-only.

### Markdown and Thinking UI

The Director row should keep the current virtualization, but the assistant rendering should be cleaned up.

Use `src/components/ai-elements/shimmer.tsx` for empty streaming assistant messages. If the shimmer color variables do not match the app tokens, adjust the component to use the current dark token variables while keeping the same API.

Extract the assistant markdown styling from the large inline class in `App.tsx` into a focused reusable component or exported class. Keep `Streamdown`, but style markdown for this app:

- compact paragraphs
- readable headings without marketing scale
- dark translucent code blocks with soft borders
- horizontal scrolling for long code lines
- distinct inline code treatment
- clean list, table, blockquote, and link styling

## Data Model Changes

Add fields to `director_chats`:

- `provider_thread_id TEXT`
- `provider_runtime TEXT NOT NULL DEFAULT 'codex-app-server'`

Add fields to `director_messages`:

- `message_order INTEGER`
- `provider_turn_id TEXT`
- `provider_item_id TEXT`

Add fields to `generation_jobs`:

- `provider_thread_id TEXT`
- `provider_turn_id TEXT`
- `runtime TEXT NOT NULL DEFAULT 'codex-app-server'`
- `imported_count INTEGER NOT NULL DEFAULT 0`

Add fields to `generated_assets`:

- `provider_image_id TEXT`
- `output_index INTEGER`
- `review_status TEXT`

Indexes:

- `director_messages(chat_id, message_order)`
- `generation_jobs(provider_thread_id)`
- unique `generated_assets(job_id, provider_image_id)` where `provider_image_id` is present

Backfill:

- Director messages get sequential `message_order` per chat using legacy `created_at, id` order.
- Existing generation jobs keep null provider thread/turn ids.

## Compatibility

The renderer IPC shape should stay mostly compatible:

- `generateImages`
- `generateSceneGroup`
- `sendDirectorMessage`
- `cancelDirectorChat`
- existing stream subscriptions

New fields can be added to returned records, but the UI should not require a renderer-wide rewrite. Existing tests and fixtures should be updated to include `messageOrder` where Director records are mocked.

The old `codex exec` runners should remain as a temporary fallback until the app-server path has focused tests and manual acceptance. They should no longer be the default for Classic, Scenes, or Director.

## Failure Modes

- If app-server is missing, show a clear "Codex CLI/app-server is not installed" error.
- If app-server crashes mid-turn, mark the active job/message failed and preserve partial Director content.
- If a Director turn is interrupted, mark the assistant message `failed` or `interrupted` consistently and keep partial content.
- If a generated image turn completes with no accepted images, mark the job failed and keep the working directory for debugging.
- If a ready event is duplicated, ignore it after confirming the existing `generated_assets(job_id, provider_image_id)` row.
- If stdout emits a ready event before the file is fully visible, retry the sidecar/image validation briefly before marking only that image event failed.
- If a Scenes frame fails, mark the scene group run failed only when all requested frames fail; otherwise record partial success and surface per-frame errors.

## Research Notes

- OpenAI Codex app-server docs: `https://developers.openai.com/codex/app-server`
- App-server lifecycle documented there: initialize once, start or resume thread, start turn, stream notifications, finish on `turn/completed`, cancel with `turn/interrupt`.
- T3Code public implementation uses a persistent Codex app-server runtime for sessions and keeps one-shot `codex exec` for separate short text generation tasks. The relevant architectural lesson is to make app-server the long-lived interactive runtime and isolate provider orchestration behind a backend service.
