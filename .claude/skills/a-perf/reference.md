# Performance — budgets, hot paths, and the cost of being fast

> Status: Reference (scaffolded; principles are stable — mechanical checks land incrementally)
> Last verified: April 2026
> Scope: Server response budgets, client bundle budgets, query plans, hot-path discipline.
> Sibling skill: `.claude/skills/a-perf/SKILL.md`.
> Paired with: `apps/api/CLAUDE.md` (request-path conventions), `packages/db/CLAUDE.md` (index discipline), `apps/web/CLAUDE.md` (bundle discipline).

---

## What this file is

The performance principles for Gaia. `a-perf` is the audit; this reference is its constitution. The principles are **budgets first** — every dimension declares a number, and the audit checks reality against that number. If you can't measure it, it's not a principle yet — it's an aspiration.

This reference is intentionally short for v1: 6 principles, all backed by mechanical checks (some pending). As principles harden into measured reality, the file grows. Performance is the domain where opinion-without-numbers does the most damage.

---

## The 6 performance principles

### 1. Server response budget: P95 < 300ms for authenticated GETs

Every authenticated GET under `apps/api/server/**` returns a response in under 300ms at the P95. Mutations (POST/PUT/PATCH/DELETE) get a separate budget: P95 < 800ms. Routes exceeding their budget for two consecutive audits get a P1 finding tagged for caching, query optimization, or splitting.

**Rules / Guidelines / Boundaries:**

- P95 budget: 300ms read, 800ms write. Measured via observability (Sentry/Axiom traces).
- Budget violation requires either a fix or a written exemption with ADR reference.
- Long-running operations (>1s) move to background workflows (Inngest), not synchronous routes.
- Health endpoints (`/health`, `/health/ready`) are exempt; they have their own ≤50ms budget.

**Enforcement:** rule `perf/p95-route-budget` (mechanism: `pending`, note: "scripts/check-route-budget.ts queries observability backend for P95 over last 7 days").

**Anti-pattern:**

```ts
// ❌ Sync N+1 inside a request handler
app.get('/api/projects', async ({ user }) => {
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.ownerId, user.id))
  for (const p of projects) {
    p.taskCount = await db.select().from(tasksTable).where(eq(tasksTable.projectId, p.id))
    // N+1; 50 projects × 30ms each = 1.5s response
  }
  return projects
})
```

**Pattern:**

```ts
// ✅ Single join + aggregate; bounded
app.get('/api/projects', async ({ user }) => {
  return db
    .select({
      ...projectsTable,
      taskCount: count(tasksTable.id),
    })
    .from(projectsTable)
    .leftJoin(tasksTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(projectsTable.ownerId, user.id))
    .groupBy(projectsTable.id)
})
```

---

### 2. Client bundle budget: route chunks ≤ 60kb gzipped

Every code-split route in `apps/web/src/routes/**` ships ≤60kb gzipped. The marketing landing page ships ≤120kb gzipped (interactivity threshold). Vendor chunks are budgeted separately at ≤180kb gzipped.

**Rules / Guidelines / Boundaries:**

- Bundle size measured via `bun run build:web` output.
- Per-route chunk budget: 60kb. Marketing landing: 120kb. Vendor: 180kb.
- New imports >10kb gzipped require ADR or budget recalibration in this reference.
- `import('large-lib')` (dynamic) preferred over top-level for >20kb deps.

**Enforcement:** rule `perf/bundle-budget` (mechanism: `pending`, note: "scripts/check-bundle-budget.ts parses build output and asserts thresholds").

**Anti-pattern:**

```ts
// ❌ Top-level import of a 250kb-gzipped chart lib in a route used 10% of the time
import { Chart } from 'huge-charts'
export default function ReportRoute() {
  return <Chart data={data} />
}
```

**Pattern:**

```ts
// ✅ Dynamic import; chart code only ships when /reports is visited
const Chart = lazy(() => import('huge-charts').then((m) => ({ default: m.Chart })))
```

---

### 3. Index every foreign key and queried column

Every `pgTable` declares indexes on foreign keys and on every column appearing in a `WHERE` clause served by a list/search route. EXPLAIN cost > 10× table size for a hot route = missing index. Drizzle migrations land the index alongside the column.

**Rules / Guidelines / Boundaries:**

- FKs always indexed.
- Columns in WHERE/ORDER BY for list endpoints always indexed.
- Composite indexes for `(status, createdAt DESC)` patterns where pagination orders by createdAt.
- EXPLAIN ANALYZE on production-shaped data is the source of truth, not local dev.

**Enforcement:** rule `perf/index-fks` (mechanism: `pending`, note: "scripts/check-index-coverage.ts walks pgTable definitions for unindexed FKs").

**Anti-pattern:**

```ts
// ❌ FK with no index; list query becomes a sequential scan
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').references(() => projects.id), // no index
  title: text('title'),
})
```

**Pattern:**

```ts
// ✅ FK indexed; composite index for status-timeline queries
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').references(() => projects.id),
    status: text('status'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('tasks_project_id_idx').on(t.projectId),
    index('tasks_status_created_at_idx').on(t.status, t.createdAt),
  ],
)
```

