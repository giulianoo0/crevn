# Vercel AI SDK Director Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TanStack AI and Markdown-encoded Director output with Vercel AI SDK 6 and structured reasoning, text, and tool parts.

**Architecture:** Electron owns AI SDK streaming, persistence, cancellation, and image-tool approval. A single ordered `parts` representation is stored in SQLite, sent through IPC, cached in React, and rendered directly.

**Tech Stack:** Electron, React 19, Vite, Vitest, SQLite/Drizzle, Vercel AI SDK 6, `@ai-sdk/google`

---

### Task 1: Structured Stream Accumulator

**Files:**
- Create: `electron/features/generation/directorAiSdk.cjs`
- Create: `electron/features/generation/directorAiSdk.test.ts`

- [ ] Write failing tests for ordered reasoning/text blocks, provider metadata, tool calls, approval requests, and partial deltas.
- [ ] Run `pnpm test -- electron/features/generation/directorAiSdk.test.ts` and confirm failure.
- [ ] Implement the AI SDK stream adapter using `streamText`, `google`, `tool`, and `jsonSchema`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Structured Director Persistence

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `electron/generation-stream-chunks.test.ts`
- Modify: `electron/db/schema.ts`
- Modify: `electron/db/client.test.ts`

- [ ] Replace Director `content_markdown` expectations with `parts_json` expectations in failing tests.
- [ ] Run the focused Electron tests and confirm failure.
- [ ] Add the destructive Director-message schema migration and JSON serialization helpers.
- [ ] Build prompts from persisted parts and reference images.
- [ ] Persist and emit full part snapshots during streaming, completion, cancellation, and failure.
- [ ] Run the focused Electron tests and confirm they pass.

### Task 3: Structured Tool Approval

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `electron/features/generation/generationService.test.ts`

- [ ] Write failing tests for locating `tool-generateImages` parts and state transitions.
- [ ] Run the focused tests and confirm failure.
- [ ] Replace Markdown action parsing/status appends with immutable part updates.
- [ ] Preserve existing image generation request resolution and execution.
- [ ] Route approved tool requests through the same generation run state and image-ready events used by Classic.
- [ ] Run the focused tests and confirm they pass.

### Task 4: IPC And Renderer Types

**Files:**
- Modify: `src/types/electron.d.ts`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/App.tsx`

- [ ] Update type fixtures/tests to require `parts`.
- [ ] Replace Markdown snapshot state with structured part snapshots.
- [ ] Remove reasoning/tool/status regex parsers.
- [ ] Render and copy content from parts.
- [ ] Keep optimistic messages, throttled stream snapshots, caching, and placeholders working.

### Task 5: Renderer Regression Tests

**Files:**
- Modify: `src/App.test.tsx`

- [ ] Convert Director fixtures to structured parts.
- [ ] Add/adjust failing tests for streamed reasoning before text, native tool approval, completion, failure, copy, and regeneration.
- [ ] Verify Director approval shows the shared ImageFX loading placeholders and the same generated-image success UI as Classic.
- [ ] Run targeted Director renderer tests and confirm failure before implementation completion.
- [ ] Run them again after implementation and confirm they pass.

### Task 6: Dependency Cleanup And Verification

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] Remove all `@tanstack/ai*` dependencies with `pnpm remove`.
- [ ] Confirm `rg "@tanstack/ai|createTanStackDirectorTextStream|content_markdown|<thinking>"` has no runtime migration leftovers.
- [ ] Run focused Director/Electron tests.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm exec vite build`.
