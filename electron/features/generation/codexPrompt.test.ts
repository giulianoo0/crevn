import { describe, expect, it } from 'vitest';

import { buildCodexImageGenerationPrompt } from './codexPrompt';

describe('buildCodexImageGenerationPrompt', () => {
  it('includes the output directory, manifest path, and requested image count', () => {
    const prompt = buildCodexImageGenerationPrompt({
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
    expect(prompt).toContain('copy them into the output directory');
  });

  it('includes staged reference image paths when provided', () => {
    const prompt = buildCodexImageGenerationPrompt({
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
    expect(prompt).toContain('Use those reference images as visual guidance');
  });
});
