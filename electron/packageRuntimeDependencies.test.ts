import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

describe('Electron runtime package dependencies', () => {
  it('declares ms directly so Windows packages include debug runtime support', () => {
    expect(packageJson.dependencies?.ms).toBeDefined();
  });
});
