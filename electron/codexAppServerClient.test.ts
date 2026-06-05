import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createCodexAppServerClient } = require('./codexAppServerClient.cjs');

class FakeProcess extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  killed = false;
  sent: unknown[] = [];

  constructor() {
    super();
    this.stdin.on('data', (chunk) => {
      for (const line of chunk.toString('utf8').split('\n')) {
        if (line.trim()) {
          this.sent.push(JSON.parse(line));
        }
      }
    });
  }

  kill() {
    this.killed = true;
    this.emit('exit', 0, null);
    return true;
  }

  server(message: unknown) {
    this.stdout.write(`${JSON.stringify(message)}\n`);
  }
}

describe('codex app-server client', () => {
  it('initializes over newline-delimited stdio', async () => {
    const fake = new FakeProcess();
    const client = createCodexAppServerClient({
      spawnProcess: () => fake,
      clientInfo: { name: 'crenv-test', title: 'Crenv Test', version: '0.0.0' },
    });

    const startPromise = client.start();
    fake.server({ id: 1, result: { ok: true } });
    await startPromise;

    expect(fake.sent).toEqual([
      {
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: { name: 'crenv-test', title: 'Crenv Test', version: '0.0.0' },
        },
      },
      { method: 'initialized', params: {} },
    ]);
  });

  it('resolves requests and dispatches notifications', async () => {
    const fake = new FakeProcess();
    const client = createCodexAppServerClient({ spawnProcess: () => fake });
    const notifications: unknown[] = [];

    const startPromise = client.start();
    fake.server({ id: 1, result: {} });
    await startPromise;
    client.onNotification((message: unknown) => notifications.push(message));

    const requestPromise = client.request('thread/start', { model: 'gpt-5.4-mini' });
    fake.server({ method: 'thread/status/changed', params: { threadId: 'thread-1' } });
    fake.server({ id: 2, result: { thread: { id: 'thread-1' } } });

    await expect(requestPromise).resolves.toEqual({ thread: { id: 'thread-1' } });
    expect(notifications).toEqual([{ method: 'thread/status/changed', params: { threadId: 'thread-1' } }]);
    expect(fake.sent.at(-1)).toEqual({
      id: 2,
      method: 'thread/start',
      params: { model: 'gpt-5.4-mini' },
    });
  });

  it('parses stdout chunks that contain multiple JSON lines', async () => {
    const fake = new FakeProcess();
    const client = createCodexAppServerClient({ spawnProcess: () => fake });
    const seen: unknown[] = [];

    const startPromise = client.start();
    fake.stdout.write(`${JSON.stringify({ id: 1, result: {} })}\n${JSON.stringify({ method: 'ready', params: {} })}\n`);
    await startPromise;
    client.onNotification((message: unknown) => seen.push(message));
    fake.server({ method: 'second', params: { ok: true } });

    expect(seen).toEqual([{ method: 'second', params: { ok: true } }]);
  });

  it('rejects pending requests when the process exits', async () => {
    const fake = new FakeProcess();
    const client = createCodexAppServerClient({ spawnProcess: () => fake });

    const startPromise = client.start();
    fake.server({ id: 1, result: {} });
    await startPromise;

    const requestPromise = client.request('thread/start', {});
    fake.emit('exit', 1, null);

    await expect(requestPromise).rejects.toThrow('Codex app-server exited');
  });

  it('sends lifecycle helper requests', async () => {
    const fake = new FakeProcess();
    const client = createCodexAppServerClient({ spawnProcess: () => fake });

    const startPromise = client.start();
    fake.server({ id: 1, result: {} });
    await startPromise;

    const threadPromise = client.startThread({ model: 'gpt-5.4-mini' });
    fake.server({ id: 2, result: { thread: { id: 'thread-1' } } });
    await threadPromise;

    const turnPromise = client.startTurn({ threadId: 'thread-1', input: [{ type: 'text', text: 'Hi' }] });
    fake.server({ id: 3, result: { turn: { id: 'turn-1' } } });
    await turnPromise;

    const interruptPromise = client.interruptTurn('thread-1', 'turn-1');
    fake.server({ id: 4, result: {} });
    await interruptPromise;

    expect(fake.sent.slice(2)).toEqual([
      { id: 2, method: 'thread/start', params: { model: 'gpt-5.4-mini' } },
      { id: 3, method: 'turn/start', params: { threadId: 'thread-1', input: [{ type: 'text', text: 'Hi' }] } },
      { id: 4, method: 'turn/interrupt', params: { threadId: 'thread-1', turnId: 'turn-1' } },
    ]);
  });
});
