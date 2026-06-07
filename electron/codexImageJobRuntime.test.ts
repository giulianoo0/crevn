import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  discoverCrenvImageReadyEvents,
  parseCrenvImageReadyLine,
  validateCrenvImageReadyEvent,
  buildCrenvImageReadyPromptContract,
  buildCodexTurnInputItems,
  runCodexImageAppServerJob,
} = require('./codexImageJobRuntime.cjs');

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

async function makeTempOutputDirectory() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-image-runtime-'));
  tempDirs.push(root);
  return path.join(root, 'output');
}

function tinyPngBase64() {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';
}

class FakeAppServerClient {
  events = new EventEmitter();
  start = vi.fn(async () => undefined);
  startThread = vi.fn(async () => ({ thread: { id: 'provider-thread-1' } }));
  startTurn = vi.fn(async () => ({ turn: { id: 'turn-1' } }));
  interruptTurn = vi.fn(async () => ({}));

  onNotification(listener: (message: unknown) => void) {
    this.events.on('notification', listener);
    return () => this.events.off('notification', listener);
  }

  notify(message: unknown) {
    this.events.emit('notification', message);
  }
}

describe('Codex image job ready events', () => {
  it('parses a single CRENV_IMAGE_READY line', () => {
    const event = parseCrenvImageReadyLine(
      'CRENV_IMAGE_READY {"schema":"crenv.image.ready.v1","jobId":"job-1","imageId":"img-1","outputIndex":0,"path":"output/ready/000.png","role":"master_wide","reviewStatus":"accepted","width":1536,"height":1024}'
    );

    expect(event).toEqual({
      schema: 'crenv.image.ready.v1',
      jobId: 'job-1',
      imageId: 'img-1',
      outputIndex: 0,
      path: 'output/ready/000.png',
      role: 'master_wide',
      reviewStatus: 'accepted',
      width: 1536,
      height: 1024,
    });
  });

  it('rejects non-ready lines and invalid JSON', () => {
    expect(parseCrenvImageReadyLine('plain output')).toBeNull();
    expect(parseCrenvImageReadyLine('CRENV_IMAGE_READY {bad')).toBeNull();
  });

  it('validates ready events before import', () => {
    const validation = validateCrenvImageReadyEvent(
      {
        schema: 'crenv.image.ready.v1',
        jobId: 'job-1',
        imageId: 'img-1',
        outputIndex: 0,
        path: 'output/ready/000.png',
        reviewStatus: 'accepted',
      },
      {
        jobId: 'job-1',
        outputDirectory: '/tmp/job/output',
      }
    );

    expect(validation).toEqual({
      ok: true,
      absolutePath: '/tmp/job/output/ready/000.png',
    });
  });

  it('accepts fallback events discovered from ready image files', () => {
    const validation = validateCrenvImageReadyEvent(
      {
        schema: 'crenv.image.ready.v1',
        jobId: null,
        imageId: '000',
        outputIndex: 0,
        path: 'output\\ready\\000.png',
        reviewStatus: 'accepted',
      },
      {
        jobId: 'job-1',
        outputDirectory: '/tmp/job/output',
      }
    );

    expect(validation).toEqual({
      ok: true,
      absolutePath: '/tmp/job/output/ready/000.png',
    });
  });

  it('rejects wrong job ids, rejected images, and path traversal', () => {
    const context = { jobId: 'job-1', outputDirectory: '/tmp/job/output' };

    expect(
      validateCrenvImageReadyEvent(
        {
          schema: 'crenv.image.ready.v1',
          jobId: 'other-job',
          imageId: 'img-1',
          outputIndex: 0,
          path: 'output/ready/000.png',
          reviewStatus: 'accepted',
        },
        context
      )
    ).toMatchObject({ ok: false });
    expect(
      validateCrenvImageReadyEvent(
        {
          schema: 'crenv.image.ready.v1',
          jobId: 'job-1',
          imageId: 'img-1',
          outputIndex: 0,
          path: 'output/ready/000.png',
          reviewStatus: 'rejected',
        },
        context
      )
    ).toMatchObject({ ok: false });
    expect(
      validateCrenvImageReadyEvent(
        {
          schema: 'crenv.image.ready.v1',
          jobId: 'job-1',
          imageId: 'img-1',
          outputIndex: 0,
          path: '../outside.png',
          reviewStatus: 'accepted',
        },
        context
      )
    ).toMatchObject({ ok: false });
  });

  it('builds a prompt contract without requiring a final manifest', () => {
    const contract = buildCrenvImageReadyPromptContract({
      jobId: 'job-1',
      outputDirectory: '/tmp/job/output',
      requestedCount: 3,
    });

    expect(contract).toContain('CRENV_IMAGE_READY');
    expect(contract).toContain('output/tmp');
    expect(contract).toContain('output/ready');
    expect(contract).toContain('events.jsonl');
    expect(contract).toContain('relative forward-slash path');
    expect(contract).toContain('No final manifest is required.');
  });

  it('builds Codex turn input with local image reference items', () => {
    const input = buildCodexTurnInputItems({
      prompt: 'Generate the frame.',
      referenceImages: [
        { path: '/tmp/job/references/tito.png', title: 'Tito', description: 'Character sheet' },
        { path: '', title: 'Broken ref' },
      ],
    });

    expect(input).toEqual([
      { type: 'text', text: 'Generate the frame.' },
      { type: 'localImage', path: '/tmp/job/references/tito.png', detail: 'high' },
    ]);
  });

  it('discovers ready image files when sidecar events are missing or malformed', async () => {
    const outputDirectory = await makeTempOutputDirectory();
    const readyDirectory = path.join(outputDirectory, 'ready');
    await fsp.mkdir(readyDirectory, { recursive: true });
    await fsp.writeFile(path.join(readyDirectory, '000.png'), 'fake image bytes');
    await fsp.writeFile(path.join(readyDirectory, '000.json'), '{"schema":"crenv.image.ready.v1",bad');

    const events = await discoverCrenvImageReadyEvents(outputDirectory);

    expect(events).toEqual([
      {
        schema: 'crenv.image.ready.v1',
        jobId: null,
        imageId: '000',
        outputIndex: 0,
        path: 'output/ready/000.png',
        reviewStatus: 'accepted',
      },
    ]);
  });

  it('accepts a ready event emitted only in a completed assistant item', async () => {
    const client = new FakeAppServerClient();
    const outputDirectory = await makeTempOutputDirectory();
    const readyDirectory = path.join(outputDirectory, 'ready');
    const imagePath = path.join(readyDirectory, '000.png');
    await fsp.mkdir(readyDirectory, { recursive: true });

    const onImageReady = vi.fn(async () => undefined);
    const runPromise = runCodexImageAppServerJob({
      client,
      jobId: 'job-1',
      workingDirectory: path.dirname(outputDirectory),
      outputDirectory,
      prompt: 'Generate one image.',
      requestedCount: 1,
      fastMode: false,
      model: 'gpt-5.4-mini',
      onImageReady,
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());

    client.notify({
      method: 'item/completed',
      params: {
        threadId: 'provider-thread-1',
        turnId: 'turn-1',
        item: {
          id: 'item-1',
          type: 'agentMessage',
          text: 'CRENV_IMAGE_READY {"schema":"crenv.image.ready.v1","jobId":"job-1","imageId":"img-1","outputIndex":0,"path":"output/ready/000.png","reviewStatus":"accepted"}',
        },
      },
    });
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'provider-thread-1',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: true,
      canceled: false,
      providerThreadId: 'provider-thread-1',
      providerTurnId: 'turn-1',
      importedCount: 1,
    });
    expect(onImageReady).toHaveBeenCalledWith({
      event: {
        schema: 'crenv.image.ready.v1',
        jobId: 'job-1',
        imageId: 'img-1',
        outputIndex: 0,
        path: 'output/ready/000.png',
        reviewStatus: 'accepted',
      },
      absolutePath: imagePath,
      providerThreadId: 'provider-thread-1',
      providerTurnId: 'turn-1',
    });
  });

  it('imports image bytes from a completed imageGeneration item', async () => {
    const client = new FakeAppServerClient();
    const outputDirectory = await makeTempOutputDirectory();
    const onImageReady = vi.fn(async () => undefined);
    const runPromise = runCodexImageAppServerJob({
      client,
      jobId: 'job-1',
      workingDirectory: path.dirname(outputDirectory),
      outputDirectory,
      prompt: 'Generate one image.',
      requestedCount: 1,
      fastMode: false,
      model: 'gpt-5.4-mini',
      onImageReady,
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());

    client.notify({
      method: 'item/completed',
      params: {
        threadId: 'provider-thread-1',
        turnId: 'turn-1',
        item: {
          id: 'item-ig-1',
          type: 'imageGeneration',
          result: {
            images: [
              {
                imageId: 'provider-image-1',
                mimeType: 'image/png',
                bytesBase64: tinyPngBase64(),
              },
            ],
          },
        },
      },
    });
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'provider-thread-1',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: true,
      canceled: false,
      providerThreadId: 'provider-thread-1',
      providerTurnId: 'turn-1',
      importedCount: 1,
    });
    expect(onImageReady).toHaveBeenCalledTimes(1);
    const payload = onImageReady.mock.calls[0]?.[0];
    expect(payload?.event).toEqual({
      schema: 'crenv.image.ready.v1',
      jobId: 'job-1',
      imageId: 'provider-image-1',
      outputIndex: 0,
      path: 'output/ready/000.png',
      reviewStatus: 'accepted',
    });
    await expect(fsp.readFile(payload.absolutePath)).resolves.toEqual(Buffer.from(tinyPngBase64(), 'base64'));
  });
});