---

### 4. Lighthouse: Performance ≥ 90, LCP < 2.5s on the marketing site

The marketing site (`apps/web` landing routes) hits Lighthouse Performance ≥ 90. Largest Contentful Paint < 2.5s on a 4G throttle. Cumulative Layout Shift < 0.1. The numbers are the contract; the path doesn't matter.

**Rules / Guidelines / Boundaries:**

- Run Lighthouse on the production URL, not localhost.
- LCP < 2.5s. CLS < 0.1. INP < 200ms.
- Performance score < 90 is a P1 finding.
- Image optimization: use `<picture>` + AVIF/WebP fallback for hero assets.

**Enforcement:** rule `perf/lighthouse-budget` (mechanism: `pending`, note: "scripts/run-lighthouse.ts via @lhci/cli; CI artifact compared to budget").

**Anti-pattern:**

```html
<!-- ❌ 4MB unoptimized hero image; LCP 6s on 4G -->
<img src="/hero.png" alt="hero" />
```

**Pattern:**

```html
<!-- ✅ AVIF + WebP fallback, dimensions declared, eager-load above-the-fold -->
<picture>
  <source type="image/avif" srcset="/hero.avif" />
  <source type="image/webp" srcset="/hero.webp" />
  <img src="/hero.jpg" width="1200" height="630" alt="hero" loading="eager" decoding="async" />
</picture>
```

---

### 5. No synchronous I/O on the request path

Request handlers must not perform synchronous file I/O, synchronous JSON parsing of large payloads, or blocking crypto calls. `readFileSync`, `crypto.pbkdf2Sync`, large `JSON.parse` of multi-MB strings — all banned in `apps/api/server/**`.

**Rules / Guidelines / Boundaries:**

- No `*Sync` I/O calls in request handlers (lint-enforced).
- Large JSON payloads are streamed, not parsed in one shot.
- CPU-bound work over 50ms goes to a worker thread or a background job.
- Crypto: prefer async variants (`pbkdf2`, `scrypt`).

**Enforcement:** rule `perf/no-sync-io-on-request-path` (mechanism: `pending`, note: "ast-grep: ban \*Sync calls inside route handlers under apps/api/server/\*\*").

**Anti-pattern:**

```ts
// ❌ readFileSync in a handler — blocks the event loop
app.get('/api/config', () => {
  const cfg = readFileSync('/etc/myapp/config.json', 'utf-8') // sync I/O
  return JSON.parse(cfg)
})
```

**Pattern:**

```ts
// ✅ Cached at boot; or read async if must
const cfg = JSON.parse(await readFile('/etc/myapp/config.json', 'utf-8'))
app.get('/api/config', () => cfg)
```

---

### 6. Every fetch() has a timeout

External calls (`fetch`, vendor SDKs) declare an explicit timeout. Default budget: 5s for API-to-API, 30s for AI/long-running. No timeout = the request can hang forever, exhausting connection pools and pinning workers.

**Rules / Guidelines / Boundaries:**

- `fetch` calls without `signal: AbortSignal.timeout(...)` fail lint.
- Vendor SDK adapters expose timeout config; defaults documented.
- AI calls (Anthropic, OpenAI) get a separate longer budget (declared per adapter).
- Timeouts surface as a typed error (`AppError('VENDOR_TIMEOUT')`), not a generic throw.

**Enforcement:** rule `perf/fetch-has-timeout` (mechanism: `pending`, note: "ast-grep: every fetch() call must have signal: AbortSignal.timeout(...) or an equivalent abort mechanism").

**Anti-pattern:**

```ts
// ❌ No timeout — vendor outage hangs the route forever
const r = await fetch(`https://api.vendor.com/things/${id}`)
```

**Pattern:**

```ts
// ✅ Explicit timeout; typed error path
try {
  const r = await fetch(`https://api.vendor.com/things/${id}`, {
    signal: AbortSignal.timeout(5000),
  })
} catch (err) {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    throw new AppError('VENDOR_TIMEOUT')
  }
  throw err
}
```

---

## Cross-references

- Sibling skill: `.claude/skills/a-perf/SKILL.md`
- Composite audit: `.claude/skills/a-health/SKILL.md` dispatches to this skill on every weekly run
- Backend conventions: `apps/api/CLAUDE.md`
- Database conventions: `packages/db/CLAUDE.md`
- Frontend conventions: `apps/web/CLAUDE.md`
- Observability backbone (where P95 numbers come from): `.claude/skills/a-observability/reference.md`

---

## Decisions log

| Date       | Decision                                              | Rationale                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29 | Scaffold a-perf alongside a-health rebuild            | a-health is a dispatcher; without a-perf the performance axis would default to `n/a` forever. Scaffolding now (even with most rules `pending`) keeps the dispatcher invariant honest while perf checks harden. |
| 2026-04-29 | Budgets first; only declare a principle once measured | Performance principles without numbers rot into vibes. Each principle declares a budget; if there's no budget, the principle hasn't earned its place yet.                                                      |
