import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createAutoUpdateManager, normalizePercent } = require('./autoUpdate.cjs');

class FakeUpdater extends EventEmitter {
  autoDownload = false;
  autoInstallOnAppQuit = false;
  logger = null;
  checkForUpdatesAndNotify = vi.fn(async () => ({ ok: true }));
  quitAndInstall = vi.fn();
}

function createFakeWindow() {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
  };
}

describe('auto update manager', () => {
  it('skips automatic checks outside packaged builds', () => {
    const updater = new FakeUpdater();
    const window = createFakeWindow();
    const manager = createAutoUpdateManager({
      app: { isPackaged: false },
      autoUpdater: updater,
      getWindow: () => window,
      checkDelayMs: 0,
    });

    expect(manager.start()).toEqual({ started: false, reason: 'not_packaged' });
    expect(updater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
    expect(manager.getStatus()).toMatchObject({
      state: 'disabled',
      message: 'Auto updates are disabled outside packaged builds.',
    });
    expect(window.webContents.send).toHaveBeenCalledWith(
      'app:updateStatus',
      expect.objectContaining({ state: 'disabled' })
    );
  });

  it('registers updater events and forwards status to the current window', () => {
    const updater = new FakeUpdater();
    const window = createFakeWindow();
    const manager = createAutoUpdateManager({
      app: { isPackaged: true },
      autoUpdater: updater,
      getWindow: () => window,
      checkDelayMs: 1000,
    });

    expect(manager.start()).toEqual({ started: true });
    updater.emit('update-available', { version: '0.1.4' });
    updater.emit('download-progress', { percent: 42.25 });
    updater.emit('update-downloaded', { version: '0.1.4' });

    expect(window.webContents.send).toHaveBeenLastCalledWith(
      'app:updateStatus',
      expect.objectContaining({
        state: 'downloaded',
        version: '0.1.4',
        percent: 100,
      })
    );
    expect(manager.getStatus()).toMatchObject({
      state: 'downloaded',
      version: '0.1.4',
      percent: 100,
    });

    manager.dispose();
  });

  it('only installs after an update has downloaded', () => {
    const updater = new FakeUpdater();
    const manager = createAutoUpdateManager({
      app: { isPackaged: true },
      autoUpdater: updater,
      getWindow: () => null,
    });

    manager.installNow();
    expect(updater.quitAndInstall).not.toHaveBeenCalled();

    manager.start();
    updater.emit('update-downloaded', { version: '0.1.4' });
    manager.installNow();

    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
    expect(manager.getStatus()).toMatchObject({ state: 'installing' });

    manager.dispose();
  });

  it('clamps download percentages', () => {
    expect(normalizePercent(-10)).toBe(0);
    expect(normalizePercent(50.5)).toBe(50.5);
    expect(normalizePercent(110)).toBe(100);
    expect(normalizePercent('not-a-number')).toBeNull();
  });
});
