# Database — Drizzle + Neon + Postgres

> Status: Reference
> Last verified: April 2026
> Scope: All code in `packages/db/`, migrations, seeds, and any code that queries the DB

---

## What this file is

The stack-specific patterns for database code in Gaia. These patterns implement the 10 coding principles from `code.md` in the context of Drizzle ORM + Neon (Postgres) + TypeBox.

Read `code.md` first. This file is the concrete *how*; `code.md` is the *why*.

**Key context:** Drizzle is a schema-first TypeScript ORM with no custom DSL. Neon is serverless Postgres with database branching — every pull request can have its own isolated database branch. Gaia treats this as the default workflow, not an optional feature.

---

## The 10 database patterns

### 1. One schema file per entity; aggregated in `schema/index.ts`

A monolithic `schema.ts` is a merge-conflict factory once more than one agent or feature is active. Gaia splits schema by domain entity, one file per table (or closely-related table group).

**Structure:**

```
packages/db/src/
├── schema/
│   ├── index.ts           # re-exports all tables and relations
│   ├── users.ts           # users table + relations
│   ├── sessions.ts        # sessions table + relations
│   ├── billing.ts         # subscriptions, invoices, line items
│   ├── audit.ts           # audit log table
│   └── _shared.ts         # shared column helpers (id, timestamps)
├── relations.ts           # cross-entity relations (if complex)
├── client.ts              # drizzle client export
├── types.ts               # re-exports for external consumers
└── migrations/            # drizzle-kit generate output
```

**Pattern:**

```ts
// packages/db/src/schema/users.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { sessions } from './sessions'
import { timestamps } from './_shared'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps, // createdAt, updatedAt, deletedAt
})

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}))
```

```ts
// packages/db/src/schema/index.ts
export * from './users'
export * from './sessions'
export * from './billing'
export * from './audit'
```

**Enforcement:** No file in `packages/db/src/schema/` except `index.ts` and `_shared.ts` exceeds ~200 lines. Agents adding new tables create new files, not append to existing ones.

---

### 2. Relational queries are the default; SQL-like is the escape hatch

Drizzle offers two query APIs:

- **Relational**: `db.query.users.findMany({ where: ..., with: { sessions: true } })` — reads like Prisma, great for joins
- **SQL-like**: `db.select().from(users).where(...).leftJoin(sessions, ...)` — explicit SQL, better for complex aggregations

Agents will mix them within a single file if not constrained. Gaia's rule: relational queries by default. SQL-like only when the relational API can't express the query, with a comment explaining why.

**Pattern:**

```ts
// ✅ Relational — default
async function listUsersWithRecentSessions(tenantId: string) {
  return db.query.users.findMany({
    where: eq(users.tenantId, tenantId),
    with: {
      sessions: {
        where: gt(sessions.createdAt, subDays(new Date(), 7)),
        limit: 10,
      },
    },
  })
}

// ✅ SQL-like — only when needed
// Reason: relational API can't express window functions / CTEs / group-by-multiple-tables
async function monthlyRevenueByProduct(tenantId: string) {
  return db
    .select({
      product: products.name,
      month: sql<string>`date_trunc('month', ${invoices.createdAt})`,
      revenue: sql<number>`sum(${lineItems.amountCents})`,
    })
    .from(invoices)
    .innerJoin(lineItems, eq(invoices.id, lineItems.invoiceId))
    .innerJoin(products, eq(lineItems.productId, products.id))
    .where(eq(invoices.tenantId, tenantId))
    .groupBy(products.name, sql`date_trunc('month', ${invoices.createdAt})`)
}
```

**Enforcement:** GritQL rule — `db.select(` calls outside `packages/db/` require a preceding comment with `// SQL-like:` explaining the reason.

---

### 3. One driver: `neon-serverless`

Neon has two drivers. Choosing both invites inconsistency. Gaia uses `neon-serverless` (WebSocket-based) as the only driver in v1. It supports transactions and is a drop-in replacement for `pg`. `neon-http` is deferred until a potential scale tier that runs on Cloudflare Workers (edge context).

**Setup:**

```ts
// packages/db/src/client.ts
import { neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { WebSocket } from 'ws'
import * as schema from './schema'
import { env } from '@gaia/config/env'

// WebSocket shim for non-edge runtimes (Bun/Node)
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = WebSocket
}

const pool = new Pool({ connectionString: env.DATABASE_URL })

export const db = drizzle({ client: pool, schema, logger: env.NODE_ENV === 'development' })
export type DB = typeof db
export * from './schema'
```

**Enforcement:** Oxlint rule — imports from `drizzle-orm/neon-http` are forbidden in v1. Reason documented in an ADR.

---

### 4. TypeBox derives from Drizzle — zero duplicate types

Every table's shape flows into Elysia routes via `drizzle-typebox`. No manual TypeBox schemas for DB entities.

**Pattern:**

