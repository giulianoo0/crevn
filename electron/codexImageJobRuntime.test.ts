import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  parseCrenvImageReadyLine,
  validateCrenvImageReadyEvent,
  buildCrenvImageReadyPromptContract,
} = require('./codexImageJobRuntime.cjs');

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
    expect(contract).toContain('No final manifest is required.');
  });
});
