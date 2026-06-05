# Director Orchestrator Design

## Goal

Turn Director from a planning-only chat into an app orchestrator. Director still does not generate images itself. It writes production prompts, chooses references, structures Classic or Scenes work, and emits a structured app action that Electron executes through the existing generation flows.

## Protocol

Director responses may include two special fenced blocks:

```markdown
```imagen-action
{"version":1,"action":"generate_classic","summary":"Generate exploration frames.","payload":{"prompt":"...","count":4,"aspectRatio":"16:9","references":["@Tito"]}}
```
```

```markdown
```imagen-status
{"version":1,"kind":"orchestration","status":"running","title":"Calling Classic generation","detail":"4 images requested.","action":"generate_classic"}
```
```

`imagen-action` is authored by Director. `imagen-status` is authored by the app and appended to the same assistant message as execution progresses.

## Actions

MVP actions:

- `generate_classic`: calls existing `generateImages` with `mode: "manual"`.
- `create_scene`: creates one Scene group and the requested editable frames, then opens Scenes for human review. It does not call `generateSceneGroup` automatically; the user must approve or edit the frame plan before generation.

Director can request multiple Classic images. Director can orchestrate only one Scene action per response.

## Runtime Flow

1. User sends a Director message.
2. Director streams normal Markdown.
3. On completion, Electron parses `imagen-action` blocks from the assistant message.
4. Electron appends an `imagen-status` block with `status: "running"`.
5. Electron executes through existing Classic or Scenes APIs.
6. Electron appends a final `imagen-status` block with `status: "succeeded"` or `status: "failed"`.
7. Renderer renders action and status blocks as app-native cards instead of raw Markdown code.

## References

Action payload references use the same human-facing `@Reference` names shown in Director text. Electron resolves them against saved references and the images attached to the Director prompt. Unresolved references do not block execution; they are omitted from the generated reference image payload.

## Chat Layout

The Director chat area owns the full workspace height. The message list scrolls behind the fixed composer, and a final spacer row provides extra after-scroll padding so the last message can rest above the composer instead of being hidden by it.

## Status Semantics

Status blocks are the source of truth for orchestration UI state:

- `running`: app is calling a tool or generation flow.
- `succeeded`: the action ended successfully.
- `failed`: the action ended with an error.

The app does not expose private chain-of-thought. Provider reasoning/tool telemetry may be shown only as concise status labels.

## Current Scope

This first implementation stores orchestration state inside `director_messages.content_markdown`. A future version can add a `director_actions` table if retry, cancellation, or richer audit history becomes necessary.
