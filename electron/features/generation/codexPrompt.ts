export function buildCodexImageGenerationPrompt(input: {
  mode?: 'manual' | 'scene' | 'pinpoint' | 'camera';
  userPrompt: string;
  outputDirectory: string;
  manifestPath: string;
  imageCount: number;
  referenceImages: Array<{
    path: string;
    title?: string;
    description?: string;
  }>;
  pinPoint?: {
    point: {
      x: number;
      y: number;
    };
    extraPrompt?: string;
    hasCharacterReferences: boolean;
  };
  camera?: {
    rotationDeg: number;
    tiltDeg: number;
    zoom: number;
    generateBestAngles: boolean;
  };
}) {
  const mode = input.mode ?? 'manual';

  return [
    'You are running inside a Codex batch job for an Electron app.',
    'Use Codex image generation capabilities to create image files for the following prompt.',
    `Generation mode: ${mode}`,
    '',
    `Creative prompt: ${input.userPrompt}`,
    '',
    ...(input.referenceImages.length > 0
      ? [
          'Reference image files:',
          ...input.referenceImages.map((referenceImage) => {
            const metadata = [
              referenceImage.title ? `title: ${referenceImage.title}` : null,
              referenceImage.description ? `description: ${referenceImage.description}` : null,
            ].filter(Boolean);
            return metadata.length > 0
              ? `- ${referenceImage.path} (${metadata.join('; ')})`
              : `- ${referenceImage.path}`;
          }),
          'Analyze all attached reference images before generating anything.',
          'Decide the role of each reference image: exact edit target, scene anchor, subject anchor, style-only reference, or supporting mood/material reference.',
          'If one or more references define the exact scene or asset to continue, preserve and extend that scene instead of inventing a different one.',
          'If the references are only stylistic, material, or mood guidance, create a new asset that borrows those qualities without copying unrelated scene layout.',
          'Use those reference images as visual guidance for composition, subject, color, materials, and mood when relevant.',
          '',
        ]
      : []),
    ...(mode === 'scene'
      ? [
          `The user requested at least ${input.imageCount} image file(s). Never create fewer than that.`,
          'You may create more image files when useful, but never fewer.',
          'Decide whether the scene already has a strong anchor from the prompt or references, or whether you should create a canonical master scene first.',
          'If a master scene is useful, create it first and then derive additional views from it.',
          'If existing references already define the scene strongly, reuse them as the anchor instead of creating a new master image.',
          'Use the attached references to decide whether this is a continuation/edit of an existing scene or a fresh scene that only borrows style/material cues.',
          'Preserve environment identity, materials, layout, lighting direction, palette, and spatial continuity whenever the request calls for the same scene.',
          'Choose camera coverage yourself and hide explicit angle-selection logic from the final output behavior.',
          'If you choose a scene-coverage workflow, the final output must contain at least 4 image files total.',
          'Before generating final images, print exactly one single-line JSON object to stdout in this format:',
          '{"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}',
          'Set count to the total number of final image files you plan to create.',
          'Set applyToShimmers to true only when the UI should expand its loading shimmer placeholders to match count.',
          'If the UI should keep the original placeholder count, emit applyToShimmers as false.',
          '',
        ]
      : mode === 'pinpoint'
        ? [
            'Create exactly 1 final image file.',
            'Treat the first/source pinpoint reference as the primary scene anchor.',
            'Interpret the selected point as the target location to zoom into or edit around.',
            'Preserve the source image world, style, lighting, perspective, and continuity.',
            input.pinPoint?.hasCharacterReferences
              ? 'If character-sheet or subject references are attached, place or add that character naturally at the selected point while keeping the rest of the scene coherent.'
              : 'If no character-sheet references are attached, create a coherent zoom-in, continuation, or localized edit around the selected point.',
            input.pinPoint?.extraPrompt
              ? `Use this extra pinpoint guidance when useful: ${input.pinPoint.extraPrompt}`
              : 'There is no extra pinpoint guidance beyond the selected point and attached references.',
            '',
          ]
        : mode === 'camera'
          ? [
              `Create exactly ${input.imageCount} final image file${input.imageCount === 1 ? '' : 's'}.`,
              'Treat the first/source camera reference as the primary scene anchor.',
              'Move the camera around the subject or scene; do not rotate the subject like a flat sticker.',
              'Interpret rotation, tilt, and zoom as a physical 3D camera move around the scene, producing new perspective, parallax, occlusion, and visible side geometry.',
              'Synthesize a true novel camera view using the source image as an identity, geometry, material, and lighting anchor.',
              `Horizontal camera orbit/azimuth: ${input.camera?.rotationDeg ?? 0} degrees.`,
              `Vertical camera tilt/elevation: ${input.camera?.tiltDeg ?? 0} degrees.`,
              `Camera zoom/dolly value: ${input.camera?.zoom ?? 0}.`,
              'Treat zoom as camera dolly or field-of-view change, not as a flat crop or resize of the original pixels.',
              input.camera?.generateBestAngles
                ? 'Generate a deterministic 12-angle camera lattice across orbit and tilt: 0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°. Treat each pair as orbit degrees / tilt degrees. Favor views that remain plausible and identity-consistent.'
                : 'Generate one camera-adjusted image from the requested view.',
              'Preserve subject identity, proportions, wardrobe, materials, lighting direction, palette, and environment continuity.',
              'Keep the original source image aspect ratio, visual quality, resolution feel, and style.',
              'Use the original source canvas proportions exactly; do not crop, stretch, rescale, letterbox, or switch to a requested output ratio.',
              'Keep composition and framing as close as possible while changing only the requested camera perspective.',
              'Do not satisfy the request by cropping, panning a flat image, warping the canvas, or simply tilting the existing picture plane.',
              'Avoid stylistic re-rendering, quality downgrades, simplified detail, compression artifacts, or a different finish.',
              'Do not add angle labels, numbering, captions, watermarks, UI overlays, or any text into the generated pixels.',
              'For visible areas already present in the source, keep them materially consistent. For newly revealed areas, infer plausible geometry instead of redesigning the subject or scene.',
              'Prefer small, coherent perspective changes over dramatic reinvention when the requested rotation or tilt is modest.',
              'If the requested camera move is too large to know hidden geometry, make the unseen side plausible while keeping every visible identifier stable.',
              '',
            ]
        : [`Create exactly ${input.imageCount} image file(s).`]),
    `The output directory is: ${input.outputDirectory}`,
    `The manifest path is: ${input.manifestPath}`,
    '',
    'The manifest must have this shape:',
    '{',
    '  "images": [',
    '    { "path": "/absolute/path/to/generated-image.png" }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Generate image assets, not text descriptions.',
    '- Save every final image file inside the output directory.',
    '- If image generation creates files elsewhere first, copy them into the output directory before writing the manifest.',
    '- Use only absolute paths in the manifest.',
    '- Include every generated image in the manifest.',
    '- Write the manifest only after all image files exist on disk.',
    '- Do not execute shell scripts, package scripts, build scripts, test scripts, or project automation during this run.',
    '- Do not rely on prose output as the result contract.',
  ].join('\n');
}
