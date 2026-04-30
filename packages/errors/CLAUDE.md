# Errors — Named Codes, Structured Context, Observability

> Status: Reference
> Last verified: April 2026
> Scope: All error handling across the monorepo — backend, frontend, workflows, CLI

---

## What this file is

The error handling patterns for Gaia. These implement principle #3 of `code.md` (named errors, no swallowing) in concrete detail across `packages/errors/` and every caller.

Read `code.md` first. This file is the concrete _how_.

**Key context:** Gaia has one error catalog. Every error thrown anywhere in the codebase refers to a named code from `packages/errors/index.ts`. There are no ad-hoc `throw new Error('user not found')` calls. The catalog is the contract between code and observability.

---

## The 10 error patterns

### 1. Throw is the default; Result is a specific seam

TypeScript offers two styles: throw exceptions, or return `Result<T, E>`. Mixing them is confusing. Gaia picks:

- **Throw** for domain errors in services, routes, adapters — the common case
- **Result<T, E>** reserved for specific seams where partial success matters:
  - LLM response parsing (the response may be valid or malformed — not exceptional)
  - iii workflow steps (retry decision depends on error type)
  - External API clients where the caller must inspect error shape

**Pattern (throw — default):**

```ts
import { AppError } from '@gaia/errors'

export async function getUser(id: string, tenantId: string) {
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
  })
  if (!user) throw new AppError('USER_NOT_FOUND', `id=${id}`)
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
    if (!Value.Check(PlanSchema, parsed)) return err('LLM_PARSE_FAILED', { raw })
    return ok(parsed as ParsedPlan)
  } catch {
    return err('LLM_PARSE_FAILED', { raw })
  }
}

// Caller must handle both cases — TypeScript enforces it
const result = await parseLLMResponse(response.text)
if (!result.ok) {
  logger.warn('llm.parse.failed', { reason: result.error })
  return fallbackPlan()
}
return result.value
```

**Enforcement:** Oxlint rule — `Result<T, E>` types appear only in `packages/adapters/ai.ts`, `packages/workflows/`, and adapter files calling external APIs. Everywhere else uses throw.

---

### 2. Single catalog, typed codes

All error codes live in `packages/errors/index.ts`. The catalog is a `const` object, not a string union — TypeScript derives the type from the keys. Typos fail at build.

**Structure:**

```ts
// packages/errors/index.ts
export const errors = {
  // Auth (401 / 403)
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
  SESSION_EXPIRED: { status: 401, code: 'SESSION_EXPIRED', message: 'Session expired' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },

  // Validation / not found (4xx)
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  USER_NOT_FOUND: { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' },
  CONFLICT: { status: 409, code: 'CONFLICT', message: 'Conflict with current state' },
  ALREADY_EXISTS: { status: 409, code: 'ALREADY_EXISTS', message: 'Resource already exists' },

  // Rate limit / quota (429)
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', message: 'Too many requests' },

  // Server errors (5xx)
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
  },
} as const

export type ErrorCode = keyof typeof errors
```

Adding a new error = adding a key to `errors`. No other file changes needed.

**Enforcement:** Oxlint rule bans `throw new Error(...)` in feature, service, or adapter code. Error code strings passed to `AppError` are checked against the catalog at build time (TypeScript narrows the literal type).

---

### 3. Every error carries structured context

Errors are data. A `message` string is insufficient. Every error carries the inputs that led to the failure, an optional `cause` (the underlying error), and a `traceId` for correlation.

**Pattern:**

```ts
// packages/errors/index.ts
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: string
  readonly context: Record<string, unknown>
  readonly traceId: string

  constructor(
    code: ErrorCode,
    opts?: {
      details?: string
      context?: Record<string, unknown>
      cause?: unknown
      traceId?: string
    },
  ) {
    const entry = errors[code]
    super(entry.message)
    this.name = 'AppError'
    this.code = code
    this.status = entry.status
    this.details = opts?.details
    this.context = opts?.context ?? {}
    this.traceId = opts?.traceId ?? getCurrentTraceId() // from OTel context
    if (opts?.cause) (this as { cause?: unknown }).cause = opts.cause
  }
}
```

Every throw captures: **code** (what), **context** (inputs), **cause** (underlying error), **traceId** (correlation).

**Usage:**

```ts
try {
  await polar.checkouts.create({ ... })
} catch (cause) {
  throw new AppError('SERVICE_UNAVAILABLE', {
    context: { service: 'polar', operation: 'createCheckout', customerEmail },
    cause,
  })
}
```

The original Polar error is preserved in `cause`; the agent-facing error is the named code with context.

---

### 4. One code → one HTTP status, in a single table

The HTTP status for every error lives in `errors`. No ad-hoc status codes in routes. The Elysia global error handler maps `AppError.code → status` using the catalog.

**Elysia integration:**

