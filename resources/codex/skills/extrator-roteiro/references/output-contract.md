# Output Contract

Use este contrato quando a resposta precisa alimentar Director, Scenes, gerador de ambientes, keyframes de imagem estatica ou automacao futura.

## Shape

```json
{
  "production_plan": {
    "schemaVersion": "1.2",
    "language": "pt-BR",
    "sourceSummary": "Resumo curto do roteiro analisado.",
    "directorContext": {
      "projectName": "string|null",
      "threadName": "string|null",
      "style": "string|null",
      "continuityRules": ["string"]
    },
    "references": [
      {
        "refKey": "char-tito",
        "referenceKind": "saved_reference",
        "referenceId": "existing-id-or-null",
        "category": "characters",
        "title": "Tito",
        "description": "Identidade visual que deve permanecer.",
        "required": true,
        "status": "resolved"
      },
      {
        "refKey": "env-garagem",
        "referenceKind": "saved_reference_group",
        "referenceId": "garagem-group-id",
        "category": "environment",
        "title": "Garagem",
        "description": "Grupo de 14 imagens cobrindo angulos e areas da garagem.",
        "imageCount": 14,
        "required": true,
        "status": "resolved"
      }
    ],
    "scenes": [
      {
        "sceneId": "scn-001",
        "title": "Garagem - Tito encontra a mochila",
        "locationKey": "env-garagem",
        "timeOfDay": "morning",
        "narrativePurpose": "Tito entra na garagem e encontra a mochila perto do portao lateral.",
        "continuityNotes": ["Manter luz da manha e layout da imagem 7 do grupo Garagem."],
        "frames": [
          {
            "frameId": "fr-001",
            "sceneId": "scn-001",
            "order": 1,
            "type": "establishing",
            "frameSize": "wide",
            "cameraAngle": "frontal_medio",
            "stillMoment": "Tito no instante em que cruza o portao lateral da garagem.",
            "visualAction": "Tito entrando pela lateral da garagem, pose clara de chegada.",
            "composition": "Wide establishing view with Tito framed near the side gate and the garage layout visible.",
            "characters": ["char-tito"],
            "environmentKey": "env-garagem",
            "environmentAngle": "master_wide",
            "zoneKey": null,
            "props": [],
            "detailPlateKey": null,
            "referenceKeys": ["char-tito", "env-garagem"],
            "selectedReferenceImages": [
              {
                "selectionKey": "sel-garagem-portao-lateral",
                "parentRefKey": "env-garagem",
                "parentReferenceId": "garagem-group-id",
                "selectedImageId": "garagem-img-07",
                "selectedImageIndex": 7,
                "selectedImageTitle": "Garagem - portao lateral aberto",
                "selectedImageDescription": "Vista lateral da garagem com portao aberto, parede esquerda e area de ferramentas visiveis.",
                "usage": "environment_anchor",
                "reason": "Este frame precisa do portao lateral e da parede de ferramentas; a imagem 7 e a melhor correspondencia de angulo.",
                "required": true
              }
            ],
            "seedanceReferenceRole": "opening_keyframe",
            "seedanceSlotCandidate": "@image3",
            "seedanceReferencePurpose": "Generate this approval frame as a Seedance reference image for Shot 1: Tito framed at the garage side gate with the correct pose, wardrobe, selected garage layout and morning light.",
            "imageFramePrompt": "Tito at the side gate of the garage, wide establishing still image using the selected garage side-gate reference, morning light, same garage layout, clear arrival pose, kids cartoon production style, no motion blur, no text overlay.",
            "directorNotes": "Estabelece geografia antes dos inserts. Este prompt e para gerar uma imagem estatica."
          }
        ]
      }
    ],
    "seedanceMultishotPlan": [
      {
        "sceneId": "scn-001",
        "mode": "multishot_reference_images",
        "duration": "12-15s",
        "aspectRatio": "16:9",
        "seedancePromptPreview": "Use @image1 as Tito identity, @image2 as the exact selected garage side-gate environment, @image3 as the opening keyframe, and @image4 as the watch close-up reference. Shot 1: Tito, Nina, Lumo and Lua enter the garage through the normal side entrance, smiling, with the large gate closed in the background. Shot 2: Hard cut to the mezzanine table area as the group gathers near the table. Shot 3: Hard cut to a close-up of Tito pressing the device on his wrist. Shot 4: Hard cut to the central platform where Nina's TukTuk and Tito's motorcycle appear in orbit. Keep the same garage layout, closed large gate, warm studio lighting, polished 3D feature-animation look, 16:9. Audio: no music, no background score. Sound effects and ambient only — footsteps, soft device click, subtle mechanical hum, room tone.",
        "referenceImageNeeds": [
          {
            "needKey": "need-garagem-porta-normal",
            "tag": "@image2",
            "role": "environment",
            "neededImage": "Exact garage child image showing the normal side entrance, mezzanine/table relationship, and large gate closed.",
            "sourceStrategy": "select_from_reference_group",
            "parentRefKey": "env-garagem",
            "selectedImageId": "garagem-img-07",
            "selectedImageIndex": 7,
            "fulfilledBy": "selected_reference_image",
            "reason": "The Seedance prompt needs the normal entrance and closed large gate to remain consistent."
          },
          {
            "needKey": "need-watch-close",
            "tag": "@image4",
            "role": "object",
            "neededImage": "Reference-grade still/insert of Tito pressing the wrist device.",
            "sourceStrategy": "generate_approval_frame",
            "sourceFrameId": "fr-003",
            "fulfilledBy": "image_frame",
            "reason": "The close-up beat depends on a clear wrist-device reference."
          }
        ],
        "referenceSlots": [
          {
            "tag": "@image1",
            "role": "identity",
            "sourceKey": "char-tito",
            "sourceType": "character_reference",
            "usage": "Keep Tito face, hair, outfit and proportions consistent in every shot."
          },
          {
            "tag": "@image2",
            "role": "environment",
            "sourceKey": "env-garagem#garagem-img-07",
            "sourceType": "reference_group_image",
            "parentRefKey": "env-garagem",
            "selectedImageId": "garagem-img-07",
            "selectedImageIndex": 7,
            "usage": "Place the action in the exact side-gate area of the garage shown in the selected child image, preserving the same layout and morning light."
          },
          {
            "tag": "@image3",
            "role": "shot_keyframe",
            "sourceKey": "fr-001",
            "sourceType": "image_frame",
            "usage": "Opening keyframe for Shot 1 composition and pose."
          }
        ],
        "shots": [
          {
            "shotNumber": 1,
            "label": "Shot 1",
            "sourceFrameIds": ["fr-001"],
            "sharedAnchor": "Tito in env-garagem#garagem-img-07 with warm morning light",
            "videoBeat": "Tito enters the garage through the side gate and notices the backpack.",
            "cameraIntent": "Wide establishing frame, gentle push-in",
            "referenceTags": ["@image1", "@image2", "@image3"],
            "audioCue": "soft room tone, light footsteps, fabric rustle"
          }
        ],
        "videoPromptBrief": "Use @image1 as Tito identity, @image2 as the exact selected garage side-gate reference, and @image3 as the opening keyframe. Shot 1: Tito enters the garage through the side gate and notices the backpack. Keep the same warm morning light and garage layout. Polished 3D feature-animation look, 16:9. Audio: no music, no background score. Sound effects and ambient only.",
        "notes": ["Video language stays here; imageFramePrompt remains static."]
      }
    ],
    "assetManifest": {
      "environments": [
        {
          "environmentKey": "env-garagem",
          "title": "Garagem",
          "descriptionLocked": "Descricao canonica da garagem, sem personagens, baseada no grupo Garagem e na imagem filha selecionada quando o frame pedir angulo especifico.",
          "lightingLocked": "warm morning light, soft shadows",
          "styleLocked": "kids cartoon, cinematic, 16:9",
          "sourceReferenceKeys": ["env-garagem"],
          "requiredAngles": [
            {
              "angle": "master_wide",
          "usage": "Frame 1 establishing baseado em garagem-img-07"
            },
            {
              "angle": "lateral_esq",
              "usage": "Frame 3 coverage"
            }
          ],
          "zones": [
            {
              "zoneKey": "zone-door",
              "title": "Porta do quarto",
              "usage": "Close da porta abrindo"
            }
          ],
          "generatorSkill": "gerador-ambientes"
        }
      ],
      "detailPlates": [
        {
          "detailPlateKey": "plate-porta-quarto",
          "title": "Portao lateral da garagem aberto",
          "parentEnvironmentKey": "env-garagem",
          "sourceAngle": "frontal_medio",
          "usage": "Frame 2 insert",
          "description": "Close do portao lateral da garagem aberto, baseado na imagem filha garagem-img-07.",
          "referenceKeys": ["env-garagem"],
          "status": "needed"
        }
      ],
      "objects": [
        {
          "objectKey": "obj-mochila-tito",
          "title": "Mochila do Tito",
          "referenceKeys": [],
          "usage": "Prop recorrente nos frames 4-7",
          "status": "unresolved"
        }
      ],
      "characters": [
        {
          "characterKey": "char-tito",
          "title": "Tito",
          "referenceKeys": ["char-tito"],
          "usage": "Personagem principal",
          "status": "resolved"
        }
      ]
    },
    "unresolvedReferences": [
      {
        "key": "obj-mochila-tito",
        "category": "objects",
        "reason": "Prop importante sem referencia marcada.",
        "recommendedAction": "Salvar ou anexar referencia da mochila antes dos keyframes de imagem."
      }
    ],
    "handoff": {
      "nextAgent": "gerador-ambientes",
      "then": ["image_keyframes", "seedance_multishot_optional"],
      "requiredSkillsForImageGeneration": ["seedance-cartoon", "imagegen_or_available_image_generation_skill"],
      "imageGenerationInstruction": "Antes de gerar os frames de aprovacao, carregue/use `seedance-cartoon` para entender como esses stills vao funcionar como reference images de um Seedance 2.0 multishot, e carregue/use a skill/ferramenta de geracao de imagem disponivel para criar os stills finais. Gere cada frame como imagem estatica reference-grade, nao como prompt de video.",
      "notes": ["Gerar ambientes vazios antes dos keyframes de imagem com personagens.", "Nao enviar prompts para video antes de aprovar os frames estaticos.", "Quando aprovado para Seedance, usar seedanceMultishotPlan e ler seedance-cartoon."]
    }
  }
}
```

