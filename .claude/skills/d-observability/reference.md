# Observability — OpenTelemetry + Sentry + Axiom + PostHog

> Status: Reference
> Last verified: April 2026
> Scope: All code that emits telemetry — which is all code

---

## What this file is

The patterns for how Gaia sees itself in production. These implement principles #3, #8, and #9 from `code.md` (named errors, every boundary emits observability, security opinionated) with concrete wiring for the four tools Gaia uses:

- **OpenTelemetry (OTel)** — the instrumentation layer (vendor-neutral)
- **Sentry** — errors + distributed tracing (via OTLP)
- **Axiom** — structured logs (JSON events, SQL query)
- **PostHog** — product analytics + LLM observability + session replay

Read `code.md` first. This file is the concrete _how_.

**Key terms used precisely:**

| Term              | Meaning                                                                         | Primary tool                    |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| **Observability** | Understanding _why_ something happened — traces, structured events, correlation | OTel → Sentry + Axiom           |
| **Monitoring**    | Watching _what is happening_ — metrics, alerts, SLOs, uptime                    | Sentry + Better Stack + PostHog |
| **Logging**       | Recording _events_ — structured log lines                                       | Axiom                           |

The distinction matters because each has different cost, retention, and audience. A log is not a metric is not a trace.

---

## The 12 observability principles

Three universal (all domains), three observability, three monitoring, three logging. Plus integration patterns at the end.

---

## Universal (all three domains)

### 1. Trace ID is the universal correlator

Every log entry, every trace span, every metric sample, and every Sentry error carries the **same** `trace_id` from the current OpenTelemetry context. Without correlation, three tools become three separate pains.

**Pattern:**

```ts
// packages/observability/src/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { env } from '@gaia/config/env'

export const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'gaia-api',
    'service.version': env.APP_VERSION,
    'deployment.environment': env.NODE_ENV,
  }),
  // Single OTLP exporter — Sentry receives traces via OTLP endpoint
  traceExporter: new OTLPTraceExporter({
    url: env.SENTRY_OTLP_ENDPOINT,
    headers: { 'x-sentry-auth': `sentry sentry_key=${env.SENTRY_PUBLIC_KEY}` },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
```

Trace ID extraction is centralized:

```ts
// packages/observability/src/trace.ts
import { trace } from '@opentelemetry/api'

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
logger.info('user login', { logCorrelationId: uuid() })
Sentry.setTag('request_id', requestId)
posthog.capture('user_login', { sessionId: crypto.randomUUID() })
// Impossible to join across the three systems
```

**Enforcement:**

- Axiom adapter sets `trace_id` automatically from OTel context
- Sentry uses the active span's trace ID via the OTel integration
- PostHog super properties include `$trace_id` set on request start
- Lint rule: `logger.info/warn/error/critical(...)` cannot accept a custom `trace_id` in the context object

---

### 2. Structured JSON or it's not a log

Free-text logs are unqueryable at scale. Every log, every event, every span attribute is JSON-serializable key-value data. `console.log` is banned outside local dev scripts.

**Pattern:**

```ts
// ✅ Structured
logger.info('user.login.succeeded', {
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
logger.info(`User login: ${JSON.stringify({ userId, method })}`)
```

**Enforcement:**

- Oxlint rule — `console.log/.warn/.error` fails lint outside `scripts/` and `tools/`
- Logger's first argument must be a string literal `event` name (snake*case) matching `/^[a-z]a-z0-9*.]+$/`
- Second argument must be a plain object (no strings, no arrays at top level)

---

### 3. Redact at emit time — never trust downstream

Sensitive data never leaves the process unredacted. The logger, span processor, and Sentry `beforeSend` all apply the same redaction. If one fails, the others catch it.

**Pattern:**

```ts
// packages/observability/src/redact.ts
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
    // Also redact values that look like secrets
    if (/^(sk|pk|rk|polar|whsec|bearer)_[a-zA-Z0-9_-]{16,}$/.test(input)) {
      return '[REDACTED]'
    }
    return input
  }
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1))
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = redact(v, depth + 1)
      }
    }
    return out
  }
  return input
}
```

