# Errors — Named Codes, Structured Context, Observability

> Status: Reference
> Last verified: April 2026
> Scope: All error handling across the monorepo — backend, frontend, workflows, CLI

---

## What this file is

The error handling patterns for Gaia. These implement principle #3 of `code.md` (named errors, no swallowing) in concrete detail.

Read `code.md` first. This file is the concrete _how_.

**Key context:** Gaia has one error catalog. Every error thrown anywhere in the codebase refers to a named code from `packages/errors/src/codes.ts`. There are no ad-hoc `throw new Error('user not found')` calls. The catalog is the contract between code and observability.

---

## The 10 error principles

### 1. Throw is the default; Result is a specific seam

TypeScript offers two styles: throw exceptions, or return `Result<T, E>`. Mixing them is confusing. Gaia picks:

- **Throw** for domain errors in services, routes, adapters — the common case
- **Result<T, E>** reserved for specific seams where partial success matters:
  - LLM response parsing (the response may be valid or malformed — not exceptional)
  - Inngest workflow steps (retry decision depends on error type)
  - External API clients where the caller must inspect error shape

**Pattern (throw — default):**

```ts
import { throwError } from '@gaia/errors'

export async function getUser(id: string, tenantId: string) {
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
  })
  if (!user) throwError('USER_NOT_FOUND', { context: { id, tenantId } })
  return user // typed, always defined past this point
}
```

**Pattern (Result — specific seam):**

```ts
import { type Result, ok, err } from '@gaia/errors/result'

export async function parseLLMResponse(
  raw: string,
): Promise<Result<ParsedPlan, 'LLM_PARSE_FAILED'>> {
  try {
    const parsed = JSON.parse(raw)
    const validation = Value.Check(PlanSchema, parsed)
    if (!validation) return err('LLM_PARSE_FAILED', { raw })
    return ok(parsed as ParsedPlan)
  } catch {
    return err('LLM_PARSE_FAILED', { raw })
  }
}

// Caller must handle both cases — no try/catch; TypeScript enforces it
const result = await parseLLMResponse(response.text)
if (!result.ok) {
  logger.warn('llm.parse.failed', { reason: result.error })
  return fallbackPlan()
}
return result.value
```

**Enforcement:** Oxlint rule — `Result<T, E>` types appear only in `packages/adapters/src/llm.ts`, `packages/workflows/src/`, and adapter files that call external APIs. Everywhere else uses throw.

---

### 2. Single catalog, typed codes

All error codes live in one file. The catalog is a `const` object, not a string union — TypeScript derives the type from the keys. Typos fail at build.

**Structure:**

```ts
// packages/errors/src/codes.ts
import { t } from 'elysia'

export const errorCatalog = {
  // Auth (401 / 403)
  UNAUTHENTICATED: { status: 401, http: 'Unauthorized', retryable: false, severity: 'warn' },
  INVALID_CREDENTIALS: { status: 401, http: 'Unauthorized', retryable: false, severity: 'warn' },
  SESSION_EXPIRED: { status: 401, http: 'Unauthorized', retryable: false, severity: 'info' },
  FORBIDDEN: { status: 403, http: 'Forbidden', retryable: false, severity: 'warn' },

  // Validation / not found (4xx)
  VALIDATION_FAILED: { status: 422, http: 'Unprocessable', retryable: false, severity: 'info' },
  NOT_FOUND: { status: 404, http: 'Not Found', retryable: false, severity: 'info' },
  USER_NOT_FOUND: { status: 404, http: 'Not Found', retryable: false, severity: 'info' },
  CONFLICT: { status: 409, http: 'Conflict', retryable: false, severity: 'info' },
  USER_EMAIL_TAKEN: { status: 409, http: 'Conflict', retryable: false, severity: 'info' },

  // Rate limit / quota (429)
  RATE_LIMITED: { status: 429, http: 'Too Many', retryable: true, severity: 'warn' },
  QUOTA_EXCEEDED: { status: 429, http: 'Too Many', retryable: false, severity: 'warn' },

  // Server errors (5xx) — retryable
  DATABASE_TIMEOUT: { status: 503, http: 'Unavailable', retryable: true, severity: 'error' },
  DATABASE_UNAVAILABLE: { status: 503, http: 'Unavailable', retryable: true, severity: 'critical' },
  EXTERNAL_SERVICE_DOWN: { status: 503, http: 'Unavailable', retryable: true, severity: 'error' },
  INTERNAL: { status: 500, http: 'Internal', retryable: false, severity: 'critical' },

  // LLM-specific (non-HTTP)
  LLM_PARSE_FAILED: { status: 500, http: 'Internal', retryable: true, severity: 'warn' },
  LLM_PROMPT_INJECTION_DETECTED: {
    status: 400,
    http: 'Bad Request',
    retryable: false,
    severity: 'error',
  },
} as const

export type ErrorCode = keyof typeof errorCatalog

// TypeBox schema for error response body
export const ErrorResponseSchema = t.Object({
  code: t.String(),
  message: t.String(),
  traceId: t.String(),
  // context optional — only included in dev; stripped in prod
})
```

