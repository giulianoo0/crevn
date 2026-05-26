# Project Properties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent per-project `Propriedades` dialog with `System Instructions` and `Art Style`, stored in SQLite and editable from the project context menu.

**Architecture:** Extend the existing `projects` record with typed settings columns, thread those fields through the Electron bridge, and add a focused renderer dialog that edits one selected project at a time. Keep the first pass explicit and narrow: one `General` tab, explicit save, and local renderer state updates after persistence succeeds.

**Tech Stack:** Electron, React, TypeScript, Vitest, Testing Library, Drizzle ORM, SQLite, Tailwind CSS v4, Base UI dialog/context menu primitives

---

### Task 1: Lock the database contract with failing tests

**Files:**
- Modify: `electron/db/client.test.ts`

- [ ] **Step 1: Write failing tests for project settings persistence and update behavior**

Add coverage for:
- project records including `systemInstructions` and `artStyle`
- updating one project's settings without mutating another project
- opening a database created with the old `projects` shape and verifying the new columns are available after initialization

- [ ] **Step 2: Run the database test file to verify the new tests fail for the expected reason**

Run: `pnpm vitest run electron/db/client.test.ts`
Expected: FAIL with missing fields and/or missing update API behavior

- [ ] **Step 3: Implement the minimal database changes**

Update:
- `electron/db/schema.ts`
- `electron/db/client.ts`

Work to include:
- add `system_instructions` and `art_style` columns to the table definition and create-table SQL
- add a startup migration that `ALTER TABLE`s existing databases when those columns are missing
- extend `ProjectRecord` and `ProjectWithThreads`
- add an explicit `updateProjectSettings(projectId, payload)` method

- [ ] **Step 4: Re-run the database test file and make it pass**

Run: `pnpm vitest run electron/db/client.test.ts`
Expected: PASS

- [ ] **Step 5: Refactor only if needed while keeping tests green**

Keep any migration helper or project mapping logic small and explicit.

### Task 2: Lock the Electron bridge contract with failing renderer tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/main.cjs`

- [ ] **Step 1: Write failing renderer tests for opening and saving project properties**

Add coverage for:
- opening `Propriedades` for a project
- rendering stored `System Instructions` and `Art Style`
- calling a dedicated save API with project id and edited values
- preserving the dialog on save failure

- [ ] **Step 2: Run the app test file to verify the new tests fail correctly**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL because the dialog and update API do not exist yet

- [ ] **Step 3: Implement the minimal bridge and type surface**

Update:
- `src/lib/electron-api.ts`
- `src/types/electron.d.ts`
- `electron/preload.ts`
- `electron/preload.cjs` if required by repo conventions
- `electron/main.cjs`

Work to include:
- extend project typings with `systemInstructions` and `artStyle`
- add `updateProjectSettings(projectId, payload)` to the renderer API, preload bridge, and IPC handlers
- connect the IPC handler to the new DB method

- [ ] **Step 4: Re-run the app test file and confirm the failures narrow to missing UI implementation**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL only on missing dialog/context menu behavior, not on missing bridge API

### Task 3: Build the project properties UI and make the renderer tests pass

**Files:**
- Create: `src/components/project-properties-dialog.tsx`
- Modify: `src/components/project-row.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Implement the dialog component with the single `General` tab**

Build:
- a `1000px`-class dark dialog shell
- left tab rail styled like the sidebar
- right content area with `System Instructions` textarea and `Art Style` select
- explicit `Cancel` and `Save` actions

- [ ] **Step 2: Wire the project row context menu to expose `Propriedades`**

Add a new callback prop and keep the existing rename/delete behavior unchanged.

- [ ] **Step 3: Wire dialog state and save behavior in `src/App.tsx`**

Add:
- selected project id for properties editing
- dialog open state
- local draft loading from the selected project
- save handler that updates local `projects` state and shows success/error toasts

- [ ] **Step 4: Re-run the app test file and make it pass**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Refactor any duplicated project-update logic while keeping tests green**

Keep state updates focused and avoid broad `App.tsx` churn outside the project settings flow.

### Task 4: Run focused verification and catch regressions

**Files:**
- Modify as needed based on test failures only

- [ ] **Step 1: Run the focused database and renderer test files together**

Run: `pnpm vitest run electron/db/client.test.ts src/App.test.tsx`
Expected: PASS

- [ ] **Step 2: Run a broader related test sweep**

Run: `pnpm vitest run src/components/thread-row.test.tsx src/components/generated-image-grid.test.tsx electron/features/generation/generationService.test.ts`
Expected: PASS

- [ ] **Step 3: If any regression appears, fix it with a failing test first**

Do not patch regressions blindly; add or adjust the test that demonstrates the break first.

- [ ] **Step 4: Review the diff for accidental scope expansion**

Check:
- no unrelated visual churn
- no project settings logic leaking into generation behavior yet
- no user changes reverted

### Task 5: Final verification before claiming completion

**Files:**
- No new files expected

- [ ] **Step 1: Run the full verification command you will rely on in the final report**

Run: `pnpm vitest run electron/db/client.test.ts src/App.test.tsx src/components/thread-row.test.tsx src/components/generated-image-grid.test.tsx electron/features/generation/generationService.test.ts`
Expected: PASS

- [ ] **Step 2: Summarize exact changed files and remaining risks**

Call out:
- any intentionally deferred integration with prompt generation
- any UI behavior not yet covered by tests

- [ ] **Step 3: Only then report the feature as implemented**

Use the fresh command output as the basis for any completion claim.