Applied in three places:

```ts
// Logger
logger.info('event', redact(context))

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
    event.extra = redact(event.extra) as any
    event.contexts = redact(event.contexts) as any
    return event
  },
})
```

**Anti-pattern:**

```ts
// ❌ Relying on downstream redaction
logger.info('request', { body: req.body }) // body contains password; hope Axiom handles it

// ❌ Partial redaction
logger.info('auth', { token: token.substring(0, 4) + '***' }) // enough for some attacks
```

**Enforcement:**

- Test: create request with header `Authorization: Bearer test-secret-xyz`, trigger an error path, assert `test-secret-xyz` does not appear in Axiom log, Sentry event, or PostHog event
- New keys added to `SENSITIVE_KEYS` require PR review (list is intentionally growing)

---

## Observability — understanding WHY

### 4. OpenTelemetry is the only instrumentation layer

Code calls OTel APIs, never vendor SDKs directly. Exporters (OTLP) ship to Sentry for traces/errors and Axiom for logs. Swapping backends is a config change, not a refactor.

**Pattern:**

```ts
// ✅ OTel — vendor-neutral
import { trace } from '@opentelemetry/api'

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
Sentry.addBreadcrumb({ message: 'creating user' })
```

Sentry-specific code locks Gaia to Sentry. OTel code works with any OTLP-compatible backend (Sentry, Axiom, SigNoz, Datadog, self-hosted Tempo/Jaeger, etc.)

**Sentry's role:** Sentry receives OTLP traces and also adds its own error-grouping, release health, and session replay features on top. Gaia uses Sentry-specific features through the Sentry SDK only for those features — not for instrumentation.

**Enforcement:**

- Lint rule: `import * as Sentry from '@sentry/...'` is allowed only in `packages/observability/src/sentry/`
- Application code imports `@opentelemetry/api` and `@gaia/observability` wrappers

---

### 5. Span every cross-boundary call

The boundaries are where latency hides and errors happen. Every cross-boundary call gets a span with semantic attributes following OTel conventions.

**Boundaries that must be spanned:**

| Boundary       | Span name                         | Key attributes                                                       |
| -------------- | --------------------------------- | -------------------------------------------------------------------- |
| HTTP route     | `{METHOD} {route}`                | `http.method`, `http.status_code`, `http.route`                      |
| DB query       | `db.{operation} {table}`          | `db.system`, `db.statement`, `db.rows_affected`                      |
| Adapter call   | `adapter.{service}.{operation}`   | `adapter.name`, `adapter.timeout_ms`                                 |
| LLM call       | `llm.{provider}.{model}`          | `llm.model`, `llm.tokens.input`, `llm.tokens.output`, `llm.cost_usd` |
| Queue job      | `inngest.{function_id}.{step_id}` | `inngest.event`, `inngest.attempt`                                   |
| Outbound HTTP  | `http.client {host}`              | `http.url`, `http.status_code`, `http.response_size`                 |
| Cache hit/miss | `cache.{operation}`               | `cache.hit`, `cache.key_pattern`                                     |

**Pattern (Drizzle wrapper with spans):**

```ts
// packages/db/src/observe.ts
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

// Usage
const user = await observeQuery(
  'users.findById',
  () => db.query.users.findFirst({ where: eq(users.id, id) }),
  { 'db.query.id': id },
)
```

Service adapters wrap calls the same way. The LLM adapter is an important case:

```ts
// packages/adapters/src/llm.ts
async function generate(opts: GenerateOpts): Promise<LLMResult> {
  return tracer.startActiveSpan(`llm.anthropic.${opts.model}`, async (span) => {
    span.setAttribute('llm.model', opts.model)
    span.setAttribute('llm.tokens.input', estimateTokens(opts.messages))

    const result = await claude.messages.create({...})

    span.setAttribute('llm.tokens.output', result.usage.output_tokens)
    span.setAttribute('llm.cost_usd', computeCost(result.usage, opts.model))
    span.setAttribute('llm.finish_reason', result.stop_reason)
    span.end()

    // Also emit PostHog event for LLM analytics
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

    return result
  })
}
```

