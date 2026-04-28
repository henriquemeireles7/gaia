# Commands — CLI Reference

> Status: Reference
> Last verified: April 2026
> Scope: Every CLI command an agent or human runs against Gaia

---

## What this file is

The one-page reference for every CLI command in Gaia. Organized by workflow, not by tool. Click-to-copy examples, no placeholder gymnastics.

Read `code.md` first. This file is the *lookup*, not the *why*.

---

## Conventions used in this doc

Commands in this file follow standard CLI documentation conventions:

- `$` prefix — shell prompt (not copied)
- `<ANGLE_BRACKETS>` — required placeholder you replace (not copy-pasteable as-is)
- `[SQUARE_BRACKETS]` — optional (omit from basic usage)
- `{A|B|C}` — pick exactly one
- `...` — repeatable argument
- **Bold** commands = daily drivers
- No placeholders in copy-paste examples — actual values

Every command section answers three questions:

1. **Purpose** — what it does
2. **Syntax** — the shape
3. **Examples** — concrete commands you can copy

For full flags list on any command: append `--help`.

---

## Top 20 commands (daily reference)

| Command | Purpose |
|---|---|
| `bun install` | Install all dependencies |
| `bun run dev` | Start all apps locally (web + api) |
| `bun run build` | Build all apps for production |
| `bun test` | Run unit + integration tests |
| `bun run lint` | Lint + format check |
| `bun run lint:fix` | Lint + format autofix |
| `bun run typecheck` | Type check with `tsgo --noEmit` |
| `bun run db:generate` | Generate a new migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:studio` | Open Drizzle Studio (DB explorer) |
| `bun run db:push` | Apply schema changes without migration (local only) |
| `bun run db:seed` | Seed local DB with realistic data |
| `bun run check` | Full local pre-commit suite (lint + type + test) |
| `bun run release` | Create a release PR |
| `bun run deploy:status` | Check Railway deployment status |
| `bun run deploy:rollback` | Rollback last deploy |
| `moon run <target>` | Run a Moon task (`moon run web:dev`) |
| `moon check --all` | Moon affected + all tasks |
| `claude` | Start Claude Code session |
| `/review` | Run Gaia's review skill in Claude Code |

---

## Setup — first time on a fresh machine

### Install prerequisites

```sh
# Install proto (toolchain manager) — picks up .prototools versions
curl -fsSL https://moonrepo.dev/install/proto.sh | bash

# proto reads .prototools and installs pinned versions of bun, node, moon
cd gaia
proto install

# Verify versions
bun --version   # expected: from .prototools
moon --version  # expected: from .prototools
```

### Install dependencies

```sh
bun install
```

### Setup environment

```sh
# Copy example env; fill in secrets
cp .env.example .env.local

# Required for local dev: DATABASE_URL (Neon branch), BETTER_AUTH_SECRET
# Optional: SENTRY_DSN, AXIOM_TOKEN, POSTHOG_KEY, POLAR_API_KEY, RESEND_API_KEY
```

### Initialize local database

```sh
# Push schema to your Neon dev branch (no migration file — local only)
bun run db:push

# Seed with realistic local data
bun run db:seed:local
```

### Verify install

```sh
bun run check
# Runs: typecheck + lint + test
# Should complete clean on a fresh clone
```

---

## Development — daily work

### Start local dev

```sh
# Start web + api with hot reload (via Moon)
bun run dev

# Or individually
moon run api:dev
moon run web:dev
```

Web defaults to `http://localhost:3000`, API to `http://localhost:4000`.

### Run a specific app

```sh
bun --cwd apps/api run dev
bun --cwd apps/web run dev
```

### Lint and format

```sh
# Check (read-only)
bun run lint
bun run format:check

# Fix in place
bun run lint:fix
bun run format
```

Oxlint + oxfmt run blazing fast — run them freely.

### Type check

```sh
# Full monorepo
bun run typecheck

# Single package
bun --cwd packages/db run typecheck
```

`tsgo --noEmit` is used (faster than `tsc`).

### Dead code detection

```sh
bun run knip                # report unused exports / files
bun run knip --production   # stricter; runs in CI
```

### Pre-commit quick check

```sh
bun run check
# Equivalent to: typecheck + lint + format:check + test (fast suite)
```

Runs in ~30s on a clean tree; agents run this before PR.

---

## Database — Drizzle + Neon

### The migration workflow

```sh
# 1. Edit a schema file (e.g. packages/db/src/schema/users.ts)

# 2. Generate a migration
bun run db:generate

# 3. Review the generated SQL in packages/db/migrations/
# 4. Apply to your local Neon branch
bun run db:migrate
```

### `db:push` — local-only rapid iteration

```sh
# Skip migration files; apply schema directly to DB
# Use ONLY during local iteration before stabilizing the schema
bun run db:push

# Forbidden in CI — fails if attempted
```

### `db:generate` — create a migration

```sh
bun run db:generate
# Output: packages/db/migrations/0007_description.sql + meta/
```