```ts
// apps/api/server/app.ts
import { Elysia } from 'elysia'
import { AppError, errors } from '@gaia/errors'
import { getLogger, Sentry } from '@gaia/core'
import { env } from '@gaia/config'

export const errorHandler = new Elysia({ name: 'errors' }).onError(({ error, set, request }) => {
  const log = getLogger()
  if (error instanceof AppError) {
    set.status = error.status
    log.warn(error.code, {
      traceId: error.traceId,
      context: error.context,
      path: new URL(request.url).pathname,
    })
    if (error.status >= 500) Sentry.captureException(error)
    return {
      ok: false,
      code: error.code,
      message: errors[error.code].message,
      traceId: error.traceId,
      ...(env.NODE_ENV === 'development' && error.details ? { details: error.details } : {}),
    }
  }

  // Unknown error — wrap, never expose
  const wrapped = new AppError('INTERNAL_ERROR', { cause: error })
  set.status = 500
  Sentry.captureException(wrapped)
  log.error('INTERNAL_ERROR', { traceId: wrapped.traceId, cause: String(error) })
  return {
    ok: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    traceId: wrapped.traceId,
  }
})
```

**Enforcement:** GritQL rule — Elysia routes that call `set.status = ...` outside `onError` fail lint. Use `throw new AppError(...)`.

---

### 5. Three message layers: developer, user, detail

Errors speak to three audiences:

| Layer                    | Audience     | Example                                                                       |
| ------------------------ | ------------ | ----------------------------------------------------------------------------- |
| **Developer message**    | Logs, Sentry | `"db.users.findFirst returned no row for id=xyz, tenantId=abc"`               |
| **User-facing message**  | UI           | `"We couldn't find that user."`                                               |
| **Detail** (context obj) | Debugging    | `{ userId: 'xyz', tenantId: 'abc', lookupSource: 'billing.getSubscription' }` |

The catalog's `message` is the user-facing default. Developer detail goes in `context`. Override the user-facing message only when the specific situation calls for it.

```ts
throw new AppError('VALIDATION_ERROR', {
  details: 'Password must include at least one number.',
  context: { field: 'password', length: input.length },
})
```

`messages.ts` is the layer that gets i18n-translated later. Developer messages live in logs with full context.

---

### 6. Auth errors are uniform — never reveal account existence

"User not found" vs. "Wrong password" tells an attacker whether an email is registered. This enables account enumeration. All auth failures return the same code to the client; only the logs distinguish.

**Pattern:**

```ts
// ❌ Wrong: reveals account existence
async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) throw new AppError('USER_NOT_FOUND') // leaks
  if (!(await verifyPassword(password, user.passwordHash))) throw new AppError('WRONG_PASSWORD') // leaks
  return user
}

// ✅ Correct: uniform to the client; differentiated in logs
async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    log.info('auth.login.failed', { reason: 'user_not_found', email })
    throw new AppError('UNAUTHORIZED', { context: { reason: 'user_not_found' } })
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    log.info('auth.login.failed', { reason: 'wrong_password', userId: user.id })
    throw new AppError('UNAUTHORIZED', { context: { reason: 'wrong_password' } })
  }
  return user
}
```

Same client response. Different log entries. Attackers see one error; security team sees the details.

**Enforcement:** Security review — any new auth-adjacent error code that differentiates between "user" and "credential" failure is flagged. See also `packages/security/CLAUDE.md` principle 1 (uniform auth errors).

---

### 7. Retryable signal drives iii and client behavior

Infrastructure errors (timeout, service down) are retryable. Business errors (conflict, validation, not found) are not. iii workflow steps and client retry logic both read this signal.

The current catalog encodes retryability via HTTP status (5xx retryable, 4xx not). When an error needs an explicit retryable hint that diverges from status, add it to the catalog entry:

```ts
RATE_LIMITED:    { status: 429, code: 'RATE_LIMITED',    message: 'Too many requests',         retryable: true },
QUOTA_EXCEEDED:  { status: 429, code: 'QUOTA_EXCEEDED',  message: 'Plan limit reached',        retryable: false },
```

**Pattern (iii step):**

```ts
// packages/workflows/billing.ts
import { iii, logger } from './client'
import { AppError } from '@gaia/errors'

const ref = iii.registerFunction('billing.sync-subscription', async ({ payload }) => {
  try {
    await db
      .update(subscriptions)
      .set({ status: payload.status })
      .where(eq(subscriptions.id, payload.subscriptionId))
  } catch (e) {
    if (e instanceof AppError && e.status >= 400 && e.status < 500) {
      // Business error — fail fast, don't retry. iii treats non-retryable
      // failures by surfacing the error from the function and skipping the
      // retry queue.
      logger.warn('billing.sync.fatal', { code: e.code })
      return { failed: true, code: e.code } // shape your DLQ payload
    }
    throw e // iii retries per queue config
  }
})
```

iii has no `NonRetriableError` class today (see `packages/workflows/CLAUDE.md`); the workaround is returning a failure-shape payload for business errors and only `throw` for retryable ones.

---

### 8. No bare `catch` — every catch has a purpose

A bare `catch (e)` without handling is a bug. Rules for catch blocks:

