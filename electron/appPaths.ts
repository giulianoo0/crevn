import path from 'node:path';

export interface AppDataPaths {
  userDataDir: string;
  databasePath: string;
  generatedImagesDir: string;
  generationJobsTempDir: string;
}

export function getAppDataPaths(userDataDir: string): AppDataPaths {
  return {
    userDataDir,
    databasePath: path.join(userDataDir, 'crenv.sqlite'),
    generatedImagesDir: path.join(userDataDir, 'generated-images'),
    generationJobsTempDir: path.join(userDataDir, 'tmp', 'generation-jobs'),
  };
}
