export interface ReferenceImageInput {
  name: string;
  title?: string;
  description?: string;
  mimeType: string;
  bytesBase64: string;
}

export interface GenerateImagesInput {
  clientRunId?: string;
  fastMode?: boolean;
  provider?: string;
  modelId?: string;
  mode?: 'manual' | 'scene' | 'pinpoint' | 'camera';
  prompt: string;
  count: number;
  threadId: string;
  referenceImages: ReferenceImageInput[];
  pinPoint?: {
    point: {
      x: number;
      y: number;
    };
    extraPrompt?: string;
    hasCharacterReferences: boolean;
  };
  camera?: {
    rotationDeg: number;
    tiltDeg: number;
    zoom: number;
    generateBestAngles: boolean;
  };
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