1. **Handle specific errors** — check type, act, done.
2. **Wrap + rethrow** — convert unknown errors to named errors.
3. **Never swallow** — a `catch` that just logs and continues is forbidden.

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
try {
  await sendEmail(user.email, template)
} catch (e) {
  if (e instanceof AppError && e.code === 'SERVICE_UNAVAILABLE') {
    await iii.trigger({
      function_id: 'email.retry',
      payload: { userId: user.id, template },
      action: TriggerAction.Enqueue({ queue: 'email-dlq' }),
    })
    return
  }
  throw e // unknown — propagate
}
```

**Pattern (wrap + rethrow):**

```ts
try {
  return await polar.subscriptions.get(subscriptionId)
} catch (cause) {
  throw new AppError('SERVICE_UNAVAILABLE', {
    context: { service: 'polar', subscriptionId },
    cause,
  })
}
```

**Enforcement:** Oxlint rule — `catch (e) {}` (empty body) fails lint. Catch blocks that only log without re-throwing, handling, or wrapping trigger `/w-review` flag.

---

### 9. Errors never leak secrets or PII

The error response to the client strips context in production. Logs redact known sensitive fields. See `packages/core/CLAUDE.md` principle 3 (redact at emit time) for the shared redaction rules.

**Applied here:**

```ts
// In the onError middleware (principle #4 above):
return {
  ok: false,
  code: error.code,
  message: errors[error.code].message,
  traceId: error.traceId,
  // context is NEVER included in production responses
  ...(env.NODE_ENV === 'development' && error.details ? { details: error.details } : {}),
}
```

Logger and Sentry `beforeSend` apply `redact()` from `packages/core/`. Same redaction in three places means a single failure doesn't leak.

**Enforcement:** Security test — request with `Authorization: Bearer xyz`, trigger an error, assert `xyz` does not appear in Axiom log, Sentry event, or HTTP response body.

---

### 10. Every error crosses an observability boundary

Errors are not silent. The global error handler ensures:

- **All errors** emit a structured log to Axiom (with traceId, context, severity).
- **5xx** capture to Sentry with full context and stack.
- **User-visible errors** emit a PostHog event (so product can see "users hit VALIDATION_ERROR on the billing form" without reading logs).

This happens automatically in the `onError` handler. No per-route logging code. No `console.error` scattered through features.

**Frontend errors:**

```tsx
// apps/web/src/lib/error-boundary.tsx
import { ErrorBoundary } from 'solid-js'
import { Sentry } from '@/lib/sentry'

export function AppErrorBoundary(props: { children: any }) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => {
        Sentry.captureException(err)
        return <ErrorFallback error={err} onReset={reset} />
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
```

Solid's `ErrorBoundary` catches component render errors. Resource errors caught by `createAsync` + Suspense's error slot. All paths log to Sentry with user context.

---

## Error code catalog — starter set

Ships with Gaia v1 (`packages/errors/index.ts`):

### Auth (4xx)

- `UNAUTHORIZED` (401) — no session OR uniform login failure
- `SESSION_EXPIRED` (401) — token expired
- `FORBIDDEN` (403) — authenticated but not authorized

### Validation (4xx)

- `VALIDATION_ERROR` (400) — TypeBox schema rejected
- `INVALID_REQUEST` (400) — malformed but not validatable

### Resources (4xx)

- `NOT_FOUND` (404) — generic
- `USER_NOT_FOUND` (404) — typed specific
- `CONFLICT` (409) — unique violation
- `ALREADY_EXISTS` (409) — duplicate create

### Payments (4xx)

- `PAYMENT_FAILED` (402)
- `SUBSCRIPTION_NOT_FOUND` (404)
- `SUBSCRIPTION_REQUIRED` (403)

### Rate / quota (429)

- `RATE_LIMITED` (429) — IP or user over limit (retryable)

### Server (5xx)

- `INTERNAL_ERROR` (500) — catch-all (not retryable from client)
- `SERVICE_UNAVAILABLE` (503) — Polar, Resend, Axiom (retryable)

Adding new codes: PR modifies `index.ts`. Build fails if `ErrorCode` type usage references a missing key.

---

## Quick reference

| Need                   | Pattern                                             |
| ---------------------- | --------------------------------------------------- |
| Throw a domain error   | `throw new AppError('CODE', { context })`           |
| Wrap an external error | `throw new AppError('CODE', { cause: e, context })` |
| Catch specific error   | `if (e instanceof AppError && e.code === 'X')`      |
| Get HTTP status        | Automatic via `onError` middleware                  |
| Client-facing message  | Automatic via `errors[code].message`                |
| Retry decision (iii)   | Status >= 500, or explicit `retryable` flag         |
| Parse LLM response     | `parseLLMResponse()` returns `Result<T, E>`         |
| Catch boundary in UI   | `<ErrorBoundary fallback={...}>`                    |
| Redaction in logs      | Automatic via `getLogger()` from `packages/core`    |

---

## Cross-references

- Code principles: `.claude/skills/w-code/reference.md`
- Backend patterns: `apps/api/CLAUDE.md`
- Frontend patterns: `apps/web/CLAUDE.md`
- Observability: `packages/core/CLAUDE.md`
- Security uniform-error rules: `packages/security/CLAUDE.md`
- Workflow retry behavior: `packages/workflows/CLAUDE.md`
