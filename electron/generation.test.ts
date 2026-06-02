import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

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
  });

  it('builds a strict JSON prompt for scene structuring', () => {
    const prompt = generationModule.__test__.buildCodexSceneStructuringPrompt(
      'Cena em português com prompts mistos'
    );

    expect(prompt).toContain('Return exactly one JSON object and nothing else.');
    expect(prompt).toContain('"sceneDescription"');
    expect(prompt).toContain('"frames"');
    expect(prompt).toContain('All output text must be in English.');
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
    expect(tasks[1]?.prompt).not.toContain('Previous frame context:');
    expect(tasks[1]?.prompt).not.toContain('Next frame context:');
    expect(tasks[1]?.prompt).not.toContain('Full sequence context:');
  });

  it('builds a Director prompt grounded in project, thread, history, and staged references', () => {
    const prompt = generationModule.__test__.buildDirectorChatPrompt({
      projectName: 'Orbit Kids',
      threadName: 'Episode 2 / Hangar',
      systemInstructions: 'Keep continuity precise and production-ready.',
      artStyle: 'Stylized animated series.',
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
    expect(prompt).toContain('title: Hangar reference; description: Main environment plate');
    expect(prompt).toContain('User: Draft a coverage approach.');
    expect(prompt).toContain('Assistant: Start from a wide and move into reverses.');
    expect(prompt).toContain('User: Now turn that into a six-shot plan.');
    expect(prompt).toContain('@Reference');
    expect(prompt).toContain('```markdown');
    expect(prompt).toContain('copyable markdown code block');
  });

  it('truncates Director chat titles from the opening prompt line', () => {
    const title = generationModule.__test__.truncateDirectorChatTitle(
      'Build a shot list for the hangar chase with emphasis on reverses and inserts.\nSecond line.'
    );

    expect(title).toBe('Build a shot list for the hangar chase with emphasis on…');
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
});
