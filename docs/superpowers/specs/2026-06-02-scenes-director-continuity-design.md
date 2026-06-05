# Scenes Director Continuity Design

## Goal

Improve Imagen's image-generation workflows so Classic, Director Classic, Director Scenes, and per-frame Scenes generation all receive production-grade continuity guidance, while Scenes stops creating default frames and Director chat shows one updating generation status instead of a stack of progress cards.

## Scope

- Remove the two default empty frames from new Scenes groups.
- Keep Scenes groups first-class: users can switch between generated scenes, rename a scene, edit frame prompts, and regenerate a specific frame or whole scene.
- Let users delete individual frames from the active Scenes group without deleting the whole scene.
- Ensure a new Director `create_scene` action creates a new Scenes group instead of overwriting the visible working scene.
- Enrich image-generation prompts with embedded guidance from the local cinematic angles, environment-generation, and roteiro extraction workflows.
- Tell agents that image frames are static keyframes intended for later Seedance animation, where the generated frames are used as reference images.
- Add Seedance cartoon context so the image stage prepares stable inputs for the later `seedance-cartoon` prompt stage.
- Improve character consistency by requiring named identity anchors, character sheets, exact wardrobe/proportions, reference re-anchoring, and per-frame performance beats.
- Collapse Director orchestration status blocks to one latest status per action so progress updates in place and terminal states stop showing a loader.

## Architecture

Prompt enrichment lives in Electron prompt builders because all generation paths already flow through Electron before Codex/Antigravity jobs run. The app will embed concise, app-owned production guidance rather than asking a generation job to load external skills.

Scenes UI remains in `src/App.tsx` and keeps the current shell style. A compact scene switcher/rename control sits at the top of the Scenes sidebar, above the scene description. Frame-level editing, generation, and deletion controls remain in each frame row.

Director orchestration still appends status fences to the assistant message for persistence, but the renderer will render only the latest status block per action. This preserves history in storage while preventing chat spam in the UI.

## Data Flow

1. Classic and Director Classic build a prompt that includes the user's creative request plus the shared image-production guidance.
2. Director chat is instructed to emit `create_scene` plans as static image frames with reference bindings and Seedance handoff notes.
3. Approving a Director scene creates a new scene group, creates only the requested frames, selects that group in the Scenes UI, and starts generation.
4. Scenes generation sends each frame with the scene continuity brief, environment/character reference instructions, camera/framing guidance, and Seedance reference-image context.
5. When frames complete, the run state is cleared and the Director action card displays the final non-loading status.

## Testing

- Renderer tests cover empty new Scenes state, adding the first frame, scene switching, scene renaming, and latest-only Director status rendering.
- Renderer tests cover deleting a frame from the active scene.
- Electron prompt tests cover prompt enrichment for Classic, scene frames, Director chat, and scene structuring.
- Existing generation tests continue to cover frame-specific generation and stop behavior.
