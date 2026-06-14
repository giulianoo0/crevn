import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { CSSProperties, ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App, getReferenceMentionReplacementRange } from './App';
import { COMPOSER_SHELL_MOTION } from './lib/composer-motion';
import * as electronApi from './lib/electron-api';
import * as errors from './lib/errors';
import { toast } from 'sonner';

const renderCounters = vi.hoisted(() => ({
  projectRow: 0,
  threadRow: 0,
}));

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0nX6sAAAAASUVORK5CYII=';

let scenePlanListener:
  | ((event: { jobId: string; clientRunId?: string; threadId: string; count: number; applyToShimmers: boolean }) => void)
  | null = null;
let sceneFrameReadyListener:
  | ((event: { threadId: string; sceneGroupId: string; frameId: string }) => void)
  | null = null;
let directorSceneReadyListener:
  | ((event: { threadId: string; sceneGroupId: string }) => void)
  | null = null;
let imageReadyListener:
  | ((event: { jobId: string; clientRunId?: string; threadId: string; asset: Record<string, unknown> }) => void)
  | null = null;
let updateStatusListener:
  | ((event: { state: string; message: string; version: string | null; percent: number | null; errorMessage: string | null }) => void)
  | null = null;
let directorMessageStartListener:
  | ((event: {
      threadId: string;
      chatId: string;
      userMessage: Record<string, unknown>;
      assistantMessage: Record<string, unknown>;
    }) => void)
  | null = null;
let directorMessageDeltaListener:
  | ((event: { threadId: string; chatId: string; messageId: string; delta: string; content: string }) => void)
  | null = null;
let directorMessageCompleteListener:
  | ((event: { threadId: string; chatId: string; messageId: string; content: string }) => void)
  | null = null;
let directorMessageErrorListener:
  | ((event: { threadId: string; chatId: string; messageId: string; errorMessage: string; content: string; canceled?: boolean }) => void)
  | null = null;

const projectFixture = {
  id: 'project-1',
  name: 'Project One',
  systemInstructions: 'Keep silhouettes crisp and the environment grounded.',
  artStyle: 'cartoon',
  createdAt: '2026-05-26T10:00:00.000Z',
  updatedAt: '2026-05-26T10:00:00.000Z',
  threads: [
    {
      id: 'thread-1',
      projectId: 'project-1',
      name: 'Thread One',
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
      hasRunningJob: false,
    },
    {
      id: 'thread-2',
      projectId: 'project-1',
      name: 'Thread Two',
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
      hasRunningJob: false,
    },
  ],
};

const makeSceneGroupsFixture = () => [
  {
    id: 'scene-group-1',
    threadId: 'thread-1',
    title: 'Scene 1',
    prompt: '',
    tocOrder: 1,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    frames: [
      {
        id: 'scene-frame-1',
        sceneGroupId: 'scene-group-1',
        title: 'Frame 1',
        prompt: '',
        frameOrder: 1,
        createdAt: '2026-06-01T10:01:00.000Z',
        updatedAt: '2026-06-01T10:01:00.000Z',
        references: [],
        assets: [],
      },
      {
        id: 'scene-frame-2',
        sceneGroupId: 'scene-group-1',
        title: 'Frame 2',
        prompt: '',
        frameOrder: 2,
        createdAt: '2026-06-01T10:02:00.000Z',
        updatedAt: '2026-06-01T10:02:00.000Z',
        references: [],
        assets: [],
      },
    ],
    runs: [],
  },
];

let sceneGroupsFixture = makeSceneGroupsFixture();
let directorChatsFixtureByThread: Record<string, Array<{ id: string; threadId: string; title: string; createdAt: string; updatedAt: string }>> = {
  'thread-1': [
    {
      id: 'director-chat-1',
      threadId: 'thread-1',
      title: 'Coverage pass',
      createdAt: '2026-06-01T09:00:00.000Z',
      updatedAt: '2026-06-01T09:05:00.000Z',
    },
  ],
  'thread-2': [],
};
let directorMessagesFixtureByChat: Record<
  string,
  Array<{
    id: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    contentMarkdown?: string;
    parts?: Array<Record<string, unknown>>;
    status: 'streaming' | 'completed' | 'failed';
    modelId?: string | null;
    modelLabel?: string | null;
    fastMode: boolean;
    references?: never[];
    createdAt: string;
    updatedAt: string;
  }>
> = {
  'director-chat-1': [
    {
      id: 'director-msg-1',
      chatId: 'director-chat-1',
      role: 'assistant',
      contentMarkdown: 'Existing coverage notes.',
      status: 'completed',
      modelId: 'codex-gpt-5-4-mini',
      modelLabel: 'Codex / GPT-5.4 Mini',
      fastMode: true,
      references: [],
      createdAt: '2026-06-01T09:05:00.000Z',
      updatedAt: '2026-06-01T09:05:00.000Z',
    },
  ],
};

function structuredDirectorFixture(message: (typeof directorMessagesFixtureByChat)[string][number]) {
  if (message.parts) {
    return message;
  }

  const markdown = message.contentMarkdown ?? '';
  const parts: Array<Record<string, unknown>> = [];
  const reasoningPattern = /<thinking>\s*([\s\S]*?)\s*<\/thinking>/gi;
  let text = markdown.replace(reasoningPattern, (_match, reasoning) => {
    parts.push({ type: 'reasoning', text: String(reasoning).trim() });
    return '';
  });
  const toolPattern = /```(?:tool|tool-call)\s*\n([\s\S]*?)```/gi;
  text = text.replace(toolPattern, (_match, body) => {
    const tool = JSON.parse(String(body));
    parts.push({
      type: 'tool-generateImages',
      toolCallId: tool.id ?? 'tool-generateImages-1',
      input: tool.input ?? {},
      state: 'approval-requested',
      approvalId: tool.approval?.id,
    });
    return '';
  });
  if (text.trim()) {
    parts.unshift({ type: 'text', text: text.trim() });
  }
  return { ...message, parts };
}

