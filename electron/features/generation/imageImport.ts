import fs from 'node:fs/promises';
import path from 'node:path';

import type { ImportedGeneratedImage } from './generationTypes';

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function importGeneratedImage(input: {
  assetId: string;
  sourcePath: string;
  generatedImagesDir: string;
  createdAt: string;
}): Promise<ImportedGeneratedImage> {
  const extension = path.extname(input.sourcePath).toLowerCase();
  const mimeType = MIME_TYPES_BY_EXTENSION[extension];

  if (!mimeType) {
    throw new Error(`Unsupported image type: ${extension || 'unknown'}`);
  }

  const sourceStat = await fs.stat(input.sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error('Generated image path must point to a file.');
  }

  await fs.mkdir(input.generatedImagesDir, { recursive: true });

  const fileName = `${input.assetId}${extension}`;
  const storedPath = path.join(input.generatedImagesDir, fileName);

  await fs.copyFile(input.sourcePath, storedPath);

  return {
    fileName,
    storedPath,
    mimeType,
    createdAt: input.createdAt,
  };
}
