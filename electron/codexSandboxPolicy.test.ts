import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildCodexThreadSandboxParams,
  buildCodexTurnSandboxParams,
} = require('./codexSandboxPolicy.cjs');

describe('Codex app-server sandbox policy', () => {
  it('uses workspace-write on non-Windows platforms', () => {
    expect(buildCodexThreadSandboxParams('linux')).toEqual({ sandbox: 'workspace-write' });
    expect(buildCodexTurnSandboxParams('linux')).toEqual({ sandboxPolicy: { type: 'workspaceWrite' } });
  });

  it('disables the app-server sandbox on Windows because command execution cannot spawn inside it', () => {
    expect(buildCodexThreadSandboxParams('win32')).toEqual({ sandbox: 'danger-full-access' });
    expect(buildCodexTurnSandboxParams('win32')).toEqual({ sandboxPolicy: { type: 'dangerFullAccess' } });
  });
});
