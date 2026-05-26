#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");

const electronPackagePath = require.resolve("electron/package.json");
const electronDir = path.dirname(electronPackagePath);
const electronRequire = createRequire(path.join(electronDir, "install.js"));
const { version } = require(electronPackagePath);

const platformPath = getPlatformPath();
const distDir = process.env.ELECTRON_OVERRIDE_DIST_PATH || path.join(electronDir, "dist");
const executablePath = path.join(distDir, platformPath);
const pathTxtPath = path.join(electronDir, "path.txt");
const versionPath = path.join(distDir, "version");

main().catch((error) => {
  console.error("[ensure-electron] Failed to install Electron binary.");
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

async function main() {
  if (isElectronInstalled()) {
    return;
  }

  await runElectronInstaller();

  if (!isElectronInstalled()) {
    await installFromOfficialArtifact();
  }

  if (!isElectronInstalled()) {
    throw new Error(`Electron ${version} is still incomplete at ${electronDir}`);
  }
}

async function runElectronInstaller() {
  const installer = path.join(electronDir, "install.js");
  const result = childProcess.spawnSync(process.execPath, [installer], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Electron installer exited with status ${result.status}`);
  }
}

async function installFromOfficialArtifact() {
  const { downloadArtifact } = electronRequire("@electron/get");
  const checksums = require(path.join(electronDir, "checksums.json"));
  const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
  const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;

  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    force: process.env.force_no_cache === "true",
    cacheRoot: process.env.electron_config_cache,
    checksums:
      process.env.electron_use_remote_checksums || process.env.npm_config_electron_use_remote_checksums
        ? undefined
        : checksums,
    platform,
    arch,
  });

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const unzip = childProcess.spawnSync("unzip", ["-oq", zipPath, "-d", distDir], {
    stdio: "inherit",
  });

  if (unzip.error) {
    throw unzip.error;
  }

  if (unzip.status !== 0) {
    throw new Error(`unzip exited with status ${unzip.status}`);
  }

  const typeDefPath = path.join(distDir, "electron.d.ts");
  if (fs.existsSync(typeDefPath)) {
    fs.renameSync(typeDefPath, path.join(electronDir, "electron.d.ts"));
  }

  fs.writeFileSync(pathTxtPath, platformPath);
}

function isElectronInstalled() {
  try {
    const installedVersion = fs.readFileSync(versionPath, "utf8").replace(/^v/, "");
    const installedPath = fs.readFileSync(pathTxtPath, "utf8");

    return installedVersion === version && installedPath === platformPath && fs.existsSync(executablePath);
  } catch {
    return false;
  }
}

function getPlatformPath() {
  const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || os.platform();

  switch (platform) {
    case "mas":
    case "darwin":
      return "Electron.app/Contents/MacOS/Electron";
    case "freebsd":
    case "openbsd":
    case "linux":
      return "electron";
    case "win32":
      return "electron.exe";
    default:
      throw new Error(`Electron builds are not available on platform: ${platform}`);
  }
}
