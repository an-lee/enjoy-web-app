# API Worker Integration & Endpoint Protocol

## Overview

The **Hono API Worker** is responsible for **all AI services** and some auxiliary APIs.
It is deployed as part of the Cloudflare Worker that also serves the Web App.

- **Base URL (same origin)**: `/api/*`
- **Implementation entry**: `src/worker/index.ts` + `src/worker/router.ts`
- **Route group root**: Hono router mounts feature routers under:
  - `/azure`
  - `/chat`
  - `/audio`
  - `/models`
  - `/translations`

Unless otherwise noted, all endpoints:

- Use **JSON** for request/response bodies (except file uploads)
- Require **authentication**
- Return errors using the standard format described in [`doc/api-response-format.md`](./api-response-format.md)

## Authentication

- **Type**: Bearer token (JWT), same token as Rails API backend
- **Header**:

```http
Authorization: Bearer <token>
```

All Worker routes use the shared `authMiddleware` (`src/worker/middleware/auth.ts`), which:

- Extracts and validates the JWT
- Attaches the `user` object (`UserProfile`) to the Hono context
- Rejects unauthenticated requests with an error response

## Health Check

- **Method**: `GET`
- **Path**: `/api/health`
- **Auth**: Not required

**Response (200)**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Use this endpoint for monitoring and availability checks.

---

## OpenAI-Compatible APIs

These endpoints are designed to be **OpenAI-compatible** so that existing OpenAI clients can be re-used with minimal changes.

### List Models

- **Method**: `GET`
- **Path**: `/api/models`
- **Auth**: Required

Returns the list of available Workers AI models that are exposed via the OpenAI-compatible interface.

**Response (200)**:

```json
{
  "object": "list",
  "data": [
    {
      "id": "@cf/...",
      "object": "model",
      "created": 1700000000,
      "owned_by": "cloudflare",
      "permission": [],
      "root": "@cf/...",
      "parent": null
    }
  ]
}
```

- The actual `id` values come from:
  - `Env.WORKERS_AI_TEXT_MODEL` (text model)
  - `Env.WORKERS_AI_TTS_MODEL` (TTS model, default: `@cf/myshell-ai/melotts`)

> **Frontend usage**: When using generic OpenAI clients, this endpoint can be used to introspect supported model IDs.

### Chat Completions (Non-Streaming)

- **Method**: `POST`
- **Path**: `/api/chat/completions`
- **Auth**: Required
- **Streaming**: **Not supported** (`stream: true` is rejected)

This endpoint is **OpenAI Chat Completions compatible** and internally routes to **Cloudflare Workers AI**.

**Request Body** (compatible subset of OpenAI):

```json
{
  "model": "@cf/...",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false,
  "top_p": 1.0,
  "frequency_penalty": 0,
  "presence_penalty": 0
}
```

- `model`:
  - Optional, defaults to `Env.WORKERS_AI_TEXT_MODEL`
- `messages`:
  - **Required**, must be an array. Same structure as OpenAI (`role` + `content`).
- `stream`:
  - Must be `false` or omitted. If `true`, the API returns `400`.

**Response (200)** (OpenAI-compatible shape):

