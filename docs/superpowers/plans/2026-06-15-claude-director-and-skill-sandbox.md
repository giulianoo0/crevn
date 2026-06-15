# Claude Director + Hardened Skill Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Claude (Opus 4.8 / Sonnet 4.6 / Haiku 4.5) as a Director text provider via `@ai-sdk/anthropic`, add a unified reasoning modifier and an Anthropic API-key setting, and replace the "dump the whole SKILL.md" skill loader with a hardened, progressively-disclosed skill sandbox.

**Architecture:** The Director (`electron/generation.cjs`) already streams a tool-calling text agent through `directorAiSdk.cjs`, which is currently hard-wired to `@ai-sdk/google`. We make that stream provider-aware (google + anthropic), add Claude to both the renderer model catalog and the backend `DIRECTOR_MODEL_OPTIONS`, and thread a `reasoningEffort` knob from the composer through IPC into per-provider `providerOptions`. The bundled-skill system (`skills.cjs`) is refactored around a read-only, path-isolated `SkillSandbox` and a three-tier progressive-disclosure `loadSkill` (overview + section index → one section → one reference), each with byte caps — matching the AI SDK "agent skills" cookbook and Anthropic's progressive-disclosure guidance.

**Tech Stack:** Electron (CJS main), React 19 + TS (renderer), Vite, Vitest, `ai` v6, `@ai-sdk/anthropic` v3, `@ai-sdk/google` v3, Drizzle/libsql.

---

## Research notes (folded into the design)

From the AI SDK agent-skills cookbook and Anthropic's "agent skills" guidance:

- **Three-tier progressive disclosure.** (1) Discovery: only `name` + `description` in the system prompt. (2) Activation: load `SKILL.md` body when the task matches. (3) Execution: load referenced files only when needed. Our SKILL.md is 819 lines / ~63 headings — too large to inject at activation, so we add a **section** tier between (2) and (3): activation returns the overview + a section index; the agent then pulls one section at a time.
- **Sandbox abstraction.** Skills resolve through a generic read interface (`readFile` / `listReferences`) scoped to the skill directory. Ours is **read-only** (no `bash`/`exec` — out of scope for "hardened progressive disclosure") with path-traversal guards and byte caps.
- **Frontmatter minimalism + path isolation + size caps** are the load-bearing safety properties.

## Decisions (locked during brainstorming)

- Sandbox = **hardened progressive disclosure**, in-process, read-only.
- Reasoning modifier = **unified across providers** (Anthropic `effort`, Google `thinkingConfig`).
- "Default skills for Claude" = wire the **existing** `loadSkill` catalog to the Claude path (no Anthropic prebuilt skills).

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `electron/features/generation/skills.cjs` | Bundled-skill discovery + sandboxed progressive disclosure | Refactor |
| `electron/features/generation/skills.test.ts` | Skill sandbox tests | Extend |
| `electron/providerSettings.cjs` | Persist + apply text-provider API keys | Add anthropic |
| `electron/providerSettings.test.ts` | Provider settings tests | Extend |
| `electron/features/generation/directorAiSdk.cjs` | Provider-aware Director stream + reasoning options | Refactor |
| `electron/features/generation/directorAiSdk.test.ts` | Stream option/accumulator tests | Extend |
| `electron/generation.cjs` | Director model registry + stream call site | Add Claude models, pass providerId/effort |
| `src/lib/model-catalog.ts` | Renderer model catalog | Add anthropic provider + 3 models |
| `src/lib/model-catalog.test.ts` | Catalog tests | Extend |
| `src/components/model-picker.tsx` | Provider rail icons | Add claude icon |
| `src/lib/electron-api.ts` | Renderer IPC types/stubs | anthropic key + reasoningEffort |
| `src/types/electron.d.ts` | Electron API type defs | anthropic key + reasoningEffort |
| `electron/preload.cjs` | IPC bridge | reasoningEffort passthrough (if needed) |
| `src/App.tsx` | Settings UI + composer state | Anthropic key field + reasoning control |

---

## Task 1: Harden the skill sandbox (progressive disclosure)

**Files:**
- Modify: `electron/features/generation/skills.cjs`
- Test: `electron/features/generation/skills.test.ts`

Design:
- `MAX_SECTION_BYTES` / `MAX_REFERENCE_BYTES` caps; truncation marker appended when exceeded.
- `splitIntoSections(body)` → `[{ heading, slug, content }]` keyed off `^#{1,2} ` lines; the text before the first heading is the `overview`.
- `createSkillSandbox(skillDir)` exposes read-only `readSkillMarkdown()`, `listReferences()`, `readReference(name)` — all guarded to stay inside `skillDir`, all byte-capped.
- `loadBundledSkill(name, { reference, section } = {})`:
  - no `reference`/`section` → `{ found, name, title, overview, sections: [slug…], references: [...], content }` where `content` = overview + a rendered section index + reference hint (capped). **Does not** return the whole body.
  - `section` → `{ found, name, section, title, content }` (one section, capped).
  - `reference` → unchanged shape, capped.
- Keep `listBundledSkills` / `buildSkillCatalogPrompt`; catalog prompt instructs: load skill → read section index → request sections/references on demand.

- [ ] **Step 1: Add failing tests** for section split, overview-only activation (asserts the 819-line body is NOT fully returned, but the section index + title are), single-section fetch, byte cap, and traversal rejection.
- [ ] **Step 2: Run** `pnpm test electron/features/generation/skills.test.ts` → FAIL.
- [ ] **Step 3: Implement** the sandbox + section logic in `skills.cjs`.
- [ ] **Step 4: Run** the same test → PASS.

## Task 2: Anthropic API key in provider settings

