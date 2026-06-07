import { createRequire } from 'node:module';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  discoverCrenvImageReadyEvents,
  parseCrenvImageReadyLine,
  validateCrenvImageReadyEvent,
  buildCrenvImageReadyPromptContract,
  buildCodexTurnInputItems,
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
    expect(contract).toContain('output/ready');
    expect(contract).toContain('Save each accepted final image directly under output/ready');
    expect(contract).toContain('Do not create output/tmp candidates');
    expect(contract).toContain('Do not write sidecar JSON files, events.jsonl, or final manifests');
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
});
