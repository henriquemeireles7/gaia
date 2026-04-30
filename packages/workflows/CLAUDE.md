# Workflows — iii (Function + Trigger primitives)

> Status: Reference
> Last verified: April 2026
> Scope: All durable, retryable, time-aware orchestration. Implementation home: `packages/workflows/`. Worker entry mounted from `apps/api/server/`.

---

## What this file is

The patterns for workflow orchestration in Gaia. These implement vision §Architecture-10 (workflow orchestration is a platform primitive) using **iii** (`iii-sdk`) — the successor to Motia, made by Motia LLC.

`packages/workflows/` exposes the registered worker, a typed `iii` client, and the registry of all functions. Features compose by `iii.trigger(...)` against function IDs; the iii engine handles durability, retries, and queueing.

Read `code.md` first.

> **Migration note:** Gaia previously used Inngest. The CLAUDE.md still applies even before all code lands — feature code follows the patterns below; the actual swap of the npm package and registry is tracked separately.

---

## How iii is shaped (the three primitives)

iii has three primitives — and that's all:

1. **Worker** — a process that connects to the iii engine over WebSocket. `registerWorker(url, opts)` returns the `iii` handle.
2. **Function** — a unit of work. `iii.registerFunction(id, handler)` returns a ref. IDs use `domain::action` namespacing (e.g. `email::send`, `billing::sync-subscription`).
3. **Trigger** — what fires a function. `iii.registerTrigger({ type, function_id, config })` for HTTP/cron; `iii.trigger({ function_id, payload, action })` for direct invocation.

There is **no** `step.run()`, `step.sleep()`, or `step.waitForEvent()` — that's the structural difference from Inngest. Workflows compose by emitting events between Functions and letting durability live in the queue layer.

iii has no documented `NonRetriableError` analog — retries are queue-level, not function-level. See pattern #6 for the workaround.

The engine itself is a Rust binary (`iii`) you self-host. Workers connect to it (default `ws://localhost:49134`).

---

## The 10 workflow patterns

### 1. One client, registered at module load

`packages/workflows/index.ts` registers the worker once and exports `iii` and `logger`. Everything else in this package and in feature code imports from there.

**Pattern:**

```ts
// packages/workflows/index.ts
import { Logger, registerWorker } from 'iii-sdk'
import { env } from '@gaia/config'

export const iii = registerWorker(env.III_URL ?? 'ws://localhost:49134', {
  workerName: 'gaia-api-worker',
})

export const logger = new Logger()

// Function refs and registry below; see pattern #2.
```

**Anti-pattern:**

```ts
// ❌ Per-call registration
async function sendWelcome() {
  const iii = registerWorker(env.III_URL, { workerName: 'tmp' }) // leaks workers
  // ...
}

// ❌ Multiple worker handles
export const apiWorker = registerWorker(...)
export const webhookWorker = registerWorker(...) // pick one — split into two services if needed
```

**Enforcement:**

- Lint rule — `registerWorker(...)` may appear only in `packages/workflows/index.ts`.
- Boot test — `apps/api/server/` boots cleanly with the worker connected; failure causes a startup error, not a silent skip.

---

### 2. Function IDs use `domain::action` namespacing

iii routes calls by string ID. A flat name space gets crowded fast; double-colon namespacing scales and matches the iii docs convention (`iii::durable::publish`, `state::set`).

**Pattern:**

```ts
// packages/workflows/email.ts
import { iii } from './index'
import { sendEmail } from '@gaia/adapters/email'

export const sendWelcomeRef = iii.registerFunction('email::send-welcome', async ({ payload }) => {
  const { email } = payload as { email: string }
  await sendEmail(email, {
    subject: 'Welcome to Gaia',
    html: `<p>Welcome aboard. You're ready to ship.</p>`,
  })
  return { sent: email }
})
```

Naming convention: `<domain>::<action>[-<modifier>]` — `email::send-welcome`, `billing::sync-subscription`, `auth::reset-password-link`.

**Anti-pattern:**

```ts
// ❌ Flat name
iii.registerFunction('sendWelcome', ...)

