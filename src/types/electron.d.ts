interface ElectronGeneratedImageRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface ElectronGenerateImagesPayload {
  prompt: string;
  count: number;
}

interface Window {
  electronAPI?: {
    platform: string;
    listGeneratedImages: () => Promise<ElectronGeneratedImageRecord[]>;
    generateImages: (
      payload: ElectronGenerateImagesPayload
    ) => Promise<{ jobId: string; assets: ElectronGeneratedImageRecord[] }>;
  };
}
