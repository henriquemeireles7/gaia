# Testing — Bun test + Eden Treaty + Playwright + Stryker

> Status: Reference
> Last verified: April 2026
> Scope: All test code across the monorepo; CI quality gates

---

## What this file is

The stack-specific patterns for tests in Gaia. These patterns implement the 10 coding principles from `code.md` — particularly principle #7 (test behavior at public surfaces; mutation-test the interior) and principle #10 (Code Health is a gate, not a guideline).

Read `code.md` first. This file is the concrete *how*.

**Key context:** Bun's built-in test runner is 3-10x faster than Vitest and 10-20x faster than Jest on large codebases. Eden Treaty lets integration tests pass the Elysia instance directly (no network hop). Playwright is the default E2E tool for 2026. Stryker handles mutation testing for unit and integration tests; E2E tests are too slow for mutation.

---

## The 10 testing patterns

### 1. Testing pyramid: ~80% unit, ~15% integration, ~5% E2E

The old "100% unit coverage" target is dead. Modern testing distributes effort by what each test type is good at:

| Test type | Count | Speed | Coverage of... |
|---|---|---|---|
| Unit | ~80% | < 1ms each | Pure functions, services, adapters, reducers |
| Integration | ~15% | < 100ms each | Routes (via Eden), DB queries, adapter ↔ external service |
| E2E | ~5% | 1-10s each | Critical user flows: auth, billing, onboarding |

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

  async fillSignUpForm({ email, password, name }: { email: string; password: string; name: string }) {
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
  mutate: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/index.ts',
  ],
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
it('test1', () => { /* ... */ })
it('test duplicate', () => { /* ... */ })
it('should work', () => { /* ... */ })
it('createUser function creates a user', () => { /* ... */ })
```

**Pattern:**
```ts
describe('createUser', () => {
  it('rejects duplicate email with CONFLICT error', () => { /* ... */ })
  it('normalizes email to lowercase before storing', () => { /* ... */ })
  it('hashes the password with argon2id', () => { /* ... */ })
  it('emits a user.created event on success', () => { /* ... */ })
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

| Pattern | Type | Concurrency | Imports DB? |
|---|---|---|---|
| `*.test.ts` | Unit | Concurrent | No (lint-enforced) |
| `*.integration.test.ts` | Integration | Sequential | Yes, via `@gaia/testing` |
| `*.load.ts` | Load | Manual / release | Yes |
| `*.spec.ts` | E2E (Playwright) | Playwright workers | No (UI only) |

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

| Need | Pattern | Location |
|---|---|---|
| Unit test (pure) | `*.test.ts` alongside source | Feature folder |
| Integration test | `*.integration.test.ts` with Eden Treaty | `apps/api/test/` |
| E2E test | `*.spec.ts` with Playwright Feature Objects | `apps/web/test/e2e/` |
| Load test | `*.load.ts` with autocannon/k6 | `apps/api/test/load/` |
| Mutation test | Stryker weekly + on release | `stryker.conf.mjs` |
| Security test | `*.integration.test.ts` in `packages/security/test/` | `packages/security/` |
| Snapshot (stable output) | `toMatchSnapshot()` for JSON/HTML/CLI | Anywhere |
| Test double | In-memory fake with captured state | `packages/testing/adapters/` |
| Fixture | Typed factory function | `packages/testing/fixtures/` |
| E2E Feature Object | Class wrapping related user actions | `packages/testing/e2e/features/` |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Frontend patterns: `docs/reference/frontend.md`
- Database patterns: `docs/reference/database.md`
- Security patterns: `docs/reference/security.md`

*This file is versioned. Changes that contradict `code.md` require an ADR.*
