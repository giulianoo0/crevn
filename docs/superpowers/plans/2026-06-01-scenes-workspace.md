# Scenes Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent scenes workflow inside a thread with scene groups, frame-level prompts and references, a single Codex `gpt-5.4-mini` scene run, frame-aware manifest import, Embla-based review, hover-expand ToC rails, and per-frame shimmer loading states.

**Architecture:** Add first-class scene persistence in the Electron database, expose scene CRUD and generation APIs through preload, and drive a new renderer scenes workspace from persisted scene-group data. Use one scene-group Codex job that receives all frame context together and returns a frame-grouped manifest so continuity and multi-output-per-frame decisions are coordinated by one agent.

**Tech Stack:** Electron, React 19, Tailwind v4, Framer Motion, Embla Carousel, Vitest, Drizzle/libSQL.

---

### Task 1: Fix SceneInputCard Layout So Composer Never Overlaps Attachments

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a scenes-sidebar test that attaches a frame reference and asserts the input card renders the composer area and attachment row as separate layout regions rather than an absolute overlay.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/App.test.tsx -t "keeps the scene composer above the attachment strip"`
Expected: FAIL because the current scene input card still overlays the attachment row on top of the editor area.

- [ ] **Step 3: Write minimal implementation**

Refactor `SceneInputCard` so:
- the composer occupies a bounded top region
- the add-reference button and attachment thumbnails live in a dedicated bottom row
- editor padding is reduced to content spacing, not overlap compensation

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/App.test.tsx -t "keeps the scene composer above the attachment strip"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "fix: separate scene composer from attachment row"
```

### Task 2: Add Scene Persistence Schema And Database Accessors

**Files:**
- Modify: `electron/db/schema.ts`
- Modify: `electron/db/client.ts`
- Test: `electron/db/client.test.ts`

- [ ] **Step 1: Write the failing tests**

Add DB tests for:
- creating and listing scene groups within a thread
- creating and updating ordered scene frames
- storing frame references
- storing one scene-group run with assets mapped back to frame ids

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test electron/db/client.test.ts -t "scene"`
Expected: FAIL because scene tables and accessors do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add schema tables and SQL strings for:
- `scene_groups`
- `scene_frames`
- `scene_frame_references`
- `scene_group_runs`
- `scene_frame_assets`

Extend `createGenerationDatabase()` with focused methods for:
- `listSceneGroupsByThread`
- `createSceneGroup`
- `updateSceneGroup`
- `createSceneFrame`
- `updateSceneFrame`
- `replaceSceneFrameReferences`
- `createSceneGroupRun`
- `updateSceneGroupRun`
- `insertSceneFrameAsset`
- `listSceneGroupDetails`

Add migration guards for existing local databases.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test electron/db/client.test.ts -t "scene"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/db/schema.ts electron/db/client.ts electron/db/client.test.ts
git commit -m "feat: persist scene groups and frames"
```

### Task 3: Add Scene Types, Preload Contracts, And Electron API Surface

**Files:**
- Modify: `src/types/electron.d.ts`
- Modify: `electron/preload.ts`
- Modify: `electron/preload.cjs`
- Modify: `src/lib/electron-api.ts`
- Modify: `electron/generation.cjs`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add renderer-facing tests or API contract assertions that expect scenes CRUD/list methods to exist on the Electron bridge and to return frame-aware data structures.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/App.test.tsx -t "loads persisted scene groups"`
Expected: FAIL because the bridge methods and mocked contracts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Expose:
- `listSceneGroups(threadId)`
- `createSceneGroup(threadId, input)`
- `updateSceneGroup(sceneGroupId, input)`
- `createSceneFrame(sceneGroupId, input)`
- `updateSceneFrame(sceneFrameId, input)`
- `saveSceneFrameReferences(sceneFrameId, input)`
- `generateSceneGroup(sceneGroupId)`

Define stable types for:
- scene group record
- scene frame record
- scene frame reference record
- scene group run record
- scene frame asset record

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/App.test.tsx -t "loads persisted scene groups"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/electron.d.ts electron/preload.ts electron/preload.cjs src/lib/electron-api.ts electron/generation.cjs src/App.test.tsx
git commit -m "feat: expose scenes api through electron bridge"
```

### Task 4: Add A Frame-Aware Scene Manifest Contract And Prompt Builder

**Files:**
- Modify: `electron/features/generation/generationTypes.ts`
- Modify: `electron/features/generation/manifest.ts`
- Modify: `electron/features/generation/codexPrompt.ts`
- Test: `electron/features/generation/codexPrompt.test.ts`
- Test: `electron/features/generation/manifest.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- scene-group prompt includes one-agent continuity instructions
- prompt fixes provider/model to Codex `gpt-5.4-mini`
- frame-aware manifest parser accepts grouped outputs per frame
- parser rejects malformed frame entries

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test electron/features/generation/codexPrompt.test.ts electron/features/generation/manifest.test.ts`
Expected: FAIL because prompt and manifest code only support flat image manifests.

- [ ] **Step 3: Write minimal implementation**

Extend prompt generation to support a new scene-group contract:
- full scene prompt + frame prompts + references
- continuity instructions
- permission for multiple outputs per frame when coverage benefits
- explicit grouped manifest shape keyed by frame id

