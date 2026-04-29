# Deployment — Shipping Gaia to production

> Status: Reference
> Last verified: April 2026
> Scope: Everything between `git push` and a healthy URL — image promotion, env management, migrations, health checks, rollbacks
> Paired with: `dx.md` (local loop), `observability.md` (signals), `security.md` (secrets), `code.md` (the constitution)

---

## What this file is

The shipping discipline for Gaia. Vision §Stack picks the platform mix (Bun, Postgres-on-Neon, Railway as default host); this file is the _why_ + _enforcement_ for the cloud boundary. Every principle below has a single-line description, the mechanism that enforces it, an anti-pattern, and a pattern — so an agent (or human) can verify "does this still hold?" at a glance.

Read `code.md` first for the four-part principle shape. Read `dx.md` for the local loop. This file picks up at the cloud boundary and stops at "first request served."

---

## Threat model for deploys

What goes wrong when shipping software, in rough order of severity:

1. **Code-vs-schema mismatch** — new code expects a column the migration didn't run.
2. **Config drift** — staging works, prod 500s because an env var differs.
3. **Hot rollback impossible** — the previous image isn't pinned by digest, so there's nothing to roll back to.
4. **Cascading health-check failure** — readiness check fails on a transient DB blip; all instances marked unhealthy; total outage.
5. **Silent observability** — error happens, no signal emitted, you find out from a customer.

The 10 principles below are the answer to each.

---

## The 10 deployment principles

### 1. Promote a digest, never rebuild

The artifact built at the first CI gate is identified by its content-addressable image digest (`sha256:…`). Staging and prod pull _that digest_. No `latest` tag. No "build for prod" — the bytes that passed staging are the bytes that ship.

**Enforcement:** Image registry retention ≥30 deploys. CI sets the deploy-target via digest, not tag. Verifiable: every deploy log line names a digest.

**Anti-pattern:**

```yaml
# ❌ Tag-based deploy — `latest` can drift between stages
deploy:
  image: ghcr.io/me/gaia:latest
```

**Pattern:**

```yaml
# ✅ Digest-pinned across all stages
deploy:
  image: ghcr.io/me/gaia@sha256:6f3a…b9
```

---

### 2. CI is the merge gate; branch protection is the enforcement

`master` requires green checks: `check`, `secrets`, `deps`, `dead-code`, `rules-coverage`. Branch protection makes "merge without CI green" impossible — not a social contract, a permission. Branches live ≤3 days (trunk-based).

**Enforcement:** GitHub branch protection on `master` requires the named jobs in `.github/workflows/ci.yml`. `bun run check` mirrors the CI surface so local feedback is fast.

**Anti-pattern:**

```sh
# ❌ "Just merge it, CI is flaky"
git push --force origin master
```

**Pattern:**

```sh
# ✅ CI is authoritative; branch protection enforces it
gh pr merge --squash --delete-branch  # blocked if any required check is red
```

---

### 3. Schema changes are additive and run before code

