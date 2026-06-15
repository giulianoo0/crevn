# Codex Image Auth Design

## Purpose

Bring Codex image authentication fully in-house for the Electron app. The app must not read from, write to, or switch `~/.codex/auth.json`. Users can add multiple ChatGPT/Codex accounts in the Providers settings, see each account's Codex limits, and click an account to make it the active image-generation auth state.

## Source Research

The public `openai/codex` repository shows these relevant auth and usage behaviors:

- Browser OAuth uses the public Codex client id `app_EMoamEEZ73f0CkXaXp7hrann`, PKCE, a localhost callback, and `https://auth.openai.com/oauth/token`.
- The authorize URL requests `response_type=code`, `scope=openid profile email offline_access api.connectors.read api.connectors.invoke`, `code_challenge_method=S256`, `id_token_add_organizations=true`, `codex_cli_simplified_flow=true`, `state`, and `originator=codex_cli_rs`.
- Persisted ChatGPT auth has `auth_mode: "chatgpt"`, `tokens`, and `last_refresh`.
- `tokens` includes `id_token`, `access_token`, `refresh_token`, and optional `account_id`.
- The ID token is parsed for email, ChatGPT plan type, ChatGPT user id, ChatGPT account id, and FedRAMP routing.
- Codex backend requests use `Authorization: Bearer <access_token>` and `ChatGPT-Account-ID: <account_id>`.
- Token refresh posts JSON to `https://auth.openai.com/oauth/token` with `client_id`, `grant_type: "refresh_token"`, and `refresh_token`.
- Account limits are fetched from `GET https://chatgpt.com/backend-api/wham/usage` for ChatGPT backend style. The response contains plan type, primary and secondary rate-limit windows, spend control, reached-limit reason, credits, and additional rate limits.

## Product Scope

Add an `Image` tab to the existing Providers workspace.

The `Image` tab must support:

- Adding multiple Codex accounts through in-app OAuth.
- Listing saved accounts with email or account id, plan, active state, limit summary, last refreshed time, and error state.
- Switching the active image auth state by clicking an account.
- Removing a saved account.
- Manually refreshing limits.
- Automatically refreshing limits for all saved Codex accounts after every completed image generation attempt, whether the generation succeeds or fails.

Out of scope:

- Writing `~/.codex/auth.json`.
- Shelling out to the Codex CLI for routine auth.
- Adding automatic account rotation.
- Supporting API-key image auth for this feature.
- Implementing a system light theme.

## Data Model

Extend provider settings with an app-owned `image.codex` branch:

```ts
interface ProviderSettings {
  text: {
    gemini: { apiKey: string };
    anthropic: { apiKey: string };
  };
  image: {
    codex: {
      activeAccountId: string | null;
      accounts: CodexImageAccount[];
    };
  };
}

interface CodexImageAccount {
  id: string;
  accountId: string;
  email: string | null;
  planType: string | null;
  chatgptUserId: string | null;
  isFedrampAccount: boolean;
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
  lastRefresh: string | null;
  limits: CodexRateLimitSnapshot[];
  limitsLastCheckedAt: string | null;
  limitsError: string | null;
  createdAt: string;
  updatedAt: string;
}
```

The account `id` is app-local and stable. `accountId` is the ChatGPT account/workspace id from OAuth claims or token payload. Duplicate accounts should update the existing record instead of creating a second copy.

Token fields are stored in the existing provider settings file for this iteration. This matches the current local credential persistence approach for provider API keys. A later security hardening pass can move token material to OS keychain storage without changing renderer APIs.

## Electron Main Responsibilities

Add an in-house Codex image auth module under `electron/`.

It should provide:

- Provider settings normalization for the new image branch.
- JWT payload parsing for ID-token metadata and access-token expiry.
- PKCE generation.
- Local browser OAuth server with the Codex authorize URL and callback validation.
- Token exchange and refresh.
- Limit fetching and response mapping.
- Active account resolution for image generation.
- Account switching, removal, and limit refresh IPC handlers.

The OAuth server should bind to the Codex-compatible default port first and a fallback if needed. It should validate `state`, handle denied callbacks, avoid logging secret query values, exchange the code, parse metadata, save/update the account, mark it active, refresh its limits, and return a sanitized account record to the renderer.

