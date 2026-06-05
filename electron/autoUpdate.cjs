const UPDATE_STATUS_CHANNEL = 'app:updateStatus';

const INITIAL_STATUS = {
  state: 'idle',
  message: 'Updates have not been checked yet.',
  version: null,
  percent: null,
  errorMessage: null,
};

function createAutoUpdateManager({
  app,
  autoUpdater,
  getWindow,
  logger = console,
  checkDelayMs = 5000,
} = {}) {
  if (!app) {
    throw new Error('Auto update manager requires an Electron app instance.');
  }
  if (!autoUpdater) {
    throw new Error('Auto update manager requires an autoUpdater instance.');
  }

  let status = { ...INITIAL_STATUS };
  let updateDownloaded = false;
  let startTimer = null;
  let hasRegisteredEvents = false;

  function emit(nextStatus) {
    status = {
      ...status,
      ...nextStatus,
    };

    const window = getWindow?.();
    if (window && !window.isDestroyed?.()) {
      window.webContents?.send?.(UPDATE_STATUS_CHANNEL, status);
    }

    return status;
  }

  function registerEvents() {
    if (hasRegisteredEvents) {
      return;
    }
    hasRegisteredEvents = true;

    autoUpdater.on('checking-for-update', () => {
      emit({
        state: 'checking',
        message: 'Checking for updates.',
        percent: null,
        errorMessage: null,
      });
    });

    autoUpdater.on('update-available', (info = {}) => {
      emit({
        state: 'available',
        message: 'Update available. Downloading in the background.',
        version: info.version ?? null,
        percent: null,
        errorMessage: null,
      });
    });

    autoUpdater.on('update-not-available', (info = {}) => {
      emit({
        state: 'not_available',
        message: 'No updates available.',
        version: info.version ?? null,
        percent: null,
        errorMessage: null,
      });
    });

    autoUpdater.on('download-progress', (progress = {}) => {
      emit({
        state: 'downloading',
        message: 'Downloading update.',
        percent: normalizePercent(progress.percent),
        errorMessage: null,
      });
    });

    autoUpdater.on('update-downloaded', (info = {}) => {
      updateDownloaded = true;
      emit({
        state: 'downloaded',
        message: 'Update downloaded. It will install when the app quits.',
        version: info.version ?? null,
        percent: 100,
        errorMessage: null,
      });
    });

    autoUpdater.on('error', (error) => {
      logger.error?.('[crenv:auto-update] error', error);
      emit({
        state: 'error',
        message: 'Update check failed.',
        percent: null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    });
  }

  function configure() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    if (!autoUpdater.logger) {
      autoUpdater.logger = logger;
    }
  }

  async function runCheck() {
    registerEvents();
    configure();
    logger.info?.('[crenv:auto-update] checking for updates');
    return autoUpdater.checkForUpdatesAndNotify();
  }

  function start() {
    registerEvents();

    if (!app.isPackaged) {
      logger.info?.('[crenv:auto-update] skipped: app is not packaged');
      emit({
        state: 'disabled',
        message: 'Auto updates are disabled outside packaged builds.',
      });
      return { started: false, reason: 'not_packaged' };
    }

    if (process.env.CRENV_DISABLE_AUTO_UPDATE === '1') {
      logger.info?.('[crenv:auto-update] skipped: disabled by environment');
      emit({
        state: 'disabled',
        message: 'Auto updates are disabled by environment.',
      });
      return { started: false, reason: 'disabled_by_environment' };
    }

    configure();
    startTimer = setTimeout(() => {
      void runCheck().catch((error) => {
        logger.error?.('[crenv:auto-update] check failed', error);
        emit({
          state: 'error',
          message: 'Update check failed.',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });
    }, checkDelayMs);

    return { started: true };
  }

  async function checkNow() {
    if (!app.isPackaged) {
      return emit({
        state: 'disabled',
        message: 'Auto updates are disabled outside packaged builds.',
      });
    }

    await runCheck();
    return status;
  }

  function installNow() {
    if (!updateDownloaded) {
      return emit({
        message: 'No downloaded update is ready to install.',
      });
    }

    autoUpdater.quitAndInstall(false, true);
    return emit({
      state: 'installing',
      message: 'Installing update.',
    });
  }

  function getStatus() {
    return status;
  }

  function dispose() {
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
  }

  return {
    start,
    checkNow,
    installNow,
    getStatus,
    dispose,
  };
}

function normalizePercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.max(0, Math.min(100, numericValue));
}

module.exports = {
  UPDATE_STATUS_CHANNEL,
  createAutoUpdateManager,
  normalizePercent,
};