```json
{
  "id": "chatcmpl-1700000000000",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "@cf/...",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**Error Cases**:

- Missing/invalid `messages` → `400` with `error: "messages is required and must be an array"`
- No Workers AI binding (`env.AI` missing) → `500` with `error: "Workers AI binding is not configured"`
- Credits/rate limit exceeded → see [`doc/pricing-strategy.md`](./pricing-strategy.md) and [`doc/api-response-format.md`](./api-response-format.md)

> **Credits**: After receiving the Workers AI response, the route calls `enforceCreditsLimit` with `type: "llm"` and uses actual token usage when available.

---

## Translation API

### Text Translation (Workers AI m2m100)

- **Method**: `POST`
- **Path**: `/api/translations`
- **Auth**: Required

This endpoint uses **Cloudflare Workers AI m2m100-1.2b** model and applies **permanent KV caching** by `(text, source_lang, target_lang)`.

**Request Body**:

```json
{
  "text": "Hello world",
  "source_lang": "en",
  "target_lang": "zh",
  "force_refresh": false
}
```

- `text`:
  - **Required** (after `trim`), otherwise `400: { "error": "text is required" }`
- `source_lang`:
  - Optional, default `"en"`
  - ISO 639-1 or BCP-47, e.g. `"en"`, `"zh"`, `"zh-CN"`
- `target_lang`:
  - **Required**, otherwise `400: { "error": "target_lang is required" }`
- `force_refresh`:
  - Optional, defaults to `false`
  - When `true`, deletes any existing KV cache entry and forces regeneration

**Response (200)**:

```json
{
  "translated_text": "你好，世界"
}
```

**Caching Behavior**:

- Cache key: SHA-256 hash of `text:source_lang:target_lang`, stored as:
  - `translation:<hash>`
- Backend:
  - If `force_refresh` is `true`, deletes the existing cache entry before regenerating
  - On cache hit, returns cached value without calling Workers AI
  - On cache miss, calls `@cf/meta/m2m100-1.2b` and then stores result in KV

**Credits**:

- Before translation, the route calls:

```ts
enforceCreditsLimit(c, {
  type: "translation",
  chars: text.length,
});
```

- If the Credits limit fails with `RateLimitError`, the error is propagated and should be handled by frontend as a quota/rate-limit error.

---

## AI Dictionary API (Workers AI LLM)

### AI Dictionary Lookup

- **Method**: `POST`
- **Path**: `/api/dictionary/query`
- **Auth**: Required

Generates a **dictionary-style entry** using Workers AI text model, with **KV caching by word + language pair**.

> **Note**: This is the **AI-rich dictionary** (multi-sense, examples, explanations), not the basic dictionary service from the Rails backend.

**Request Body**:

```json
{
  "word": "apple",
  "source_lang": "en",
  "target_lang": "zh",
  "force_refresh": false
}
```

- `word`:
  - **Required**, trimmed on backend; empty after trim → `400: { "error": "word is required" }`
- `source_lang`:
  - **Required**, otherwise `400: { "error": "source_lang is required" }`
- `target_lang`:
  - **Required**, otherwise `400: { "error": "target_lang is required" }`
- `force_refresh`:
  - Optional, defaults to `false`
  - When `true`, deletes cache entry before regeneration

**Response (200)**:

```json
{
  "result": {
    // DictionaryAIResult structure
  }
}
```

The exact shape of `DictionaryAIResult` is defined in `src/worker/services/dictionary-ai.ts` and documented in `doc/ai-services.md`. It typically includes:

- Senses/meanings
- Example sentences
- Usage notes
- Part-of-speech information

**Caching & Credits**:

- Cache key: SHA-256 of `word:source_lang:target_lang`, stored as:
  - `dictionary:<hash>`
- Cache is **permanent** (no expiration).
- KV read/write errors are **ignored** and do not fail the request.
- After generation, Credits are enforced using `usage` information when available:

```ts
enforceCreditsLimit(c, {
  type: "llm",
  tokensIn: usage?.prompt_tokens ?? Math.max(word.length, 16),
  tokensOut: usage?.completion_tokens ?? 512,
});
```

If Credits are exceeded with `RateLimitError`, the result is **not cached**.

---

## Audio / ASR API (Workers AI Whisper)

### Audio Transcription (OpenAI-Compatible)

- **Method**: `POST`
- **Path**: `/api/audio/transcriptions`
- **Auth**: Required
- **Content-Type**: `multipart/form-data`

This endpoint is **compatible with OpenAI Whisper API** but powered by **Cloudflare Workers AI**.

**Form Fields**:

- `file` (**required**): Audio file to transcribe (`File`)
- `model` (optional):
  - Defaults to `Env.WORKERS_AI_ASR_MODEL` or `@cf/openai/whisper-large-v3-turbo`
- `language` (optional):
  - Language code hint, passed directly to Workers AI
- `prompt` (optional):
  - Initial prompt for Whisper
- `response_format` (optional):
  - `"json"` (default) | `"text"` | `"vtt"`
- `duration_seconds` (optional):
  - Number (stringified), used for **Credits estimation**
  - If missing or invalid, backend assumes `60` seconds

**Credits**:

Before calling the ASR model, the route enforces Credits:

```ts
const secondsForBilling = durationSeconds > 0 ? durationSeconds : 60;

