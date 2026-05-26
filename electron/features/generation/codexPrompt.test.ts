import { describe, expect, it } from 'vitest';

import { buildCodexImageGenerationPrompt } from './codexPrompt';

describe('buildCodexImageGenerationPrompt', () => {
  it('includes the output directory, manifest path, and requested image count', () => {
    const prompt = buildCodexImageGenerationPrompt({
      userPrompt: 'three cinematic stills of a brutalist museum lobby',
      outputDirectory: '/tmp/crenv/job-1/output',
      manifestPath: '/tmp/crenv/job-1/manifest.json',
      imageCount: 3,
    });

    expect(prompt).toContain('/tmp/crenv/job-1/output');
    expect(prompt).toContain('/tmp/crenv/job-1/manifest.json');
    expect(prompt).toContain('exactly 3');
    expect(prompt).toContain('"images"');
  });
});
