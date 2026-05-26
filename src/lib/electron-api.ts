import type { GeneratedImageGridImage } from '@/components/generated-image-grid';

export interface GenerateImagesPayload {
  prompt: string;
  count: number;
}

export interface GeneratedImageRecord extends GeneratedImageGridImage {
  createdAt: string;
}

function getElectronApi() {
  if (!window.electronAPI) {
    return {
      listGeneratedImages: async () => [],
      generateImages: async () => {
        throw new Error('Electron API bridge is unavailable.');
      },
    };
  }

  return window.electronAPI;
}

export function listGeneratedImages() {
  return getElectronApi().listGeneratedImages() as Promise<GeneratedImageRecord[]>;
}

export function generateImages(payload: GenerateImagesPayload) {
  return getElectronApi().generateImages(payload) as Promise<{
    jobId: string;
    assets: GeneratedImageRecord[];
  }>;
}