**Files:** Modify `electron/providerSettings.cjs`, `src/lib/electron-api.ts`, `src/types/electron.d.ts`, `src/App.tsx`; Test `electron/providerSettings.test.ts`.

- `DEFAULT_PROVIDER_SETTINGS.text.anthropic.apiKey = ''`; `normalizeProviderSettings` reads `input?.text?.anthropic?.apiKey` (backward-compatible with files lacking it); `applyProviderSettingsToEnv` sets `process.env.ANTHROPIC_API_KEY` when present.
- Renderer types gain `text.anthropic.apiKey`; `App.tsx` adds `providerAnthropicApiKey(Draft)` state, loads it, includes both keys in `updateProviderSettings`, and renders a second labeled input in the existing settings block.

- [ ] **Step 1:** Extend `providerSettings.test.ts` (persist+read anthropic key; `applyProviderSettingsToEnv` sets `ANTHROPIC_API_KEY`).
- [ ] **Step 2:** Run `pnpm test electron/providerSettings.test.ts` → FAIL.
- [ ] **Step 3:** Implement schema + env + types + UI.
- [ ] **Step 4:** Run → PASS.

## Task 3: Claude in the model catalog + picker

**Files:** Modify `src/lib/model-catalog.ts`, `src/components/model-picker.tsx`, `electron/generation.cjs`; Test `src/lib/model-catalog.test.ts`.

- `GenerationProviderId |= 'anthropic'`; provider `{ id:'anthropic', label:'Claude', capabilities:['text'] }`.
- Models: `anthropic-claude-opus-4-8`→`claude-opus-4-8`, `anthropic-claude-sonnet-4-6`→`claude-sonnet-4-6`, `anthropic-claude-haiku-4-5`→`claude-haiku-4-5` (all `capabilities:['text']`, `runtimeModel` set).
- `model-picker.tsx`: import `claude.svg`, add to `providerIcons`.
- `generation.cjs` `DIRECTOR_MODEL_OPTIONS`: mirror the 3 Claude entries with `providerId:'anthropic'`.

- [ ] **Step 1:** Extend `model-catalog.test.ts` (anthropic provider listed under `text`; 3 models resolvable; ids/runtimeModels correct).
- [ ] **Step 2:** Run `pnpm test src/lib/model-catalog.test.ts` → FAIL.
- [ ] **Step 3:** Implement catalog + picker + backend registry.
- [ ] **Step 4:** Run → PASS.

## Task 4: Provider-aware Director stream + reasoning

**Files:** Modify `electron/features/generation/directorAiSdk.cjs`, `electron/generation.cjs`; Test `electron/features/generation/directorAiSdk.test.ts`.

- `buildReasoningProviderOptions(providerId, effort)`:
  - `anthropic` → `{ anthropic: { effort } }` (effort ∈ low|medium|high).
  - `google` → `{ google: { thinkingConfig: { includeThoughts: true } } }` (unchanged default; effort reserved for future budget mapping).
- `buildDirectorStreamOptions` takes `providerId` + `reasoningEffort`, builds `providerOptions` from the helper (keeps loadSkill — now with optional `section` — and generateImages tools).
- `createAiSdkDirectorPartStream({ providerId, modelId, reasoningEffort, messages, abortController })` dynamically imports `@ai-sdk/anthropic` for anthropic (key check: `ANTHROPIC_API_KEY`) or `@ai-sdk/google` for google, then streams.
- `generation.cjs` call site passes `providerId: selectedModel.providerId` and `reasoningEffort` into the stream.

- [ ] **Step 1:** Extend `directorAiSdk.test.ts` — `buildDirectorStreamOptions({providerId:'anthropic',reasoningEffort:'high',…})` yields `providerOptions.anthropic.effort==='high'` and still defines `loadSkill`/`generateImages`; loadSkill input schema includes `section`.
- [ ] **Step 2:** Run `pnpm test electron/features/generation/directorAiSdk.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.

## Task 5: Reasoning modifier UI + IPC plumbing

**Files:** Modify `src/App.tsx`, `src/lib/electron-api.ts`, `src/types/electron.d.ts`, `electron/preload.cjs`, `electron/generation.cjs`.

- Reasoning is a per-send option mirroring `fastMode`: add `reasoningEffort?: 'low'|'medium'|'high'` to the director-send payload type, IPC bridge, and the `generation.cjs` handler → forwarded to the stream.
- UI: a compact control (reuse `ui/select` or a small popover) beside the model picker showing Low/Medium/High; default Medium; stored in composer state and included in the send payload.

- [ ] **Step 1:** Add a focused test where supported (electron-api stub passes `reasoningEffort` through), else rely on Task 4 unit coverage + typecheck.
- [ ] **Step 2:** Implement payload type + bridge + handler + UI control.
- [ ] **Step 3:** Run `pnpm test` for touched modules.

## Task 6: Full verification

- [ ] `pnpm test` (whole suite). Pre-existing `src/App.test.tsx` failures (documented in memory: ~36 failures on main) are not regressions — confirm the count didn't grow.
- [ ] `pnpm exec tsc --noEmit` (or project typecheck) — fix new type errors.

## Self-Review

- **Spec coverage:** Claude integration (Task 3/4), mode-picker + claude.svg (Task 3), 3 models (Task 3), reasoning modifier (Task 4/5), API key in settings (Task 2), default skills on Claude (Task 4 wires loadSkill into the provider-agnostic stream), safe sandbox (Task 1). ✓
- **Type consistency:** `reasoningEffort` name used in payload, IPC, handler, and `buildDirectorStreamOptions`. `providerId` value `'anthropic'` consistent across catalog, picker icon map, backend registry, and stream router.
- **No placeholders:** each task names exact files, tests, and run commands.
