import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import { createClient } from '@libsql/client/node';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const generationModule = require('./generation.cjs');
const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

async function makeTempUserDataDir() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-store-'));
  tempDirs.push(dir);
  return dir;
}

describe('generation codex runner environment', () => {
  it('resolves the target Codex home from CODEX_HOME or the user home', () => {
    expect(generationModule.__test__.resolveCodexHomeDirectory({
      env: { CODEX_HOME: '/custom/codex' },
      homeDirectory: '/home/alex',
    })).toBe('/custom/codex');

    expect(generationModule.__test__.resolveCodexHomeDirectory({
      env: {},
      homeDirectory: '/home/alex',
    })).toBe(path.join('/home/alex', '.codex'));
  });

  it('seeds bundled Codex skills into the user Codex home without overwriting local edits', async () => {
    const rootDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-codex-skills-'));
    tempDirs.push(rootDir);
    const bundledSkillsDir = path.join(rootDir, 'bundled-skills');
    const codexHomeDir = path.join(rootDir, 'codex-home');

    await fsp.mkdir(path.join(bundledSkillsDir, 'direcao-de-cena'), { recursive: true });
    await fsp.writeFile(path.join(bundledSkillsDir, 'direcao-de-cena', 'SKILL.md'), 'bundled skill');
    await fsp.mkdir(path.join(codexHomeDir, 'skills', 'direcao-de-cena'), { recursive: true });
    await fsp.writeFile(path.join(codexHomeDir, 'skills', 'direcao-de-cena', 'SKILL.md'), 'local edit');

    await generationModule.__test__.seedBundledCodexSkills({
      bundledSkillsDir,
      codexHomeDir,
    });

    await expect(fsp.readFile(path.join(codexHomeDir, 'skills', 'direcao-de-cena', 'SKILL.md'), 'utf8')).resolves.toBe(
      'local edit'
    );
  });

  it('falls back to the repo skills resource when packaged resources are unavailable', async () => {
    const rootDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-codex-skill-paths-'));
    tempDirs.push(rootDir);
    const appRoot = path.join(rootDir, 'app');
    const repoSkillsDir = path.join(appRoot, 'resources', 'codex', 'skills');
    await fsp.mkdir(repoSkillsDir, { recursive: true });

    expect(generationModule.__test__.resolveBundledCodexSkillsDirectory({
      resourcesPath: path.join(rootDir, 'missing-resources'),
      appRoot,
    })).toBe(repoSkillsDir);
  });

  it('builds a writable codex environment inside the job workspace', () => {
    expect(generationModule.__test__).toBeDefined();

    const env = generationModule.__test__.buildCodexSpawnEnv('/tmp/job-123', {
      env: { PATH: '/usr/bin' },
      homeDirectory: '/home/minelli',
    });

    expect(env.PATH).toBe('/usr/bin');
    expect(env.HOME).toBe('/home/minelli');
    expect(env.CODEX_HOME).toBe('/home/minelli/.codex');
    expect(env.XDG_CACHE_HOME).toBe('/tmp/job-123/.codex-cache');
    expect(env.XDG_CONFIG_HOME).toBe('/tmp/job-123/.codex-config');
    expect(env.XDG_STATE_HOME).toBe('/tmp/job-123/.codex-state');
    expect(env.TMPDIR).toBe('/tmp/job-123/.tmp');
  });

  it('preserves an explicit Codex home when building the job environment', () => {
    const env = generationModule.__test__.buildCodexSpawnEnv('/tmp/job-123', {
      env: {
        HOME: '/Users/custom',
        CODEX_HOME: '/custom/codex',
      },
      homeDirectory: '/home/minelli',
    });

    expect(env.HOME).toBe('/Users/custom');
    expect(env.CODEX_HOME).toBe('/custom/codex');
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

  it('adds a fast-tier config override to codex exec when fast mode is enabled', () => {
    const defaultArgs = generationModule.__test__.buildCodexExecArgs({ fastMode: false });
    const fastArgs = generationModule.__test__.buildCodexExecArgs({ fastMode: true });

    expect(defaultArgs).not.toContain('service_tier="fast"');
    expect(fastArgs).toContain('-c');
    expect(fastArgs).toContain('service_tier="fast"');
    expect(fastArgs).toContain('features.fast_mode=true');
  });

  it('classifies codex trace lines for reasoning and tool calls', () => {
    expect(generationModule.__test__.classifyCodexTraceLine('Thinking about the scene layout')).toBe('reasoning');
    expect(generationModule.__test__.classifyCodexTraceLine('Calling tool: image generation')).toBe('tool_call');
    expect(generationModule.__test__.classifyCodexTraceLine('Plain output line')).toBe('plain');
  });

  it('instructs codex to emit the scene plan directly without shell or tool calls', () => {
    const prompt = generationModule.__test__.buildCodexImageGenerationPrompt({
      mode: 'scene',
      userPrompt: 'Generate a coordinated eight-frame garage sequence',
      outputDirectory: '/tmp/output',
      manifestPath: '/tmp/manifest.json',
      imageCount: 8,
      referenceImages: [],
    });

    expect(prompt).toContain('Print that JSON line directly to stdout yourself.');
    expect(prompt).toContain('Do not use shell commands, exec, tool calls, or helper scripts to emit the scene plan.');
    expect(prompt).toContain('These are static image keyframes for later animation in Seedance.');
    expect(prompt).toContain('direcao-de-cena');
    expect(prompt).toContain('Preserve environment identity using coverage plates and detail plates');
    expect(prompt).toContain('Lock character identity with named character-sheet anchors');
    expect(prompt).toContain('Use Codex image generation capabilities to create image files for the following prompt.');
  });

  it('builds a strict JSON prompt for scene structuring', () => {
    const prompt = generationModule.__test__.buildCodexSceneStructuringPrompt(
      'Cena em português com prompts mistos'
    );

    expect(prompt).toContain('Return exactly one JSON object and nothing else.');
    expect(prompt).toContain('"sceneDescription"');
    expect(prompt).toContain('"frames"');
    expect(prompt).toContain('All output text must be in English.');
    expect(prompt).toContain('Break the source into static image frames, not video instructions.');
    expect(prompt).toContain('Each frame will later be used as a Seedance reference image.');
  });

  it('builds one scene-generation task per frame with only scene-level context and the target frame prompt', () => {
    const tasks = generationModule.__test__.buildSceneFrameGenerationTasks({
      sceneGroupTitle: 'Scene 1',
      scenePrompt: 'Keep the control room and warm monitor light consistent.',
      frames: [
        { id: 'frame-1', title: 'Frame 1', prompt: 'Wide establishing shot.' },
        { id: 'frame-2', title: 'Frame 2', prompt: 'Closer shot on Tito.' },
        { id: 'frame-3', title: 'Frame 3', prompt: 'Reverse shot to the doorway.' },
      ],
      frameOverrideMap: new Map([
        ['frame-1', { id: 'frame-1', title: 'Frame 1', prompt: 'Wide establishing shot.' }],
        ['frame-2', { id: 'frame-2', title: 'Frame 2', prompt: 'Closer shot on Tito.' }],
        ['frame-3', { id: 'frame-3', title: 'Frame 3', prompt: 'Reverse shot to the doorway.' }],
      ]),
      referencesByFrameId: new Map(),
      sceneReferenceImages: [],
    });

    expect(tasks).toHaveLength(3);
    expect(tasks[1]?.frameId).toBe('frame-2');
    expect(tasks[1]?.prompt).toContain('Generate only this target frame: Frame 2.');
    expect(tasks[1]?.prompt).toContain('Use only the scene continuity brief, attached references, and this target frame prompt.');
    expect(tasks[1]?.prompt).toContain('Target frame prompt: Closer shot on Tito.');
    expect(tasks[1]?.prompt).toContain('This output is a static keyframe for later animation in Seedance.');
    expect(tasks[1]?.prompt).toContain('direcao-de-cena');
    expect(tasks[1]?.prompt).toContain('Keep visible character identity locked to character sheets');
    expect(tasks[1]?.prompt).toContain('Use environment coverage plates and closest detail plates');
    expect(tasks[1]?.prompt).not.toContain('Previous frame context:');
    expect(tasks[1]?.prompt).not.toContain('Next frame context:');
    expect(tasks[1]?.prompt).not.toContain('Full sequence context:');
  });

  it('runs async work with a bounded concurrency limit while preserving result order', async () => {
    const started: number[] = [];
    const completed: number[] = [];
    let activeCount = 0;
    let peakActiveCount = 0;

    const results = await generationModule.__test__.runWithConcurrencyLimit(
      [1, 2, 3, 4, 5],
      2,
      async (value: number) => {
        started.push(value);
        activeCount += 1;
        peakActiveCount = Math.max(peakActiveCount, activeCount);
        await new Promise((resolve) => setTimeout(resolve, value === 1 ? 30 : 5));
        activeCount -= 1;
        completed.push(value);
        return value * 10;
      }
    );

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(started).toEqual([1, 2, 3, 4, 5]);
    expect(completed[0]).toBe(2);
    expect(peakActiveCount).toBe(2);
  });

  it('builds a Director prompt grounded in project, thread, history, and staged references', () => {
    const prompt = generationModule.__test__.buildDirectorChatPrompt({
      projectName: 'Orbit Kids',
      threadName: 'Episode 2 / Hangar',
      systemInstructions: 'Keep continuity precise and production-ready.',
      artStyle: 'Stylized animated series.',
      sceneGroups: [
        {
          id: 'scene-group-hangar',
          title: 'Hangar Launch',
          prompt: 'Keep the hangar geography consistent.',
          frames: [
            {
              id: 'scene-frame-wide',
              title: 'Wide launch bay',
              prompt: 'Wide shot of the launch bay.',
              assets: [{ id: 'asset-1' }],
            },
          ],
        },
      ],
      history: [
        { role: 'user', contentMarkdown: 'Draft a coverage approach.' },
        { role: 'assistant', contentMarkdown: 'Start from a wide and move into reverses.' },
      ],
      referenceImages: [
        {
          title: 'Hangar reference',
          description: 'Main environment plate',
          filePath: '/tmp/ref-1.png',
          mimeType: 'image/png',
        },
      ],
      userPrompt: 'Now turn that into a six-shot plan.',
    });

    expect(prompt).toContain('Project: Orbit Kids');
    expect(prompt).toContain('Thread: Episode 2 / Hangar');
    expect(prompt).toContain('Project instructions: Keep continuity precise and production-ready.');
    expect(prompt).toContain('Project art style: Stylized animated series.');
    expect(prompt).toContain('Existing editable scenes and frames:');
    expect(prompt).toContain('sceneGroupId=scene-group-hangar');
    expect(prompt).toContain('frameId=scene-frame-wide');
    expect(prompt).toContain('For edits to existing Scenes use action "update_scene"');
    expect(prompt).toContain('An update_scene payload shape is');
    expect(prompt).toContain('title: Hangar reference; description: Main environment plate');
    expect(prompt).toContain('User: Draft a coverage approach.');
    expect(prompt).toContain('Assistant: Start from a wide and move into reverses.');
    expect(prompt).toContain('User: Now turn that into a six-shot plan.');
    expect(prompt).toContain('@Reference');
    expect(prompt).toContain('```markdown');
    expect(prompt).toContain('copyable markdown code block');
    expect(prompt).toContain('```imagen-action');
    expect(prompt).toContain('You cannot generate images yourself.');
    expect(prompt).toContain('The Imagen app will execute the action');
    expect(prompt).toContain('Treat environment references as locked layout anchors');
    expect(prompt).toContain('Treat character sheets as locked identity anchors');
    expect(prompt).toContain('Every imagen-action payload must include the relevant environment and character @Reference names');
    expect(prompt).toContain('Use the closest environment detail reference for the visible area of each frame');
    expect(prompt).toContain('inspect every provided reference image and every image in a multi-image environment set');
    expect(prompt).toContain('treat all attachments with the same environment title as one context set');
    expect(prompt).toContain('When a saved reference has multiple attachments, choose the exact attachment needed for each frame');
    expect(prompt).toContain('@Reference#attachment-name');
    expect(prompt).toContain('Each frame can include its own references array');
    expect(prompt).toContain('When reviewing generated outputs');
    expect(prompt).toContain('Give visible characters natural performance beats');
    expect(prompt).toContain('Every frame you prepare is a static image keyframe for later Seedance animation');
    expect(prompt).toContain('direcao-de-cena');
    expect(prompt).toContain('Treat every create_scene action as a Seedance multishot blueprint');
    expect(prompt).toContain('Loaded direcao-de-cena skill contract:');
    expect(prompt).toContain('Use the direcao-de-cena skill as the governing workflow');
    expect(prompt).toContain('Follow the direcao-de-cena three-phase flow explicitly');
    expect(prompt).toContain('Fase 1 pre-plano');
    expect(prompt).toContain('Fase 2 frame planning for Seedance');
    expect(prompt).toContain('Fase 3 execution via imagen-action');
    expect(prompt).toContain('If one clip becomes overcrowded, split it');
    expect(prompt).toContain('Treat a 15s clip as roughly 4 clear beats');
    expect(prompt).toContain('If 3+ characters are acting simultaneously, serialize the action');
    expect(prompt).toContain('Each clip should carry one function only');
    expect(prompt).toContain('show the beat count for each scene');
    expect(prompt).toContain('4 beats max');
    expect(prompt).toContain('A frame or shot in image generation is a single image');
    expect(prompt).toContain('A beat should usually be represented by one image, because it is one action.');
    expect(prompt).toContain('Beat is a story unit and frame is an image unit');
    expect(prompt).toContain('One beat can expand into multiple frames');
    expect(prompt).toContain('keep the response centered on the shot plan');
    expect(prompt).toContain('Prefer compact bullets and coverage tables');
    expect(prompt).toContain('define the dramatic motor internally: want, obstacle, turn');
    expect(prompt).toContain('Very strongly prefer outputting a proper pre-plano before any imagen-action');
    expect(prompt).toContain('If the requested clip should be split into two scenes');
    expect(prompt).toContain('Because the app accepts only one scene action per Director response');
    expect(prompt).toContain('emit only Scene 1 in the current imagen-action');
    expect(prompt).toContain('Use Shot 1:, Shot 2:, and Hard cut to labels');
    expect(prompt).toContain('Duration: 12-15s for multishot, 16:9.');
    expect(prompt).toContain('Audio: no music, no background score. Sound effects and ambient only');
    expect(prompt).toContain('Very strongly prefer writing a Seedance Coverage Plan before emitting any imagen-action');
    expect(prompt).toContain('Seedance accepts at most 15 seconds per generation');
    expect(prompt).toContain('Dialogue coverage:');
    expect(prompt).toContain('Image/keyframe budget:');
    expect(prompt).toContain('This guidance can be relaxed when needed, but in general tend toward more scenes, frames, and beats rather than fewer');
    expect(prompt).toContain('must preserve / may change');
    expect(prompt).toContain('You may still emit the imagen-action in the same response after the plan');
    expect(prompt).toContain('Use consistent character names, exact wardrobe, proportions, face shape, hair silhouette, palette, and distinguishing details');
    expect(prompt).toContain('If an environment reference contains multiple images, pick the single attachment that best suits the current frame and do not pass the whole group to the imagen-action unless the full set is genuinely required');
  });

  it('parses Director action blocks for Classic generation', () => {
    const actions = generationModule.__test__.parseDirectorActionBlocks([
      'I will generate exploration frames now.',
      '```imagen-action',
      JSON.stringify({
        version: 1,
        action: 'generate_classic',
        summary: 'Generate 3 bedroom exploration frames.',
        payload: {
          prompt: 'A production-ready bedroom shot.',
          count: 3,
          aspectRatio: '16:9',
          references: ['@Bedroom', '@Tito'],
        },
      }),
      '```',
    ].join('\n'));

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action: 'generate_classic',
      summary: 'Generate 3 bedroom exploration frames.',
      payload: {
        prompt: 'A production-ready bedroom shot.',
        count: 3,
        aspectRatio: '16:9',
        references: ['@Bedroom', '@Tito'],
      },
    });
  });

  it('accepts string or omitted Director action versions as version 1', () => {
    const withStringVersion = generationModule.__test__.parseDirectorActionBlocks([
      '```imagen-action',
      JSON.stringify({
        version: '1',
        action: 'generate_classic',
        summary: 'Generate one frame.',
        payload: {
          prompt: 'A production-ready frame.',
          count: 1,
        },
      }),
      '```',
    ].join('\n'));
    const withoutVersion = generationModule.__test__.parseDirectorActionBlocks([
      '```imagen-action',
      JSON.stringify({
        action: 'generate_classic',
        summary: 'Generate one frame.',
        payload: {
          prompt: 'A production-ready frame.',
          count: 1,
        },
      }),
      '```',
    ].join('\n'));

    expect(withStringVersion[0]).toMatchObject({ version: 1, action: 'generate_classic' });
    expect(withStringVersion[0]?.error).toBeUndefined();
    expect(withoutVersion[0]).toMatchObject({ version: 1, action: 'generate_classic' });
    expect(withoutVersion[0]?.error).toBeUndefined();
  });

  it('rejects Director responses with more than one scene action', () => {
    const block = (title: string) => [
      '```imagen-action',
      JSON.stringify({
        version: 1,
        action: 'create_scene',
        summary: title,
        payload: {
          title,
          scenePrompt: 'Scene continuity.',
          frames: [{ title: 'Frame 1', prompt: 'Wide shot.' }],
        },
      }),
      '```',
    ].join('\n');

    const actions = generationModule.__test__.parseDirectorActionBlocks(`${block('Scene A')}\n${block('Scene B')}`);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.error).toContain('Only one scene action');
  });

  it('preserves per-frame Director reference selectors for multi-attachment references', () => {
    const actions = generationModule.__test__.parseDirectorActionBlocks([
      '```imagen-action',
      JSON.stringify({
        version: 1,
        action: 'create_scene',
        summary: 'Create scene with specific reference attachments.',
        payload: {
          title: 'Bedroom multishot',
          scenePrompt: 'Keep the bedroom layout stable.',
          references: ['@Bedroom#wide-base'],
          frames: [
            {
              title: 'Frame 1',
              prompt: 'Wide view of the bedroom.',
              references: ['@Bedroom#wide-base'],
            },
            {
              title: 'Frame 2',
              prompt: 'Closer view near the door.',
              references: ['@Bedroom#door-detail', '@Tito#front-sheet'],
            },
          ],
        },
      }),
      '```',
    ].join('\n'));

    expect(actions[0]).toMatchObject({
      action: 'create_scene',
      payload: {
        references: ['@Bedroom#wide-base'],
        frames: [
          {
            references: ['@Bedroom#wide-base'],
          },
          {
            references: ['@Bedroom#door-detail', '@Tito#front-sheet'],
          },
        ],
      },
    });
  });

  it('parses Director update_scene actions for existing scenes and frames', () => {
    const actions = generationModule.__test__.parseDirectorActionBlocks([
      '```imagen-action',
      JSON.stringify({
        version: 1,
        action: 'update_scene',
        summary: 'Revise a previous scene and add a cutaway.',
        payload: {
          sceneGroupId: 'scene-group-hangar',
          sceneTitle: 'Hangar Launch',
          scenePrompt: 'Keep the hangar geography and lighting consistent.',
          references: ['@Hangar'],
          generate: true,
          frames: [
            {
              id: 'scene-frame-wide',
              title: 'Wide launch bay',
              prompt: 'Revised wide shot with clearer staging.',
              operation: 'update',
              references: ['@Hangar#wide'],
            },
            {
              title: 'Console cutaway',
              prompt: 'Insert shot on the blinking launch console.',
              operation: 'add',
              references: ['@Hangar#console'],
            },
          ],
        },
      }),
      '```',
    ].join('\n'));

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action: 'update_scene',
      payload: {
        sceneGroupId: 'scene-group-hangar',
        sceneTitle: 'Hangar Launch',
        generate: true,
        frames: [
          {
            id: 'scene-frame-wide',
            operation: 'update',
            generate: true,
          },
          {
            id: null,
            title: 'Console cutaway',
            operation: 'add',
            generate: true,
          },
        ],
      },
    });
  });

  it('keeps Director scene actions generation-ready after approval', () => {
    const actions = generationModule.__test__.parseDirectorActionBlocks([
      '```imagen-action',
      JSON.stringify({
        version: 1,
        action: 'create_scene',
        summary: 'Create and generate a scene plan.',
        payload: {
          title: 'Bedroom discovery',
          scenePrompt: 'Keep the bedroom layout locked.',
          generate: true,
          references: ['@Bedroom', '@Tito'],
          frames: [{ title: 'Frame 1', prompt: 'Wide shot.', references: ['@Bedroom', '@Tito'] }],
        },
      }),
      '```',
    ].join('\n'));

    expect(actions[0]).toMatchObject({
      action: 'create_scene',
      payload: {
        generate: true,
      },
    });
  });

  it('builds persisted Director status blocks', () => {
    const block = generationModule.__test__.buildDirectorStatusBlock({
      status: 'running',
      title: 'Generating Classic',
      detail: '3 images requested.',
      action: 'generate_classic',
    });

    expect(block).toContain('```imagen-status');
    expect(block).toContain('"status":"running"');
    expect(block).toContain('"action":"generate_classic"');
  });

  it('truncates Director chat titles from the opening prompt line', () => {
    const title = generationModule.__test__.truncateDirectorChatTitle(
      'Build a shot list for the hangar chase with emphasis on reverses and inserts.\nSecond line.'
    );

    expect(title).toBe('Build a shot list for the hangar chase with emphasis on…');
  });

  it('sorts Director messages by persisted order before timestamp or id', () => {
    const messages = generationModule.__test__.sortDirectorMessageRecords([
      {
        id: 'assistant-before-user-alphabetically',
        role: 'assistant',
        messageOrder: 2,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
      {
        id: 'user-after-assistant-alphabetically',
        role: 'user',
        messageOrder: 1,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ]);

    expect(messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('falls back to legacy Director ordering only when message order is missing', () => {
    const messages = generationModule.__test__.sortDirectorMessageRecords([
      {
        id: 'assistant-before-user-alphabetically',
        role: 'assistant',
        messageOrder: null,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
      {
        id: 'user-after-assistant-alphabetically',
        role: 'user',
        messageOrder: null,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ]);

    expect(messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('uses the selected codex model when building exec arguments', () => {
    const args = generationModule.__test__.buildCodexExecArgs({
      model: 'gpt-5.5',
      fastMode: false,
    });

    expect(args.slice(0, 2)).toEqual(['--model', 'gpt-5.5']);
  });

  it('builds Antigravity print arguments without fast-tier overrides', () => {
    const args = generationModule.__test__.buildAntigravityExecArgs({
      logFilePath: '/tmp/job-123/antigravity-cli.log',
    });

    expect(args).toContain('--print');
    expect(args).toContain('--dangerously-skip-permissions');
    expect(args).toContain('--print-timeout');
    expect(args).toContain('--log-file');
    expect(args).toContain('/tmp/job-123/antigravity-cli.log');
    expect(args).not.toContain('service_tier="fast"');
  });

  it('builds a fully isolated Antigravity environment inside the job workspace', () => {
    const env = generationModule.__test__.buildAntigravitySpawnEnv(
      '/tmp/job-123',
      '/tmp/job-123/.antigravity-home'
    );

    expect(env.HOME).toBe('/tmp/job-123/.antigravity-home');
    expect(env.XDG_CACHE_HOME).toBe('/tmp/job-123/.antigravity-cache');
    expect(env.XDG_CONFIG_HOME).toBe('/tmp/job-123/.antigravity-config');
    expect(env.XDG_STATE_HOME).toBe('/tmp/job-123/.antigravity-state');
    expect(env.XDG_DATA_HOME).toBe('/tmp/job-123/.antigravity-data');
    expect(env.TMPDIR).toBe('/tmp/job-123/.tmp');
  });

  it('creates a job-local Antigravity project marker and sanitized settings', async () => {
    const originalHome = process.env.HOME;
    const sourceHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-agy-source-home-'));
    const workingDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), 'crenv-agy-job-'));
    const sourceCliDirectory = path.join(sourceHome, '.gemini', 'antigravity-cli');

    await fsp.mkdir(sourceCliDirectory, { recursive: true });
    await fsp.writeFile(
      path.join(sourceCliDirectory, 'settings.json'),
      JSON.stringify({
        colorScheme: 'dark',
        enableTelemetry: true,
        trustedWorkspaces: ['/home/minelli'],
      })
    );

    process.env.HOME = sourceHome;
    const profile = await generationModule.__test__.prepareAntigravityHomeDirectory({
      workingDirectory,
      model: 'Gemini 3.5 Flash (Low)',
    });
    process.env.HOME = originalHome;

    const settings = JSON.parse(
      await fsp.readFile(
        path.join(profile.homeDirectory, '.gemini', 'antigravity-cli', 'settings.json'),
        'utf8'
      )
    );
    const projectMarkerPath = path.join(
      workingDirectory,
      '.antigravitycli',
      `${profile.projectId}.json`
    );
    const projectPath = path.join(
      profile.homeDirectory,
      '.gemini',
      'config',
      'projects',
      `${profile.projectId}.json`
    );
    const project = JSON.parse(await fsp.readFile(projectPath, 'utf8'));

    expect(settings).toEqual({
      colorScheme: 'dark',
      enableTelemetry: true,
      model: 'Gemini 3.5 Flash (Low)',
      trustedWorkspaces: [],
    });
    expect(await fsp.readlink(projectMarkerPath)).toBe(projectPath);
    expect(project.name).toBe(workingDirectory);
    expect(project.projectResources.resources[0].gitFolder.folderUri).toBe(
      `file://${workingDirectory}`
    );
  });

  it('includes the selected Antigravity reasoning model in the prompt contract', () => {
    const prompt = generationModule.__test__.buildAntigravityImageGenerationPrompt({
      mode: 'manual',
      userPrompt: 'Generate a portrait on black background',
      outputDirectory: '/tmp/output',
      manifestPath: '/tmp/manifest.json',
      imageCount: 1,
      referenceImages: [],
      antigravityModel: 'Gemini 3.5 Flash (Low)',
    });

    expect(prompt).toContain('Selected Antigravity reasoning model: Gemini 3.5 Flash (Low)');
    expect(prompt).toContain('Use Antigravity\'s built-in image generation workflow');
    expect(prompt).toContain('Use Nano Banana Pro for image generation');
    expect(prompt).toContain('print exactly one single-line JSON object to stdout');
    expect(prompt).not.toContain('The manifest path is:');
    expect(prompt).not.toContain('Analyze all attached reference images before generating anything.');
  });

  it('parses an Antigravity stdout manifest line', () => {
    const manifest = generationModule.__test__.parseImageManifestLine(
      '{"images":[{"path":"/tmp/output/example.png"}]}'
    );

    expect(manifest).toEqual({
      images: [{ path: '/tmp/output/example.png' }],
    });
  });

  it('rejects an Antigravity zero-exit timeout when no stdout manifest was printed', () => {
    const result = generationModule.__test__.resolveAntigravityCloseResult({
      code: 0,
      manifest: null,
      stdout: 'Error: timed out waiting for response\n',
      stderr: '',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('timed out waiting for response');
  });

  it('accepts an Antigravity zero-exit result only when stdout produced a manifest', () => {
    const manifest = { images: [{ path: '/tmp/output/example.png' }] };
    const result = generationModule.__test__.resolveAntigravityCloseResult({
      code: 0,
      manifest,
      stdout: '{"images":[{"path":"/tmp/output/example.png"}]}\n',
      stderr: '',
    });

    expect(result).toEqual({ success: true, manifest });
  });

  it('forces Antigravity routing when the model id belongs to Antigravity', () => {
    const selection = generationModule.__test__.resolveGenerationSelection(
      'codex',
      'antigravity-gemini-3-5-flash-low'
    );

    expect(selection.provider).toBe('antigravity');
    expect(selection.modelId).toBe('antigravity-gemini-3-5-flash-low');
    expect(selection.codexModel).toBeNull();
    expect(selection.antigravityModel).toBe('Gemini 3.5 Flash (Low)');
  });

  it('falls back to the Antigravity default model when provider is Antigravity but the model id is missing', () => {
    const selection = generationModule.__test__.resolveGenerationSelection('antigravity', null);

    expect(selection.provider).toBe('antigravity');
    expect(selection.modelId).toBe('antigravity-gemini-3-5-flash-low');
  });

  it('keeps Codex jobs under the app data temp root', () => {
    const workingDirectory = generationModule.__test__.resolveJobWorkingDirectory({
      provider: 'codex',
      jobId: 'job-123',
      codexJobsTempDir: '/home/minelli/.config/crenv/tmp/codex-jobs',
    });

    expect(workingDirectory).toBe('/home/minelli/.config/crenv/tmp/codex-jobs/job-123');
  });

  it('moves Antigravity jobs to /tmp so they cannot inherit the home project context', () => {
    const workingDirectory = generationModule.__test__.resolveJobWorkingDirectory({
      provider: 'antigravity',
      jobId: 'job-123',
      codexJobsTempDir: '/home/minelli/.config/crenv/tmp/codex-jobs',
    });

    expect(workingDirectory).toBe('/tmp/crenv-antigravity-jobs/job-123');
  });

  it('returns the created scene group instead of the first scene in the thread', async () => {
    const store = await generationModule.createGenerationStore(await makeTempUserDataDir(), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const workspace = await store.createProject('Storyboard');
      const firstScene = await store.createSceneGroup(workspace.thread.id, {
        title: 'Scene 1',
        prompt: 'Opening scene.',
        tocOrder: 1,
      });
      const secondScene = await store.createSceneGroup(workspace.thread.id, {
        title: 'Scene 2',
        prompt: 'Second scene.',
        tocOrder: 2,
      });

      expect(firstScene?.title).toBe('Scene 1');
      expect(secondScene?.title).toBe('Scene 2');
      expect(secondScene?.id).not.toBe(firstScene?.id);

      const updatedSecondScene = await store.createSceneFrame(secondScene.id, {
        title: 'Scene 2 Frame 1',
        prompt: 'The correct scene receives this frame.',
        frameOrder: 1,
      });
      const sceneGroups = await store.listSceneGroups(workspace.thread.id);

      expect(updatedSecondScene?.id).toBe(secondScene.id);
      expect(sceneGroups.find((sceneGroup) => sceneGroup.title === 'Scene 1')?.frames).toHaveLength(0);
      expect(sceneGroups.find((sceneGroup) => sceneGroup.title === 'Scene 2')?.frames).toEqual([
        expect.objectContaining({ title: 'Scene 2 Frame 1' }),
      ]);
    } finally {
      store.close();
    }
  });

  it('pastes a clipboard image as an output asset for the target scene frame', async () => {
    const store = await generationModule.createGenerationStore(await makeTempUserDataDir(), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const workspace = await store.createProject('Storyboard');
      const sceneGroup = await store.createSceneGroup(workspace.thread.id, {
        title: 'Scene 1',
        prompt: 'Opening scene.',
        tocOrder: 1,
      });
      await store.createSceneFrame(sceneGroup.id, {
        title: 'Frame 1',
        prompt: 'Wide establishing shot.',
        frameOrder: 1,
      });
      const sceneWithFrame = await store.createSceneFrame(sceneGroup.id, {
        title: 'Frame 2',
        prompt: 'Closer insert.',
        frameOrder: 2,
      });
      const targetFrame = sceneWithFrame.frames.find((frame) => frame.title === 'Frame 2');
      if (!targetFrame) {
        throw new Error('Expected target frame to be created');
      }

      const updatedSceneGroup = await store.pasteClipboardImageToSceneFrame(targetFrame.id, {
        mimeType: 'image/png',
        bytesBase64: Buffer.from('clipboard-png-bytes').toString('base64'),
      });
      const updatedTargetFrame = updatedSceneGroup.frames.find((frame) => frame.id === targetFrame.id);
      const untouchedFrame = updatedSceneGroup.frames.find((frame) => frame.title === 'Frame 1');
      const pastedAsset = updatedTargetFrame?.assets[0];
      if (!pastedAsset) {
        throw new Error('Expected pasted clipboard asset to be created');
      }

      expect(untouchedFrame?.assets).toHaveLength(0);
      expect(updatedTargetFrame?.assets).toHaveLength(1);
      expect(updatedSceneGroup.runs[0]).toEqual(
        expect.objectContaining({
          status: 'succeeded',
          provider: 'codex',
          modelId: 'clipboard',
          modelLabel: 'Clipboard',
          requestedFrameCount: 1,
        })
      );
      expect(pastedAsset).toEqual(
        expect.objectContaining({
          sceneGroupRunId: updatedSceneGroup.runs[0].id,
          sceneFrameId: targetFrame.id,
          outputIndex: 0,
          originalPath: 'clipboard',
          mimeType: 'image/png',
        })
      );
      await expect(fsp.readFile(pastedAsset.storedPath)).resolves.toEqual(Buffer.from('clipboard-png-bytes'));

      await expect(store.getGeneratedImage(pastedAsset.id)).resolves.toEqual(
        expect.objectContaining({
          id: pastedAsset.id,
          storedPath: pastedAsset.storedPath,
          fileName: pastedAsset.fileName,
          mimeType: 'image/png',
        })
      );
    } finally {
      store.close();
    }
  });

  it('lists Director messages without parsing stored reference snapshots', async () => {
    const userDataDir = await makeTempUserDataDir();
    const store = await generationModule.createGenerationStore(userDataDir, {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });
    const client = createClient({ url: `file:${path.join(userDataDir, 'crenv.sqlite')}` });

    try {
      const workspace = await store.createProject('Storyboard');
      const chat = await store.createDirectorChat(workspace.thread.id);
      const referenceImagesJson = JSON.stringify([
        {
          name: 'large-reference.png',
          title: 'Large Reference',
          description: 'Stored snapshot should not be parsed for chat display.',
          mimeType: 'image/png',
          bytesBase64: 'A'.repeat(1024 * 1024),
        },
      ]);

      await client.execute({
        sql: `
          INSERT INTO director_messages (
            id,
            chat_id,
            role,
            content_markdown,
            status,
            model_id,
            model_label,
            fast_mode,
            reference_images_json,
            message_order,
            provider_turn_id,
            provider_item_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'director-message-with-reference',
          chat.id,
          'assistant',
          'Display this without touching the reference snapshot.',
          'completed',
          'codex-gpt-5-4-mini',
          'Codex / GPT-5.4 Mini',
          1,
          referenceImagesJson,
          1,
          null,
          null,
          '2026-06-01T12:00:00.000Z',
          '2026-06-01T12:00:00.000Z',
        ],
      });

      const messages = await store.listDirectorMessages(chat.id);

      expect(messages).toEqual([
        expect.objectContaining({
          id: 'director-message-with-reference',
          contentMarkdown: 'Display this without touching the reference snapshot.',
          fastMode: true,
          references: [],
        }),
      ]);
    } finally {
      client.close();
      store.close();
    }
  });

  it('builds thread export snapshots without sibling thread data', async () => {
    const userDataDir = await makeTempUserDataDir();
    const store = await generationModule.createGenerationStore(userDataDir, {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });
    const client = createClient({ url: `file:${path.join(userDataDir, 'crenv.sqlite')}` });

    try {
      const workspace = await store.createProject('Export Project');
      const siblingThread = await store.createThread(workspace.project.id);
      await store.renameThread(workspace.thread.id, 'Hero selects');
      await store.renameThread(siblingThread.id, 'Sibling selects');

      await client.execute({
        sql: `
          INSERT INTO generation_jobs (
            id,
            thread_id,
            prompt,
            requested_count,
            status,
            working_directory,
            manifest_path,
            error_message,
            provider,
            model_id,
            model_label,
            reference_images_json,
            duration_ms,
            provider_thread_id,
            provider_turn_id,
            runtime,
            imported_count,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'job_thread',
          workspace.thread.id,
          'hero prompt',
          1,
          'succeeded',
          '/tmp/job-thread',
          '/tmp/job-thread/manifest.json',
          null,
          'codex',
          'codex-gpt-5-4-mini',
          'Codex / GPT-5.4 Mini',
          null,
          1200,
          'provider-thread',
          'provider-turn',
          'codex-app-server',
          1,
          '2026-06-05T10:00:00.000Z',
          '2026-06-05T10:00:02.000Z',
        ],
      });
      await client.execute({
        sql: `
          INSERT INTO generated_assets (
            id,
            job_id,
            original_path,
            stored_path,
            file_name,
            mime_type,
            width,
            height,
            provider_image_id,
            output_index,
            review_status,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'asset_thread',
          'job_thread',
          '/tmp/job-thread/output/hero.png',
          path.join(userDataDir, 'generated-images', 'hero.png'),
          'hero.png',
          'image/png',
          1024,
          1024,
          'provider-image',
          0,
          'selected',
          '2026-06-05T10:00:03.000Z',
        ],
      });
      await client.execute({
        sql: `
          INSERT INTO generation_jobs (
            id,
            thread_id,
            prompt,
            requested_count,
            status,
            working_directory,
            manifest_path,
            error_message,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'job_sibling',
          siblingThread.id,
          'sibling prompt',
          1,
          'succeeded',
          '/tmp/job-sibling',
          '/tmp/job-sibling/manifest.json',
          null,
          '2026-06-05T10:01:00.000Z',
          '2026-06-05T10:01:02.000Z',
        ],
      });

      const chat = await store.createDirectorChat(workspace.thread.id);
      await client.execute({
        sql: `
          INSERT INTO director_messages (
            id,
            chat_id,
            role,
            content_markdown,
            status,
            fast_mode,
            message_order,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'director_message_thread',
          chat.id,
          'user',
          'Make this scene exportable.',
          'completed',
          0,
          1,
          '2026-06-05T10:02:00.000Z',
          '2026-06-05T10:02:00.000Z',
        ],
      });

      const snapshot = await store.createThreadExportSnapshot(workspace.thread.id);

      expect(snapshot.scope).toBe('thread');
      expect(snapshot.project.id).toBe(workspace.project.id);
      expect(snapshot.threads.map((thread) => thread.id)).toEqual([workspace.thread.id]);
      expect(snapshot.generationJobs.map((job) => job.id)).toEqual(['job_thread']);
      expect(snapshot.generatedAssets.map((asset) => asset.id)).toEqual(['asset_thread']);
      expect(snapshot.directorChats.map((snapshotChat) => snapshotChat.id)).toEqual([chat.id]);
      expect(snapshot.directorMessages.map((message) => message.id)).toEqual(['director_message_thread']);
      expect(snapshot.generationJobs.some((job) => job.id === 'job_sibling')).toBe(false);
    } finally {
      client.close();
      store.close();
    }
  });

  it('builds project export snapshots with all project threads', async () => {
    const userDataDir = await makeTempUserDataDir();
    const store = await generationModule.createGenerationStore(userDataDir, {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });
    const client = createClient({ url: `file:${path.join(userDataDir, 'crenv.sqlite')}` });

    try {
      const workspace = await store.createProject('Project Export');
      const secondThread = await store.createThread(workspace.project.id);
      await client.execute({
        sql: `
          INSERT INTO generation_jobs (
            id,
            thread_id,
            prompt,
            requested_count,
            status,
            working_directory,
            manifest_path,
            error_message,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'job_first_thread',
          workspace.thread.id,
          'first thread prompt',
          1,
          'succeeded',
          '/tmp/job-first',
          '/tmp/job-first/manifest.json',
          null,
          '2026-06-05T10:00:00.000Z',
          '2026-06-05T10:00:01.000Z',
        ],
      });
      await client.execute({
        sql: `
          INSERT INTO generation_jobs (
            id,
            thread_id,
            prompt,
            requested_count,
            status,
            working_directory,
            manifest_path,
            error_message,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'job_second_thread',
          secondThread.id,
          'second thread prompt',
          1,
          'succeeded',
          '/tmp/job-second',
          '/tmp/job-second/manifest.json',
          null,
          '2026-06-05T10:01:00.000Z',
          '2026-06-05T10:01:01.000Z',
        ],
      });

      const snapshot = await store.createProjectExportSnapshot(workspace.project.id);

      expect(snapshot.scope).toBe('project');
      expect(snapshot.project.id).toBe(workspace.project.id);
      expect(snapshot.threads.map((thread) => thread.id).sort()).toEqual(
        [workspace.thread.id, secondThread.id].sort()
      );
      expect(snapshot.generationJobs.map((job) => job.id).sort()).toEqual([
        'job_first_thread',
        'job_second_thread',
      ]);
    } finally {
      client.close();
      store.close();
    }
  }, 15_000);

  it('builds reference export snapshots for only the clicked reference group', async () => {
    const userDataDir = await makeTempUserDataDir();
    const store = await generationModule.createGenerationStore(userDataDir, {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const [firstHero, secondHero] = await store.createReferenceCollection({
        category: 'characters',
        title: 'Hero Pack',
        description: 'Main character continuity.',
        attachments: [
          {
            name: 'hero-front.png',
            mimeType: 'image/png',
            bytesBase64: Buffer.from('front').toString('base64'),
            description: 'Front view',
          },
          {
            name: 'hero-side.png',
            mimeType: 'image/png',
            bytesBase64: Buffer.from('side').toString('base64'),
            description: 'Side view',
          },
        ],
      });
      await store.createReferenceCollection({
        category: 'characters',
        title: 'Villain Pack',
        description: 'Should not export.',
        attachments: [
          {
            name: 'villain.png',
            mimeType: 'image/png',
            bytesBase64: Buffer.from('villain').toString('base64'),
          },
        ],
      });

      const snapshot = await store.createReferenceExportSnapshot({
        id: firstHero.id,
        category: 'characters',
        collectionId: firstHero.collectionId,
      });

      expect(snapshot.scope).toBe('reference');
      expect(snapshot.reference.title).toBe('Hero Pack');
      expect(snapshot.reference.category).toBe('characters');
      expect(snapshot.reference.collectionId).toBe(firstHero.collectionId);
      expect(snapshot.references.map((reference) => reference.id).sort()).toEqual(
        [firstHero.id, secondHero.id].sort()
      );
      expect(snapshot.references.map((reference) => reference.name).sort()).toEqual([
        'hero-front.png',
        'hero-side.png',
      ]);
    } finally {
      store.close();
    }
  });

  it('writes export archives with manifest entries and missing stored assets', async () => {
    const archivePath = path.join(await makeTempUserDataDir(), 'thread-export.crenv');
    const snapshot = {
      scope: 'thread',
      project: {
        id: 'project_1',
        name: 'Export Project',
        systemInstructions: '',
        artStyle: '',
        createdAt: '2026-06-05T10:00:00.000Z',
        updatedAt: '2026-06-05T10:00:00.000Z',
      },
      threads: [
        {
          id: 'thread_1',
          projectId: 'project_1',
          name: 'Hero selects',
          createdAt: '2026-06-05T10:00:01.000Z',
          updatedAt: '2026-06-05T10:00:01.000Z',
        },
      ],
      generationJobs: [],
      generatedAssets: [
        {
          id: 'asset_missing',
          jobId: 'job_1',
          originalPath: '/tmp/missing.png',
          storedPath: path.join(path.dirname(archivePath), 'missing.png'),
          fileName: 'missing.png',
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          createdAt: '2026-06-05T10:00:02.000Z',
        },
      ],
      directorChats: [],
      directorMessages: [],
      sceneGroups: [],
      sceneFrames: [],
      sceneFrameReferences: [],
      sceneGroupRuns: [],
      sceneFrameAssets: [],
    };

    const result = await generationModule.__test__.writeExportArchive({
      filePath: archivePath,
      format: 'crenv',
      snapshot,
      exportedAt: '2026-06-05T12:00:00.000Z',
      sourceApp: { name: 'crevn', version: '0.1.5' },
    });

    const archiveBytes = await fsp.readFile(archivePath);

    expect(result).toEqual({
      filePath: archivePath,
      missingAssets: [
        {
          id: 'asset_missing',
          type: 'generated',
          sourcePath: snapshot.generatedAssets[0].storedPath,
          archivePath: 'assets/generated/asset_missing-missing.png',
        },
      ],
    });
    expect(archiveBytes.subarray(0, 2).toString('utf8')).toBe('PK');
  }, 15_000);

  it('imports a project export archive as a new project with remapped records', async () => {
    const userDataDir = await makeTempUserDataDir();
    const sourceAssetPath = path.join(userDataDir, 'source-asset.png');
    const archivePath = path.join(userDataDir, 'project-import.crenv');
    await fsp.writeFile(sourceAssetPath, Buffer.from('png-bytes'));

    await generationModule.__test__.writeExportArchive({
      filePath: archivePath,
      format: 'crenv',
      exportedAt: '2026-06-05T12:00:00.000Z',
      sourceApp: { name: 'crevn', version: '0.1.5' },
      snapshot: {
        scope: 'project',
        project: {
          id: 'old_project',
          name: 'Imported Project',
          systemInstructions: 'Keep it cinematic.',
          artStyle: 'editorial',
          createdAt: '2026-06-05T10:00:00.000Z',
          updatedAt: '2026-06-05T10:00:00.000Z',
        },
        threads: [
          {
            id: 'old_thread',
            projectId: 'old_project',
            name: 'Imported Thread',
            createdAt: '2026-06-05T10:01:00.000Z',
            updatedAt: '2026-06-05T10:01:00.000Z',
          },
        ],
        generationJobs: [
          {
            id: 'old_job',
            threadId: 'old_thread',
            prompt: 'Imported prompt',
            requestedCount: 1,
            status: 'succeeded',
            workingDirectory: '/tmp/old-job',
            manifestPath: '/tmp/old-job/manifest.json',
            errorMessage: null,
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            referenceImagesJson: null,
            durationMs: 1000,
            providerThreadId: null,
            providerTurnId: null,
            runtime: 'codex-app-server',
            importedCount: 1,
            createdAt: '2026-06-05T10:02:00.000Z',
            updatedAt: '2026-06-05T10:02:01.000Z',
          },
        ],
        generatedAssets: [
          {
            id: 'old_asset',
            jobId: 'old_job',
            originalPath: '/tmp/old-job/output/image.png',
            storedPath: sourceAssetPath,
            fileName: 'image.png',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
            createdAt: '2026-06-05T10:02:02.000Z',
          },
        ],
        directorChats: [],
        directorMessages: [],
        sceneGroups: [],
        sceneFrames: [],
        sceneFrameReferences: [],
        sceneGroupRuns: [],
        sceneFrameAssets: [],
      },
    });

    const store = await generationModule.createGenerationStore(path.join(userDataDir, 'target'), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const result = await store.importCrenvArchive(archivePath);
      const projects = await store.listProjectsWithThreads();
      const importedProject = projects.find((project) => project.id === result.projectId);
      const importedThread = importedProject?.threads[0];
      const importedImages = importedThread ? await store.listGeneratedImages(importedThread.id) : [];

      expect(result.status).toBe('imported');
      expect(result.scope).toBe('project');
      expect(importedProject).toEqual(
        expect.objectContaining({
          id: expect.not.stringMatching(/^old_project$/),
          name: 'Imported Project',
          systemInstructions: 'Keep it cinematic.',
          artStyle: 'editorial',
        })
      );
      expect(importedThread).toEqual(
        expect.objectContaining({
          id: expect.not.stringMatching(/^old_thread$/),
          name: 'Imported Thread',
          projectId: result.projectId,
        })
      );
      expect(importedImages).toEqual([
        expect.objectContaining({
          id: expect.not.stringMatching(/^old_asset$/),
          fileName: expect.stringMatching(/\.png$/),
          prompt: 'Imported prompt',
        }),
      ]);
    } finally {
      store.close();
    }
  }, 15_000);

  it('rejects invalid .crenv files with a product-level import error', async () => {
    const userDataDir = await makeTempUserDataDir();
    const archivePath = path.join(userDataDir, 'invalid.crenv');
    await fsp.writeFile(archivePath, 'not a zip archive');

    const store = await generationModule.createGenerationStore(path.join(userDataDir, 'target'), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      await expect(store.importCrenvArchive(archivePath)).rejects.toThrow(
        'Selected file is not a valid .crenv export archive.'
      );
    } finally {
      store.close();
    }
  });

  it('imports a thread export archive into a target project', async () => {
    const userDataDir = await makeTempUserDataDir();
    const archivePath = path.join(userDataDir, 'thread-import.crenv');
    await generationModule.__test__.writeExportArchive({
      filePath: archivePath,
      format: 'crenv',
      exportedAt: '2026-06-05T12:00:00.000Z',
      sourceApp: { name: 'crevn', version: '0.1.5' },
      snapshot: {
        scope: 'thread',
        project: {
          id: 'old_project',
          name: 'Source Project',
          systemInstructions: '',
          artStyle: '',
          createdAt: '2026-06-05T10:00:00.000Z',
          updatedAt: '2026-06-05T10:00:00.000Z',
        },
        threads: [
          {
            id: 'old_thread',
            projectId: 'old_project',
            name: 'Imported Thread Only',
            createdAt: '2026-06-05T10:01:00.000Z',
            updatedAt: '2026-06-05T10:01:00.000Z',
          },
        ],
        generationJobs: [],
        generatedAssets: [],
        directorChats: [],
        directorMessages: [],
        sceneGroups: [],
        sceneFrames: [],
        sceneFrameReferences: [],
        sceneGroupRuns: [],
        sceneFrameAssets: [],
      },
    });

    const store = await generationModule.createGenerationStore(path.join(userDataDir, 'target'), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const workspace = await store.createProject('Target Project');
      const result = await store.importCrenvArchive(archivePath, { targetProjectId: workspace.project.id });
      const projects = await store.listProjectsWithThreads();
      const targetProject = projects.find((project) => project.id === workspace.project.id);

      expect(result.status).toBe('imported');
      expect(result.scope).toBe('thread');
      expect(result.projectId).toBe(workspace.project.id);
      expect(targetProject?.threads.some((thread) => thread.name === 'Imported Thread Only')).toBe(true);
    } finally {
      store.close();
    }
  }, 15_000);

  it('imports a reference export archive as a new reference group', async () => {
    const userDataDir = await makeTempUserDataDir();
    const archivePath = path.join(userDataDir, 'reference-import.refc');
    await generationModule.__test__.writeExportArchive({
      filePath: archivePath,
      format: 'refc',
      exportedAt: '2026-06-05T12:00:00.000Z',
      sourceApp: { name: 'crevn', version: '0.1.5' },
      snapshot: {
        scope: 'reference',
        reference: {
          id: 'old_collection',
          title: 'Imported Hero',
          description: 'Imported hero continuity.',
          category: 'characters',
          collectionId: 'old_collection',
          environmentId: null,
          createdAt: '2026-06-05T10:00:00.000Z',
        },
        references: [
          {
            id: 'old_reference_front',
            collectionId: 'old_collection',
            environmentId: null,
            name: 'front.png',
            title: 'Imported Hero',
            description: 'Front view',
            mimeType: 'image/png',
            bytesBase64: Buffer.from('front').toString('base64'),
            createdAt: '2026-06-05T10:01:00.000Z',
            category: 'characters',
          },
          {
            id: 'old_reference_side',
            collectionId: 'old_collection',
            environmentId: null,
            name: 'side.png',
            title: 'Imported Hero',
            description: 'Side view',
            mimeType: 'image/png',
            bytesBase64: Buffer.from('side').toString('base64'),
            createdAt: '2026-06-05T10:02:00.000Z',
            category: 'characters',
          },
        ],
      },
    });

    const store = await generationModule.createGenerationStore(path.join(userDataDir, 'target'), {
      seedCodexSkills: false,
      warmCodexAppServer: false,
    });

    try {
      const result = await store.importReferenceArchive(archivePath);
      const references = await store.listReferences();
      const imported = references.filter((reference) => reference.collectionId === result.collectionId);

      expect(result.status).toBe('imported');
      expect(result.category).toBe('characters');
      expect(result.collectionId).not.toBe('old_collection');
      expect(imported.map((reference) => reference.name).sort()).toEqual(['front.png', 'side.png']);
      expect(imported.every((reference) => reference.id.startsWith('old_reference'))).toBe(false);
    } finally {
      store.close();
    }
  }, 15_000);
});
