# Observability — OpenTelemetry + Sentry + Axiom + PostHog

> Status: Reference
> Last verified: April 2026
> Scope: All code that emits telemetry — which is all code. Implementation home: `packages/core/` (logger + observability init).

---

## What this file is

The patterns for how Gaia sees itself in production. These implement principles #3, #8, and #9 from `code.md` (named errors, every boundary emits observability, security opinionated) with concrete wiring for the four tools Gaia uses:

- **OpenTelemetry (OTel)** — the instrumentation layer (vendor-neutral)
- **Sentry** — errors + distributed tracing (via OTLP)
- **Axiom** — structured logs (JSON events, SQL query)
- **PostHog** — product analytics + LLM observability + session replay

`packages/core/` exposes `initObservability(env)` (Sentry + Axiom init at boot) and `getLogger()` (structured logger). Everything else lives at the call site.

Read `code.md` first. This file is the concrete _how_.

**Key terms used precisely:**

| Term              | Meaning                                                            | Primary tool                    |
| ----------------- | ------------------------------------------------------------------ | ------------------------------- |
| **Observability** | Understanding _why_ something happened — traces, structured events | OTel → Sentry + Axiom           |
| **Monitoring**    | Watching _what is happening_ — metrics, alerts, SLOs, uptime       | Sentry + Better Stack + PostHog |
| **Logging**       | Recording _events_ — structured log lines                          | Axiom                           |

Each has different cost, retention, and audience. A log is not a metric is not a trace.

---

## The 12 observability patterns

Three universal (apply everywhere), three observability, three monitoring, three logging.

---

## Universal

### 1. Trace ID is the universal correlator

Every log entry, trace span, metric sample, and Sentry error carries the **same** `trace_id` from the current OpenTelemetry context. Without correlation, three tools become three separate pains.

**Pattern:**

```ts
// packages/core/observability.ts (extended)
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { trace } from '@opentelemetry/api'

export function startOtel(env: {
  APP_VERSION: string
  NODE_ENV: string
  SENTRY_OTLP_ENDPOINT?: string
  SENTRY_PUBLIC_KEY?: string
}) {
  if (!env.SENTRY_OTLP_ENDPOINT) return // graceful degradation
  const sdk = new NodeSDK({
    resource: new Resource({
      'service.name': 'gaia-api',
      'service.version': env.APP_VERSION,
      'deployment.environment': env.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: env.SENTRY_OTLP_ENDPOINT,
      headers: { 'x-sentry-auth': `sentry sentry_key=${env.SENTRY_PUBLIC_KEY}` },
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  })
  sdk.start()
}

export function getCurrentTraceId(): string {
  const span = trace.getActiveSpan()
  const ctx = span?.spanContext()
  return ctx?.traceId ?? crypto.randomUUID() // fallback for edge cases
}
```

The Axiom log adapter reads `getCurrentTraceId()` on every call; Sentry reads it from the active span automatically; PostHog events include it as a super property.

**Anti-pattern:**

```ts
// ❌ Three separate correlation IDs
log.info('user login', { logCorrelationId: uuid() })
Sentry.setTag('request_id', requestId)
posthog.capture('user_login', { sessionId: crypto.randomUUID() })
// Impossible to join across the three systems
```

**Enforcement:**

- Axiom adapter sets `trace_id` automatically from OTel context.
- Sentry uses the active span's trace ID via the OTel integration.
- PostHog super properties include `$trace_id` set on request start.
- Lint rule: `log.info/warn/error/critical(...)` cannot accept a custom `trace_id` in the context object.

---

### 2. Structured JSON or it's not a log

Free-text logs are unqueryable at scale. Every log, every event, every span attribute is JSON-serializable key-value data. `console.log` is banned outside local dev scripts.

**Pattern:**

```ts
// ✅ Structured
log.info('user.login.succeeded', {
  userId: user.id,
  method: 'password',
  durationMs: Date.now() - start,
})

// Emitted as:
// {
//   "timestamp": "2026-04-19T18:23:45.123Z",
//   "level": "info",
//   "service": "gaia-api",
//   "event": "user.login.succeeded",
//   "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
//   "userId": "usr_abc123",
//   "method": "password",
//   "durationMs": 42
// }
```

**Anti-pattern:**

