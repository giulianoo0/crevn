const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const readline = require('node:readline');

const DEFAULT_CLIENT_INFO = {
  name: 'crenv',
  title: 'Crenv',
  version: '0.1.0',
};

const TRACE_APP_SERVER_RAW = process.env.CRENV_CODEX_APP_SERVER_TRACE === '1';
const TRACE_APP_SERVER_EVENTS = process.env.CRENV_CODEX_APP_SERVER_TRACE === '1';

function createCodexAppServerClient(options = {}) {
  const spawnProcess =
    options.spawnProcess ??
    (() =>
      spawn('codex', ['app-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      }));
  const clientInfo = options.clientInfo ?? DEFAULT_CLIENT_INFO;
  const events = new EventEmitter();
  const pendingRequests = new Map();

  let child = null;
  let readlineInterface = null;
  let stderrReadlineInterface = null;
  let nextRequestId = 1;
  let started = false;
  let startPromise = null;
  let closed = false;

  async function start() {
    if (started) {
      return;
    }
    if (startPromise) {
      return startPromise;
    }

    startPromise = startProcess().catch((error) => {
      startPromise = null;
      throw error;
    });
    return startPromise;
  }

  async function startProcess() {
    child = spawnProcess();
    console.info('[crenv:codex-app-server] spawn: codex app-server');
    closed = false;
    readlineInterface = readline.createInterface({ input: child.stdout });
    stderrReadlineInterface = readline.createInterface({ input: child.stderr });
    readlineInterface.on('line', handleLine);
    stderrReadlineInterface.on('line', handleStderrLine);
    child.on('exit', handleExit);
    child.on('error', handleError);

    await request('initialize', { clientInfo });
    notify('initialized', {});
    started = true;
    startPromise = null;
  }

  function request(method, params = {}) {
    if (!child || closed) {
      return Promise.reject(new Error('Codex app-server is not running.'));
    }

    const id = nextRequestId++;
    const message = { id, method, params };
    console.info(`[crenv:codex-app-server] request ${id}: ${method}${summarizeParams(params)}`);
    const promise = new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
    });
    send(message);
    return promise;
  }

  function notify(method, params = {}) {
    if (!child || closed) {
      throw new Error('Codex app-server is not running.');
    }
    console.info(`[crenv:codex-app-server] notify: ${method}`);
    send({ method, params });
  }

  function onNotification(listener) {
    events.on('notification', listener);
    return () => events.off('notification', listener);
  }

  function send(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function handleLine(line) {
    if (!line.trim()) {
      return;
    }

    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      events.emit('error', error);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, 'id')) {
      const pending = pendingRequests.get(message.id);
      if (!pending) {
        console.warn(`[crenv:codex-app-server] response ${message.id}: no pending request`);
        return;
      }
      pendingRequests.delete(message.id);
      if (message.error) {
        console.error(
          `[crenv:codex-app-server] response ${message.id}: error ${summarizeError(message.error)}`
        );
        pending.reject(new Error(message.error.message ?? String(message.error)));
      } else {
        console.info(`[crenv:codex-app-server] response ${message.id}: ok${summarizeResult(message.result)}`);
        pending.resolve(message.result);
      }
      return;
    }

    if (message.method && (TRACE_APP_SERVER_EVENTS || !isHighVolumeNotification(message.method))) {
      console.info(`[crenv:codex-app-server] event: ${message.method}${summarizeNotification(message)}`);
      if (TRACE_APP_SERVER_RAW) {
        console.info(`[crenv:codex-app-server] raw: ${truncate(JSON.stringify(message), 4000)}`);
      }
    }
    events.emit('notification', message);
  }

  function handleStderrLine(line) {
    if (!line.trim()) {
      return;
    }
    console.warn(`[crenv:codex-app-server] stderr: ${truncate(line.trim(), 1200)}`);
  }

  function handleExit(code, signal) {
    closed = true;
    started = false;
    startPromise = null;
    const suffix = signal ? ` with signal ${signal}` : ` with code ${code ?? 'unknown'}`;
    console.warn(`[crenv:codex-app-server] exit${suffix}`);
    const error = new Error(`Codex app-server exited${suffix}.`);
    rejectPending(error);
    events.emit('exit', { code, signal });
  }

  function handleError(error) {
    closed = true;
    started = false;
    startPromise = null;
    console.error(`[crenv:codex-app-server] process error: ${error.message}`);
    rejectPending(error);
    events.emit('error', error);
  }

  function rejectPending(error) {
    for (const pending of pendingRequests.values()) {
      pending.reject(error);
    }
    pendingRequests.clear();
  }

  function dispose() {
    readlineInterface?.close();
    readlineInterface = null;
    stderrReadlineInterface?.close();
    stderrReadlineInterface = null;
    if (child && !child.killed) {
      child.kill();
    }
    child = null;
    closed = true;
    started = false;
    startPromise = null;
    rejectPending(new Error('Codex app-server client disposed.'));
  }

  return {
    start,
    request,
    notify,
    onNotification,
    dispose,
    startThread(params = {}) {
      return request('thread/start', params);
    },
    resumeThread(threadId) {
      return request('thread/resume', { threadId });
    },
    startTurn(params) {
      return request('turn/start', params);
    },
    interruptTurn(threadId, turnId) {
      return request('turn/interrupt', { threadId, turnId });
    },
    listModels(params = {}) {
      return request('model/list', params);
    },
    unsubscribeThread(threadId) {
      return request('thread/unsubscribe', { threadId });
    },
  };
}

