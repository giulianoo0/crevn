import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { runDirectorAppServerTurn } = require('./directorAppServerRuntime.cjs');

class FakeAppServerClient {
  events = new EventEmitter();
  start = vi.fn(async () => undefined);
  startThread = vi.fn(async () => ({ thread: { id: 'provider-thread-1' } }));
  resumeThread = vi.fn(async (threadId: string) => ({ thread: { id: threadId } }));
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

describe('Director app-server runtime', () => {
  it('starts a provider thread and streams assistant deltas', async () => {
    const client = new FakeAppServerClient();
    const onProviderThread = vi.fn();
    const onTurnStarted = vi.fn();
    const onDelta = vi.fn();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: null,
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: true,
      prompt: 'Plan a six-shot scene.',
      onProviderThread,
      onTurnStarted,
      onDelta,
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());

    client.notify({
      method: 'item/agentMessage/delta',
      params: {
        threadId: 'provider-thread-1',
        turnId: 'turn-1',
        itemId: 'item-1',
        delta: 'First beat.',
      },
    });
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'provider-thread-1',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await expect(runPromise).resolves.toEqual({
      success: true,
      canceled: false,
      output: 'First beat.',
      providerThreadId: 'provider-thread-1',
      providerTurnId: 'turn-1',
    });
    expect(client.startThread).toHaveBeenCalledWith({
      cwd: '/tmp/director-job',
      approvalPolicy: 'never',
      sandbox: 'workspace-write',
      model: 'gpt-5.4-mini',
      serviceTier: 'fast',
    });
    expect(client.startTurn).toHaveBeenCalledWith({
      threadId: 'provider-thread-1',
      input: [{ type: 'text', text: 'Plan a six-shot scene.' }],
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'workspaceWrite' },
      model: 'gpt-5.4-mini',
      serviceTier: 'fast',
    });
    expect(onProviderThread).toHaveBeenCalledWith('provider-thread-1');
    expect(onTurnStarted).toHaveBeenCalledWith('turn-1');
    expect(onDelta).toHaveBeenCalledWith('First beat.', 'First beat.', {
      itemId: 'item-1',
      providerThreadId: 'provider-thread-1',
      providerTurnId: 'turn-1',
    });
  });

  it('resumes an existing provider thread', async () => {
    const client = new FakeAppServerClient();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: 'existing-thread',
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: false,
      prompt: 'Continue.',
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'existing-thread',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await runPromise;
    expect(client.resumeThread).toHaveBeenCalledWith('existing-thread');
    expect(client.startThread).not.toHaveBeenCalled();
    expect(client.startTurn).toHaveBeenCalledWith({
      threadId: 'existing-thread',
      input: [{ type: 'text', text: 'Continue.' }],
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'workspaceWrite' },
      model: 'gpt-5.4-mini',
    });
  });

  it('uses completed assistant item content when no text deltas are emitted', async () => {
    const client = new FakeAppServerClient();
    const onDelta = vi.fn();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: 'existing-thread',
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: false,
      prompt: 'Continue.',
      onDelta,
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());
    client.notify({
      method: 'item/completed',
      params: {
        threadId: 'existing-thread',
        turnId: 'turn-1',
        item: {
          id: 'item-1',
          type: 'agentMessage',
          text: 'Completed item answer.',
        },
      },
    });
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'existing-thread',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: true,
      output: 'Completed item answer.',
      providerThreadId: 'existing-thread',
      providerTurnId: 'turn-1',
    });
    expect(onDelta).toHaveBeenCalledWith('Completed item answer.', 'Completed item answer.', {
      itemId: 'item-1',
      providerThreadId: 'existing-thread',
      providerTurnId: 'turn-1',
    });
  });

  it('marks completed turns with no assistant output as failed', async () => {
    const client = new FakeAppServerClient();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: 'existing-thread',
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: false,
      prompt: 'Continue.',
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'existing-thread',
        turn: { id: 'turn-1', status: 'completed' },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: false,
      canceled: false,
      output: '',
      errorMessage: 'Director completed without assistant output.',
    });
  });

  it('surfaces failed turn status details', async () => {
    const client = new FakeAppServerClient();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: 'existing-thread',
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: false,
      prompt: 'Continue.',
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'existing-thread',
        turn: { id: 'turn-1', status: 'failed', error: { message: 'model rejected input' } },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: false,
      canceled: false,
      output: '',
      errorMessage: 'model rejected input',
    });
  });

  it('marks interrupted turns as canceled', async () => {
    const client = new FakeAppServerClient();

    const runPromise = runDirectorAppServerTurn({
      client,
      providerThreadId: 'existing-thread',
      cwd: '/tmp/director-job',
      model: 'gpt-5.4-mini',
      fastMode: false,
      prompt: 'Continue.',
    });

    await vi.waitFor(() => expect(client.startTurn).toHaveBeenCalled());
    client.notify({
      method: 'turn/completed',
      params: {
        threadId: 'existing-thread',
        turn: { id: 'turn-1', status: 'interrupted' },
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      success: false,
      canceled: true,
      providerThreadId: 'existing-thread',
      providerTurnId: 'turn-1',
    });
  });
});
