export interface ReferenceImageInput {
  name: string;
  title?: string;
  description?: string;
  mimeType: string;
  bytesBase64: string;
}

export interface GenerateImagesInput {
  prompt: string;
  count: number;
  threadId: string;
  referenceImages: ReferenceImageInput[];
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
