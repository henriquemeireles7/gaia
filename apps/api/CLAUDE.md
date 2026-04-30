# Backend — Elysia + Eden Treaty + Adapters

> Status: Reference
> Last verified: April 2026
> Scope: All code in `apps/api/` and `packages/{api,adapters,auth,security,workflows}`

---

## What this file is

The stack-specific patterns for backend code in Gaia. These patterns implement the 10 coding principles from `code.md` in the context of Elysia + Eden Treaty + TypeBox + Bun + Better Auth + Drizzle + iii.

Read `code.md` first. This file is the concrete _how_; `code.md` is the _why_.

---

## The 10 backend patterns

### 1. One plugin per feature, one file, ~10 routes max

Each feature in `apps/api/src/features/<name>/routes.ts` exports a single Elysia plugin. The plugin composes into the main app via `.use()`. This keeps TypeScript compile times bounded (large method chains crush `tsgo` performance) and makes change-locality real.

**Structure:**

```
apps/api/src/features/users/
├── CLAUDE.md           # only if feature has local rules
├── routes.ts           # exports the Elysia plugin — one file, max ~10 routes
├── service.ts          # pure business logic (no Elysia)
├── schema.ts           # TypeBox models (exported, registered via .model())
├── service.test.ts     # unit tests against service.ts
└── index.ts            # re-exports { routes }
```

**Pattern:**

```ts
// apps/api/src/features/users/routes.ts
import { Elysia } from 'elysia'
import { UserSchemas } from './schema'
import { userService } from './service'
import { protectedRoute } from '@gaia/security'

export const userRoutes = new Elysia({ prefix: '/users', name: 'users' })
  .model(UserSchemas) // registers named schemas
  .use(protectedRoute)
  .get('/', ({ user }) => userService.list(user.tenantId))
  .get('/:id', ({ user, params }) => userService.get(params.id, user.tenantId), {
    params: 'users.params',
  })
  .post('/', ({ user, body }) => userService.create(user.tenantId, body), {
    body: 'users.create.body',
    response: { 201: 'users.entity', 409: 'errors.conflict' },
  })
```

Then in `apps/api/src/app.ts`:

```ts
import { Elysia } from 'elysia'
import { userRoutes } from './features/users'
import { billingRoutes } from './features/billing'

export const app = new Elysia()
  .use(defaultMiddleware) // tracing + security + auth context
  .use(userRoutes)
  .use(billingRoutes)

export type App = typeof app
```

**Enforcement:** GritQL rule — each file in `features/*/routes.ts` exports exactly one Elysia plugin and defines no more than 10 route methods.

---

### 2. TypeBox models live in `schema.ts` with predictable names

Each feature declares its TypeBox schemas in `schema.ts`. Schemas are registered with Elysia via `.model()` using a dotted naming convention: `<feature>.<purpose>.<part>`.

**Naming convention:**

| Purpose             | Name pattern            | Example             |
| ------------------- | ----------------------- | ------------------- |
| Entity (full shape) | `<feature>.entity`      | `users.entity`      |
| Create body         | `<feature>.create.body` | `users.create.body` |
| Update body         | `<feature>.update.body` | `users.update.body` |
| Route params        | `<feature>.params`      | `users.params`      |
| Query filters       | `<feature>.query`       | `users.query`       |
| Response lists      | `<feature>.list`        | `users.list`        |

**Pattern:**

```ts
// apps/api/src/features/users/schema.ts
import { t } from 'elysia'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { users } from '@gaia/db/schema'

// Derived from Drizzle — one schema source (principle #1 in code.md)
const _entity = createSelectSchema(users)
const _create = t.Omit(createInsertSchema(users), ['id', 'createdAt', 'updatedAt'])

export const UserSchemas = {
  'users.entity': _entity,
  'users.create.body': _create,
  'users.update.body': t.Partial(_create),
  'users.params': t.Object({ id: t.String({ format: 'uuid' }) }),
  'users.query': t.Object({
    page: t.Number({ default: 1, minimum: 1 }),
    limit: t.Number({ default: 20, maximum: 100 }),
    search: t.Optional(t.String()),
  }),
}
```

