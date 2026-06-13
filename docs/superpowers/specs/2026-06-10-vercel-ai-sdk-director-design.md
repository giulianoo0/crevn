# Vercel AI SDK Director Migration Design

## Goal

Replace the Director's TanStack AI integration and Markdown-encoded reasoning/tool protocol with Vercel AI SDK 6, native Google reasoning summaries, structured message parts, and structured IPC streaming.

## Scope

- Remove all `@tanstack/ai*` dependencies and runtime imports.
- Use `streamText` from `ai` with `@ai-sdk/google`.
- Enable Google thought summaries with `thinkingConfig.includeThoughts`.
- Define `generateImages` as an AI SDK tool with an input schema and required user approval.
- Persist only ordered structured parts for Director messages.
- Stream complete structured part snapshots through Electron IPC.
- Render reasoning, text, tools, approvals, and orchestration status directly from parts.
- Do not preserve or migrate existing Director message content.

## Message Model

`director_messages` stores `parts_json` instead of `content_markdown`. Each message has an ordered parts array:

```ts
type DirectorMessagePart =
  | { type: 'text'; text: string; providerMetadata?: unknown }
  | { type: 'reasoning'; text: string; providerMetadata?: unknown }
  | {
      type: 'tool-generateImages';
      toolCallId: string;
      input: GenerateImagesInput;
      state: 'approval-requested' | 'running' | 'output-available' | 'output-error' | 'declined';
      approvalId?: string;
      output?: unknown;
      errorText?: string;
    };
```

The database initialization performs a destructive Director-only migration by dropping and recreating `director_messages` when the old `content_markdown` schema is detected. Director chats may remain, but their old messages are discarded.

## AI SDK Runtime

The Director runtime builds AI SDK `ModelMessage` values from persisted parts and reference images. It invokes:

```ts
streamText({
  model: google(modelId),
  messages,
  abortSignal,
  providerOptions: {
    google: {
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  },
  tools: {
    generateImages: tool({
      description: 'Request still image generation in the current thread.',
      inputSchema,
      needsApproval: true,
    }),
  },
});
```

The runtime consumes `fullStream`. It accumulates text and reasoning by stream block ID, adds tool calls and approval requests as tool parts, preserves provider metadata where available, and emits a complete ordered parts snapshot after each meaningful update.

Google thought output is treated and labeled as a provider-supplied reasoning summary. The app does not request, infer, or expose hidden private chain-of-thought.

## Tool Approval

The model emits a native `generateImages` tool call. The renderer displays its structured approval state. Existing Electron approval commands remain the user interaction boundary:

- Approve changes the tool part to `running`, executes the existing image generation service, then records `output-available` with the generation result.
- Failure records `output-error`.
- Decline records `declined`.

This keeps image generation deterministic and tied to the current desktop orchestration while removing the fenced Markdown protocol.

## Shared Image Generation Presentation

Director-approved image generation must not introduce a second loading or success presentation. It uses the same generation run records and renderer components as Classic generation:

- the same ImageFX loading animation and shimmer placeholders;
- the same image-ready event path that replaces loading placeholders incrementally;
- the same generated image grid/cards, metadata, review actions, and detail view;
- the same completed and failed run presentation.

The Director tool part only owns approval and orchestration state. Once approved, it starts the shared generation flow and links to the resulting run/assets rather than duplicating image previews inside a Director-specific status card.

## IPC And Renderer

Director start events contain messages with `parts`. Delta, complete, and error events contain the latest full `parts` snapshot rather than Markdown deltas.

The renderer updates message snapshots atomically. It:

- renders `reasoning` parts in the existing collapsible reasoning UI;
- renders `text` parts with `MessageResponse`;
- renders `tool-generateImages` parts with the existing approval/action card;
- copies concatenated text content only;
- uses part content to determine streaming placeholders and cache signatures.

All regex parsing for `<thinking>`, reasoning code fences, tool fences, and orchestration status fences is removed.

## Errors And Cancellation

Cancellation continues through `AbortController`, passed to AI SDK as `abortSignal`. A failed message retains any parts streamed before the failure and appends a text error part only when no visible text exists.

Provider high-demand errors retain the current user-facing normalization.

## Testing

- Unit-test AI SDK stream-part accumulation and ordered reasoning/text/tool snapshots.
- Unit-test destructive Director schema initialization.
- Unit-test approval, decline, success, and failure transitions on structured tool parts.
- Verify approved Director requests enter the same shared ImageFX loading and generated-asset presentation as Classic requests.
- Update renderer tests to use structured parts and structured stream snapshots.
- Verify cancellation and existing Director optimistic-message behavior.
- Run focused tests, the full Vitest suite, and the production Vite build.