enforceCreditsLimit(c, {
  type: "asr",
  seconds: secondsForBilling,
});
```

If Credits are exceeded with `RateLimitError`, the request fails with an error response.

**Response (200)**:

Depending on `response_format`:

1. `response_format === "text"`
   - Returns **plain text** transcription:

   ```text
   Hello world ...
   ```

   - `Content-Type: text/plain`

2. `response_format === "vtt"` **and** Workers AI returned `vtt`
   - Returns **VTT subtitle text**
   - `Content-Type: text/vtt`

3. Default (`"json"` or any other value)
   - Returns full Workers AI Whisper output:

   ```json
   {
     "text": "Hello world",
     "word_count": 2,
     "segments": [
       {
         "start": 0.0,
         "end": 1.0,
         "text": "Hello world",
         "words": [
           { "word": "Hello", "start": 0.0, "end": 0.5 },
           { "word": "world", "start": 0.5, "end": 1.0 }
         ]
       }
     ],
     "transcription_info": {
       "language": "en",
       "language_probability": 0.99,
       "duration": 10.0,
       "duration_after_vad": 8.0
     },
     "vtt": "WEBVTT\n..."
   }
   ```

If `text` is missing in the Workers AI response, the route returns `500: { "error": "Failed to transcribe audio" }`.

---

## Azure Speech Token API

### Generate Azure Speech Token

- **Method**: `POST`
- **Path**: `/api/azure/tokens`
- **Auth**: Required
- **Rate Limit**: Protected by `azureTokenRateLimitMiddleware`

Generates a **short-lived Azure Speech token** and records approximate usage for pricing/credits.

**Request Body** (JSON, all fields optional):

```json
{
  "usagePayload": {
    "purpose": "assessment",
    "assessment": {
      "durationSeconds": 15
    }
  }
}
```

- `usagePayload`:
  - Optional payload sent by frontend to help backend estimate cost.
  - During compatibility window, if missing, backend uses default:

  ```json
  {
    "purpose": "assessment",
    "assessment": {
      "durationSeconds": 15
    }
  }
  ```

The exact structure of `AzureTokenUsagePayload` is defined in `src/worker/services/azure.ts` and documented in `doc/ai-services.md`.

**Response (200)**:

```json
{
  "token": "<azure_token>",
  "region": "eastus",
  "expiresAt": "2024-01-01T00:00:00.000Z",
  "usage": {
    "purpose": "assessment",
    "assessment": {
      "durationSeconds": 15
    }
  }
}
```

> **Frontend usage**: Use this token and region with Azure Speech SDK for TTS and pronunciation assessment on the client side.

On error, the route delegates to `handleError` with context `"Failed to generate Azure Speech token"`.

---

## Error Format & Handling

All Worker APIs ultimately rely on the shared error handler (`src/worker/utils/errors.ts`), which:

- Normalizes thrown errors
- Adds appropriate HTTP status codes
- Serializes error payloads

For full details of the error schema, see [`doc/api-response-format.md`](./api-response-format.md).

**General expectations**:

- 2xx responses contain successful payloads as documented above.
- 4xx/5xx responses include a structured error payload with the following **Worker-specific** shape:

```json
{
  "error": "Short error identifier",
  "message": "Human readable description",
  "code": "OPTIONAL_MACHINE_READABLE_CODE",
  "details": {}
}
```

### RateLimitError (Credits / Quota Exhausted)

Several Worker endpoints enforce a **credits-based quota system** via `enforceCreditsLimit`:

- `/api/chat/completions` (`type: "llm"`, token-based)
- `/api/translations` (`type: "translation"`, character-based)
- `/api/dictionary/query` (`type: "llm"`, token-based)
- `/api/audio/transcriptions` (`type: "asr"`, seconds-based, using `duration_seconds` when provided)

When the quota is exceeded, `enforceCreditsLimit` throws a **`RateLimitError`**, which is then converted into a structured error response.

**Typical HTTP status**:

- `429 Too Many Requests` (for quota/credits exhaustion)

**Typical error payload** (shape, exact `code`/`message` see `api-response-format.md` and `pricing-strategy.md`):

```json
{
  "error": "rate_limit_exceeded",
  "message": "AI usage limit exceeded for current plan.",
  "code": "CREDITS_EXHAUSTED",
  "category": "business_limit",
  "kind": "credits",
  "limit": {
    "label": "Daily Credits",
    "used": 123,
    "limit": 1000,
    "resetAt": "2024-01-01T00:00:00.000Z",
    "window": "daily",
    "scope": "user:123"
  }
}
```

**Frontend handling recommendations**:

- Treat `429` + `error.code === "rate_limit_exceeded"` (or similar) as **soft-failure**:
  - Do **not** retry automatically in a tight loop.
  - Show user-friendly message such as “You have reached the AI usage limit. Please wait or upgrade your plan.”
- Optional UX:
  - For background features (auto-translation, auto-dictionary), degrade gracefully:
    - Hide AI suggestions or mark them as unavailable.
    - Keep core non-AI features working.
  - For user-triggered actions, surface clear error toasts/dialogs with minimal technical detail.

**Important**:

- Cache hits for `/api/translations` and `/api/dictionary/query` **do not** consume credits and will not throw `RateLimitError`.
- For `/api/audio/transcriptions`, providing accurate `duration_seconds` helps avoid unexpected rate-limit errors by improving cost estimation.

Frontend code should:

- Check `response.ok` and parse JSON when appropriate.
- Inspect `error.code` and HTTP status for user-facing error messages and retry logic.

---

## Frontend Integration Guidelines

- **Base path**: Always call Worker APIs via **same-origin** `/api/*` paths.
- **Auth**:
  - Reuse the existing JWT from the auth store.
  - Always set `Authorization: Bearer <token>`.
- **Credits & Limits**:
  - For ASR, provide `duration_seconds` when possible for accurate billing.
  - Handle `RateLimitError`/quota-style failures according to [`doc/pricing-strategy.md`](./pricing-strategy.md).
- **Caching Awareness**:
  - Use `force_refresh` flags (`translations`, `dictionary`) only when user explicitly requests a fresh result.
  - Default to cached responses for better performance and lower cost.

For higher-level, provider-agnostic usage patterns, see [`doc/ai-services.md`](./ai-services.md) and the `@/ai` service layer, which wraps these raw Worker endpoints.
