# Project Threads And Smooth Shimmer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist `project -> thread -> generation job` relationships in SQLite and render a smooth shimmer plus thread activity spinner in the sidebar.

**Architecture:** Extend the active Electron `.cjs` store around `crenv.sqlite` with `projects`, `threads`, and `generation_jobs.thread_id`, then expose a narrow preload IPC API for listing and creating projects/threads plus generating/listing images by thread. In the renderer, replace local sidebar state with persisted project/thread state, auto-bootstrap a default project/thread on first use, attach generations to the selected thread, show thread activity derived from running jobs, and replace the pulse placeholder with a real moving shimmer.

**Tech Stack:** Electron, React, Vitest, SQLite via `@libsql/client` + Drizzle ORM, `nanoid`, `cli-spinners`

---

### Task 1: Add failing database/store tests for project-thread-job persistence

**Files:**
- Modify: `electron/db/client.test.ts`
- Modify: `electron/features/generation/generationService.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the targeted tests to verify they fail**
- [ ] **Step 3: Implement minimal schema/store/service changes for the failing cases**
- [ ] **Step 4: Run targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 2: Add failing renderer tests for shimmer and running-thread spinner

**Files:**
- Modify: `src/components/generated-image-grid.test.tsx`
- Create or modify: `src/components/thread-row*.test.tsx` or `src/App` tests if no smaller seam exists

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the targeted tests to verify they fail**
- [ ] **Step 3: Implement minimal renderer changes and spinner component**
- [ ] **Step 4: Run targeted tests to verify they pass**
- [ ] **Step 5: Commit**

### Task 3: Wire preload and renderer API to persisted projects/threads

**Files:**
- Modify: `electron/preload.cjs`
- Modify: `electron/main.cjs`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the failing integration tests if a seam is missing**
- [ ] **Step 2: Extend the IPC surface minimally**
- [ ] **Step 3: Replace local project/thread state with persisted state and selection logic**
- [ ] **Step 4: Run the relevant tests**
- [ ] **Step 5: Commit**

### Task 4: Verify the whole change

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add required dependencies (`nanoid`, `cli-spinners`)**
- [ ] **Step 2: Run the full test suite**
- [ ] **Step 3: Report any remaining gaps honestly**
