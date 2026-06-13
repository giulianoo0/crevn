import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { createGenerationStore } = require('./generation.cjs');

describe('generation store startup', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it('starts with plain Director chat cancellation available as a no-op', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);

    const store = await createGenerationStore(userDataDir);

    expect(await store.cancelDirectorChat('missing-chat')).toBe(false);
    store.close();
  });

  it('streams Director messages through the configured AI SDK runner', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);
    const starts: unknown[] = [];
    const deltas: unknown[] = [];
    const completes: unknown[] = [];
    const capturedMessages: Array<Array<{ role: string; content: string }>> = [];

    const store = await createGenerationStore(userDataDir, {
      createDirectorPartStream: async function* (input: {
        modelId: string;
        messages: Array<{ role: string; content: string }>;
      }) {
        expect(input.modelId).toBe('gemini-3-pro-preview');
        capturedMessages.push(input.messages);
        expect(input.messages).toEqual([
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'Plan a clean reverse angle.' },
        ]);
        yield [{ type: 'text', text: 'First beat. ' }];
        yield [{ type: 'text', text: 'First beat. Second beat.' }];
      },
      onDirectorMessageStart: (payload: unknown) => starts.push(payload),
      onDirectorMessageDelta: (payload: unknown) => deltas.push(payload),
      onDirectorMessageComplete: (payload: unknown) => completes.push(payload),
    });

    const workspace = await store.ensureProjectThreadWorkspace();
    const chat = await store.createDirectorChat(workspace.thread.id);

    const result = await store.sendDirectorMessage({
      chatId: chat.id,
      threadId: workspace.thread.id,
      prompt: 'Plan a clean reverse angle.',
      modelId: 'google-gemini-3-pro',
      referenceImages: [],
    });

    expect(result.assistantMessage).toEqual(
      expect.objectContaining({
        parts: [{ type: 'text', text: 'First beat. Second beat.' }],
        status: 'completed',
        modelId: 'google-gemini-3-pro',
        modelLabel: 'Gemini 3 Pro',
      })
    );
    expect(starts).toHaveLength(1);
    expect(deltas).toHaveLength(2);
    expect(completes).toEqual([
      expect.objectContaining({
        parts: [{ type: 'text', text: 'First beat. Second beat.' }],
      }),
    ]);

    const messages = await store.listDirectorMessages(chat.id);
    expect(messages.at(-1)).toEqual(
      expect.objectContaining({
        parts: [{ type: 'text', text: 'First beat. Second beat.' }],
        status: 'completed',
        modelId: 'google-gemini-3-pro',
      })
    );
    expect(capturedMessages).toHaveLength(1);

    store.close();
  });

  it('normalizes Director provider errors into a user-facing failed message', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);

    const store = await createGenerationStore(userDataDir, {
      createDirectorPartStream: async function* () {
        throw new Error(
          '{"error":{"message":"{\\n  \\"error\\": {\\n    \\"code\\": 503,\\n    \\"message\\": \\"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.\\",\\n    \\"status\\": \\"UNAVAILABLE\\"\\n  }\\n}\\n","code":503,"status":"Service Unavailable"}}'
        );
      },
    });

    const workspace = await store.ensureProjectThreadWorkspace();
    const chat = await store.createDirectorChat(workspace.thread.id);

    await expect(
      store.sendDirectorMessage({
        chatId: chat.id,
        threadId: workspace.thread.id,
        prompt: 'Plan a clean reverse angle.',
        modelId: 'google-gemini-3-pro',
        referenceImages: [],
      })
    ).rejects.toThrow('Gemini is temporarily unavailable due to high demand. Try again in a moment.');

    const messages = await store.listDirectorMessages(chat.id);
    expect(messages.at(-1)).toEqual(
      expect.objectContaining({
        status: 'failed',
        parts: [
          {
            type: 'text',
            text: 'Gemini is temporarily unavailable due to high demand. Try again in a moment.',
          },
        ],
      })
    );

    store.close();
  });

  it('regenerates a Director turn using only the prior chat history and the original user message', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);
    const capturedMessages: Array<Array<{ role: string; content: string }>> = [];

    const store = await createGenerationStore(userDataDir, {
      createDirectorPartStream: async function* (input: {
        modelId: string;
        messages: Array<{ role: string; content: string }>;
      }) {
        capturedMessages.push(input.messages);
        if (capturedMessages.length === 1) {
          yield [{ type: 'text', text: 'First answer.' }];
          return;
        }
        if (capturedMessages.length === 2) {
          yield [{ type: 'text', text: 'Second answer.' }];
          return;
        }
        yield [{ type: 'text', text: 'Second answer regenerated.' }];
      },
    });

    const workspace = await store.ensureProjectThreadWorkspace();
    const chat = await store.createDirectorChat(workspace.thread.id);

    await store.sendDirectorMessage({
      chatId: chat.id,
      threadId: workspace.thread.id,
      prompt: 'Plan the establishing frame.',
      modelId: 'google-gemini-3-pro',
      referenceImages: [],
    });

    const secondTurn = await store.sendDirectorMessage({
      chatId: chat.id,
      threadId: workspace.thread.id,
      prompt: 'Now tighten the reverse angle.',
      modelId: 'google-gemini-3-pro',
      referenceImages: [],
    });

    await store.regenerateDirectorMessage({
      chatId: chat.id,
      threadId: workspace.thread.id,
      assistantMessageId: secondTurn.assistantMessage.id,
    });
    const regeneratedMessages = await store.listDirectorMessages(chat.id);

    expect(capturedMessages).toEqual([
      [
        expect.objectContaining({ role: 'system' }),
        { role: 'user', content: 'Plan the establishing frame.' },
      ],
      [
        expect.objectContaining({ role: 'system' }),
        { role: 'user', content: 'Plan the establishing frame.' },
        { role: 'assistant', content: 'First answer.' },
        { role: 'user', content: 'Now tighten the reverse angle.' },
      ],
      [
        expect.objectContaining({ role: 'system' }),
        { role: 'user', content: 'Plan the establishing frame.' },
        { role: 'assistant', content: 'First answer.' },
        { role: 'user', content: 'Now tighten the reverse angle.' },
      ],
    ]);
    expect(regeneratedMessages).toHaveLength(4);
    expect(regeneratedMessages[3]).toEqual(
      expect.objectContaining({
        id: secondTurn.assistantMessage.id,
        role: 'assistant',
        parts: [{ type: 'text', text: 'Second answer regenerated.' }],
      })
    );

    store.close();
  });

  it('runs Codex image generation, imports returned files, and stores Codex metadata', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);
    const imageReadyEvents: unknown[] = [];
    const runImageGenerationBatch = vi.fn(async (input: {
      outputDirectory: string;
      references: Array<{ bytesBase64: string; mimeType: string; name: string }>;
      model: string;
      count: number;
      prompt: string;
      onImageUpdated?: (payload: {
        run: number;
        savedPath: string;
        benchmark: {
          requestStartedAt: string | null;
          firstEventAt: string | null;
          imageToolCallStartedAt: string | null;
          imageToolGeneratingAt: string | null;
          firstPartialImageAt: string | null;
          completedAt: string | null;
        };
      }) => Promise<void>;
    }) => {
      const firstPreviewPath = path.join(input.outputDirectory, 'codex-1-preview.png');
      const firstPath = path.join(input.outputDirectory, 'codex-1.png');
      const secondPath = path.join(input.outputDirectory, 'codex-2.png');
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';

      expect(input.model).toBe('gpt-5.4');
      expect(input.count).toBe(2);
      expect(input.prompt).toContain('Aspect ratio: 16:9');
      expect(input.references).toHaveLength(1);
      expect(input.references[0]?.name).toBe('hero-face.png');
      expect(input.references[0]?.mimeType).toBe('image/png');
      expect(input.references[0]?.bytesBase64).toBe(pngBase64);

      await fs.mkdir(input.outputDirectory, { recursive: true });
      await fs.writeFile(firstPreviewPath, Buffer.from(pngBase64, 'base64'));
      await fs.writeFile(firstPath, Buffer.from(pngBase64, 'base64'));
      await fs.writeFile(secondPath, Buffer.from(pngBase64, 'base64'));

      await input.onImageUpdated?.({
        run: 1,
        savedPath: firstPreviewPath,
        benchmark: {
          requestStartedAt: '2026-06-09T12:00:00.000Z',
          firstEventAt: '2026-06-09T12:00:01.000Z',
          imageToolCallStartedAt: '2026-06-09T12:00:02.000Z',
          imageToolGeneratingAt: '2026-06-09T12:00:03.000Z',
          firstPartialImageAt: '2026-06-09T12:00:04.000Z',
          completedAt: null,
        },
      });
      await input.onImageUpdated?.({
        run: 1,
        savedPath: firstPath,
        benchmark: {
          requestStartedAt: '2026-06-09T12:00:00.000Z',
          firstEventAt: '2026-06-09T12:00:01.000Z',
          imageToolCallStartedAt: '2026-06-09T12:00:02.000Z',
          imageToolGeneratingAt: '2026-06-09T12:00:03.000Z',
          firstPartialImageAt: '2026-06-09T12:00:04.000Z',
          completedAt: '2026-06-09T12:00:05.000Z',
        },
      });
      await input.onImageUpdated?.({
        run: 2,
        savedPath: secondPath,
        benchmark: {
          requestStartedAt: '2026-06-09T12:00:00.500Z',
          firstEventAt: '2026-06-09T12:00:01.500Z',
          imageToolCallStartedAt: '2026-06-09T12:00:02.500Z',
          imageToolGeneratingAt: '2026-06-09T12:00:03.500Z',
          firstPartialImageAt: '2026-06-09T12:00:04.500Z',
          completedAt: '2026-06-09T12:00:05.500Z',
        },
      });

      return {
        wallClockMs: 4567,
        results: [
          {
            run: 1,
            durationMs: 2123,
            exitCode: 0,
            savedPath: firstPath,
            finalMessage: firstPath,
            stdoutPath: path.join(input.outputDirectory, 'run-1-stdout.jsonl'),
            stderrPath: path.join(input.outputDirectory, 'run-1-stderr.txt'),
            failed: false,
          },
          {
            run: 2,
            durationMs: 2444,
            exitCode: 0,
            savedPath: secondPath,
            finalMessage: secondPath,
            stdoutPath: path.join(input.outputDirectory, 'run-2-stdout.jsonl'),
            stderrPath: path.join(input.outputDirectory, 'run-2-stderr.txt'),
            failed: false,
          },
        ],
      };
    });

    const store = await createGenerationStore(userDataDir, {
      runImageGenerationBatch,
      onImageReady: (payload: unknown) => imageReadyEvents.push(payload),
    });

    const workspace = await store.ensureProjectThreadWorkspace();
    const result = await store.generateImages({
      threadId: workspace.thread.id,
      provider: 'codex',
      modelId: 'codex-gpt-5-4-mini',
      prompt: 'Hero portrait\nAspect ratio: 16:9',
      count: 2,
      referenceImages: [
        {
          name: 'hero-face.png',
          title: 'RefImage1',
          description: 'Main character face reference.',
          mimeType: 'image/png',
          bytesBase64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=',
        },
      ],
    });

    expect(runImageGenerationBatch).toHaveBeenCalledTimes(1);
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0]?.modelId).toBe('codex-gpt-5-4-mini');
    expect(result.assets[0]?.modelLabel).toBe('GPT-5.4 Mini');
    expect(result.assets[0]?.provider).toBe('codex');
    expect(result.assets[0]?.durationMs).toBe(4567);
    expect(imageReadyEvents).toHaveLength(3);
    expect((imageReadyEvents[0] as { asset: { id: string } }).asset.id).toBe(
      (imageReadyEvents[1] as { asset: { id: string } }).asset.id
    );
    expect((imageReadyEvents[0] as { asset: { id: string } }).asset.id).not.toBe(
      (imageReadyEvents[2] as { asset: { id: string } }).asset.id
    );

    const generated = await store.listGeneratedImages(workspace.thread.id);
    expect(generated).toHaveLength(2);
    expect(generated.every((image: { provider?: string | null; modelId?: string | null }) => image.provider === 'codex')).toBe(
      true
    );
    expect(generated.every((image: { fileUrl?: string }) => image.fileUrl?.startsWith('crenv-asset://generated?path='))).toBe(true);
    expect(generated.every((image: { durationMs?: number | null }) => image.durationMs === 4567)).toBe(true);

    const loggedMessages = consoleInfoSpy.mock.calls.map((call) =>
      call
        .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
        .join(' ')
    );
    expect(loggedMessages.some((line) => line.includes('[crenv:generation] starting image job'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('reference[1]') && line.includes('hero-face.png'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('stored preview asset') || line.includes('updated preview asset'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('image job completed'))).toBe(true);

    consoleInfoSpy.mockRestore();

    store.close();
  });

  it('approves a Director generateImages tool call through the app generation path', async () => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crenv-generation-startup-'));
    tempDirs.push(userDataDir);
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';
    const imageReadyEvents: unknown[] = [];

    const runImageGenerationBatch = vi.fn(async (input: {
      outputDirectory: string;
      count: number;
      prompt: string;
    }) => {
      const imagePath = path.join(input.outputDirectory, 'approved.png');
      await fs.mkdir(input.outputDirectory, { recursive: true });
      await fs.writeFile(imagePath, Buffer.from(pngBase64, 'base64'));
      return {
        wallClockMs: 789,
        results: [
          {
            run: 1,
            durationMs: 789,
            exitCode: 0,
            savedPath: imagePath,
            finalMessage: imagePath,
            stdoutPath: path.join(input.outputDirectory, 'run-1-stdout.jsonl'),
            stderrPath: path.join(input.outputDirectory, 'run-1-stderr.txt'),
            failed: false,
          },
        ],
      };
    });

    const store = await createGenerationStore(userDataDir, {
      onImageReady: (event: unknown) => {
        imageReadyEvents.push(event);
      },
      runImageGenerationBatch,
      createDirectorPartStream: async function* () {
        yield [
          { type: 'text', text: 'Ready to generate the selected frame.' },
          {
            type: 'tool-generateImages',
            toolCallId: 'tool-generate-images-1',
            approvalId: 'approval_tool-generate-images-1',
            state: 'approval-requested',
            input: {
              prompt: 'Medium close shot in the garage.',
              count: 1,
              aspectRatio: '16:9',
              references: [],
            },
          },
        ];
      },
    });

    const workspace = await store.ensureProjectThreadWorkspace();
    const chat = await store.createDirectorChat(workspace.thread.id);
    const sent = await store.sendDirectorMessage({
      chatId: chat.id,
      threadId: workspace.thread.id,
      prompt: 'Generate the garage shot.',
      modelId: 'google-gemini-3-pro',
      referenceImages: [],
    });

    const approved = await store.approveDirectorAction({
      messageId: sent.assistantMessage.id,
      actionIndex: 0,
      clientRunId: 'director-run-1',
    });

    expect(runImageGenerationBatch).toHaveBeenCalledTimes(1);
    expect(runImageGenerationBatch.mock.calls[0]?.[0].prompt).toContain('Aspect ratio: 16:9');
    expect(approved).toEqual(
      expect.objectContaining({
        parts: expect.arrayContaining([
          expect.objectContaining({
            type: 'tool-generateImages',
            state: 'output-available',
          }),
        ]),
      })
    );

    const generated = await store.listGeneratedImages(workspace.thread.id);
    expect(generated).toHaveLength(1);
    expect(generated[0]?.fileName).toMatch(/\.png$/);
    expect(generated[0]?.fileUrl).toContain('crenv-asset://generated?path=');
    expect(imageReadyEvents).toEqual([
      expect.objectContaining({
        clientRunId: 'director-run-1',
        threadId: workspace.thread.id,
      }),
    ]);

    store.close();
  });
});