## Valid Values

`referenceKind`:

- `saved_reference`
- `saved_reference_group`
- `uploaded_attachment`
- `derived_asset`
- `missing`

`category`:

- `characters`
- `environment`
- `objects`

`frame.type`:

- `establishing`
- `coverage`
- `reaction`
- `insert`
- `transition`

`frameSize`:

- `extreme_wide`
- `wide`
- `medium`
- `close_up`
- `extreme_close_up`
- `insert`

`environmentAngle` / `requiredAngles.angle`:

- `master_wide`
- `frontal_medio`
- `reverso`
- `lateral_esq`
- `lateral_dir`
- `camera_alta`
- `zona_1`
- `zona_2`
- `zona_3`
- custom `zona_<slug>` when the area is semantically named

`seedanceMultishotPlan.mode`:

- `multishot_reference_images`
- `single_shot_candidate`
- `not_applicable`

`seedanceMultishotPlan.referenceSlots.role`:

- `identity`
- `environment`
- `object`
- `style_mood`
- `opening_keyframe`
- `shot_keyframe`
- `continuity_callback`

`frame.seedanceReferenceRole`:

- `identity`
- `environment`
- `object`
- `style_mood`
- `opening_keyframe`
- `shot_keyframe`
- `continuity_callback`
- `not_for_seedance`

