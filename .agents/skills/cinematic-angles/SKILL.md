---
name: cinematic-angles
description: Cinematographic vocabulary for the imagen Codex generation engine. Use when working on camera angles, shot framing, the angle picker, or any prompt text sent to image/video generation. Explains how the app turns an angle selection into an AI directive, defines all 33 angles/shots/coverage patterns in standard film language, and gives the prompt formula the model was trained on. Triggers on "camera angle", "add an angle", "shot type", "framing", "angle prompt", "make the AI understand the shot", "cinematic prompt", "buildAngleDirective", "angleOptions".
---

# Cinematic Angles

This app ("imagen") generates images through a **Codex** batch job. The model renders
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
