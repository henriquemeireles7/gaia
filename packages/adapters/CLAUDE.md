# Adapters — Vendor Wrappers, Capability-Named

> Status: Reference
> Last verified: April 2026
> Scope: All code in `packages/adapters/` and every caller that talks to a third-party vendor.

---

## What this file is

The patterns for vendor adapters in Gaia. These implement principle #4 of `code.md` (capability-named modules; vendors hide behind seams) so that swapping Polar for Stripe, Resend for Postmark, or Anthropic for OpenAI is a single-file change.

`packages/adapters/` is **the only package that imports vendor SDKs.** Features import `@gaia/adapters/<capability>`, never `@polar-sh/sdk`, never `resend`, never `@anthropic-ai/sdk`.

Read `code.md` first.

---

## The 10 adapter patterns

### 1. One file per capability — named by WHAT, not WHO

Adapters are organized by what they do, not by who provides it. `email.ts`, not `resend.ts`. `payments.ts`, not `polar.ts`. `ai.ts`, not `anthropic.ts`.

**Structure:**

```
packages/adapters/
├── ai.ts             # LLM completions — currently Anthropic, swappable
├── analytics.ts      # PostHog
├── email.ts          # Transactional email — Resend
├── error-tracking.ts # Sentry capture wrapper
├── markdown.ts       # MD → HTML, frontmatter parsing
├── payments.ts       # Polar (subscriptions, portal, webhooks)
├── storage.ts        # Object storage — R2 / S3
├── errors.ts         # ProviderError type — shared by all adapters
└── package.json
```

The vendor lives **inside** the file. `email.ts` imports `resend`; nothing else does.

**Pattern:**

```ts
// packages/adapters/email.ts
import { env } from '@gaia/config'
import { Resend } from 'resend'

const client = new Resend(env.RESEND_API_KEY)

export async function sendEmail(to: string, msg: { subject: string; html: string; text?: string }) {
  return client.emails.send({
    from: 'My App <hello@example.com>',
    to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ''),
  })
}
```

**Anti-pattern:**

```ts
// ❌ Vendor-named module
// packages/adapters/resend.ts
export const resend = new Resend(env.RESEND_API_KEY)

// ❌ Feature importing the vendor SDK
// apps/api/server/auth.ts
import { Resend } from 'resend'
```

**Enforcement:**

- Oxlint rule — `import { ... } from 'resend' | '@polar-sh/sdk' | '@anthropic-ai/sdk' | 'posthog-node'` is allowed only inside `packages/adapters/`.
- File names match capability list in `packages/adapters/index.ts` (the registry).

---

### 2. Single client at module level, env-driven

Each adapter creates its vendor client **once at module load**, not per call. The client reads from `@gaia/config` env, never `process.env` directly.

**Pattern:**

```ts
// packages/adapters/payments.ts
import { env } from '@gaia/config'
import { Polar } from '@polar-sh/sdk'

export const polar = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN })
```

**Anti-pattern:**

```ts
// ❌ Per-call instantiation
export async function createCheckout(input) {
  const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! })
  return polar.checkouts.create(input)
}

// ❌ process.env directly
const client = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN })
```

**Enforcement:**

- Oxlint rule — `process.env.*` is allowed only in `packages/config/env.ts`.
- Lint flags vendor-client construction inside an exported function (must be module-level).

---

### 3. Errors normalize through `ProviderError`

Vendor SDKs throw vendor-specific error shapes. Adapters catch them and rethrow as `ProviderError` so callers handle one shape, not N.

**Pattern:**

```ts
// packages/adapters/errors.ts
export class ProviderError extends Error {
  readonly provider: string
  readonly operation: string
  readonly status: number
  readonly cause: unknown

  constructor(provider: string, operation: string, status: number, cause: unknown) {
    super(`${provider}.${operation} failed (${status})`)
    this.name = 'ProviderError'
    this.provider = provider
    this.operation = operation
    this.status = status
    this.cause = cause
  }
}
```

```ts
// Inside an adapter
import { ProviderError } from '@gaia/adapters/errors'

export async function sendEmail(to: string, msg: { ... }) {
  try {
    return await client.emails.send({ ... })
  } catch (cause) {
    throw new ProviderError('resend', 'sendEmail', 502, cause)
  }
}
```

The route layer catches `ProviderError` and maps it to `AppError('SERVICE_UNAVAILABLE', { cause })` — see `packages/errors/CLAUDE.md` #8.

**Anti-pattern:**

```ts
// ❌ Vendor error leaks to feature code
export async function sendEmail(to, msg) {
  return client.emails.send({ ... }) // throws Resend's own error type
}
```

**Enforcement:**

