import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const generationModule = require('./generation.cjs');

describe('generation codex runner environment', () => {
  it('builds a writable codex environment inside the job workspace', () => {
    expect(generationModule.__test__).toBeDefined();

    process.env.HOME = '/home/minelli';
    process.env.CODEX_HOME = '/home/minelli/.codex';
    const env = generationModule.__test__.buildCodexSpawnEnv('/tmp/job-123');

    expect(env.HOME).toBe('/home/minelli');
    expect(env.CODEX_HOME).toBe('/home/minelli/.codex');
    expect(env.XDG_CACHE_HOME).toBe('/tmp/job-123/.codex-cache');
    expect(env.XDG_CONFIG_HOME).toBe('/tmp/job-123/.codex-config');
    expect(env.XDG_STATE_HOME).toBe('/tmp/job-123/.codex-state');
    expect(env.TMPDIR).toBe('/tmp/job-123/.tmp');
  });

  it('parses scene plan stdout events from codex', () => {
    const scenePlan = generationModule.__test__.parseScenePlanLine(
      '{"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}'
    );

    expect(scenePlan).toEqual({
      type: 'CRENV_SCENE_PLAN',
      count: 6,
      applyToShimmers: true,
    });
    expect(generationModule.__test__.parseScenePlanLine('plain stdout line')).toBeNull();
  });

  it('parses scene plan lines after trimming stderr framing whitespace', () => {
    const scenePlan = generationModule.__test__.parseScenePlanLine(
      '  {"type":"CRENV_SCENE_PLAN","count":6,"applyToShimmers":true}  '
    );

    expect(scenePlan).toEqual({
      type: 'CRENV_SCENE_PLAN',
      count: 6,
      applyToShimmers: true,
    });
  });

  it('defaults shimmer expansion to false when the plan omits the flag', () => {
    const scenePlan = generationModule.__test__.parseScenePlanLine(
      '{"type":"CRENV_SCENE_PLAN","count":6}'
    );

    expect(scenePlan).toEqual({
      type: 'CRENV_SCENE_PLAN',
      count: 6,
      applyToShimmers: false,
    });
  });
});
