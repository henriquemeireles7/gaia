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

| You are touching... | Read this file |
|---|---|
| Elysia routes, adapters, backend services | `docs/reference/backend.md` |
| SolidStart components, styling, client routes | `docs/reference/frontend.md` |
| Drizzle schema, migrations, SQL | `docs/reference/database.md` |
| Tests (unit, integration, e2e, mutation) | `docs/reference/testing.md` |
| Auth, rate limiting, headers, audit | `docs/reference/security.md` |
| Tracing, logging, metrics, events | `docs/reference/observability.md` |
| Error codes, error handling | `docs/reference/errors.md` |
| CLI tooling (Moon, Bun, Railway, Drizzle) | `docs/reference/commands.md` |

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
  const totalThisMonth = orders().filter(o => 
    isThisMonth(o.createdAt)
  ).reduce((sum, o) => sum + o.total, 0)
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

| Concern | Location |
|---|---|
| Environment variables | `packages/config/src/env.ts` |
| Feature flags | `packages/config/src/flags.ts` |
| Error codes | `packages/errors/src/codes.ts` |
| DB schema | `packages/db/src/schema.ts` |
| DB migrations | `packages/db/migrations/` |
| External adapters | `packages/adapters/src/*.ts` (one file per capability) |
| Inngest workflows | `packages/workflows/src/*.ts` |
| API response helpers | `packages/api/src/responses.ts` |
| Shared middleware | `packages/api/src/middleware/` |
| Design tokens | `packages/ui/src/tokens.ts` |
| Auth logic | `packages/auth/src/` |
| Rate limit / security | `packages/security/src/` |
| Feature slices | `apps/api/src/features/<feature>/` |
| Solid components | `apps/web/src/components/` |
| Solid routes | `apps/web/src/routes/` |

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

| Boundary | Signal | Tool |
|---|---|---|
| HTTP request enters API | Trace span | OpenTelemetry → Axiom |
| Error thrown | Error event with context | Sentry |
| User action completed | Product event | PostHog |
| Adapter call (external service) | Structured log | Axiom |
| Inngest workflow step | Step event | Inngest built-in + Axiom |
| Auth state change | Audit log | `packages/security/audit` |

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

**Enforcement:** Elysia middleware composition in `packages/api/src/middleware/default.ts` — routes opt *out* explicitly, not in. `gitleaks` + `semgrep` in CI. Custom GritQL rule requires every route file to apply either `publicRoute()` or `protectedRoute()` wrapper.

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

| Metric | Budget |
|---|---|
| Client JS bundle | ≤ 50 KB gzipped |
| API p95 latency | ≤ 500 ms |
| Lighthouse performance | ≥ 90 |
| DB queries per request | ≤ 5 |
| Mutation score (packages) | ≥ 80% |
| Code Health score (target) | ≥ 9.0 |

---

# Enforcement mapping

Every principle exists in three forms: document (this file, judgment), mechanism (tool, enforcement), policy (`.gaia/rules.ts`, single source). This is general principle #6 made concrete for code.

| # | Principle | Mechanism | Policy |
|---|---|---|---|
| 1 | One schema, many consumers | `tsgo` + GritQL rule | `rules.schemaSource` |
| 2 | Validate at edges | Oxlint `no-unknown-in-interior` + GritQL `require-route-schema` | `rules.validation` |
| 3 | Named errors | Oxlint `no-bare-catch` + typed error codes | `rules.errors` |
| 4 | Three things | GritQL `route-operations` | `rules.routeShape` |
| 5 | Predictable places | Moon workspace boundaries + path lint | `rules.conventions` |
| 6 | Agents duplicate | `/review` heuristic flags | `rules.abstraction` |
| 7 | Boundary + mutation testing | `check-tests-exist.ts` + mutation tool | `rules.testing` |
| 8 | Observability at boundaries | Middleware auto-instrument + lint | `rules.observability` |
| 9 | Opinionated security | Default middleware + GritQL `require-route-wrapper` | `rules.security` |
| 10 | Code Health gate | CI required checks + `/review` skill | `rules.quality` |

---

# Anti-principles (what Gaia rejects)

Classical principles that do **not** apply, or apply in inverted form:

| Classical principle | Gaia position |
|---|---|
| **DRY** (eliminate all duplication) | **Rejected.** Agents duplicate; humans extract after 3+ with shared change reason. |
| **100% coverage target** | **Rejected.** Boundary testing + mutation score. Coverage percentage alone is gameable. |
| **SOLID/OCP** (open for extension) | **Downweighted.** Gaia is a template; users fork and modify. Extension points are explicit, not speculative. |
| **Law of Demeter** (only talk to friends) | **Downweighted.** In typed TypeScript with Eden Treaty, traversing types is safe and expected. The real rule is principle #5: conventions in predictable places. |
| **KISS / YAGNI** | **Preserved.** But "simple" means "legible to agents," which is a stricter bar than "legible to humans." |
| **Premature optimization is evil** | **Preserved with caveat.** Performance budgets (principle #10) are not premature — they prevent regression, not optimize prematurely. |

---

# How agents use this file

1. **Session start** — root `CLAUDE.md` routes the agent here for any code task.
2. **Before editing** — agent reads this file + the relevant domain file from the routing table above.
3. **During editing** — agent follows the principles. If a principle seems to conflict with a pattern in a domain file, the principle wins (and the domain file gets a PR to fix).
4. **Before committing** — `/review` skill runs the enforcement suite. Regressions block the commit.
5. **On pattern repetition** — agent duplicates (principle #6). On the third occurrence, the agent flags for human extraction decision.

---

*This file is versioned. Changes to the principles require an ADR in `docs/adr/`. Changes to enforcement mechanisms do not require an ADR but must update `.gaia/rules.ts` and this file together.*