Adding a new error = adding a key to `errorCatalog`. No other file changes needed.

**Enforcement:** Oxlint rule bans `throw new Error(...)` anywhere in feature, service, or adapter code. Error code strings used in `throwError()` are checked against the catalog at build time (TypeScript narrows the literal type).

---

### 3. Every error carries structured context

Errors are data. A `message` string is insufficient. Every error carries a `context` object with the inputs that led to the failure, a `cause` (the underlying error if any), and a `traceId` for correlation.

**Pattern:**

```ts
// packages/errors/src/throw.ts
import { errorCatalog, type ErrorCode } from './codes'

export class GaiaError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly retryable: boolean
  readonly severity: 'info' | 'warn' | 'error' | 'critical'
  readonly context: Record<string, unknown>
  readonly traceId: string

  constructor(
    code: ErrorCode,
    opts?: { context?: Record<string, unknown>; cause?: unknown; traceId?: string },
  ) {
    const spec = errorCatalog[code]
    super(spec.http)
    this.name = 'GaiaError'
    this.code = code
    this.status = spec.status
    this.retryable = spec.retryable
    this.severity = spec.severity
    this.context = opts?.context ?? {}
    this.traceId = opts?.traceId ?? getCurrentTraceId() // from OTel context
    if (opts?.cause) (this as any).cause = opts.cause
  }
}

export function throwError(
  code: ErrorCode,
  opts?: { context?: Record<string, unknown>; cause?: unknown },
): never {
  throw new GaiaError(code, opts)
}
```

Every throw captures:

- **Code** — what
- **Context** — inputs that produced the error
- **Cause** — the underlying error (for wrapping)
- **Trace ID** — for observability correlation

**Usage:**

```ts
try {
  await polar.checkouts.create({...})
} catch (cause) {
  throwError('EXTERNAL_SERVICE_DOWN', {
    context: { service: 'polar', operation: 'createCheckout', customerEmail },
    cause,
  })
}
```

The original Polar error is preserved in `cause`; the agent-facing error is the named code with context.

---

### 4. One code → one HTTP status, in a single table

The HTTP status for every error lives in `errorCatalog`. No ad-hoc status codes in routes. The Elysia global error handler maps `GaiaError.code → status` using the catalog.

**Elysia integration (in `packages/api/src/middleware/errors.ts`):**

```ts
import { Elysia } from 'elysia'
import { GaiaError, errorCatalog } from '@gaia/errors'
import { logger } from '@gaia/adapters/logs'
import { Sentry } from '@gaia/adapters/errors'
import { env } from '@gaia/config/env'

export const errorHandler = new Elysia({ name: 'errors' }).onError(({ error, set, request }) => {
  if (error instanceof GaiaError) {
    set.status = error.status
    logger.log(error.severity, error.code, {
      traceId: error.traceId,
      context: error.context,
      cause: error.cause,
      path: new URL(request.url).pathname,
    })
    if (error.severity === 'critical' || error.severity === 'error') {
      Sentry.captureException(error)
    }
    return {
      code: error.code,
      message: userFacingMessage(error.code),
      traceId: error.traceId,
      ...(env.NODE_ENV === 'development' ? { context: error.context } : {}),
    }
  }

  // Unknown error — wrap
  const wrapped = new GaiaError('INTERNAL', { cause: error })
  set.status = 500
  Sentry.captureException(wrapped)
  logger.critical('INTERNAL', { traceId: wrapped.traceId, cause: String(error) })
  return { code: 'INTERNAL', message: 'An unexpected error occurred', traceId: wrapped.traceId }
})
```

**Enforcement:** GritQL rule — Elysia routes that call `set.status = ...` outside the `onError` handler fail lint. Use `throwError()`.

---

### 5. Three message layers: developer, user, detail

Errors need to speak to three audiences:

| Layer                       | Audience     | Example                                                                       |
| --------------------------- | ------------ | ----------------------------------------------------------------------------- |
| **Developer message**       | Logs, Sentry | `"db.users.findFirst returned no row for id=xyz, tenantId=abc"`               |
| **User-facing message**     | UI           | `"We couldn't find that user."`                                               |
| **Detail** (context object) | Debugging    | `{ userId: 'xyz', tenantId: 'abc', lookupSource: 'billing.getSubscription' }` |

