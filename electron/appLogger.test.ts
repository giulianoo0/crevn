import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { createAppLogger, installConsoleFileLogger } = require('./appLogger.cjs');

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crenv-logger-test-'));
  tempDirs.push(dir);
  return dir;
}

describe('createAppLogger', () => {
  it('writes session logs under the user temp directory', () => {
    const tempDir = makeTempDir();
    const logger = createAppLogger({
      tempDir,
      now: () => new Date('2026-06-05T13:00:00.000Z'),
      sessionId: 'session-1',
    });

    logger.info('app started', { mode: 'test' });
    logger.error('startup failed', new Error('missing dependency'));

    expect(logger.logDirectory).toBe(path.join(tempDir, 'crenv', 'logs'));
    expect(logger.logFilePath).toBe(path.join(tempDir, 'crenv', 'logs', 'session-1.log'));

    const logText = fs.readFileSync(logger.logFilePath, 'utf8');
    expect(logText).toContain('[2026-06-05T13:00:00.000Z] [info] app started {"mode":"test"}');
    expect(logText).toContain('[2026-06-05T13:00:00.000Z] [error] startup failed Error: missing dependency');
  });
});

describe('installConsoleFileLogger', () => {
  it('mirrors console output into the app log and can restore the original console methods', () => {
    const tempDir = makeTempDir();
    const logger = createAppLogger({
      tempDir,
      now: () => new Date('2026-06-05T13:05:00.000Z'),
      sessionId: 'console-session',
    });
    const originalInfo = console.info;
    const infoSpy = vi.fn();
    console.info = infoSpy;

    const restore = installConsoleFileLogger(logger);
    console.info('renderer ready', { windowId: 1 });
    restore();
    console.info('after restore');

    expect(infoSpy).toHaveBeenCalledWith('renderer ready', { windowId: 1 });
    expect(infoSpy).toHaveBeenCalledWith('after restore');

    const logText = fs.readFileSync(logger.logFilePath, 'utf8');
    expect(logText).toContain('[2026-06-05T13:05:00.000Z] [info] renderer ready {"windowId":1}');
    expect(logText).not.toContain('after restore');

    console.info = originalInfo;
  });
});
