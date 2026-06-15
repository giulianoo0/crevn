# App Rules

## Platform

- This app is Electron + Vite + React.
- Use `pnpm` for package management and scripts.
- Keep the UI in the renderer and desktop integration in the Electron process or preload bridge.
- Do not introduce React Native, Expo, or Expo Router patterns into this codebase.
- Prefer simple local state unless a clear shared-state requirement appears.

## Release Flow

- Do not create GitHub Releases manually with `gh release create`.
- The release action lives in `.github/workflows/build.yml`.
- Release tags must use the `vX.Y.Z` format, for example `v0.3.4`. The workflow only runs the release publishing job for tags matching `v*`.
- Before tagging, bump `package.json` to the target version, commit the intended worktree, and push `main`.
- Create the release by pushing the tag: `git tag vX.Y.Z` followed by `git push origin vX.Y.Z`.
- The Build GitHub Action will build Linux, Windows, and macOS artifacts, then create or update the GitHub Release and upload assets.
- Verify the action with `gh run list --workflow Build` or `gh run watch <run-id>`, then inspect the release with `gh release view vX.Y.Z`.
- If a raw release or non-`v` tag was created by mistake, delete the incorrect release/tag and rerun the release by pushing the correct `vX.Y.Z` tag.

## Product Context

- This product is a professional AI editing studio.
- The current core experience is image generation and image-driven creation workflows.
- Future product direction includes video generation and editing, so new structure should not assume the product stops at still images.
- The interface should feel production-grade, focused, and tool-like rather than playful or consumer-toy styled.
- Prioritize workflows that support prompt input, generation controls, asset review, iteration, and media-centric actions.
- Follow the dark visual language used in `~/projetos/flowai` as the baseline reference for tone, density, and polish.

## UI Stack

- Use Tailwind CSS v4 for styling.
- Use `shadcn` components and patterns for new primitives when they fit.
- Reuse shared UI primitives before creating one-off variants.
- Keep component APIs small and composable.

## Typography

- Use Geist for UI text when adding or changing app typography.
- Use mono only for code-like text or compact numeric/status values.
- Keep headings compact and controlled. Do not use oversized marketing typography.
- Keep letter spacing at `0` unless a very specific UI treatment requires otherwise.
- Keep typography neutral and product-like. Avoid loud branding treatments in core creation screens.

## Color Tokens

### Dark

- background: `rgb(7, 7, 7)`
- surface: `rgb(15, 16, 16)`
- surface2: `rgb(32, 32, 33)`
- foreground: `rgb(228, 227, 233)`
- muted foreground: `rgb(150, 151, 158)`
- accent: `rgb(65, 130, 230)`
- border soft: `rgb(42, 42, 45)`

### Light

- background: `rgb(248, 248, 249)`
- surface: `rgb(255, 255, 255)`
- surface2: `rgb(236, 236, 238)`
- foreground: `rgb(20, 21, 24)`
- muted foreground: `rgb(104, 106, 114)`
- accent: `rgb(65, 130, 230)`
- border soft: `rgb(219, 220, 224)`

## Theme Behavior

- Keep the page dark by default.
- Treat the `flowai` dark theme as the primary reference for renderer surfaces and shell composition.
- Force dark theme in the app shell and core creation surfaces.
- Do not implement automatic light-mode switching from system preferences.
- If a light theme is ever introduced later, it must be an intentional product decision rather than a default fallback.
- Accent stays stable across themes unless a specific accessibility issue requires change.
- Prefer CSS variables or shared tokens over inline color values.

## Shape And Spacing

- Prefer large rounded geometry.
- Primary shell surfaces should usually use `24-28` radius.
- Floating controls and pills should usually use full radius.
- Interactive targets should remain comfortably clickable on desktop, not visually tiny.
- Circular icon buttons should generally be `40-52` square depending on context.
- Bottom and floating bars should feel anchored, calm, and easy to scan.
- Spacing should feel dense and intentional, closer to a studio tool than a landing page.

## Shell Rules

- The app shell owns persistent layout chrome such as header bars, side panels, and bottom composer bars.
- Persistent controls should float above the window edge instead of collapsing into browser-default layouts.
- Header title is left aligned unless a screen has a strong reason to differ.
- Header actions should live inside a restrained rounded cluster when grouped.
- Floating shell chrome, popovers, dropdowns, and context menus should use the composer material language: translucent dark surfaces around `rgba(15,16,16,0.72)` or `rgba(32,32,33,0.72)`, restrained borders, and strong backdrop blur.
- Active state should usually use `surface2`, not loud accent fills.
- The shell should feel neutral, polished, and quiet.
- Primary creation actions should remain obvious and always within easy reach.
- Avoid visual noise. The shell should rely on surface separation, radii, and contrast instead of decorative effects.

## Icon Rules

- Use Lucide for new icons.
- Avoid mixing icon systems in the shell.
- Icon strokes should remain visually consistent across controls.
- Prefer familiar symbols over text when the action is obvious.

## Component Rules

- Prefer `shadcn` primitives as the starting point for buttons, inputs, popovers, dialogs, and menus.
- Do not nest decorative cards inside other decorative cards.
- Use `surface` for primary containers and `surface2` for selected states or inner pills.
- Keep dropdowns, context menus, and floating panels visually consistent with the composer: translucent dark material, `backdrop-blur-xl` or stronger, soft borders, and subtle white/6 hover states.
- Keep shadows restrained or absent. Contrast should come from surface layering, spacing, and radii.
- Hover, focus, and press states should be subtle opacity, border, or surface changes, not loud scale effects.
- Inputs and control bars should read as integrated studio instruments, not bright consumer form fields.

## Screen Rules

- New screens should inherit shell spacing instead of rebuilding top-level chrome locally.
- Keep content layouts aligned to the shell content width and padding.
- Use dense, intentional spacing rather than oversized empty hero sections.
- Desktop layouts should still behave cleanly at narrower window sizes.
- Editing and generation screens should prioritize canvas, media preview, timeline-ready space, and prompt/control access over marketing copy.
- Default page backgrounds should stay on the dark token, not white or gradient-heavy alternates.

## Workflow Rules

- Design flows around creative work: prompt, configure, generate, review, refine.
- Controls for model, duration, resolution, quality, and automation should feel like studio tools, not settings clutter.
- Leave room for future video controls such as duration, motion strength, shot continuity, and timeline-adjacent panels.
- Media browsing, version comparison, and iteration history should fit naturally into the layout when added.
- Default empty states should invite creation without looking like template-demo boilerplate.

## Code Organization

- Keep renderer components under `src/`.
- Keep Electron main/preload code under `electron/`.
- Shared utilities should stay small, explicit, and framework-appropriate.
- Do not move desktop-specific logic into presentational React components.

## Do

- Keep interfaces dense enough to feel intentional.
- Reuse theme tokens instead of inline colors.
- Reuse shared shell primitives before adding one-off buttons or pills.
- Build additions in a way that works with `pnpm`, Tailwind v4, and `shadcn`.
- Use the `flowai` dark palette and shell restraint as the reference when making new UI decisions.

## Do Not

- Do not use pure black surfaces on top of the dark background. Use the defined surface tokens.
- Do not introduce purple-heavy gradients or bright decorative glows.
- Do not use starter Vite or Electron visual patterns in product UI.
- Do not add mobile framework conventions to this desktop app unless the stack changes intentionally.
- Do not switch the main app canvas to a light page by default.
