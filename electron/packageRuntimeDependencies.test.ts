import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const electronBuilderConfig = fs.readFileSync(path.resolve('electron-builder.yml'), 'utf8');

describe('Electron runtime package dependencies', () => {
  it('declares ms directly so Windows packages include debug runtime support', () => {
    expect(packageJson.dependencies?.ms).toBeDefined();
  });

  it('uses a URL-safe Windows installer artifact name that matches updater metadata', () => {
    expect(electronBuilderConfig).toContain('artifactName: ${productName}-Setup-${version}.${ext}');
  });
});
