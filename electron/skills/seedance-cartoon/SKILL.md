---
name: seedance-cartoon
description: usada para planejar e gerar cenas e frames para o Seedance. Use para prompts Seedance 2.0, cenas cartoon estilizadas em 3D, multishot, shot list, MACAL, prompts de video, planejamento de frames de inicio/fim e referencias como @Image1, @Tito, @Lua, @Nina ou @Lumo.
---

# Seedance Cartoon — MACAL Multishot Prompts

Turn a scene idea (plus reference images) into a single, ready-to-paste **Seedance 2.0 multishot prompt** for polished 3D cartoon animation. The output is one block the user copies straight into Seedance / Higgsfield — no edits needed.

Everything is built on the **MACAL framework** and a fixed prompt shape. The whole point is that the prompt comes out professional and consistent every single time: real camera grammar, motivated lighting, clean cuts, and a locked closing tag.

This skill owns **Seedance 2.0 multishot prompt writing**. Character sheets, scene keyframes, and start/end frame generation live in the `ai-animation-keyframes` skill — use that for the still images, this for the video prompt.

---

## Standing rules (never break these)

These are hard rules. They apply to every prompt with no exceptions unless the user explicitly overrides one.

1. **Always English.** The entire prompt is written in English, even when chatting with the user in Portuguese. (Dialogue lines for lip-sync are the one exception — those stay in Brazilian Portuguese, see the Audio / dialogue rule.)
2. **Always 16:9.** Every prompt is widescreen 16:9. This is also baked into the closing tag.
3. **Always the polished 3D cartoon look — described by qualities, never by studio.** Inside the shot text, describe the look through *visual qualities* (glossy stylized 3D, soft global illumination, tactile materials, expressive on-model faces, painterly depth). **Do not write "DreamWorks-style" / "Pixar-style" / "Disney-style" inside a shot** — naming a studio drags the render toward a stale default. The studio name only appears in the fixed closing tag below, which is a deliberate global render tag, not a per-shot descriptor.
4. **Hard cuts are the default transition.** Use `Hard dry cut.` between shots unless the scene genuinely calls for something else. Hard cuts read as the most natural in this style.
5. **Audio is ONE final section.** Never per shot. It barely describes the soundscape and **always asks Seedance to generate without music.** It is always the last section before the closing tag.
6. **Lighting is brief and per shot.** One short, specific light note woven into each shot's text. Seedance treats lighting as its highest-impact element, so even a tiny specific note ("warm golden key from screen-left") changes the whole render.
7. **The closing tag is fixed and literal.** At the very end, **below the Audio section, once (not per shot)**, output this exact string verbatim:

   ```
   Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio
   ```

8. **Everything inline as direct text.** Inside a shot, do **not** break things into labeled subsections (no "Action:", "Camera:", "Lighting:" labels). Write one flowing block of direct text per shot, with camera and lighting woven in as natural clauses. The only labels in the whole output are the `Shot N — Xs` markers and the final `Audio` marker.
9. **List the references at the top of the message.** See "References & message format" — always open by listing every reference the user gave, but don't re-describe them at length (the image is already attached).

---

## The MACAL framework

MACAL is the checklist every shot runs through — five dimensions, woven into one inline block per shot:

- **M — Movement** · the action: what the characters and the scene physically do in those seconds.
- **A — Angle** · the camera: shot size + angle + framing + one camera move.
- **C — Cut** · the transition *out* of the shot (hard cut by default). The last shot has no trailing cut.
- **A — Audio** · handled **once**, in a single final section. Never per shot. Always no music.
- **L — Lighting** · a short, specific light note inside each shot.

So per shot you cover **M + A + L** (movement, angle/camera, lighting) inline, followed by the **C** (cut) on its own line. The **A** (audio) is pulled out into the single final section.

---

## Prompt anatomy (exact output shape)