```ts
// ❌ Unstructured string
console.log(`User ${user.id} logged in via ${method} in ${Date.now() - start}ms`)

// ❌ JSON-ish but unparseable in aggregation
log.info(`User login: ${JSON.stringify({ userId, method })}`)
```

**Enforcement:**

- Oxlint rule — `console.log/.warn/.error` fails lint outside `scripts/` and `tools/`.
- Logger's first argument must be a string literal `event` name (snake*case) matching `/^[a-z]a-z0-9*.]+$/`.
- Second argument must be a plain object (no strings, no arrays at top level).

---

### 3. Redact at emit time — never trust downstream

Sensitive data never leaves the process unredacted. The logger, span processor, and Sentry `beforeSend` all apply the same redaction. If one fails, the others catch it.

**Pattern:**

```ts
// packages/core/redact.ts
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'token',
  'api_key',
  'apikey',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'bearer',
  'refresh_token',
  'access_token',
  'private_key',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
  'social_security',
  'dob',
  'date_of_birth',
]

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 8) return '[DEPTH_LIMIT]'
  if (input === null || input === undefined) return input
  if (typeof input === 'string') {
    if (/^(sk|pk|rk|polar|whsec|bearer)_[a-zA-Z0-9_-]{16,}$/.test(input)) return '[REDACTED]'
    return input
  }
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1))
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) {
      out[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
        ? '[REDACTED]'
        : redact(v, depth + 1)
    }
    return out
  }
  return input
}
```

Applied in three places:

```ts
// Logger
log.info('event', redact(context))

// OTel span processor
class RedactingSpanProcessor implements SpanProcessor {
  onEnd(span: ReadableSpan) {
    span.attributes = redact(span.attributes) as Attributes
    return this.inner.onEnd(span)
  }
}

// Sentry
Sentry.init({
  beforeSend(event) {
    event.extra = redact(event.extra) as never
    event.contexts = redact(event.contexts) as never
    return event
  },
})
```

**Anti-pattern:**

```ts
// ❌ Relying on downstream redaction
log.info('request', { body: req.body }) // body contains password; hope Axiom handles it

// ❌ Partial redaction
log.info('auth', { token: token.substring(0, 4) + '***' }) // enough for some attacks
```

**Enforcement:**

- Test: request with header `Authorization: Bearer test-secret-xyz`, trigger an error path, assert `test-secret-xyz` does not appear in Axiom log, Sentry event, or PostHog event.
- New keys added to `SENSITIVE_KEYS` require PR review (the list is intentionally growing).

---

## Observability — understanding WHY

### 4. OpenTelemetry is the only instrumentation layer

Code calls OTel APIs, never vendor SDKs directly. Exporters (OTLP) ship to Sentry for traces/errors and Axiom for logs. Swapping backends is a config change, not a refactor.

**Pattern:**

```ts
// ✅ OTel — vendor-neutral
import { trace, SpanStatusCode } from '@opentelemetry/api'

const tracer = trace.getTracer('gaia-api')

export async function createUser(input: CreateUserInput) {
  return tracer.startActiveSpan('users.create', async (span) => {
    span.setAttribute('user.email_domain', input.email.split('@')[1])
    try {
      const user = await db.insert(users).values(input).returning()
      span.setStatus({ code: SpanStatusCode.OK })
      return user
    } catch (e) {
      span.recordException(e as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
    } finally {
      span.end()
    }
  })
}
```

**Anti-pattern:**

```ts
// ❌ Vendor-specific
import * as Sentry from '@sentry/node'
Sentry.startSpan({ name: 'users.create' }, async () => {
  /* ... */
})
```

Sentry-specific code locks Gaia to Sentry. OTel works with any OTLP-compatible backend.

**Sentry's role:** receives OTLP traces and adds error grouping, release health, and session replay on top. Use `@sentry/node` only for those features — never for instrumentation.

**Enforcement:**

- Lint rule: `import * as Sentry from '@sentry/...'` is allowed only in `packages/core/observability.ts`.
- Application code imports `@opentelemetry/api` and the `getLogger()` wrapper.

---

### 5. Span every cross-boundary call

Boundaries hide latency and host errors. Every cross-boundary call gets a span with semantic attributes following OTel conventions.

