# Codex App-Server Generation And Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Classic image jobs, Scenes frame jobs, and Director chat to use a Codex-only persistent app-server runtime, with stable Director message ordering and improved Thinking/markdown rendering.

**Architecture:** Electron main owns a new Codex app-server process manager and focused adapters for Director turns and image-generation turns. The existing SQLite records, asset import flow, IPC names, and renderer surfaces remain mostly stable, but persistence gains provider thread/turn ids and explicit message ordering. The implementation deliberately avoids OpenAI Image API usage.

**Tech Stack:** Electron main CommonJS, Codex CLI `app-server`, SQLite via Drizzle/libSQL, React 19, Tailwind v4, Streamdown, existing `Shimmer`, Vitest, pnpm.

---

### Task 1: Lock The Current Failure With Tests

**Files:**
- Modify: `electron/generation.test.ts`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add backend tests for Director ordering**

Add tests showing that when a user and assistant message share the same timestamp, `listDirectorMessages(chatId)` returns the user before the assistant by persisted order, not by id.

- [ ] **Step 2: Add renderer tests for event race ordering**

Add a test where the Director start event arrives before `sendDirectorMessage` resolves, and another where completion arrives quickly after start. Assert the rendered user prompt appears before the assistant content in the Director workspace.

- [ ] **Step 3: Add renderer tests for Thinking and markdown**

Assert an empty streaming assistant message renders `Thinking...` through the shimmer mock, and assistant markdown/code content renders through the shared markdown surface.

- [ ] **Step 4: Run focused tests and record expected failures**

Run:

```bash
pnpm exec vitest run electron/generation.test.ts src/App.test.tsx
```

Expected: FAIL on missing `messageOrder` behavior and new markdown/order expectations.


### Task 2: Add Persistence Fields And Stable Ordering

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `electron/db/schema.ts`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add schema fields**

Add:

- `director_chats.provider_thread_id`
- `director_chats.provider_runtime`
- `director_messages.message_order`
- `director_messages.provider_turn_id`
- `director_messages.provider_item_id`
- `generation_jobs.provider_thread_id`
- `generation_jobs.provider_turn_id`
- `generation_jobs.runtime`
- `generation_jobs.imported_count`
- `generated_assets.provider_image_id`
- `generated_assets.output_index`
- `generated_assets.review_status`

- [ ] **Step 2: Add migration/backfill logic**

During database initialization, detect missing columns with `PRAGMA table_info`, add them with `ALTER TABLE`, then backfill `director_messages.message_order` per chat using legacy `created_at, id` order. Create indexes for `director_messages(chat_id, message_order)`, `generation_jobs(provider_thread_id)`, and a unique generated-asset key for `job_id + provider_image_id` when the provider image id is present.

- [ ] **Step 3: Update Director inserts**

In `sendDirectorMessage`, compute the next message order inside the same critical section that inserts the user and assistant messages:

- user gets `nextOrder`
- assistant gets `nextOrder + 1`

Return `messageOrder` in IPC payloads.

- [ ] **Step 4: Update Director reads**

Change all Director history reads to order by `message_order`, then `created_at`, then `id`. Keep fallback handling for legacy rows if migration did not run in older fixture databases.

- [ ] **Step 5: Update renderer merge logic**

Change `mergeDirectorMessages` in `src/App.tsx` to dedupe by id and sort by `messageOrder` first. Use timestamp/id only as fallback. Remove role-based ordering as the primary correction mechanism.

- [ ] **Step 6: Run ordering tests**

Run:

```bash
pnpm exec vitest run electron/generation.test.ts src/App.test.tsx
```

Expected: ordering tests PASS; app-server tests still not present or still pending.


### Task 3: Build The Codex App-Server Client

**Files:**
- Create: `electron/codexAppServerClient.cjs`
- Test: `electron/codexAppServerClient.test.ts`
- Modify: `electron/generation.cjs`

- [ ] **Step 1: Write protocol client tests**

Use a fake child process or injected transport to test:

- request id allocation
- `initialize` request then `initialized` notification
- JSON message parsing across chunk boundaries
- notification dispatch
- rejected pending requests on process exit
- timeout/error propagation

- [ ] **Step 2: Implement client transport**

Implement a small JSON-RPC client with:

- `start()`
- `request(method, params)`
- `notify(method, params)`
- `onNotification(listener)`
- `dispose()`

The real process command is `codex app-server` over stdio.

- [ ] **Step 3: Add app-server lifecycle helpers**

Expose typed helpers:

- `startThread(params)`
- `resumeThread(threadId)`
- `startTurn(params)`
- `interruptTurn(threadId, turnId)`
- `listModels()`
- `unsubscribeThread(threadId)`