vi.mock('./lib/electron-api', () => ({
  getAppInfo: vi.fn(async () => ({ name: 'crevn', version: '9.8.7' })),
  getUpdateStatus: vi.fn(async () => ({
    state: 'idle',
    message: 'Updates have not been checked yet.',
    version: null,
    percent: null,
    errorMessage: null,
  })),
  checkForUpdates: vi.fn(async () => ({
    state: 'not_available',
    message: 'No updates available.',
    version: '9.8.7',
    percent: null,
    errorMessage: null,
  })),
  getProviderSettings: vi.fn(async () => ({
    text: {
      gemini: {
        apiKey: '',
      },
    },
  })),
  updateProviderSettings: vi.fn(async () => ({
    text: {
      gemini: {
        apiKey: 'saved-gemini-key',
      },
    },
  })),
  installUpdate: vi.fn(async () => ({
    state: 'installing',
    message: 'Installing update.',
    version: '9.8.8',
    percent: 100,
    errorMessage: null,
  })),
  subscribeToUpdateStatus: vi.fn((listener) => {
    updateStatusListener = listener;
    return () => {
      if (updateStatusListener === listener) {
        updateStatusListener = null;
      }
    };
  }),
  ensureProjectThreadWorkspace: vi.fn(async () => ({
    project: projectFixture,
    thread: projectFixture.threads[0],
  })),
  listProjectsWithThreads: vi.fn(async () => [projectFixture]),
  listReferences: vi.fn(async () => []),
  listReferenceFolders: vi.fn(async () => []),
  createReference: vi.fn(async (payload) => ({
    id: 'reference-created',
    collectionId: null,
    createdAt: '2026-05-26T12:00:00.000Z',
    description: payload.description ?? null,
    category: payload.category,
    ...payload,
  })),
  createReferenceFolder: vi.fn(async (payload) => ({
    id: `${payload.category}-folder-created`,
    category: payload.category,
    title: payload.title,
    parentFolderId: payload.parentFolderId ?? null,
    createdAt: '2026-05-26T12:00:00.000Z',
  })),
  createEnvironmentReference: vi.fn(async (payload) =>
    payload.attachments.map((attachment: { name: string; title?: string; mimeType: string; bytesBase64: string; section?: 'primary' | 'angles' }, index: number) => ({
      id: `environment-reference-${index + 1}`,
      collectionId: 'environment-1',
      environmentId: 'environment-1',
      title: attachment.title ?? attachment.name,
      groupTitle: payload.title,
      description: payload.description ?? null,
      groupDescription: payload.description ?? null,
      name: attachment.name,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: '2026-05-26T12:00:00.000Z',
      category: 'environment',
      section: attachment.section ?? (index === 0 ? 'primary' : 'angles'),
    }))
  ),
  createReferenceCollection: vi.fn(async (payload) =>
    payload.attachments.map((attachment: { name: string; title?: string; mimeType: string; bytesBase64: string; description?: string; section?: 'primary' | 'angles' }, index: number) => ({
      id: `${payload.category}-reference-${index + 1}`,
      collectionId: `${payload.category}-collection-1`,
      environmentId: payload.category === 'environment' ? 'environment-1' : null,
      title: attachment.title ?? attachment.name,
      groupTitle: payload.title,
      description: attachment.description ?? payload.description ?? null,
      groupDescription: payload.description ?? null,
      name: attachment.name,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: '2026-05-26T12:00:00.000Z',
      category: payload.category,
      section: attachment.section ?? (index === 0 ? 'primary' : 'angles'),
    }))
  ),
  updateReference: vi.fn(async (payload) => ({
    id: payload.id,
    collectionId: null,
    environmentId: payload.environmentId ?? null,
    name: 'updated.png',
    title: payload.title,
    description: payload.description ?? null,
    mimeType: 'image/png',
    bytesBase64: 'AQID',
    createdAt: '2026-05-26T12:00:00.000Z',
    category: payload.category,
  })),
  updateEnvironmentReference: vi.fn(async (payload) =>
    payload.attachments.map((attachment: { id?: string; name: string; title?: string; mimeType: string; bytesBase64: string; description?: string; section?: 'primary' | 'angles' }, index: number) => ({
      id: attachment.id ?? `environment-reference-${index + 1}`,
      environmentId: payload.environmentId,
      title: attachment.title ?? attachment.name,
      groupTitle: payload.title,
      description: attachment.description ?? payload.description ?? null,
      groupDescription: payload.description ?? null,
      name: attachment.name,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: '2026-05-26T12:00:00.000Z',
      category: 'environment',
      section: attachment.section ?? (index === 0 ? 'primary' : 'angles'),
    }))
  ),
  updateReferenceCollection: vi.fn(async (payload) =>
    payload.attachments.map((attachment: { id?: string; name: string; title?: string; mimeType: string; bytesBase64: string; description?: string; section?: 'primary' | 'angles' }, index: number) => ({
      id: attachment.id ?? `${payload.category}-reference-${index + 1}`,
      collectionId: payload.collectionId,
      environmentId: payload.category === 'environment' ? payload.collectionId : null,
      title: attachment.title ?? attachment.name,
      groupTitle: payload.title,
      description: attachment.description ?? payload.description ?? null,
      groupDescription: payload.description ?? null,
      name: attachment.name,
      mimeType: attachment.mimeType,
      bytesBase64: attachment.bytesBase64,
      createdAt: '2026-05-26T12:00:00.000Z',
      category: payload.category,
      section: attachment.section ?? (index === 0 ? 'primary' : 'angles'),
    }))
  ),
  describeReferenceCollection: vi.fn(async (payload) => ({
    title: payload.title ?? 'Generated reference title',
    description: 'Shared generated description',
    attachments: payload.attachments.map((attachment: { id: string }, index: number) => ({
      id: attachment.id,
      description: `Angle ${index + 1} description`,
    })),
  })),
  listGeneratedImages: vi.fn(async () => []),
  listSceneGroups: vi.fn(async () => sceneGroupsFixture),
  createSceneGroup: vi.fn(async (_threadId: string, input: { title: string; prompt: string; tocOrder: number }) => {
    const created = {
      id: `scene-group-${sceneGroupsFixture.length + 1}`,
      threadId: 'thread-1',
      title: input.title,
      prompt: input.prompt,
      tocOrder: input.tocOrder,
      createdAt: '2026-06-01T10:10:00.000Z',
      updatedAt: '2026-06-01T10:10:00.000Z',
      frames: [],
      runs: [],
    };
    sceneGroupsFixture = [created, ...sceneGroupsFixture];
    return created;
  }),
  updateSceneGroup: vi.fn(async (sceneGroupId: string, input: { title: string; prompt: string; tocOrder: number }) => {
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) =>
      sceneGroup.id === sceneGroupId ? { ...sceneGroup, ...input } : sceneGroup
    );
    return sceneGroupsFixture.find((sceneGroup) => sceneGroup.id === sceneGroupId);
  }),
  deleteSceneGroup: vi.fn(async (sceneGroupId: string) => {
    sceneGroupsFixture = sceneGroupsFixture.filter((sceneGroup) => sceneGroup.id !== sceneGroupId);
    return sceneGroupsFixture;
  }),
  createSceneFrame: vi.fn(async (sceneGroupId: string, input: { title: string; prompt: string; frameOrder: number }) => {
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) =>
      sceneGroup.id === sceneGroupId
        ? {
            ...sceneGroup,
            frames: [
              ...sceneGroup.frames,
              {
                id: `scene-frame-${sceneGroup.frames.length + 1}`,
                sceneGroupId,
                title: input.title,
                prompt: input.prompt,
                frameOrder: input.frameOrder,
                createdAt: '2026-06-01T10:11:00.000Z',
                updatedAt: '2026-06-01T10:11:00.000Z',
                references: [],
                assets: [],
              },
            ],
          }
        : sceneGroup
    );
    return sceneGroupsFixture.find((sceneGroup) => sceneGroup.id === sceneGroupId);
  }),
  updateSceneFrame: vi.fn(async (sceneFrameId: string, input: { title: string; prompt: string; frameOrder: number }) => {
    let updatedGroup = null;
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) => {
      const hasFrame = sceneGroup.frames.some((frame) => frame.id === sceneFrameId);
      if (!hasFrame) return sceneGroup;
      updatedGroup = {
        ...sceneGroup,
        frames: sceneGroup.frames.map((frame) => (frame.id === sceneFrameId ? { ...frame, ...input } : frame)),
      };
      return updatedGroup;
    });
    return updatedGroup;
  }),
  deleteSceneFrame: vi.fn(async (sceneFrameId: string) => {
    let updatedGroup = null;
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) => {
      const hasFrame = sceneGroup.frames.some((frame) => frame.id === sceneFrameId);
      if (!hasFrame) return sceneGroup;
      updatedGroup = {
        ...sceneGroup,
        frames: sceneGroup.frames.filter((frame) => frame.id !== sceneFrameId),
      };
      return updatedGroup;
    });
    return updatedGroup;
  }),
  saveSceneFrameReferences: vi.fn(async (sceneFrameId: string, references: unknown[]) => {
    let updatedGroup = null;
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) => {
      const hasFrame = sceneGroup.frames.some((frame) => frame.id === sceneFrameId);
      if (!hasFrame) return sceneGroup;
      updatedGroup = {
        ...sceneGroup,
        frames: sceneGroup.frames.map((frame) =>
          frame.id === sceneFrameId ? { ...frame, references: references as never[] } : frame
        ),
      };
      return updatedGroup;
    });
    return updatedGroup;
  }),
  generateSceneGroup: vi.fn(async (input: string | { sceneGroupId: string }) => {
    const sceneGroupId = typeof input === 'string' ? input : input.sceneGroupId;
    const sceneGroup = sceneGroupsFixture.find((entry) => entry.id === sceneGroupId);
    if (!sceneGroup) {
      throw new Error('Scene group not found');
    }
    return sceneGroup;
  }),
  structureScenePrompt: vi.fn(async () => ({
    sceneDescription: 'English scene description',
    frames: [
      { prompt: 'English frame 1 prompt' },
      { prompt: 'English frame 2 prompt' },
    ],
  })),
  cancelSceneGroupGeneration: vi.fn(async () => undefined),
  listDirectorChats: vi.fn(async (threadId: string) => directorChatsFixtureByThread[threadId] ?? []),
  createDirectorChat: vi.fn(async (threadId: string) => {
    const created = {
      id: `director-chat-${(directorChatsFixtureByThread[threadId]?.length ?? 0) + 1}`,
      threadId,
      title: 'New chat',
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    };
    directorChatsFixtureByThread[threadId] = [created, ...(directorChatsFixtureByThread[threadId] ?? [])];
    directorMessagesFixtureByChat[created.id] = [];
    return created;
  }),
  renameDirectorChat: vi.fn(async (chatId: string, title: string) => {
    let updated: { id: string; threadId: string; title: string; createdAt: string; updatedAt: string } | null = null;
    directorChatsFixtureByThread = Object.fromEntries(
      Object.entries(directorChatsFixtureByThread).map(([threadId, chats]) => [
        threadId,
        chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          updated = { ...chat, title, updatedAt: '2026-06-01T12:10:00.000Z' };
          return updated;
        }),
      ])
    );
    return updated;
  }),
  deleteDirectorChat: vi.fn(async (chatId: string) => {
    directorChatsFixtureByThread = Object.fromEntries(
      Object.entries(directorChatsFixtureByThread).map(([threadId, chats]) => [
        threadId,
        chats.filter((chat) => chat.id !== chatId),
      ])
    );
    delete directorMessagesFixtureByChat[chatId];
  }),
  listDirectorMessages: vi.fn(async (chatId: string) =>
    (directorMessagesFixtureByChat[chatId] ?? []).map(structuredDirectorFixture)
  ),
  sendDirectorMessage: vi.fn(async (payload: { chatId: string; threadId: string; prompt: string; modelId?: string }) => {
    const timestamp = '2026-06-01T12:15:00.000Z';
    const userMessage = {
      id: 'director-user-message',
      chatId: payload.chatId,
      role: 'user' as const,
      parts: [{ type: 'text', text: payload.prompt }],
      status: 'completed' as const,
      modelId: payload.modelId ?? 'google-gemini-3-5-flash',
      modelLabel: 'Gemini 3.5 Flash',
      fastMode: true,
      references: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const assistantMessage = {
      id: 'director-assistant-message',
      chatId: payload.chatId,
      role: 'assistant' as const,
      parts: [],
      status: 'streaming' as const,
      modelId: payload.modelId ?? 'google-gemini-3-5-flash',
      modelLabel: 'Gemini 3.5 Flash',
      fastMode: true,
      references: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    directorMessagesFixtureByChat[payload.chatId] = [
      ...(directorMessagesFixtureByChat[payload.chatId] ?? []),
      userMessage,
      assistantMessage,
    ];
    return {
      chat: directorChatsFixtureByThread[payload.threadId]?.find((chat) => chat.id === payload.chatId) ?? null,
      userMessage,
      assistantMessage,
    };
  }),
  regenerateDirectorMessage: vi.fn(
    async (payload: { chatId: string; threadId: string; assistantMessageId: string }) => {
      const sourceMessages = directorMessagesFixtureByChat[payload.chatId] ?? [];
      const assistantIndex = sourceMessages.findIndex((message) => message.id === payload.assistantMessageId);
      const sourceUserMessage =
        assistantIndex > 0 && sourceMessages[assistantIndex - 1]?.role === 'user'
          ? sourceMessages[assistantIndex - 1]
          : null;
      const timestamp = '2026-06-01T12:18:00.000Z';
      const userMessage = sourceUserMessage ?? {
        id: 'director-user-message-regenerated',
        chatId: payload.chatId,
        role: 'user' as const,
        parts: [{ type: 'text', text: 'Retry the previous request.' }],
        status: 'completed' as const,
        modelId: 'google-gemini-3-5-flash',
        modelLabel: 'Gemini 3.5 Flash',
        fastMode: true,
        references: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const assistantMessage = {
        id: payload.assistantMessageId,
        chatId: payload.chatId,
        role: 'assistant' as const,
        parts: [],
        status: 'streaming' as const,
        modelId: 'google-gemini-3-5-flash',
        modelLabel: 'Gemini 3.5 Flash',
        fastMode: true,
        references: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      directorMessagesFixtureByChat[payload.chatId] = sourceMessages.map((message) =>
        message.id === payload.assistantMessageId ? assistantMessage : message
      );
      return {
        chat: directorChatsFixtureByThread[payload.threadId]?.find((chat) => chat.id === payload.chatId) ?? null,
        userMessage,
        assistantMessage,
      };
    }
  ),
  approveDirectorAction: vi.fn(async ({ messageId, actionIndex, clientRunId }: { messageId: string; actionIndex: number; clientRunId?: string }) => {
    const legacyMessage = Object.values(directorMessagesFixtureByChat).flat().find((entry) => entry.id === messageId);
    const message = legacyMessage ? structuredDirectorFixture(legacyMessage) : null;
    if (!message) return null;
    const updated = {
      ...message,
      parts: message.parts?.map((part) =>
        part.type === 'tool-generateImages'
          ? {
              ...part,
              state: 'output-available',
              output: {
                jobId: 'director-job-1',
                assets: [
                  {
                    id: 'director-generated-image-1',
                    fileUrl: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`,
                    fileName: 'garage-frame.png',
                    createdAt: '2026-06-01T12:16:00.000Z',
                    provider: 'codex',
                    modelId: 'codex-gpt-5-4-mini',
                    modelLabel: 'GPT-5.4 Mini',
                    prompt: 'Medium close shot in the garage.\n\nAspect ratio: 16:9',
                    references: [],
                    durationMs: 1234,
                    clientRunId,
                  },
                ],
              },
            }
          : part
      ),
      updatedAt: '2026-06-01T12:16:00.000Z',
    };
    directorMessagesFixtureByChat[message.chatId] = (directorMessagesFixtureByChat[message.chatId] ?? []).map((entry) =>
      entry.id === messageId ? updated : entry
    );
    return updated;
  }),
  declineDirectorAction: vi.fn(async ({ messageId, actionIndex }: { messageId: string; actionIndex: number }) => {
    const legacyMessage = Object.values(directorMessagesFixtureByChat).flat().find((entry) => entry.id === messageId);
    const message = legacyMessage ? structuredDirectorFixture(legacyMessage) : null;
    if (!message) return null;
    const updated = {
      ...message,
      parts: message.parts?.map((part) =>
        part.type === 'tool-generateImages'
          ? { ...part, state: 'declined' }
          : part
      ),
      updatedAt: '2026-06-01T12:16:00.000Z',
    };
    directorMessagesFixtureByChat[message.chatId] = (directorMessagesFixtureByChat[message.chatId] ?? []).map((entry) =>
      entry.id === messageId ? updated : entry
    );
    return updated;
  }),
  cancelDirectorChat: vi.fn(async () => true),
  subscribeToDirectorMessageStart: vi.fn((listener) => {
    directorMessageStartListener = (event) =>
      listener({
        ...event,
        userMessage: structuredDirectorFixture(event.userMessage),
        assistantMessage: structuredDirectorFixture(event.assistantMessage),
      });
    return () => {
      if (directorMessageStartListener === listener) {
        directorMessageStartListener = null;
      }
    };
  }),
  subscribeToDirectorMessageDelta: vi.fn((listener) => {
    directorMessageDeltaListener = (event) =>
      listener({
        ...event,
        parts: event.parts ?? [{ type: 'text', text: event.content ?? event.delta ?? '' }],
      });
    return () => {
      if (directorMessageDeltaListener === listener) {
        directorMessageDeltaListener = null;
      }
    };
  }),
  subscribeToDirectorMessageComplete: vi.fn((listener) => {
    directorMessageCompleteListener = (event) =>
      listener({
        ...event,
        parts: event.parts ?? [{ type: 'text', text: event.content ?? '' }],
      });
    return () => {
      if (directorMessageCompleteListener === listener) {
        directorMessageCompleteListener = null;
      }
    };
  }),
  subscribeToDirectorMessageError: vi.fn((listener) => {
    directorMessageErrorListener = (event) =>
      listener({
        ...event,
        parts: event.parts ?? [{ type: 'text', text: event.content ?? event.errorMessage ?? '' }],
      });
    return () => {
      if (directorMessageErrorListener === listener) {
        directorMessageErrorListener = null;
      }
    };
  }),
  createProject: vi.fn(),
  createThread: vi.fn(),
  renameProject: vi.fn(),
  updateProjectSettings: vi.fn(),
  exportProject: vi.fn(async () => ({ status: 'exported', filePath: '/tmp/project.crenv' })),
  exportThread: vi.fn(async () => ({ status: 'exported', filePath: '/tmp/thread.crenv' })),
  exportReference: vi.fn(async () => ({ status: 'exported', filePath: '/tmp/reference.refc' })),
  importCrenv: vi.fn(async () => ({
    status: 'imported',
    scope: 'project',
    projectId: 'project-1',
    threadIds: ['thread-1'],
  })),
  importReference: vi.fn(async () => ({
    status: 'imported',
    category: 'characters',
    collectionId: 'imported-reference-pack',
    referenceIds: ['imported-reference'],
  })),
  renameThread: vi.fn(),
  deleteProject: vi.fn(),
  deleteThread: vi.fn(),
  generateImages: vi.fn(),
  copyGeneratedImage: vi.fn(async () => undefined),
  downloadGeneratedImage: vi.fn(async () => undefined),
  deleteGeneratedImage: vi.fn(async () => undefined),
  pasteClipboardImageToSceneFrame: vi.fn(async (sceneFrameId: string) => {
    sceneGroupsFixture = sceneGroupsFixture.map((sceneGroup) => ({
      ...sceneGroup,
      runs: [
        {
          id: 'clipboard-run-1',
          sceneGroupId: sceneGroup.id,
          threadId: sceneGroup.threadId,
          status: 'succeeded',
          provider: 'codex',
          modelId: 'clipboard',
          modelLabel: 'Clipboard',
          requestedFrameCount: 1,
          errorMessage: null,
          durationMs: 0,
          createdAt: '2026-06-01T10:03:00.000Z',
          updatedAt: '2026-06-01T10:03:00.000Z',
        },
        ...sceneGroup.runs,
      ],
      frames: sceneGroup.frames.map((frame) =>
        frame.id === sceneFrameId
          ? {
              ...frame,
              assets: [
                ...frame.assets,
                {
                  id: 'clipboard-asset-1',
                  sceneGroupRunId: 'clipboard-run-1',
                  sceneFrameId,
                  outputIndex: frame.assets.length,
                  originalPath: 'clipboard',
                  storedPath: '/tmp/clipboard-frame.png',
                  fileName: 'clipboard-frame.png',
                  mimeType: 'image/png',
                  width: null,
                  height: null,
                  createdAt: '2026-06-01T10:03:00.000Z',
                },
              ],
            }
          : frame
      ),
    }));

    return sceneGroupsFixture.find((sceneGroup) =>
      sceneGroup.frames.some((frame) => frame.id === sceneFrameId)
    ) ?? null;
  }),
  subscribeToScenePlan: vi.fn((listener) => {
    scenePlanListener = listener;
    return () => {
      if (scenePlanListener === listener) {
        scenePlanListener = null;
      }
    };
  }),
  subscribeToSceneFrameReady: vi.fn((listener) => {
    sceneFrameReadyListener = listener;
    return () => {
      if (sceneFrameReadyListener === listener) {
        sceneFrameReadyListener = null;
      }
    };
  }),
  subscribeToDirectorSceneReady: vi.fn((listener) => {
    directorSceneReadyListener = listener;
    return () => {
      if (directorSceneReadyListener === listener) {
        directorSceneReadyListener = null;
      }
    };
  }),
  subscribeToImageReady: vi.fn((listener) => {
    imageReadyListener = listener;
    return () => {
      if (imageReadyListener === listener) {
        imageReadyListener = null;
      }
    };
  }),
}));

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('react-window', () => ({
  List: ({
    rowCount,
    rowComponent: RowComponent,
    rowProps,
  }: {
    rowCount: number;
    rowComponent: ComponentType<{ index: number; style: CSSProperties; messages: unknown[] }>;
    rowProps: { messages: unknown[] };
  }) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(rowCount, 12) }, (_, index) => (
        <RowComponent key={index} index={index} style={{}} {...rowProps} />
      ))}
    </div>
  ),
  useDynamicRowHeight: () => 112,
  useListRef: () => ({ current: { scrollToRow: vi.fn() } }),
}));

vi.mock('sonner', () => ({
  Toaster: ({ position }: { position?: string }) => <div data-testid="sonner-toaster" data-position={position} />,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const componentCache = new Map<PropertyKey, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (!componentCache.has(key)) {
          componentCache.set(
            key,
            React.forwardRef(function MotionPrimitive(
              {
                children,
                initial: _initial,
                animate: _animate,
                exit: _exit,
                transition: _transition,
                layoutId: _layoutId,
                whileHover: _whileHover,
                whileTap: _whileTap,
                ...props
              }: { children?: React.ReactNode } & Record<string, unknown>,
              ref: React.ForwardedRef<HTMLElement>
            ) {
              return React.createElement(String(key), { ...props, ref }, children);
            })
          );
        }

        return componentCache.get(key);
      },
    }
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion,
  };
});

vi.mock('./components/ai-elements/shimmer', () => ({
  TextShimmer: ({ children }: { children: string }) => <span>{children}</span>,
}));

vi.mock('@number-flow/react', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock('img-fx', () => ({
  ImageGeneration: ({ children }: { children: unknown }) => <>{children}</>,
}));

vi.mock('./components/generated-image-grid', () => ({
  GeneratedImageGrid: ({
    images,
    loadingEffect,
    selectedImageIds,
    onImageSelect,
    onImageOpen,
    onImageCopy,
    onImageCopyPrompt,
    onImageDownload,
    onImageDelete,
  }: {
    images?: Array<{ id: string; fileName: string; prompt?: string | null }>;
    loadingEffect?: 'shimmer' | 'img-fx';
    selectedImageIds?: string[];
    onImageSelect?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
    onImageOpen?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
    onImageCopy?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
    onImageCopyPrompt?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
    onImageDownload?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
    onImageDelete?: (image: { id: string; fileName: string; prompt?: string | null }) => void;
  }) => {
    const clickTimeouts = new Map<string, number>();

    return (
      <div data-testid="generated-image-grid" data-loading-effect={loadingEffect ?? 'shimmer'}>
        {images?.map((image) => (
          <div key={image.id}>
            {'isLoading' in image && image.isLoading ? (
              <div aria-label={`${image.fileName} loading`}>{image.fileName}</div>
            ) : (
              <button
                type="button"
                aria-label={`Select ${image.fileName}`}
                data-selected={selectedImageIds?.includes(image.id) ? 'true' : 'false'}
                onClick={() => {
                  const existingTimeoutId = clickTimeouts.get(image.id);
                  if (existingTimeoutId !== undefined) {
                    window.clearTimeout(existingTimeoutId);
                  }

                  clickTimeouts.set(
                    image.id,
                    window.setTimeout(() => {
                      clickTimeouts.delete(image.id);
                      onImageSelect?.(image);
                    }, 200)
                  );
                }}
                onDoubleClick={() => {
                  const timeoutId = clickTimeouts.get(image.id);
                  if (timeoutId !== undefined) {
                    window.clearTimeout(timeoutId);
                    clickTimeouts.delete(image.id);
                  }
                  onImageOpen?.(image);
                }}
              >
                {image.fileName}
              </button>
            )}
            {!('isLoading' in image && image.isLoading) ? (
              <div>
                <button type="button" onClick={() => onImageCopy?.(image)}>
                  Copy {image.fileName}
                </button>
                {image.prompt ? (
                  <button type="button" onClick={() => onImageCopyPrompt?.(image)}>
                    Copy prompt {image.fileName}
                  </button>
                ) : null}
                <button type="button" onClick={() => onImageDownload?.(image)}>
                  Download {image.fileName}
                </button>
                <button type="button" onClick={() => onImageDelete?.(image)}>
                  Delete {image.fileName}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('./lib/errors', async () => {
  const actual = await vi.importActual<typeof import('./lib/errors')>('./lib/errors');
  return {
    ...actual,
    getErrorMessage: vi.fn(actual.getErrorMessage),
  };
});

vi.mock('./components/project-row', () => ({
  ProjectRow: ({
    id,
    name,
    onPrepareThreadDraft,
    onOpenProperties,
    onRename,
    onExport,
    onDelete,
  }: {
    id: string;
    name: string;
    onPrepareThreadDraft: (projectId: string) => void;
    onOpenProperties: (projectId: string) => void;
    onRename: () => void;
    onExport?: (projectId: string) => void;
    onDelete: () => void;
  }) => {
    renderCounters.projectRow += 1;
    return (
      <div>
        <div>{name}</div>
        <button type="button" aria-label={`Start a new thread in ${name}`} onClick={() => onPrepareThreadDraft(id)}>
          New thread {name}
        </button>
        <button type="button" onClick={() => onOpenProperties(id)}>
          Properties {name}
        </button>
        <button type="button" onClick={onRename}>
          Rename {name}
        </button>
        {onExport ? (
          <button type="button" onClick={() => onExport(id)}>
            Export {name}
          </button>
        ) : null}
        <button type="button" onClick={onDelete}>
          Delete {name}
        </button>
      </div>
    );
  },
}));

vi.mock('./components/thread-row', () => ({
  ThreadRow: ({
    id,
    name,
    isRunning,
    onClick,
    onRename,
    onExport,
    onDelete,
  }: {
    id: string;
    name: string;
    isRunning: boolean;
    onClick: () => void;
    onRename: () => void;
    onExport?: (threadId: string) => void;
    onDelete: () => void;
  }) => {
    renderCounters.threadRow += 1;
    return (
      <div>
        <button type="button" onClick={onClick}>
          {name}
        </button>
        {isRunning ? <span aria-label={`${name} is generating`}>running</span> : null}
        <button type="button" onClick={onRename}>
          Rename {name}
        </button>
        {onExport ? (
          <button type="button" onClick={() => onExport(id)}>
            Export {name}
          </button>
        ) : null}
        <button type="button" onClick={onDelete}>
          Delete {name}
        </button>
      </div>
    );
  },
}));

describe('App header thread title', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    scenePlanListener = null;
    sceneFrameReadyListener = null;
    directorSceneReadyListener = null;
    imageReadyListener = null;
    directorMessageStartListener = null;
    directorMessageDeltaListener = null;
    directorMessageCompleteListener = null;
    directorMessageErrorListener = null;
    sceneGroupsFixture = makeSceneGroupsFixture();
    directorChatsFixtureByThread = {
      'thread-1': [
        {
          id: 'director-chat-1',
          threadId: 'thread-1',
          title: 'Coverage pass',
          createdAt: '2026-06-01T09:00:00.000Z',
          updatedAt: '2026-06-01T09:05:00.000Z',
        },
      ],
      'thread-2': [],
    };
    directorMessagesFixtureByChat = {
      'director-chat-1': [
        {
          id: 'director-msg-1',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: 'Existing coverage notes.',
          status: 'completed',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          references: [],
          createdAt: '2026-06-01T09:05:00.000Z',
          updatedAt: '2026-06-01T09:05:00.000Z',
        },
      ],
    };
    Object.assign(window, {
      matchMedia: vi.fn((query: string) => ({
        matches: query.includes('prefers-color-scheme: dark'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      ResizeObserver: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
    vi.mocked(electronApi.listReferences).mockResolvedValue([]);
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([]);
    vi.mocked(electronApi.listSceneGroups).mockImplementation(async () => sceneGroupsFixture);
    vi.mocked(electronApi.createReference).mockImplementation(async (payload) => ({
      id: 'reference-created',
      createdAt: '2026-05-26T12:00:00.000Z',
      description: payload.description ?? null,
      category: payload.category,
      ...payload,
    }));
    renderCounters.projectRow = 0;
    renderCounters.threadRow = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the active thread name and updates it when switching threads', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Thread Two' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thread One' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole('heading', { name: 'Thread Two' })).toBeInTheDocument();
  });

  it('uses the compact 36px thread header and centered tab selection chrome', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const headerChrome = screen.getByTestId('thread-header-chrome');
    const headerText = screen.getByTestId('thread-header-title-text');
    const tabsChrome = screen.getByTestId('generation-workspace-tabs');
    const tabsIndicator = screen.getByTestId('generation-workspace-tabs-indicator');

    expect(headerChrome.className).toContain('h-9');
    expect(headerText.className).toContain('text-[16px]');
    expect(tabsChrome.className).toContain('h-9');
    expect(tabsIndicator.className).toContain('left-1');
    expect(tabsIndicator.className).toContain('top-1');
    expect(tabsIndicator.className).toContain('bottom-1');
    expect(tabsIndicator.className).toContain('w-[calc((100%_-_8px)/3)]');
  });

  it('uses a smaller fully rounded collapsed composer shell', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const classicComposerShell = screen.getByTestId('classic-composer-shell');
    expect(classicComposerShell.className).toContain('h-[60px]');
    expect(classicComposerShell.className).toContain('rounded-full');
    expect(classicComposerShell.className).not.toContain('rounded-[24px]');
    expect(within(classicComposerShell).getByRole('button', { name: 'Adicionar' }).className).not.toContain(
      'translate-y-[1px]'
    );
    expect(classicComposerShell.querySelector('.absolute.inset-x-0.bottom-0')?.className).toContain('bottom-2.5');
    expect(classicComposerShell.querySelector('[data-prompt-composer-placeholder="true"]')).toHaveTextContent(
      'Type anything'
    );
    expect(screen.getByRole('button', { name: 'Enviar' }).parentElement?.parentElement).toHaveAttribute(
      'data-send-button-variant',
      'colorful'
    );
  });

  it('places toast notifications at the bottom right of the app shell', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('sonner-toaster')).toHaveAttribute('data-position', 'bottom-right');
  });

  it('does not load scene groups while switching threads in Classic mode', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'true');
    expect(electronApi.listSceneGroups).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('heading', { name: 'Thread Two' })).toBeInTheDocument();
    expect(electronApi.listSceneGroups).not.toHaveBeenCalled();
  });

  it('renames a thread when the rename dialog is confirmed', async () => {
    const renameThreadMock = vi.mocked(electronApi.renameThread);
    const toastSuccessMock = vi.mocked(toast.success);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rename Thread One' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated Thread' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save thread' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(renameThreadMock).toHaveBeenCalledWith('thread-1', 'Updated Thread');
    expect(toastSuccessMock).toHaveBeenCalledWith('Thread renamed');
  });

  it('opens project properties with stored values and saves them', async () => {
    const updateProjectSettingsMock = vi.mocked(electronApi.updateProjectSettings);
    const toastSuccessMock = vi.mocked(toast.success);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Properties Project One' }));

    expect(screen.getByRole('dialog', { name: 'Project One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();

    const systemInstructionsField = screen.getByLabelText('System Instructions');
    const artStyleField = screen.getByRole('combobox', { name: 'Art Style' });
    expect(systemInstructionsField).toHaveValue('Keep silhouettes crisp and the environment grounded.');
    expect(artStyleField).toHaveTextContent('Cartoon');

    fireEvent.change(systemInstructionsField, {
      target: { value: 'Stay precise with lighting continuity and keep the wardrobe grounded.' },
    });

    await act(async () => {
      fireEvent.click(artStyleField);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      const photorealOption = screen.getByRole('option', { name: 'Photoreal' });
      fireEvent.pointerDown(photorealOption, { pointerType: 'mouse' });
      fireEvent.click(photorealOption);
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save properties' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(updateProjectSettingsMock).toHaveBeenCalledWith('project-1', {
      systemInstructions: 'Stay precise with lighting continuity and keep the wardrobe grounded.',
      artStyle: 'photoreal',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Project properties saved');
  });

  it('keeps the project properties dialog open when saving fails', async () => {
    vi.mocked(electronApi.updateProjectSettings).mockRejectedValueOnce(new Error('save failed'));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Properties Project One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save properties' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('dialog', { name: 'Project One' })).toBeInTheDocument();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to save project properties');
  });

  it('deletes a thread when the delete dialog is confirmed', async () => {
    const deleteThreadMock = vi.mocked(electronApi.deleteThread);
    const toastMessageMock = vi.mocked(toast.message);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Thread One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    await act(async () => {
      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(500);
    });

    expect(deleteThreadMock).toHaveBeenCalledWith('thread-1');
    expect(toastMessageMock).toHaveBeenCalledWith('Thread deleted');
  });

  it('sends attached reference images with generation requests', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Use the attached reference' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Use the attached RefImage1 (reference)'),
        referenceImages: [
          expect.objectContaining({
            name: 'reference.png',
            mimeType: 'image/png',
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
  });

  it('defaults generation count to 1 and caps it at 25', async () => {
    vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('1')).toBeInTheDocument();

    const incrementButton = screen.getByRole('button', { name: 'Increase image count' });
    for (let index = 0; index < 30; index += 1) {
      fireEvent.click(incrementButton);
    }

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(incrementButton).toBeDisabled();
  });

  it('keeps the classic composer focused on model, aspect ratio, and references only', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole('button', { name: 'Mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Low Angle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Use camera angle' })).not.toBeInTheDocument();
  });

  it('submits classic generation through the default manual image path', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A consistent subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'manual',
        count: 1,
        prompt: expect.stringContaining('Aspect ratio: 16:9'),
      })
    );
    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('replaces a generation shimmer as soon as an image ready event arrives', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A compact studio render' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const request = vi.mocked(electronApi.generateImages).mock.calls[0]?.[0];
    expect(request?.clientRunId).toBeTruthy();

    await act(async () => {
      imageReadyListener?.({
        jobId: 'job-1',
        clientRunId: request?.clientRunId,
        threadId: 'thread-1',
        asset: {
          id: 'asset-ready-1',
          fileName: 'ready-frame.png',
          fileUrl: 'crenv-asset://generated-images/ready-frame.png',
          createdAt: '2026-06-01T12:20:00.000Z',
          provider: 'codex',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Select ready-frame.png' })).toBeInTheDocument();

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('shows generation loading immediately when submitting from a new draft thread', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;

    vi.mocked(electronApi.createThread).mockResolvedValueOnce({
      id: 'thread-created-for-generation',
      projectId: 'project-1',
      name: 'Thread Three',
      createdAt: '2026-06-01T12:20:00.000Z',
      updatedAt: '2026-06-01T12:20:00.000Z',
      hasRunningJob: false,
    });
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Expand sidebar'));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByLabelText('Start a new thread in Project One'));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate the first image in a brand new thread.' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createThread).toHaveBeenCalledWith('project-1');
    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-created-for-generation',
        prompt: expect.stringContaining('Generate the first image in a brand new thread.'),
      })
    );
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('keeps the original shimmer count when the agent does not opt into shimmer expansion', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A consistent subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      scenePlanListener?.({ jobId: 'job-1', threadId: 'thread-1', count: 6, applyToShimmers: false });
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(toast.message)).toHaveBeenCalledWith('Generating 6 images');
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('does not carry a previous thread loading state into the next thread while images are loading', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    let resolveThreadTwoImages: ((value: never[]) => void) | null = null;

    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );
    vi.mocked(electronApi.listGeneratedImages).mockImplementation((threadId: string) => {
      if (threadId === 'thread-2') {
        return new Promise((resolve) => {
          resolveThreadTwoImages = resolve as (value: never[]) => void;
        });
      }

      return Promise.resolve([]);
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'A consistent subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));

    expect(screen.queryByLabelText('image-0 loading')).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText(/loading$/i)).toHaveLength(0);

    await act(async () => {
      resolveThreadTwoImages?.([]);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('allows overlapping scene runs and routes shimmer expansion per run', async () => {
    const pendingRuns: Array<(value: { jobId: string; assets: [] }) => void> = [];
    const generationPayloads: Array<Record<string, unknown>> = [];

    vi.mocked(electronApi.generateImages).mockImplementation(
      (payload) =>
        new Promise((resolve) => {
          generationPayloads.push(payload as Record<string, unknown>);
          pendingRuns.push(resolve);
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'First subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scene' }));

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Second subway platform scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledTimes(2);
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(2);

    const firstClientRunId = generationPayloads[0]?.clientRunId;
    const secondClientRunId = generationPayloads[1]?.clientRunId;

    expect(typeof firstClientRunId).toBe('string');
    expect(typeof secondClientRunId).toBe('string');

    await act(async () => {
      scenePlanListener?.({
        jobId: 'job-1',
        clientRunId: firstClientRunId as string,
        threadId: 'thread-1',
        count: 6,
        applyToShimmers: true,
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(7);

    await act(async () => {
      scenePlanListener?.({
        jobId: 'job-2',
        clientRunId: secondClientRunId as string,
        threadId: 'thread-1',
        count: 4,
        applyToShimmers: true,
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(10);

    await act(async () => {
      pendingRuns[0]?.({ jobId: 'job-1', assets: [] });
      pendingRuns[1]?.({ jobId: 'job-2', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('shows a running indicator in the sidebar while generation is in flight', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByLabelText('Thread One is generating')).toBeInTheDocument();

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByLabelText('Thread One is generating')).not.toBeInTheDocument();
  });

  it('persists loading placeholders when leaving and re-entering the active thread during generation', async () => {
    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryAllByLabelText(/loading$/i)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Thread One' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('toggles generated images as composer references from the grid', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gridButton = screen.getByRole('button', { name: 'Select frame-1.png' });
    fireEvent.click(gridButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(gridButton).toHaveAttribute('data-selected', 'true');
    expect(screen.getByLabelText('Remove frame-1.png')).toBeInTheDocument();

    fireEvent.click(gridButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(gridButton).toHaveAttribute('data-selected', 'false');
    expect(screen.queryByLabelText('Remove frame-1.png')).not.toBeInTheDocument();
  });

  it('uses img-fx loading tiles in the Classic generated image grid', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('generated-image-grid')).toHaveAttribute('data-loading-effect', 'img-fx');
  });

  it('opens a generated image preview dialog on double click without selecting it', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gridButton = screen.getByRole('button', { name: 'Select frame-1.png' });
    fireEvent.doubleClick(gridButton);

    expect(screen.getByRole('dialog', { name: 'frame-1.png' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'frame-1.png preview' })).toBeInTheDocument();
    expect(gridButton).toHaveAttribute('data-selected', 'false');
  });

  it('shows stored generation prompt, references, model, and time in generated image details', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
        provider: 'antigravity',
        modelId: 'antigravity-gemini-3-5-flash-low',
        modelLabel: 'Gemini 3.5 Flash (Low)',
        prompt: 'Generate Tito on black background',
        references: [
          {
            name: 'tito.png',
            title: 'Tito',
            description: 'Subject anchor',
            mimeType: 'image/png',
          },
        ],
        durationMs: 92_500,
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));

    expect(screen.getByRole('dialog', { name: 'frame-1.png' })).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.5 Flash (Low)')).toBeInTheDocument();
    expect(screen.getByText('01:32')).toBeInTheDocument();
    expect(screen.getByText('Generate Tito on black background')).toBeInTheDocument();
    expect(screen.getByText('Tito')).toBeInTheDocument();
    expect(screen.getByText('Subject anchor')).toBeInTheDocument();
  });

  it('opens the player for an attached reference image from the composer row', async () => {
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open reference.png' }));

    expect(screen.getByRole('dialog', { name: 'reference.png' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'reference.png preview' })).toBeInTheDocument();
  });

  it('opens the player on double click for an attached reference image in the classic composer row', async () => {
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Open reference.png' }));

    expect(screen.getByRole('dialog', { name: 'reference.png' })).toBeInTheDocument();
  });

  it('shows a context menu for an attached reference image in the classic composer row', async () => {
    const referenceImage = new File(['stub-image'], 'reference.png', { type: 'image/png' });

    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [referenceImage] },
      });
      await vi.runAllTimersAsync();
    });

    const attachmentButton = screen.getByRole('button', { name: 'Open reference.png' });
    fireEvent.contextMenu(attachmentButton);

    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    });

    expect(screen.getByRole('dialog', { name: 'reference.png' })).toBeInTheDocument();
  });

  it('submits a pinpoint generation from the player and closes back into a single shimmer', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const bytes = url.includes('character-sheet')
        ? Uint8Array.from([5, 6, 7, 8])
        : Uint8Array.from([1, 2, 3, 4]);

      return {
        arrayBuffer: async () => bytes.buffer,
        blob: async () => new Blob([bytes], { type: 'image/png' }),
        headers: {
          get: () => 'image/png',
        },
      } as Response;
    });

    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pin Point' }));

    const stage = screen.getByTestId('player-image-stage');
    Object.defineProperty(stage, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => null,
      }),
    });

    fireEvent.click(stage, { clientX: 250, clientY: 200 });

    const characterReference = new File(['character-sheet'], 'character-sheet.png', { type: 'image/png' });
    Object.defineProperty(characterReference, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('pinpoint-reference-input'), {
        target: { files: [characterReference] },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      const extraPromptInput = screen.getByRole('textbox', { name: 'Extra prompt' }) as HTMLDivElement & {
        value: string;
      };
      extraPromptInput.value = 'Place the character naturally near the shoreline.';
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate pinpoint image' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'pinpoint',
        count: 1,
        prompt: expect.stringContaining('Place the character naturally near the shoreline.'),
        pinPoint: expect.objectContaining({
          point: { x: 0.25, y: 0.4 },
        }),
      })
    );
    expect(screen.queryByRole('dialog', { name: 'frame-1.png' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('submits a camera generation from the player with orbit controls', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response);

    let resolveGeneration: ((value: { jobId: string; assets: [] }) => void) | null = null;
    vi.mocked(electronApi.generateImages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '38' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Tilt' }), {
      target: { value: '-12' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), {
      target: { value: '0.35' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate camera image' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'camera',
        count: 1,
        prompt: expect.stringContaining('Camera rotation: 38°'),
        camera: {
          rotationDeg: 38,
          tiltDeg: -12,
          zoom: 0.35,
          generateBestAngles: false,
        },
        referenceImages: [
          expect.objectContaining({
            title: 'RefImage1',
            description: expect.stringContaining('physical 3D camera perspective change'),
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
    expect(electronApi.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Aspect ratio: match RefImage1 exactly'),
      })
    );
    const cameraRequest = vi.mocked(electronApi.generateImages).mock.calls[0]?.[0];
    expect(cameraRequest?.prompt).not.toContain('Aspect ratio: 16:9');
    expect(cameraRequest?.prompt).toContain('Perspective goal: move the camera in 3D around RefImage1');
    expect(cameraRequest?.prompt).toContain('Do not fake the move by cropping, resizing, canvas warping, or rotating the flat image plane.');
    expect(screen.queryByRole('dialog', { name: 'frame-1.png' })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(1);

    await act(async () => {
      resolveGeneration?.({ jobId: 'job-1', assets: [] });
      await vi.runAllTimersAsync();
    });
  });

  it('moves the camera handle in the orbit graph when dragging and when rotation changes', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-centered', 'true');
    expect(screen.getByTestId('camera-position-handle').className).not.toContain('-translate-x-1/2');
    expect(screen.getByText('Generate 12-angle sweep').closest('label')).toHaveAttribute(
      'title',
      expect.stringContaining('45/-30')
    );

    const orbitControl = screen.getByRole('application', { name: 'Camera angle control' });
    Object.defineProperty(orbitControl, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 224,
        height: 224,
        right: 224,
        bottom: 224,
        x: 0,
        y: 0,
        toJSON: () => null,
      }),
    });

    fireEvent.pointerDown(orbitControl, { pointerId: 1, clientX: 112, clientY: 112 });
    fireEvent.pointerMove(orbitControl, { pointerId: 1, clientX: 212, clientY: 62 });
    fireEvent.pointerUp(orbitControl, { pointerId: 1, clientX: 212, clientY: 62 });

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '315');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-tilt', '28');

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '400' },
    });

    expect(screen.getByRole('slider', { name: 'Rotation' })).toHaveAttribute('max', '315');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '315');
  });

  it('continues the camera orbit past 90 degrees and places the handle behind the image', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Camera' }));

    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '135' },
    });

    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-rotation', '135');
    expect(screen.getByTestId('camera-position-handle')).toHaveAttribute('data-camera-depth', 'behind');
    expect(screen.getByTestId('camera-source-preview')).toHaveAttribute('data-depth-layer', 'front');
  });

  it('lets the pinpoint extra prompt mention list float above the input and select with keyboard', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-hero',
        name: 'hero.png',
        title: 'Hero face',
        description: 'Primary character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
      {
        id: 'reference-palette',
        name: 'palette.png',
        title: 'Palette board',
        description: 'Color guide',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
      },
    ]);
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.doubleClick(screen.getByRole('button', { name: 'Select frame-1.png' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pin Point' }));

    const extraPromptInput = screen.getByRole('textbox', { name: 'Extra prompt' }) as HTMLDivElement & {
      value: string;
    };

    await act(async () => {
      extraPromptInput.value = 'Use @';
      await vi.runAllTimersAsync();
    });

    const heroOption = screen.getByRole('option', { name: /Hero face/ });
    const paletteOption = screen.getByRole('option', { name: /Palette board/ });
    expect(heroOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('listbox', { name: 'Extra prompt references' })).toHaveStyle({ bottom: '108px' });

    fireEvent.keyDown(extraPromptInput, { key: 'ArrowDown' });

    expect(heroOption).toHaveAttribute('aria-selected', 'false');
    expect(paletteOption).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(extraPromptInput, { key: 'Enter' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Palette board');
  });

  it('handles generated image copy, download, and delete actions from the grid context menu', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy frame-1.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download frame-1.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.copyGeneratedImage)).toHaveBeenCalledWith('generated-1');
    expect(vi.mocked(electronApi.downloadGeneratedImage)).toHaveBeenCalledWith('generated-1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete frame-1.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.deleteGeneratedImage)).toHaveBeenCalledWith('generated-1');
  });

  it('copies a generated image prompt from Classic image actions', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
        prompt: 'A cinematic control room frame',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt frame-1.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('A cinematic control room frame');
  });

  it('shows centered header actions for selected generated images and hides copy for multi-select', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
      {
        id: 'generated-2',
        fileName: 'frame-2.png',
        fileUrl: 'crenv-asset://generated?path=frame-2.png',
        createdAt: '2026-05-26T10:31:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: {
        get: () => 'image/png',
      },
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select frame-1.png' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Copy selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete selected images' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select frame-2.png' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole('button', { name: 'Copy selected images' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download selected images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete selected images' })).toBeInTheDocument();
  });

  it('can add selected classic images as one grouped item reference from the floating bar', async () => {
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
      {
        id: 'generated-2',
        fileName: 'frame-2.png',
        fileUrl: 'crenv-asset://generated?path=frame-2.png',
        createdAt: '2026-05-26T10:31:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      headers: { get: () => 'image/png' },
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select frame-1.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select frame-2.png' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add selected images as reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Item' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Environment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Character' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Hover bikes' },
    });
    fireEvent.click(screen.getAllByText('Save reference').at(-1)!);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createReferenceCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'objects',
        title: 'Hover bikes',
        attachments: [
          expect.objectContaining({ name: 'frame-1.png' }),
          expect.objectContaining({ name: 'frame-2.png' }),
        ],
      })
    );
  });

  it('shows the backend generation error message when generation fails', async () => {
    vi.mocked(electronApi.generateImages).mockRejectedValue(new Error('Codex CLI failed to initialize.'));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a studio portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(errors.getErrorMessage)).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to generate images'
    );
    expect(toast.error).toHaveBeenCalledWith('Codex CLI failed to initialize.');
  });

  it('attaches pasted images from the composer', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const pastedImage = new File(['paste-image'], 'pasted.png', { type: 'image/png' });
    Object.defineProperty(pastedImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use pasted image' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [pastedImage],
          items: [],
        },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            name: 'pasted.png',
            mimeType: 'image/png',
            bytesBase64: 'BQYHCA==',
          }),
        ],
      })
    );
  });

  it('renames duplicate composer attachments added from the picker', async () => {
    const firstImage = new File(['first-image'], 'image.png', { type: 'image/png' });
    const secondImage = new File(['second-image'], 'image.png', { type: 'image/png' });

    Object.defineProperty(firstImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });
    Object.defineProperty(secondImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('composer-reference-input'), {
        target: { files: [firstImage, secondImage] },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Open image.png' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open image-2.png' })).toBeInTheDocument();
  });

  it('renames duplicate pasted composer attachments before generation', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const firstImage = new File(['first-image'], 'image.png', { type: 'image/png' });
    const secondImage = new File(['second-image'], 'image.png', { type: 'image/png' });

    Object.defineProperty(firstImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });
    Object.defineProperty(secondImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use duplicate pasted images' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [firstImage],
          items: [],
        },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [secondImage],
          items: [],
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Open image.png' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open image-2.png' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            name: 'image.png',
            mimeType: 'image/png',
            bytesBase64: 'AQIDBA==',
          }),
          expect.objectContaining({
            name: 'image-2.png',
            mimeType: 'image/png',
            bytesBase64: 'BQYHCA==',
          }),
        ],
      })
    );
  });

  it('shows a settings control pinned at the bottom of the sidebar', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows the real app version in the sidebar header only', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.getAppInfo).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveTextContent('v9.8.7');
    expect(screen.queryByText('crevn v9.8.7')).not.toBeInTheDocument();
  });

  it('slides to the settings view when settings is clicked', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Characters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Environment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Objects' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Characters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to projects' })).toBeInTheDocument();
  });

  it('checks for updates from the settings view', async () => {
    const checkForUpdatesMock = vi.mocked(electronApi.checkForUpdates);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(checkForUpdatesMock).toHaveBeenCalled();
    expect(screen.getByText('No updates available.')).toBeInTheDocument();
  });

  it('saves the Gemini text provider key from settings', async () => {
    const updateProviderSettingsMock = vi.mocked(electronApi.updateProviderSettings);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Text' }));

    expect(screen.getByRole('heading', { name: 'Providers' })).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Gemini API key'), {
      target: { value: 'saved-gemini-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save provider key' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(updateProviderSettingsMock).toHaveBeenCalledWith({
      text: {
        gemini: {
          apiKey: 'saved-gemini-key',
        },
      },
    });
  });

  it('exports projects and threads from sidebar row actions', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export Project One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Thread One' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.exportProject).toHaveBeenCalledWith('project-1');
    expect(electronApi.exportThread).toHaveBeenCalledWith('thread-1');
  });

  it('imports project and thread archives from the project sidebar', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Import project or thread' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.importCrenv).toHaveBeenCalledWith('project-1');
  });

  it('imports reference archives from the references workspace', async () => {
    vi.mocked(electronApi.listReferences)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'imported-reference',
          collectionId: 'imported-reference-pack',
          environmentId: null,
          name: 'imported-reference.png',
          title: 'Imported Reference',
          description: 'Imported from a .refc archive.',
          mimeType: 'image/png',
          bytesBase64: 'AQID',
          createdAt: '2026-05-26T12:00:00.000Z',
          category: 'characters',
        },
      ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.importReference).toHaveBeenCalled();
    expect(screen.getByText('Imported Reference')).toBeInTheDocument();
  });

  it('exports only the clicked reference from the reference context menu', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hero-front',
        collectionId: 'hero-pack',
        environmentId: null,
        name: 'hero-front.png',
        title: 'Hero Pack',
        description: 'Front view',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
      {
        id: 'villain-front',
        collectionId: 'villain-pack',
        environmentId: null,
        name: 'villain-front.png',
        title: 'Villain Pack',
        description: 'Should not export.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const heroCard = screen.getByText('Hero Pack').closest('article');
    expect(heroCard).not.toBeNull();

    fireEvent.contextMenu(heroCard!);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export reference...' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.exportReference).toHaveBeenCalledWith({
      id: 'hero-front',
      title: 'Hero Pack',
      category: 'characters',
      collectionId: 'hero-pack',
      environmentId: null,
    });
  });

  it('switches between classic and scenes from the header tabs', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Scenes' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('classic-composer')).toBeInTheDocument();
    expect(screen.queryByTestId('scenes-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scenes-sidebar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Scenes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('scenes-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('scenes-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scene 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frame 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate frames' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New frame' })).toBeInTheDocument();
    expect(screen.getByText('Scene Description')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Scene Description' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add Reference' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Frame 1' }));

    expect(screen.getByRole('button', { name: 'Frame 1' })).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Rename Frame 2' }));
    fireEvent.change(screen.getByDisplayValue('Frame 2'), {
      target: { value: 'Intro shot' },
    });

    expect(screen.getByDisplayValue('Intro shot')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New frame' }));

    expect(screen.getByRole('button', { name: 'Frame 3' })).toBeInTheDocument();
  });

  it('keeps composer shell motion from creating a backdrop-filter root', () => {
    expect(COMPOSER_SHELL_MOTION.initial).not.toHaveProperty('filter');
    expect(COMPOSER_SHELL_MOTION.animate).not.toHaveProperty('filter');
    expect(COMPOSER_SHELL_MOTION.exit).not.toHaveProperty('filter');
  });

  it('does not create default frames for a new empty Scenes group', async () => {
    sceneGroupsFixture = [];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createSceneGroup).toHaveBeenCalledWith('thread-1', {
      title: 'Scene 1',
      prompt: '',
      tocOrder: 1,
    });
    expect(electronApi.createSceneFrame).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Frame 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Frame 2' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New frame' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createSceneFrame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
  });

  it('switches between generated scenes and renames the active scene', async () => {
    sceneGroupsFixture = [
      {
        ...makeSceneGroupsFixture()[0],
        id: 'scene-group-2',
        title: 'Reveal scene',
        tocOrder: 2,
        frames: [
          {
            ...makeSceneGroupsFixture()[0].frames[0],
            id: 'scene-frame-3',
            sceneGroupId: 'scene-group-2',
            title: 'Reveal frame',
            prompt: 'Reveal prompt.',
          },
        ],
      },
      makeSceneGroupsFixture()[0],
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Reveal scene' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Reveal frame' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scene 1' }));

    expect(screen.getByRole('button', { name: 'Scene 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rename scene Scene 1' }));
    fireEvent.change(screen.getByDisplayValue('Scene 1'), {
      target: { value: 'Garage entry' },
    });
    fireEvent.blur(screen.getByDisplayValue('Garage entry'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.updateSceneGroup).toHaveBeenCalledWith('scene-group-1', {
      title: 'Garage entry',
      prompt: '',
      tocOrder: 1,
    });
    expect(screen.getByRole('button', { name: 'Garage entry' })).toBeInTheDocument();
  });

  it('manages scenes from the workspace rail with search, drag reorder, and delete', async () => {
    sceneGroupsFixture = [
      {
        ...makeSceneGroupsFixture()[0],
        id: 'scene-group-2',
        title: 'Reveal scene',
        tocOrder: 2,
        frames: [
          {
            ...makeSceneGroupsFixture()[0].frames[0],
            id: 'scene-frame-3',
            sceneGroupId: 'scene-group-2',
            title: 'Reveal frame',
            prompt: 'Reveal prompt.',
          },
        ],
      },
      makeSceneGroupsFixture()[0],
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const rail = screen.getByTestId('scene-workspace-rail');
    expect(within(rail).getByRole('button', { name: 'Reveal scene' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rail).getByRole('button', { name: 'Scene 1' })).toBeInTheDocument();
    expect(within(rail).getAllByText('1 beat')).toHaveLength(2);

    fireEvent.change(within(rail).getByRole('searchbox', { name: 'Search scenes' }), {
      target: { value: 'reveal' },
    });

    expect(within(rail).getByRole('button', { name: 'Reveal scene' })).toBeInTheDocument();
    expect(within(rail).queryByRole('button', { name: 'Scene 1' })).not.toBeInTheDocument();

    fireEvent.change(within(rail).getByRole('searchbox', { name: 'Search scenes' }), {
      target: { value: '' },
    });

    const sceneOneDragHandle = within(rail).getByRole('button', { name: 'Drag scene Scene 1' });
    const sceneOneItem = within(rail).getByTestId('scene-rail-item-scene-group-1');
    const revealSceneItem = within(rail).getByTestId('scene-rail-item-scene-group-2');

    fireEvent.mouseDown(sceneOneDragHandle, { button: 0, clientX: 20, clientY: 80 });
    fireEvent.mouseMove(document, { button: 0, clientX: 20, clientY: 88 });
    expect(sceneOneItem).toHaveAttribute('data-dragging', 'true');

    fireEvent.mouseMove(document, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.mouseOver(revealSceneItem, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.mouseUp(document, { button: 0, clientX: 20, clientY: 20 });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(sceneOneItem).toHaveAttribute('data-dragging', 'false');
    expect(electronApi.updateSceneGroup).toHaveBeenCalledWith('scene-group-1', {
      title: 'Scene 1',
      prompt: '',
      tocOrder: 1,
    });
    expect(electronApi.updateSceneGroup).toHaveBeenCalledWith('scene-group-2', {
      title: 'Reveal scene',
      prompt: '',
      tocOrder: 2,
    });

    fireEvent.click(within(rail).getByRole('button', { name: 'Delete scene Reveal scene' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.deleteSceneGroup).toHaveBeenCalledWith('scene-group-2');
    expect(within(rail).queryByRole('button', { name: 'Reveal scene' })).not.toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Scene 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('deletes a frame from the active scene without deleting the scene', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Scene 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frame 2' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Frame 2' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.deleteSceneFrame).toHaveBeenCalledWith('scene-frame-2');
    expect(screen.getByRole('button', { name: 'Scene 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Frame 2' })).not.toBeInTheDocument();
  });

  it('converts pasted scene mentions using saved references case-insensitively', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValueOnce([
      {
        id: 'reference-tito',
        name: 'tito.png',
        title: 'Tito',
        description: 'Main character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const sceneInput = screen.getByRole('textbox', { name: 'Scene Description' });

    await act(async () => {
      fireEvent.paste(sceneInput, {
        clipboardData: {
          files: [],
          getData: (type: string) => {
            if (type === 'text/plain') return 'Use @tito, close-up';
            return '';
          },
        },
      });
    });

    expect(within(sceneInput).getByTestId('selected-reference-mention')).toHaveTextContent('Tito');
    expect(sceneInput).toHaveTextContent('Use Tito, close-up');
  });

  it('runs scene generation for the active scene group', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Generate frames' }));
    });

    expect(electronApi.generateSceneGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneGroupId: 'scene-group-1',
        fastMode: true,
      })
    );
  });

  it('runs scene generation for a single frame from the frame accordion', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Generate Frame 1' }));
    });

    expect(electronApi.generateSceneGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneGroupId: 'scene-group-1',
        targetFrameId: 'scene-frame-1',
      })
    );
  });

  it('shows scene generation feedback while frames are being generated', async () => {
    let resolveGeneration: ((value: Awaited<ReturnType<typeof electronApi.generateSceneGroup>>) => void) | null = null;
    vi.mocked(electronApi.generateSceneGroup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate frames' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByText('No scenes generated yet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop generation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Frame 1 · 1 loading')).toBeInTheDocument();
    expect(screen.getByLabelText('Frame 2 · 1 loading')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/loading$/i)).toHaveLength(2);

    sceneGroupsFixture = [
      {
        ...sceneGroupsFixture[0],
        runs: [
          {
            id: 'scene-run-1',
            sceneGroupId: 'scene-group-1',
            threadId: 'thread-1',
            status: 'running',
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            requestedFrameCount: 2,
            errorMessage: null,
            durationMs: null,
            createdAt: '2026-06-01T12:00:00.000Z',
            updatedAt: '2026-06-01T12:00:00.000Z',
          },
        ],
        frames: [
          {
            ...sceneGroupsFixture[0].frames[0],
            assets: [
              {
                id: 'scene-asset-1',
                sceneGroupRunId: 'scene-run-1',
                sceneFrameId: 'scene-frame-1',
                outputIndex: 0,
                originalPath: '/tmp/frame-1.png',
                storedPath: '/tmp/frame-1.png',
                fileName: 'frame-1.png',
                mimeType: 'image/png',
                width: 1280,
                height: 720,
                createdAt: '2026-06-01T12:00:01.000Z',
              },
            ],
          },
          sceneGroupsFixture[0].frames[1],
        ],
      },
    ];

    await act(async () => {
      sceneFrameReadyListener?.({
        threadId: 'thread-1',
        sceneGroupId: 'scene-group-1',
        frameId: 'scene-frame-1',
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByLabelText('Frame 1 · 1 loading')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Frame 2 · 1 loading')).toBeInTheDocument();

    const generatedSceneGroup = {
      ...sceneGroupsFixture[0],
      runs: [
        {
          id: 'scene-run-1',
          sceneGroupId: 'scene-group-1',
          threadId: 'thread-1',
          status: 'succeeded',
          provider: 'codex',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          requestedFrameCount: 2,
          errorMessage: null,
          durationMs: 1200,
          createdAt: '2026-06-01T12:00:00.000Z',
          updatedAt: '2026-06-01T12:00:01.200Z',
        },
      ],
      frames: [
        {
          ...sceneGroupsFixture[0].frames[0],
          assets: [
            {
              id: 'scene-asset-1',
              sceneGroupRunId: 'scene-run-1',
              sceneFrameId: 'scene-frame-1',
              outputIndex: 0,
              originalPath: '/tmp/frame-1.png',
              storedPath: '/tmp/frame-1.png',
              fileName: 'frame-1.png',
              mimeType: 'image/png',
              width: 1280,
              height: 720,
              createdAt: '2026-06-01T12:00:01.000Z',
            },
          ],
        },
        {
          ...sceneGroupsFixture[0].frames[1],
          assets: [
            {
              id: 'scene-asset-2',
              sceneGroupRunId: 'scene-run-1',
              sceneFrameId: 'scene-frame-2',
              outputIndex: 0,
              originalPath: '/tmp/frame-2.png',
              storedPath: '/tmp/frame-2.png',
              fileName: 'frame-2.png',
              mimeType: 'image/png',
              width: 1280,
              height: 720,
              createdAt: '2026-06-01T12:00:01.050Z',
            },
          ],
        },
      ],
    };

    await act(async () => {
      resolveGeneration?.(generatedSceneGroup as never);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Generate frames' })).not.toBeDisabled();
    expect(screen.queryByLabelText('Frame 1 · 1 loading')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Frame 2 · 1 loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('scene-workspace-rail')).toBeInTheDocument();
    expect(screen.queryByText(/outputs/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Codex / GPT-5.4 Mini')).not.toBeInTheDocument();
    expect(screen.getByText('Frame 1 · 1')).toBeInTheDocument();
    expect(screen.getByText('Frame 2 · 1')).toBeInTheDocument();
  });

  it('defers offscreen scene output grids when a scene has many generated frames', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    const observerCallbacks: IntersectionObserverCallback[] = [];
    const previousIntersectionObserver = window.IntersectionObserver;
    class MockIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];

      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }

      observe = (element: Element) => {
        observe(element);
      };
      unobserve = vi.fn();
      disconnect = disconnect;
      takeRecords = () => [];
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    sceneGroupsFixture = [
      {
        ...makeSceneGroupsFixture()[0],
        frames: Array.from({ length: 8 }, (_, frameIndex) => ({
          ...makeSceneGroupsFixture()[0].frames[0],
          id: `scene-frame-${frameIndex + 1}`,
          sceneGroupId: 'scene-group-1',
          title: `Frame ${frameIndex + 1}`,
          frameOrder: frameIndex + 1,
          assets: Array.from({ length: 3 }, (_, assetIndex) => ({
            id: `scene-asset-${frameIndex + 1}-${assetIndex + 1}`,
            sceneGroupRunId: 'scene-run-1',
            sceneFrameId: `scene-frame-${frameIndex + 1}`,
            outputIndex: assetIndex,
            originalPath: `/tmp/frame-${frameIndex + 1}-${assetIndex + 1}.png`,
            storedPath: `/tmp/frame-${frameIndex + 1}-${assetIndex + 1}.png`,
            fileName: `frame-${frameIndex + 1}-${assetIndex + 1}.png`,
            mimeType: 'image/png',
            width: 1280,
            height: 720,
            createdAt: '2026-06-01T12:00:01.000Z',
          })),
        })),
        runs: [
          {
            id: 'scene-run-1',
            sceneGroupId: 'scene-group-1',
            threadId: 'thread-1',
            status: 'succeeded',
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            requestedFrameCount: 8,
            errorMessage: null,
            durationMs: 1200,
            createdAt: '2026-06-01T12:00:00.000Z',
            updatedAt: '2026-06-01T12:00:01.200Z',
          },
        ],
      },
    ];

    try {
      render(<App />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getAllByTestId('generated-image-grid')).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Select Frame 1 · 1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Select Frame 8 · 1' })).not.toBeInTheDocument();
      expect(observe).toHaveBeenCalled();

      const frameEightObserver = observerCallbacks.at(-1);
      expect(frameEightObserver).toBeDefined();

      await act(async () => {
        frameEightObserver?.(
          [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(screen.getByRole('button', { name: 'Select Frame 8 · 1' })).toBeInTheDocument();
      expect(screen.getAllByTestId('generated-image-grid')).toHaveLength(4);

      await act(async () => {
        frameEightObserver?.(
          [{ isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(screen.queryByRole('button', { name: 'Select Frame 8 · 1' })).not.toBeInTheDocument();
      expect(screen.getAllByTestId('generated-image-grid')).toHaveLength(3);
    } finally {
      window.IntersectionObserver = previousIntersectionObserver;
    }
  });

  it('virtualizes the scenes sidebar without forcing the workspace into a nested scroller', async () => {
    const previousIntersectionObserver = window.IntersectionObserver;
    class MockIntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];

      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    sceneGroupsFixture = [
      {
        ...makeSceneGroupsFixture()[0],
        frames: Array.from({ length: 80 }, (_, frameIndex) => ({
          ...makeSceneGroupsFixture()[0].frames[0],
          id: `scene-frame-${frameIndex + 1}`,
          sceneGroupId: 'scene-group-1',
          title: `Frame ${frameIndex + 1}`,
          frameOrder: frameIndex + 1,
          assets: [
            {
              id: `scene-asset-${frameIndex + 1}`,
              sceneGroupRunId: 'scene-run-1',
              sceneFrameId: `scene-frame-${frameIndex + 1}`,
              outputIndex: 0,
              originalPath: `/tmp/frame-${frameIndex + 1}.png`,
              storedPath: `/tmp/frame-${frameIndex + 1}.png`,
              fileName: `frame-${frameIndex + 1}.png`,
              mimeType: 'image/png',
              width: 1280,
              height: 720,
              createdAt: '2026-06-01T12:00:01.000Z',
            },
          ],
        })),
        runs: [
          {
            id: 'scene-run-1',
            sceneGroupId: 'scene-group-1',
            threadId: 'thread-1',
            status: 'succeeded',
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            requestedFrameCount: 80,
            errorMessage: null,
            durationMs: 1200,
            createdAt: '2026-06-01T12:00:00.000Z',
            updatedAt: '2026-06-01T12:00:01.200Z',
          },
        ],
      },
    ];

    try {
      render(<App />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByRole('button', { name: 'Frame 1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Frame 80' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paste clipboard image as Frame 80 output' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Select Frame 80 · 1' })).not.toBeInTheDocument();
    } finally {
      window.IntersectionObserver = previousIntersectionObserver;
    }
  });

  it('copies scene output images from the Scenes grid actions', async () => {
    sceneGroupsFixture = [
      {
        ...makeSceneGroupsFixture()[0],
        runs: [
          {
            id: 'scene-run-1',
            sceneGroupId: 'scene-group-1',
            threadId: 'thread-1',
            status: 'succeeded',
            provider: 'codex',
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            requestedFrameCount: 1,
            errorMessage: null,
            durationMs: 1200,
            createdAt: '2026-06-01T12:00:00.000Z',
            updatedAt: '2026-06-01T12:00:01.200Z',
          },
        ],
        frames: [
          {
            ...makeSceneGroupsFixture()[0].frames[0],
            assets: [
              {
                id: 'scene-asset-1',
                sceneGroupRunId: 'scene-run-1',
                sceneFrameId: 'scene-frame-1',
                outputIndex: 0,
                originalPath: '/tmp/frame-1.png',
                storedPath: '/tmp/frame-1.png',
                fileName: 'frame-1.png',
                mimeType: 'image/png',
                width: 1280,
                height: 720,
                createdAt: '2026-06-01T12:00:01.000Z',
              },
            ],
          },
        ],
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy Frame 1 · 1' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.copyGeneratedImage)).toHaveBeenCalledWith('scene-asset-1');
  });

  it('stops scene generation without clearing prompts', async () => {
    let resolveGeneration: ((value: Awaited<ReturnType<typeof electronApi.generateSceneGroup>>) => void) | null = null;
    vi.mocked(electronApi.generateSceneGroup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Scene Description' }), {
        target: { value: 'Keep Tito in the same control room' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Describe the opening frame' }), {
        target: { value: 'Wide control-room establishing frame' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate frames' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Stop generation' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop generation' }));
      await vi.runAllTimersAsync();
    });

    expect(electronApi.cancelSceneGroupGeneration).toHaveBeenCalledWith('scene-group-1');
    expect(screen.getByRole('button', { name: 'Generate frames' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Scene Description' })).toHaveValue(
      'Keep Tito in the same control room'
    );
    expect(screen.getByRole('textbox', { name: 'Describe the opening frame' })).toHaveValue(
      'Wide control-room establishing frame'
    );

    await act(async () => {
      resolveGeneration?.(sceneGroupsFixture[0] as never);
      await vi.runAllTimersAsync();
    });
  });

  it('reads the clipboard and fills the scene description and frame prompts in English', async () => {
    const clipboardReadText = vi.fn(async () => 'Cena colada do clipboard');
    Object.assign(navigator, {
      clipboard: {
        readText: clipboardReadText,
      },
    });

    vi.mocked(electronApi.structureScenePrompt).mockResolvedValueOnce({
      sceneDescription: 'The team arrives in the futuristic garage and prepares for departure.',
      frames: [
        { prompt: 'Wide establishing frame of the garage entrance and the team arriving.' },
        { prompt: 'Medium-wide frame revealing safety gear and all vehicles.' },
        { prompt: 'Close-up of Tito securing his helmet beside the orange motorcycle.' },
      ],
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Structure scene from clipboard' }));
      await vi.runAllTimersAsync();
    });

    expect(clipboardReadText).toHaveBeenCalledTimes(1);
    expect(electronApi.structureScenePrompt).toHaveBeenCalledWith({
      sourceText: 'Cena colada do clipboard',
      modelId: 'codex-gpt-5-4-mini',
    });
    expect(screen.getByRole('textbox', { name: 'Scene Description' })).toHaveTextContent(
      'The team arrives in the futuristic garage and prepares for departure.'
    );
    const frameTextboxes = screen.getAllByRole('textbox', { name: /Describe/ });
    expect(frameTextboxes[0]).toHaveTextContent('Wide establishing frame of the garage entrance and the team arriving.');
    expect(frameTextboxes[1]).toHaveTextContent('Medium-wide frame revealing safety gear and all vehicles.');
    expect(electronApi.createSceneFrame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Frame 3' })).toBeInTheDocument();
  });

  it('shows a loading state on the scene-structure wand while clipboard structuring is running', async () => {
    const clipboardReadText = vi.fn(async () => 'Scene from clipboard');
    Object.assign(navigator, {
      clipboard: {
        readText: clipboardReadText,
      },
    });

    let resolveStructure: ((value: Awaited<ReturnType<typeof electronApi.structureScenePrompt>>) => void) | null = null;
    vi.mocked(electronApi.structureScenePrompt).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStructure = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Structure scene from clipboard' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Structure scene from clipboard' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Structure scene from clipboard' })).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolveStructure?.({
        sceneDescription: 'Structured scene description',
        frames: [{ prompt: 'Frame one' }, { prompt: 'Frame two' }],
      } as never);
      await vi.runAllTimersAsync();
    });

    expect(clipboardReadText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Structure scene from clipboard' })).not.toBeDisabled();
  });

  it('shows loading only for the targeted frame when generating from the frame accordion', async () => {
    let resolveGeneration: ((value: Awaited<ReturnType<typeof electronApi.generateSceneGroup>>) => void) | null = null;
    vi.mocked(electronApi.generateSceneGroup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Frame 1' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Generating Frame 1' })).toBeDisabled();
    expect(screen.getByLabelText('Frame 1 · 1 loading')).toBeInTheDocument();
    expect(screen.queryByLabelText('Frame 2 · 1 loading')).not.toBeInTheDocument();

    await act(async () => {
      resolveGeneration?.(sceneGroupsFixture[0] as never);
      await vi.runAllTimersAsync();
    });
  });

  it('passes the live scene description, frame prompts, and scene references into scene generation', async () => {
    const sceneReference = new File(['scene-ref'], 'scene-ref.png', { type: 'image/png' });
    const frameReference = new File(['frame-ref'], 'frame-ref.png', { type: 'image/png' });
    Object.defineProperty(sceneReference, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });
    Object.defineProperty(frameReference, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([9, 8, 7, 6]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox', { name: 'Scene Description' }), {
        target: { value: 'Control room continuity with Tito and warm monitors' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Describe the opening frame' }), {
        target: { value: 'Wide establishing shot of the control room' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: 'Describe this frame' }), {
        target: { value: 'Closer reaction shot on Tito at the console' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('scene-description-reference-input'), {
        target: { files: [sceneReference] },
      });
      fireEvent.change(screen.getByTestId('scene-frame-1-reference-input'), {
        target: { files: [frameReference] },
      });
      await vi.runAllTimersAsync();
    });

    expect(electronApi.saveSceneFrameReferences).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Generate frames' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.generateSceneGroup).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sceneGroupId: 'scene-group-1',
        promptOverride: 'Control room continuity with Tito and warm monitors',
        frameOverrides: [
          expect.objectContaining({
            id: 'scene-frame-1',
            title: 'Frame 1',
            prompt: 'Wide establishing shot of the control room',
            references: [
              expect.objectContaining({
                name: 'frame-ref.png',
                mimeType: 'image/png',
              }),
            ],
          }),
          expect.objectContaining({
            id: 'scene-frame-2',
            title: 'Frame 2',
            prompt: 'Closer reaction shot on Tito at the console',
            references: [],
          }),
        ],
        referenceImages: [
          expect.objectContaining({
            name: 'scene-ref.png',
            mimeType: 'image/png',
          }),
        ],
      })
    );
  });

  it('pastes the native clipboard image into the clicked scene frame output list only', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole('button', { name: 'Select Frame 1 · 1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Paste clipboard image as Frame 1 output' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.pasteClipboardImageToSceneFrame).toHaveBeenCalledWith('scene-frame-1');
    expect(screen.getByRole('button', { name: 'Select Frame 1 · 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select Frame 2 · 1' })).not.toBeInTheDocument();
  });

  it('creates a frame even if the active scene group is still missing locally', async () => {
    vi.mocked(electronApi.listSceneGroups).mockResolvedValue([]);
    vi.mocked(electronApi.createSceneGroup).mockImplementationOnce(async () => ({
      id: 'scene-group-created',
      threadId: 'thread-1',
      title: 'Scene 1',
      prompt: '',
      tocOrder: 1,
      createdAt: '2026-06-01T10:10:00.000Z',
      updatedAt: '2026-06-01T10:10:00.000Z',
      frames: [],
      runs: [],
    }));
    vi.mocked(electronApi.createSceneFrame).mockImplementation(async (sceneGroupId, input) => ({
      id: sceneGroupId,
      threadId: 'thread-1',
      title: 'Scene 1',
      prompt: '',
      tocOrder: 1,
      createdAt: '2026-06-01T10:10:00.000Z',
      updatedAt: '2026-06-01T10:10:00.000Z',
      frames: [
        {
          id: 'scene-frame-created',
          sceneGroupId,
          title: input.title,
          prompt: input.prompt,
          frameOrder: input.frameOrder,
          createdAt: '2026-06-01T10:11:00.000Z',
          updatedAt: '2026-06-01T10:11:00.000Z',
          references: [],
          assets: [],
        },
      ],
      runs: [],
    }));

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New frame' }));
    });

    expect(electronApi.createSceneGroup).toHaveBeenCalled();
    expect(electronApi.createSceneFrame).toHaveBeenCalled();
  });

  it('resizes the scenes sidebar when dragging the resize handle', async () => {
    window.innerWidth = 1400;

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const sidebarShell = screen.getByTestId('scenes-sidebar-shell');
    const resizeHandle = screen.getByRole('button', { name: 'Resize scenes sidebar' });

    expect(sidebarShell).toHaveStyle({ width: '500px' });

    await act(async () => {
      fireEvent.pointerDown(resizeHandle, { pointerId: 1, clientX: 900, button: 0 });
    });

    await act(async () => {
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 760 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 760 });
    });

    expect(sidebarShell).toHaveStyle({ width: '640px' });
  });

  it('keeps the scene composer above the attachment strip', async () => {
    const frameReference = new File(['scene-ref'], 'scene-ref.png', { type: 'image/png' });
    Object.defineProperty(frameReference, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([9, 8, 7, 6]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('scene-frame-1-reference-input'), {
        target: { files: [frameReference] },
      });
      await vi.runAllTimersAsync();
    });

    const composerShell = screen.getByTestId('scene-frame-1-composer-shell');
    const attachmentsRow = screen.getByTestId('scene-frame-1-attachments-row');

    expect(composerShell.className).toContain('min-h-0');
    expect(composerShell.className).toContain('flex-1');
    expect(attachmentsRow.className).not.toContain('absolute');
    expect(within(attachmentsRow).getByRole('button', { name: 'Add Reference' })).toBeInTheDocument();
    expect(screen.getByAltText('scene-ref.png')).toBeInTheDocument();
  });

  it('opens character references inside the newest folder with a right sidebar and breadcrumb header', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-older',
        category: 'characters',
        title: 'Milo',
        parentFolderId: null,
        createdAt: '2026-05-26T12:00:00.000Z',
      },
      {
        id: 'character-folder-newer',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const sidebar = screen.getByTestId('reference-sidebar-shell');
    expect(sidebar.className).toContain('right-0');
    expect(within(sidebar).getByRole('button', { name: 'Lumo' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Milo' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Import references' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Create reference folder' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Resize references sidebar' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Character > Lumo' })).toBeInTheDocument();
    expect(screen.queryByTestId('reference-grid')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Save character visuals and identity notes for consistent people across generations.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Pasta vazia')).toBeInTheDocument();
  });

  it('keeps the add-image tile visible when a reference folder only has subfolders', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-parent',
        category: 'characters',
        title: 'Characters',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
      {
        id: 'character-folder-child',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: 'character-folder-parent',
        createdAt: '2026-05-26T12:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('reference-subfolder-grid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add images to folder' })).toBeInTheDocument();
    expect(screen.queryByText('Pasta vazia')).not.toBeInTheDocument();
  });

  it('resizes the references sidebar when dragging the resize handle', async () => {
    window.innerWidth = 1400;
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-newer',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const sidebarShell = screen.getByTestId('reference-sidebar-shell');
    const resizeHandle = screen.getByRole('button', { name: 'Resize references sidebar' });

    expect(sidebarShell).toHaveStyle({ width: '500px' });

    await act(async () => {
      fireEvent.pointerDown(resizeHandle, { pointerId: 1, clientX: 900, button: 0 });
    });

    await act(async () => {
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 760 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 760 });
    });

    expect(sidebarShell).toHaveStyle({ width: '640px' });
  });

  it('opens reference folder metadata on folder double click', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-parent',
        category: 'characters',
        title: 'Characters',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
      {
        id: 'character-folder-child',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: 'character-folder-parent',
        createdAt: '2026-05-26T12:00:00.000Z',
      },
    ]);
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'character-reference-1',
        collectionId: 'character-folder-child',
        environmentId: null,
        name: 'front.png',
        title: 'Front view',
        groupTitle: 'Lumo',
        description: 'Use for face continuity.',
        groupDescription: 'Use for all Lumo generations.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
        parentFolderId: 'character-folder-parent',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.doubleClick(screen.getByText('Lumo').closest('button')!);

    expect(screen.getByRole('dialog', { name: 'Edit reference metadata' })).toBeInTheDocument();
    expect(screen.getByLabelText('Reference group name')).toHaveValue('Lumo');
    expect(screen.getByLabelText('When to use this reference group')).toHaveValue('Use for all Lumo generations.');
  });

  it('does not enter a reference subfolder on single click', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-parent',
        category: 'characters',
        title: 'Characters',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
      {
        id: 'character-folder-child',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: 'character-folder-parent',
        createdAt: '2026-05-26T12:00:00.000Z',
      },
    ]);
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'character-reference-1',
        collectionId: 'character-folder-child',
        environmentId: null,
        name: 'front.png',
        title: 'Front view',
        groupTitle: 'Lumo',
        description: 'Use for face continuity.',
        groupDescription: 'Use for all Lumo generations.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
        parentFolderId: 'character-folder-parent',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('heading', { name: 'Character > Characters' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lumo Lumo 1 imagem' }));

    expect(screen.getByRole('heading', { name: 'Character > Characters' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Edit reference metadata' })).not.toBeInTheDocument();
  });

  it('opens reference image metadata on image double click without changing single click selection', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'character-folder-newer',
        category: 'characters',
        title: 'Lumo',
        parentFolderId: null,
        createdAt: '2026-05-26T13:00:00.000Z',
      },
    ]);
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'character-reference-1',
        collectionId: 'character-folder-newer',
        environmentId: null,
        name: 'front.png',
        title: 'Front view',
        groupTitle: 'Lumo',
        description: 'Use for face continuity.',
        groupDescription: 'Use for all Lumo generations.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
        parentFolderId: null,
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const imageItem = screen.getByRole('button', { name: 'Front view' });
    fireEvent.click(imageItem);
    expect(imageItem).toHaveAttribute('data-selected', 'true');

    fireEvent.doubleClick(imageItem);

    expect(screen.getByRole('dialog', { name: 'Edit reference metadata' })).toBeInTheDocument();
    expect(screen.getByLabelText('Image name')).toHaveValue('Front view');
    expect(screen.getByLabelText('When to use this image')).toHaveValue('Use for face continuity.');
  });

  it('accepts dropped images in the add reference dialog', async () => {
    const droppedImage = new File(['drop-reference'], 'dropped.png', { type: 'image/png' });
    Object.defineProperty(droppedImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([7, 7, 7, 7]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add character images' }));
    fireEvent.drop(screen.getByText('Drop an image here'), {
      dataTransfer: { files: [droppedImage] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Dropped guide' },
    });
    fireEvent.click(screen.getAllByText('Save reference').at(-1)!);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createReference).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'dropped.png',
        title: 'Dropped guide',
        bytesBase64: 'BwcHBw==',
      })
    );
  });

  it('allows multiple environment images with one shared description', async () => {
    const imageOne = new File(['env-1'], 'env-1.png', { type: 'image/png' });
    const imageTwo = new File(['env-2'], 'env-2.png', { type: 'image/png' });
    Object.defineProperty(imageOne, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });
    Object.defineProperty(imageTwo, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add environment images' }));
    fireEvent.change(screen.getByLabelText('Images'), {
      target: { files: [imageOne, imageTwo] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Warehouse' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Concrete floor, industrial lighting, steel shelves.' },
    });
    fireEvent.click(screen.getAllByText('Save reference').at(-1)!);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createReferenceCollection).toHaveBeenCalledTimes(1);
    expect(electronApi.createReferenceCollection).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        category: 'environment',
        title: 'Warehouse',
        description: 'Concrete floor, industrial lighting, steel shelves.',
        attachments: [
          expect.objectContaining({ name: 'env-1.png' }),
          expect.objectContaining({ name: 'env-2.png' }),
        ],
      })
    );
  });

  it('keeps the add reference dialog scrollable when many images are selected', async () => {
    const referenceImages = Array.from({ length: 14 }, (_, index) => {
      const image = new File([`reference-${index}`], `reference-${index + 1}.png`, { type: 'image/png' });
      Object.defineProperty(image, 'arrayBuffer', {
        value: vi.fn(async () => Uint8Array.from([index + 1, 2, 3, 4]).buffer),
      });
      return image;
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add character images' }));
    fireEvent.change(screen.getByLabelText('Images'), {
      target: { files: referenceImages },
    });

    const dialog = screen.getByTestId('add-reference-dialog');
    const scrollRegion = screen.getByTestId('add-reference-dialog-scroll');
    const footer = screen.getByTestId('add-reference-dialog-footer');

    expect(dialog.className).toContain('max-w-[1180px]');
    expect(scrollRegion.className).toContain('overflow-y-auto');
    expect(scrollRegion.className).toContain('lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]');
    expect(footer.className).toContain('sticky');
    expect(screen.getByRole('button', { name: 'Save reference' })).toBeInTheDocument();
  });

  it('edits environment references with the same split layout and saves per-image titles', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'environment-reference-2',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-2.png',
        title: 'Office corner',
        groupTitle: 'Warehouse',
        description: 'Existing second note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    const editDialog = screen.getByRole('dialog', { name: 'Edit environment' });
    expect(editDialog.className).toContain('max-w-[1180px]');

    fireEvent.click(screen.getByRole('button', { name: 'Edit render metadata for env-1.png' }));
    fireEvent.change(screen.getAllByTestId('reference-attachment-title-input').at(-1)!, {
      target: { value: 'Primary dock angle' },
    });
    fireEvent.change(screen.getAllByTestId('reference-attachment-description-input').at(-1)!, {
      target: { value: 'Updated dock note' },
    });
    fireEvent.click(screen.getAllByTestId('reference-attachment-save-button').at(-1)!);

    fireEvent.click(screen.getAllByText('Save changes').at(-1)!);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.updateReferenceCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'environment-1',
        category: 'environment',
        title: 'Warehouse',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            id: 'environment-reference-1',
            title: 'Primary dock angle',
            description: 'Updated dock note',
          }),
        ]),
      })
    );
  });

  it('opens an environment attachment preview on double click while editing', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Open env-1.png' }));

    expect(screen.getByRole('img', { name: 'env-1.png preview', hidden: true })).toBeInTheDocument();
  });

  it('shows a context menu for an environment attachment while editing', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Open env-1.png' }));

    expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    });

    expect(screen.getByRole('img', { name: 'env-1.png preview', hidden: true })).toBeInTheDocument();
  });

  it('shows primary and angle tabs in add reference and moves files between them', async () => {
    const primary = new File(['env-1'], 'env-1.png', { type: 'image/png' });
    const angle = new File(['env-2'], 'env-2.png', { type: 'image/png' });
    Object.defineProperty(primary, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });
    Object.defineProperty(angle, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add environment images' }));
    fireEvent.change(screen.getByLabelText('Images'), {
      target: { files: [primary, angle] },
    });

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ângulos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));

    expect(screen.getByText('env-1')).toBeInTheDocument();
  });

  it('moves the only new environment image from Ambiente to Ângulos', async () => {
    const primary = new File(['env-1'], 'env-1.png', { type: 'image/png' });
    Object.defineProperty(primary, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add environment images' }));
    fireEvent.change(screen.getByLabelText('Images'), {
      target: { files: [primary] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));

    expect(screen.getByText('env-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move env-1.png to Ambiente' })).toBeInTheDocument();
  });

  it('shows primary and angle tabs in edit reference and moves attachments between them before save', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'environment-reference-2',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-2.png',
        title: 'Office corner',
        groupTitle: 'Warehouse',
        description: 'Existing second note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ângulos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));
    expect(screen.getByText('Dock angle')).toBeInTheDocument();
  });

  it('moves the only existing environment attachment from Ambiente to Ângulos', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));

    expect(screen.getByText('Dock angle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move env-1.png to Ambiente' })).toBeInTheDocument();
  });

  it('adds a new environment attachment in edit reference without breaking bucket moves', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);
    const newAngle = new File(['env-2'], 'env-2.png', { type: 'image/png' });
    Object.defineProperty(newAngle, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add images' }));
    const editDialog = screen.getByRole('dialog', { name: 'Edit environment' });
    const fileInput = editDialog.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [newAngle] },
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));
    expect(screen.getByAltText('env-2.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move env-2.png to Ambiente' }));
    expect(screen.getByRole('tab', { name: 'Ângulos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ambiente' }));

    expect(screen.getByAltText('env-1.png')).toBeInTheDocument();
    expect(screen.getByAltText('env-2.png')).toBeInTheDocument();
  });

  it('saves environment attachment sections without forcing a single Ambiente image', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'environment-reference-2',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-2.png',
        title: 'Office corner',
        groupTitle: 'Warehouse',
        description: 'Existing second note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));
    fireEvent.click(screen.getAllByText('Save changes').at(-1)!);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const updateCall = vi.mocked(electronApi.updateReferenceCollection).mock.calls.at(-1)?.[0];
    expect(updateCall).toMatchObject({
      category: 'environment',
      collectionId: 'environment-1',
    });
    expect(updateCall?.attachments?.[0]).toMatchObject({
      id: 'environment-reference-1',
      title: 'Dock angle',
      section: 'angles',
    });
    expect(updateCall?.attachments?.[1]).toMatchObject({
      id: 'environment-reference-2',
      title: 'Office corner',
      section: 'angles',
    });
  });

  it('loads saved environment attachment sections instead of deriving them by order', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        section: 'angles',
      },
      {
        id: 'environment-reference-2',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-2.png',
        title: 'Office corner',
        groupTitle: 'Warehouse',
        description: 'Existing second note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
        section: 'primary',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByAltText('env-2.png')).toBeInTheDocument();
    expect(screen.queryByAltText('env-1.png')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));

    expect(screen.getByAltText('env-1.png')).toBeInTheDocument();
  });

  it('does not revoke live environment thumbnails when swapping between primary and angles', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'environment-reference-1',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-1.png',
        title: 'Dock angle',
        groupTitle: 'Warehouse',
        description: 'Old note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'environment-reference-2',
        collectionId: 'environment-1',
        environmentId: 'environment-1',
        name: 'env-2.png',
        title: 'Office corner',
        groupTitle: 'Warehouse',
        description: 'Existing second note',
        groupDescription: 'Shared warehouse continuity.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Warehouse' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move env-1.png to Ângulos' }));

    expect(screen.getByRole('tab', { name: 'Ambiente' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No images in this tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Ângulos' }));

    expect(screen.getByAltText('env-1.png')).toBeInTheDocument();
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('filters reference mentions after @ and inserts the selected name', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-hero',
        name: 'hero.png',
        title: 'Hero face',
        description: 'Primary character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
      {
        id: 'reference-palette',
        name: 'palette.png',
        title: 'Palette board',
        description: null,
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @hero' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Hero face' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Palette board' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Hero face' }));
      await vi.runAllTimersAsync();
    });

    expect(composerInput).toHaveValue('Use Hero face ');
    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hero face');
    expect(screen.getByTestId('selected-reference-mention')).toHaveStyle({ color: 'var(--accent)' });
  });

  it('groups multi-angle saved references into one @ mention option', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'garage-high',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-high.png',
        title: 'Garagem',
        description: 'High-angle interior view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @gar' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByRole('option', { name: 'Garagem' })).toHaveLength(1);
    expect(screen.getByText((content) => content.includes('2 angles'))).toBeInTheDocument();
  });

  it('shows attachment selector options after typing # for a grouped reference', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hangar-wide',
        name: 'hangar-wide.png',
        title: 'Wide Base',
        groupTitle: 'Hangar',
        description: 'Master wide environment plate.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
      {
        id: 'hangar-console',
        name: 'hangar-console.png',
        title: 'Console Detail',
        groupTitle: 'Hangar',
        description: 'Close crop of the launch console lights.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @Hangar#' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Wide Base' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Console Detail' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hangar' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Console Detail' }));
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Console Detail');
    expect(composerInput).toHaveValue('Use Console Detail ');
  });

  it('shows folder images after typing a dot for a grouped reference', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hangar-wide',
        name: 'hangar-wide.png',
        title: 'Wide Base',
        groupTitle: 'Hangar',
        description: 'Master wide environment plate.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
      {
        id: 'hangar-console',
        name: 'hangar-console.png',
        title: 'Console Detail',
        groupTitle: 'Hangar',
        description: 'Close crop of the launch console lights.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @Hangar.' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Wide Base' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Console Detail' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Console Detail' }));
      await vi.runAllTimersAsync();
    });

    // The chosen image is folded into the chip; no dangling ".suffix" text.
    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Console Detail');
    expect(composerInput).toHaveValue('Use Console Detail ');
  });

  it('accepts the highlighted folder image with the Tab key', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hangar-wide',
        name: 'hangar-wide.png',
        title: 'Wide Base',
        groupTitle: 'Hangar',
        description: 'Master wide environment plate.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @Hangar.' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Wide Base' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Tab' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Wide Base');
    expect(composerInput).toHaveValue('Use Wide Base ');
  });

  it('reopens selector mode after typing # immediately after an existing mention node', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hangar-wide',
        name: 'hangar-wide.png',
        title: 'Wide Base',
        groupTitle: 'Hangar',
        description: 'Master wide environment plate.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
      {
        id: 'hangar-console',
        name: 'hangar-console.png',
        title: 'Console Detail',
        groupTitle: 'Hangar',
        description: 'Close crop of the launch console lights.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="hangar-set" data-mention-title="Hangar">Hangar</span>#'
              : 'Hangar#',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Wide Base' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Console Detail' })).toBeInTheDocument();
  });

  it('drills through a nested subfolder to its individual images with successive dots', async () => {
    vi.mocked(electronApi.listReferenceFolders).mockResolvedValue([
      {
        id: 'folder-root',
        category: 'characters',
        title: 'Personagens',
        parentFolderId: null,
        createdAt: '2026-05-26T12:00:00.000Z',
      },
      {
        id: 'folder-sub',
        category: 'characters',
        title: 'Heroi',
        parentFolderId: 'folder-root',
        createdAt: '2026-05-26T12:01:00.000Z',
      },
    ]);
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hero-front',
        name: 'hero-front.png',
        title: 'Frente',
        description: 'Front view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:02:00.000Z',
        category: 'characters',
        parentFolderId: 'folder-sub',
      },
      {
        id: 'hero-back',
        name: 'hero-back.png',
        title: 'Costas',
        description: 'Back view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:03:00.000Z',
        category: 'characters',
        parentFolderId: 'folder-sub',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');

    // First dot after the root folder chip lists its subfolder.
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="folder-root" data-mention-title="Personagens">Personagens</span>.'
              : 'Personagens.',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Heroi' })).toBeInTheDocument();

    // A second dot drills into the subfolder and lists its individual images.
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="folder-root" data-mention-title="Personagens">Personagens</span>.Heroi.'
              : 'Personagens.Heroi.',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Frente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Costas' })).toBeInTheDocument();

    // Once a subfolder chip has replaced the parent, a single dot after it
    // drills directly into that subfolder's images.
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="folder-sub" data-mention-title="Heroi">Heroi</span>.'
              : 'Heroi.',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('option', { name: 'Frente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Costas' })).toBeInTheDocument();
  });

  it('keeps the active selector option scrolled into view during keyboard navigation', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        id: `hangar-angle-${index + 1}`,
        name: `hangar-angle-${index + 1}.png`,
        title: `Angle ${index + 1}`,
        groupTitle: 'Hangar',
        description: `Angle note ${index + 1}`,
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: `2026-05-26T12:0${index}:00.000Z`,
        category: 'environment' as const,
        collectionId: 'hangar-set',
      })),
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    const scrollIntoViewSpy = vi.mocked(HTMLElement.prototype.scrollIntoView);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @Hangar#' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'ArrowDown' });
      fireEvent.keyDown(composerInput, { key: 'ArrowDown' });
      await vi.runAllTimersAsync();
    });

    expect(scrollIntoViewSpy).toHaveBeenCalled();
    scrollIntoViewSpy.mockRestore();
  });

  it('expands a selected multi-angle @ reference into all images for generation', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'garage-high',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-high.png',
        title: 'Garagem',
        description: 'High-angle interior view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Make a shot inside @gar' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      const option = screen.getByRole('option', { name: 'Garagem' });
      fireEvent.pointerDown(option);
      fireEvent.mouseDown(option);
      fireEvent.click(option);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(screen.queryByRole('option', { name: 'Garagem' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('RefImage1 (Garagem)'),
        referenceImages: [
          expect.objectContaining({
            name: 'garage-front.png',
            description: expect.stringContaining('Front-facing symmetrical view.'),
          }),
          expect.objectContaining({
            name: 'garage-high.png',
            description: expect.stringContaining('High-angle interior view.'),
          }),
        ],
      })
    );
  });

  it('inserts a grouped @ mention with Enter', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'garage-high',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-high.png',
        title: 'Garagem',
        description: 'High-angle interior view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @gar' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Enter' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(composerInput).toHaveValue('Use Garagem ');
  });

  it('can tag a selected generated image and sends it as generation context', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: { get: () => 'image/png' },
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gridButton = screen.getByRole('button', { name: 'Select frame-1.png' });
    fireEvent.click(gridButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use @frame' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'frame-1' }));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Use RefImage1 (frame-1)'),
        referenceImages: [
          expect.objectContaining({
            name: 'frame-1.png',
            title: 'RefImage1',
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
  });

  it('preserves pasted reference mentions so copied prompts keep image context', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-hero',
        name: 'hero.png',
        title: 'Hero face',
        description: 'Primary character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="reference-hero" data-mention-title="Hero face">Hero face</span> on black'
              : 'Hero face on black',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hero face');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('RefImage1 (Hero face) on black'),
        referenceImages: [
          expect.objectContaining({
            name: 'hero.png',
            title: 'RefImage1',
            description: 'Primary character',
            bytesBase64: 'AQID',
          }),
        ],
      })
    );
  });

  it('resolves @Reference#image selectors against per-image titles and only attaches the matched image', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'hangar-wide',
        name: 'hangar-wide.png',
        title: 'Wide Base',
        groupTitle: 'Hangar',
        description: 'Master wide environment plate.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
      {
        id: 'hangar-console',
        name: 'hangar-console.png',
        title: 'Console Detail',
        groupTitle: 'Hangar',
        description: 'Close crop of the launch console lights.',
        groupDescription: 'Primary hangar continuity set.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
        collectionId: 'hangar-set',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) => {
            if (type === 'text/plain') return 'Frame on @Hangar#console-detail during launch';
            return '';
          },
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Hangar');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Frame on RefImage1 (Hangar - Console Detail) during launch'),
        referenceImages: [
          expect.objectContaining({
            name: 'hangar-console.png',
            title: 'RefImage1',
            description: expect.stringContaining('Reference set: Hangar.'),
          }),
        ],
      }),
    );
  });

  it('rehydrates pasted generated-image mentions from the current image list', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listGeneratedImages).mockResolvedValue([
      {
        id: 'generated-1',
        fileName: 'frame-1.png',
        fileUrl: 'crenv-asset://generated?path=frame-1.png',
        createdAt: '2026-05-26T10:30:00.000Z',
      },
    ]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      blob: async () => new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'image/png' }),
      headers: { get: () => 'image/png' },
    } as Response);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [],
          getData: (type: string) =>
            type === 'text/html'
              ? '<span data-testid="selected-reference-mention" data-mention-id="generated-reference-generated-1" data-mention-title="frame-1">frame-1</span> on black'
              : 'frame-1 on black',
        },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('RefImage1 (frame-1) on black'),
        referenceImages: [
          expect.objectContaining({
            name: 'frame-1.png',
            title: 'RefImage1',
            bytesBase64: 'AQIDBA==',
          }),
        ],
      })
    );
  });

  it('does not attach saved library references unless they are mentioned', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-hero',
        name: 'hero.png',
        title: 'Hero face',
        description: 'Primary character',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate a clean portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [],
      })
    );
  });

  it('does not attach saved library references when Director text names them without an explicit @ mention', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-tito',
        name: 'tito.png',
        title: 'Tito',
        description: 'Primary character sheet.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    fireEvent.focus(directorInput);
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'olha tito descreve ele' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.sendDirectorMessage)).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'olha tito descreve ele',
        modelId: 'google-gemini-3-5-flash',
        referenceImages: [],
      })
    );
  });

  it('submits a Director prompt only once when the send action is triggered twice quickly', async () => {
    const sendDirectorMessageMock = vi.mocked(electronApi.sendDirectorMessage);
    sendDirectorMessageMock.mockImplementation(
      async (payload: { chatId: string; threadId: string; prompt: string; modelId?: string }) =>
        new Promise((resolve) => {
          window.setTimeout(() => {
            const timestamp = '2026-06-01T12:15:00.000Z';
            const userMessage = {
              id: 'director-user-message',
              chatId: payload.chatId,
              role: 'user' as const,
              contentMarkdown: payload.prompt,
              status: 'completed' as const,
              modelId: payload.modelId ?? 'google-gemini-3-5-flash',
              modelLabel: 'Gemini 3.5 Flash',
              fastMode: false,
              references: [],
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            resolve({
              chat: null,
              userMessage,
              assistantMessage: {
                ...userMessage,
                id: 'director-assistant-message',
                role: 'assistant' as const,
                contentMarkdown: 'One response.',
              },
            });
          }, 100);
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    fireEvent.focus(directorInput);
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan one clean shot' },
      });
      await vi.runAllTimersAsync();
    });

    const sendButton = screen.getByRole('button', { name: 'Enviar' });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(sendDirectorMessageMock).toHaveBeenCalledTimes(1);
  });

  it('clears the full Director composer immediately on send and keeps the failure visible if the request errors', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);
    vi.mocked(electronApi.sendDirectorMessage).mockImplementationOnce(
      async () =>
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Gemini is temporarily unavailable. Try again in a moment.')), 100);
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan shots in @gar' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.keyDown(directorInput, { key: 'Enter', code: 'Enter' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(directorInput).toHaveValue('Plan shots in Garagem ');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    });

    expect(directorInput).toHaveValue('');
    expect(screen.queryByTestId('selected-reference-mention')).not.toBeInTheDocument();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Gemini is temporarily unavailable. Try again in a moment.');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Director stream failed');
    expect(alert).toHaveTextContent('Gemini is temporarily unavailable. Try again in a moment.');
  });

  it('replaces optimistic Director rows when the persisted stream start arrives', async () => {
    vi.mocked(electronApi.sendDirectorMessage).mockImplementation(
      async () =>
        new Promise(() => {
          // Keep the request in flight so the optimistic rows remain visible.
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    fireEvent.focus(directorInput);
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan one clean shot' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'persisted-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Plan one clean shot',
          status: 'completed',
          modelId: null,
          modelLabel: null,
          fastMode: false,
          references: [],
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'persisted-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'google-gemini-3-5-flash',
          modelLabel: 'Gemini 3.5 Flash',
          fastMode: false,
          references: [],
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    const matchingMessageRows = screen
      .getAllByTestId('director-message-content')
      .filter((element) => element.textContent?.includes('Plan one clean shot'));

    expect(matchingMessageRows).toHaveLength(1);
  });

  it('does not attach saved library references when Classic prompt names them without an explicit @ mention', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'reference-tito',
        name: 'tito.png',
        title: 'Tito',
        description: 'Primary character sheet.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'characters',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'cria uma pose do tito sorrindo' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('cria uma pose do tito sorrindo'),
        referenceImages: [],
      })
    );
  });

  it('sends saved references and metadata with generation requests', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const referenceImage = new File(['saved-reference'], 'palette.png', { type: 'image/png' });
    Object.defineProperty(referenceImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([10, 11, 12, 13]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /characters/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Add character images' }));
    fireEvent.change(screen.getByLabelText('Images'), {
      target: { files: [referenceImage] },
    });
    fireEvent.change(screen.getAllByLabelText('Title')[0], {
      target: { value: 'Palette guide' },
    });
    fireEvent.change(screen.getAllByLabelText('Description')[0], {
      target: { value: 'Muted contrast and soft highlights.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save reference' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
    await act(async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Generate with @palette' },
      });
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Palette guide' }));
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            name: 'palette.png',
            title: 'RefImage1',
            description: 'Muted contrast and soft highlights.',
            bytesBase64: 'CgsMDQ==',
          }),
        ],
      })
    );
  });

  it('keeps the composer expanded while the reference picker is opening', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    expect(composerInput).toHaveAttribute('rows', '3');

    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Adicionar anexo' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar anexo' })[0]);
    fireEvent.blur(composerInput);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(composerInput).toHaveAttribute('rows', '3');
  });

  it('submits with Enter and clears the composer state', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'First line' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Enter', code: 'Enter' });
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenCalledTimes(1);
    expect(composerInput).toHaveValue('');
    expect(composerInput).toHaveAttribute('rows', '1');
  });

  it('lets Shift+Enter create a new line without submitting', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();
    const pastedImage = new File(['paste-image'], 'pasted.png', { type: 'image/png' });
    Object.defineProperty(pastedImage, 'arrayBuffer', {
      value: vi.fn(async () => Uint8Array.from([5, 6, 7, 8]).buffer),
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Use pasted image' },
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.paste(composerInput, {
        clipboardData: {
          files: [pastedImage],
          items: [],
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Open pasted.png' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(composerInput, { key: 'Enter', code: 'Enter', shiftKey: true });
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).not.toHaveBeenCalled();
    expect(composerInput).toHaveTextContent('Use pasted image');
    expect(composerInput.querySelector('br')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open pasted.png' })).toBeInTheDocument();
  });

  it('keeps Fast enabled across submits while clearing the rest of the composer', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    const fastButton = screen.getByRole('button', { name: 'Fast' });
    expect(fastButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Increase image count' }));

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate a fast portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        count: 2,
        fastMode: true,
      })
    );
    expect(composerInput).toHaveValue('');
    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.focus(composerInput);
    expect(screen.getByRole('button', { name: 'Fast' })).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate another fast portrait' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        count: 1,
        fastMode: true,
      })
    );
  });

  it('updates the model trigger label when a different Google model is selected', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Model Gemini 3.5 Flash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gemini 3 Pro' }));

    expect(screen.getByRole('button', { name: 'Model Gemini 3 Pro' })).toBeInTheDocument();
  });

  it('keeps the composer expanded while the model picker is open', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(composerInput).toHaveAttribute('rows', '3');

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Model Gemini 3.5 Flash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Model Gemini 3.5 Flash' }));

    expect(screen.getByRole('button', { name: 'Gemini 3 Pro' })).toBeInTheDocument();
    expect(composerInput).toHaveAttribute('rows', '3');
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument();
  });

  it('sends the selected Google model in generation payloads', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Model Gemini 3.5 Flash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gemini 3.1 Flash Lite' }));

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate a neon control room' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: 'google',
        modelId: 'google-gemini-3-1-flash-lite',
        fastMode: false,
      })
    );
  });

  it('keeps camera-angle guidance out of classic generation prompts', async () => {
    const generateImagesMock = vi.mocked(electronApi.generateImages).mockResolvedValue({
      jobId: 'job-1',
      assets: [],
    });
    generateImagesMock.mockClear();

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getByRole('textbox');
    fireEvent.focus(composerInput);

    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Generate an interior scene' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(generateImagesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: expect.not.stringContaining('Angle:'),
      })
    );
  });

  it('does not render the removed camera-angle control in the classic composer', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.focus(screen.getByRole('textbox'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByRole('switch', { name: 'Use camera angle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Low Angle' })).not.toBeInTheDocument();
  });

  it('shows the Director workspace with the reduced composer controls', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.focus(screen.getAllByRole('textbox').at(-1)!);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('director-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('director-composer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Decrease image count')).not.toBeInTheDocument();
    expect(screen.queryByText('16:9')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Model Gemini 3\.5 Flash/i })).toBeInTheDocument();
  });

  it('renders persistent reasoning with a completed thought duration and tool cards in Director messages', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-thinking-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        parts: [
          {
            type: 'reasoning',
            text: 'Check continuity anchors before locking coverage.',
          },
          {
            type: 'text',
            text: 'Lock the wide first, then move into medium coverage.',
          },
          {
            type: 'tool-generateImages',
            toolCallId: 'tool-generate-images-1',
            input: {
              prompt: 'Garage reveal',
              count: 1,
              aspectRatio: '16:9',
              references: [],
            },
            state: 'output-available',
            output: { assets: [] },
          },
        ],
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:08.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const chainOfThoughtLabel = screen.getByText('Thought for 8s');
    const responseBody = screen.getByText('Lock the wide first, then move into medium coverage.');
    const chainOfThoughtTrigger = screen.getByRole('button', { name: 'Thought for 8s' });

    expect(chainOfThoughtLabel).toBeInTheDocument();
    expect(chainOfThoughtTrigger).toBeInTheDocument();
    expect(screen.getByText('Check continuity anchors before locking coverage.')).toBeInTheDocument();
    expect(screen.getByText('generateImages')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(responseBody).toBeInTheDocument();
    expect(chainOfThoughtLabel.compareDocumentPosition(responseBody) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(chainOfThoughtTrigger);
    expect(screen.queryByText('Check continuity anchors before locking coverage.')).not.toBeInTheDocument();

    fireEvent.click(chainOfThoughtTrigger);
    expect(screen.getByText('Check continuity anchors before locking coverage.')).toBeInTheDocument();
  });

  it('keeps Director messages aligned to the composer width and uses fully rounded user bubbles without borders', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-user-layout-message',
        chatId: 'director-chat-1',
        role: 'user',
        contentMarkdown: 'Keep the Director thread width aligned.',
        status: 'completed',
        modelId: null,
        modelLabel: null,
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('director-composer-shell').parentElement?.parentElement).toHaveClass('max-w-[920px]');
    const userMessage = screen.getByText('Keep the Director thread width aligned.');
    expect(userMessage.closest('[data-testid="director-message-row"]')).toHaveClass('max-w-[920px]');
    expect(userMessage.closest('[data-testid="director-message-content"]')).toHaveClass('rounded-full');
    expect(userMessage.closest('[data-testid="director-message-content"]')?.className).not.toContain('border-[var(--border-soft)]');
  });

  it('uses a transparent collapsed add button in the Director composer', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const addButton = screen.getByRole('button', { name: 'Add reference' });
    expect(addButton).toHaveClass('bg-transparent');
    expect(addButton).toHaveClass('border-transparent');
    expect(addButton.className).not.toContain('translate-y-[1px]');
    expect(screen.getByTestId('director-composer-shell').querySelector('.absolute.inset-x-0.bottom-0')?.className).toContain(
      'bottom-2.5'
    );
    expect(screen.getByTestId('director-composer-shell').querySelector('[data-prompt-composer-placeholder="true"]')).toHaveTextContent(
      'Type anything'
    );
    expect(screen.getByRole('button', { name: 'Enviar' }).parentElement?.parentElement).toHaveAttribute(
      'data-send-button-variant',
      'colorful'
    );
  });

  it('virtualizes Director chat messages during streaming', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Generate a shot plan.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          fastMode: true,
          createdAt: '2026-06-01T12:15:01.000Z',
          updatedAt: '2026-06-01T12:15:01.000Z',
        },
      });
      directorMessageDeltaListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        delta: 'First beat.',
        content: 'First beat.',
      });
      await vi.runAllTimersAsync();
    });

    const directorWorkspace = screen.getByTestId('director-workspace');
    expect(within(directorWorkspace).getByTestId('virtualized-list')).toBeInTheDocument();
    expect(within(directorWorkspace).getByText('First beat.')).toBeInTheDocument();
  });

  it('evicts old inactive Director chat histories from the renderer cache', async () => {
    directorChatsFixtureByThread['thread-1'] = Array.from({ length: 4 }, (_, index) => ({
      id: `director-chat-${index + 1}`,
      threadId: 'thread-1',
      title: `Director chat ${index + 1}`,
      createdAt: `2026-06-01T09:0${index}:00.000Z`,
      updatedAt: `2026-06-01T09:0${index}:00.000Z`,
    }));
    directorMessagesFixtureByChat = Object.fromEntries(
      directorChatsFixtureByThread['thread-1'].map((chat, index) => [
        chat.id,
        [
          {
            id: `director-msg-${index + 1}`,
            chatId: chat.id,
            role: 'assistant' as const,
            contentMarkdown: `Cached notes ${index + 1}.`,
            status: 'completed' as const,
            modelId: 'codex-gpt-5-4-mini',
            modelLabel: 'Codex / GPT-5.4 Mini',
            fastMode: true,
            references: [],
            createdAt: `2026-06-01T09:1${index}:00.000Z`,
            updatedAt: `2026-06-01T09:1${index}:00.000Z`,
          },
        ],
      ])
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    for (const title of ['Director chat 2', 'Director chat 3', 'Director chat 4']) {
      fireEvent.click(screen.getByText(title).closest('button')!);
      await act(async () => {
        await vi.runAllTimersAsync();
      });
    }

    vi.mocked(electronApi.listDirectorMessages).mockClear();

    fireEvent.click(screen.getByText('Director chat 1').closest('button')!);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.listDirectorMessages).toHaveBeenCalledWith('director-chat-1');
    expect(within(screen.getByTestId('director-workspace')).getByText('Cached notes 1.')).toBeInTheDocument();
  });

  it('keeps Director open when a Director scene action starts building', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    sceneGroupsFixture = [
      {
        id: 'director-scene-group',
        threadId: 'thread-1',
        title: 'Garagem - Entrada',
        prompt: 'Locked garage entrance continuity.',
        tocOrder: 2,
        createdAt: '2026-06-01T12:30:00.000Z',
        updatedAt: '2026-06-01T12:30:00.000Z',
        frames: [
          {
            id: 'director-scene-frame-4',
            sceneGroupId: 'director-scene-group',
            title: 'Frame 4',
            prompt: 'Medium close shot of the activation reveal.',
            frameOrder: 4,
            createdAt: '2026-06-01T12:30:00.000Z',
            updatedAt: '2026-06-01T12:30:00.000Z',
            references: [],
            assets: [],
          },
        ],
        runs: [],
      },
      ...makeSceneGroupsFixture(),
    ];

    await act(async () => {
      directorSceneReadyListener?.({
        threadId: 'thread-1',
        sceneGroupId: 'director-scene-group',
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole('button', { name: 'Director' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('director-workspace')).toBeInTheDocument();
  });

  it.skip('shows Director scene action frame details before approval', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-scene-action-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: [
          'Ready to build this scene.',
          '```imagen-action',
          JSON.stringify({
            version: 1,
            action: 'create_scene',
            summary: 'Build the garage reveal.',
            payload: {
              title: 'Garage reveal',
              scenePrompt: 'Keep the garage layout locked.',
              frames: [
                { title: 'Frame 1', prompt: 'Wide establishing view.', references: ['@Garagem'] },
                { title: 'Frame 2', prompt: 'Closer reveal on Tito.', references: ['@Tito'] },
              ],
            },
          }),
          '```',
        ].join('\n'),
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Garage reveal')).toBeInTheDocument();
    expect(screen.getByText('Frame 1')).toBeInTheDocument();
    expect(screen.getByText('Frame 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Frame 1'));
    expect(screen.getByText('Wide establishing view.')).toBeInTheDocument();
  });

  it.skip('shows Director scene generation progress in the action card', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-scene-action-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: [
          'Building this scene.',
          '```imagen-action',
          JSON.stringify({
            version: 1,
            action: 'create_scene',
            summary: 'Build the garage reveal.',
            payload: {
              title: 'Garage reveal',
              scenePrompt: 'Keep the garage layout locked.',
              frames: [
                { title: 'Frame 1', prompt: 'Wide establishing view.' },
                { title: 'Frame 2', prompt: 'Closer reveal on Tito.' },
              ],
            },
          }),
          '```',
          '```imagen-status',
          JSON.stringify({
            version: 1,
            kind: 'orchestration',
            status: 'running',
            title: 'Generating scene',
            action: 'create_scene',
            actionIndex: 0,
            progress: { generated: 1, total: 2 },
            result: { sceneGroupId: 'director-scene-group' },
          }),
          '```',
        ].join('\n'),
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('director-action-status')).toHaveTextContent('Gerando 1 / 2');
  });

  it.skip('renders only the latest Director orchestration status for a scene action', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-scene-action-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: [
          'Building this scene.',
          '```imagen-action',
          JSON.stringify({
            version: 1,
            action: 'create_scene',
            summary: 'Build the garage reveal.',
            payload: {
              title: 'Garage reveal',
              scenePrompt: 'Keep the garage layout locked.',
              frames: [
                { title: 'Frame 1', prompt: 'Wide establishing view.' },
                { title: 'Frame 2', prompt: 'Closer reveal on Tito.' },
              ],
            },
          }),
          '```',
          '```imagen-status',
          JSON.stringify({
            version: 1,
            kind: 'orchestration',
            status: 'running',
            title: 'Generating scene',
            detail: 'Generated 1 of 2 frames.',
            action: 'create_scene',
            actionIndex: 0,
            progress: { generated: 1, total: 2 },
            result: { sceneGroupId: 'director-scene-group' },
          }),
          '```',
          '```imagen-status',
          JSON.stringify({
            version: 1,
            kind: 'orchestration',
            status: 'succeeded',
            title: 'Scene generation finished',
            detail: 'Generated 2 of 2 frames.',
            action: 'create_scene',
            actionIndex: 0,
            progress: { generated: 2, total: 2 },
            result: { sceneGroupId: 'director-scene-group' },
          }),
          '```',
        ].join('\n'),
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('director-action-status')).toHaveTextContent('Gerado 2 / 2');
    expect(screen.queryByText('Generated 1 of 2 frames.')).not.toBeInTheDocument();
    expect(screen.getByText('Scene generation finished')).toBeInTheDocument();
    expect(screen.getByText('Generated 2 of 2 frames.')).toBeInTheDocument();
  });

  it('creates Director chats from the thread rail and keeps them in the current thread', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByRole('button', { name: 'New' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.createDirectorChat)).toHaveBeenCalledWith('thread-1');
    expect(screen.getByText('New chat')).toBeInTheDocument();
  });

  it('auto-creates the first Director chat when sending on an empty thread', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Thread Two' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getAllByRole('textbox').at(-1)!;
    fireEvent.focus(composerInput);
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Block out a clean six-shot sequence.' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.createDirectorChat)).toHaveBeenCalledWith('thread-2');
    expect(vi.mocked(electronApi.sendDirectorMessage)).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-2',
        prompt: 'Block out a clean six-shot sequence.',
      })
    );
  });

  it('approves a pending Director action from the chat message', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-action-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: [
          'Ready to generate the selected frame.',
          '```tool-call',
          JSON.stringify({
            id: 'tool-generate-images-1',
            name: 'generateImages',
            status: 'pending',
            summary: 'Generate one garage frame.',
            approval: {
              id: 'approval_tool-generate-images-1',
              needsApproval: true,
            },
            input: {
              prompt: 'Medium close shot in the garage.',
              count: 1,
              aspectRatio: '16:9',
              references: ['@Garagem'],
            },
          }),
          '```',
        ].join('\n'),
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Generate images')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId('generated-image-grid')).toHaveAttribute('data-loading-effect', 'shimmer');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Classic' }));
      await vi.runAllTimersAsync();
    });
    expect(screen.getByText('Generating 1')).toBeInTheDocument();

    await act(async () => {
      imageReadyListener?.({
        jobId: 'director-job-1',
        clientRunId: 'director-director-action-message-0',
        threadId: 'thread-1',
        asset: {
          id: 'director-generated-image-1',
          fileUrl: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`,
          fileName: 'garage-frame.png',
          createdAt: '2026-06-01T12:16:00.000Z',
          provider: 'codex',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'GPT-5.4 Mini',
          prompt: 'Medium close shot in the garage.\n\nAspect ratio: 16:9',
          references: [],
          durationMs: 1234,
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.approveDirectorAction)).toHaveBeenCalledWith({
      messageId: 'director-action-message',
      actionIndex: 0,
      clientRunId: 'director-director-action-message-0',
    });
    expect(screen.getByLabelText('Select garage-frame.png')).toBeInTheDocument();
  });

  it('declines a pending Director action from the chat message', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-action-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: [
          'Ready to generate the selected frame.',
          '```tool-call',
          JSON.stringify({
            id: 'tool-generate-images-1',
            name: 'generateImages',
            status: 'pending',
            summary: 'Generate one garage frame.',
            approval: {
              id: 'approval_tool-generate-images-1',
              needsApproval: true,
            },
            input: {
              prompt: 'Medium close shot in the garage.',
              count: 1,
              aspectRatio: '16:9',
              references: ['@Garagem'],
            },
          }),
          '```',
        ].join('\n'),
        status: 'completed',
        modelId: 'codex-gpt-5-4-mini',
        modelLabel: 'Codex / GPT-5.4 Mini',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T09:05:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(electronApi.declineDirectorAction)).toHaveBeenCalledWith({
      messageId: 'director-action-message',
      actionIndex: 0,
    });
    expect(screen.getByText('Image generation declined')).toBeInTheDocument();
  });

  it('limits Director @ reference replacement to the active tag instead of trailing pasted text', () => {
    expect(
      getReferenceMentionReplacementRange(
        { query: 'gar', start: 'Use '.length },
        'Use @gar'.length
      )
    ).toEqual({ start: 4, end: 8 });
  });

  it('inserts grouped @ references from the Director composer', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'garage-high',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-high.png',
        title: 'Garagem',
        description: 'High-angle interior view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan shots in @gar' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByRole('option', { name: 'Garagem' })).toHaveLength(1);

    await act(async () => {
      const option = screen.getByRole('option', { name: 'Garagem' });
      fireEvent.pointerDown(option, { pointerType: 'mouse' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(directorInput).toHaveValue('Plan shots in Garagem ');
    expect(screen.queryByRole('option', { name: 'Garagem' })).not.toBeInTheDocument();
  });

  it('inserts grouped @ references from the Director composer with Enter', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
      {
        id: 'garage-high',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-high.png',
        title: 'Garagem',
        description: 'High-angle interior view.',
        mimeType: 'image/png',
        bytesBase64: 'BAUG',
        createdAt: '2026-05-26T12:01:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan shots in @gar' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByRole('option', { name: 'Garagem' })).toHaveLength(1);

    await act(async () => {
      fireEvent.keyDown(directorInput, { key: 'Enter', code: 'Enter' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(directorInput).toHaveValue('Plan shots in Garagem ');
    expect(screen.queryByRole('option', { name: 'Garagem' })).not.toBeInTheDocument();
  });

  it('keeps Director @ reference insertion working after switching tabs away and back', async () => {
    vi.mocked(electronApi.listReferences).mockResolvedValue([
      {
        id: 'garage-front',
        collectionId: null,
        environmentId: 'garage-env',
        name: 'garage-front.png',
        title: 'Garagem',
        description: 'Front-facing symmetrical view.',
        mimeType: 'image/png',
        bytesBase64: 'AQID',
        createdAt: '2026-05-26T12:00:00.000Z',
        category: 'environment',
      },
    ]);

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Classic' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(directorInput, {
        target: { value: 'Plan shots in @gar' },
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByRole('option', { name: 'Garagem' })).toHaveLength(1);

    await act(async () => {
      const option = screen.getByRole('option', { name: 'Garagem' });
      fireEvent.pointerDown(option, { pointerType: 'mouse' });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('selected-reference-mention')).toHaveTextContent('Garagem');
    expect(directorInput).toHaveValue('Plan shots in Garagem ');
  });

  it('shows per-chat loading states when multiple Director chats stream at once', async () => {
    directorChatsFixtureByThread['thread-1'] = [
      {
        id: 'director-chat-1',
        threadId: 'thread-1',
        title: 'Coverage pass',
        createdAt: '2026-06-01T09:00:00.000Z',
        updatedAt: '2026-06-01T09:05:00.000Z',
      },
      {
        id: 'director-chat-2',
        threadId: 'thread-1',
        title: 'Continuity check',
        createdAt: '2026-06-01T09:06:00.000Z',
        updatedAt: '2026-06-01T09:06:00.000Z',
      },
    ];
    directorMessagesFixtureByChat['director-chat-2'] = [];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'u1',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Write the first pass.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
        assistantMessage: {
          id: 'a1',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
      });
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-2',
        userMessage: {
          id: 'u2',
          chatId: 'director-chat-2',
          role: 'user',
          contentMarkdown: 'Check continuity.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T10:01:00.000Z',
          updatedAt: '2026-06-01T10:01:00.000Z',
        },
        assistantMessage: {
          id: 'a2',
          chatId: 'director-chat-2',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T10:01:00.000Z',
          updatedAt: '2026-06-01T10:01:00.000Z',
        },
      });
    });

    expect(screen.getAllByText('Thinking')).toHaveLength(3);
    expect(within(screen.getByTestId('director-workspace')).getByText('Thinking')).toBeInTheDocument();
    expect(within(screen.getByTestId('director-workspace')).queryByText('Thinking...')).not.toBeInTheDocument();
  });

  it('does not duplicate Director messages when the start event arrives after optimistic append', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getAllByRole('textbox').at(-1)!;
    fireEvent.focus(composerInput);
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Draft a compact beat board.' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Draft a compact beat board.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    const matchingMessageRows = screen
      .getAllByTestId('director-message-content')
      .filter((element) => element.textContent?.includes('Draft a compact beat board.'));

    expect(matchingMessageRows).toHaveLength(1);

    const directorWorkspace = screen.getByTestId('director-workspace');
    const userMessage = within(directorWorkspace).getByText('Draft a compact beat board.');
    const thinkingMessage = within(directorWorkspace).getByText('Thinking');
    expect(userMessage.compareDocumentPosition(thinkingMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(directorWorkspace).queryByText('You')).not.toBeInTheDocument();
    expect(within(directorWorkspace).queryByText('Director')).not.toBeInTheDocument();
  });

  it('creates a real thread before sending Director text from an empty draft thread', async () => {
    vi.mocked(electronApi.createThread).mockResolvedValueOnce({
      id: 'thread-created-for-director',
      projectId: 'project-1',
      name: 'Thread Three',
      createdAt: '2026-06-01T12:20:00.000Z',
      updatedAt: '2026-06-01T12:20:00.000Z',
      hasRunningJob: false,
    });

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Expand sidebar'));
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByLabelText('Start a new thread in Project One'));
    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Plan the first shot in this empty thread.' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(electronApi.createThread).toHaveBeenCalledWith('project-1');
    expect(electronApi.createDirectorChat).toHaveBeenCalledWith('thread-created-for-director');
    expect(electronApi.sendDirectorMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-created-for-director',
        prompt: 'Plan the first shot in this empty thread.',
      })
    );
  });

  it('shows a Director Thinking placeholder while waiting for the backend to start streaming', async () => {
    let resolveSend:
      | ((value: Awaited<ReturnType<typeof electronApi.sendDirectorMessage>>) => void)
      | null = null;
    vi.mocked(electronApi.sendDirectorMessage).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const composerInput = screen.getAllByRole('textbox').at(-1)!;
    await act(async () => {
      fireEvent.change(composerInput, {
        target: { value: 'Draft a compact beat board.' },
      });
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const directorWorkspace = screen.getByTestId('director-workspace');
    expect(within(directorWorkspace).getByText('Draft a compact beat board.')).toBeInTheDocument();
    expect(within(directorWorkspace).getByText('Thinking')).toBeInTheDocument();
    expect(within(directorWorkspace).queryByRole('button', { name: 'Thinking' })).not.toBeInTheDocument();
    expect(within(directorWorkspace).queryByText('Thinking...')).not.toBeInTheDocument();
    expect(resolveSend).toBeTypeOf('function');
  });

  it('streams Director responses into the active chat and swaps Send into Stop', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Write a tight shot list for this scene.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    const stopButton = screen.getByRole('button', { name: 'Stop' });
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).not.toHaveTextContent('Stop');
    expect(stopButton.querySelector('.t-icon-swap')).toHaveAttribute('data-state', 'stop');
    expect(stopButton.querySelector('[data-icon="stop"]')).toBeInTheDocument();
    expect(stopButton.parentElement?.parentElement).toHaveAttribute('data-send-button-variant', 'sunset');

    const directorComposerShell = screen.getByTestId('director-composer-shell');
    expect(directorComposerShell.parentElement).toHaveAttribute('data-beam');
    expect(directorComposerShell.parentElement).toHaveAttribute('data-active');

    await act(async () => {
      directorMessageDeltaListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        delta: 'Shot 1',
        content: 'Shot 1\n- Wide establishing frame',
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText((content) => content.includes('Shot 1'))).toBeInTheDocument();

    await act(async () => {
      directorMessageCompleteListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        content: 'Shot 1\n- Wide establishing frame',
      });
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText((content) => content.includes('Shot 1'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('keeps high-volume Director deltas isolated from the app shell', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Stream a long answer.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    const projectRowRendersAfterStart = renderCounters.projectRow;
    const threadRowRendersAfterStart = renderCounters.threadRow;

    for (let index = 1; index <= 5; index += 1) {
      await act(async () => {
        directorMessageDeltaListener?.({
          threadId: 'thread-1',
          chatId: 'director-chat-1',
          messageId: 'director-assistant-message',
          delta: `Chunk ${index}. `,
          content: Array.from({ length: index }, (_, chunkIndex) => `Chunk ${chunkIndex + 1}.`).join(' '),
        });
        await vi.advanceTimersByTimeAsync(64);
      });
    }

    const directorWorkspace = screen.getByTestId('director-workspace');
    expect(within(directorWorkspace).getByText((content) => content.includes('Chunk 5.'))).toBeInTheDocument();
    expect(renderCounters.projectRow).toBe(projectRowRendersAfterStart);
    expect(renderCounters.threadRow).toBe(threadRowRendersAfterStart);
  });

  it('keeps showing Director Thinking while a streamed response waits between deltas', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Generate and review options.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      directorMessageDeltaListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        delta: 'I will start with a compact set.',
        content: 'I will start with a compact set.',
      });
      await vi.runAllTimersAsync();
    });

    const directorWorkspace = screen.getByTestId('director-workspace');
    const chainOfThoughtLabel = within(directorWorkspace).getByText('Thinking');
    const responseText = within(directorWorkspace).getByText('I will start with a compact set.');

    expect(chainOfThoughtLabel).toBeInTheDocument();
    expect(within(directorWorkspace).getByText('I will start with a compact set.')).toBeInTheDocument();
    expect(within(directorWorkspace).queryByRole('button', { name: 'Thinking' })).not.toBeInTheDocument();
    expect(within(directorWorkspace).queryByText('Thinking...')).not.toBeInTheDocument();
    expect(chainOfThoughtLabel.compareDocumentPosition(responseText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await act(async () => {
      directorMessageCompleteListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        content: 'I will start with a compact set.',
      });
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(within(directorWorkspace).queryByText('Thinking')).not.toBeInTheDocument();
    expect(within(directorWorkspace).getByText('Thought for 0s')).toBeInTheDocument();
  });

  it('shows failed Director stream errors as a rounded alert with the provider reason', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Plan a camera pass.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'google-gemini-3-5-flash',
          modelLabel: 'Gemini 3.5 Flash',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      directorMessageDeltaListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        delta: 'Partial plan.',
        content: 'Partial plan.',
      });
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageErrorListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        errorMessage: 'Gemini is temporarily unavailable due to high demand. Try again in a moment.',
        content: 'Partial plan.',
      });
      await vi.runAllTimersAsync();
    });

    const directorWorkspace = screen.getByTestId('director-workspace');
    const alert = within(directorWorkspace).getByRole('alert');

    expect(within(directorWorkspace).getByText('Partial plan.')).toBeInTheDocument();
    expect(alert).toHaveClass('rounded-[18px]');
    expect(alert).toHaveTextContent('Director stream failed');
    expect(alert).toHaveTextContent('Gemini is temporarily unavailable due to high demand. Try again in a moment.');
    expect(within(directorWorkspace).queryByText('This response ended with an error.')).not.toBeInTheDocument();
  });

  it('shows Director completion metadata and copies the streamed markdown', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-message',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Generate a shot list.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-message',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: '',
          status: 'streaming',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    expect(within(screen.getByTestId('director-workspace')).getByText('Thinking')).toBeInTheDocument();
    expect(within(screen.getByTestId('director-workspace')).queryByText('Thinking...')).not.toBeInTheDocument();

    vi.setSystemTime(new Date('2026-06-01T12:15:08.000Z'));
    const response = '```markdown\n# Shot List\n- Shot 1: Wide @Tito in @Base\n```';

    await act(async () => {
      directorMessageCompleteListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        messageId: 'director-assistant-message',
        content: response,
      });
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(screen.getByText('8s')).toBeInTheDocument();
    const copyButton = screen.getAllByRole('button', { name: 'Copy Director response' }).at(-1)!;

    expect(copyButton.className).not.toContain('bg-[');
    expect(copyButton).not.toHaveTextContent('Copy');
    expect(copyButton.querySelector('.t-icon-swap')).toHaveAttribute('data-state', 'copy');

    await act(async () => {
      fireEvent.click(copyButton);
      await Promise.resolve();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(response);
    expect(copyButton.querySelector('.t-icon-swap')).toHaveAttribute('data-state', 'copied');
  });

  it('shows a regenerate action on completed Director messages and replaces that response in place', async () => {
    directorMessagesFixtureByChat['director-chat-1'] = [
      {
        id: 'director-user-message',
        chatId: 'director-chat-1',
        role: 'user',
        contentMarkdown: 'Generate a tighter reverse angle.',
        status: 'completed',
        modelId: null,
        modelLabel: null,
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T12:14:00.000Z',
        updatedAt: '2026-06-01T12:14:00.000Z',
      },
      {
        id: 'director-assistant-message',
        chatId: 'director-chat-1',
        role: 'assistant',
        contentMarkdown: 'Shot 1\n- Tighter reverse angle',
        status: 'completed',
        modelId: 'google-gemini-3-5-flash',
        modelLabel: 'Gemini 3.5 Flash',
        fastMode: true,
        references: [],
        createdAt: '2026-06-01T12:14:00.000Z',
        updatedAt: '2026-06-01T12:14:06.000Z',
      },
    ];

    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const regenerateButton = screen.getByRole('button', { name: 'Regenerate Director response' });
    expect(regenerateButton.className).not.toContain('bg-[');
    expect(regenerateButton).not.toHaveTextContent('Regenerate');

    await act(async () => {
      fireEvent.click(regenerateButton);
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(vi.mocked(electronApi.regenerateDirectorMessage)).toHaveBeenCalledWith({
      chatId: 'director-chat-1',
      threadId: 'thread-1',
      assistantMessageId: 'director-assistant-message',
    });
    expect(screen.getAllByText('Generate a tighter reverse angle.')).toHaveLength(1);
    expect(screen.queryByText('Shot 1')).not.toBeInTheDocument();
    expect(screen.getByText('Thinking')).toBeInTheDocument();
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });

  it('allows selecting Director chat message text', async () => {
    render(<App />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Director' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      directorMessageStartListener?.({
        threadId: 'thread-1',
        chatId: 'director-chat-1',
        userMessage: {
          id: 'director-user-selectable',
          chatId: 'director-chat-1',
          role: 'user',
          contentMarkdown: 'Generate a shot list.',
          status: 'completed',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:00.000Z',
        },
        assistantMessage: {
          id: 'director-assistant-selectable',
          chatId: 'director-chat-1',
          role: 'assistant',
          contentMarkdown: 'Drafting coverage.',
          status: 'completed',
          modelId: 'codex-gpt-5-4-mini',
          modelLabel: 'Codex / GPT-5.4 Mini',
          fastMode: true,
          createdAt: '2026-06-01T12:15:00.000Z',
          updatedAt: '2026-06-01T12:15:01.000Z',
        },
      });
      await vi.runAllTimersAsync();
    });

    const userMessage = screen.getByText('Generate a shot list.');
    const assistantMessage = screen.getByText('Drafting coverage.');

    expect(userMessage.closest('[data-testid="director-message-content"]')).toHaveClass('select-text');
    expect(assistantMessage.closest('[data-testid="director-message-content"]')).toHaveClass('select-text');
  });
});