Migrations are forward-only and idempotent (Drizzle's journal). Breaking changes use **expand-then-contract** across ≥2 deploys: deploy A adds the new column nullable + dual-writes, deploy B backfills and makes it required. Migration runs _before_ the new image starts serving traffic; if it fails, deploy aborts and old code keeps serving.

**Enforcement:** `apps/api/scripts/migrate.ts` runs before image swap (configured in Railway pre-deploy hook). Drizzle journal makes re-runs no-ops. Code review checklist for schema PRs: "is this additive within this deploy?"

**Anti-pattern:**

```ts
// ❌ One-shot breaking change — old code crashes during the deploy window
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(), // was nullable yesterday; old code reads NULLs
})
```

**Pattern:**

```ts
// ✅ Deploy A — additive
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email'), // still nullable
  emailVerified: boolean('email_verified').default(false), // new, default
})

// Deploy B (after backfill job) — make required
// emailVerified: boolean('email_verified').notNull().default(false),
```

---

### 4. Config is typed at boot; secrets are platform-managed

`packages/config/env.ts` declares every env var with TypeBox. Required vars without values crash the process at boot. Secrets (`*_SECRET`, `*_TOKEN`, `*_KEY`) live in the platform's secret store (Railway env vars, AWS Secrets Manager, GitHub Actions secrets) — never in `.env` files inside the image. Rotation cadence per `security.md`.

**Enforcement:**

- `harden-check.ts` blocks `process.env.X` outside `packages/config/env.ts` (rule `security/no-raw-env`)
- `gitleaks` job in CI rejects committed secrets
- Schema validation crashes boot if a required var is missing — failures show up at deploy time, not at the first user request

**Anti-pattern:**

```ts
// ❌ Untyped, ad-hoc, missing-var fail mode is "undefined behavior at runtime"
const apiKey = process.env.POLAR_KEY ?? ''
const isProd = process.env.NODE_ENV === 'prod' // typo — never matches
```

**Pattern:**

```ts
// ✅ Typed schema; missing required vars crash at boot
import { env } from '@gaia/config'
// env.POLAR_ACCESS_TOKEN is `string` (required); env.NODE_ENV is `'development' | 'test' | 'production'`
```

---

### 5. Every PR gets a preview database

The DB layer supports branching (Neon and similar do this natively). CI provisions a Neon branch per PR, runs `bun db:migrate` against it, and runs the test suite. Local dev mirrors via `bun db:dev` (Docker Postgres). PR reviewers verify the change in a live environment, not in code.

**Enforcement:** `.github/workflows/ci.yml` provisions a Neon branch keyed on PR number. The PR description bot updates the URL on each push. Branches are deleted when the PR closes.

**Anti-pattern:**

```yaml
# ❌ Shared staging DB — PRs interfere with each other; "works in staging" doesn't mean "works alone"
DATABASE_URL: postgres://staging-shared
```

**Pattern:**

```yaml
# ✅ Per-PR DB
DATABASE_URL: ${{ secrets.NEON_BRANCH_URL_PR_${{ github.event.number }} }}
```

---

### 6. Liveness, readiness, smoke — three separate checks

`GET /health` is liveness (process is alive, ~1ms, no deps). `GET /health/ready` is readiness (DB ping, Polar ping, ~50ms). The platform waits for readiness ≥3× before swapping traffic; rollback fires automatically on readiness fail >60s. A post-deploy synthetic test exercises one critical user path; if it fails, alert.

**Enforcement:** Two routes in `apps/api/server/app.ts`. Railway uses readiness as the deploy gate. A separate Inngest function runs the smoke test post-deploy and writes to Axiom.

**Anti-pattern:**

```ts
// ❌ One health endpoint that lies
.get('/health', () => ({ ok: true }))  // returns ok even when DB is down → cascading 500s after deploy
```

**Pattern:**

```ts
// ✅ Three checks, three semantics
.get('/health', () => ({ ok: true }))                                    // liveness
.get('/health/ready', async () => {
  await db.execute(sql`select 1`)
  return { ok: true }
})                                                                        // readiness
// + post-deploy synthetic test in @gaia/workflows
```

---

### 7. Observability initializes before the first request

`apps/api/server/app.ts` calls `initObservability(env)` before `app.listen()` (rule `observability/init-at-boot`, enforced by `scripts/check-observability-init.ts`). Sentry/Axiom/OTel configured with: trace sampling (100% dev / 10% prod), trace-id propagation through logs, fail-soft on vendor outages. See `code.md` §8 and `observability.md` for boundary signals.

**Enforcement:** `scripts/check-observability-init.ts` reads `app.ts` and verifies `initObservability(env)` is called at module scope before `app.listen(`. Wired into `bun run check`.

**Anti-pattern:**

```ts
// ❌ Init lazily on first request — first 100 requests have no tracing, no Sentry
app.listen(env.PORT)
app.onRequest(() => initObservability(env)) // never runs the first time it matters
```

**Pattern:**

```ts
// ✅ Init at module scope, before listen
initObservability(env)
const log = getLogger()
export const app = new Elysia() /* ... */
if (import.meta.main) app.listen(env.PORT)
```

---

### 8. Rollback is a deploy with a 5-minute MTTR

Rollback uses the platform's promote-previous-image (Railway "Promote"). Because schema changes are additive (P3), rolling back code does not require schema rollback. Data corruption is recovered via Neon point-in-time restore (RPO ≤5 minutes). Rollback fires a Slack hook + Sentry release marker so the incident is observable.

**Enforcement:** Railway "Promote" button + retention policy from P1 ensures the previous image is reachable. Rollback runbook lives at `decisions/deploy.md`. MTTR measured from incident detection to readiness-restored.

**Anti-pattern:**

```sh
# ❌ "Hotfix in prod" — edit env vars or SSH into the container to "fix" things
railway env set FEATURE_FLAG=false  # creates un-reproducible state
```

**Pattern:**

```sh
# ✅ Promote previous digest; investigate after
railway service promote --to-deployment <previous-digest>
# Sentry release marker fires; Slack alerts; on-call investigates
```

---

### 9. Preview environment per PR

Every PR opens a preview deployment (Railway PR previews) AND a preview DB (P5). The PR description shows both URLs. Reviewers click and verify in a real environment.

**Enforcement:** Railway PR previews enabled in project settings. The PR template includes a "Preview" section the bot fills in. Preview deployments expire when the PR closes.

**Anti-pattern:**

```md
<!-- ❌ "I tested locally, ship it" — local doesn't have prod's TLS, env, edge config -->

LGTM
```

**Pattern:**

```md
<!-- ✅ PR description -->

Preview: https://gaia-pr-42.up.railway.app
Preview DB: postgres://...neon.../br_pr_42
```

---

### 10. Time-to-first-deploy ≤30 minutes from clone

A new operator clones the repo, sets 8 env vars (the required list in `packages/config/env.ts`), runs `railway up`, and reaches a green `/health/ready` in under 30 minutes. If they can't, the deploy doc is the bug.

**Enforcement:** Quarterly deploy-time audit (in `decisions/maturity.md`). New-operator script (`scripts/first-deploy.ts`) outputs a timed report. CI runs it once per quarter against a fresh Railway project.

**Anti-pattern:**

```md
<!-- ❌ A README with 47 manual steps, half of which are out of date -->

1. Sign up for Neon
2. Create a project
3. Get the connection string
4. ...46 more
```

**Pattern:**

```md
<!-- ✅ One command + 8 env vars -->

bun first-deploy.ts # interactive: prompts for the 8 secrets, creates Railway project, deploys, polls /health/ready
```

---

## Default platform mix

| Concern        | Default                                              | Why                                             |
| -------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Runtime        | Bun (apps/api) + Vinxi/SolidStart (apps/web)         | Vision §Stack                                   |
| Container host | **Railway**                                          | Bun support, env management, DBs in one project |
| Database       | **Neon** (Postgres)                                  | Branchable previews, serverless-friendly        |
| CDN / edge     | Railway's built-in for apps/web; CloudFlare optional | Static asset caching                            |
| DNS            | CloudFlare                                           | Cheap, programmable, free TLS                   |
| Email          | Resend                                               | `packages/adapters/email.ts`                    |
| Payments       | Polar                                                | `packages/adapters/payments.ts`                 |
| Object storage | Cloudflare R2 (S3-compatible) or Railway buckets     | `packages/adapters/storage.ts`                  |
| Logs           | Axiom                                                | `packages/core/observability.ts`                |
| Errors         | Sentry                                               | `packages/core/observability.ts`                |
| Traces         | Honeycomb / Jaeger via OTel                          | `packages/core/observability.ts`                |
| AI             | Anthropic                                            | `packages/adapters/ai.ts` — see `ai.md`         |

Swap any of these by changing the corresponding adapter file. Do not swap the architecture.

---

## Required env (the 8)

The minimum for prod boot, per `packages/config/env.ts`:

```
DATABASE_URL                # postgres connection string
BETTER_AUTH_SECRET          # 32+ chars; rotate per security.md
PUBLIC_APP_URL              # https://yourapp.com
POLAR_ACCESS_TOKEN          # Polar API
POLAR_WEBHOOK_SECRET        # HMAC verification
POLAR_PRODUCT_ID            # default plan id
RESEND_API_KEY              # email
ANTHROPIC_API_KEY           # AI
```

Optional vars (Sentry, Axiom, OTel, OAuth, R2, PostHog, Inngest) degrade gracefully when unset.

---

## Enforcement mapping

| Principle                   | Mechanism                                     | rules.ts entry                  |
| --------------------------- | --------------------------------------------- | ------------------------------- |
| 1. Promote a digest         | CI image push + retention policy              | _pending_                       |
| 2. CI is the merge gate     | Branch protection on `master`                 | _platform-level, not in tree_   |
| 3. Schema changes additive  | Code review checklist                         | `database/migrations-versioned` |
| 4. Config typed at boot     | `harden-check.ts` + TypeBox schema validation | `security/no-raw-env`           |
| 5. PR-scoped DB             | CI workflow                                   | _pending_                       |
| 6. Three health checks      | Code review + Railway config                  | _pending_                       |
| 7. Observability at boot    | `scripts/check-observability-init.ts`         | `observability/init-at-boot`    |
| 8. 5-minute rollback        | Image retention + runbook                     | _platform-level_                |
| 9. PR preview environment   | Railway PR previews                           | _platform-level_                |
| 10. ≤30-minute first deploy | Quarterly audit + scripts/first-deploy.ts     | _pending_                       |

The `_pending_` entries are visible debt — `rules-coverage` lists them.

---

## Cross-references

- Pipeline gates: `.github/workflows/ci.yml`
- Env schema: `packages/config/env.ts`
- Migrations: `apps/api/scripts/migrate.ts`, `packages/db/schema.ts`
- Observability boot: `packages/core/observability.ts`
- Health endpoints: `apps/api/server/app.ts`
- Local dev: `dx.md`
- Secrets policy: `security.md`
- Database principles: `database.md`

---

## Decisions log

| Date       | Decision                               | Rationale                                                                                                                         |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Default platform: Railway + Neon       | Best Bun support; branchable previews; one project owns runtime + env + secrets — minimum cognitive overhead.                     |
| 2026-04-28 | Schema changes additive across deploys | Old code + new schema is recoverable; new code + old schema is not. Order matters.                                                |
| 2026-04-28 | Three health checks (live/ready/smoke) | One endpoint can't carry three semantics. Liveness must be cheap; readiness must verify deps; smoke must exercise a real path.    |
| 2026-04-28 | Promote-by-digest, never rebuild       | Reproducibility across stages requires content-addressable artifacts. Tag drift is the canonical "works in staging" failure mode. |
| 2026-04-28 | ≤30-minute time-to-first-deploy SLO    | Solo operators value time-to-prod. Staleness in the deploy doc is the most common cause of "it didn't work" — make it a metric.   |

_Add to log when changing platform, build pipeline, or required-env shape. ADRs required for changes that affect rollback or required env vars._
