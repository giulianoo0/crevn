# Concurrent Codex Runs And Fast Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow overlapping Codex generations across projects and threads, while adding a sticky `Fast` toggle that maps to the Codex CLI fast-tier setting.

**Architecture:** Replace the renderer's single global generation lock with per-job runtime state keyed by `jobId`, and route scene-plan shimmer updates against that same job identity. Thread a `fastMode` boolean through the renderer payload, preload bridge, and Electron generation runner so the CLI spawn adds a `service_tier="fast"` config override only when requested.

**Tech Stack:** Electron, React, TypeScript, Vitest

---

### Task 1: Codex runner fast-tier plumbing

**Files:**
- Modify: `electron/generation.test.ts`
- Modify: `electron/generation.cjs`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `pnpm test electron/generation.test.ts` to verify it fails for missing fast-tier behavior**
- [ ] **Step 3: Add a helper that builds Codex exec args and includes `-c service_tier=\"fast\"` when `fastMode` is true**
- [ ] **Step 4: Run `pnpm test electron/generation.test.ts` to verify it passes**

### Task 2: Shared payload fastMode support

**Files:**
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/features/generation/generationTypes.ts`

- [ ] **Step 1: Write or extend failing tests that expect `fastMode` to reach generation calls**
- [ ] **Step 2: Run the targeted tests to verify they fail before implementation**
- [ ] **Step 3: Add `fastMode?: boolean` to shared generation payload types and pass-through bridges**
- [ ] **Step 4: Re-run the targeted tests**

### Task 3: Renderer concurrent run state

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing renderer tests for overlapping jobs, sticky fast toggle, and cleared composer state after submit**
- [ ] **Step 2: Run `pnpm test src/App.test.tsx` to verify the new tests fail for the current single-flight implementation**
- [ ] **Step 3: Replace global generation state with per-job state keyed by `jobId`, update loading placeholders to coexist per thread, and route scene-plan events by `jobId`**
- [ ] **Step 4: Add the `Fast` toggle between aspect ratio and shot count, keep it sticky across sends, and clear the rest of the composer after submit**
- [ ] **Step 5: Run `pnpm test src/App.test.tsx` to verify the renderer behavior passes**

### Task 4: Full verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `electron/generation.cjs`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/preload.cjs`
- Modify: `electron/features/generation/generationTypes.ts`
- Modify: `src/App.test.tsx`
- Modify: `electron/generation.test.ts`

- [ ] **Step 1: Run `pnpm test`**
- [ ] **Step 2: Fix any regressions revealed by the full suite**
- [ ] **Step 3: Re-run `pnpm test` and confirm a clean pass before reporting completion**
