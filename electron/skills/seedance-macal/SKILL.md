---
name: seedance-macal
description: usada para planejar e gerar prompts Seedance 2.0 com MACAL. Use para prompts Seedance, cenas cartoon estilizadas em 3D, multishot, shot list, prompts de video, referencias @Image/@Video/@personagem, mapeamento de imagens anexadas, limite rigoroso de 3500 caracteres e saida final sem comentarios extras.
---

# Seedance MACAL — Multishot Prompts

Turn a scene idea plus reference images into a single, ready-to-paste **Seedance 2.0 multishot prompt** for polished stylized 3D cartoon animation. The output is one block the user can paste into Seedance / Higgsfield.

Everything follows **MACAL**: Movement, Angle, Cut, Audio, Lighting. The prompt must use real camera grammar, motivated lighting, clean cuts, explicit reference mapping, and a locked closing tag.

## Standing rules

1. **Always English.** Write the prompt in English even when chatting in Portuguese. Dialogue lines for lip-sync are the exception and may stay in Brazilian Portuguese.
2. **Maximum 3500 characters.** Seedance prompts must stay under 3500 characters total. If the scene is too long, compress the prose or split the scene into multiple prompts instead of exceeding the limit.
3. **Always 16:9.** Every prompt is widescreen 16:9, also stated in the closing tag.
4. **Use polished stylized 3D cartoon qualities, not studio names inside shots.** Describe glossy stylized 3D, soft global illumination, tactile materials, expressive on-model faces, painterly depth. Do not write "DreamWorks-style", "Pixar-style", or "Disney-style" inside a shot.
5. **Hard cuts by default.** Use `Hard dry cut.` between shots unless the scene truly needs a different transition.
6. **Audio is one final section.** Never write per-shot audio. Keep it short, diegetic, and always ask Seedance to generate without music.
7. **Lighting is brief and per shot.** Include one short, specific lighting note in every shot.
8. **The closing tag is fixed.** At the very end, below the Audio section, output this exact string once:

   ```text
   Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio
   ```

9. **No labeled subsections inside shots.** Each shot is one flowing block. The only labels are `References:`, `Shot N — X–Ys`, and `Audio —`.
10. **Reference mapping comes first.** Always open the prompt with a reference line that maps every user-provided reference tag to a short description.
11. **No emojis.** Never include emojis or decorative symbols in the final Seedance prompt.
12. **Final answer is only the prompt.** When generating the shot message, output only the ready-to-paste Seedance prompt: no intro, no explanation, no notes, no options, no questions, no markdown wrapper. If information is missing and a question is truly needed, ask it before generating the prompt; once the prompt is generated, include nothing else.

## Reference mapping

If the user says an image maps to a reference, preserve that mapping exactly and explain it at the top of the prompt. For example, if the user says `image1 = RefImage1`, the prompt must begin with a concise mapping like:

```text
References: @image1 = RefImage1: [short description]; @image2 = [label]: [short description]; @image3: [short description].
```

Rules:

- Use the user's exact tag casing when they provide it, such as `@image1`, `@Image1`, `@RefImage1`, `@Tito`.
- Include every reference the user gave: images, videos, character sheets, environment plates, keyframes, props, and named characters.
- Add a short description after each mapped reference so Seedance knows what the reference controls, for example `@image1 = RefImage1: garage wide frame and lighting direction; @image2: character identity and outfit; @image3: final camera framing`.
- Do not re-describe images at length. A compact role is enough.
- Use those same tags inside the shots when anchoring a shot: `Start from @image1.` or `Cut to @image3 framing.`

## MACAL framework

- **M — Movement:** what physically happens in the shot.
- **A — Angle:** shot size, camera angle, framing, and one camera move.
- **C — Cut:** the transition out of the shot. Default to `Hard dry cut.` The last shot has no trailing cut.
- **A — Audio:** handled once in the final Audio section.
- **L — Lighting:** one brief, specific lighting note inside each shot.

Per shot, write Movement + Angle + Lighting inline, then the Cut on its own line. Keep each shot to one action beat.

## Prompt anatomy

```text
References: @image1 = RefImage1: description; @image2 = RefImage2: description; @image3: description. Characters: @Tito, @Lua, @Nina, @Lumo.

Shot 1 — 0–3s Start from @image1. [Movement] [Camera: shot size, angle, framing, one move] [brief lighting note].
Hard dry cut.
Shot 2 — 3–6s [Movement] [Camera] [brief lighting note].
Hard dry cut.
Shot N — X–Ys [Movement] [Camera] [brief lighting note].

Audio — [short ambient bed + key diegetic SFX]. Generate without music.

Dreamworks 4k high definition 3d cartoon 16:9 aspect ratio
```

Notes:

- Use explicit timestamp ranges: `0–3s`, `3–6s`, etc.
- Keep shots around 2–4 seconds.
- Prefer 3–6 shots over 8+ shots. For longer scenes, split into a second prompt and use the last frame as the next start reference.
- Keep the total prompt under 3500 characters, including references, Audio, and closing tag.

## Writing one shot

Use this order naturally:

1. Optional reference anchor: `Start from @image1.` or `Cut to @image3 framing.`
2. Movement: concrete verb-forward action.
3. Camera: shot size + angle + framing + one camera move.
4. Lighting: direction + quality + color.
5. Transition: `Hard dry cut.` on its own line, except after the final shot.

Good:

```text
Shot 2 — 3–6s Low-angle close-up of the glowing floor hatch sliding open as the armored vehicle's front wheels rise from the elevator platform. Camera locked-off with a slight push-in. Strong blue rim light, amber side accents, faint haze on the glossy floor.
Hard dry cut.
```

Bad:

```text
Shot 2 — 3–6s
Action: the car comes up.
Camera: pan + zoom + orbit + dolly.
Lighting: DreamWorks-style lighting.
```

## Camera cheat-sheet

Use real film vocabulary and keep staging continuity inside the prompt itself.

Shot sizes:

- Extreme close-up / insert: eye, logo, switch, prop detail.
- Close-up: face and emotion.
- Medium close-up: chest up, emotion plus context.
- Medium: waist up, dialogue and blocking.
- Wide / full: body plus space.
- Extreme wide / establishing: geography and scale.

Angles:

- Eye-level: neutral and grounded.
- Low angle: heroic, powerful, looming.
- High angle: vulnerable or overwhelmed.
- Bird's-eye / top-down: layout and choreography.
- Dutch / canted: unease or chaos.
- Over-the-shoulder: relationship and eyeline.
- POV: first-person viewpoint.

Camera moves:

- Locked-off / static: clean reveal, dialogue, controlled acting.
- Slow push-in: focus, realization, tension.
- Pull-out: reveal context.
- Pan: follow or reveal.
- Tilt: reveal height or scale.
- Tracking / follow: move with a subject.
- Orbit / arc: showcase a hero subject.
- Crane up/down: grand reveal.

Pick one camera move per shot. Add `no random camera movement` when the camera must stay stable.

Shot choice:

- Use an establishing wide when geography matters: where characters are, where the object is, and what direction movement will take.
- Use a medium shot for dialogue, reactions, and readable body language.
- Use a close-up when emotion is the point of the beat.
- Use an insert or extreme close-up for a key prop, button, logo, glowing device, eye, hand, or tire.
- Use an over-the-shoulder shot when relationship, eyeline, or target of attention matters.
- Use a low angle for heroic reveals, vehicles, powered-up characters, or moments of scale.
- Use a high angle when a character should feel small, worried, trapped, or overwhelmed.
- Use top-down only for clear layout or choreography, not emotional acting.

Staging continuity:

- Keep screen direction consistent across cuts unless a wide shot resets geography.
- Keep characters on the same side of frame when preserving eyelines.
- Do not jump from one extreme framing to another without a clear motivation.
- Repeat stable anchors when drift is likely: same outfits, same faces, same body proportions, same environment layout, same lighting direction, no redesign, no extra characters, no morphing.
- Avoid stacking pan + zoom + orbit + dolly in the same shot. Seedance often warps when too many camera instructions compete.

Cut rhythm:

- Default to `Hard dry cut.` between shots.
- Use hard cuts for action clarity, cartoon timing, reveal beats, and most dialogue coverage.
- Use a whip-pan only when the scene needs speed or comic impact.
- Use a motivated pan into the next shot only when both shots share direction and subject.
- Never add `Hard dry cut.` after the final shot.

## Lighting

Every shot needs a concise lighting clause with direction, quality, and color:

- `cool blue platform glow from below`
- `warm golden key from screen-left`
- `soft amber practical rim from the doorway`
- `sharp blue rim light with faint volumetric haze`

Project canon when relevant:

- Warm golden light = Barão / villain influence.
- Cool blue ceiling-ring light = restored awareness / team control.
- Lumo's bioluminescent glow = passive energy meter.

## Audio

Use a single final section:

```text
Audio — Low energy hum, soft hydraulics, footsteps on glossy floor, faint room ambience. Generate without music.
```

For dialogue / lip-sync, put the line inside the relevant shot, not in the Audio section. Use: `accurate Brazilian Portuguese lip sync, do not generate audible voice, lip sync only.`

## Consistency guards

Use these when references or characters might drift:

- `Keep the same outfits, same faces, same body proportions, same environment layout, same lighting direction.`
- `No character redesign, no extra characters, no morphing.`
- `Keep the same vehicle scale and design.`
- `No random camera movement.`
- `The character emerges from below; it does not drive forward.`

## Output checklist

- References line comes first and maps every user reference: `@image1 = RefImage1: description; @image2 = ...: description; @image3: description`.
- Prompt is under 3500 characters.
- Prompt is in English, except lip-sync dialogue when needed.
- Each shot is one inline block: movement + camera + lighting.
- Real camera vocabulary with one move per shot.
- `Hard dry cut.` between shots, no trailing cut after the final shot.
- One final `Audio —` section with no music.
- Closing tag appears once at the bottom, verbatim.
- No emojis, no markdown wrapper, no commentary, and no questions after the prompt starts.