- [ ] **Step 4: Add runtime wiring to generation store**

Create the app-server client once per generation store instance. Dispose it from the existing Electron app shutdown path if a shutdown hook exists, or expose a `dispose` method from the store for `main.cjs` to call.

- [ ] **Step 5: Run client tests**

Run:

```bash
pnpm exec vitest run electron/codexAppServerClient.test.ts
```

Expected: PASS without spawning real Codex.


### Task 4: Rewrite Director To Use App-Server Turns

**Files:**
- Create: `electron/directorAppServerRuntime.cjs`
- Modify: `electron/generation.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Test: `electron/generation.test.ts`

- [ ] **Step 1: Add failing Director app-server tests**

Mock the app-server client and test:

- new chat starts a provider thread
- existing chat resumes the provider thread
- `turn/start` is called with prompt, model, cwd, sandbox, and fast settings
- app-server `item/agentMessage/delta` updates the assistant row
- `turn/completed` marks the row completed
- `turn/interrupt` is called on cancel

- [ ] **Step 2: Implement Director runtime adapter**

Move Director app-server specifics into `directorAppServerRuntime.cjs`. It should accept:

- chat/project/thread context
- local user prompt
- reference images metadata
- target assistant message id
- selected Codex model
- fast mode
- callbacks for delta, complete, error

- [ ] **Step 3: Persist provider thread and turn ids**

On first message after migration, call `thread/start` and save `provider_thread_id` on `director_chats`. On later messages, call `thread/resume`. Save the active app-server turn id on the assistant message when available.

- [ ] **Step 4: Replace `runCodexTextStreamJob` for Director**

Stop using the one-shot text stream runner in `sendDirectorMessage`. Keep it only as temporary fallback behind an internal guard if app-server startup fails during rollout.

- [ ] **Step 5: Update cancellation**

Change `cancelDirectorChat(chatId)` to call app-server `turn/interrupt` for the active chat. Preserve partial assistant content and emit the existing error/cancel event.

- [ ] **Step 6: Run Director tests**

Run:

```bash
pnpm exec vitest run electron/generation.test.ts src/App.test.tsx
```

Expected: PASS for Director persistence, ordering, streaming, and cancel behavior.


### Task 5: Rewrite Classic Image Jobs Onto App-Server

**Files:**
- Create: `electron/codexImageJobRuntime.cjs`
- Modify: `electron/generation.cjs`
- Modify: `electron/features/generation/generationService.ts`
- Modify: `electron/features/generation/generationService.test.ts`
- Test: `electron/generation.test.ts`

- [ ] **Step 1: Add failing image job runtime tests**

Mock app-server and filesystem behavior. Test that a Classic generation:

- creates a job-scoped working directory
- stages reference images
- starts or reuses a job provider thread
- starts one Codex turn with the streaming image-ready prompt
- imports an image immediately when a valid `CRENV_IMAGE_READY` event arrives
- ignores duplicate ready events for the same `jobId + imageId`
- scans sidecar records after turn completion for any missed ready events
- updates `generation_jobs` with provider thread/turn ids

- [ ] **Step 2: Implement `codexImageJobRuntime.cjs`**

Create a runtime that receives the existing `generateImages` normalized input and uses app-server `turn/start` instead of `spawn('codex', ['exec', ...])`. The runtime should emit per-image callbacks as soon as accepted outputs are ready, then return final turn status and imported count.

- [ ] **Step 3: Replace the manifest contract with ready events**

Change the Codex prompt contract to require:

- write in-progress images under `output/tmp/`
- review/regenerate candidates as needed before exposing them
- atomically move accepted images into `output/ready/`
- write `output/ready/<imageId>.json` sidecar records
- append the same record to `output/events.jsonl`
- print `CRENV_IMAGE_READY {...}` once per accepted image

No final manifest is required.

- [ ] **Step 4: Add ready-event parsing and validation**

Implement parsing for:

```text
CRENV_IMAGE_READY {"schema":"crenv.image.ready.v1","jobId":"...","imageId":"...","outputIndex":0,"path":"output/ready/000.png","reviewStatus":"accepted"}
```

Validate schema, job id, image id, review status, output index, path containment under `output/ready/`, file existence, and optional sidecar consistency before importing.

- [ ] **Step 5: Wire Classic `generateImages`**

Change the default Codex provider path in `generateImages` to use the app-server runtime. Leave Antigravity and old `codex exec` paths available as explicit fallback/internal legacy paths, not the default.

- [ ] **Step 6: Update progress and cancellation**

Map app-server notifications and `CRENV_IMAGE_READY` events to existing generation progress events where possible. Store active image job turn ids so cancel can interrupt the turn instead of killing a process.

- [ ] **Step 7: Run image job tests**

Run:

```bash
pnpm exec vitest run electron/generation.test.ts electron/features/generation/generationService.test.ts
```

Expected: PASS with mocked app-server, no real Codex invocation.


### Task 6: Rewrite Scenes Frame Generation Onto The Same Runtime

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `src/App.test.tsx`
- Test: `electron/generation.test.ts`

- [ ] **Step 1: Add failing Scenes runtime tests**

Test that `generateSceneGroup`:

- builds one image job per selected frame
- uses the Codex app-server image runtime
- limits active frame turns to a small concurrency value
- records each successful frame asset as soon as that frame's accepted image event arrives
- preserves partial successes
- emits existing `onSceneFrameReady` events

- [ ] **Step 2: Add bounded concurrency**

Replace direct `Promise.allSettled(tasks.map(generateImages))` with a small queue. Default to two concurrent frame jobs. Keep the value local/internal for now.

- [ ] **Step 3: Store per-frame provider metadata**

Ensure frame generation jobs and scene group runs preserve provider/model labels and can be debugged back to app-server thread/turn ids.

- [ ] **Step 4: Register scene frames from ready events**

When a frame job receives a valid `CRENV_IMAGE_READY` event, import the image, insert the `generated_assets` row, insert the matching `scene_frame_assets` row, and emit `onSceneFrameReady` immediately. Completion should reconcile sidecar records but should not be required before displaying already accepted frames.

- [ ] **Step 5: Keep renderer compatibility**

Do not change `generateSceneGroup` IPC input unless required. If returned records gain fields, update fixtures but keep existing UI behavior.

- [ ] **Step 6: Run Scenes tests**

Run:

```bash
pnpm exec vitest run electron/generation.test.ts src/App.test.tsx
```

Expected: PASS for Scenes generation and existing scene UI tests.


### Task 7: Improve Director Thinking And Markdown Rendering

**Files:**
- Modify: `src/components/ai-elements/shimmer.tsx`
- Modify: `src/components/ai-elements/message.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Extract Director markdown styling**

