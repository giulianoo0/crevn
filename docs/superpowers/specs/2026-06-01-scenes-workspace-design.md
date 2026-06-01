# Scenes Workspace Design

**Status:** Approved in chat, pending implementation

## Goal

Turn the current scenes tab into a persistent scene-builder workflow inside a thread, with one coordinated Codex run per scene group, frame-level prompts and references, a carousel-based review surface, and a compact hover-expand scene table of contents.

## Scope

- Keep `projects -> threads` as the top-level structure.
- Add `scene groups` inside a thread.
- Store scene-level prompt/context, frame prompts, frame references, and generated outputs in the database.
- Use one Codex agent per scene group run, always with `gpt-5.4-mini`.
- Allow the agent to return multiple images per frame.
- Replace the empty scenes workspace with:
  - a scene review area
  - an Embla carousel for frame outputs
  - frame rows for later edits
  - a hover-expand ToC rail for each scene
- Show frame-divided shimmer loading states with elapsed time and model label while a scene run is in flight.

## Product Model

- A thread can contain zero or more scene groups.
- A scene group represents one coherent environment or sequence under shared continuity rules.
- A scene group contains ordered frames.
- Each frame stores:
  - prompt
  - order index
  - attached references
  - generated outputs
- Generation is orchestrated at the scene-group level, not per frame.
- The single scene-group agent sees the entire scene context, all frames, and all references at once so it can preserve continuity across framing changes.

## Database Design

Add first-class scene tables instead of storing scene state in JSON blobs.

- `scene_groups`
  - `id`
  - `thread_id`
  - `title`
  - `prompt`
  - `toc_order`
  - `created_at`
  - `updated_at`
- `scene_frames`
  - `id`
  - `scene_group_id`
  - `title`
  - `prompt`
  - `frame_order`
  - `created_at`
  - `updated_at`
- `scene_frame_references`
  - `id`
  - `scene_frame_id`
  - `reference_kind` (`saved_reference` or `uploaded_attachment`)
  - `reference_id` nullable for uploaded attachments
  - `name`
  - `mime_type`
  - `bytes_base64`
  - `created_at`
- `scene_group_runs`
  - `id`
  - `scene_group_id`
  - `thread_id`
  - `status`
  - `provider` fixed to `codex`
  - `model_id` fixed to `gpt-5.4-mini`
  - `model_label`
  - `requested_frame_count`
  - `error_message`
  - `duration_ms`
  - `created_at`
  - `updated_at`
- `scene_frame_assets`
  - `id`
  - `scene_group_run_id`
  - `scene_frame_id`
  - `output_index`
  - `original_path`
  - `stored_path`
  - `file_name`
  - `mime_type`
  - `width`
  - `height`
  - `created_at`

The schema should support migrations for existing local databases without disturbing current thread, job, or generated image data.

## Electron Design

Add scene-group persistence and generation APIs to the Electron layer.

- Create CRUD-style operations for:
  - listing scene groups by thread
  - creating a scene group
  - renaming a scene group
  - updating scene-group prompt
  - creating a frame
  - updating frame prompt/title/order
  - attaching and removing frame references
- Add one scene generation entry point, conceptually:
  - `generateSceneGroup`
- The scene generation entry point:
  - loads the scene group, frames, and frame references
  - stages uploaded attachments alongside saved references
  - builds one Codex prompt for the entire scene
  - runs one Codex job with model `gpt-5.4-mini`
  - imports generated files
  - assigns each returned asset to a target frame
  - persists run status and assets

## Scene Generation Contract

The Codex prompt should explicitly tell the model:

- this is one continuous scene group, not isolated unrelated prompts
- preserve environment identity, materials, lighting direction, palette, layout logic, and subject continuity across all frames
- use all frame prompts as one coordinated coverage plan
- vary angle, framing, conversational staging, and distance while keeping the world consistent
- when useful, generate multiple images for the same frame to provide alternate angles, coverage, or conversational beats
- keep frame outputs grouped by frame identifier in the manifest/output contract

The output contract should be frame-aware so imported assets can be mapped back to the correct frame and output index.

## Renderer Design

Replace the current placeholder scenes workspace with a real scene-builder layout.

- Left or center main workspace:
  - active scene viewer
  - Embla carousel for selected scene content
  - support for multiple outputs per frame
- Right side of the available scene workspace:
  - compact per-scene ToC rails
  - collapsed state shows thin marks only
  - hover expands into a rounded floating card like the provided reference
  - expanded state lists `Scene 1`, `Frame 1`, `Frame 2`, and so on
- Scenes sidebar:
  - scene description editor
  - ordered frame rows
  - per-frame prompt input
  - per-frame references
  - per-frame output summary
  - `Generate frames` action

## Carousel Behavior

Use Embla for the main review surface.

- A scene selection drives the active Embla dataset.
- Each frame appears as its own row in the editor and as its own review grouping in the carousel area.
- If a frame has multiple outputs, those outputs remain grouped under that frame instead of flattening into one long unordered strip.
- Clicking ToC items or frame rows should move the active carousel state to the matching frame group.

## ToC Behavior

Each scene gets a compact ToC control in the workspace area.

- Default state:
  - minimal collapsed rail
  - quiet visual footprint
- Hover state:
  - expands into a floating rounded card
  - shows scene title plus ordered frame entries
- Click behavior:
  - selecting a scene switches the active scene group
  - selecting a frame focuses that frame row and corresponding review group

## Loading And Progress

When `Generate frames` starts:

- create one `scene_group_run`
- switch each frame row into a loading shimmer state
- show:
  - elapsed time
  - model label (`Codex / GPT-5.4 mini`)
  - frame-local loading placeholder
- per-frame loading visuals are derived from the shared scene run and resolved frame outputs
- once outputs arrive, replace shimmer content only for the completed frame mappings

## Reference And Prompt Persistence

- Scene prompt is stored at scene-group level.
- Frame prompt is stored at frame level.
- Saved-library references and uploaded frame attachments are stored per frame.
- Future frame edits should reuse this persisted data instead of relying on transient renderer state.

## Compatibility Rules

- Keep classic generation intact.
- Keep existing generated image thread history intact.
- Scenes should coexist with, not replace, thread-based manual generation.
- The new scene workflow should reuse the existing shell, dark theme tokens, and renderer structure.

## Testing

- Database tests:
  - scene group CRUD
  - frame CRUD
  - frame reference persistence
  - scene run and frame asset persistence
- Electron tests:
  - scene prompt builder includes full scene continuity instructions
  - scene run uses provider `codex` and model `gpt-5.4-mini`
  - multi-frame output manifests map assets back to frame ids
- Renderer tests:
  - scenes workspace renders persisted scene groups and frames
  - frame prompt edits persist through Electron APIs
  - `Generate frames` shows per-frame shimmer states with elapsed time and model
  - ToC rail expands on hover
  - carousel selection follows scene and frame navigation
  - multiple outputs per frame render as grouped review items
