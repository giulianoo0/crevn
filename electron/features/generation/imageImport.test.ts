import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { importGeneratedImage } from './imageImport';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crenv-image-import-'));
  tempDirs.push(dir);
  return dir;
}

function writeTinyPng(filePath: string) {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
}

describe('importGeneratedImage', () => {
  it('copies a supported image into the persistent generated-images directory', async () => {
    const rootDir = makeTempDir();
    const sourcePath = path.join(rootDir, 'source.png');
    const targetDir = path.join(rootDir, 'generated-images');

    writeTinyPng(sourcePath);

    const imported = await importGeneratedImage({
      assetId: 'asset_123',
      sourcePath,
      generatedImagesDir: targetDir,
      createdAt: '2026-05-26T11:00:00.000Z',
    });

    expect(imported.fileName).toBe('asset_123.png');
    expect(imported.storedPath).toBe(path.join(targetDir, 'asset_123.png'));
    expect(fs.existsSync(imported.storedPath)).toBe(true);
    expect(imported.mimeType).toBe('image/png');
  });

  it('rejects unsupported file extensions', async () => {
    const rootDir = makeTempDir();
    const sourcePath = path.join(rootDir, 'source.txt');

    fs.writeFileSync(sourcePath, 'not an image');

    await expect(
      importGeneratedImage({
        assetId: 'asset_123',
        sourcePath,
        generatedImagesDir: path.join(rootDir, 'generated-images'),
        createdAt: '2026-05-26T11:00:00.000Z',
      })
    ).rejects.toThrow('Unsupported image type');
  });
});