| Boundary       | Span name                | Key attributes                                                       |
| -------------- | ------------------------ | -------------------------------------------------------------------- |
| HTTP route     | `{METHOD} {route}`       | `http.method`, `http.status_code`, `http.route`                      |
| DB query       | `db.{operation} {table}` | `db.system`, `db.statement`, `db.rows_affected`                      |
| Adapter call   | `adapter.{svc}.{op}`     | `adapter.name`, `adapter.timeout_ms`                                 |
| LLM call       | `llm.{provider}.{model}` | `llm.model`, `llm.tokens.input`, `llm.tokens.output`, `llm.cost_usd` |
| Workflow step  | `iii.{function_id}`      | `iii.queue`, `iii.attempt`                                           |
| Outbound HTTP  | `http.client {host}`     | `http.url`, `http.status_code`, `http.response_size`                 |
| Cache hit/miss | `cache.{operation}`      | `cache.hit`, `cache.key_pattern`                                     |

**Pattern (Drizzle wrapper with spans):**

```ts
// packages/db/observe.ts
export function observeQuery<T>(
  queryName: string,
  query: () => Promise<T>,
  attrs: Record<string, string | number> = {},
): Promise<T> {
  return tracer.startActiveSpan(`db.${queryName}`, async (span) => {
    span.setAttribute('db.system', 'postgresql')
    for (const [k, v] of Object.entries(attrs)) span.setAttribute(k, v)
    try {
      return await query()
    } catch (e) {
      span.recordException(e as Error)
      span.setStatus({ code: SpanStatusCode.ERROR })
      throw e
    } finally {
      span.end()
    }
  })
}
```

LLM calls dual-write to OTel (trace) and PostHog (aggregate analytics — cost per user, model comparison):

```ts
posthog.capture({
  distinctId: currentUserId() ?? 'anonymous',
  event: '$ai_generation',
  properties: {
    $ai_model: opts.model,
    $ai_input_tokens: result.usage.input_tokens,
    $ai_output_tokens: result.usage.output_tokens,
    $ai_latency_ms: span.duration,
    $ai_cost_usd: computeCost(result.usage, opts.model),
    $trace_id: getCurrentTraceId(),
  },
})
```

**Enforcement:**

- `packages/db`, `packages/adapters`, and route handlers use span-wrapped functions; lint rule bans direct `db.query` outside these wrappers.
- Integration test: request hits DB + adapter + LLM; trace in Sentry has ≥4 spans with expected names.

---

### 6. Tail-based sampling in production

Head-based sampling (decide at trace start) loses interesting traffic. Tail-based sampling (decide at trace end) keeps what matters.

**Sampling rules:**

- **100%** of traces with errors (`span.status = ERROR`)
- **100%** of traces slower than p95 latency (rolling)
- **100%** of traces with `force.sample = true` attribute
- **10%** of traces for authenticated users
- **3%** of traces for anonymous/bot traffic

For early-stage Gaia without an OTel collector, the Sentry SDK handles sampling via `tracesSampler`:

```ts
// packages/core/observability.ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampler: (ctx) => {
    if (ctx.parentSampled !== undefined) return ctx.parentSampled
    if (ctx.name?.includes('/health')) return 0 // never sample health checks
    return 0.1 // 10% baseline; errors always sampled separately
  },
})
```

**Anti-pattern:**

```ts
tracesSampleRate: 0.01 // misses errors; misses slow traces
tracesSampleRate: 1.0 // cost explosion
```

**Enforcement:**

- Sampling config lives in `packages/core/observability.ts`; single source.
- Changes to sampling rates require an ADR (observability cost is a budget).
- Integration test: error path produces a trace that reaches Sentry; health check path does not.

---

## Monitoring — watching WHAT

### 7. Alerts are actionable or they don't exist

Every alert answers three questions in its definition: **what does this mean**, **what do I check**, **what do I do**. An alert without this is noise and gets deleted.

**Alerts Gaia ships with:**

