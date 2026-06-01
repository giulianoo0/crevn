# Antigravity and Codex Model Picker Design

**Status:** Approved in chat and implemented in the same pass

## Goal

Add a composer model picker that lets the user choose between hardcoded Codex and Antigravity model entries, routes generation through the matching CLI provider, and limits fast mode to Codex only.

## Scope

- Add a compact model trigger as the first composer control.
- Show a provider rail on the left and a model list on the right.
- Use Codex and Antigravity branded icons supplied by the user.
- Keep model lists hardcoded in-app.
- Route generation through `codex` or `agy` based on the selected entry.
- Preserve the existing manifest-based image import pipeline.

## Renderer Design

- Add a shared model catalog that defines:
  - provider id
  - provider label
  - model id
  - display label
  - Codex CLI model slug where applicable
  - Antigravity reasoning model label where applicable
- The picker trigger shows:
  - provider icon
  - selected model label
  - chevron
- The popover contains:
  - a left provider rail
  - a right model list for the active provider
- `Fast` remains a composer control but is disabled whenever the selected provider is `antigravity`.
- The user’s selected model persists in renderer state across submits.

## Generation Contract

- Extend generation payloads with:
  - `provider: 'codex' | 'antigravity'`
  - `modelId: string`
- Keep `fastMode` in the payload for compatibility, but force its effective value to `false` for Antigravity requests.

## Electron Design

- Keep the existing one-shot batch execution model.
- Continue to require generated files plus a JSON manifest.
- Add a provider-aware execution branch:
  - `codex` uses `codex exec`
  - `antigravity` uses `agy --print`
- Codex receives the selected CLI model via `--model`.
- Antigravity receives the selected reasoning model by writing an isolated `settings.json` under a temporary home directory for that job and copying the required local auth files into that isolated profile.
- Both provider runners normalize to the same manifest import path.

## Fast Mode Rules

- Supported only for Codex.
- Disabled in the UI when the selected provider is Antigravity.
- Never forwarded to the Antigravity runner.

## Testing

- Renderer test coverage:
  - selecting a different Codex model updates the trigger label
  - selecting Antigravity disables fast mode
  - Antigravity generation requests include the correct provider and model id
- Electron test coverage:
  - Codex exec args use the selected model
  - Antigravity exec args use print mode and do not include fast-tier overrides
