## D1 (Server-side) Data Models

This document tracks relational data models that live in Cloudflare D1 and are
accessed via Drizzle ORM from the server (Workers) layer.

### `credits_usage_logs`

- **Purpose**: Immutable audit log for per-request Credits consumption.
- **Used by**: Server-side services that enforce Credits limits (e.g. Azure, TTS, ASR, LLM).

Schema (logical model):

- `id: string` – Primary key (UUID / Snowflake ID generated in application code).
- `userId: string` – User identifier (matches `UserProfile.id`).
- `date: string` – UTC date in `YYYY-MM-DD`, aligned with Credits KV key.
- `timestamp: number` – Unix timestamp in milliseconds when the operation occurred.
- `serviceType: string` – Logical service name (`'tts' | 'asr' | 'translation' | 'llm' | 'assessment' | …`).
- `tier: string` – Subscription tier at the time of the request (`'free' | 'pro' | 'ultra'`).
- `required: number` – Credits requested for this operation (before enforcing limits).
- `usedBefore: number` – Credits used before this operation (from KV).
- `usedAfter: number` – Credits used after this operation (from KV).
- `allowed: boolean` – Whether the request was allowed (true) or rejected (false).
- `meta: Record<string, unknown> | null` – Optional JSON metadata, such as:
  - `chars`, `seconds`, `tokensIn`, `tokensOut`
  - `requestId`, `endpoint`, `provider`, etc.

Implementation notes:

- Physical table is defined in `src/server/db/schema.ts` via Drizzle’s
  `sqliteTable('credits_usage_logs', …)`.
- KV remains the **source of truth** for enforcing daily Credits limits.
  D1 is used for **auditability and reporting**, not for rate limiting logic.
- Writes to this table should be **best-effort**:
  - Logging failures must not break the user-facing request.
  - Services should log both successful and rejected Credits checks when useful.