**Enforcement:** GritQL rule — every feature folder must contain `schema.ts` exporting a `Schemas` object with dotted keys. Routes may only reference schemas by name string (`body: 'users.create.body'`), never inline `t.Object`.

---

### 3. Validate at the route boundary; trust the interior

Every Elysia route declares schemas for `body`, `query`, `params`, and `headers` when applicable. Inside the handler, types are trusted — no runtime re-validation, no defensive fallbacks.

**Anti-pattern:**

```ts
// ❌ Inline schema, defensive parsing, unclear types
.post('/users', ({ body }: any) => {
  const email = body?.email?.trim?.() ?? ''
  if (!email || !email.includes('@')) return error(400, { message: 'bad email' })
  // ...
})
```

**Pattern:**

```ts
// ✅ Named schema, validated, typed, trusted
.post('/users', ({ body }) => userService.create(body), {
  body: 'users.create.body',
  response: { 201: 'users.entity', 409: 'errors.conflict' },
})

// In service.ts — body is fully typed
export const userService = {
  async create(body: typeof UserSchemas['users.create.body']['static']) {
    // body.email is guaranteed to exist and be a valid email
  }
}
```

Headers with auth tokens are validated too — they're inputs.

**Enforcement:** Oxlint rule disallows `any` and `unknown` in `apps/api/src/features/*/service.ts`. GritQL rule requires `body`/`query`/`params` schemas on every Elysia route that uses them.

---

### 4. Response schemas for all status codes

Every route declares response schemas by status code. This enables Eden Treaty to narrow errors on the client by status, and documents the contract.

**Pattern:**

```ts
.post('/users', ({ body, error }) => {
  const existing = userService.findByEmail(body.email)
  if (existing) return error(409, { code: 'USER_EMAIL_TAKEN', message: 'Email already registered' })
  return userService.create(body)
}, {
  body: 'users.create.body',
  response: {
    201: 'users.entity',
    409: 'errors.conflict',
    422: 'errors.validation',
  },
})
```

**On the client (Solid):**

```ts
import { api } from '@/lib/api'

const { data, error } = await api.users.post({ email: 'x@y.com', name: 'X' })
if (error) {
  switch (error.status) {
    case 409: // narrowed to errors.conflict
      toast.error(error.value.message)
      break
    case 422: // narrowed to errors.validation
      showValidationErrors(error.value.fields)
      break
  }
}
```

**Enforcement:** GritQL rule requires `response` schema object on every Elysia route that can return non-200 status codes.

---

### 5. Protected by default — `publicRoute()` is the opt-out

The `packages/security/` package exports two plugins: `protectedRoute` (default) and `publicRoute` (opt-out). Every route composition starts with `protectedRoute`. Public routes explicitly opt out with a comment referencing an ADR explaining why.

**Pattern:**

```ts
import { protectedRoute, publicRoute } from '@gaia/security'

// Default — auth enforced via Better Auth middleware
export const userRoutes = new Elysia({ prefix: '/users' })
  .use(protectedRoute)
  .get('/', ({ user }) => userService.list(user.tenantId))

// Explicit opt-out — ADR required
export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(publicRoute) // ADR-0012: auth endpoints must be accessible without session
  .post('/login', ({ body }) => authService.login(body), { body: 'auth.login.body' })
```

`protectedRoute` provides: Better Auth session enforcement, rate limiting, CSRF check on mutations, audit logging of writes, security headers, request tracing.

`publicRoute` provides: rate limiting (stricter), security headers, request tracing. No auth, no CSRF, no audit.

**Enforcement:** GritQL rule requires every Elysia plugin file in `features/*/routes.ts` to compose either `protectedRoute` or `publicRoute`. Missing wrapper = lint error.

---

### 6. Context derived once; guards at the top of the file

Use `derive` to compute request-scoped context (current user, tenant, request ID). Use `beforeHandle` for guards (role checks, permission checks, resource ownership). Both declared at the top of the route file, visible to any reader.

**Pattern:**

```ts
import { Elysia } from 'elysia'
import { requireRole } from '@gaia/security'

export const adminRoutes = new Elysia({ prefix: '/admin', name: 'admin' })
  .use(protectedRoute)
  .derive({ as: 'scoped' }, async ({ user, request }) => ({
    requestId: crypto.randomUUID(),
    isAdmin: user.role === 'admin',
  }))
  .guard({
    beforeHandle: [requireRole('admin')],
  })
  .get('/stats', ({ user }) => adminService.stats(user.tenantId))
```

