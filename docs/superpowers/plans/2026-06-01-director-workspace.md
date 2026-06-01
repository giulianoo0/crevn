# Director Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third `Director` workspace that provides persistent per-thread Codex chat with concurrent streams, a right-rail chat history list, and a simplified reused composer.

**Architecture:** Extend the Electron generation store with Director chat and message tables plus a Codex text-stream runner that emits per-chat events. In the renderer, add a Director workspace beside Classic and Scenes, render streamed markdown with `streamdown`, virtualize long chats with `react-window`, and reuse the existing composer shell with Director-specific controls removed.

**Tech Stack:** Electron IPC, SQLite via Drizzle/libSQL, React 19, Framer Motion, react-window, streamdown, existing prompt composer, existing shimmer component.

---

### Task 1: Plan-Safe Test Coverage

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `electron/generation.test.ts`

- [ ] **Step 1: Write the failing renderer tests**

Add tests for:
- Director tab renders beside Classic and Scenes.
- Switching to Director shows the empty chat surface and right-rail history for the active thread.
- Director composer does not render aspect ratio or shot count controls.
- Concurrent active chats show loading state in the right rail.

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: FAIL on missing Director tab, workspace, or IPC mocks.

- [ ] **Step 3: Write the failing Electron tests**

Add tests for:
- list/create/list Director chats by thread
- persist and retrieve Director messages
- stream event parsing / cancel contract for Director runs

- [ ] **Step 4: Run the Electron tests to verify they fail**

Run: `pnpm exec vitest run electron/generation.test.ts`
Expected: FAIL on missing Director database and streaming functions.


### Task 2: Director Persistence And IPC

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `electron/preload.ts`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`

- [ ] **Step 1: Add Director tables and record helpers**

Implement:
- `director_chats`
- `director_messages`

Store:
- chat `id`, `threadId`, `title`, `createdAt`, `updatedAt`
- message `id`, `chatId`, `role`, `contentMarkdown`, `status`, `modelId`, `modelLabel`, `fastMode`, `referenceImagesJson`, `createdAt`, `updatedAt`

- [ ] **Step 2: Add CRUD functions for chats and messages**

Implement:
- `listDirectorChats(threadId)`
- `createDirectorChat(threadId)`
- `renameDirectorChat(chatId, title)`
- `deleteDirectorChat(chatId)`
- `listDirectorMessages(chatId)`

- [ ] **Step 3: Add the failing Director send/stream implementation hooks**

Implement store contracts for:
- `sendDirectorMessage({ chatId, threadId, prompt, modelId, fastMode, referenceImages })`
- `cancelDirectorChat(chatId)`
- active in-memory runs keyed by `chatId`

- [ ] **Step 4: Add Codex text streaming runner**

Create a streaming variant of the Codex runner that:
- writes prompt to stdin
- emits stdout deltas progressively
- supports cancel
- preserves partial output on failure or cancel

- [ ] **Step 5: Add main/preload/API wiring**

Expose:
- CRUD methods
- send/cancel methods
- subscription methods for Director stream events

- [ ] **Step 6: Run focused Electron tests**

Run: `pnpm exec vitest run electron/generation.test.ts`
Expected: PASS


### Task 3: Director Renderer Shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Director workspace mode to the segmented control**

Update workspace mode type and selector so tabs are:
- `Classic`
- `Scenes`
- `Director`

- [ ] **Step 2: Add Director local state and subscriptions**

Track:
- active Director chat id per selected thread
- loaded chats by thread
- loaded messages by chat
- active stream states by chat

- [ ] **Step 3: Load Director chats/messages on thread and tab selection**

Behavior:
- switching to Director loads chats for the current thread
- auto-select most recent chat, or create the first chat on demand

- [ ] **Step 4: Run renderer tests**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: still failing on missing Director UI pieces, but tab state and loading scaffolding should now exist.


### Task 4: Director UI Components

**Files:**
- Modify: `src/App.tsx`
- Create if needed: `src/components/director-message-list.tsx`
- Create if needed: `src/components/director-chat-list.tsx`
- Create if needed: `src/components/director-composer-surface.tsx`

- [ ] **Step 1: Build the right-rail chat list**

Render per-thread chats with:
- title
- updated time / recency
- active loading state
- new / rename / delete actions

Use the existing dark shell language and panel-reveal/page-slide motion patterns.

- [ ] **Step 2: Build the virtualized message list**

Use `react-window` List with stable row rendering and overscan.
Render:
- user bubble
- assistant markdown bubble
- error state
- thinking placeholder

- [ ] **Step 3: Render assistant markdown with streamdown**

Use `Streamdown` for assistant content.
Set `isAnimating` while the assistant message is actively streaming.

- [ ] **Step 4: Render thinking state with shimmer**

Use `src/components/ai-elements/shimmer.tsx` for pre-delta or active-thinking placeholders.

- [ ] **Step 5: Add smooth transitions**

Use the repo transition guidance for:
- Director tab page swap
- right-rail reveal / active chat switching
- loading state changes
- first-message empty-state transition


### Task 5: Reused Director Composer

**Files:**
- Modify: `src/App.tsx`
- Modify if needed: `src/components/prompt-composer/prompt-composer.tsx`

- [ ] **Step 1: Reuse the Classic composer shell for Director**

Keep:
- model picker
- fast mode toggle
- internal references
- external references

Remove:
- aspect ratio picker
- shot count
- scene-only controls

- [ ] **Step 2: Submit prompts to Director send IPC**

Behavior:
- persist user message immediately
- create assistant streaming placeholder
- stream deltas into the active message

- [ ] **Step 3: Preserve per-chat concurrency**

Allow multiple chats in the same thread to stream at once.
The open chat should update live; background chats should still show row-level loading state.


### Task 6: Verification

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `electron/generation.test.ts`

- [ ] **Step 1: Finalize tests for happy-path Director flows**

Cover:
- empty state
- creating/selecting chats
- streaming assistant output updates
- multiple active chats show loading state in the right rail

- [ ] **Step 2: Run renderer tests**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 3: Run Electron tests**

Run: `pnpm exec vitest run electron/generation.test.ts`
Expected: PASS

- [ ] **Step 4: Run both focused suites together**

Run: `pnpm exec vitest run src/App.test.tsx electron/generation.test.ts`
Expected: PASS
