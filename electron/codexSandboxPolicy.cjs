function shouldUseDangerFullAccessForAppServer(platform = process.platform) {
  return platform === 'win32';
}

function buildCodexThreadSandboxParams(platform = process.platform) {
  return shouldUseDangerFullAccessForAppServer(platform)
    ? { sandbox: 'danger-full-access' }
    : { sandbox: 'workspace-write' };
}

function buildCodexTurnSandboxParams(platform = process.platform) {
  return shouldUseDangerFullAccessForAppServer(platform)
    ? { sandboxPolicy: { type: 'dangerFullAccess' } }
    : { sandboxPolicy: { type: 'workspaceWrite' } };
}

module.exports = {
  buildCodexThreadSandboxParams,
  buildCodexTurnSandboxParams,
  shouldUseDangerFullAccessForAppServer,
};