LLM observability dual-writes: OTel span (for trace view in Sentry) + PostHog event (for aggregate analytics — cost per user, model comparison, prompt A/B tests).

**Anti-pattern:**

```ts
// ❌ No span — boundary is invisible in traces
const user = await db.query.users.findFirst({...})

// ❌ Span but no semantic attributes
tracer.startActiveSpan('db', () => db.query.users.findFirst(...))
// Appears in trace as "db" with no context
```

**Enforcement:**

- `packages/db`, `packages/adapters`, and route handlers use span-wrapped functions; lint rule bans direct `db.query` / `db.insert` / `db.update` outside these wrappers
- Integration test: make a request hitting DB + adapter + LLM; fetch the resulting trace from Sentry; assert ≥4 spans present with expected names

---

### 6. Tail-based sampling in production

Head-based sampling (decide at trace start) loses the interesting traffic. Tail-based sampling (decide at trace end) keeps what matters.

**Sampling rules:**

- **100%** of traces with errors (`span.status = ERROR`)
- **100%** of traces slower than p95 latency (computed rolling)
- **100%** of traces with `force.sample = true` attribute (set via header in dev)
- **10%** of traces for authenticated users (business-critical)
- **3%** of traces for anonymous/bot traffic

**Pattern (OpenTelemetry Collector config):**

```yaml
# infra/otel-collector.yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: always-sample-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: always-sample-slow
        type: latency
        latency: { threshold_ms: 500 }
      - name: always-sample-forced
        type: string_attribute
        string_attribute: { key: force.sample, values: [true] }
      - name: sample-authenticated
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
      - name: sample-anonymous
        type: and
        and:
          and_sub_policy:
            - name: is-anonymous
              type: string_attribute
              string_attribute: { key: user.authenticated, values: [false] }
            - name: probabilistic
              type: probabilistic
              probabilistic: { sampling_percentage: 3 }

exporters:
  otlp/sentry:
    endpoint: ${env:SENTRY_OTLP_ENDPOINT}
    headers: { x-sentry-auth: ${env:SENTRY_AUTH} }

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp/sentry]
```

For early-stage Gaia without a collector, the Sentry SDK handles sampling via `tracesSampler`:

```ts
// packages/observability/src/sentry/config.ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampler: (ctx) => {
    if (ctx.parentSampled !== undefined) return ctx.parentSampled
    if (ctx.name?.includes('/health')) return 0 // never sample health checks
    return 0.1 // 10% baseline; errors always sampled via separate mechanism
  },
})
```

**Anti-pattern:**

```ts
// ❌ Fixed-rate head sampling
tracesSampleRate: 0.01 // misses errors; misses slow traces

// ❌ 100% sampling in production
tracesSampleRate: 1.0 // cost explosion
```

**Enforcement:**

- Sampling config lives in `packages/observability/src/sampling.ts`; single source
- Changes to sampling rates require ADR (observability cost is a budget)
- Integration test: error path produces a trace that reaches Sentry; health check path does not

---

## Monitoring — watching WHAT

### 7. Alerts are actionable or they don't exist

Every alert answers three questions in its definition: **what does this mean**, **what do I check**, **what do I do**. An alert without this is noise and gets deleted.

**Pattern (alert template):**

