import { describe, expect, it } from 'vitest';

import { buildCodexImageGenerationPrompt } from './codexPrompt';

describe('buildCodexImageGenerationPrompt', () => {
  it('includes the output directory, manifest path, and requested image count', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'manual',
      userPrompt: 'three cinematic stills of a brutalist museum lobby',
      outputDirectory: '/tmp/crenv/job-1/output',
      manifestPath: '/tmp/crenv/job-1/manifest.json',
      imageCount: 3,
      referenceImages: [],
    });

    expect(prompt).toContain('/tmp/crenv/job-1/output');
    expect(prompt).toContain('/tmp/crenv/job-1/manifest.json');
    expect(prompt).toContain('exactly 3');
    expect(prompt).toContain('"images"');
    expect(prompt).toContain('Use Codex image generation capabilities');
    expect(prompt).toContain('Use only the Imagen app workflow instructions provided in this batch job prompt.');
    expect(prompt).toContain('Do not load, invoke, or rely on any global, shared, system, or unrelated local skill.');
    expect(prompt).toContain('Do not use cinematic-angles, transitions-dev');
    expect(prompt).toContain('copy them into the output directory');
  });

  it('includes staged reference image paths when provided', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'manual',
      userPrompt: 'match the lighting and composition of the reference',
      outputDirectory: '/tmp/crenv/job-2/output',
      manifestPath: '/tmp/crenv/job-2/manifest.json',
      imageCount: 1,
      referenceImages: [
        {
          path: '/tmp/crenv/job-2/references/ref-1.png',
          title: 'Lighting guide',
          description: 'Preserve the directional key light.',
        },
      ],
    });

    expect(prompt).toContain('Reference image files:');
    expect(prompt).toContain('/tmp/crenv/job-2/references/ref-1.png');
    expect(prompt).toContain('title: Lighting guide');
    expect(prompt).toContain('description: Preserve the directional key light.');
    expect(prompt).toContain('Analyze all attached reference images before generating anything.');
    expect(prompt).toContain('Decide the role of each reference image');
    expect(prompt).toContain('Use those reference images as visual guidance');
  });

  it('includes the scene-mode planning contract when scene mode is requested', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'scene',
      userPrompt: 'same futuristic transit terminal from multiple viewpoints',
      outputDirectory: '/tmp/crenv/job-3/output',
      manifestPath: '/tmp/crenv/job-3/manifest.json',
      imageCount: 2,
      referenceImages: [],
    });

    expect(prompt).toContain('Generation mode: scene');
    expect(prompt).toContain('Never create fewer than that.');
    expect(prompt).toContain('{"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}');
    expect(prompt).toContain('Set applyToShimmers to true only when the UI should expand its loading shimmer placeholders to match count.');
    expect(prompt).toContain('at least 4 image files total');
    expect(prompt).toContain('This guidance can be relaxed when needed, but in general tend toward more scenes, frames, and beats rather than fewer');
    expect(prompt).toContain('4 clear beats max');
    expect(prompt).toContain('show the beat count for each scene');
    expect(prompt).toContain('A frame or shot in image generation is a single image');
    expect(prompt).toContain('A beat should usually be represented by one image, because it is one action.');
    expect(prompt).toContain('Beat is a story unit and frame is an image unit');
    expect(prompt).toContain('One beat can expand into multiple frames');
    expect(prompt).toContain('If an environment reference contains multiple images, pick the single attachment that best suits the current frame and do not pass the whole group to the imagen-action unless the full set is genuinely required');
    expect(prompt).toContain('Use the Imagen toolkit to generate the reference images that make a later Seedance plan possible; do not try to generate Seedance itself here.');
  });

  it('includes the pinpoint contract when pinpoint mode is requested', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'pinpoint',
      userPrompt: 'Pin Point source image: RefImage1\nPin Point extra prompt: Place the character naturally near the shoreline.',
      outputDirectory: '/tmp/crenv/job-4/output',
      manifestPath: '/tmp/crenv/job-4/manifest.json',
      imageCount: 1,
      referenceImages: [
        {
          path: '/tmp/crenv/job-4/references/source.png',
          title: 'RefImage1',
          description: 'Primary pinpoint source image. Selected point x=0.25, y=0.4.',
        },
        {
          path: '/tmp/crenv/job-4/references/character-sheet.png',
          title: 'RefImage2',
          description: 'Character sheet reference for insertion at the selected point.',
        },
      ],
      pinPoint: {
        point: { x: 0.25, y: 0.4 },
        extraPrompt: 'Place the character naturally near the shoreline.',
        hasCharacterReferences: true,
      },
    });

    expect(prompt).toContain('Generation mode: pinpoint');
    expect(prompt).toContain('Create exactly 1 final image file.');
    expect(prompt).toContain('Treat the first/source pinpoint reference as the primary scene anchor.');
    expect(prompt).toContain('Interpret the selected point as the target location to zoom into or edit around.');
    expect(prompt).toContain('If character-sheet or subject references are attached');
    expect(prompt).toContain('Preserve the source image world, style, lighting, perspective, and continuity.');
  });

  it('includes the camera-orbit contract when camera mode is requested', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'camera',
      userPrompt: [
        'Camera source image: RefImage1',
        'Camera rotation: 38°',
        'Camera tilt: -12°',
        'Camera zoom: 0.35',
      ].join('\n'),
      outputDirectory: '/tmp/crenv/job-5/output',
      manifestPath: '/tmp/crenv/job-5/manifest.json',
      imageCount: 1,
      referenceImages: [
        {
          path: '/tmp/crenv/job-5/references/source.png',
          title: 'RefImage1',
          description: 'Primary camera source image. Preserve identity and synthesize a new camera view.',
        },
      ],
      camera: {
        rotationDeg: 38,
        tiltDeg: -12,
        zoom: 0.35,
        generateBestAngles: false,
      },
    });

    expect(prompt).toContain('Generation mode: camera');
    expect(prompt).toContain('Create exactly 1 final image file.');
    expect(prompt).toContain('Treat the first/source camera reference as the primary scene anchor.');
    expect(prompt).toContain('Move the camera around the subject or scene; do not rotate the subject like a flat sticker.');
    expect(prompt).toContain('Interpret rotation, tilt, and zoom as a physical 3D camera move around the scene, producing new perspective, parallax, occlusion, and visible side geometry.');
    expect(prompt).toContain('Horizontal camera orbit/azimuth: 38 degrees.');
    expect(prompt).toContain('Vertical camera tilt/elevation: -12 degrees.');
    expect(prompt).toContain('Camera zoom/dolly value: 0.35.');
    expect(prompt).toContain('Treat zoom as camera dolly or field-of-view change, not as a flat crop or resize of the original pixels.');
    expect(prompt).toContain('Preserve subject identity, proportions, wardrobe, materials, lighting direction, palette, and environment continuity.');
    expect(prompt).toContain('Keep the original source image aspect ratio, visual quality, resolution feel, and style.');
    expect(prompt).toContain('Keep composition and framing as close as possible while changing only the requested camera perspective.');
    expect(prompt).toContain('Do not satisfy the request by cropping, panning a flat image, warping the canvas, or simply tilting the existing picture plane.');
    expect(prompt).toContain('Do not add angle labels, numbering, captions, watermarks, UI overlays, or any text into the generated pixels.');
    expect(prompt).toContain('Do not execute shell scripts, package scripts, build scripts, test scripts, or project automation during this run.');
  });

  it('defines the 12-angle camera sweep when camera best-angle generation is enabled', () => {
    const prompt = buildCodexImageGenerationPrompt({
      mode: 'camera',
      userPrompt: 'Camera source image: RefImage1',
      outputDirectory: '/tmp/crenv/job-6/output',
      manifestPath: '/tmp/crenv/job-6/manifest.json',
      imageCount: 12,
      referenceImages: [],
      camera: {
        rotationDeg: 90,
        tiltDeg: 0,
        zoom: 0,
        generateBestAngles: true,
      },
    });

    expect(prompt).toContain('Generate a deterministic 12-angle camera lattice across orbit and tilt');
    expect(prompt).toContain('0°/0°, 45°/-30°, 45°/30°, 90°/0°, 135°/-30°, 135°/30°, 180°/0°, 225°/-30°, 225°/30°, 270°/0°, 315°/-30°, and 315°/30°');
  });
});
