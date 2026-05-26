import path from 'node:path';

export interface AppDataPaths {
  userDataDir: string;
  databasePath: string;
  generatedImagesDir: string;
  codexJobsTempDir: string;
}

export function getAppDataPaths(userDataDir: string): AppDataPaths {
  return {
    userDataDir,
    databasePath: path.join(userDataDir, 'crenv.sqlite'),
    generatedImagesDir: path.join(userDataDir, 'generated-images'),
    codexJobsTempDir: path.join(userDataDir, 'tmp', 'codex-jobs'),
  };
}