Guards that return a value short-circuit the request. `requireRole` is defined in `packages/security/src/guards.ts` and composes cleanly.

**Enforcement:** GritQL rule prefers `derive`/`guard` blocks at the top of a plugin, before route definitions. No inline auth logic inside handlers.

---

### 7. Errors via `error(status, body)` with named codes

Elysia's built-in `error()` is the idiomatic way to return non-200 responses. Error bodies come from `packages/errors/src/codes.ts`. No custom response wrappers — the old `success()`/`throwError()` from the legacy stack are removed.

**Pattern:**

```ts
// packages/errors/src/codes.ts
import { t } from 'elysia'

export const ErrorSchemas = {
  'errors.conflict': t.Object({
    code: t.Literal('CONFLICT'),
    message: t.String(),
    detail: t.Optional(t.String()),
  }),
  'errors.not-found': t.Object({
    code: t.Literal('NOT_FOUND'),
    message: t.String(),
  }),
  'errors.forbidden': t.Object({
    code: t.Literal('FORBIDDEN'),
    message: t.String(),
  }),
  // ... full catalog
}

  // In a route
  .get(
    '/:id',
    async ({ params, error }) => {
      const user = await userService.get(params.id)
      if (!user) return error(404, { code: 'NOT_FOUND', message: 'User not found' })
      return user
    },
    {
      params: 'users.params',
      response: { 200: 'users.entity', 404: 'errors.not-found' },
    },
  )
```

Services throw domain errors; the global `onError` handler in `packages/api/src/middleware/errors.ts` maps them to HTTP responses.

**Enforcement:** Oxlint rule bans `throw new Error('...')` in feature code. Error codes catalog is a TypeBox enum; typos fail at build.

---

### 8. Every route is auto-instrumented — spans, metrics, logs

`packages/api/src/middleware/observability.ts` hooks `onRequest`, `afterHandle`, and `onError` to emit OpenTelemetry spans, PostHog events (for user actions), and Sentry captures. Applied once in `defaultMiddleware`; every route inherits.

**Pattern:**

```ts
// packages/api/src/middleware/default.ts
import { Elysia } from 'elysia'
import { tracing } from './observability'
import { errorHandler } from './errors'

export const defaultMiddleware = new Elysia({ name: 'default' })
  .use(tracing) // spans per request
  .use(errorHandler) // Sentry + structured error response
```

No route ever calls `console.log`. Use the structured logger from `packages/adapters/src/logs.ts`:

```ts
import { logger } from '@gaia/adapters/logs'

logger.info('user.created', { userId: user.id, tenantId: user.tenantId })
```

**Enforcement:** Oxlint rule flags `console.*` in `apps/api/src/` and `packages/*/src/` (outside `scripts/` and tests).

---

### 9. Adapters are framework-independent

Every external capability (Polar, Resend, Dragonfly, Railway Buckets, Axiom) lives in `packages/adapters/src/<capability>.ts` as a pure TypeScript module. Adapters do not import from Elysia. Routes call adapters; adapters never know about the HTTP layer.

**Pattern:**

```ts
// packages/adapters/src/payments.ts
import Polar from '@polar-sh/sdk'
import { env } from '@gaia/config/env'
import { logger } from './logs'

const polar = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN })

export const payments = {
  async createCheckout(opts: { customerEmail: string; priceId: string }): Promise<{ url: string }> {
    const span = logger.span('adapter.payments.createCheckout', opts)
    try {
      const session = await polar.checkouts.create({
        customerEmail: opts.customerEmail,
        productPriceId: opts.priceId,
        successUrl: `${env.APP_URL}/billing/success`,
      })
      span.end({ checkoutId: session.id })
      return { url: session.url }
    } catch (err) {
      span.error(err)
      throw err
    }
  },
  // ...
}
```

The interface is capability-named (`createCheckout`), not vendor-named (`polar.checkouts.create`). Switching from Polar to Stripe = editing one file; routes unchanged.

**Enforcement:** GritQL rule disallows imports from `elysia` or `@elysiajs/*` inside `packages/adapters/src/`.