// ❌ Conflicting / unparseable
iii.registerFunction('send_welcome_v2_FINAL', ...)
```

**Enforcement:**

- Lint rule — first arg of `iii.registerFunction` must match `/^[a-z][a-z0-9-]*(::[a-z][a-z0-9-]*)+$/`.
- The function-ID registry in `packages/workflows/index.ts` is the canonical list; PR review flags duplicates.

---

### 3. Functions are idempotent — retries never corrupt state

iii retries on failure (per queue config — see #5). A non-idempotent function will charge the card twice, send the email twice, decrement inventory twice. Idempotency is the contract.

**Pattern (write-side guard via `webhook_events` / dedicated idempotency key):**

```ts
import { iii } from './index'
import { db } from '@gaia/db'
import { webhookEvents } from '@gaia/db/schema'
import { sendEmail } from '@gaia/adapters/email'

export const billingChargeRef = iii.registerFunction(
  'billing::charge-customer',
  async ({ payload }) => {
    const { idempotencyKey, customerId, amount } = payload as {
      idempotencyKey: string
      customerId: string
      amount: number
    }

    // Insert returns rows; on conflict, returns nothing — first run wins.
    const inserted = await db
      .insert(webhookEvents)
      .values({
        provider: 'billing',
        externalEventId: idempotencyKey,
        eventType: 'billing.charge',
      })
      .onConflictDoNothing()
      .returning()

    if (inserted.length === 0) {
      return { skipped: 'duplicate', idempotencyKey }
    }

    await processCharge(customerId, amount) // safe to call exactly once now
    return { charged: customerId, amount }
  },
)
```

iii has no first-class `idempotencyKey` parameter on `trigger()`. Pass one in the payload and dedupe at the storage layer.

**Anti-pattern:**

```ts
// ❌ No dedupe — retry double-charges
export const ref = iii.registerFunction('billing::charge', async ({ payload }) => {
  await processCharge(payload.customerId, payload.amount)
})

// ❌ Side effect before the guard
await processCharge(...)
await db.insert(webhookEvents).values(...).onConflictDoNothing()
```

**Enforcement:**

- Code review flag — every function in `packages/workflows/` either documents idempotency in its JSDoc OR has a deduplication guard at its entry.
- Integration test — invoke the function twice with the same `idempotencyKey`; assert side effect fired exactly once.

---

### 4. Triggers register at module load, alongside the function

iii's `registerTrigger` declares how a function fires (HTTP, cron, queue). Co-locate the trigger with the function so the wiring lives in one place.

**Pattern (HTTP trigger):**

```ts
// packages/workflows/health.ts
import { iii } from './index'

const ref = iii.registerFunction('health::check', async () => {
  return { status_code: 200, body: { ok: true } }
})

iii.registerTrigger({
  type: 'http',
  function_id: ref.id,
  config: { api_path: '/health', http_method: 'GET' },
})
```

**Pattern (cron trigger):**

```ts
// packages/workflows/billing.ts
import { iii } from './index'
import { generateMonthlyReport } from './reports'

const monthlyReportRef = iii.registerFunction('billing::monthly-report', async () => {
  await generateMonthlyReport()
})

iii.registerTrigger({
  type: 'cron',
  function_id: monthlyReportRef.id,
  config: { expression: '0 0 9 1 * *' }, // 09:00 UTC, 1st of month
})
```

**Anti-pattern:**

```ts
// ❌ Trigger split from function
// packages/workflows/email.ts
const ref = iii.registerFunction('email::send-welcome', ...)

// packages/workflows/triggers.ts (separate file — drift risk)
iii.registerTrigger({ type: 'http', function_id: 'email::send-welcome', ... })
```

**Enforcement:**

- File convention — triggers live in the same file as the function they fire.
- Boot test — every registered function has at least one trigger OR is invoked via `iii.trigger(...)` in another function (verified by AST scan).

---

### 5. Retry policy is queue config, not code

Retries are per-queue, configured in `iii-config.yaml`. The function never decides "retry me five times" — the queue does. This keeps retry policy operational, not buried in code.

**Pattern:**

```yaml
# iii-config.yaml (root of repo)
queue_configs:
  email-default:
    max_retries: 3
    backoff_ms: 1000 # exponential: backoff_ms * 2^(attempt-1)
    concurrency: 10
    type: standard

  billing-critical:
    max_retries: 5
    backoff_ms: 2000
    concurrency: 2
    type: standard

  email-dlq:
    max_retries: 5
    backoff_ms: 5000
    concurrency: 1
    type: standard