The catalog holds a default user-facing message per code, in `packages/errors/src/messages.ts`. Overridable per throw if the specific situation calls for it.

**Pattern:**

```ts
// packages/errors/src/messages.ts
export const userFacingMessages: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Please sign in to continue.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.', // uniform — no "user not found"
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  USER_NOT_FOUND: 'User not found.',
  USER_EMAIL_TAKEN: 'An account with that email already exists.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  // ...
}

export function userFacingMessage(code: ErrorCode, override?: string): string {
  return override ?? userFacingMessages[code]
}
```

`messages.ts` is the layer that gets i18n-translated later. Developer messages live in logs with full context.

---

### 6. Auth errors are uniform — never reveal account existence

"User not found" vs. "Wrong password" tells an attacker whether an email is registered. This enables account enumeration. All auth failures return `INVALID_CREDENTIALS` to the client; only the logs distinguish.

**Pattern:**

```ts
// Wrong: reveals account existence
async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) throwError('USER_NOT_FOUND') // ❌ leaks
  if (!(await verifyPassword(password, user.passwordHash))) throwError('WRONG_PASSWORD') // ❌ leaks
  return user
}

// Correct: uniform to the client; differentiated in logs
async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    logger.info('auth.login.failed', { reason: 'user_not_found', email })
    throwError('INVALID_CREDENTIALS', { context: { reason: 'user_not_found' } })
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    logger.info('auth.login.failed', { reason: 'wrong_password', userId: user.id })
    throwError('INVALID_CREDENTIALS', { context: { reason: 'wrong_password' } })
  }
  return user
}
```

Same client response. Different log entries. Attackers see one error; security team sees the details.

**Enforcement:** Security review — any new auth-adjacent error code that differentiates between "user" and "credential" failure is flagged.

---

### 7. Retryable flag drives Inngest and client behavior

Infrastructure errors (timeout, service down) are retryable. Business errors (conflict, validation, not found) are not. The catalog's `retryable` field drives:

- **Inngest workflow steps**: automatically retry on `retryable: true`, fail fast on `false`
- **Client (Solid)**: retry network error on `retryable: true`; show immediate error for `false`
- **Rate limiter**: `RATE_LIMITED` is retryable after `Retry-After`

**Pattern (Inngest step):**

```ts
// packages/workflows/src/billing.ts
import { inngest } from './client'
import { GaiaError } from '@gaia/errors'

export const syncSubscription = inngest.createFunction(
  { id: 'sync-subscription' },
  { event: 'billing/subscription.updated' },
  async ({ event, step }) => {
    await step.run('update-db', async () => {
      try {
        return await db
          .update(subscriptions)
          .set({ status: event.data.status })
          .where(eq(subscriptions.id, event.data.subscriptionId))
      } catch (e) {
        if (e instanceof GaiaError && !e.retryable) {
          throw new inngest.NonRetriableError(e.message, { cause: e })
        }
        throw e // Inngest retries automatically
      }
    })
  },
)
```

---

### 8. No bare `catch` — every catch has a purpose

A bare `catch (e)` without handling is a bug. Rules for catch blocks:

1. **Handle specific errors** — check type, act, done
2. **Wrap + rethrow** — convert unknown errors to named errors
3. **Never swallow** — a bare `catch` that just logs and continues is forbidden

**Anti-pattern:**

```ts
// ❌ Swallows — silent failure
try {
  await sendEmail(user.email, template)
} catch (e) {
  console.error(e)
}
```

**Pattern (handle specific):**

```ts
// ✅ Specific handling
try {
  await sendEmail(user.email, template)
} catch (e) {
  if (e instanceof GaiaError && e.code === 'EXTERNAL_SERVICE_DOWN') {
    // Queue for retry via Inngest
    await inngest.send({ name: 'email/retry', data: { userId: user.id, template } })
    return
  }
  throw e // unknown — propagate
}
```

**Pattern (wrap + rethrow):**

```ts
// ✅ Wrap external errors into named codes
try {
  return await polar.subscriptions.get(subscriptionId)
} catch (cause) {
  throwError('EXTERNAL_SERVICE_DOWN', {
    context: { service: 'polar', subscriptionId },
    cause,
  })
}
```

**Enforcement:** Oxlint rule — `catch (e) {}` (empty body) fails lint. Catch blocks that only log without re-throwing, handling, or wrapping trigger `/review` flag.

---

### 9. Errors never leak secrets or PII

The error response to the client strips context in production. Logs redact known sensitive fields (password, token, api_key, credit_card, ssn).

**Redaction:**

