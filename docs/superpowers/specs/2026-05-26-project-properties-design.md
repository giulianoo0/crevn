# Project Properties Design

**Status:** Approved in chat

**Goal**

Add a per-project `Propriedades` dialog that opens from the project context menu, uses the app's dark shell language, and persists `System Instructions` plus `Art Style` in the local SQLite database.

## Context

The current app already has:

- project rows with a right-click context menu in the renderer
- shared dialog and context-menu primitives under `src/components/ui/`
- a SQLite-backed Electron data layer for projects and threads

The new feature should extend those existing patterns instead of introducing a second settings system.

## Selected Approach

Use a first-class project settings flow:

1. Add dedicated `system_instructions` and `art_style` columns to the `projects` table.
2. Expose those fields through the database layer, Electron IPC bridge, preload, and renderer API types.
3. Add a new `Propriedades` context menu action on each project row.
4. Open a large settings dialog with a left tab rail and a right content pane.
5. Start with a single `General` tab containing `System Instructions` and `Art Style`.
6. Save changes explicitly with a `Save` action and update the renderer state after persistence succeeds.

## Rejected Alternatives

### Store settings as JSON in one column

Rejected because the app only needs two known fields right now, and typed columns are simpler to validate, query, test, and extend.

### Create a separate `project_settings` table

Rejected because it adds unnecessary joins and lifecycle complexity for a single project-scoped settings screen.

### Use in-memory dialog state only

Rejected because the user requirement is per-project persistence across app restarts.

## Data Design

### Projects table

Add two nullable or defaulted text columns:

- `system_instructions`
- `art_style`

The preferred runtime behavior is:

- `system_instructions` defaults to an empty string
- `art_style` defaults to an empty string or a known fallback such as `realism`, depending on implementation convenience

Existing local databases must be migrated in place during startup. The migration only needs to add missing columns; it does not require a full schema versioning system for this feature.

### Project record shape

Project records returned to the renderer should include:

- `systemInstructions: string`
- `artStyle: string`

Those values become the single source of truth for the dialog defaults and for any later generation defaults.

## UI Design

### Context menu

Each project row gets a new `Propriedades` menu item above destructive actions. The action opens the properties dialog for that specific project.

### Dialog shell

The dialog should:

- use the existing shared dialog primitive
- expand to approximately `1000px` max width
- stay within viewport padding on smaller window sizes
- keep the dark shell tone defined in `AGENTS.md`

The layout is split into two vertical areas:

- left rail for tabs, visually similar to the existing app sidebar
- right content pane for the selected settings page

The left rail should look ready for future tabs without implying functionality that does not exist yet.

### Tabs

For this phase, the only tab is:

- `General`

The implementation should still use a simple selected-tab state so more tabs can be added later without reshaping the component.

### General tab content

The `General` page should include:

- a compact page title
- short descriptive helper copy
- a large multiline `System Instructions` field
- an `Art Style` dropdown

The `System Instructions` field should feel like a studio policy editor rather than a tiny form input. It should support several visible lines without requiring immediate scrolling.

The `Art Style` dropdown should include opinionated options suitable for image generation defaults, including at least:

- `Cartoon`
- `Realism`
- `Photoreal`
- `Cinematic`
- `Anime`
- `3D Render`
- `Illustration`
- `Concept Art`
- `Pixel Art`

Exact labels may be normalized for storage, but the user-facing list should remain clear and direct.

### Actions

The first pass should use explicit actions:

- `Cancel` closes without saving unsaved edits
- `Save` persists changes for the selected project

Autosave is unnecessary for this scope and would add extra edge cases around partial edits and failed persistence.

## Behavior

### Open

When the dialog opens:

1. find the selected project from renderer state
2. seed local draft state from that project's stored values
3. default the selected tab to `General`

### Save

When the user saves:

1. call a dedicated renderer API such as `updateProjectSettings(projectId, payload)`
2. persist the fields in SQLite through Electron
3. update the local `projects` state with the saved values
4. close the dialog on success

### Close without save

Closing the dialog without saving should discard local draft edits and leave stored project values unchanged.

## Architecture

### Database layer

Extend the project schema and add an explicit write method for settings updates. Keep the write surface narrow instead of overloading project rename behavior with unrelated fields.

### Electron bridge

Expose a dedicated IPC handler and preload function for updating project settings. This keeps the renderer API explicit and avoids generic mutation endpoints.

### Renderer

Add a focused properties dialog component under `src/components/` and keep state ownership in `src/App.tsx`, following the current pattern used for the create, rename, and delete flows.

## Error Handling

The feature should handle:

- missing project id in renderer state
- database update failure
- IPC/preload bridge failure

On save failure:

- keep the dialog open
- preserve the draft values
- show a toast with a concise error message

## Testing

### Database tests

Add coverage for:

- initializing a database that does not yet have the new project columns
- returning project settings from `listProjectsWithThreads`
- updating project settings for a single project without affecting others

### Renderer tests

Add coverage for:

- opening `Propriedades` from the project context menu
- rendering the `General` tab defaults from stored project values
- saving updated `System Instructions` and `Art Style`
- keeping the dialog open when the save request fails

## Out of Scope

This feature does not include:

- multiple settings tabs beyond `General`
- applying project settings automatically to generation prompts
- project-level permissions or collaboration controls
- live preview of style changes
- a generalized preferences system
