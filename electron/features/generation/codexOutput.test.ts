import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { runImageGenerationBatch } = require('./codexOutput.cjs');

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'crenv-codex-output-')).then((tempDir) => {
    tempDirs.push(tempDir);
    return tempDir;
  });
}

function createCookieHeaders(cookies: string[]) {
  return {
    getSetCookie: () => cookies,
  };
}

function createSseResponse(lines: string[]) {
  const encoder = new TextEncoder();
  return {
    ok: true,
    headers: createCookieHeaders([]),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines.join('\n')));
        controller.close();
      },
    }),
  };
}

describe('runImageGenerationBatch', () => {
  it('uses ChatGPT codex responses SSE, attaches references as input_image, and saves streamed partial images', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const workingDirectory = await createTempDir();
    const outputDirectory = path.join(workingDirectory, 'output');
    const artifactsDirectory = path.join(workingDirectory, 'artifacts');

    const requests: Array<{ url: string; headers?: Record<string, string>; body?: string }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      requests.push({
        url,
        headers: init?.headers,
        body: init?.body,
      });

      if (url === 'https://chatgpt.com/' || url === 'https://chat.openai.com/') {
        return {
          ok: true,
          headers: createCookieHeaders([url.includes('chatgpt.com') ? 'cf_clearance=abc123; Path=/;' : '__Secure-next-auth.session-token=xyz789; Path=/;']),
          body: null,
        };
      }

      expect(url).toBe('https://chatgpt.com/backend-api/codex/responses');
      expect(init?.method).toBe('POST');
      expect(init?.headers?.Authorization).toBe('Bearer access-token-123');
      expect(init?.headers?.['ChatGPT-Account-ID']).toBe('account-456');
      expect(init?.headers?.Accept).toBe('text/event-stream');
      expect(init?.headers?.Cookie).toContain('cf_clearance=abc123');
      expect(init?.headers?.Cookie).toContain('__Secure-next-auth.session-token=xyz789');

      const payload = JSON.parse(init?.body ?? '{}');
      expect(payload.model).toBe('gpt-5.4');
      expect(payload.tools).toEqual([{ type: 'image_generation' }]);
      expect(payload.stream).toBe(true);
      expect(payload.store).toBe(false);
      expect(payload.input[0]?.content).toEqual([
        {
          type: 'input_text',
          text: expect.stringContaining('Generate a happy dog image.'),
        },
        {
          type: 'input_image',
          image_url: `data:image/png;base64,${PNG_BASE64}`,
        },
      ]);

      return createSseResponse([
        'event: response.created',
        'data: {"id":"resp_123"}',
        '',
        'event: response.image_generation_call.in_progress',
        'data: {"id":"ig_1"}',
        '',
        'event: response.image_generation_call.generating',
        'data: {"id":"ig_1"}',
        '',
        `event: response.image_generation_call.partial_image`,
        `data: {"id":"ig_1","partial_image_b64":"${PNG_BASE64}"}`,
        '',
        'event: response.completed',
        'data: {"id":"resp_123","status":"completed"}',
        '',
      ]);
    });

    const imageUpdates: Array<{ run: number; savedPath: string; benchmark: Record<string, string | null> }> = [];

    const result = await runImageGenerationBatch({
      workingDirectory,
      outputDirectory,
      artifactsDirectory,
      model: 'gpt-5.4',
      prompt: 'Generate a happy dog image.',
      count: 1,
      auth: {
        accessToken: 'access-token-123',
        accountId: 'account-456',
        isFedrampAccount: false,
      },
      references: [
        {
          name: 'reference.png',
          mimeType: 'image/png',
          bytesBase64: PNG_BASE64,
        },
      ],
      fetchImpl,
      onImageUpdated: async (update: { run: number; savedPath: string; benchmark: Record<string, string | null> }) => {
        imageUpdates.push(update);
      },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(requests).toHaveLength(3);
    expect(imageUpdates).toHaveLength(2);
    expect(imageUpdates[0]?.run).toBe(1);
    expect(imageUpdates[0]?.benchmark.firstEventAt).toBeTruthy();
    expect(imageUpdates[0]?.benchmark.imageToolCallStartedAt).toBeTruthy();
    expect(imageUpdates[0]?.benchmark.imageToolGeneratingAt).toBeTruthy();
    expect(imageUpdates[0]?.benchmark.firstPartialImageAt).toBeTruthy();
    expect(imageUpdates[1]?.benchmark.completedAt).toBeTruthy();

    const savedFile = await fs.readFile(imageUpdates[0].savedPath);
    expect(savedFile.toString('base64')).toBe(PNG_BASE64);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.failed).toBe(false);
    expect(result.results[0]?.savedPath).toBe(imageUpdates[0]?.savedPath);
    expect(result.results[0]?.benchmark.completedAt).toBeTruthy();

    const loggedMessages = consoleInfoSpy.mock.calls.map((call) =>
      call
        .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
        .join(' ')
    );
    expect(loggedMessages.some((line) => line.includes('[crenv:codex-image] run 1 start'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('"references":1'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('reference[1]') && line.includes('reference.png'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('cookie prime') && line.includes('chatgpt.com'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('POST /backend-api/codex/responses'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('SSE response.image_generation_call.partial_image'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('saved partial image'))).toBe(true);
    expect(loggedMessages.some((line) => line.includes('completed') && line.includes('duration_ms'))).toBe(true);

    consoleInfoSpy.mockRestore();
  });
});