- Every public adapter function wraps its vendor call in `try/catch` and throws `ProviderError` on failure.
- Oxlint rule — adapter return types may not include vendor-specific error types in their union.

---

### 4. Webhook signature verification — Web Crypto, not vendor SDK

Webhook handlers verify provenance before doing any work. Adapters expose a `verifyWebhook(headers, body)` helper that uses Web Crypto + the shared secret — independent of SDK version drift.

**Pattern:**

```ts
// packages/adapters/payments.ts
export async function verifyWebhook(headers: Headers, body: string): Promise<unknown> {
  const signature = headers.get('polar-signature') ?? headers.get('x-polar-signature')
  if (!signature) throw new ProviderError('polar', 'verifyWebhook', 401, 'missing-signature')

  const expected = await hmacSha256Hex(env.POLAR_WEBHOOK_SECRET, body)
  if (!timingSafeEqual(signature, expected)) {
    throw new ProviderError('polar', 'verifyWebhook', 401, 'signature-mismatch')
  }
  return JSON.parse(body)
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

`timingSafeEqual` compares strings in constant time. `verifyWebhook` returns the parsed body on success — the route never sees the raw payload.

**Anti-pattern:**

```ts
// ❌ String comparison — timing attack
if (signature === expected) { ... }

// ❌ Skip verification
const event = JSON.parse(body) // route trusts every POST blindly

// ❌ Vendor SDK signature verification (locks to SDK version)
import { verifyWebhook } from '@polar-sh/sdk/webhooks'
```

**Enforcement:**

- Integration test — POST to `/webhooks/polar` with invalid signature returns 401; valid signature returns 2xx.
- Lint rule — `===` against a header value flags as potential timing leak.

---

### 5. Idempotency — webhook events stored before any side effect

Vendors retry webhooks. Without idempotency, retried `subscription.created` webhooks could double-charge or send duplicate emails. Every webhook handler stores the external event ID before doing work.

**Pattern:**

```ts
// apps/api/server/billing.ts
import { verifyWebhook } from '@gaia/adapters/payments'
import { db } from '@gaia/db'
import { webhookEvents } from '@gaia/db/schema'

.post('/webhooks/polar', async ({ request, body }) => {
  const event = await verifyWebhook(request.headers, body)        // throws on bad sig
  const id = (event as { id: string }).id

  // Idempotency check — insert returns rows; on conflict, returns nothing
  const inserted = await db.insert(webhookEvents).values({
    provider: 'polar',
    externalEventId: id,
    eventType: (event as { type: string }).type,
  }).onConflictDoNothing().returning()

  if (inserted.length === 0) {
    return { ok: true, skipped: 'duplicate' }
  }

  await processPolarEvent(event)
  return { ok: true }
})
```

The `webhook_events` table has a unique index on `(provider, external_event_id)`. The first webhook wins; retries are no-ops.

**Anti-pattern:**

```ts
// ❌ Process first, dedupe never
.post('/webhooks/polar', async ({ body }) => {
  await processPolarEvent(JSON.parse(body)) // double-runs on retry
})
```

**Enforcement:**

- Schema constraint: `webhook_events.unique('provider', 'external_event_id')`.
- Integration test — POST same webhook twice with same `external_event_id`, assert second response is `{ skipped: 'duplicate' }` and side effects fired exactly once.

---

### 6. SSRF defense lives here — `safeFetch` for any user-driven URL

Outbound HTTP fetched from user input is a top-tier security risk (OWASP API7). The shared `safeFetch()` helper validates protocol, hostname, and resolved IPs before fetching.

**Pattern:**

```ts
// packages/adapters/http.ts
import { AppError } from '@gaia/errors'

