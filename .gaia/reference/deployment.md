# Deployment — Shipping Gaia to production

> Status: Reference
> Last verified: April 2026
> Scope: Everything between `git push` and a healthy URL — Docker, Railway, Neon, env management, DNS, rollbacks
> Paired with: `dx.md` (developer experience), `observability.md` (logs/metrics/traces), `security.md` (secrets)

---

## What this file is

The shipping discipline for Gaia. Vision §Stack picks the platform mix (Bun runtime, Postgres on Neon, Railway as default host); this file is the _how_ — what we expect the deploy pipeline to enforce, what's manual, and what's checked at runtime.

Read `dx.md` first for local-loop patterns. This file picks up at the cloud boundary.

---

## The 10 deployment principles

### Pipeline

**1. One artifact per commit.**
The container built from `master` is the same container that goes to staging and prod. No "rebuild for prod" — the bytes that passed staging are the bytes that ship.

**2. CI is the gate. Local is courtesy.**
`bun run check` runs in CI on every PR (`.github/workflows/ci.yml`). Merging to `master` requires a green CI run. Local checks are for fast feedback; the CI run is authoritative.

**3. Migrations run before the new code starts.**
Every deploy runs `bun apps/api/scripts/migrate.ts` before booting the new server image. Old code keeps running while the new schema lands; new code starts only after migrations succeed.

### Configuration

**4. 12-factor for env vars.**
Every config value comes from `process.env` via `packages/config/env.ts`. Never reach into `process.env` directly outside that file (enforced by `harden-check`). The schema is TypeBox; missing required vars make the process refuse to start.

**5. Secrets stay in the platform.**
Railway environment variables, Vercel secrets, AWS Secrets Manager, GitHub Actions secrets. Never `.env` checked in; never secrets baked into the image. `gitleaks` runs on every PR (`.github/workflows/ci.yml`). Rotation cadence per `security.md`.

### Database

**6. Neon for Postgres; Drizzle for migrations.**
Neon's branchable Postgres = preview databases per PR. `drizzle-kit generate` produces SQL; `migrate.ts` applies it. Manual SQL never touches a live DB; `database.md` rule.

**7. Connection pooling.**
Bun + `postgres-js` with default pool. For Neon's serverless surface, prefer the pooled connection string (`?sslmode=require&pgbouncer=true`). Long-lived connections are fine on Railway; serverless contexts use the http driver.

### Runtime

**8. Health checks gate every deploy.**
`GET /health` returns `{ ok: true }` and is the readiness/liveness signal. Railway watches it; bad deploys roll back automatically. Add per-feature health (DB ping, Polar ping) only when business logic depends on it.

**9. Observability is initialized at boot.**
`apps/api/server/app.ts` calls `initObservability(env)` before `app.listen()` (rule `observability/init-at-boot`, enforced by `scripts/check-observability-init.ts`). Sentry catches uncaught exceptions; Axiom collects logs; OTel covers traces.

### Recovery

**10. Rollbacks are a deploy, not a hack.**
Use the platform's rollback (Railway "Promote" / "Rollback") to ship the previous image. Never edit prod env vars to "fix" a bad deploy unless the env var IS the bug — that's how you produce un-reproducible state.

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

Swap any of these by changing one adapter file. Do not swap the architecture; swap the adapter behind the architecture.

---

## Env vars

### Required

`packages/config/env.ts` is the catalog. The minimum for prod boot:

```
DATABASE_URL                # postgres connection string (Neon)
BETTER_AUTH_SECRET          # 32+ chars; rotate per security.md
PUBLIC_APP_URL              # https://yourapp.com — used by auth callbacks
POLAR_ACCESS_TOKEN          # Polar API key
POLAR_WEBHOOK_SECRET        # for HMAC verification
POLAR_PRODUCT_ID            # default plan id
RESEND_API_KEY              # email
ANTHROPIC_API_KEY           # AI features
```

### Optional

```
SENTRY_DSN                  # error tracking
AXIOM_TOKEN, AXIOM_ORG_ID   # log shipping
OTEL_EXPORTER_OTLP_ENDPOINT # tracing
GOOGLE_CLIENT_ID/SECRET     # OAuth
POSTHOG_API_KEY             # analytics
R2_*                        # object storage
INNGEST_*                   # workflows
```

If unset, the relevant feature degrades gracefully (e.g. Sentry becomes a no-op).

### CI placeholders

`.github/workflows/ci.yml` provides safe placeholder values for required vars so adapter modules can initialize at import time during tests. Real values come from Railway in prod.

---

## Deploy steps (Railway)

```sh
# 1. One-time setup
railway init
railway link
railway add postgres
railway env set BETTER_AUTH_SECRET=$(openssl rand -hex 32)
railway env set POLAR_ACCESS_TOKEN=...
# (set the rest from the env list above)

# 2. Deploy
git push origin master
# Railway picks up the push, builds, runs migrations, swaps the image.

# 3. First deploy: run migrations explicitly
railway run bun apps/api/scripts/migrate.ts

# 4. Set the public URL on Polar / Better Auth dashboards
#    so OAuth callbacks resolve correctly.
```

---

## Docker

The default `Dockerfile` (vision §Stack) is a multi-stage build:

1. `oven/bun:1.2` base
2. `bun install --frozen-lockfile` for deterministic deps
3. `bun build apps/api/server/app.ts --target=bun --minify`
4. `CMD ["bun", "run", "dist/app.js"]`

Build locally to catch image-only failures: `docker build -t gaia .`. CI runs the same build on every PR (`.github/workflows/ci.yml` — add a `build` job if not present yet).

---

## Rollback playbook

| Symptom                      | First action                                    | If that doesn't work             |
| ---------------------------- | ----------------------------------------------- | -------------------------------- |
| 500s spike after deploy      | Railway → Promote previous deployment           | Open Sentry, find the regression |
| Migration broke schema       | Roll back the deploy first; data fix second     | Restore from Neon point-in-time  |
| Webhook signatures rejecting | Check `POLAR_WEBHOOK_SECRET` env on Railway     | Re-check Polar dashboard secret  |
| 100% error rate on /auth/\*  | Check `BETTER_AUTH_SECRET` consistency          | Roll back; rotate secret         |
| OAuth callback URL mismatch  | Set `PUBLIC_APP_URL` to the production hostname | Update redirect URLs on provider |

Never roll back a migration by editing prod data. Use Neon's point-in-time restore.

---

## Cross-references

- Pipeline gates: `.github/workflows/ci.yml`
- Env schema: `packages/config/env.ts`
- Migrations: `apps/api/scripts/migrate.ts`, `packages/db/schema.ts`
- Observability boot: `packages/core/observability.ts`
- Health endpoint: `apps/api/server/app.ts` `GET /health`
- Local dev: `dx.md`
- Secrets policy: `security.md`

---

## Decisions log

| Date       | Decision                         | Rationale                                                                                                                         |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Default platform: Railway + Neon | Best Bun support; branchable Postgres for preview DBs; one project owns runtime + env + secrets — minimum cognitive overhead.     |
| 2026-04-28 | Migrations run before image swap | Old code + new schema is recoverable; new code + old schema is not. Order matters.                                                |
| 2026-04-28 | Health check gates auto-rollback | `/health` returning anything but `{ ok: true }` rolls back automatically. Add per-feature health only when product depends on it. |
| 2026-04-28 | One artifact per commit          | Same image goes staging → prod. Eliminates "works in staging, fails in prod" caused by a different build.                         |

_Add to log when changing platform, build pipeline, or env-handling rules. ADR required for changes that affect rollback behavior or required env vars._