```
References: @Image1 = …, @Image2 = …; Characters: @Tito, @Lua, @Nina, @Lumo

Shot 1 — 0–3s [optional: Start from @ImageN.] [Movement: who does what, where] [Camera: shot size, angle, framing, one move, inline] [short lighting note].
Hard dry cut.
Shot 2 — 3–6s [Movement] [Camera] [lighting].
Hard dry cut.
…
Shot N — X–Ys [Movement] [Camera] [lighting].   ← last shot: NO trailing cut

Audio — [barely describe ambient + key SFX, diegetic only]. Generate without music.

Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio
```

Notes:
- **Timestamps** are explicit ranges per shot (`0–3s`, `3–6s`, …). Keep shots ~2–4s each.
- **Length:** Seedance multishot works best with a handful of shots. ~4–6 shots over ~10–15s total is the sweet spot (the worked example below uses 6 shots = 15s). For anything longer, split into a second generation and use the last frame of the first as the start frame of the next.
- The opening shot usually anchors with `Start from @Image1.` so the generation locks onto the established frame.

---

## Writing one shot (M + A + L inline)

Each shot is a single block of direct prose. Order inside the block, as natural clauses:

1. **(Optional) Reference anchor** — `Start from @ImageN.` or `Cut to @ImageN style:` when a shot should inherit from a specific image.
2. **Movement** — concrete, verb-forward. *What physically happens* and who's involved (use the @character tags). Keep it to one clear action beat per shot; don't cram a whole scene into 3 seconds.
3. **Camera** — shot size + angle + framing + **one** camera move, written inline (e.g. "Low-angle close-up, camera locked-off, symmetrical framing"). One camera intention per shot — Seedance warps when you ask for several moves at once.
4. **Lighting** — one short specific note: a key direction + quality + color (e.g. "strong blue rim light, amber side accents").

Then, on its own line, the **transition**: `Hard dry cut.` (omit on the final shot).

**Good shot block:**
> Shot 2 — 3–6s Low-angle close-up of the glowing floor hatch sliding open as the armored vehicle's front wheels rise from the elevator platform. Camera locked-off, slight push-in. Strong blue rim light, amber side accents, faint energy haze on the wet glossy floor.

**Bad shot block** (labeled subsections, multiple camera moves, studio name):
> Shot 2 — 3–6s
> Action: the car comes up.
> Camera: pan + zoom + orbit + dolly.
> Lighting: DreamWorks-style lighting.

---

## Camera cheat-sheet (compact)

Use these terms literally — Seedance recognizes the film vocabulary. For deeper guidance on *which* framing to pick and how to keep cuts spatially consistent, read `references/camera-and-staging.md`.

**Shot sizes** (tight → wide):
- *Extreme close-up / insert* — an eye, a logo, a switch. Intensity or a key detail.
- *Close-up* — face fills frame. Emotion.
- *Medium close-up* — chest up. Emotion + a bit of context.
- *Medium* — waist up. Dialogue, blocking.
- *Wide / full* — whole body + the space around it.
- *Extreme wide / establishing* — the world, subject small. Sets the geography of the scene.

**Angles** (and what they make the viewer feel):
- *Eye-level* — neutral, grounded.
- *Low angle* — powerful, heroic, looming (great for the hero vehicle / a team hero beat).
- *High angle* — small, vulnerable, overwhelmed.
- *Bird's-eye / top-down* — layout, choreography, isolation.
- *Dutch / canted* — unease, tension, chaos.
- *Over-the-shoulder (OTS)* — relationship and eyeline between two subjects.
- *POV* — first person, in a character's eyes.

**Camera moves** (pick ONE per shot, and make it motivated):
- *Locked-off / static* — default for clean reveals and dialogue.
- *Slow push-in (dolly-in)* — builds focus or tension.
- *Pull-out (dolly-out)* — reveals context.
- *Pan left/right* — follows action or reveals.
- *Tilt up/down* — reveals height or scale.
- *Tracking / follow* — moves with the subject.
- *Orbit / arc* — showcases a hero subject or vehicle.
- *Crane up/down* — grand reveal.
- *Handheld micro-sway* — energy/realism; use sparingly in cartoon.
- Guard phrase: add **"no random camera movement"** when you want the camera truly locked.

---

## Lighting (brief, but always specific)