### `db:migrate` — apply migrations

```sh
# Local
bun run db:migrate

# Production (runs via Railway pre-deploy hook; manual trigger rare)
bun run db:migrate --env production
```

### `db:check` — validate migrations

```sh
# Catches: conflicting migrations, missing snapshots, schema drift
bun run db:check
```

Runs in CI on every PR.

### `db:studio` — visual DB explorer

```sh
bun run db:studio
# Opens https://local.drizzle.studio
```

### `db:seed` — populate data

```sh
bun run db:seed:test    # deterministic test data (for integration tests)
bun run db:seed:local   # realistic dev data (Faker, ~100 records)
bun run db:seed:demo    # curated showcase data (for staging/demos)
```

### Neon branch commands

```sh
# Create a branch from main (usually done by GitHub Action on PR open)
bun run neon:branch:create --name pr-123

# Delete a branch
bun run neon:branch:delete --name pr-123

# List branches
bun run neon:branches

# Get connection string for a branch
bun run neon:branch:connection --name pr-123
```

### Emergency: reset local DB

```sh
bun run db:reset
# Drops all tables, re-runs migrations, seeds local data
# LOCAL ONLY — fails on production connection strings
```

---

## Testing

### Run all tests

```sh
bun test                    # unit + integration
bun run test:unit           # unit only (fast, concurrent)
bun run test:integration    # integration (needs DB; sequential)
bun run test:e2e            # Playwright E2E (critical paths)
```

### Run a specific file or pattern

```sh
bun test path/to/file.test.ts
bun test --test-name-pattern "rejects duplicate email"
```

### Watch mode

```sh
bun test --watch
bun test path/to/file.test.ts --watch
```

### Coverage

```sh
bun test --coverage
# Outputs text report + lcov to ./coverage/
# Thresholds in bunfig.toml enforced
```

### Mutation testing (Stryker)

```sh
bun run test:mutation              # full run — slow, weekly cadence
bun run test:mutation --incremental # only changed files
```

### Load testing

```sh
bun run test:load                  # runs autocannon on critical routes
bun run test:load -- --url /auth/login --duration 30
```

### E2E (Playwright)

```sh
bun run test:e2e                    # all E2E
bun run test:e2e --grep @critical   # critical paths only
bun run test:e2e --ui               # visual UI mode
bun run test:e2e --debug            # step-through debug
bun run test:e2e --project=webkit   # single browser
```

### Generate Playwright tests (codegen)

```sh
bun run test:e2e:codegen https://localhost:3000
# Interactive recording of browser actions
```

---

## Deployment (Railway)

### Check status

```sh
bun run deploy:status          # Railway status of current deployment
bun run deploy:logs            # Stream production logs
bun run deploy:logs --tail 100 # Last 100 lines
```

### Trigger a deploy

Deployments trigger automatically on merge to `main`. Manual deploy:

```sh
bun run deploy:prod            # Deploy main to production
bun run deploy:staging         # Deploy current branch to staging
```

### Rollback

```sh
bun run deploy:rollback        # Rollback to previous successful deploy
bun run deploy:rollback --to <deployment-id>
```

### Environment variables

```sh
# View env vars (via Railway CLI)
railway variables

# Set an env var (production)
railway variables set KEY=value --env production

# Never run locally — use Railway dashboard for secrets
```

### Release commands

```sh
bun run release                # Create release PR (Changesets)
bun run release:publish        # Publish after merge (CI does this automatically)
bun run version:bump           # Bump version in package.json per changeset
```

---

## Moon — monorepo orchestration

### Run a task

```sh
moon run <project>:<task>

# Examples
moon run api:dev
moon run web:build
moon run db:migrate
```

### Run a task in all projects

```sh
moon run :test        # run test in every project that has it
moon run :build
moon run :lint
```

### Only affected projects

```sh
moon query projects --affected
moon run :test --affected    # run tests only in projects that changed
```

Used in CI to minimize build time.

### Inspect dependencies

```sh
moon query projects           # list all projects
moon query tasks --project api # list tasks on api project
moon project api              # detailed info on api project
```

### Clean

```sh
moon clean                    # clean moon cache
moon clean --lifetime 7d      # clean caches older than 7 days
```

### Moon sync

```sh
moon sync projects            # sync project configs after edits
```

---

## Claude Code & harness

### Start a session

```sh
claude                        # current directory
claude --model opus           # pick a model tier
claude --resume               # resume last session in this dir
```

### Gaia's custom skills

In a Claude Code session:

```
/review                # run the Gaia review skill on current PR
/migrate               # plan a migration (creates ADR + migration files)
/decision              # create an ADR from current discussion
/add-feature <name>    # scaffold a new feature folder
/upgrade-deps          # scan and propose dependency updates
```

Skills live in `.gaia/skills/` and load automatically.

### Hooks

Gaia's Claude Code hooks are wired in `.gaia/hooks/`. They run automatically on:

- `PreToolUse` — checks `.gaia/rules.ts` before allowing risky file ops
- `PostToolUse` — runs `bun run lint:fix` after file edits
- `UserPromptSubmit` — injects relevant context from `docs/`

Enable/disable in `.claude/settings.json`.

### Conductor (parallel Claude Code sessions)

```sh
conductor start               # launch Conductor IDE
# Work happens in git worktrees; each session is isolated
```

Not a CLI command per se — see `docs/runbook/conductor.md` for setup.

---

## Observability & debugging

### Check Sentry for a specific trace

```sh
# (No direct CLI; use the URL pattern)
# https://sentry.io/organizations/<org>/performance/trace/<trace_id>/
```

### Query Axiom logs

```sh
# CLI via Axiom client
bun run logs:query "['gaia-logs'] | where level == 'error' | limit 50"

# Filter by trace_id
bun run logs:trace <trace_id>
```

### Check PostHog

No CLI. Dashboard at `https://app.posthog.com`.

### Health checks

```sh
bun run health:api      # hit /health endpoint locally
bun run health:prod     # hit production /health
```

### View OpenTelemetry spans (local)

```sh
bun run dev:otel-console
# Dumps spans to stdout — useful for debugging instrumentation
```

---

## Troubleshooting

### `bun install` fails with peer dependency error

```sh
bun install --force        # rarely needed; prefer fixing root cause
bun pm ls                  # inspect dep tree
```

### Lockfile out of sync

```sh
bun install --frozen-lockfile  # what CI runs — fails on mismatch
# If this fails locally, regenerate:
rm bun.lock
bun install
# Commit the new bun.lock
```

### Tests fail with "DATABASE_URL not set"

```sh
# Tests use a PR-branch Neon URL from env
# Locally, set TEST_DATABASE_URL in .env.test
cp .env.test.example .env.test
```

### Moon cache stale

```sh
moon clean
# Or nuclear option
rm -rf .moon/cache
```

### Port 3000/4000 already in use

```sh
# Find the process
lsof -i :3000

# Kill
kill -9 <PID>
```

### Claude Code hook failing silently

```sh
# Check hook logs
tail -f ~/.claude/logs/hooks.log

# Disable a hook temporarily
# Edit .claude/settings.json → "hooks": false
```

### Neon branch limit reached (free tier 10 branches)

```sh
bun run neon:branches                    # list active branches
bun run neon:branch:delete --name <name> # delete stale ones
# Also: GitHub Action should auto-delete on PR close
```

### Railway deploy stuck

```sh
bun run deploy:status
bun run deploy:logs

# If stuck in "building"
railway deployment cancel <deployment-id>

# If build fails, inspect logs
railway logs --deployment <deployment-id>
```

### CI failing on format check but local passes

```sh
# Most common: editor auto-saved with different format
bun run format              # fix in place
git add -u
git commit --amend --no-edit
git push --force-with-lease
```

---

## Flag conventions across Gaia commands

Gaia's custom scripts follow these standards everywhere:

| Flag | Meaning |
|---|---|
| `-h, --help` | Show help for this command |
| `-v, --verbose` | Verbose output (equivalent to DEBUG log level) |
| `-q, --quiet` | Minimal output (errors only) |
| `--json` | Output machine-readable JSON |
| `--dry-run` | Show what would happen; don't execute |
| `--force` | Skip confirmation prompts |
| `--env <env>` | Target a specific environment (`local`, `staging`, `production`) |
| `--watch` | Re-run on file change |

---

## Exit codes

Gaia scripts follow POSIX conventions:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General failure |
| 2 | Misuse (bad arguments) |
| 64 | Command line usage error (same as `sysexits.h`) |
| 65 | Data format error |
| 69 | Service unavailable |
| 130 | Interrupted (Ctrl+C) |

CI uses non-zero as failure. Scripts don't exit 0 on partial failure.

---

## Adding a new command

When adding a custom script to `package.json` `scripts` or `moon.yml`:

1. **Verb-object naming** — `db:migrate`, not `migrate:db` or `dbMigrate`
2. **Namespace by domain** — `db:*`, `deploy:*`, `test:*`, `neon:*`
3. **Add a one-line comment** — `// db:migrate — apply pending migrations to current branch`
4. **Update this file** — add under the right section with an example
5. **Support `--help`** — even if trivial; standardized via our CLI wrapper
6. **Add to top-20 table** if it becomes daily driver

---

## What's NOT covered here

This is a reference, not a tutorial. For the *why* and *when*:

- Architecture decisions: `docs/adr/`
- Workflow runbooks: `docs/runbook/`
- Pattern references: `docs/reference/code.md`, `database.md`, etc.
- Claude Code usage: `docs/runbook/claude-code.md`

For third-party CLI docs:

- Bun: https://bun.com/docs
- Moon: https://moonrepo.dev/docs
- Drizzle: https://orm.drizzle.team/docs
- Railway: https://docs.railway.app
- Neon: https://neon.tech/docs
- Playwright: https://playwright.dev

---

*This file is versioned. New commands added to the stack get added here as part of the same PR.*