```ts
// apps/api/src/features/users/schema.ts
import { t } from 'elysia'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { users } from '@gaia/db/schema'

const _entity = createSelectSchema(users)
const _create = t.Omit(createInsertSchema(users), ['id', 'createdAt', 'updatedAt', 'deletedAt'])

export const UserSchemas = {
  'users.entity': _entity,
  'users.create.body': _create,
  'users.update.body': t.Partial(_create),
}
```

Drizzle → TypeBox → Elysia → Eden Treaty → Solid. One definition, every layer gets types.

**Enforcement:** GritQL rule — any TypeBox schema for a shape that matches a Drizzle table must use `createSelectSchema`/`createInsertSchema` rather than hand-writing `t.Object(...)`.

---

### 5. `generate` + `migrate` only; `push` is local-dev-only

`drizzle-kit push` applies schema changes directly to the database without a migration file. Fast for local iteration — dangerous in production because it can silently drop columns or rewrite tables.

Gaia's rule:
- **Local dev**: `drizzle-kit push` for rapid iteration (no migration files yet)
- **Feature work**: `drizzle-kit generate` creates a migration file; review SQL
- **CI / production**: `drizzle-kit migrate` applies migration files; `push` is forbidden

**Commands (wired in `moon.yml`):**

```yaml
tasks:
  db-generate:
    command: 'bunx drizzle-kit generate'
  db-migrate:
    command: 'bunx drizzle-kit migrate'
  db-push:
    command: 'bunx drizzle-kit push'
    options: { runInCI: false } # never in CI
  db-studio:
    command: 'bunx drizzle-kit studio'
  db-check:
    command: 'bunx drizzle-kit check' # validates migration files
```

**Enforcement:** CI job `db-check` runs on every PR; `drizzle-kit push` is blocked by script check in `.github/workflows/ci.yml`.

---

### 6. Every PR gets a Neon branch

Neon's killer feature is database branching — every git branch can have its own isolated Postgres database. Tests run against the branch; the branch is destroyed on merge. Zero shared state, zero flaky tests from concurrent runs.

**Workflow:**

1. PR opened → GitHub Action creates a Neon branch via API: `pr-${PR_NUMBER}`
2. Branch's connection string stored as a job env var for the PR
3. `drizzle-kit migrate` runs against the branch
4. Seed data loads from `seed/test.ts`
5. Integration + E2E tests run against the branch
6. On PR close/merge → GitHub Action deletes the branch

**Setup in `packages/testing/src/neon-branch.ts`:**

```ts
import { NeonClient } from '@neondatabase/api-client'

const neon = new NeonClient({ apiKey: process.env.NEON_API_KEY! })

export async function createBranch(prNumber: number): Promise<string> {
  const branch = await neon.createBranch({
    projectId: process.env.NEON_PROJECT_ID!,
    name: `pr-${prNumber}`,
    parentBranch: 'main',
  })
  return branch.connection_string
}

export async function deleteBranch(prNumber: number): Promise<void> {
  await neon.deleteBranch({
    projectId: process.env.NEON_PROJECT_ID!,
    branchName: `pr-${prNumber}`,
  })
}
```

**Enforcement:** Required GitHub Action `create-neon-branch` on every PR. Required cleanup action on merge/close.

---

### 7. Expand-contract for destructive changes

Renames lose data. Column drops in busy tables lock them. The expand-contract pattern prevents downtime:

1. **Expand** — add the new column; keep the old one
2. **Backfill** — migration or data script populates the new column
3. **Switch code** — application writes to new, reads from new; old column unused
4. **Contract** — later migration drops the old column

**Example — renaming `full_name` to `display_name`:**

```ts
// Migration 1: expand
await db.schema
  .alterTable(users)
  .addColumn('display_name', 'text') // nullable initially

// Migration 2: backfill
await db.update(users).set({ display_name: users.full_name }) // SQL UPDATE

// Deploy: code uses display_name

// Migration 3: contract (weeks later, after verifying)
await db.schema
  .alterTable(users)
  .dropColumn('full_name')
```

**Never do a direct rename in production.** Drizzle's migration files make this easier by showing the SQL before applying — reviewers can catch dangerous patterns.

**Enforcement:** `/review` skill flags any migration that includes `DROP COLUMN`, `ALTER COLUMN ... TYPE`, or renames without a corresponding expand migration earlier in the history.

---

### 8. Seeds split by purpose

`drizzle-seed` is used with three distinct seed configurations, each serving a different need:

```
packages/db/src/seed/
├── test.ts          # Deterministic, minimal. For test DB. Fixed UUIDs, fixed data.
├── local.ts         # Realistic, substantial. For local dev. Faker-generated, ~100 records per table.
└── demo.ts          # Curated showcase. For staging/demos. Hand-picked data telling a story.
```

**Pattern:**

```ts
// packages/db/src/seed/test.ts
import { seed } from 'drizzle-seed'
import * as schema from '../schema'
import { db } from '../client'

export async function seedTest() {
  await seed(db, schema, { seed: 12345 }).refine((f) => ({
    users: {
      count: 5,
      columns: {
        email: f.valuesFromArray({
          values: ['test1@example.com', 'test2@example.com', /* ... */],
        }),
      },
    },
  }))
}

// Fixed UUIDs for tests that need predictable references
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
```

