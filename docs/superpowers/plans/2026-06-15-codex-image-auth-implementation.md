# Codex Image Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add app-owned multi-account Codex image authentication, switching, and limit refresh without touching `~/.codex/auth.json`.

**Architecture:** Extend the existing provider settings store with an `image.codex` branch and add a focused Electron auth module for Codex OAuth, token refresh, public account shaping, and rate-limit fetching. Image generation resolves the active app-owned account and passes auth into the Codex output runner. The renderer adds a compact `Image` tab inside the existing Providers workspace.

**Tech Stack:** Electron main/preload IPC, Vite React renderer, Tailwind v4, Vitest, Node `http`/`crypto`, existing Codex responses flow in `electron/features/generation/codexOutput.cjs`.

---

## File Map

- Create `electron/codexImageAuth.cjs`: app-owned Codex account normalization helpers, OAuth URL/PKCE helpers, JWT parsing, token refresh, rate-limit mapping/fetching, public account shaping, and account mutations.
- Create `electron/codexImageAuth.test.ts`: unit tests for auth helpers, account mutations, token refresh, rate-limit mapping, and OAuth URL shape.
- Modify `electron/providerSettings.cjs`: default and normalize `image.codex`, preserve tokens in settings, and export sanitized helpers if needed.
- Modify `electron/providerSettings.test.ts`: coverage for defaults, old settings migration, duplicate account handling through auth module/store integration if appropriate.
- Modify `electron/features/generation/codexOutput.cjs`: remove direct `~/.codex/auth.json` dependency and accept `auth` input.
- Modify `electron/features/generation/codexOutput.test.ts`: update existing runner test to pass auth directly and prove no auth file is read.
- Modify `electron/generation.cjs`: resolve active image auth, pass it into `runImageGenerationBatch`, and refresh all account limits in a `finally` path.
- Add/modify relevant generation tests in `electron/providerSettings.test.ts` or a new focused test if direct `generation.cjs` setup is too heavy.
- Modify `electron/main.cjs`: wire Codex image auth IPC handlers and inject provider settings store helpers into generation.
- Modify `electron/preload.cjs`, `src/lib/electron-api.ts`, and `src/types/electron.d.ts`: expose typed Codex image auth APIs and sanitized account/limit types.
- Modify `src/App.tsx`: load image accounts, add Providers `Text`/`Image` tabs, implement add/switch/remove/refresh handlers, and render account state.
- Modify `src/App.test.tsx`: renderer coverage for Image tab, switching, refresh, remove, empty state, and preserving text provider save behavior.

---

### Task 1: Provider Settings Image Branch

**Files:**
- Modify: `electron/providerSettings.cjs`
- Modify: `electron/providerSettings.test.ts`
- Modify later types: `src/lib/electron-api.ts`, `src/types/electron.d.ts`

- [ ] **Step 1: Write failing provider settings tests**

Add tests that expect:

```ts
expect(await store.read()).toEqual({
  text: {
    gemini: { apiKey: '' },
    anthropic: { apiKey: '' },
  },
  image: {
    codex: {
      activeAccountId: null,
      accounts: [],
    },
  },
});
```

Also cover old settings files that only include `text`, and account token preservation when `image.codex.accounts` is present.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test electron/providerSettings.test.ts`

Expected: FAIL because `image.codex` is missing from defaults/normalization.

- [ ] **Step 3: Implement minimal normalization**

Update `DEFAULT_PROVIDER_SETTINGS` and `normalizeProviderSettings()` to include:

```js
image: {
  codex: {
    activeAccountId: normalizedActiveAccountId,
    accounts: normalizedAccounts,
  },
}
```

Normalize account strings defensively, preserve token strings, keep unknown/malformed accounts out, and clear `activeAccountId` when it does not match any normalized account.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test electron/providerSettings.test.ts`

Expected: PASS.

---

### Task 2: Codex Image Auth Core Module

**Files:**
- Create: `electron/codexImageAuth.cjs`
- Create: `electron/codexImageAuth.test.ts`

- [ ] **Step 1: Write failing helper tests**

Cover:

- `parseJwtPayload()` extracts nested `https://api.openai.com/auth` claims.
- `buildCodexAuthorizeUrl()` includes Codex client id, scopes, PKCE challenge, state, `id_token_add_organizations=true`, `codex_cli_simplified_flow=true`, and `originator=codex_cli_rs`.
- `upsertCodexImageAccount()` updates duplicate `accountId` instead of appending.
- `selectCodexImageAccount()` switches active account.
- `removeCodexImageAccount()` clears or moves active account.
- `toPublicProviderSettings()` removes raw token values.
- `mapCodexUsagePayloadToSnapshots()` maps primary, secondary, spend control, reached type, plan, credits, and additional limits.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test electron/codexImageAuth.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement pure helpers**

Implement constants and pure functions first:

```js
const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_OAUTH_ISSUER = 'https://auth.openai.com';
const CHATGPT_BACKEND_BASE_URL = 'https://chatgpt.com/backend-api';
```

