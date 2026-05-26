export interface GenerateImagesInput {
  prompt: string;
  count: number;
}

export interface ParsedGenerationManifest {
  images: Array<{ path: string }>;
}

export interface ImportedGeneratedImage {
  fileName: string;
  storedPath: string;
  mimeType: string;
  createdAt: string;
}
