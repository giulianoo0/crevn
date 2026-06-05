# Auto Update Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add packaged-app auto updates backed by electron-builder GitHub releases, then publish a release containing the Windows image-generation fix.

**Architecture:** Keep update orchestration in the Electron main process and expose a small preload IPC surface for manual check/install actions. Use `electron-updater` with the existing `electron-builder.yml` GitHub `publish` provider so packaged builds read the generated update metadata from GitHub releases. Skip update checks during development and tests unless explicitly injected.

**Tech Stack:** Electron main/preload CommonJS, `electron-updater`, electron-builder GitHub publish, Vitest, pnpm.

---

### Task 1: Add Auto Update Runtime

**Files:**
- Create: `electron/autoUpdate.cjs`
- Create: `electron/autoUpdate.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add `electron-updater`**

Run: `pnpm add electron-updater`
Expected: `package.json` contains `electron-updater` in dependencies and lockfile is updated.

- [ ] **Step 2: Write updater tests**

Create tests that verify:
- updater skips when `app.isPackaged` is false
- updater registers core status events and sends them to the current window
- manual install calls `quitAndInstall` only after `update-downloaded`

Run: `pnpm vitest run electron/autoUpdate.test.ts`
Expected before implementation: FAIL because `electron/autoUpdate.cjs` does not exist.

- [ ] **Step 3: Implement updater manager**

Create `createAutoUpdateManager({ app, autoUpdater, getWindow, logger, checkDelayMs })` with:
- `start()` schedules `checkForUpdatesAndNotify()` only for packaged apps
- `checkNow()` performs an explicit check for packaged apps
- `installNow()` calls `quitAndInstall(false, true)` only after a download completes
- event handlers for `checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded`, and `error`
- status payloads sent over `app:updateStatus`

- [ ] **Step 4: Verify updater tests**

Run: `pnpm vitest run electron/autoUpdate.test.ts`
Expected: PASS.

### Task 2: Wire Main/Preload IPC

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/types/electron.d.ts`
- Modify: `src/lib/electron-api.ts`

- [ ] **Step 1: Wire main process**

Import `createAutoUpdateManager`, instantiate it after the main window and generation store are ready, call `start()`, and add IPC handlers:
- `app:getUpdateStatus`
- `app:checkForUpdates`
- `app:installUpdate`

- [ ] **Step 2: Expose preload methods**

Expose:
- `getUpdateStatus()`
- `checkForUpdates()`
- `installUpdate()`
- `onUpdateStatus(listener)`

- [ ] **Step 3: Update renderer type helpers**

Add `ElectronUpdateStatus` types and helper wrappers in `src/lib/electron-api.ts`.

- [ ] **Step 4: Run focused and full tests**

Run:
- `pnpm vitest run electron/autoUpdate.test.ts electron/codexImageJobRuntime.test.ts`
- `pnpm test`

Expected: all tests pass.

### Task 3: Commit, Push, Release

**Files:**
- Existing changed files from Tasks 1-2 plus the Windows image runtime fix.

- [ ] **Step 1: Bump release version**

Update `package.json` from `0.1.3` to `0.1.4` so GitHub release/update metadata is published under a fresh tag.

- [ ] **Step 2: Inspect scope**

Run: `git status -sb` and `git diff --stat`
Expected: only updater files, dependency metadata, image runtime fix, and this plan are changed.

- [ ] **Step 3: Build**

Run: `pnpm run build`
Expected: Vite and electron-builder complete and create release artifacts/update metadata under `release/`.

- [ ] **Step 4: Commit**

Run:
```bash
git add electron/autoUpdate.cjs electron/autoUpdate.test.ts electron/main.cjs electron/preload.cjs src/types/electron.d.ts src/lib/electron-api.ts electron/codexImageJobRuntime.cjs electron/codexImageJobRuntime.test.ts package.json pnpm-lock.yaml docs/superpowers/plans/2026-06-05-auto-update-release.md
git commit -m "fix: harden windows image generation and add auto updates"
```

- [ ] **Step 5: Push**

Run: `git push origin main`
Expected: main branch is pushed to GitHub.

- [ ] **Step 6: Publish release**

Use the existing `electron-builder.yml` GitHub publish config and package version.
Run: `pnpm exec electron-builder --publish always`
Expected: GitHub Release for the package version is created/updated with installers and update metadata.