`frame.selectedReferenceImages.usage`:

- `identity_anchor`
- `environment_anchor`
- `angle_match`
- `detail_plate_source`
- `object_anchor`
- `style_mood`
- `seedance_reference`
- `continuity_callback`

`seedanceMultishotPlan.referenceSlots.sourceType`:

- `character_reference`
- `environment_angle`
- `image_frame`
- `object_reference`
- `reference_group_image`
- `uploaded_attachment`

`seedanceMultishotPlan.referenceImageNeeds.sourceStrategy`:

- `use_existing_reference`
- `select_from_reference_group`
- `generate_approval_frame`
- `generate_environment_asset`
- `generate_detail_plate`
- `missing_reference`

## Validation Checklist

- Every frame has exactly one primary visible action.
- Every frame references either an `environmentKey` or a `detailPlateKey`.
- When a reference key points to a group with multiple images, the frame includes `selectedReferenceImages` with `parentRefKey` plus `selectedImageId` or `selectedImageIndex`.
- The generator handoff passes the selected child image when present, not only the parent reference group.
- Every frame declares whether it is a Seedance reference via `seedanceReferenceRole`.
- Frames used by Seedance include `seedanceSlotCandidate` and `seedanceReferencePurpose`.
- Every recurring character/prop has a stable key.
- Every close/insert either maps to a detail plate or explains why no plate is needed.
- Every new environment includes `master_wide`.
- No image frame prompt depends only on prose when an image reference exists.
- Every `imageFramePrompt` is written for static image generation, not video generation, and any Seedance-bound frame is prompt-adapted as an approval reference image.
- Motion, timing, camera moves, or animation intent must not appear in `imageFramePrompt`.
- Any video language, camera movement, duration, or audio cue appears only in `seedanceMultishotPlan`.
- For Seedance-capable scenes, `seedanceMultishotPlan` includes `seedancePromptPreview` before reference slots.
- `referenceImageNeeds` explains which images the Seedance prompt needs before the frame list is considered complete.
- Approval frames map back to at least one `referenceImageNeeds` item when they are intended for Seedance.
- Seedance reference slots use explicit `@imageN` tags and explain how each reference should influence the output.
- Seedance reference slots point back to generated still frames or approved assets, because these are the references for video generation.
- If a Seedance reference comes from a reference group, its slot points to the selected child image (`sourceType: "reference_group_image"`) with parent group and image ID/index.
- Seedance shots have a shared anchor and one primary video beat each.
- Handoff includes `requiredSkillsForImageGeneration` and an explicit `imageGenerationInstruction` telling the next agent to load/use `seedance-cartoon` plus the available image generation skill before generating approval frames.
- Unresolved references are explicit instead of silently invented.