```yaml
# infra/alerts/error-rate-high.yaml
name: api-error-rate-high
description: API error rate exceeds 1% over 5 minutes
trigger:
  source: sentry
  query: error_rate > 0.01
  window: 5m
severity: page # page | warn | info
owner: api-team
runbook: docs/runbook/api-error-rate-high.md
meaning: |
  The 5xx error rate exceeded 1%. Users are experiencing failures.
  Typical causes: DB slow/down, upstream adapter failing, deploy regression.
check:
  - Sentry error list for the last 5 minutes — look for new error types
  - Axiom dashboard "api-health" — DB p95 latency
  - Railway deployment history — was there a recent deploy?
action:
  - If new error type: rollback last deploy via `bun run deploy:rollback`
  - If DB latency spike: check Neon dashboard, may require branch compute scaling
  - If adapter failing: check adapter-specific health in Sentry breadcrumbs
```

**Runbook file** (`docs/runbook/api-error-rate-high.md`) contains the detailed playbook. Alert links to it in the notification message.

**Alerts Gaia ships with:**

| Alert                    | Trigger                                | Severity        |
| ------------------------ | -------------------------------------- | --------------- |
| `api-error-rate-high`    | Error rate > 1% / 5m                   | page            |
| `api-latency-p95-high`   | p95 > 500ms / 10m                      | warn            |
| `db-slow-queries`        | Any query > 1s / 5m                    | warn            |
| `llm-cost-spike`         | LLM spend > 2x rolling avg / 1h        | warn            |
| `signup-funnel-drop`     | Signup→verify conversion < 50% / 1h    | warn            |
| `failed-login-spike`     | >100 failed logins / 5m from single IP | warn (security) |
| `deploy-failed`          | Railway build/deploy failed            | page            |
| `uptime-down`            | Better Stack health check fails        | page            |
| `audit-log-write-failed` | Audit log insert failed                | page (critical) |

**Anti-pattern:**

```yaml
# ❌ No runbook — on-call gets paged at 3 AM with no context
name: errors-high
trigger: errors > 100
```

**Enforcement:**

- `scripts/validate-alerts.ts` runs in CI: every alert file must have `runbook`, `meaning`, `check`, `action` fields
- Quarterly alert audit: fired-but-ignored alerts (no incident created) are deleted or reclassified

---

### 8. SLO-based, not threshold-based

A raw threshold alert (`error_rate > 1%`) fires on every transient blip. An SLO-based alert ("we're burning our monthly error budget 2x faster than planned") fires on sustained problems that actually matter.

**Gaia's SLOs (v1 starter set):**

| Service              | SLO                                 | Error budget (monthly) |
| -------------------- | ----------------------------------- | ---------------------- |
| API availability     | 99.9%                               | 43 min downtime        |
| API latency          | p95 < 300ms on authenticated routes | —                      |
| Auth availability    | 99.95%                              | 21 min downtime        |
| Audit log write      | 99.99%                              | 4.3 min failure        |
| LLM response latency | p95 < 3s                            | —                      |
| Email delivery       | 99% sent successfully               | 1% bounce/fail         |

**Alert on burn rate, not threshold.** Classic Google SRE patterns:

- **Fast burn** (budget consumed 14.4x faster than normal): page within 5 minutes
- **Slow burn** (budget consumed 6x faster over 1 hour): page
- **Trend burn** (budget consumed 3x faster over 24 hours): warn (ticket, not page)

**Pattern:**

```yaml
# infra/slos/api-availability.yaml
name: api-availability-99.9
description: API returns 2xx/3xx for 99.9% of requests
metric:
  good: http.server.requests{status_class=~"2xx|3xx"}
  total: http.server.requests
target: 0.999
window: 30d
alerts:
  - name: api-availability-fast-burn
    burn_rate: 14.4 # 2% of monthly budget in 1 hour
    window: 1h
    severity: page
  - name: api-availability-slow-burn
    burn_rate: 6 # 10% of monthly budget in 6 hours
    window: 6h
    severity: page
  - name: api-availability-trend-burn
    burn_rate: 3 # 30% of monthly budget in 3 days
    window: 3d
    severity: warn
```

**Anti-pattern:**

```yaml
# ❌ Threshold alert — fires on every blip
name: api-errors-high
trigger: error_rate > 0.01 # 1% for 5 min pages on-call; flaky
```

**Enforcement:**