Name a **key direction + quality + color** in one short clause. Vague light ("cinematic lighting") gives a generic AI default; a specific note changes everything.

Building blocks: key, fill, rim/back-light, **practicals** (in-scene sources — screens, neon, glows), bounce, volumetric haze / god-rays.

**Project color language — Liga da Energia canon** (swap these out for other projects):
- **Warm golden light** = the Barão / villain influence at work.
- **Cool blue ceiling-ring light** = the team with restored awareness.
- **Lumo's bioluminescent glow** = the passive energy meter — brighter glow means more charged.

So a shot under the villain's sway leans warm gold; a shot of the team in control leans cool blue; Lumo's glow level signals energy state in the background of either.

---

## Transitions

- **Default:** `Hard dry cut.` between every shot. It reads cleanest in this style.
- Only reach for something else when the beat truly calls for it (e.g. a deliberate `Slow pan into the next shot.` or `Quick whip-pan.`), and say so explicitly.
- **The final shot has no trailing transition** — the prompt ends on the last shot's action, then the Audio section.

---

## Audio (single final section)

One short section, marked `Audio —`, always the last thing before the closing tag.

- **Barely describe** the soundscape: ambient bed + a couple of key diegetic SFX (hydraulics, energy hum, footsteps). Don't over-write it.
- **Always end it with an explicit no-music instruction**, e.g. "Generate without music." / "No music."
- **Dialogue / lip-sync:** put the spoken line *inside the relevant shot* (not in the Audio section), in **Brazilian Portuguese for lip-sync only**, with "accurate Brazilian Portuguese lip sync" and "Do not generate audible voice. Lip sync only." The Audio section still says no music.

---

## References & message format

**Open every reply by listing the references**, on one line, then go straight into the prompt. List everything the user attached or named — but **don't re-describe each image in depth**; the image is already there, a few words of label is enough.

```
References: @Image1 = dark sci-fi garage, team facing the blue platform; @Image2 = vehicle fully raised, hero framing; @Image3 = frontal group shot; @Image4 = OTS behind the team. Characters: @Tito, @Lua, @Nina, @Lumo.
```

**Reference tags:**
- `@Image1`, `@Image2`, … for attached images, used inline (`Start from @Image1.`, `Cut to @Image3 style:`).
- `@Tito`, `@Lua`, `@Nina`, `@Lumo` are the project's standing character tags — always use them so characters stay consistent across shots.
- If the user gives a video reference, tag it `@Video1` etc.

**Consistency / token-locking guards.** Across shots, keep the same outfits, faces, body proportions, lighting direction, and layout. When a shot risks drifting, add an explicit guard in that shot's text, e.g.: "Keep the same outfits, same faces, same body proportions, same garage layout, same blue lighting direction, same vehicle scale. No character redesign, no extra characters, no morphing." This is cheap insurance against Seedance reinventing a character mid-sequence.

---

## Full worked example (Liga da Energia)

A complete, compliant prompt — references at the top, 6 shots with hard cuts, a single no-music Audio section, and the fixed closing tag.

