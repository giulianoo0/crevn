import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { getAppDataPaths } from './appPaths';

describe('getAppDataPaths', () => {
  it('resolves persistent database, images, and temp job directories under the user data root', () => {
    const userDataDir = '/tmp/crenv-user-data';

    const paths = getAppDataPaths(userDataDir);

    expect(paths.userDataDir).toBe(userDataDir);
    expect(paths.databasePath).toBe(path.join(userDataDir, 'crenv.sqlite'));
    expect(paths.generatedImagesDir).toBe(path.join(userDataDir, 'generated-images'));
    expect(paths.generationJobsTempDir).toBe(path.join(userDataDir, 'tmp', 'generation-jobs'));
  });
});