Extend manifest parsing so scene runs can import:

```json
{
  "frames": [
    {
      "frameId": "scene-frame-1",
      "images": [{ "path": "/abs/a.png" }, { "path": "/abs/b.png" }]
    }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test electron/features/generation/codexPrompt.test.ts electron/features/generation/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/features/generation/generationTypes.ts electron/features/generation/manifest.ts electron/features/generation/codexPrompt.ts electron/features/generation/codexPrompt.test.ts electron/features/generation/manifest.test.ts
git commit -m "feat: add scene-group codex prompt and manifest contract"
```

### Task 5: Implement Scene-Group Generation And Asset Import

**Files:**
- Modify: `electron/generation.cjs`
- Modify: `electron/features/generation/generationService.ts`
- Test: `electron/features/generation/generationService.test.ts`
- Test: `electron/generation.test.ts`

- [ ] **Step 1: Write the failing tests**

Add generation tests for:
- one scene-group run uses one Codex request
- scene run forces `codex` + `gpt-5.4-mini`
- imported assets are stored against the correct frame ids
- multiple outputs per frame persist correctly
- frame-level loading counts are derived from one shared scene plan

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test electron/features/generation/generationService.test.ts electron/generation.test.ts`
Expected: FAIL because there is no scene-group generation pipeline yet.

- [ ] **Step 3: Write minimal implementation**

Implement a `generateSceneGroup` path that:
- loads the scene group and ordered frames
- stages saved and uploaded frame references
- builds one Codex prompt
- runs one scene-group job
- parses the grouped scene manifest
- persists scene-group run state and frame assets
- returns updated scene-group data for the renderer

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test electron/features/generation/generationService.test.ts electron/generation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/generation.cjs electron/features/generation/generationService.ts electron/features/generation/generationService.test.ts electron/generation.test.ts
git commit -m "feat: generate scene groups with one codex run"
```

### Task 6: Build The Scenes Renderer Data Model And Workspace

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/components/scenes/scenes-workspace.tsx`
- Create: `src/components/scenes/scenes-sidebar.tsx`
- Create: `src/components/scenes/scene-frame-row.tsx`
- Create: `src/components/scenes/scene-toc-rail.tsx`
- Create: `src/components/scenes/scene-review-carousel.tsx`

- [ ] **Step 1: Write the failing tests**

Add renderer tests for:
- loading persisted scene groups and frames
- editing frame prompts
- creating scene groups and frames
- rendering per-frame rows and outputs
- showing shimmer states per frame while a scene run is active
- displaying `Codex / GPT-5.4 mini` and elapsed time

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/App.test.tsx -t "renders persisted scene groups"`
Expected: FAIL because the scenes workspace is still a placeholder.

- [ ] **Step 3: Write minimal implementation**

Split the scenes UI into focused components and wire it to the new Electron APIs.

Requirements:
- hydrate scene groups from DB when the selected thread changes
- keep scene state in renderer store/local state backed by persisted records
- render a scene description editor and ordered frame rows
- persist frame prompt and reference edits
- show frame output groupings returned by scene-group runs
- keep classic mode intact

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/App.test.tsx -t "renders persisted scene groups"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/scenes
git commit -m "feat: build persisted scenes workspace"
```

### Task 7: Add Embla Review Carousel And Hover-Expand ToC Rails

**Files:**
- Modify: `package.json`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/index.css`
- Modify: `src/components/scenes/scene-review-carousel.tsx`
- Modify: `src/components/scenes/scene-toc-rail.tsx`

- [ ] **Step 1: Write the failing tests**

Add renderer tests for:
- Embla-based scene review groups
- multiple outputs under the same frame
- ToC rail expands on hover
- clicking ToC entries selects the matching frame/review group

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/App.test.tsx -t "expands the scene toc rail on hover"`
Expected: FAIL because the scenes workspace has no ToC rail or grouped carousel.

- [ ] **Step 3: Write minimal implementation**

Install and wire Embla for the review surface.

Implement:
- grouped frame review carousel
- active frame navigation
- compact collapsed scene ToC rail
- hover-expand floating ToC card matching the approved reference behavior

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/App.test.tsx -t "expands the scene toc rail on hover"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json src/App.tsx src/App.test.tsx src/index.css src/components/scenes/scene-review-carousel.tsx src/components/scenes/scene-toc-rail.tsx
git commit -m "feat: add scene review carousel and toc rails"
```

### Task 8: Run Full Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-06-01-scenes-workspace.md`

- [ ] **Step 1: Run targeted backend verification**

Run:
`pnpm test electron/db/client.test.ts electron/features/generation/codexPrompt.test.ts electron/features/generation/manifest.test.ts electron/features/generation/generationService.test.ts electron/generation.test.ts`
Expected: PASS

- [ ] **Step 2: Run renderer verification**

Run:
`pnpm test src/App.test.tsx`
Expected: PASS

- [ ] **Step 3: Run complete suite if practical**

Run:
`pnpm test`
Expected: PASS

- [ ] **Step 4: Update plan checkboxes if needed during execution**

Mark completed steps in this file as execution progresses.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-06-01-scenes-workspace.md
git commit -m "docs: record scenes workspace implementation progress"
```