export async function safeFetch(
  urlInput: string,
  opts: {
    allowedHosts?: string[]
    maxSize?: number
    timeout?: number
  } & RequestInit = {},
): Promise<Response> {
  const url = new URL(urlInput)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new AppError('FORBIDDEN', { context: { reason: 'protocol' } })
  if (opts.allowedHosts && !opts.allowedHosts.includes(url.hostname))
    throw new AppError('FORBIDDEN')

  // ... blocked hosts + CIDR + DNS rebinding check (see packages/security/CLAUDE.md #11)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? 10_000)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
```

Webhook delivery, link previews, RAG ingestion all go through `safeFetch`. Plain `fetch()` is forbidden outside this package.

**Enforcement:**

- Oxlint rule — `fetch(...)` and `Bun.fetch(...)` forbidden outside `packages/adapters/` and `packages/testing/`.
- Security integration test — submit `http://169.254.169.254/`, `http://localhost/`, `http://10.0.0.1/`; assert all blocked.

See `packages/security/CLAUDE.md` #11 for the full SSRF spec.

---

### 7. Every adapter call is a span

Adapter calls cross a process boundary — they're prime span territory. Each public adapter function wraps its vendor call in `tracer.startActiveSpan('adapter.{name}.{operation}', ...)` with semantic attributes.

**Pattern:**

```ts
// packages/adapters/payments.ts
import { trace, SpanStatusCode } from '@opentelemetry/api'

const tracer = trace.getTracer('gaia-adapters')

export async function createCheckout(input: CheckoutInput) {
  return tracer.startActiveSpan('adapter.polar.createCheckout', async (span) => {
    span.setAttribute('adapter.name', 'polar')
    span.setAttribute('polar.product_id', input.productId)
    try {
      const result = await polar.checkouts.create(input)
      span.setAttribute('polar.checkout_id', result.id)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (cause) {
      span.recordException(cause as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw new ProviderError('polar', 'createCheckout', 502, cause)
    } finally {
      span.end()
    }
  })
}
```

LLM adapters dual-write: OTel span + PostHog `$ai_generation` event. See `packages/core/CLAUDE.md` #5.

**Anti-pattern:**

```ts
// ❌ No span — adapter call invisible in distributed trace
return await polar.checkouts.create(input)
```

**Enforcement:**

- Lint rule — every exported function in `packages/adapters/*.ts` either calls `startActiveSpan` or delegates to a function that does.
- Integration test — make request hitting an adapter; trace has `adapter.<name>.<op>` span.

---

### 8. Timeouts and size limits on every outbound call

Vendor APIs hang. Default `fetch()` waits forever. Every adapter sets an explicit timeout and (where applicable) a max response size.

**Pattern:**

```ts
// AI adapter — long-running but bounded
const result = await tracer.startActiveSpan('llm.anthropic.sonnet', async (span) => {
  return claude.messages.create({
    ...input,
    timeout_ms: 30_000, // SDK-level timeout
  })
})

// HTTP adapter — strict default
await safeFetch(url, { timeout: 5_000, maxSize: 5 * 1024 * 1024 })
```

| Capability    | Default timeout | Notes                                   |
| ------------- | --------------- | --------------------------------------- |
| Email         | 10s             | Resend usually replies in <1s           |
| Payments      | 15s             | Polar checkout creation can be slow     |
| LLM           | 30s             | Generation can be long; cap per request |
| Storage       | 30s             | Large uploads need higher               |
| Outbound HTTP | 10s             | `safeFetch` default                     |

Timeouts are a first-class config value, not buried magic numbers.

**Anti-pattern:**

```ts
// ❌ No timeout — request can hang forever
await fetch(url)

// ❌ Per-call hardcoded timeout
setTimeout(() => abort(), 30000) // why 30000? scattered everywhere
```

**Enforcement:**

- Lint rule — `fetch(...)` and `Bun.fetch(...)` without an `AbortController` signal flag as warning inside `packages/adapters/`.
- Each adapter exports a `TIMEOUTS` const documenting its limits.

---

### 9. No silent retries — let iii decide

Adapters do not retry. Retry policy is a workflow concern — iii queues retry per the queue config. An adapter that retries on its own corrupts iii's idempotency assumptions and hides flakiness.

**Pattern:**

```ts
// ✅ Adapter throws on first failure
try {
  return await client.emails.send({ ... })
} catch (cause) {
  throw new ProviderError('resend', 'sendEmail', 502, cause)
}

// ✅ Workflow handles retry
import { iii } from './client'
import { TriggerAction } from 'iii-sdk'

await iii.trigger({
  function_id: 'email.send',
  payload: { to, subject, html },
  action: TriggerAction.Enqueue({ queue: 'email-default' }), // retries per queue config
})
```

**Anti-pattern:**

```ts
// ❌ In-adapter retry
async function sendEmail(to, msg) {
  for (let i = 0; i < 3; i++) {
    try { return await client.emails.send({ ... }) }
    catch (e) { await sleep(1000 * (i + 1)) }
  }
}
```

**Enforcement:**

- Lint rule — adapter functions may not contain retry loops or exponential backoff.
- Code review flag — `setTimeout` / `sleep` inside `packages/adapters/` triggers `/w-review`.

See `packages/workflows/CLAUDE.md` for queue config and retry behavior.

---

### 10. Treat LLM responses as untrusted input

The AI adapter is special: every token it returns is user-controlled (via prompt injection). The adapter never lets a raw response through to feature code without parse + validate.

**Pattern:**

```ts
// packages/adapters/ai.ts
import { Anthropic } from '@anthropic-ai/sdk'
import { Value } from '@sinclair/typebox/value'
import { Type } from '@sinclair/typebox'
import { type Result, ok, err } from '@gaia/errors/result'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export async function complete<S extends Type.TSchema>(opts: {
  systemPrompt: string
  userContent: string
  externalContent?: string
  schema: S
}): Promise<Result<Type.Static<S>, 'LLM_PARSE_FAILED' | 'LLM_TIMEOUT'>> {
  const messages = [
    { role: 'system' as const, content: opts.systemPrompt },
    {
      role: 'user' as const,
      content: [
        opts.externalContent
          ? `<external_content>\n${sanitize(opts.externalContent)}\n</external_content>`
          : '',
        `<user_query>\n${sanitize(opts.userContent)}\n</user_query>`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  ]

  const result = await client.messages.create({
    model: 'claude-opus-4-7',
    messages,
    max_tokens: 4096,
  })
  const text = result.content[0]?.type === 'text' ? result.content[0].text : ''
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return err('LLM_PARSE_FAILED', { raw: text })
  }
  if (!Value.Check(opts.schema, parsed)) return err('LLM_PARSE_FAILED', { raw: text })
  return ok(parsed as Type.Static<S>)
}

function sanitize(content: string): string {
  return content
    .replace(/[​-‍﻿⁠-⁤]/g, '') // zero-width
    .replace(/<\|im_(start|end)\|>/g, '')
    .replace(/<\|system\|>/g, '') // delimiter injection
    .slice(0, 50_000)
}
```

The adapter returns `Result<T, E>`, not `T`, because malformed LLM output is a normal case worth handling — see `packages/errors/CLAUDE.md` #1.

**Anti-pattern:**

```ts
// ❌ Raw LLM text returned to caller
export async function complete(opts) {
  const result = await client.messages.create({ ... })
  return result.content[0].text // unparsed, unvalidated, exfil-ready
}
```

**Enforcement:**

- The AI adapter's return type is always `Result<Validated, ErrorCode>` — never raw `string`.
- Security test suite includes prompt-injection samples; LLM output is verified not to leak system prompt or pass schema validation when malformed.

See `packages/security/CLAUDE.md` #12 for the full LLM untrust spec across all 8 layers.

---

## Inventory

| Capability     | File                | Vendor       | Public exports                                           |
| -------------- | ------------------- | ------------ | -------------------------------------------------------- |
| Email          | `email.ts`          | Resend       | `email`, `sendEmail`                                     |
| Payments       | `payments.ts`       | Polar        | `polar`, `verifyWebhook`                                 |
| AI / LLM       | `ai.ts`             | Anthropic    | `complete`                                               |
| Analytics      | `analytics.ts`      | PostHog      | `track`, `identify`, `shutdown`                          |
| Error tracking | `error-tracking.ts` | Sentry       | `captureException`, `captureMessage`, `flush`            |
| Storage        | `storage.ts`        | R2 / S3      | `upload`, `download`, `getSignedUrl`, `remove`           |
| Markdown       | `markdown.ts`       | (in-process) | `parseFrontmatter`, `renderMarkdown`, `listContentFiles` |
| Outbound HTTP  | `http.ts`           | (in-process) | `safeFetch`                                              |
| Errors         | `errors.ts`         | (in-process) | `ProviderError`                                          |

Adding a new capability: create `packages/adapters/<capability>.ts`, register in the inventory above, add env keys to `packages/config/env.ts`, write tests in `<capability>.test.ts`.

---

## Quick reference

| Need                              | Pattern                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| Send email                        | `import { sendEmail } from '@gaia/adapters/email'`                     |
| Charge / checkout                 | `import { polar, verifyWebhook } from '@gaia/adapters/payments'`       |
| LLM completion                    | `import { complete } from '@gaia/adapters/ai'` → returns `Result<T,E>` |
| Capture event                     | `import { track, identify } from '@gaia/adapters/analytics'`           |
| Outbound HTTP (user-supplied URL) | `import { safeFetch } from '@gaia/adapters/http'`                      |
| Catch any adapter failure         | `if (e instanceof ProviderError && e.provider === 'polar')`            |
| Webhook signature                 | `await verifyWebhook(req.headers, rawBody)`                            |

---

## Cross-references

- Code principles: `.claude/skills/w-code/reference.md` (#4 capability-named modules)
- Backend integration: `apps/api/CLAUDE.md`
- Errors: `packages/errors/CLAUDE.md` (`ProviderError` mapping to `AppError`)
- Security: `packages/security/CLAUDE.md` (#11 SSRF, #12 LLM untrust)
- Observability: `packages/core/CLAUDE.md` (spans, dual-write to PostHog)
- Workflows / retry: `packages/workflows/CLAUDE.md`
- AI audit: `.claude/skills/a-ai/reference.md`