- SLOs tracked in `docs/runbook/slos.md` and implemented as alerts
- Monthly SLO review — are budgets being consumed? is target still right?

---

### 9. Monitor the user journey, not just server metrics

A 200 OK doesn't prove the user succeeded. The signup API may return 201, but the user might never receive the verification email, might not click the link, might fail the confirmation. Server monitoring misses this.

**PostHog funnels track user outcomes:**

```ts
// apps/web/src/lib/posthog.ts
posthog.init(env.PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  capture_pageview: true,
  session_recording: { enabled: true, maskAllInputs: true },
  loaded: (ph) => {
    // Attach trace_id to every event for join-back with server traces
    ph.register({ $trace_id: getCurrentTraceId() })
  },
})
```

Key events captured:

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

- `signup.started → signup.completed` conversion drops below 50% over 1 hour → warn
- `checkout.started → checkout.completed` conversion drops below 70% over 1 hour → page

**Pattern:**

```ts
// apps/api/src/features/auth/service.ts (server side event capture)
export async function sendVerificationEmail(user: User) {
  const span = tracer.startActiveSpan('auth.send_verification')
  try {
    await email.send(...)
    posthog.capture({
      distinctId: user.id,
      event: 'signup.verify_email_sent',
      properties: { $trace_id: getCurrentTraceId() },
    })
  } finally {
    span.end()
  }
}
```

**Anti-pattern:**

```ts
// ❌ Only monitor HTTP status
// If /auth/signup returns 201, assume success — miss silent email failures
```

**Enforcement:**

- Every user-facing flow has a named funnel in PostHog
- Funnel conversion alerts defined in `infra/alerts/funnels/`
- Session replay reviewed during incidents (first stop: "what did the user actually see?")

---

## Logging — recording EVENTS

### 10. Five non-negotiable fields on every log

Every log entry includes:

1. **`timestamp`** — ISO 8601 UTC (`2026-04-19T18:23:45.123Z`)
2. **`level`** — `trace | debug | info | warn | error | critical`
3. **`service`** — `gaia-api | gaia-web | gaia-workflows`
4. **`event`** — snake_case verb_noun (`user.login.succeeded`, `billing.webhook.received`)
5. **`trace_id`** — from OTel context (see principle #1)

Plus `message` for human-readable context if needed (optional — event name often enough).

**Pattern:**

```ts
// packages/observability/src/logger.ts
import { Axiom } from '@axiomhq/js'
import { getCurrentTraceId } from './trace'
import { redact } from './redact'
import { env } from '@gaia/config/env'

const axiom = new Axiom({ token: env.AXIOM_TOKEN, orgId: env.AXIOM_ORG })
const DATASET = 'gaia-logs'

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
  if (env.NODE_ENV === 'development') {
    console.log(JSON.stringify(entry, null, 2)) // pretty in dev
  }
  axiom.ingest(DATASET, [entry])
}

export const logger = {
  trace: (e: string, c?: Record<string, unknown>) => emit('trace', e, c),
  debug: (e: string, c?: Record<string, unknown>) => emit('debug', e, c),
  info: (e: string, c?: Record<string, unknown>) => emit('info', e, c),
  warn: (e: string, c?: Record<string, unknown>) => emit('warn', e, c),
  error: (e: string, c?: Record<string, unknown>) => emit('error', e, c),
  critical: (e: string, c?: Record<string, unknown>) => emit('critical', e, c),
  log: (level: Level, e: string, c?: Record<string, unknown>) => emit(level, e, c),
}
```

Event naming convention: `<domain>.<action>[.<outcome>]`:

- `user.login.succeeded`
- `user.login.failed`
- `billing.webhook.received`
- `billing.webhook.processed`
- `llm.call.completed`
- `inngest.step.retried`

**Anti-pattern:**

```ts
// ❌ Free-text message
logger.info('User logged in')

// ❌ Inconsistent event naming
logger.info('LoggedIn') // CamelCase
logger.info('login ok') // space + free text
logger.info('user_login_ok') // tense inconsistent with others
```

**Enforcement:**

- Logger's first argument must match `/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$/`
- Field name registry in `packages/observability/src/schema.ts` — common field names (`userId`, `orgId`, `durationMs`) have shared types; new fields require adding to registry
- Axiom dashboard relies on field consistency; schema drift breaks dashboards

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
// packages/config/src/env.ts
export const logConfig = {
  development: { level: 'trace', format: 'pretty', sample: 1.0 },
  test: { level: 'warn', format: 'json', sample: 1.0 }, // quiet by default
  staging: { level: 'debug', format: 'json', sample: 0.1 },
  production: { level: 'info', format: 'json', sample: 0.01 }, // errors always 100%
}[env.NODE_ENV]
```

**Sampling is per-level:** `error` and `critical` are never sampled. `info` and below may be sampled based on volume.

**Pattern:**

```ts
// ✅ Semantic level choice
logger.debug('cache.miss', { key }) // developer info; noisy but useful in staging

logger.info('user.created', { userId, via: 'signup' }) // business event, worth keeping

logger.warn('polar.retry', { attempt: 3 }) // recoverable, monitor trend

logger.error('polar.webhook.signature_invalid', { ... }) // user-facing; alert on volume

logger.critical('audit_log.write.failed', { ... }) // compliance failure; page
```

**Anti-pattern:**

```ts
// ❌ Everything at info
logger.info('cache miss') // should be debug
logger.info('failed to parse webhook') // should be error
logger.info('database unavailable') // should be critical

// ❌ Error for non-errors
logger.error('user password too short') // validation error — info or warn
```

**Enforcement:**

- Alerts configured per-level (critical pages, error warns, etc.) — wrong level triggers wrong response
- Monthly log-level audit: any `error`/`critical` events firing > 100/day get reviewed (either wrong level or systemic issue)

---

### 12. Tiered retention by purpose

Not all logs are equal. Hot (debugging) logs are queried daily. Warm (analysis) logs are queried weekly. Cold (compliance/audit) logs are queried once per incident or subpoena. Each tier has different cost and query speed.

**Gaia's retention tiers:**

| Tier     | Duration | Destination              | Cost | Query speed |
| -------- | -------- | ------------------------ | ---- | ----------- |
| **Hot**  | 14 days  | Axiom (default dataset)  | $$$  | Seconds     |
| **Warm** | 90 days  | Axiom (archive dataset)  | $$   | Minutes     |
| **Cold** | 7 years  | S3 / R2 via Axiom export | $    | Hours       |

**Routing rules (applied at log-emit time):**

```ts
// packages/observability/src/router.ts
function datasetFor(entry: LogEntry): string {
  // Audit logs: always cold + warm (compliance + recent queries)
  if (entry.event.startsWith('audit.')) return 'gaia-audit' // compliance tier
  // Errors and criticals: hot (debugging) + warm (trend analysis)
  if (entry.level === 'error' || entry.level === 'critical') return 'gaia-errors'
  // Everything else: hot
  return 'gaia-logs'
}
```

- `gaia-logs` → 14d retention, then dropped
- `gaia-errors` → 14d hot + 90d warm
- `gaia-audit` → 14d hot + 90d warm + 7yr cold (S3 export via scheduled Axiom job)

**Pattern:**

```ts
// Audit events auto-route to compliance tier
logger.info('audit.user.deleted', {
  actorId: admin.id,
  targetUserId: user.id,
  reason: 'gdpr_request',
})
// → gaia-audit dataset → 7yr retention
```

**Anti-pattern:**

```ts
// ❌ All logs to one dataset with 30-day retention
// - Compliance logs deleted before audit period
// - Debug logs kept too long, driving cost
// - No way to distinguish hot from cold at query time
```

**Enforcement:**

- Routing logic lives in one file (`router.ts`); new log categories added here
- Monthly Axiom cost review — alert on 2x rolling-average monthly spend
- Compliance test: simulate GDPR data request — verify audit log query returns records from 3+ years ago

---

## Integration wiring — putting it together

### Request lifecycle (what happens per request)

```
1. Request arrives at Elysia route
   ↓
2. OTel middleware creates root span (http.server.request)
   - trace_id assigned
   - put in async-local context
   ↓
3. Route handler runs
   ├── Child span: db.users.findFirst (DB adapter wraps)
   ├── Child span: llm.anthropic.sonnet (LLM adapter wraps)
   └── Logger emits events with trace_id
   ↓
4. If error thrown:
   - GaiaError caught in Elysia onError
   - logger.error/critical emits to Axiom
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

- `logger.*` outputs pretty-printed JSON to stdout (not Axiom)
- OTel SDK uses `console` exporter (not Sentry)
- PostHog SDK opt-in via env flag (`POSTHOG_DEV_CAPTURE=true`)
- Sentry disabled unless explicitly enabled

### Cost discipline

Observability cost is a budget, tracked in `docs/runbook/observability-cost.md`:

| Component    | Budget (v1)                                  |
| ------------ | -------------------------------------------- |
| Sentry       | $100/mo (baseline events + traces + replays) |
| Axiom        | $100/mo (~100GB log ingest)                  |
| PostHog      | Free tier (100k events/mo → paid as growth)  |
| Better Stack | $30/mo (uptime)                              |
| **Total**    | ~$250/mo for v1 scale                        |

**Alerts fire when:**

- Axiom monthly spend > $150 (50% over budget)
- Sentry quota > 80% through mid-month
- PostHog event volume > 90% of tier

Cost spikes are treated as incidents — usually indicate a runaway log loop or excessive trace depth.

---

## Testing observability

Observability is tested like any feature. Integration tests verify:

```ts
// packages/observability/test/trace.integration.test.ts
it('trace_id flows through log → trace → error', async () => {
  const api = treaty(app)
  const { error } = await api.users[':id'].get({ params: { id: 'invalid' } })
  expect(error).toBeDefined()
  const traceId = error?.value.traceId

  // Axiom log has the trace_id
  const logs = await axiomQuery(`['gaia-errors'] | where trace_id == '${traceId}'`)
  expect(logs.length).toBeGreaterThan(0)
  expect(logs[0].event).toBe('users.not_found')

  // Sentry event has the trace_id
  const events = await sentrySearch(`trace_id:${traceId}`)
  expect(events.length).toBe(1)
})
```

If the trace ID can't join across Axiom and Sentry, observability is broken — same-severity as any production bug.

---

## Quick reference

| Need                    | API                                                  | Output                   |
| ----------------------- | ---------------------------------------------------- | ------------------------ |
| Log an event            | `logger.info('user.created', { userId })`            | Axiom JSON               |
| Log a recoverable issue | `logger.warn('adapter.retry', { attempt })`          | Axiom JSON + trend alert |
| Log an error            | `throwError('CODE', { context })`                    | Auto: Sentry + Axiom     |
| Trace a boundary        | `tracer.startActiveSpan('name', async () => ...)`    | Sentry span              |
| Capture user event      | `posthog.capture({ distinctId, event, properties })` | PostHog event            |
| Check a trace           | Sentry → Traces → search by `trace_id`               | Distributed view         |
| Check logs              | Axiom → query dataset with SQL-like syntax           | Queryable events         |
| Check funnel            | PostHog → Insights → Funnels                         | Conversion rates         |
| Check uptime            | Better Stack dashboard                               | Uptime + incidents       |

---

## Cross-references

- Principles: `docs/reference/code.md` (principle #8: every boundary emits observability)
- Errors: `docs/reference/errors.md` (trace ID, observability boundary)
- Security: `docs/reference/security.md` (redaction, audit log)
- Testing: `docs/reference/testing.md` (observability testing)
- Runbook index: `docs/runbook/index.md`
- SLO definitions: `docs/runbook/slos.md`

_This file is versioned. Changes that contradict `code.md` require an ADR._