Integration tests call `seedTest()` in `beforeEach` after migrating the branch. Local dev runs `seedLocal()` once. Staging uses `seedDemo()`.

**Enforcement:** Each seed file is pure — no mixing. Tests import `seedTest` only. `seedDemo` is forbidden in test setup.

---

### 9. Every table has audit columns

Standard columns on every table, via a shared helper:

```ts
// packages/db/src/schema/_shared.ts
import { timestamp } from 'drizzle-orm/pg-core'

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // nullable = not deleted
}
```

Soft delete is the default via `deletedAt`. Queries filter `where(isNull(table.deletedAt))`. Helper functions in `packages/db/src/queries.ts`:

```ts
export function activeRecords<T extends { deletedAt: Date | null }>(table: T) {
  return isNull(table.deletedAt)
}
```

For cases where hard delete is required (e.g., GDPR erasure requests), a dedicated `deleteHard()` service function handles it and writes an audit log entry.

**Enforcement:** GritQL rule — every Drizzle `pgTable(` call must include `...timestamps` in the columns object.

---

### 10. Development logs every query; production samples slow queries

In development, Drizzle's `logger: true` option prints every query. Complemented with an `EXPLAIN ANALYZE` logger for slow queries. Agents see the actual SQL being generated — essential for catching N+1 and accidental full-table scans.

**Pattern:**

```ts
// packages/db/src/client.ts (dev)
import { db as baseDb } from './base'

const slowQueryThresholdMs = 50

export const db = env.NODE_ENV === 'development'
  ? baseDb.$with({
      logger: {
        logQuery: (query, params) => {
          console.log(`[db] ${query}`)
        },
      },
    })
  : baseDb

// Middleware for slow query EXPLAIN
if (env.NODE_ENV === 'development') {
  // wrap each query with timing; if > threshold, run EXPLAIN ANALYZE
  // ... implementation detail
}
```

In production, only slow queries (above p99 threshold) are logged to Axiom, with sampling to avoid log cost explosion.

**Enforcement:** The logger is wired in `packages/db/src/client.ts`; no per-query overrides. Production log level set in `env.ts`.

---

## Row-Level Security — deferred to v2

RLS via `crudPolicy` / `pgPolicy` is a powerful safety net. Gaia v1 is single-tenant per deployment, so RLS is not required. However, `packages/db/src/policies.ts` contains a stub helper and ADR-0018 documents the migration path when multi-tenancy becomes a requirement.

Single-tenant tables still filter by `tenantId` in queries (if a `tenants` table exists). Multi-tenant would promote this to RLS.

---

## Migration file review — required content

Every generated migration file is reviewed before merge. The `/review` skill checks:

- [ ] No `DROP COLUMN` without a prior expand migration
- [ ] No `ALTER COLUMN ... TYPE` on tables > 1000 rows (use expand-contract)
- [ ] No `ALTER TABLE ... ADD COLUMN ... NOT NULL` without `DEFAULT` (locks table)
- [ ] Indexes created with `CREATE INDEX CONCURRENTLY` in production
- [ ] Foreign keys have matching indexes
- [ ] Enum additions use `ALTER TYPE ... ADD VALUE` (cannot be rolled back atomically)

Flags surfacing during `/review` block merge until addressed.

---

## Quick reference

| Need | Pattern | Location |
|---|---|---|
| New table | One file per entity | `packages/db/src/schema/<n>.ts` |
| Shared columns | `...timestamps` helper | `packages/db/src/schema/_shared.ts` |
| Relations | `relations()` next to the table | Each schema file |
| TypeBox schema | `drizzle-typebox` derivation | Feature's `schema.ts` |
| Query | Relational (`db.query.*`) default | Service files |
| Complex SQL | SQL-like with `// SQL-like:` comment | Service files |
| Migration (generate) | `bun run db:generate` | N/A (CLI) |
| Migration (apply) | `bun run db:migrate` | N/A (CLI) |
| Local rapid iteration | `bun run db:push` | Local only |
| PR-isolated DB | Neon branch (auto) | GitHub Action |
| Seed for tests | `seedTest()` | `packages/db/src/seed/test.ts` |
| Seed for dev | `seedLocal()` | `packages/db/src/seed/local.ts` |
| Soft delete | Filter `isNull(t.deletedAt)` | `packages/db/src/queries.ts` helper |
| Query logging | Auto in dev; sampled in prod | `packages/db/src/client.ts` |

---

## Cross-references

- Principles: `docs/reference/code.md`
- Backend patterns: `docs/reference/backend.md`
- Testing patterns: `docs/reference/testing.md`
- Security patterns: `docs/reference/security.md`
- Observability patterns: `docs/reference/observability.md`

*This file is versioned. Changes that contradict `code.md` require an ADR.*