```ts
// packages/adapters/src/logs.ts
const SENSITIVE_KEYS = [
  'password',
  'token',
  'api_key',
  'apikey',
  'secret',
  'credit_card',
  'ssn',
  'authorization',
]

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase()
    if (SENSITIVE_KEYS.some((s) => keyLower.includes(s))) {
      out[k] = '[REDACTED]'
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redact(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}
```

Applied automatically in the logger. Applied to `context` before serializing in the error response.

**Enforcement:** Security test verifies: given a request with `Authorization: Bearer xyz`, the audit log and Sentry event for any error during that request do not contain `xyz`.

---

### 10. Every error crosses an observability boundary

Errors are not silent. The global error handler ensures:

- **All errors** emit a structured log to Axiom (with trace ID, context, severity)
- **`error` and `critical` severity** capture to Sentry with full context and stack
- **User-visible errors** emit a PostHog event (so product can see "users hit VALIDATION_FAILED on the billing form" without reading logs)

This happens automatically in `packages/api/src/middleware/errors.ts`. No per-route logging code. No `console.error` scattered throughout.

**Frontend errors:**

```ts
// apps/web/src/lib/error-boundary.tsx
import { ErrorBoundary } from 'solid-js'
import { Sentry } from '@/lib/sentry'

export function AppErrorBoundary(props: { children: any }) {
  return (
    <ErrorBoundary fallback={(err, reset) => {
      Sentry.captureException(err)
      return <ErrorFallback error={err} onReset={reset} />
    }}>
      {props.children}
    </ErrorBoundary>
  )
}
```

Solid's `ErrorBoundary` catches component render errors. Resource errors caught by `createAsync` + Suspense's error slot. All paths log to Sentry with user context.

---

## Error code catalog — starter set

Ships with Gaia v1:

### Auth (4xx)

- `UNAUTHENTICATED` (401) — no session
- `INVALID_CREDENTIALS` (401) — uniform login failure
- `SESSION_EXPIRED` (401) — token expired
- `FORBIDDEN` (403) — authenticated but not authorized
- `CSRF_TOKEN_INVALID` (403) — mutation without valid CSRF token

### Validation (4xx)

- `VALIDATION_FAILED` (422) — TypeBox schema rejected
- `BAD_REQUEST` (400) — malformed but not validatable

### Resources (4xx)

- `NOT_FOUND` (404) — generic
- `USER_NOT_FOUND` (404) — typed specific
- `RESOURCE_NOT_FOUND` (404) — generic typed
- `CONFLICT` (409) — unique violation
- `USER_EMAIL_TAKEN` (409) — typed specific

### Rate / quota (429)

- `RATE_LIMITED` (429) — IP or user over limit (retryable)
- `QUOTA_EXCEEDED` (429) — plan limit (not retryable — user must upgrade)

### Infrastructure (5xx — retryable)

- `DATABASE_TIMEOUT` (503)
- `DATABASE_UNAVAILABLE` (503)
- `EXTERNAL_SERVICE_DOWN` (503) — Polar, Resend, Axiom
- `INTERNAL` (500) — catch-all (not retryable from client)

### LLM (non-HTTP)

- `LLM_PARSE_FAILED` — LLM returned non-parseable content (retryable)
- `LLM_PROMPT_INJECTION_DETECTED` (400) — suspected injection (not retryable)
- `LLM_TIMEOUT` (504) — LLM took too long (retryable)

### Workflow

- `WORKFLOW_STEP_FAILED` — generic step failure
- `WORKFLOW_TIMEOUT` — step exceeded timeout

Adding new codes: PR modifies `codes.ts` and `messages.ts`. Build fails if they're out of sync (one code without a user-facing message).

---

## Quick reference

| Need                     | Pattern                                            |
| ------------------------ | -------------------------------------------------- |
| Throw a domain error     | `throwError('CODE', { context: {...} })`           |
| Wrap an external error   | `throwError('CODE', { cause: e, context: {...} })` |
| Catch specific error     | `if (e instanceof GaiaError && e.code === 'X')`    |
| Get HTTP status          | Automatic via `onError` middleware                 |
| Client-facing message    | Automatic via `userFacingMessage()`                |
| Retry decision (Inngest) | `e.retryable` (automatic)                          |
| Parse LLM response       | `parseLLMResponse()` returns `Result<T, E>`        |
| Catch boundary in UI     | `<ErrorBoundary fallback={...}>`                   |
| Redaction in logs        | Automatic via logger                               |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Frontend patterns: `docs/reference/frontend.md`
- Testing patterns: `docs/reference/testing.md`
- Security patterns: `docs/reference/security.md`
- Observability patterns: `docs/reference/observability.md`

_This file is versioned. Changes that contradict `code.md` require an ADR._