```

After `max_retries`, jobs land in a DLQ with original payload + last error. Operations team monitors DLQ; failures are alertable (see `packages/core/CLAUDE.md` #7).

**Anti-pattern:**

```ts
// ❌ Manual retry in function code
async function handler({ payload }) {
  for (let i = 0; i < 3; i++) {
    try {
      return await doWork()
    } catch {
      await sleep(1000 * (i + 1))
    }
  }
  throw new Error('failed after retries')
}
```

**Enforcement:**

- Lint rule — retry loops (`for ... try/catch ... sleep`) inside `packages/workflows/` flag as warning.
- `iii-config.yaml` is the single source of retry policy; ADR required for queue config changes.

---

### 6. iii has no `NonRetriableError` — encode "fatal" via return value

Inngest exposed `NonRetriableError` to short-circuit retries on business failures. iii doesn't (yet). The Gaia idiom: throw on retryable failures, return a failure-shape payload on fatal ones.

**Pattern:**

```ts
import { iii, logger } from './index'
import { AppError } from '@gaia/errors'

export const syncSubscriptionRef = iii.registerFunction(
  'billing::sync-subscription',
  async ({ payload }) => {
    const { subscriptionId, status } = payload as { subscriptionId: string; status: string }

    try {
      await db.update(subscriptions).set({ status }).where(eq(subscriptions.id, subscriptionId))
      return { synced: subscriptionId }
    } catch (e) {
      if (e instanceof AppError && e.status >= 400 && e.status < 500) {
        // Business failure — don't retry. Return failure shape; iii will not enqueue another attempt
        // because the function returned successfully (just with a failure payload).
        logger.warn('billing.sync.fatal', { code: e.code, subscriptionId })
        return { failed: true, code: e.code, subscriptionId }
      }
      throw e // retryable — iii retries per queue config
    }
  },
)
```

Callers inspect the return shape: `{ failed: true, code }` is a fatal business error; `{ synced }` is success. iii retries are reserved for `throw` (infrastructure failures).

**Anti-pattern:**

```ts
// ❌ Always throw — iii retries even unwinnable business errors until DLQ
if (status === 'invalid') throw new Error('bad status')

// ❌ Always return — even infrastructure errors don't retry
try { await db.update(...) } catch { return { failed: true } }
```

**Enforcement:**

- Code review flag — functions that catch `AppError` and re-throw without classifying status get flagged.
- Integration test — invoke the function with a non-retryable error code (e.g. `VALIDATION_ERROR`); assert iii does not enqueue another attempt and DLQ is not used.

When `iii-sdk` ships a first-class non-retriable signal, switch to it and remove the workaround. Tracked separately.

---

### 7. Direct invocation uses `iii.trigger(...)` with explicit action

Calling another function from feature code uses `iii.trigger(...)`. The `action` parameter chooses semantics:

| Mode                   | Action                             | Returns                | Retries          |
| ---------------------- | ---------------------------------- | ---------------------- | ---------------- |
| Synchronous (RPC-like) | omit `action`                      | the function's return  | none             |
| Fire-and-forget        | `TriggerAction.Void()`             | `null`                 | none             |
| Durable (queue-backed) | `TriggerAction.Enqueue({ queue })` | `{ messageReceiptId }` | per queue config |

**Pattern:**

```ts
import { iii } from '@gaia/workflows'
import { TriggerAction } from 'iii-sdk'

// Durable enqueue — the default for cross-feature invocations
await iii.trigger({
  function_id: 'email::send-welcome',
  payload: { email: user.email, idempotencyKey: `welcome-${user.id}` },
  action: TriggerAction.Enqueue({ queue: 'email-default' }),
})

