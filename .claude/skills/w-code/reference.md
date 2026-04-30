# Code — How We Write Software

> Status: Constitution
> Last verified: April 2026
> Scope: All code in Gaia, authored by humans or agents

---

## What this file is

This is the constitution for code in Gaia. Every line of code — whether written by a human or an agent — follows these ten principles. If a pattern contradicts a principle, the principle wins.

This file is paired with:

- `VISION.md` — the 15 general principles and 12 architectural principles (scope: what Gaia believes, how it's organized)
- `docs/reference/*.md` — domain-specific patterns (scope: how to actually do the work)
- `.gaia/rules.ts` — the machine-readable version (scope: what tools enforce)

Principles live here. Patterns live in domain files. Enforcement lives in `rules.ts`. All three forms exist for every rule — that's general principle #6.

## Before coding

Agents entering the codebase read, in order:

1. Root `CLAUDE.md` (tiny, just routing)
2. This file (`docs/reference/code.md`) — the 10 principles
3. The domain file for whatever you're touching (see routing below)
4. Any folder-level `CLAUDE.md` that overrides global rules (see `docs/MANIFEST.md`)

## Domain routing

| You are touching...                           | Read this file                    |
| --------------------------------------------- | --------------------------------- |
| Elysia routes, adapters, backend services     | `docs/reference/backend.md`       |
| SolidStart components, styling, client routes | `docs/reference/frontend.md`      |
| Drizzle schema, migrations, SQL               | `docs/reference/database.md`      |
| Tests (unit, integration, e2e, mutation)      | `docs/reference/testing.md`       |
| Auth, rate limiting, headers, audit           | `docs/reference/security.md`      |
| Tracing, logging, metrics, events             | `docs/reference/observability.md` |
| Error codes, error handling                   | `docs/reference/errors.md`        |
| CLI tooling (Moon, Bun, Railway, Drizzle)     | `docs/reference/commands.md`      |

---

# The 10 coding principles

## 1. One schema, many consumers

Shape is defined once and every consumer derives. In Gaia:

- Drizzle table definitions in `packages/db/schema.ts` are the source for DB types
- TypeBox schemas in Elysia route definitions are the source for API contracts
- `drizzle-typebox` generates TypeBox from Drizzle where DB and API share shape
- Eden Treaty flows API types to SolidStart — no manual types on the client
- Forms in Solid derive validation schemas from the same TypeBox sources

Zero manual `type Foo = { ... }` for anything that has a schema source. If you find yourself writing a type by hand, the schema is missing.

**Enforcement:** `tsgo --noEmit` catches drift. Custom Biome GritQL rule flags manual type definitions for shapes that have a schema source.

**Anti-pattern:**

```ts
// ❌ Duplicate shape
const user = await db.select().from(users)
type User = { id: string; email: string; name: string } // manual, drifts
```

**Pattern:**

```ts
// ✅ Derived shape
import { users } from '@gaia/db/schema'
import type { InferSelectModel } from 'drizzle-orm'
type User = InferSelectModel<typeof users>
```

---

## 2. Validate at edges, trust the interior

Input crosses exactly one validation boundary. After that, code receives typed values and never re-validates.

**Boundaries in Gaia:**

- Elysia routes validate `body`, `query`, `params` via TypeBox schemas
- Form submissions validate via Solid form libraries against TypeBox
- Adapter calls validate external responses at the adapter seam
- DB reads are typed by Drizzle (no runtime validation needed)

Inside a service or feature, there is no defensive parsing, no `??` fallbacks on trusted data, no `unknown`/`any` type annotations.

**Enforcement:** Oxlint rule disallows `unknown` and `any` in `apps/api/src/features/` and `packages/*/src/`. Custom GritQL rule requires TypeBox schemas on every Elysia route with `body`, `query`, or `params`.

**Anti-pattern:**

```ts
// ❌ Defensive parsing in the interior
function calculateTotal(order: unknown) {
  const items = (order as any).items ?? []
  return items.reduce((sum: any, item: any) => sum + (item?.price ?? 0), 0)
}
```

**Pattern:**

```ts
// ✅ Types trusted at the interior
function calculateTotal(order: Order): Cents {
  return order.items.reduce((sum, item) => sum + item.price, 0)
}
```

---

## 3. Named errors, no swallowing

Every error path has a named code in `packages/errors/codes.ts`. Services throw via `throwError('CODE', context?)`. Routes let errors propagate — Elysia's error handler maps codes to HTTP status and structured JSON.

**Rules:**

- No `catch (e)` without either re-throwing or handling a specific error type
- No silent returns on failure
- No ad-hoc `throw new Error('message')` in feature or service code
- Error codes are generated from a TypeBox enum so typos fail at build

**Enforcement:** Oxlint rule bans bare `catch` blocks that don't re-throw or call a handler. Error codes are a const object; TypeScript autocompletes and typos fail.

**Anti-pattern:**

```ts
// ❌ Ad-hoc errors, swallowing
try {
  await db.insert(users).values(data)
} catch (e) {
  console.error(e)
  return null
}
```

**Pattern:**

```ts
// ✅ Named errors, propagation
import { throwError } from '@gaia/errors'

try {
  await db.insert(users).values(data)
} catch (e) {
  if (isUniqueViolation(e)) throwError('USER_EMAIL_TAKEN')
  throw e // unexpected; propagate to Elysia error handler
}
```

---

## 4. Components and routes do three things: call, pass, render

SolidStart routes and components do only these operations:

1. **Call** — a service, `createResource`, `createSignal`, or hook
2. **Pass** — the result to child components as props
3. **Render** — JSX, using `<Show>` and `<For>` for conditionals and lists

What's forbidden in a route or page component:

- Data transformation (`.map().filter().reduce()` on resource output)
- Business logic (branching on domain conditions)
- Conditionals beyond loading/error states
- Inline object construction for domain data

If you need to transform data, put it in the service that returns the data, or in a typed helper in the feature folder. If you need logic, put it in a Solid signal or a service.

**Enforcement:** Custom Biome GritQL rule detects forbidden operations in `apps/web/src/routes/` and pages. Line count becomes emergent, not enforced.

**Anti-pattern:**

```tsx
// ❌ Route doing business logic
export default function Dashboard() {
  const user = useUser()
  const orders = createResource(() => fetchOrders(user.id))
  const totalThisMonth = orders()
    .filter((o) => isThisMonth(o.createdAt))
    .reduce((sum, o) => sum + o.total, 0)
  return <div>Total: {formatCents(totalThisMonth)}</div>
}
```

**Pattern:**

```tsx
// ✅ Route calls, passes, renders
export default function Dashboard() {
  const [summary] = createResource(() => fetchMonthlySummary())
  return (
    <Show when={summary()} fallback={<Skeleton />}>
      {(data) => <SummaryCard summary={data()} />}
    </Show>
  )
}
```

---

## 5. Conventions live in predictable places

Every recurring concern has exactly one canonical location. If an agent has to grep for "where does X go," the convention has failed.

| Concern               | Location                                               |
| --------------------- | ------------------------------------------------------ |
| Environment variables | `packages/config/src/env.ts`                           |
| Feature flags         | `packages/config/src/flags.ts`                         |
| Error codes           | `packages/errors/src/codes.ts`                         |
| DB schema             | `packages/db/src/schema.ts`                            |
| DB migrations         | `packages/db/migrations/`                              |
| External adapters     | `packages/adapters/src/*.ts` (one file per capability) |
| iii workflows         | `packages/workflows/*.ts`                              |
| API response helpers  | `packages/api/src/responses.ts`                        |
| Shared middleware     | `packages/api/src/middleware/`                         |
| Design tokens         | `packages/ui/src/tokens.ts`                            |
| Auth logic            | `packages/auth/src/`                                   |
| Rate limit / security | `packages/security/src/`                               |
| Feature slices        | `apps/api/src/features/<feature>/`                     |
| Solid components      | `apps/web/src/components/`                             |
| Solid routes          | `apps/web/src/routes/`                                 |

**Enforcement:** Structural lint rules + Moon workspace boundaries prevent drift. `packages/config` never imports from `features/`; `features/` never imports from sibling features.

---

## 6. Agents duplicate; humans extract

Agents write copy-pasted code freely. They do not invent abstractions. Extraction happens when all three are true:

- The same pattern appears **3+ times**
- The occurrences share the **same reason to change** (not just the same shape)
- A **human reviewer** has read all occurrences and confirmed the abstraction

This inverts classical DRY. Duplication is cheap and recoverable. Wrong abstraction is expensive and sticky. Agents are statistically worse at picking correct abstractions than at duplicating — they cluster on surface similarity rather than conceptual identity.

**What this means in practice:**

- An agent writing the fifth feature can copy the auth pattern from the fourth feature
- An agent does not extract "helper functions" to a `utils.ts` on its own
- When a human extracts, they write an ADR explaining the abstraction and its expected change profile

**Enforcement:** No tool enforcement (this is a meta-principle about abstraction). Violations show up as over-abstracted code in `/review`. The `/review` skill flags files that look like agent-invented abstractions: generic names (`helpers.ts`, `utils.ts`), broad type parameters, single-caller utilities.

---

## 7. Test behavior at public surfaces; mutation-test the interior

Tests cover the contract a module promises:

- **Exported functions** in packages get unit tests
- **API routes** get integration tests (hit the route, assert response shape)
- **Solid components** get test for prop handling and user interactions
- **E2E flows** get Playwright tests for the critical happy paths

**Mutation testing** confirms that the interior is actually exercised. A mutation test deliberately changes a line of code (e.g., `>` becomes `>=`); if no test catches the change, coverage is fake.

**What doesn't get tested:**

- Pure wiring (a route that calls a service and returns the result — the service gets tested)
- Generated code (Drizzle types, Eden Treaty types)
- Type-only re-exports

**Coverage thresholds in CI:**

- 100% of exported functions in `packages/` have a test file (custom script)
- Mutation score ≥80% for `packages/*/src/`
- No uncovered branches in `apps/api/src/features/*/service.ts`

**Enforcement:** `check-tests-exist.ts` script in `scripts/`. Bun test with coverage flag. Stryker-equivalent for mutation (tool TBD; spec in `docs/reference/testing.md`).

---

## 8. Every boundary emits observability

Every boundary that data crosses emits exactly one observability signal. No boundary is silent.

| Boundary                        | Signal                   | Tool                      |
| ------------------------------- | ------------------------ | ------------------------- |
| HTTP request enters API         | Trace span               | OpenTelemetry → Axiom     |
| Error thrown                    | Error event with context | Sentry                    |
| User action completed           | Product event            | PostHog                   |
| Adapter call (external service) | Structured log           | Axiom                     |
| iii workflow step               | Step event               | iii engine + Axiom        |
| Auth state change               | Audit log                | `packages/security/audit` |

When you ask "why did X happen," the answer exists in exactly one place. Logs are structured JSON, not formatted strings. `console.log` is forbidden in shipped code.

**Enforcement:** Elysia middleware in `packages/api/src/middleware/` auto-instruments every route with tracing. Adapter wrappers in `packages/adapters/` require logs in the wrapper. Oxlint rule flags `console.log`/`console.error` outside `scripts/` and tests.

**Pattern:**

```ts
// ✅ Structured, observability-aware
import { logger } from '@gaia/adapters/logs'

export async function sendEmail(to: string, template: EmailTemplate) {
  const span = logger.span('adapter.email.send', { to, template: template.name })
  try {
    const result = await resend.emails.send(...)
    span.end({ id: result.id })
    return result
  } catch (err) {
    span.error(err)
    throw err
  }
}
```

---

## 9. Security is opinionated, not optional

`packages/security/` enforces, by default, on every request:

- **Rate limiting** (via `@upstash/ratelimit` + Dragonfly)
- **Security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **CSRF protection** (Better Auth CSRF tokens on mutations)
- **Audit logging** (every mutation logs: who, what, when, state diff)
- **Better Auth session enforcement** on protected routes

Disabling any default requires a comment with an ADR reference explaining why.

Secrets never appear in logs. Rate limits apply to every public endpoint unless explicitly exempted. Auth is enforced at the middleware layer; a route without auth middleware is not reachable.

**Enforcement:** Elysia middleware composition in `packages/api/src/middleware/default.ts` — routes opt _out_ explicitly, not in. `gitleaks` + `semgrep` in CI. Custom GritQL rule requires every route file to apply either `publicRoute()` or `protectedRoute()` wrapper.

---

## 10. Code Health is a gate, not a guideline

Every PR runs the `/review` skill, which executes:

- `tsgo --noEmit` (typecheck)
- `oxlint` + custom Biome GritQL rules (lint)
- `oxfmt --check` (format)
- `knip --production` (dead code)
- Bun test (unit + integration)
- Playwright on critical paths (e2e)
- Mutation test sample
- `size-limit` (bundle budgets)
- Custom code health scoring (complexity, duplication, cohesion)

Regressions on any metric block merge. The gate is mechanical; the review conversation is about design and intent, not hygiene.

**Enforcement:** GitHub Actions required checks. Pre-commit hook runs a fast subset (type + lint + format + unit tests for changed files). Claude Code `/review` skill runs the full suite on demand.

**Budgets** (enforced in CI):

| Metric                     | Budget          |
| -------------------------- | --------------- |
| Client JS bundle           | ≤ 50 KB gzipped |
| API p95 latency            | ≤ 500 ms        |
| Lighthouse performance     | ≥ 90            |
| DB queries per request     | ≤ 5             |
| Mutation score (packages)  | ≥ 80%           |
| Code Health score (target) | ≥ 9.0           |

---

# Enforcement mapping

Every principle exists in three forms: document (this file, judgment), mechanism (tool, enforcement), policy (`.gaia/rules.ts`, single source). This is general principle #6 made concrete for code.

| #   | Principle                   | Mechanism                                                       | Policy                |
| --- | --------------------------- | --------------------------------------------------------------- | --------------------- |
| 1   | One schema, many consumers  | `tsgo` + GritQL rule                                            | `rules.schemaSource`  |
| 2   | Validate at edges           | Oxlint `no-unknown-in-interior` + GritQL `require-route-schema` | `rules.validation`    |
| 3   | Named errors                | Oxlint `no-bare-catch` + typed error codes                      | `rules.errors`        |
| 4   | Three things                | GritQL `route-operations`                                       | `rules.routeShape`    |
| 5   | Predictable places          | Moon workspace boundaries + path lint                           | `rules.conventions`   |
| 6   | Agents duplicate            | `/review` heuristic flags                                       | `rules.abstraction`   |
| 7   | Boundary + mutation testing | `check-tests-exist.ts` + mutation tool                          | `rules.testing`       |
| 8   | Observability at boundaries | Middleware auto-instrument + lint                               | `rules.observability` |
| 9   | Opinionated security        | Default middleware + GritQL `require-route-wrapper`             | `rules.security`      |
| 10  | Code Health gate            | CI required checks + `/review` skill                            | `rules.quality`       |

---

# Anti-principles (what Gaia rejects)

Classical principles that do **not** apply, or apply in inverted form:

| Classical principle                       | Gaia position                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DRY** (eliminate all duplication)       | **Rejected.** Agents duplicate; humans extract after 3+ with shared change reason.                                                                               |
| **100% coverage target**                  | **Rejected.** Boundary testing + mutation score. Coverage percentage alone is gameable.                                                                          |
| **SOLID/OCP** (open for extension)        | **Downweighted.** Gaia is a template; users fork and modify. Extension points are explicit, not speculative.                                                     |
| **Law of Demeter** (only talk to friends) | **Downweighted.** In typed TypeScript with Eden Treaty, traversing types is safe and expected. The real rule is principle #5: conventions in predictable places. |
| **KISS / YAGNI**                          | **Preserved.** But "simple" means "legible to agents," which is a stricter bar than "legible to humans."                                                         |
| **Premature optimization is evil**        | **Preserved with caveat.** Performance budgets (principle #10) are not premature — they prevent regression, not optimize prematurely.                            |

---

# How agents use this file

1. **Session start** — root `CLAUDE.md` routes the agent here for any code task.
2. **Before editing** — agent reads this file + the relevant domain file from the routing table above.
3. **During editing** — agent follows the principles. If a principle seems to conflict with a pattern in a domain file, the principle wins (and the domain file gets a PR to fix).
4. **Before committing** — `/review` skill runs the enforcement suite. Regressions block the commit.
5. **On pattern repetition** — agent duplicates (principle #6). On the third occurrence, the agent flags for human extraction decision.

---

_This file is versioned. Changes to the principles require an ADR in `docs/adr/`. Changes to enforcement mechanisms do not require an ADR but must update `.gaia/rules.ts` and this file together._

---

# Testing — Bun test + Eden Treaty + Playwright + Stryker

> Status: Reference
> Last verified: April 2026
> Scope: All test code across the monorepo; CI quality gates

---

## What this file is

The stack-specific patterns for tests in Gaia. These patterns implement the 10 coding principles from `code.md` — particularly principle #7 (test behavior at public surfaces; mutation-test the interior) and principle #10 (Code Health is a gate, not a guideline).

Read `code.md` first. This file is the concrete _how_.

**Key context:** Bun's built-in test runner is 3-10x faster than Vitest and 10-20x faster than Jest on large codebases. Eden Treaty lets integration tests pass the Elysia instance directly (no network hop). Playwright is the default E2E tool for 2026. Stryker handles mutation testing for unit and integration tests; E2E tests are too slow for mutation.

---

## The 10 testing patterns

### 1. Testing pyramid: ~80% unit, ~15% integration, ~5% E2E

The old "100% unit coverage" target is dead. Modern testing distributes effort by what each test type is good at:

| Test type   | Count | Speed        | Coverage of...                                            |
| ----------- | ----- | ------------ | --------------------------------------------------------- |
| Unit        | ~80%  | < 1ms each   | Pure functions, services, adapters, reducers              |
| Integration | ~15%  | < 100ms each | Routes (via Eden), DB queries, adapter ↔ external service |
| E2E         | ~5%   | 1-10s each   | Critical user flows: auth, billing, onboarding            |

A test suite dominated by integration tests is a smell — agents tend to write them because they're easier to set up ("just hit the route"). Unit tests force you to decompose.

**CI enforcement:** Ratios computed from file counts in `scripts/test-ratio-check.ts`. Deviations beyond 15% trigger a warning in `/review`.

---

### 2. Unit tests are pure — no I/O, no DB, no network

A unit test that touches the filesystem, DB, or network is not a unit test. It's an integration test in disguise — slower, flakier, and harder to debug. Unit tests cover pure functions: given input, produce output.

**Pattern:**

```ts
// apps/api/src/features/billing/service.test.ts
import { describe, it, expect } from 'bun:test'
import { calculateProration } from './service'

describe('calculateProration', () => {
  it('returns zero when switching on the renewal date', () => {
    const result = calculateProration({
      currentPlanCents: 1000,
      newPlanCents: 2000,
      daysIntoCycle: 0,
      cycleDays: 30,
    })
    expect(result).toBe(0)
  })

  it('charges the full difference mid-cycle', () => {
    const result = calculateProration({
      currentPlanCents: 1000,
      newPlanCents: 2000,
      daysIntoCycle: 15,
      cycleDays: 30,
    })
    expect(result).toBe(500) // half a cycle worth of the difference
  })

  it('handles downgrade as a credit', () => {
    const result = calculateProration({
      currentPlanCents: 2000,
      newPlanCents: 1000,
      daysIntoCycle: 15,
      cycleDays: 30,
    })
    expect(result).toBe(-500)
  })
})
```

`calculateProration` is pure. No DB. No Polar. Just math. The test runs in microseconds. Compose a thousand of these and the suite stays under 5 seconds.

**Enforcement:** Oxlint rule — `*.test.ts` files (without `.integration.` or `.e2e.`) cannot import from `@gaia/db`, `@gaia/adapters`, or call `fetch`.

---

### 3. Integration tests use real services — no heavy mocking

Integration tests hit a real Elysia app (via Eden Treaty, no network) and a real Neon branch. Mocking here defeats the purpose — if you mocked the DB, you can't claim the code works with the DB.

**Pattern:**

```ts
// apps/api/test/users.integration.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { app } from '../src/app'
import { migrateTestDb, seedTest, resetTestDb } from '@gaia/testing/db'

const api = treaty(app)

beforeAll(async () => {
  await migrateTestDb()
})

describe('POST /users', () => {
  beforeEach(async () => {
    await resetTestDb()
    await seedTest()
  })

  it('creates a user with valid payload', async () => {
    const { data, status } = await api.users.post({
      email: 'new@example.com',
      name: 'New User',
    })
    expect(status).toBe(201)
    expect(data?.email).toBe('new@example.com')
  })

  it('rejects duplicate email', async () => {
    await api.users.post({ email: 'taken@example.com', name: 'A' })
    const { error, status } = await api.users.post({ email: 'taken@example.com', name: 'B' })
    expect(status).toBe(409)
    expect(error?.value.code).toBe('CONFLICT')
  })

  it('requires authentication', async () => {
    // api has no auth token; request should fail
    const { status } = await api.users.post({ email: 'x@y.com', name: 'X' })
    expect(status).toBe(401)
  })
})
```

`api` is bound to the real Elysia app via `treaty(app)`. No network. Full type safety. DB calls hit the Neon PR branch. External adapters (Resend, Polar) use in-memory test doubles from `packages/testing/adapters/`.

**Enforcement:** Files named `*.integration.test.ts` must import `treaty` from `@elysiajs/eden` with an app instance. Heavy use of `mock.module()` inside `*.integration.test.ts` triggers a `/review` flag.

---

### 4. E2E tests cover critical paths only

Playwright is the default E2E tool in 2026 — cross-browser (Chromium, Firefox, WebKit), parallel by default, trace-based debugging. But E2E tests are slow (1-10s each). Budget ruthlessly.

**Critical paths for Gaia v1:**

- **Auth flow**: sign up → verify email → sign in → sign out
- **Billing flow**: sign in → start checkout → complete payment → view subscription
- **Onboarding flow**: sign up → land on dashboard → first meaningful action

Everything else is covered by unit + integration.

**Pattern (using Feature Object, not Page Object):**

```ts
// apps/web/test/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'
import { AuthFeature } from '@gaia/testing/e2e/features/auth'

test('user signs up and lands on dashboard', async ({ page }) => {
  const auth = new AuthFeature(page)

  await auth.goToSignUp()
  await auth.fillSignUpForm({
    email: 'new@example.com',
    password: 'secure-password',
    name: 'Test User',
  })
  await auth.submitSignUp()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
})
```

```ts
// packages/testing/src/e2e/features/auth.ts
import { Page } from '@playwright/test'

export class AuthFeature {
  constructor(private page: Page) {}

  async goToSignUp() {
    await this.page.goto('/sign-up')
    await this.page.getByRole('heading', { name: /create account/i }).waitFor()
  }

  async fillSignUpForm({
    email,
    password,
    name,
  }: {
    email: string
    password: string
    name: string
  }) {
    await this.page.getByLabel(/email/i).fill(email)
    await this.page.getByLabel(/password/i).fill(password)
    await this.page.getByLabel(/name/i).fill(name)
  }

  async submitSignUp() {
    await this.page.getByRole('button', { name: /sign up/i }).click()
  }
}
```

Locators use `getByRole`, `getByLabel`, `getByText` — not CSS selectors. Web-first assertions (`expect(locator).toBeVisible()`) auto-wait for elements. Traces record on failure.

**Enforcement:** E2E test files live in `apps/web/test/e2e/`. Max 20 files in v1 (one per critical path). New E2E tests require justification in PR description.

---

### 5. Mutation score ≥80% for `packages/`

Coverage tells you what executed; mutation testing tells you whether your tests catch bugs. A mutation score above 80% indicates a strong test suite.

**Setup:**

```ts
// stryker.conf.mjs
export default {
  packageManager: 'bun',
  testRunner: 'command',
  commandRunner: { command: 'bun test' },
  mutate: ['packages/*/src/**/*.ts', '!packages/*/src/**/*.test.ts', '!packages/*/src/index.ts'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  thresholds: { high: 85, low: 70, break: 80 },
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',
  concurrency: 4,
  timeoutMS: 30000,
}
```

**Cadence:**

- **Weekly** (scheduled GitHub Action): full mutation test on `main`
- **Release** (on release PR): full mutation test; `break` threshold must pass
- **PR** (opt-in): `/review mutation` on request

Running mutation on every PR is too slow. High-quality tests + coverage on every PR; mutation as periodic audit.

**Enforcement:** Weekly scheduled workflow `.github/workflows/scheduled.yml`. Release workflow blocks on mutation threshold. Stryker dashboard tracked in `docs/reference/quality.md`.

---

### 6. Security defaults have behavior tests

The opinions in `packages/security/` are only real if tested. Write tests that verify:

- `publicRoute()` enforces rate limits (hit it N+1 times, expect 429)
- `protectedRoute()` rejects unauthenticated (no token, expect 401)
- `protectedRoute()` rejects expired tokens (expect 401)
- Mutations require CSRF tokens
- Audit logs are written on mutations

**Pattern:**

```ts
// packages/security/test/middleware.integration.test.ts
import { describe, it, expect } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { createTestApp } from '@gaia/testing/app'

describe('protectedRoute', () => {
  it('rejects requests without an auth cookie', async () => {
    const app = createTestApp()
    const api = treaty(app)
    const { status } = await api.users.get()
    expect(status).toBe(401)
  })

  it('rejects expired session tokens', async () => {
    const app = createTestApp()
    const api = treaty(app, { headers: { cookie: expiredSessionCookie() } })
    const { status } = await api.users.get()
    expect(status).toBe(401)
  })
})

describe('rate limiting', () => {
  it('returns 429 after exceeding the limit on public routes', async () => {
    const app = createTestApp()
    const api = treaty(app)

    for (let i = 0; i < 10; i++) {
      await api.auth.login.post({ email: 'x@y.com', password: 'wrong' })
    }
    const { status } = await api.auth.login.post({ email: 'x@y.com', password: 'wrong' })
    expect(status).toBe(429)
  })
})
```

**Enforcement:** `packages/security/` is required to have ≥90% mutation score (higher bar than other packages). Behavior tests live in `packages/security/test/`.

---

### 7. Load tests on critical routes with p95 budgets

Unit + integration tests don't catch "this route falls over at 100 req/s." Load tests do.

**Critical routes for v1:**

- `POST /auth/login` (traffic spikes during incidents)
- `POST /api/checkout/complete` (Polar webhook callbacks)
- `GET /api/dashboard` (hot path for logged-in users)

**Tool:** `autocannon` (Bun-compatible, minimal setup). `k6` as an alternative for more complex scenarios.

**Pattern:**

```ts
// apps/api/test/load/login.load.ts
import autocannon from 'autocannon'

const result = await autocannon({
  url: 'http://localhost:3000/auth/login',
  method: 'POST',
  duration: 10,
  connections: 50,
  body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
  headers: { 'content-type': 'application/json' },
})

if (result.latency.p95 > 200) {
  console.error(`p95 latency ${result.latency.p95}ms exceeds 200ms budget`)
  process.exit(1)
}
```

**Cadence:** Load tests run on release PRs (pre-release gate). Weekly scheduled run on `main`.

---

### 8. Snapshots only for stable output — never for UI components

Snapshot tests rot. When a snapshot fails, the easy action is to update it — which defeats the test. Rules:

**Snapshots OK for:**

- Generated JSON (API responses of a fixed contract)
- Generated HTML (transactional emails)
- CLI output (help text, table formatting)
- Migration SQL (to catch unintended schema changes)

**Snapshots NOT OK for:**

- Solid components (markup changes frequently; snapshot becomes noise)
- Error messages (wording changes; use `expect().toContain()` instead)
- Dates/timestamps (always changing; mock or exclude)

**Pattern:**

```ts
// Generated email HTML — stable output
import { renderWelcomeEmail } from '@gaia/emails/welcome'

it('renders welcome email', () => {
  const html = renderWelcomeEmail({ name: 'Ada', appUrl: 'https://app.gaia.dev' })
  expect(html).toMatchSnapshot()
})
```

**Enforcement:** Snapshot tests in `apps/web/` are flagged by `/review` (should be E2E or Solid Testing Library tests instead). Accepted snapshots review in PR.

---

### 9. Test names read as sentences

A test name is documentation. The function being tested is implicit from the file and `describe` block. The test name describes the specific behavior.

**Anti-pattern:**

```ts
it('test1', () => {
  /* ... */
})
it('test duplicate', () => {
  /* ... */
})
it('should work', () => {
  /* ... */
})
it('createUser function creates a user', () => {
  /* ... */
})
```

**Pattern:**

```ts
describe('createUser', () => {
  it('rejects duplicate email with CONFLICT error', () => {
    /* ... */
  })
  it('normalizes email to lowercase before storing', () => {
    /* ... */
  })
  it('hashes the password with argon2id', () => {
    /* ... */
  })
  it('emits a user.created event on success', () => {
    /* ... */
  })
})
```

Reading the `describe` + `it` together should form a complete English sentence describing the behavior.

**Enforcement:** `/review` skill flags test names that don't start with a verb or are under 4 words. Informational, not blocking.

---

### 10. Test environment centralized in `packages/testing/`

Tests need a specialized environment: a Neon PR branch instead of production DB, in-memory fakes for external services, auth bypass tokens for integration, deterministic time.

All of this lives in `packages/testing/`:

```
packages/testing/src/
├── app.ts                 # createTestApp() — Elysia with test middleware
├── db/
│   ├── migrate.ts         # migrateTestDb() — runs migrations against PR branch
│   ├── seed.ts            # re-exports from @gaia/db/seed/test
│   └── reset.ts           # resetTestDb() — truncate all tables
├── adapters/
│   ├── email.ts           # in-memory email capture
│   ├── payments.ts        # in-memory Polar fake
│   ├── storage.ts         # in-memory object store
│   └── llm.ts             # deterministic LLM fake
├── auth/
│   ├── sessions.ts        # create test sessions (bypass flow)
│   └── tokens.ts           # expired/valid test tokens
├── fixtures/
│   ├── users.ts           # typed fixture factories
│   └── billing.ts
├── e2e/
│   ├── features/          # Feature Objects (auth, billing, etc.)
│   └── helpers.ts         # shared Playwright utilities
└── time.ts                # freeze/advance time for tests
```

Tests import from `@gaia/testing` — never invent their own setup. New test utilities are added here, not inlined in test files.

**Enforcement:** Oxlint rule — test files cannot declare `createTestApp`, `migrateTestDb`, or similar helpers; they must import from `@gaia/testing`.

---

## `bunfig.toml` configuration

```toml
[test]
# Preload the global test setup (env, time, etc.)
preload = ["./packages/testing/src/setup.ts"]

# Coverage
coverage = true
coverageSkipTestFiles = true
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"

# Per-metric thresholds
[test.coverageThreshold]
lines = 0.85
functions = 0.85
branches = 0.75
statements = 0.85

# Concurrency: unit tests run concurrent, integration tests sequential
[[test.concurrency]]
match = "**/*.test.ts"
concurrent = true

[[test.concurrency]]
match = "**/*.integration.test.ts"
concurrent = false
```

---

## Test file naming

| Pattern                 | Type             | Concurrency        | Imports DB?              |
| ----------------------- | ---------------- | ------------------ | ------------------------ |
| `*.test.ts`             | Unit             | Concurrent         | No (lint-enforced)       |
| `*.integration.test.ts` | Integration      | Sequential         | Yes, via `@gaia/testing` |
| `*.load.ts`             | Load             | Manual / release   | Yes                      |
| `*.spec.ts`             | E2E (Playwright) | Playwright workers | No (UI only)             |

---

## Test doubles — when you can't avoid them

Even integration tests can't hit real Resend, real Polar, real Stripe. Use fakes, not mocks.

**Fake** = a working alternative implementation with in-memory state.
**Mock** = a stub that returns canned responses.

Fakes are better because tests verify behavior — "did the email get sent?" — not just "was the mock called?"

**Example: `packages/testing/src/adapters/email.ts`**

```ts
type CapturedEmail = { to: string; subject: string; html: string }

export class EmailFake {
  captured: CapturedEmail[] = []

  async send(email: CapturedEmail) {
    this.captured.push(email)
  }

  lastEmail() {
    return this.captured[this.captured.length - 1]
  }

  emailsTo(address: string) {
    return this.captured.filter((e) => e.to === address)
  }

  reset() {
    this.captured = []
  }
}
```

Test asserts: `expect(emailFake.emailsTo('ada@example.com')).toHaveLength(1)`. Verifies the behavior, not the mock call.

---

## CI quality gate

`/review` skill runs the full suite before merge:

1. `tsgo --noEmit` (type check)
2. `oxlint` + custom rules (lint)
3. `oxfmt --check` (format)
4. `knip --production` (dead code)
5. `bun test` (unit + integration)
6. `bun test --coverage` (thresholds enforced)
7. Playwright critical paths (`--grep @critical`)
8. `size-limit` (bundle budget)
9. Security scans (`gitleaks`, `osv-scanner`, `semgrep`)

Mutation test + load test + full E2E run weekly or on release — too slow for every PR.

---

## Quick reference

| Need                     | Pattern                                              | Location                         |
| ------------------------ | ---------------------------------------------------- | -------------------------------- |
| Unit test (pure)         | `*.test.ts` alongside source                         | Feature folder                   |
| Integration test         | `*.integration.test.ts` with Eden Treaty             | `apps/api/test/`                 |
| E2E test                 | `*.spec.ts` with Playwright Feature Objects          | `apps/web/test/e2e/`             |
| Load test                | `*.load.ts` with autocannon/k6                       | `apps/api/test/load/`            |
| Mutation test            | Stryker weekly + on release                          | `stryker.conf.mjs`               |
| Security test            | `*.integration.test.ts` in `packages/security/test/` | `packages/security/`             |
| Snapshot (stable output) | `toMatchSnapshot()` for JSON/HTML/CLI                | Anywhere                         |
| Test double              | In-memory fake with captured state                   | `packages/testing/adapters/`     |
| Fixture                  | Typed factory function                               | `packages/testing/fixtures/`     |
| E2E Feature Object       | Class wrapping related user actions                  | `packages/testing/e2e/features/` |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Frontend patterns: `docs/reference/frontend.md`
- Database patterns: `docs/reference/database.md`
- Security patterns: `docs/reference/security.md`

_This file is versioned. Changes that contradict `code.md` require an ADR._

---

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
  - iii workflow steps (retry decision depends on error type)
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

### 7. Retryable flag drives iii and client behavior

Infrastructure errors (timeout, service down) are retryable. Business errors (conflict, validation, not found) are not. The catalog's `retryable` field drives:

- **iii workflow steps**: throw on infrastructure failure (iii retries per queue config); return a failure-shape payload for business errors (no retry)
- **Client (Solid)**: retry network error on `retryable: true`; show immediate error for `false`
- **Rate limiter**: `RATE_LIMITED` is retryable after `Retry-After`

**Pattern (iii step):**

```ts
// packages/workflows/billing.ts
import { iii, logger } from './index'
import { GaiaError } from '@gaia/errors'

export const syncSubscriptionRef = iii.registerFunction(
  'billing::sync-subscription',
  async ({ payload }) => {
    const { subscriptionId, status } = payload as { subscriptionId: string; status: string }
    try {
      await db.update(subscriptions).set({ status }).where(eq(subscriptions.id, subscriptionId))
      return { synced: subscriptionId }
    } catch (e) {
      if (e instanceof GaiaError && !e.retryable) {
        // Business error — return failure shape; iii will not retry.
        logger.warn('billing.sync.fatal', { code: e.code })
        return { failed: true, code: e.code }
      }
      throw e // iii retries per queue config
    }
  },
)
```

iii has no `NonRetriableError` class today — encode "fatal" via the return value (see `packages/workflows/CLAUDE.md` #6).

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
    // Queue for retry via iii
    await iii.trigger({
      function_id: 'email::retry',
      payload: { userId: user.id, template, idempotencyKey: `email-retry-${user.id}-${template}` },
      action: TriggerAction.Enqueue({ queue: 'email-dlq' }),
    })
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

| Need                   | Pattern                                                         |
| ---------------------- | --------------------------------------------------------------- |
| Throw a domain error   | `throwError('CODE', { context: {...} })`                        |
| Wrap an external error | `throwError('CODE', { cause: e, context: {...} })`              |
| Catch specific error   | `if (e instanceof GaiaError && e.code === 'X')`                 |
| Get HTTP status        | Automatic via `onError` middleware                              |
| Client-facing message  | Automatic via `userFacingMessage()`                             |
| Retry decision (iii)   | Throw → retry per queue config; return failure shape → no retry |
| Parse LLM response     | `parseLLMResponse()` returns `Result<T, E>`                     |
| Catch boundary in UI   | `<ErrorBoundary fallback={...}>`                                |
| Redaction in logs      | Automatic via logger                                            |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Frontend patterns: `docs/reference/frontend.md`
- Testing patterns: `docs/reference/testing.md`
- Security patterns: `docs/reference/security.md`
- Observability patterns: `docs/reference/observability.md`

_This file is versioned. Changes that contradict `code.md` require an ADR._
