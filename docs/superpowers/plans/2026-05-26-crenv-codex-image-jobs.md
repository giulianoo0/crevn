# Crenv Codex Image Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-shot Codex image generation flow that imports generated images into persistent Electron app storage, records them in SQLite, and shows them in a simple 3-row renderer grid.

**Architecture:** Electron main owns Codex job execution, temp directories, SQLite, and file import. Preload exposes a narrow typed bridge. The renderer consumes structured asset records and renders them without any direct CLI or filesystem access.

**Tech Stack:** Electron, Vite, React, TypeScript, Tailwind v4, SQLite, Codex CLI

---

## File Structure

### Existing files to modify

- `package.json` — add runtime and test dependencies plus any needed scripts
- `electron/main.ts` — initialize app services and register IPC handlers
- `electron/preload.ts` — expose a typed renderer bridge
- `src/App.tsx` — load asset data and render the 3-row background grid
- `src/main.tsx` — add any renderer bootstrap typing/hooks if needed
- `src/index.css` — add minimal grid/background styling tokens if required

### New Electron files

- `electron/appPaths.ts` — resolve `userData`, temp job directories, db path, and generated image path
- `electron/db/schema.ts` — create tables and migration bootstrap
- `electron/db/client.ts` — SQLite connection and query helpers
- `electron/features/generation/generationTypes.ts` — shared main-process request/result types
- `electron/features/generation/codexPrompt.ts` — build the deterministic Codex batch prompt
- `electron/features/generation/codexRunner.ts` — run one-shot Codex jobs and capture result state
- `electron/features/generation/manifest.ts` — parse and validate manifest JSON
- `electron/features/generation/imageImport.ts` — validate image files and import into app data storage
- `electron/features/generation/generationRepository.ts` — persist jobs and assets
- `electron/features/generation/generationService.ts` — orchestration entrypoint used by IPC handlers
- `electron/ipc/generationHandlers.ts` — IPC registration and payload validation

### New renderer files

- `src/lib/electron-api.ts` — typed wrapper around `window.electronAPI`
- `src/components/generated-image-grid.tsx` — focused 3-row background grid
- `src/components/generated-image-grid-item.tsx` — single tile rendering primitive if needed
- `src/types/electron.d.ts` — preload bridge typings for the renderer

### Test files

- `electron/features/generation/manifest.test.ts`
- `electron/features/generation/imageImport.test.ts`
- `electron/features/generation/generationService.test.ts`
- `electron/db/client.test.ts`
- `src/components/generated-image-grid.test.tsx`

## Task 1: Add dependencies and testing base

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write the failing dependency/test plan note**

Document the exact packages to add:

- SQLite driver: `better-sqlite3`
- image metadata helper if needed: use native browser image loading in renderer first; avoid extra package unless main-process validation needs it
- tests: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@types/better-sqlite3`

- [ ] **Step 2: Update `package.json` with the minimal required packages**

Add only what phase 1 needs. Keep scripts narrow, for example:

- `test`
- optional `test:watch`

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile updates and no unresolved dependency errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add sqlite and test dependencies"
```

## Task 2: Define app data paths

**Files:**
- Create: `electron/appPaths.ts`
- Test: `electron/appPaths.test.ts` if path logic becomes nontrivial

- [ ] **Step 1: Write the failing path test or assertions**

Cover:

- db path resolves inside `app.getPath("userData")`
- generated image directory resolves under `generated-images`
- temp job root resolves under `tmp/codex-jobs`

- [ ] **Step 2: Run test to verify it fails**

Run the targeted test once added.

- [ ] **Step 3: Implement focused path helpers**

Export helpers like:

```ts
getAppDataPaths(app: Electron.App) => {
  userDataDir: string;
  databasePath: string;
  generatedImagesDir: string;
  codexJobsTempDir: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/appPaths.ts electron/appPaths.test.ts
git commit -m "feat: add app data path helpers"
```

## Task 3: Bootstrap SQLite schema

**Files:**
- Create: `electron/db/schema.ts`
- Create: `electron/db/client.ts`
- Test: `electron/db/client.test.ts`

- [ ] **Step 1: Write the failing database test**

Cover:

- schema creation succeeds in a temp db
- inserting a job works
- inserting assets linked to a job works
- listing assets returns newest first

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- electron/db/client.test.ts
```

Expected: missing module/function failures.

- [ ] **Step 3: Implement schema and client**

Define two tables:

- `generation_jobs`
- `generated_assets`

Keep schema explicit and minimal. Add an init function that creates the db and tables on app startup.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/db/schema.ts electron/db/client.ts electron/db/client.test.ts
git commit -m "feat: add generation sqlite storage"
```

## Task 4: Define generation contracts

**Files:**
- Create: `electron/features/generation/generationTypes.ts`
- Create: `electron/features/generation/codexPrompt.ts`

- [ ] **Step 1: Write the failing contract test**

Cover:

- prompt builder includes output directory
- prompt builder includes manifest path
- prompt builder includes requested image count

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement request/result and prompt builder**

Define narrow types such as:

```ts
type GenerateImagesInput = {
  prompt: string;
  count: number;
};

type GeneratedImageRecord = {
  id: string;
  jobId: string;
  path: string;
  createdAt: string;
};
```

Prompt builder must require Codex to:

- save all outputs into the provided directory
- write a JSON manifest at the provided path
- list absolute file paths only from generated images

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/generationTypes.ts electron/features/generation/codexPrompt.ts
git commit -m "feat: define codex generation contract"
```

## Task 5: Parse and validate the Codex manifest

**Files:**
- Create: `electron/features/generation/manifest.ts`
- Test: `electron/features/generation/manifest.test.ts`

- [ ] **Step 1: Write the failing manifest tests**

Cover:

- valid manifest with multiple images parses
- missing `images` array fails
- relative path fails
- empty array fails if phase 1 requires at least one image

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement parser/validator**

Return a normalized structure like:

```ts
type ParsedManifest = {
  images: Array<{ path: string }>;
};
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/manifest.ts electron/features/generation/manifest.test.ts
git commit -m "feat: validate codex image manifests"
```

## Task 6: Implement image import into app storage

**Files:**
- Create: `electron/features/generation/imageImport.ts`
- Test: `electron/features/generation/imageImport.test.ts`

- [ ] **Step 1: Write the failing import tests**

Cover:

- supported image file copies into generated-images directory
- imported file gets stable generated name
- unsupported extension or missing file fails

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement import logic**

Responsibilities:

- validate file exists
- validate extension/mime allowlist
- generate asset id and destination path
- copy file into persistent storage
- return normalized asset metadata

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/imageImport.ts electron/features/generation/imageImport.test.ts
git commit -m "feat: import generated images into app storage"
```

## Task 7: Run one-shot Codex jobs

**Files:**
- Create: `electron/features/generation/codexRunner.ts`
- Test: `electron/features/generation/generationService.test.ts`

- [ ] **Step 1: Write the failing runner/service tests**

Cover:

- service creates job temp directory
- service invokes Codex with the expected cwd and prompt
- service reads manifest after success
- non-zero exit becomes failed job state

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement the runner**

Use Node child process APIs from Electron main. Keep the runner focused:

- create job working dir
- create output dir and manifest target
- write prompt input if useful for debugging
- run `codex exec` non-interactively
- wait for exit
- return structured execution result

Do not parse human prose. The runner’s success path depends on manifest presence and validity.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/codexRunner.ts electron/features/generation/generationService.test.ts
git commit -m "feat: run one-shot codex image jobs"
```

## Task 8: Orchestrate persistence and imports

**Files:**
- Create: `electron/features/generation/generationRepository.ts`
- Create: `electron/features/generation/generationService.ts`
- Modify: `electron/db/client.ts`
- Test: `electron/features/generation/generationService.test.ts`

- [ ] **Step 1: Extend the failing service tests**

Cover:

- successful run stores one job row and many asset rows
- failed run stores failed job with error
- list method returns imported assets in display order

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement repository and service**

Service flow:

1. create pending job row
2. run Codex
3. parse manifest
4. import files
5. store assets
6. mark job succeeded
7. return asset records

Failure flow:

1. mark job failed
2. preserve error message
3. return structured failure

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/generationRepository.ts electron/features/generation/generationService.ts electron/features/generation/generationService.test.ts
git commit -m "feat: persist codex generation jobs and assets"
```

## Task 9: Expose IPC and preload bridge

**Files:**
- Create: `electron/ipc/generationHandlers.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Create: `src/types/electron.d.ts`
- Create: `src/lib/electron-api.ts`

- [ ] **Step 1: Write the failing preload/renderer contract test**

Cover:

- `window.electronAPI.generateImages` exists
- `window.electronAPI.listGeneratedImages` exists

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement IPC registration and bridge**

Main process:

- initialize db and directories on startup
- register IPC handlers that call `generationService`

Preload:

- expose typed async methods only

Renderer wrapper:

- centralize access to `window.electronAPI`

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add electron/ipc/generationHandlers.ts electron/main.ts electron/preload.ts src/types/electron.d.ts src/lib/electron-api.ts
git commit -m "feat: expose generation api over preload"
```

## Task 10: Render the 3-row background grid

**Files:**
- Create: `src/components/generated-image-grid.tsx`
- Create: `src/components/generated-image-grid-item.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `src/components/generated-image-grid.test.tsx`

- [ ] **Step 1: Write the failing renderer test**

Cover:

- renders asset images
- arranges output into three rows
- handles empty state without breaking layout

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement the grid UI**

Requirements:

- dark default shell preserved
- simple 3-row background grid
- use existing tokens
- no loud cards, no marketing treatment
- responsive enough for narrower windows

`src/App.tsx` should:

- load existing assets on mount
- optionally trigger generation later through the bridge
- render grid from normalized records

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/components/generated-image-grid.tsx src/components/generated-image-grid-item.tsx src/App.tsx src/index.css src/components/generated-image-grid.test.tsx
git commit -m "feat: show generated images in background grid"
```

## Task 11: Verify end-to-end locally

**Files:**
- Modify only as needed from failures discovered here

- [ ] **Step 1: Run unit tests**

Run:

```bash
pnpm test
```

Expected: all added tests pass.

- [ ] **Step 2: Run type/build verification**

Run:

```bash
pnpm build
```

Expected: renderer and Electron build complete without type or bundling failures.

- [ ] **Step 3: Run the app in development**

Run:

```bash
pnpm dev
```

Expected:

- Electron window opens
- existing imported assets load from SQLite
- grid renders cleanly

- [ ] **Step 4: Run one real Codex image job manually**

Use a simple prompt and verify:

- Codex writes manifest
- app imports images into `userData/generated-images`
- SQLite rows are created
- renderer updates

- [ ] **Step 5: Commit final fixes**

```bash
git add .
git commit -m "feat: add codex image job ingestion flow"
```