// Synchronous — only for tightly-coupled, low-latency calls inside the same request
const result = await iii.trigger({
  function_id: 'health::check',
  payload: {},
})
```

**Anti-pattern:**

```ts
// ❌ Cross-feature sync call — couples request latency to the called function
await iii.trigger({ function_id: 'billing::charge-customer', payload: { ... } })

// ❌ Fire-and-forget with side effects you actually need to land
iii.trigger({ function_id: 'audit::log-action', payload, action: TriggerAction.Void() })
// Use Enqueue if it must land; Void if it's truly best-effort.
```

**Enforcement:**

- Lint rule — `iii.trigger(...)` without an `action` argument flags as warning when called from a route handler (sync calls block the response).
- Code review — payload always includes an `idempotencyKey` for `Enqueue` calls.

---

### 8. Pubsub fan-out via `iii::durable::publish`

When one event fans out to many subscribers, use the built-in `iii::durable::publish` function instead of N `Enqueue` calls. Subscribers register against the topic.

**Pattern (publisher):**

```ts
// apps/api/server/auth.ts (signup completion)
import { iii } from '@gaia/workflows'

await iii.trigger({
  function_id: 'iii::durable::publish',
  payload: {
    topic: 'user.created',
    data: { userId: user.id, email: user.email, idempotencyKey: `user-created-${user.id}` },
  },
})
```

**Pattern (subscriber):**

```ts
// packages/workflows/auth.ts
const welcomeRef = iii.registerFunction('email::send-welcome', async ({ payload }) => { ... })

iii.registerTrigger({
  type: 'pubsub',
  function_id: welcomeRef.id,
  config: { topic: 'user.created' },
})
```

Adding a new subscriber (e.g. analytics, audit) doesn't touch the publisher — register the trigger, ship.

**Anti-pattern:**

```ts
// ❌ Hardcoded fan-out
await iii.trigger({ function_id: 'email::send-welcome', payload: data, action: ... })
await iii.trigger({ function_id: 'analytics::track-signup', payload: data, action: ... })
await iii.trigger({ function_id: 'audit::log-signup', payload: data, action: ... })
// New subscriber = publisher edit = coupling.
```

**Enforcement:**

- Code review — > 2 sequential `iii.trigger` calls with the same payload triggers a "use pubsub" suggestion.
- Topic registry in `packages/workflows/topics.ts` documents every topic + schema.

---

### 9. Every step is a span

Workflow steps cross a process boundary (worker ↔ engine) and a temporal boundary (deferred execution). They're prime span territory. Each function wraps its body in a span with `iii.queue` and `iii.attempt` attributes.

**Pattern:**

```ts
// packages/workflows/billing.ts
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { iii } from './index'

const tracer = trace.getTracer('gaia-workflows')