---

### 10. Tests pass the Elysia instance directly to Eden Treaty

Integration tests import the app instance and pass it to Eden Treaty. No network hop, no port allocation, no server startup. Full type safety. Fast feedback loop.

**Pattern:**

```ts
// apps/api/test/users.integration.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { app } from '../src/app'
import { resetDb, seedUser } from './helpers'

const api = treaty(app)

describe('users', () => {
  beforeEach(() => resetDb())

  it('creates a user', async () => {
    const { data, error, status } = await api.users.post({
      email: 'new@example.com',
      name: 'New User',
    })
    expect(status).toBe(201)
    expect(data?.email).toBe('new@example.com')
  })

  it('rejects duplicate email', async () => {
    await seedUser({ email: 'existing@example.com' })
    const { error, status } = await api.users.post({
      email: 'existing@example.com',
      name: 'X',
    })
    expect(status).toBe(409)
    expect(error?.value.code).toBe('CONFLICT')
  })
})
```

Service tests (`service.test.ts`) are unit tests — no Elysia, no HTTP. Pure function tests. Route tests are integration tests that go through the full Elysia request lifecycle.

**Enforcement:** All files matching `*.integration.test.ts` must import from `@elysiajs/eden` and pass an app instance. `*.test.ts` (without `.integration.`) must not import Elysia.

---

## Environment variables — fail-fast at startup

Gaia uses a TypeBox schema checked at startup, in `packages/config/src/env.ts`. A missing or invalid env var crashes the app immediately with a clear error — not a runtime surprise hours later.

```ts
// packages/config/src/env.ts
import { t } from 'elysia'
import { Value } from '@sinclair/typebox/value'

const EnvSchema = t.Object({
  DATABASE_URL: t.String({ format: 'uri' }),
  BETTER_AUTH_SECRET: t.String({ minLength: 32 }),
  POLAR_ACCESS_TOKEN: t.String(),
  RESEND_API_KEY: t.String(),
  SENTRY_DSN: t.String({ format: 'uri' }),
  AXIOM_TOKEN: t.String(),
  NODE_ENV: t.Union([t.Literal('development'), t.Literal('production'), t.Literal('test')]),
  PORT: t.Number({ default: 3000 }),
})

const parsed = Value.Parse(EnvSchema, Bun.env)
if (!Value.Check(EnvSchema, parsed)) {
  const errors = [...Value.Errors(EnvSchema, Bun.env)]
  console.error('Invalid environment configuration:')
  errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`))
  process.exit(1)
}

export const env = parsed
```

No route, service, or adapter ever reads `Bun.env` or `process.env` directly. They import `env` from this module.

---

## Quick reference

| Need             | Pattern                                   | Location                                  |
| ---------------- | ----------------------------------------- | ----------------------------------------- |
| New feature      | One plugin, one file                      | `apps/api/src/features/<name>/routes.ts`  |
| Business logic   | Pure TS, no Elysia                        | `apps/api/src/features/<name>/service.ts` |
| TypeBox schemas  | Registered via `.model()`                 | `apps/api/src/features/<name>/schema.ts`  |
| External service | Capability-named adapter                  | `packages/adapters/src/<capability>.ts`   |
| Auth enforcement | `protectedRoute` wrapper                  | `packages/security/`                      |
| Rate limiting    | Built into `protectedRoute`/`publicRoute` | `packages/security/`                      |
| Error response   | `error(status, body)` + named schema      | `packages/errors/`                        |
| Observability    | `defaultMiddleware` auto-instruments      | `packages/api/src/middleware/`            |
| Env access       | `env` object, fail-fast at startup        | `packages/config/src/env.ts`              |
| Integration test | Eden Treaty + app instance                | `apps/api/test/*.integration.test.ts`     |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Frontend patterns: `docs/reference/frontend.md`
- Database patterns: `docs/reference/database.md`
- Testing patterns: `docs/reference/testing.md`
- Security patterns: `docs/reference/security.md`
- Observability patterns: `docs/reference/observability.md`
- Error code catalog: `docs/reference/errors.md`

_This file is versioned. Changes to backend patterns require a PR; changes that contradict `code.md` require an ADR._