Refresh behavior should mirror upstream Codex:

- Refresh a managed ChatGPT token proactively when the access token is missing expiry metadata, stale by `lastRefresh`, or within five minutes of expiration.
- On unauthorized usage/limit calls, attempt one token refresh and retry once.
- If refresh fails permanently, keep the account but mark the error so the UI can show that re-authentication is needed.

Renderer-facing account records must not include raw tokens.

## Generation Flow

`electron/features/generation/codexOutput.cjs` currently loads `~/.codex/auth.json`. Replace that with dependency-injected auth from the generation service:

- `generateImages` resolves the active Codex image account before starting the batch.
- The active account auth is passed into `executeImageGenerationBatch` / `runImageGenerationBatch`.
- `runSingleCodexImageGeneration` uses the provided access token, account id, and FedRAMP flag rather than reading a file.
- If no active account exists, generation fails with an actionable "Add a Codex image account in Providers > Image" error.
- The existing cookie priming and Codex responses request shape remain intact.
- After the generation attempt settles, the generation service triggers `refreshAllCodexImageAccountLimits()`.
- Limit refresh failures must not hide the original generation result. They update account status and may surface as a non-blocking toast from renderer state if a refresh event is added.

## Renderer UI

Update `ProvidersWorkspace` to use compact tabs:

- `Text`: existing Gemini and Claude API-key controls.
- `Image`: new Codex account manager.

The `Image` tab layout should follow the existing dark studio style:

- A primary section for Codex image auth.
- A concise add-account action using a button with a Lucide icon.
- Account rows/cards with email/account id, plan, status pill, active state, rate limit percentages, and updated timestamp.
- Clicking an account switches it active.
- Secondary icon buttons for refresh and remove.
- Empty state should be direct and tool-like, not marketing copy.

State should load from `getProviderSettings` and dedicated image-auth IPC responses. Existing text-key save behavior should remain unchanged.

## IPC API

Add small explicit APIs rather than overloading the whole settings save call for OAuth:

```ts
startCodexImageOAuth(): Promise<CodexImageAuthStartResult>
completeCodexImageOAuth(loginId: string): Promise<CodexImageAccountPublic>
cancelCodexImageOAuth(loginId: string): Promise<void>
switchCodexImageAccount(accountId: string): Promise<ProviderSettings>
removeCodexImageAccount(accountId: string): Promise<ProviderSettings>
refreshCodexImageAccountLimits(): Promise<ProviderSettings>
```

The OAuth API can be simplified if the browser callback completion is easier to model as a single `addCodexImageAccount()` promise from the renderer. The final implementation should keep token material in Electron main and expose only sanitized account fields to React.

## Error Handling

- Missing active account: block image generation with an actionable error.
- OAuth denial or timeout: keep existing accounts unchanged.
- Duplicate account login: update tokens and metadata on the existing record.
- Token refresh failure: mark account error and keep it listed.
- Limit refresh failure: record `limitsError` and preserve the last successful limit snapshot.
- Account removal: if removing the active account, choose the next remaining account or clear `activeAccountId`.

## Tests

Add tests before implementation for:

- Provider settings normalization preserves text settings and defaults the image branch.
- Saving duplicate Codex accounts updates the existing account.
- Removing active account clears or moves active selection.
- JWT parsing extracts email, account id, user id, plan type, and FedRAMP flag.
- OAuth authorize URL includes the upstream Codex parameters.
- Token refresh updates tokens and `lastRefresh`.
- Rate-limit payload mapping handles primary, secondary, spend control, and additional limits.
- Generation fails without an active account.
- Generation passes the active account auth to Codex output without reading `~/.codex/auth.json`.
- Generation completion triggers all-account limit refresh on success and failure.
- Providers UI shows the Image tab, lets users switch active accounts, and shows limit/error states.

## Open Decisions

- Token storage remains file-backed in provider settings for this iteration, matching current provider key behavior. Keychain storage is deferred.
- The app will not auto-rotate accounts by remaining limit. Switching is manual.
- The global Codex CLI auth file is completely untouched.
