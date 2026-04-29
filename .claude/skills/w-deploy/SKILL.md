---
name: w-deploy
description: 'Deploy after gstack /ship. Runs the configured deploy target (Railway by default), verifies health, calls w-debug on failure. Mode: fix. Triggers: "w-deploy", "deploy", "deploy now". After: gstack /ship. Artifact: production deployment + health-verified release (or rolled-back image digest on failure).'
---

# w-deploy — Deploy after ship

> Reference: see `reference.md` in this folder (deployment patterns; migrated from `.gaia/reference/deployment.md` in PR 9 of Initiative 0001).

## Quick reference

- `/w-deploy` — deploy current branch's PR after merge.
- `/w-deploy --rollback` — promote previous image digest.

## Phase 0: Pre-condition

PR is merged + green CI. Detect deploy target (Railway / Fly.io / custom) from `.gaia/deploy.json` or root CLAUDE.md.

## Phase 1: Trigger deploy

Invoke the deploy target (e.g. `railway up`, `flyctl deploy`).

## Phase 2: Watch + verify

Tail deploy logs. Hit `/health` and `/health/ready` until 200; bail at TTFD budget (≤30 min).

## Phase 3: On failure → w-debug

If deploy fails, invoke `w-debug` with the failure context. Otherwise report success.

## Phase 4: Final gate

Production health check + post-deploy smoke test (synthetic ping).

## Output

Mode: **fix** (deploys + recovers via w-debug) or **report** (preview deploy status).

## Failure modes

- **Deploy target invocation fails** (Railway/Fly auth, missing config) — abort, report the platform error, don't retry blindly.
- **Health check times out past TTFD budget (≤30 min)** — auto-invoke `w-debug` (deploy mode) with the timeout context.
- **Rollback path itself fails** (previous image digest unavailable, platform regression) — escalate to `decisions/humantasks.md` immediately. This is a runbook gap; document it.
- **Production health-check deps unreachable** (Postgres, cache) — that's an upstream issue; report and stop. Don't ship code over an outage.
