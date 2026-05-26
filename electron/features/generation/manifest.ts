import path from 'node:path';

import type { ParsedGenerationManifest } from './generationTypes';

export function parseGenerationManifest(manifestContent: string): ParsedGenerationManifest {
  const parsed = JSON.parse(manifestContent) as { images?: Array<{ path?: unknown }> };

  if (!Array.isArray(parsed.images)) {
    throw new Error('Manifest must include an images array.');
  }

  if (parsed.images.length === 0) {
    throw new Error('Manifest must include at least one generated image.');
  }

  const images = parsed.images.map((entry) => {
    if (typeof entry.path !== 'string' || entry.path.trim().length === 0) {
      throw new Error('Manifest image entries must include a path string.');
    }

    if (!path.isAbsolute(entry.path)) {
      throw new Error('Manifest image paths must be absolute.');
    }

    return { path: entry.path };
  });

  return { images };
}
