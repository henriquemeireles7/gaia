# Deploy — How We Ship

> Last verified: 2026-04-08

## Infrastructure
- **Hosting:** Railway (app + PostgreSQL, same provider = zero network hop)
- **Container:** Dockerfile with Bun image
- **Database:** PostgreSQL on Railway
- **GitHub:** henriquemeireles7
- **Email:** hsameireles@gmail.com

## Subdomain Strategy
- `rightdecision.io` — Main website (brand, pricing page, both products)
- `app.rightdecision.io` — Course platform (Life Decisions + Business Decisions)
- `api.rightdecision.io` — Automation APIs (Business Decisions)
- All served from same Railway deployment, route-based separation

## Environment Variables
All env vars flow through `platform/env.ts` via `@t3-oss/env-core` + Zod validation.
Build crashes if env vars are missing or invalid. Never use `process.env` directly.

Required vars (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — auth session signing
- `STRIPE_SECRET_KEY` — payment processing
- `STRIPE_WEBHOOK_SECRET` — webhook verification
- `RESEND_API_KEY` — transactional email

Optional SEO vars:
- `INDEXNOW_KEY` — IndexNow protocol key for instant search engine notification
- `GOOGLE_SERVICE_ACCOUNT_JSON` — GCP service account for Search Console API

## Config-as-Code (`railway.toml`)
All build and deploy settings are version-controlled in `railway.toml` at the repo root.
Code config **always overrides** Railway dashboard settings.

What it controls:
- **Builder:** `DOCKERFILE` — uses our multi-stage Dockerfile
- **Start command:** `bun run dist/app.js`
- **Healthcheck:** `GET /health` with 300s timeout — Railway rolls back if it fails
- **Restart policy:** `ON_FAILURE` with 5 retries — auto-recovers from crashes
- **Replicas:** 1 (scale up by changing `numReplicas`)

What it does NOT control (use `railway variable set` or dashboard):
- Environment variables (DATABASE_URL, secrets, etc.)
- Custom domains and networking
- Volume mounts

Rules:
- NEVER configure build/deploy settings in the dashboard — they'll be overridden by `railway.toml`
- To add pre-deploy migrations: add `preDeployCommand = "bun run db:migrate"` to `[deploy]`
- To add environment overrides: use `[environments.staging.deploy]` sections
- Config file path does NOT follow Root Directory — always use absolute path from repo root

## CI Pipeline
GitHub Actions: `biome ci` → `tsc --noEmit` → `bun test` → `bun run build`

## Deploy Checklist
1. `bun run check` passes locally (lint + typecheck + test)
2. Push to branch, CI green
3. Railway auto-deploys from main branch
4. Verify health endpoint
5. Check database migrations ran
6. `bun run indexnow` — notify search engines of new/changed URLs

## SEO Scripts
- `bun run indexnow` — Submit new URLs to Bing/Yandex via IndexNow protocol
- `bun run freshness` — Report content older than 90 days (GEO citation decay)
- `bun run content:check` — Validate content quality (word count, keywords, links, FAQ)

## Database Migrations
```bash
bun run db:generate  # Generate migration from schema changes
bun run db:migrate   # Apply migrations
bun run db:seed      # Seed dev data (dev only)
bun run db:studio    # Open Drizzle Studio for inspection
```

## External Service CLIs

Act first, ask never. Use authenticated CLIs directly — NEVER tell the user to check a dashboard.

### Railway (`railway`)
Project: decisions | Environment: production | Service: rightdecision
```sh
railway variable list --kv              # list all env vars
railway variable set KEY=value          # set env var (triggers redeploy)
railway variable set KEY=value --skip-deploys  # set without redeploying
railway variable delete KEY             # remove env var
railway logs                            # tail production logs
railway status                          # current project/env/service
railway up                              # manual deploy
railway redeploy                        # redeploy current
railway connect postgres                # interactive psql session to production DB
```
**Database access:** `railway connect postgres` for production PostgreSQL. Dev server runs against Railway production DB.
**If "No linked project":** `railway link` — project "decisions", environment "production".

### Stripe (`stripe`)
```sh
stripe products list                    # list products
stripe products create --name "..."     # create product
stripe prices list                      # list prices
stripe prices create --product <id> --unit-amount <cents> --currency usd -d "recurring[interval]=year"
stripe customers list                   # list customers
stripe listen --forward-to localhost:3000/api/stripe/webhook  # local webhook testing
stripe logs tail                        # watch API request logs
stripe trigger <event>                  # fire test webhook events
```
ALWAYS invoke `/stripe-best-practices` before writing or reviewing Stripe integration code.

### GitHub (`gh`)
```sh
gh pr create --title "..." --body "..."   # create PR
gh pr list                                # list PRs
gh pr merge <number>                      # merge PR
gh issue list                             # list issues
gh run list                               # list CI runs
gh run watch <id>                         # watch CI run
gh api repos/{owner}/{repo}/...           # raw API calls
```

### PostHog (MCP tools, not CLI)
Use `mcp__posthog__*` tools directly:
- `mcp__posthog__query-trends` — analytics trends
- `mcp__posthog__query-funnel` — funnel analysis
- `mcp__posthog__feature-flag-get-all` — list feature flags
- `mcp__posthog__create-feature-flag` — create feature flag
- `mcp__posthog__insights-get-all` — list saved insights
- `mcp__posthog__error-tracking-issues-list` — production errors

## Deploy Anti-patterns
- Deploying without running `bun run check` first
- Manual database migrations on production — automate in deploy pipeline
- Storing secrets in `.env` files committed to git — use Railway dashboard
- Running `bun run dev` on production — always use the built Dockerfile
- Skipping health check verification after deploy
- Creating separate Railway services before the monolith needs splitting
- Using preview environments without verifying env var parity
- Force-pushing to main branch — always use PRs with CI green
- Deploying on Fridays without monitoring in place

## Rollback Procedure

When a deploy breaks production:
```bash
# 1. Check what's broken
railway logs --latest

# 2. Option A: Rollback to previous deploy (fastest)
railway rollback

# 3. Option B: Hotfix-forward (if rollback would lose data)
# Fix the code, push, wait for CI, deploy

# 4. Option C: Revert the commit (if the change is isolated)
git revert HEAD
git push
```

**When to rollback vs hotfix-forward:**
- Rollback: UI broken, API errors, startup crash — anything that blocks ALL users
- Hotfix-forward: data migration issue, partial feature broken, edge case — rollback would lose data
- After any rollback: invoke `/d-harness` to generate prevention artifact

## Post-Deploy Verification (5-minute checklist)

1. Health endpoint responds: `curl https://rightdecision.io/health`
2. PostHog: no new error events in last 5 minutes
3. Railway: deploy status = "Active", no restart loops
4. Stripe webhooks: test endpoint responds (if payment changes deployed)
5. DB migrations: verify via `railway run bunx drizzle-kit studio`

## Environment Strategy

- **V1 (current):** No staging environment. Deploy directly to Railway prod. CI runs all tests before merge.
- **V2 trigger:** First paying customer. Then add Railway staging environment with separate DB.

## Domain Setup
- Primary: rightdecision.io (TBD)
- App: app.rightdecision.io (course platform)
- API: api.rightdecision.io (Business Decisions automation)

## Dockerfile Rules

### Runtime Stage Must Include All Files Needed by railway.toml
The Dockerfile runtime stage (final `FROM`) must COPY all files and directories referenced by `railway.toml` commands (`preDeployCommand`, `startCommand`). If `startCommand = "bun run dist/app.js"`, then `dist/` must be in a COPY statement. If `preDeployCommand = "bun run db:migrate"`, then migration files and `package.json` must be copied.

Verify manually: check that every path in `railway.toml` commands has a matching COPY in the Dockerfile runtime stage.

### Lockfile Sync Rule
If `package.json` is modified (new dependencies, version bumps), `bun.lock` MUST also be committed. Otherwise Docker builds use a stale lockfile and `bun install` installs wrong versions or fails entirely.

Use `bun .claude/skills/d-code/scripts/lockfile-check.ts` to verify automatically.

### Incident: 2026-04-08 — Lockfile + Migration Files Missing
**What happened:** Railway build failed because `package.json` had new dependencies but `bun.lock` wasn't committed. Additionally, migration files needed by `preDeployCommand` were not included in the Dockerfile runtime COPY stage.
**Root cause:** No automated check for lockfile sync or Dockerfile completeness.
**Fix:** Added `lockfile-check.ts` script and Dockerfile verification rules. Checked during d-review.