const ref = iii.registerFunction('billing::sync-subscription', async ({ payload, attempt }) => {
  return tracer.startActiveSpan('iii.billing::sync-subscription', async (span) => {
    span.setAttribute('iii.queue', 'billing-critical')
    span.setAttribute('iii.attempt', attempt ?? 1)
    try {
      // ... function body
      span.setStatus({ code: SpanStatusCode.OK })
    } catch (e) {
      span.recordException(e as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
    } finally {
      span.end()
    }
  })
})
```

See `packages/core/CLAUDE.md` #5 for the full span boundary table (workflow steps row).

**Anti-pattern:**

```ts
// ❌ No span — workflow step invisible in the distributed trace
const ref = iii.registerFunction('billing::sync', async () => {
  /* ... */
})
```

**Enforcement:**

- Lint rule — every function body in `packages/workflows/` calls `tracer.startActiveSpan` or delegates to a span-wrapped helper.
- Integration test — trigger a function; assert the trace in Sentry has an `iii.<function_id>` span.

---

### 10. Production bundling — esbuild, not source

iii workers bundle for production. Local dev uses `bun run --watch`. Deploys use `esbuild` to produce a single-file worker that the iii engine connects to.

**Pattern:**

```ts
// esbuild.config.ts (root)
import { build } from 'esbuild'

await build({
  entryPoints: ['apps/api/server/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/main.js',
  format: 'esm',
  external: ['better-sqlite3'], // any native deps
})
```

```sh
# Local
bun run --watch apps/api/server/main.ts

# Production build
bun run esbuild.config.ts
```

The iii engine binary is installed via `curl -fsSL install.sh | sh` and run as a separate process (Railway service or local daemon). Workers connect over `ws://`.

**Anti-pattern:**

```ts
// ❌ Shipping unbundled source
// CMD ["bun", "run", "src/main.ts"] — large image, slow cold start
```

**Enforcement:**

- Dockerfile uses `bun run esbuild.config.ts` and copies only `dist/main.js` + `iii-config.yaml`.
- CI smoke test — a freshly bundled worker connects to the engine and processes one request.

---

## Local development

Two options:

**Option A — Docker (parity with production):**

```sh
docker compose up -d        # postgres + iii engine
bun run dev                 # API worker connects to ws://localhost:49134
```

**Option B — Native binary:**

```sh
curl -fsSL https://iii.dev/install.sh | sh
iii start --config iii-config.yaml
bun run --watch apps/api/server/main.ts
```

The worker auto-registers all functions and triggers at boot.

## Production (Railway)

The engine runs as a **separate Railway service** alongside `gaia-api`. Build context: `infra/iii/Dockerfile`. The API's `III_URL` resolves to the engine via Railway private DNS — no public exposure. Full setup in `infra/iii/README.md`.

---

## Function inventory

The single registry lives in `packages/workflows/index.ts`. Each entry imports the function module so its `registerFunction` and `registerTrigger` calls run at boot.

```ts
// packages/workflows/index.ts (sketch)
import './email' // email::*
import './billing' // billing::*
import './auth' // auth::*
import './audit' // audit::*
import './reports' // reports::*
```

Adding a new workflow:

1. Create `packages/workflows/<domain>.ts`.
2. `iii.registerFunction(...)` + `iii.registerTrigger(...)`.
3. Import the file from `index.ts` so it loads at boot.
4. Add tests next to the source (`<domain>.test.ts`).

---

## Quick reference

| Need                                   | Pattern                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Register a function                    | `iii.registerFunction('domain::action', async ({ payload, attempt }) => { ... })` |
| HTTP trigger                           | `iii.registerTrigger({ type: 'http', function_id, config: { api_path } })`        |
| Cron trigger                           | `iii.registerTrigger({ type: 'cron', function_id, config: { expression } })`      |
| Pubsub subscriber                      | `iii.registerTrigger({ type: 'pubsub', function_id, config: { topic } })`         |
| Sync invoke                            | `await iii.trigger({ function_id, payload })`                                     |
| Fire-and-forget                        | `iii.trigger({ function_id, payload, action: TriggerAction.Void() })`             |
| Durable enqueue                        | `iii.trigger({ function_id, payload, action: TriggerAction.Enqueue({ queue }) })` |
| Publish to a topic                     | `iii.trigger({ function_id: 'iii::durable::publish', payload: { topic, data } })` |
| Mark a business error as fatal         | Return `{ failed: true, code }`; do not throw                                     |
| Mark an infrastructure error retryable | Throw — iii retries per queue config                                              |
| Span a step                            | `tracer.startActiveSpan('iii.<id>', async (span) => { ... })`                     |

---

## Cross-references

- iii docs: `https://iii.dev/docs/`
- Code principles: `.claude/skills/d-code/reference.md`
- Errors / retry classification: `packages/errors/CLAUDE.md` (#7 retryable)
- Observability: `packages/core/CLAUDE.md` (#5 spans, queue attributes)
- Adapters: `packages/adapters/CLAUDE.md` (#9 adapters never retry — that's iii's job)
- Backend integration: `apps/api/CLAUDE.md`
- Vision: `.gaia/vision.md` §Architecture-10 (workflow orchestration)

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| index.ts | iii, logger, sendWelcomeRef, functions |

<!-- Generated: 2026-04-30T04:29:01.874Z -->