| Alert                    | Trigger                                  | Severity        |
| ------------------------ | ---------------------------------------- | --------------- |
| `api-error-rate-high`    | Error rate > 1% / 5m                     | page            |
| `api-latency-p95-high`   | p95 > 500ms / 10m                        | warn            |
| `db-slow-queries`        | Any query > 1s / 5m                      | warn            |
| `llm-cost-spike`         | LLM spend > 2x rolling avg / 1h          | warn            |
| `signup-funnel-drop`     | Signup→verify conversion < 50% / 1h      | warn            |
| `failed-login-spike`     | >100 failed logins / 5m from a single IP | warn (security) |
| `deploy-failed`          | Railway build/deploy failed              | page            |
| `uptime-down`            | Better Stack health check fails          | page            |
| `audit-log-write-failed` | Audit log insert failed                  | page (critical) |

Each alert lives in `infra/alerts/<name>.yaml` and links to a runbook in `docs/runbooks/<name>.md` with `meaning` / `check` / `action` fields.

**Anti-pattern:**

```yaml
# ❌ No runbook — on-call gets paged at 3 AM with no context
name: errors-high
trigger: errors > 100
```

**Enforcement:**

- `scripts/validate-artifacts.ts` runs in CI: every alert file must have `runbook`, `meaning`, `check`, `action` fields.
- Quarterly alert audit: fired-but-ignored alerts (no incident created) are deleted or reclassified.

---

### 8. SLO-based, not threshold-based

A raw threshold alert (`error_rate > 1%`) fires on every transient blip. An SLO-based alert ("we're burning our monthly error budget 2x faster than planned") fires on sustained problems that matter.

**Gaia's SLOs (v1 starter set):**

| Service              | SLO                                 | Error budget (monthly) |
| -------------------- | ----------------------------------- | ---------------------- |
| API availability     | 99.9%                               | 43 min downtime        |
| API latency          | p95 < 300ms on authenticated routes | —                      |
| Auth availability    | 99.95%                              | 21 min downtime        |
| Audit log write      | 99.99%                              | 4.3 min failure        |
| LLM response latency | p95 < 3s                            | —                      |
| Email delivery       | 99% sent successfully               | 1% bounce/fail         |

**Burn rate** classifies severity:

- **Fast burn** (14.4x normal): page within 5 minutes
- **Slow burn** (6x over 1 hour): page
- **Trend burn** (3x over 24 hours): warn (ticket, not page)

**Enforcement:**

- SLOs tracked in `docs/runbooks/slos.md` and implemented as alerts.
- Monthly SLO review — are budgets being consumed? is target still right?

---

### 9. Monitor the user journey, not just server metrics

A 200 OK doesn't prove the user succeeded. Server monitoring misses funnel-level failures (verification email never received, magic link never clicked).

**PostHog funnels track user outcomes:**

| Event                      | Trigger                    | Properties               |
| -------------------------- | -------------------------- | ------------------------ |
| `$pageview`                | auto                       | `$pathname`, `$trace_id` |
| `signup.started`           | user submits form          | `email_domain`           |
| `signup.verify_email_sent` | server confirms email sent | —                        |
| `signup.verify_clicked`    | user clicks link           | `latency_since_send_sec` |
| `signup.completed`         | user lands on dashboard    | `total_duration_sec`     |
| `checkout.started`         | user clicks upgrade        | `plan`                   |
| `checkout.polar_redirect`  | Polar checkout opened      | —                        |
| `checkout.completed`       | webhook confirms payment   | `amount_usd`             |

Funnel alerts:

- `signup.started → signup.completed` < 50% / 1h → warn
- `checkout.started → checkout.completed` < 70% / 1h → page

**Enforcement:**

- Every user-facing flow has a named funnel in PostHog.
- Funnel conversion alerts defined in `infra/alerts/funnels/`.
- Session replay reviewed during incidents (first stop: "what did the user actually see?").

---

## Logging — recording EVENTS

### 10. Five non-negotiable fields on every log

Every log entry includes:

1. **`timestamp`** — ISO 8601 UTC
2. **`level`** — `trace | debug | info | warn | error | critical`
3. **`service`** — `gaia-api | gaia-web | gaia-workflows`
4. **`event`** — snake_case verb_noun (`user.login.succeeded`, `billing.webhook.received`)
5. **`trace_id`** — from OTel context (see #1)

Plus `message` for human-readable context if needed (optional — event name often enough).

**Pattern (the wrapper around `packages/core/logger.ts`):**

```ts
// packages/core/logger.ts (extended sketch)
import { Axiom } from '@axiomhq/js'
import { getCurrentTraceId } from './observability'
import { redact } from './redact'

const axiom = env.AXIOM_TOKEN
  ? new Axiom({ token: env.AXIOM_TOKEN, orgId: env.AXIOM_ORG_ID! })
  : null

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'critical'

function emit(level: Level, event: string, context: Record<string, unknown> = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: env.SERVICE_NAME, // 'gaia-api' | 'gaia-web' | etc.
    event,
    trace_id: getCurrentTraceId(),
    ...redact(context),
  }
  if (env.NODE_ENV === 'development') console.log(JSON.stringify(entry, null, 2))
  axiom?.ingest(datasetFor(entry), [entry])
}
```

Event naming convention: `<domain>.<action>[.<outcome>]` — e.g. `user.login.succeeded`, `billing.webhook.received`, `iii.step.retried`.

**Anti-pattern:**

```ts
// ❌ Free-text message
log.info('User logged in')

// ❌ Inconsistent event naming
log.info('LoggedIn') // CamelCase
log.info('login ok') // space + free text
log.info('user_login_ok') // tense inconsistent
```

**Enforcement:**

- Logger's first argument must match `/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$/`.
- Field name registry in `packages/core/schema.ts` — common field names (`userId`, `orgId`, `durationMs`) have shared types; new fields require adding to the registry.
- Axiom dashboard relies on field consistency; schema drift breaks dashboards.

---

### 11. Log levels are semantic commitments, not verbosity

Each level has a named audience and named consequence. Using the wrong level is a bug.

| Level      | Audience        | When                                     | Example                                   |
| ---------- | --------------- | ---------------------------------------- | ----------------------------------------- |
| `trace`    | Developer       | Ultra-verbose dev flow; disabled in prod | `trace('db.query.started', { sql })`      |
| `debug`    | Developer       | Dev/staging verbose; 1% sampled in prod  | `debug('cache.miss', { key })`            |
| `info`     | Operator        | Business events worth keeping            | `info('user.created', { userId })`        |
| `warn`     | Operator        | Recoverable issue worth noticing         | `warn('llm.retry', { attempt: 2 })`       |
| `error`    | On-call (awake) | User-facing failure                      | `error('polar.webhook.invalid', { ... })` |
| `critical` | On-call (paged) | Pages immediately; systemic failure      | `critical('db.unavailable', {})`          |

**Environment-specific defaults:**

```ts
// packages/config/env.ts
export const logConfig = {
  development: { level: 'trace', format: 'pretty', sample: 1.0 },
  test: { level: 'warn', format: 'json', sample: 1.0 },
  staging: { level: 'debug', format: 'json', sample: 0.1 },
  production: { level: 'info', format: 'json', sample: 0.01 }, // errors always 100%
}[env.NODE_ENV]
```

**Sampling is per-level:** `error` and `critical` are never sampled. `info` and below may be sampled based on volume.

**Anti-pattern:**

```ts
// ❌ Everything at info
log.info('cache miss') // should be debug
log.info('failed to parse webhook') // should be error
log.info('database unavailable') // should be critical

// ❌ Error for non-errors
log.error('user password too short') // validation — info or warn
```

**Enforcement:**

- Alerts configured per-level (critical pages, error warns) — wrong level triggers wrong response.
- Monthly log-level audit: any `error`/`critical` events firing > 100/day get reviewed.

---

### 12. Tiered retention by purpose

Not all logs are equal. Hot (debugging) logs are queried daily. Warm (analysis) logs weekly. Cold (compliance/audit) once per incident or subpoena.

| Tier     | Duration | Destination              | Cost | Query speed |
| -------- | -------- | ------------------------ | ---- | ----------- |
| **Hot**  | 14 days  | Axiom (default dataset)  | $$$  | Seconds     |
| **Warm** | 90 days  | Axiom (archive dataset)  | $$   | Minutes     |
| **Cold** | 7 years  | S3 / R2 via Axiom export | $    | Hours       |

**Routing rules (applied at log-emit time):**

```ts
// packages/core/router.ts
function datasetFor(entry: LogEntry): string {
  if (entry.event.startsWith('audit.')) return 'gaia-audit' // compliance tier
  if (entry.level === 'error' || entry.level === 'critical') return 'gaia-errors'
  return 'gaia-logs' // default hot
}
```

- `gaia-logs` → 14d retention, then dropped
- `gaia-errors` → 14d hot + 90d warm
- `gaia-audit` → 14d hot + 90d warm + 7yr cold (S3 export via scheduled Axiom job)

**Enforcement:**

- Routing logic lives in one file (`router.ts`); new log categories added here.
- Monthly Axiom cost review — alert on 2x rolling-average monthly spend.
- Compliance test: simulate GDPR data request — verify audit log query returns records from 3+ years ago.

---

## Integration wiring — putting it together

### Request lifecycle

```
1. Request arrives at Elysia route
   ↓
2. OTel middleware creates root span (http.server.request)
   - trace_id assigned, put in async-local context
   ↓
3. Route handler runs
   ├── Child span: db.users.findFirst (DB adapter wraps)
   ├── Child span: llm.anthropic.sonnet (LLM adapter wraps)
   └── log.* emits events with trace_id
   ↓
4. If error thrown:
   - AppError caught in Elysia onError
   - log.warn/error emits to Axiom
   - Sentry.captureException via OTel integration
   - Trace ends with ERROR status
   ↓
5. Response sent; root span ends
   ↓
6. OTel batch processor ships spans to Sentry OTLP endpoint
   - Tail sampling applied at collector (or Sentry SDK)
   - Axiom receives logs (already sent during request)
   - PostHog events queued and flushed periodically
```

### Local development

- `getLogger()` outputs pretty-printed JSON to stdout (not Axiom).
- OTel SDK uses `console` exporter (not Sentry).
- PostHog SDK opt-in via env flag (`POSTHOG_DEV_CAPTURE=true`).
- Sentry disabled unless explicitly enabled.

### Cost discipline

Observability cost is a budget, tracked in `docs/runbooks/observability-cost.md`:

| Component    | Budget (v1)                                 |
| ------------ | ------------------------------------------- |
| Sentry       | $100/mo (events + traces + replays)         |
| Axiom        | $100/mo (~100GB log ingest)                 |
| PostHog      | Free tier (100k events/mo → paid as growth) |
| Better Stack | $30/mo (uptime)                             |
| **Total**    | ~$250/mo for v1 scale                       |

Cost spikes are treated as incidents — usually a runaway log loop or excessive trace depth.

---

## Testing observability

Observability is tested like any feature.

```ts
// packages/core/test/trace.integration.test.ts
it('trace_id flows through log → trace → error', async () => {
  const api = treaty(app)
  const { error } = await api.users[':id'].get({ params: { id: 'invalid' } })
  expect(error).toBeDefined()
  const traceId = error?.value.traceId

  const logs = await axiomQuery(`['gaia-errors'] | where trace_id == '${traceId}'`)
  expect(logs.length).toBeGreaterThan(0)
  expect(logs[0].event).toBe('users.not_found')

  const events = await sentrySearch(`trace_id:${traceId}`)
  expect(events.length).toBe(1)
})
```

If the trace ID can't join across Axiom and Sentry, observability is broken — same severity as any production bug.

---

## Quick reference

| Need                    | API                                               | Output               |
| ----------------------- | ------------------------------------------------- | -------------------- |
| Log an event            | `log.info('user.created', { userId })`            | Axiom JSON           |
| Log a recoverable issue | `log.warn('adapter.retry', { attempt })`          | Axiom + trend alert  |
| Log an error            | `throw new AppError('CODE', { context })`         | Auto: Sentry + Axiom |
| Trace a boundary        | `tracer.startActiveSpan('name', async () => ...)` | Sentry span          |
| Capture user event      | `posthog.capture({ distinctId, event, props })`   | PostHog event        |
| Check a trace           | Sentry → Traces → search by `trace_id`            | Distributed view     |
| Check logs              | Axiom → SQL-like query                            | Queryable events     |
| Check funnel            | PostHog → Insights → Funnels                      | Conversion rates     |
| Check uptime            | Better Stack dashboard                            | Uptime + incidents   |

---

## Cross-references

- Code principles: `.claude/skills/w-code/reference.md` (#8 every boundary emits observability)
- Errors: `packages/errors/CLAUDE.md` (trace ID, observability boundary)
- Security: `packages/security/CLAUDE.md` (redaction, audit log)
- Testing: `.claude/skills/w-code/reference.md` (observability testing)
- Audit skill: `.claude/skills/a-observability/reference.md`