Use `crypto.randomBytes`, SHA-256 base64url PKCE, JWT payload base64url decoding, and strict public account shaping.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test electron/codexImageAuth.test.ts`

Expected: PASS for pure helper tests.

- [ ] **Step 5: Write failing network helper tests**

Mock `fetchImpl` for:

- `refreshCodexImageAccountToken()` posts JSON refresh body and updates tokens/metadata.
- `fetchCodexImageAccountLimits()` sends `Authorization`, `ChatGPT-Account-ID`, optional `X-OpenAI-Fedramp`, and maps the response.
- Unauthorized limit response refreshes once and retries once.

- [ ] **Step 6: Run tests and verify RED**

Run: `pnpm test electron/codexImageAuth.test.ts`

Expected: FAIL for missing network functions.

- [ ] **Step 7: Implement network helpers**

Implement token refresh, proactive refresh decision, limit fetch, unauthorized retry, and account error preservation. Do not log raw tokens.

- [ ] **Step 8: Run tests and verify GREEN**

Run: `pnpm test electron/codexImageAuth.test.ts`

Expected: PASS.

---

### Task 3: Codex Output Runner Auth Injection

**Files:**
- Modify: `electron/features/generation/codexOutput.cjs`
- Modify: `electron/features/generation/codexOutput.test.ts`

- [ ] **Step 1: Update failing codex output test**

Change the existing test to pass:

```ts
auth: {
  accessToken: 'access-token-123',
  accountId: 'account-456',
  isFedrampAccount: false,
}
```

Remove the test auth file setup, and assert no filesystem auth read is needed.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm test electron/features/generation/codexOutput.test.ts`

Expected: FAIL because runner still reads `authFilePath` / default auth file.

- [ ] **Step 3: Implement auth injection**

Replace `loadCodexAuth(authFilePath)` usage with validation of `input.auth`. Keep cookie priming and request body unchanged. Add `X-OpenAI-Fedramp: true` when account requires FedRAMP routing.

- [ ] **Step 4: Run test and verify GREEN**

Run: `pnpm test electron/features/generation/codexOutput.test.ts`

Expected: PASS.

---

### Task 4: Generation Service Active Account and Post-Generation Limit Refresh

**Files:**
- Modify: `electron/generation.cjs`
- Add/modify: a focused Electron generation test file if feasible, otherwise add covered seams in existing tests.

- [ ] **Step 1: Write failing generation integration tests**

Cover:

- `generateImages()` rejects with `Add a Codex image account in Providers > Image` when no active account exists.
- `generateImages()` passes active account auth to `runImageGenerationBatch`.
- `generateImages()` calls `refreshAllCodexImageAccountLimits()` after success.
- `generateImages()` calls `refreshAllCodexImageAccountLimits()` after failure without replacing the original error.

- [ ] **Step 2: Run tests and verify RED**

Run targeted command for the chosen generation test file.

Expected: FAIL because generation has no active account resolver or refresh hook.

- [ ] **Step 3: Implement generation options**

Extend `createGenerationService`/the surrounding factory to accept:

```js
getActiveCodexImageAuth,
refreshAllCodexImageAccountLimits,
```

Before the batch, resolve active auth. In a `finally`, call refresh for all accounts and catch/log refresh errors so generation result/error remains authoritative.

- [ ] **Step 4: Run tests and verify GREEN**

Run targeted generation tests.

Expected: PASS.

---

### Task 5: Main/Preload IPC

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/lib/electron-api.ts`
- Modify: `src/types/electron.d.ts`

- [ ] **Step 1: Write failing IPC/type tests where existing harness allows**

At minimum, ensure compile/test coverage expects renderer APIs:

```ts
startCodexImageOAuth
switchCodexImageAccount
removeCodexImageAccount
refreshCodexImageAccountLimits
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `pnpm test src/App.test.tsx`

Expected: FAIL until mocks/types/API exports exist.

- [ ] **Step 3: Implement IPC handlers**

Wire:

- `app:startCodexImageOAuth`
- `app:switchCodexImageAccount`
- `app:removeCodexImageAccount`
- `app:refreshCodexImageAccountLimits`

For OAuth, use a single promise-style handler that starts the local flow, opens the browser with Electron shell, waits for callback, upserts account, refreshes limits, and returns sanitized provider settings.

- [ ] **Step 4: Update preload and renderer API types**

Expose the new IPC methods and TypeScript interfaces. Ensure public account types exclude token fields.

- [ ] **Step 5: Run tests and verify GREEN**

Run relevant targeted tests.

Expected: PASS.

---

### Task 6: Providers Image Tab UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Add tests for:

- Providers workspace has `Text` and `Image` tabs.
- `Image` tab empty state shows Codex account action.
- Clicking add calls `startCodexImageOAuth`.
- Saved accounts render email/plan/limit state.
- Clicking an account calls `switchCodexImageAccount`.
- Refresh/remove buttons call their APIs.
- Existing Gemini/Claude text provider save behavior still works.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test src/App.test.tsx`

Expected: FAIL because Image tab UI does not exist.

- [ ] **Step 3: Implement state and handlers**

Add provider image account state from `getProviderSettings`, update it after every image-auth IPC result, and show toast errors with `getErrorMessage()`.

- [ ] **Step 4: Implement UI**

Refactor `ProvidersWorkspace` into tabbed content. Keep the current Text provider markup mostly intact. Add Image content with restrained dark styling, Lucide icons, stable dimensions, and click targets.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `pnpm test src/App.test.tsx`

Expected: PASS for provider UI tests.

---

### Task 7: Final Verification and Cleanup

**Files:**
- Review all modified files.

- [ ] **Step 1: Run focused backend tests**

Run:

```bash
pnpm test electron/providerSettings.test.ts electron/codexImageAuth.test.ts electron/features/generation/codexOutput.test.ts
```

- [ ] **Step 2: Run focused renderer tests**

Run:

```bash
pnpm test src/App.test.tsx
```

- [ ] **Step 3: Run broader test suite if focused tests pass**

Run:

```bash
pnpm test
```

- [ ] **Step 4: Inspect diff**

Run:

```bash
git diff --stat
git diff -- electron/providerSettings.cjs electron/codexImageAuth.cjs electron/features/generation/codexOutput.cjs electron/generation.cjs electron/main.cjs electron/preload.cjs src/App.tsx src/lib/electron-api.ts src/types/electron.d.ts
```

- [ ] **Step 5: Report status**

Report implemented behavior, verification evidence, and any tests that could not be run.