Move the large assistant markdown class list out of `DirectorMessageRow` into either:

- a `directorMarkdownClassName` export near `MessageResponse`, or
- a small `DirectorMarkdownResponse` component.

- [ ] **Step 2: Improve code block style**

Use Tailwind v4 classes and app tokens for:

- `pre`: rounded studio surface, soft border, horizontal overflow, compact padding
- block `code`: Geist Mono, readable line height
- inline `code`: subtle `surface2` chip treatment

- [ ] **Step 3: Improve markdown spacing**

Tune paragraph, list, table, blockquote, heading, and link classes for dense dark studio UI. Avoid oversized headings and decorative gradients.

- [ ] **Step 4: Validate shimmer tokens**

Ensure `Shimmer` uses variables that exist in this app shell and remains readable on dark surfaces. Keep its public props unchanged.

- [ ] **Step 5: Run renderer tests**

Run:

```bash
pnpm exec vitest run src/App.test.tsx
```

Expected: PASS.


### Task 8: Cleanup, Guardrails, And Manual Acceptance

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `docs/superpowers/specs/2026-06-02-codex-app-server-generation-director-design.md`
- Modify if needed: `docs/superpowers/plans/2026-06-02-codex-app-server-generation-director.md`

- [ ] **Step 1: Add explicit no-Image-API guardrail**

Add a code comment or provider naming guard where image providers are resolved: the Codex image path must use app-server/Codex and must not call OpenAI Image API clients.

- [ ] **Step 2: Remove accidental default CLI exec usage**

Search for default paths that still route Classic, Scenes, or Director to `codex exec`. Keep old runners only as clearly named fallback utilities.

Run:

```bash
rg -n "runCodexJob|runCodexTextStreamJob|codex exec|Image API|images.generate|images.edit" electron src docs
```

Expected: only fallback docs/tests or explicit negative guardrails remain.

- [ ] **Step 3: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run the app and verify:

- Classic prompt generates assets through Codex
- Classic reference-assisted prompt generates assets
- Scenes batch generates multiple frames with progress
- Director sends two rapid messages without ordering inversion
- Director shows `Thinking...` before first delta
- Director cancel preserves partial content and unlocks the composer
- markdown code blocks render cleanly

- [ ] **Step 5: Commit**

Commit the completed implementation in coherent chunks:

```bash
git add electron src docs
git commit -m "feat: move generation and director to codex app-server"
```