function isHighVolumeNotification(method) {
  return (
    method === 'item/agentMessage/delta' ||
    method === 'item/commandExecution/outputDelta' ||
    method === 'item/reasoning/delta'
  );
}

function summarizeParams(params = {}) {
  const parts = [];
  if (params.threadId) parts.push(`thread=${params.threadId}`);
  if (params.cwd) parts.push(`cwd=${params.cwd}`);
  if (params.model) parts.push(`model=${params.model}`);
  if (params.serviceTier) parts.push(`tier=${params.serviceTier}`);
  if (params.approvalPolicy) parts.push(`approval=${params.approvalPolicy}`);
  const sandbox = params.sandbox ?? params.sandboxPolicy?.type;
  if (sandbox) parts.push(`sandbox=${sandbox}`);
  const inputLength = getInputTextLength(params.input);
  if (inputLength > 0) parts.push(`inputChars=${inputLength}`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function summarizeResult(result = {}) {
  if (!result || typeof result !== 'object') {
    return '';
  }
  const parts = [];
  const thread = result.thread;
  const turn = result.turn;
  if (thread?.id) parts.push(`thread=${thread.id}`);
  if (thread?.runtimeStatus) parts.push(`threadStatus=${thread.runtimeStatus}`);
  if (turn?.id) parts.push(`turn=${turn.id}`);
  if (turn?.status) parts.push(`status=${turn.status}`);
  if (Array.isArray(result.models)) parts.push(`models=${result.models.length}`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function summarizeNotification(message) {
  const params = message.params ?? {};
  const parts = [];
  if (params.threadId) parts.push(`thread=${params.threadId}`);
  if (params.turnId) parts.push(`turn=${params.turnId}`);
  if (params.turn?.id && !params.turnId) parts.push(`turn=${params.turn.id}`);
  if (params.turn?.status) parts.push(`status=${params.turn.status}`);
  const item = params.item ?? params.completedItem ?? params.startedItem;
  const itemId = params.itemId ?? item?.id;
  const itemType = item?.type ?? item?.kind ?? item?.itemType;
  if (itemId) parts.push(`item=${itemId}`);
  if (itemType) parts.push(`itemType=${itemType}`);
  const delta = params.delta ?? params.outputDelta ?? params.chunk;
  if (typeof delta === 'string') parts.push(`deltaChars=${delta.length}`);
  const outputText = getItemTextLength(item);
  if (outputText > 0) parts.push(`itemTextChars=${outputText}`);
  const errorMessage = summarizeError(params.error ?? params.turn?.error ?? params.errorMessage);
  if (errorMessage) parts.push(`error=${errorMessage}`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function summarizeError(error) {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return truncate(error, 240);
  }
  if (typeof error === 'object') {
    return truncate(error.message ?? error.code ?? JSON.stringify(error), 240);
  }
  return truncate(String(error), 240);
}

function getInputTextLength(input) {
  if (!Array.isArray(input)) {
    return 0;
  }
  return input.reduce((sum, item) => sum + (typeof item?.text === 'string' ? item.text.length : 0), 0);
}

function getItemTextLength(item) {
  if (!item || typeof item !== 'object') {
    return 0;
  }
  const direct = [item.text, item.contentMarkdown, item.markdown, item.outputText, item.message]
    .filter((value) => typeof value === 'string')
    .join('');
  if (direct.length > 0) {
    return direct.length;
  }
  if (!Array.isArray(item.content)) {
    return 0;
  }
  return item.content.reduce((sum, part) => {
    if (typeof part === 'string') return sum + part.length;
    return (
      sum +
      [part?.text, part?.content, part?.markdown, part?.outputText]
        .filter((value) => typeof value === 'string')
        .join('').length
    );
  }, 0);
}

function truncate(value, maxLength) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

module.exports = {
  createCodexAppServerClient,
};