```
References: @Image1 = dark sci-fi garage, team facing the glowing blue circular platform; @Image2 = vehicle fully raised on the platform, hero framing; @Image3 = frontal group shot of the team in the garage; @Image4 = over-the-shoulder behind the team toward the vehicle. Characters: @Tito, @Lua, @Nina, @Lumo.

Shot 1 — 0–3s Start from @Image1. @Tito, @Lua, @Nina and @Lumo stand far in the background facing the blue circular platform as the central floor circle splits open and blue energy lines pulse outward across the reflective black floor. Wide cinematic establishing shot, camera locked-off, symmetrical framing, no random camera movement. Cool blue ceiling-ring light, faint volumetric haze.
Hard dry cut.
Shot 2 — 3–6s The glowing floor hatch slides apart with clean sci-fi precision and the armored Liga da Energia vehicle's front wheels rise vertically from the elevator platform — it emerges from below, it does not drive forward. Low-angle close-up, camera locked-off with a slight push-in. Strong blue rim light, amber side accents, energy haze and reflections on the wet glossy floor.
Hard dry cut.
Shot 3 — 6–9s Fast string of extreme close-ups as the car keeps rising: the rugged tire rotating into view, the blue LED headlights powering on, the glowing Liga da Energia logo on the front grille, the side-door emblem catching light. Quick energetic cuts, sharp metallic detail, tiny reflections. Hard blue key with crisp specular hits.
Hard dry cut.
Shot 4 — 9–11s The vehicle is now fully raised and centered on the glowing platform, blue light pulsing across its armor panels as it settles with a subtle hydraulic motion. Wide hero shot matching @Image2, camera locked-off. Cool blue key from the platform, warm screen glow behind. Keep the same vehicle scale and design, no morphing.
Hard dry cut.
Shot 5 — 11–13s Cut to @Image3 style: @Tito, @Lua, @Nina and @Lumo stand together, happy and excited — @Tito grins with brave enthusiasm, @Lua calm and confident, @Nina ready, @Lumo's eyes shining and tail lifting, his bioluminescent glow brightening. @Tito says in Brazilian Portuguese for lip-sync only: "Vamo simbora, gente!" — accurate Brazilian Portuguese lip sync, do not generate audible voice, lip sync only. Frontal medium close-up, camera locked-off. Cool blue key, soft warm fill on the faces.
Hard dry cut.
Shot 6 — 13–15s Cut to @Image4 style: the team begins walking forward together toward the vehicle with mission energy, ending as they approach the car ready to board. Over-the-shoulder from behind the team, camera slowly tracking in. Cool blue light direction held from the previous shots. Keep the same outfits, same faces, same proportions, same garage layout, same vehicle scale.

Audio — Low energy hum of the platform, mechanical hydraulics as the hatch and vehicle move, soft footsteps on the glossy floor, faint room ambience. Generate without music.

Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio
```

---

## Output checklist (run before sending)

- [ ] References listed on the first line (no long re-descriptions).
- [ ] Entire prompt in English (dialogue lines excepted).
- [ ] Each shot = one inline block: movement + camera (one move) + brief lighting. No labeled subsections.
- [ ] `Shot N — X–Ys` markers with explicit timestamps.
- [ ] `Hard dry cut.` between shots; **no** trailing cut on the last shot.
- [ ] Camera grammar is real (named shot size + angle + one motivated move).
- [ ] Lighting note per shot, specific (direction + color).
- [ ] No studio name inside any shot; look described by qualities.
- [ ] Single `Audio —` section, ends with an explicit no-music instruction.
- [ ] Closing tag present, verbatim, once, at the very bottom: `Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio`.

---

## Common pitfalls

- **Stacking camera moves in one shot.** "Pan + zoom + orbit" makes Seedance warp the cartoon. One intention per shot.
- **Vague lighting.** "Cinematic lighting" = generic default. Always name a direction and color.
- **Studio name inside a shot.** Describe qualities ("glossy stylized 3D, soft GI"), keep the studio word only in the fixed closing tag.
- **Audio per shot, or with music.** Audio is one final section, and it always says no music.
- **Forgetting the closing tag**, or duplicating it per shot. It goes once, at the very bottom, verbatim.
- **Cramming a whole scene into 3 seconds.** One clear action beat per shot.
- **Letting characters drift.** Add the token-locking guard ("same faces, same outfits, no morphing") on any shot at risk.
- **Trailing `Hard dry cut.` on the last shot.** The final shot ends on its action.

## Quick decision flow

- "Write me a Seedance prompt for this scene" → build the full MACAL multishot block.
- "Just one shot" → still use the `Shot 1 — 0–3s …` format + Audio section + closing tag.
- "Make the cuts smoother / it feels choppy" → most cuts stay hard; only swap specific ones for a named pan/whip and say so.
- "A character changed between shots" → add the token-locking guard to the drifting shots.
- "Which angle should I use here?" → see `references/camera-and-staging.md`.
- "I need the character sheet / keyframe first" → that's `ai-animation-keyframes`, then come back here for the video prompt.
