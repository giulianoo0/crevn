const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createSessionId(now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `crevn-${timestamp}-${process.pid}`;
}

function serializeLogPart(part) {
  if (part instanceof Error) {
    return part.stack || `${part.name}: ${part.message}`;
  }

  if (typeof part === 'string') {
    return part;
  }

  try {
    return JSON.stringify(part);
  } catch {
    return String(part);
  }
}

function createAppLogger(options = {}) {
  const tempDir = options.tempDir || os.tmpdir();
  const now = options.now || (() => new Date());
  const sessionId = options.sessionId || createSessionId(now());
  const logDirectory = path.join(tempDir, 'crenv', 'logs');
  const logFilePath = path.join(logDirectory, `${sessionId}.log`);

  fs.mkdirSync(logDirectory, { recursive: true });

  function write(level, parts) {
    const message = parts.map(serializeLogPart).join(' ');
    try {
      fs.appendFileSync(logFilePath, `[${now().toISOString()}] [${level}] ${message}\n`, 'utf8');
    } catch {
      // Logging must never become the reason the app fails.
    }
  }

  return {
    logDirectory,
    logFilePath,
    info: (...parts) => write('info', parts),
    warn: (...parts) => write('warn', parts),
    error: (...parts) => write('error', parts),
  };
}

function installConsoleFileLogger(logger) {
  const original = {
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  console.info = (...parts) => {
    logger.info(...parts);
    original.info(...parts);
  };
  console.warn = (...parts) => {
    logger.warn(...parts);
    original.warn(...parts);
  };
  console.error = (...parts) => {
    logger.error(...parts);
    original.error(...parts);
  };

  return () => {
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  };
}

module.exports = {
  createAppLogger,
  installConsoleFileLogger,
};