## Prompt Assembly Rules for Image Frames

Build each image frame prompt from:

1. reference anchor: environment/detail plate + character/object references;
2. frame intent: frame size, camera angle, composition;
3. visible still moment: one clear frozen action only;
4. continuity constraints: lighting, layout, palette, wardrobe;
5. negative constraints: no extra characters, no changed room layout, no text overlays unless required.

If the reference anchor is a group, first choose the exact child image and include that selection in `selectedReferenceImages`. Do not rely on a parent group name alone when a specific angle, area, prop, or pose is needed.

Do not write prompts as video/image-to-video. Avoid "pan", "tracking", "camera moves", "duration", "animate", "walks across over time", or similar motion instructions. Convert action into a visible still moment: pose, gesture, expression, object position, composition, and reference anchors. For Seedance-bound frames, bias the still toward reference usefulness: clear identity, clean silhouette, visible key prop, stable environment, readable pose and no accidental crop.

## Prompt Assembly Rules for Seedance Planning

Use this only in `seedanceMultishotPlan`, never in `imageFramePrompt`:

1. assign references first: `@image1` identity, `@image2` environment, `@image3` keyframe/prop/style, using the still frames/assets produced by this plan;
2. list shots with `Shot 1`, `Shot 2`, etc.;
3. keep one video beat per shot and repeat the shared anchor;
4. include camera intent, timing/duration and audio/SFX cues;
5. close with global render/style notes, 16:9, and "no music, no background score".
