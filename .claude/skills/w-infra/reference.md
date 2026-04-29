# Infra — Reference

> Sibling skill: `w-infra` (this folder's `SKILL.md`).
> Initiative 0001 shipped the scaffold; Initiative 0006 (CEO-4) grew this to operative depth; Initiative 0004 will extend it with the full Kamal-based self-hosting story.

## What this is

Infrastructure config patterns for Gaia. Owns the four config surfaces every Gaia template ships with: **Kamal** (self-host), **Railway** (managed default), **Docker** (build artifact), and **GitHub Actions** (CI matrix). One declarative artifact per surface; no procedural drift.

`w-infra` is config; `w-deploy` is execution; `w-debug` is recovery. They chain in that order.

## 1. Kamal patterns (self-host target)

Kamal is the v2 self-host target. The contract is one `config/deploy.yml` describing services, registry, accessories, and traefik. All other Kamal config (env, secrets, hooks) is auto-derived.

**Rules:**

- One `config/deploy.yml` per app. Multi-app monorepos use one file per app under `apps/<name>/config/deploy.yml`.
- Service names match the app folder (`apps/api` → `service: api`).
- Env vars are NOT in `deploy.yml`. They live in `.env.production` (gitignored) and are uploaded once via `kamal env push`.
- Accessories (Postgres, Dragonfly, etc.) are PINNED to a tag — never `:latest`. Tag is bumped via PR with a changelog entry.
- Traefik labels live in `deploy.yml`, not in app code.

**Anti-pattern:** SSHing into a Kamal host to fix config. The host is cattle. Edit `deploy.yml`, push, redeploy.

**Pattern:** Kamal hooks (`pre-deploy`, `pre-connect`) are TypeScript scripts under `config/kamal/hooks/`, not bash. They share the project's Bun runtime and lint rules.

## 2. Railway escape hatches (managed default)

Railway is the v0 default — deploy with one click, scale with one slider. Escape hatches keep us from getting trapped on the platform.

**Rules:**

- `railway.toml` is the single source of truth. Service config in the dashboard is mirrored here every commit (CI fails if drift).
- Health check endpoints live at `/health` and `/health/ready` — Railway probes both. `/health` is liveness (200 if process is up); `/health/ready` is readiness (200 only after DB + cache + dependent services connect).
- Env vars: secrets in Railway's vault, non-secrets in `railway.toml`. Never swap.
- Custom domains terminate at Cloudflare; Railway sees the proxied request. SSL is Cloudflare's, not Railway's.
- `railway.toml` declares the build context (`bun install --production && bun run build`) and the start command. No build steps in the Dockerfile when targeting Railway.

**Anti-pattern:** Editing config in the Railway dashboard then forgetting to mirror to `railway.toml`. The dashboard becomes truth, the repo becomes lies, the next operator can't reproduce. CI catches drift but only once a day.

**Pattern:** When Railway can't do something (cron jobs, multi-region, etc.), fall back to **Inngest** for scheduled work and **Cloudflare Workers** for edge logic. Don't fight Railway; route around it.

## 3. Docker stages (build artifact)

A single multi-stage Dockerfile per app. Build → prune → run. Identical artifact for Kamal, Railway, and local-prod testing.

**Rules:**

- Three stages: `builder` (full deps, builds), `pruner` (`bun install --production` + copy artifacts), `runner` (distroless or Alpine, runs).
- The `runner` stage is non-root (`USER bun`). Never run as root in production.
- `runner` HEALTHCHECK invokes `bun run scripts/healthcheck.ts` against `/health`. Same script Railway/Kamal probes hit.
- Bun version is pinned in `oven/bun:<version>` — bumped via PR. Never `:latest`.
- `.dockerignore` lists every `node_modules/`, `.git/`, test fixture, and source map that doesn't need to be in the image. CI fails if image >250MB.
- Layer order: deps copied first (cache), code copied last (invalidates least).

**Anti-pattern:** Installing build tools in `runner` so production can `npm install` at startup. Production images don't install. They run.

**Pattern:** When debugging a prod-only bug, run the Docker image locally with `docker run --rm -p 3000:3000 -e NODE_ENV=production gaia-api:dev`. Same artifact, same behavior, no platform shim.

## 4. GitHub Actions matrix (CI)

`.github/workflows/ci.yml` is the canonical CI surface. One workflow file, multiple jobs, sane defaults.

**Rules:**

- Matrix dimensions: `os` (ubuntu-latest only — macOS/Windows blow CI minutes), `bun-version` (current + latest, no LTS dance because Bun moves fast).
- Required jobs that must pass: `bun run check` (lint + typecheck + test + scripts), `bunx oxfmt --check .`, `osv-scanner` (CVE scan).
- Workflow concurrency: `cancel-in-progress: true` on PRs, `false` on `master`. Don't lose a master deploy by pushing twice.
- Secrets: only `GITHUB_TOKEN` available by default. Anything else (Railway token, Sentry DSN) is referenced explicitly per job and audited via `actionlint`.
- Cache: `~/.bun/install/cache` keyed on `bun.lockb` hash. Saves ~30s per run.
- Artifacts: test results uploaded for 7 days (cheap), build artifacts for 30 (compliance with Initiative 0003 launch checklist).

**Anti-pattern:** Skipping CI with `[skip ci]` in the commit message. We use `paths-ignore` instead — docs-only commits skip code workflows automatically. Manual `[skip ci]` is for emergencies and gets logged.

**Pattern:** A failing job links to the rerun command (`gh run rerun <id> --failed`) in its annotation. The agent reads the annotation, decides whether to rerun (transient) or invoke `w-debug` (real failure).

## Common decisions

| Question                                                 | Answer                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Where do env vars live in dev?                           | `.env.local` (gitignored). Loaded by `bun --env-file=.env.local`.                                                               |
| Where in prod?                                           | Platform vault (Railway secrets / Kamal `kamal env push` / GitHub Actions `secrets.X`).                                         |
| How do I add a new env var?                              | Add to `apps/api/env.ts` schema → bump every consumer → set in vault → ship. CI catches missing vars.                           |
| Where do I declare a new accessory (cache, queue, etc.)? | `config/deploy.yml` (Kamal) or `railway.toml` (Railway).                                                                        |
| What about Cloudflare config?                            | `wrangler.toml` per Worker; main app DNS in Cloudflare dashboard, mirrored to `infra/cloudflare.tf` (Terraform-lite for audit). |

## Cross-references

- Sibling skill: `.claude/skills/w-infra/SKILL.md`
- Companion (execution): `.claude/skills/w-deploy/reference.md`
- Recovery: `.claude/skills/w-debug/reference.md`
- Initiative 0004 (`.gaia/initiatives/0004-gaia-open-source-infra/initiative.md`) extends Kamal coverage post-launch.
- Runbooks: `docs/runbooks/rollback.md` (rollback), future `docs/runbooks/scale-up.md`, `docs/runbooks/disaster.md`.
