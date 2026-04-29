---
name: d-deploy
description: 'Deploy after gstack /ship. Runs the configured deploy target (Railway by default), verifies health, calls d-fail on failure. Triggers: "d-deploy", "deploy", "deploy now".'
---

# d-deploy — Deploy after ship

> Reference: see `reference.md` in this folder (deployment patterns; migrated from `.gaia/reference/deployment.md` in PR 9 of Initiative 0001).

## Quick reference

- `/d-deploy` — deploy current branch's PR after merge.
- `/d-deploy --rollback` — promote previous image digest.

## Phase 0: Pre-condition

PR is merged + green CI. Detect deploy target (Railway / Fly.io / custom) from `.gaia/deploy.json` or root CLAUDE.md.

## Phase 1: Trigger deploy

Invoke the deploy target (e.g. `railway up`, `flyctl deploy`).

## Phase 2: Watch + verify

Tail deploy logs. Hit `/health` and `/health/ready` until 200; bail at TTFD budget (≤30 min).

## Phase 3: On failure → d-fail

If deploy fails, invoke `d-fail` with the failure context. Otherwise report success.

## Phase 4: Final gate

Production health check + post-deploy smoke test (synthetic ping).

## Output

Mode: **fix** (deploys + recovers via d-fail) or **report** (preview deploy status).
