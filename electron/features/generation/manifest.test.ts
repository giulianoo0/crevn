import { describe, expect, it } from 'vitest';

import { parseGenerationManifest } from './manifest';

describe('parseGenerationManifest', () => {
  it('parses a manifest with multiple absolute image paths', () => {
    const parsed = parseGenerationManifest(
      JSON.stringify({
        images: [{ path: '/tmp/a.png' }, { path: '/tmp/b.webp' }],
      })
    );

    expect(parsed.images).toEqual([{ path: '/tmp/a.png' }, { path: '/tmp/b.webp' }]);
  });

  it('rejects a manifest without an images array', () => {
    expect(() => parseGenerationManifest(JSON.stringify({ files: [] }))).toThrow('images');
  });

  it('rejects relative paths', () => {
    expect(() =>
      parseGenerationManifest(
        JSON.stringify({
          images: [{ path: 'relative.png' }],
        })
      )
    ).toThrow('absolute');
  });

  it('rejects an empty images array', () => {
    expect(() => parseGenerationManifest(JSON.stringify({ images: [] }))).toThrow(
      'at least one'
    );
  });
});
