---
name: cinematic-angles
description: Use when working on camera angles, shot framing, character performance, angle picker entries, cinematic prompts, or image/video generation prompts where environment or character consistency must survive camera changes.
---

# Cinematic Angles

This app ("crevn") generates images through a **Codex** batch job. The model renders
what the prompt text describes, so the words matter. This skill is the single source
of truth for the cinematographic language the app speaks to that model.

## Why this exists

The angle picker used to send the model the bare label `Angle: Low Angle`. A label is
not direction — the model had to guess where the camera sits and how the frame is
filled. Now each angle carries a **`prompt`**: a precise, AI-facing directive in
standard cinematography terms. The app expands the selection with `buildAngleDirective`
before it reaches Codex.

- Data: `angleOptions` in `src/App.tsx` — `{ name, tone, prompt, preview }`.
  - `tone` → short UI tag shown in the angle carousel.
  - `prompt` → the cinematographic directive sent to the AI.
- Wiring: `buildAngleDirective(name)` (in `src/App.tsx`) returns
  `Angle: <Name> — <prompt>` and is injected into the generation prompt only when the
  angle toggle (`isAngleEnabled`) is on.
- The richer `camera` mode (orbit/tilt/zoom, 12-angle lattice) lives in
  `electron/features/generation/codexPrompt.ts` and is separate from this label-based
  angle directive.

When you add or edit an angle, **write its `prompt` here-style**: camera position first,
then framing, then intent. Keep it one sentence, standard terminology, no contradictions.

## The core distinction

The model responds to three different ideas. Keep them straight.

| Concept | Question it answers | Examples |
| --- | --- | --- |
| **Camera angle** | *Where is the camera?* | eye level, low, high, Dutch, overhead, worm's-eye, bird's-eye, POV |
| **Shot type / framing** | *How much fills the frame?* | extreme close-up, close-up, medium, long/full, wide, extreme wide |
| **Coverage pattern** | *How are subjects arranged for dialogue?* | OTS, two shot, clean/dirty single, shot-reverse-shot, cross shot |

Angle and shot type are orthogonal and combine: *"low-angle medium close-up"* sets both
position and framing. Coverage patterns describe multi-subject staging.

## The prompt formula

The model was trained on millions of captioned film and photo frames. Standard
terminology unlocks that training directly. Build prompts in this order:

```
[Camera Angle] + [Shot Type] + [Subject] + [Context/Setting] + [Style/Technical]
```

Rules that matter for this engine:

- **Camera terms go first.** The model weights early words most heavily.
- **Use commas** to separate distinct elements so they parse cleanly.
- **Use standard film terms** ("low-angle", "bird's eye view", "Dutch angle"), not invented ones.
- **Never contradict.** Don't ask for a `close-up` and "the whole environment" at once,
  and don't stack incompatible angles ("bird's eye view eye-level shot").
- **Add lighting and lens** when it helps: `24mm wide`, `85mm telephoto`, `macro`,
  `fisheye`; `backlit`, `rim light`, `golden hour`, `soft side light`.

Example: `Low-angle medium shot of a lone firefighter, smoke-filled stairwell, backlit by embers, cinematic, shallow depth of field`.

## Environment-locked angle workflow

Use this whenever a shot changes angle inside an existing location or with saved
character sheets. The goal is to rotate/reframe the camera, not rebuild the scene.

1. Start with the required anchor references only:
   - The full environment reference set when location continuity matters: base/coverage plates plus the relevant close/detail plate for the area visible in this frame.
   - Character sheet(s) only for characters visible in the frame.
   - Prop/object references only when the prop is visible or identity-critical.
2. Read the whole environment set before writing a frame:
   - Coverage/base plates define room geometry, wall/floor materials, door/window placement, large furniture, and lighting direction.
   - Close/detail plates define the exact local area: bed corner, door, window, desk, shelf, prop cluster, texture, and trim.
   - Use the closest matching detail plate for the shot area; do not hallucinate a new version of that corner.
3. Write the environment as a locked layout, not a mood board:
   `Preserve @Bedroom Base exactly: same wall/floor materials, bed position, window placement, door location, desk orientation, lighting direction, and room scale.`
4. Write the angle as camera movement inside that layout:
   `Low-angle medium shot from near the foot of the bed, looking toward the window side of the same room.`
5. Write visible character identity constraints:
   `Keep @Tito face shape, costume, hair silhouette, palette, and proportions matching the character sheet.`
6. Add only the frame-specific action, expression, body language, and interaction with the set.

Template:

```markdown
Angle: <Name> - <standard angle directive>.
Preserve @Environment exactly: same layout, materials, fixed object positions, door/window placement, lighting direction, and scale.
Use @Environment Detail for the visible area: preserve local textures, nearby props, trim, and object placement.
Keep @Character identity locked to the sheet: face, proportions, costume, hair, palette, and distinctive details.
Frame-specific performance: <natural expression, posture, gesture, walk/weight shift, eye line, and interaction with the set>.
```

If the requested angle cannot see a referenced object, do not force that object into
frame. Keep it spatially consistent off-camera instead. Do not list every asset in the
project; excess references make the model blend locations and identities.

## Character performance without robot poses

Character sheets lock identity, but they do not provide acting. Every character prompt
needs a readable human performance beat so the result does not become stiff.

Use this order:

1. **Emotion** — specific, not generic: wary curiosity, embarrassed smile, focused concern, playful confidence.
2. **Face** — eyes, brows, mouth, head tilt: `brows slightly raised`, `eyes tracking the door`, `small uneven smile`.
3. **Body line** — posture and weight: `weight on one foot`, `shoulders turned toward the window`, `torso leaning forward`.
4. **Hands** — natural occupation: touching the doorframe, holding a sketchbook, adjusting a sleeve, resting on the desk.
5. **Walk/action mechanics** — if moving, describe phase and balance: `mid-step with one foot planted and the trailing heel lifted`, `arms swinging naturally`, `coat following the motion`.
6. **Interaction with environment** — ground the body in the set: hand on the bedpost, shadow falling on the floor, foot partly under the desk light.

Good:
`Keep @Tito identity locked. Tito pauses mid-step beside the bed, weight on his front foot, shoulders slightly hunched with cautious curiosity, eyes aimed toward the open door, one hand hovering near the bedpost.`

Bad:
`Tito standing, happy.` This produces mannequin poses and generic expression.

## Director scene planning rules

For Director-generated Scene plans:

- Every frame prompt must carry the relevant environment reference by name, including the closest/detail plate for the visible area when available.
- Every visible character must carry its character sheet reference by name.
- The scene prompt should define the locked environment once; frame prompts should say what changes: camera position, shot size, action, expression, posture, gesture, walk mechanics, and interaction with the set.
- The agent should inspect/read all character sheets and all environment references for the current scene to understand the full context, then attach/use only the references needed for each frame.
- Do not generate frames before the user reviews/edits the plan.
- Avoid contradictions like `close-up` plus `show the entire room`; use an establishing frame for layout, then tighter frames that preserve the same space.

## Angle reference

These are the 33 entries in `angleOptions`, grouped by what they really control. Each
line is the grounded definition behind its `prompt`.

### Camera angles (where the camera sits)
- **Eye Level** — camera at the subject's eye height; neutral, relatable, conversational, no power imbalance.
- **Low Angle** — camera below the eyeline looking up; power, dominance, heroism, larger than life.
- **High Angle** — camera above looking down; vulnerability, weakness, exposure, isolation.
- **Dutch Angle** — camera tilted so the horizon runs diagonally; tension, unease, disorientation.
- **Overhead** — camera ~90° straight down; graphic, top-down staging.
- **POV** — camera exactly at the character's eyes; first-person immersion.
- **Worm's-Eye** — camera at ground level looking straight up; extreme foreshortening, monumental scale.
- **Bird's-Eye** — camera high overhead looking down; geometry, pattern, scale, geography.

### Camera height variants (subtle vertical placement)
- **Shoulder Level** — at shoulder height; more standard than eye level, head reaches top of frame, slight low-angle feel.
- **Hip Level** — at waist/hip height; action at the beltline, grounded stances.
- **Knee Level** — at knee height; low kinetic energy, motion, stealth.
- **Ground Level** — on the floor; dramatic low foreground presence, feet-level.

### Shot types (how much fills the frame)
- **Extreme Close-Up** — one small detail (the eyes) fills the frame; intense focus.
- **Close-Up** — the face fills the frame; emotional detail.
- **Medium Shot** — waist up; the dialogue workhorse, balances face and gesture.
- **Cowboy Shot** — head to mid-thigh; stance, hips, holster line, western posture.
- **Long Shot** — full body head to toe within the environment.
- **Extreme Wide** — subject is a tiny element in a vast environment; scale and isolation.
- **Wide Establishing** — full environment with a small subject; sets location and context.
- **Profile Shot** — 90° side view; graphic, silhouette-like outline.

### Coverage patterns (multi-subject / dialogue staging)
- **Over-the-Shoulder (OTS)** — behind one subject's shoulder, framing the other beyond; layered depth, dialogue.
- **Two Shot** — two subjects in one frame; relationship and shared space.
- **Group Three-Shot** — three subjects in triangular blocking.
- **Clean Single** — one subject isolated, no one else visible.
- **Dirty Single** — one subject with a piece of another (shoulder/arm) in soft foreground.
- **Reaction Shot** — a character responding; emotion-first.
- **Shot-Reverse-Shot** — one subject along the opposing eyeline, the reverse of the matching angle.
- **Over-the-Hip** — like OTS but anchored at hip level, low foreground body mass.
- **Group OTS** — group conversation framed from behind one shoulder.
- **Cross Shot** — tight single on the opposing eyeline, no foreground shoulder; heightened tension.
- **Ensemble Wide** — the whole group in frame; maps the geography of a multi-character scene.
- **Dialogue Insert** — tight insert on hands, objects, or gesture detail that punctuates dialogue.
- **Silhouette Shot** — backlit subject reading as a dark, iconic shape against a brighter background.

## Adding or editing an angle

1. Add the preview image to `src/assets/angle-previews/` and import it in `src/App.tsx`.
2. Add an entry to `angleOptions` with `name`, `tone` (UI tag), `prompt` (AI directive),
   and `preview`.
3. Write `prompt` as: **camera position → framing → intent**, one sentence, standard
   terms, no contradictions. Model it on the lines in the Angle reference above.
4. Nothing else to wire — `buildAngleDirective` resolves the new entry automatically.
5. Run `pnpm test` (the App and codexPrompt suites assert the prompt wiring).

## Common mistakes to avoid

- **Sending a bare label.** Always route through `buildAngleDirective`; never re-introduce `Angle: <name>` alone.
- **Contradictory framing** — a `close-up` `prompt` that also asks for the full environment.
- **Stacking angles** — one angle directive per generation; combine angle + shot type, not angle + angle.
- **Inventing terms** — stick to the vocabulary above so the model recognizes it.
- **Putting camera terms last** — keep them at the front of the directive.
- **Dropping the `Angle: <Name> —` prefix** — the test suite and the UI rely on the name being present.
