---
name: w-debug
description: "Production debugger. Diagnoses + fixes deploy failures, runtime crashes, failing checks, and reproducible bugs from a single entry point. Mode: fix. Tier: hot-fix | forensic. Triggers: 'w-debug', 'deploy failed', 'it broke in prod', 'check is failing', 'fix this bug', 'why is this broken'. Voice: 'debug this', 'something broke', 'production is down'. After: w-deploy (auto-invoked on failure). Artifact: PR + green production verification."
---

# w-debug — Production Debugger

## What this does

Single entry point for "something is broken" — whether the break is at deploy time (Railway / GH Actions failed), at runtime (crash / 5xx / health check timeout), at check time (`bun run check` red), or at user time (reported bug with a repro). Reads the relevant evidence stream, classifies the failure, applies the recovery, ships the fix, verifies green.

## Tiers

- **hot-fix**: production is currently broken (deploy red, app down, health check failing). Goal: fastest safe path to green. Roll back first if blast radius warrants.
- **forensic**: production is fine but a bug has been reported, a check is intermittently failing, or a deploy succeeded with smell. Goal: root cause + permanent fix.

The agent picks the tier from the failure signal. State the chosen tier before phase 1.

## Failure classes

The skill routes on the failure class, then runs the matching pattern. Classes:

1. **Deploy failure** — Railway / GH Actions, build step exits non-zero, migration partial-applied, health check timeout
2. **Runtime failure** — 5xx in production, unhandled exception, OOM, crash loop, port-binding failure
3. **Check failure** — `bun run check` red on a branch (lint, typecheck, or test)
4. **Reported bug** — user-supplied repro: "X happens when I do Y"

Each class has its own evidence source. The full failure-class × recovery-pattern matrix lives in `reference.md`.

## When to use

- After a Railway deploy fails or a GH Actions workflow goes red
- After a health check timeout or production 5xx alert
- When `bun run check` is red and the cause is not obvious from the diff
- When a user reports a reproducible bug with steps
- Anytime someone says "deploy failed", "it broke", "fix this", or "why is this broken"

## Steps

### Step 1: Identify the failure class + tier

Decide which of the 4 classes applies and whether it's hot-fix or forensic. State both before pulling evidence.

### Step 2: Pull the evidence

Per class:

| Class           | Evidence command                                          |
| --------------- | --------------------------------------------------------- |
| Deploy failure  | `railway logs --num 200` + `railway status`               |
| Runtime failure | `railway logs --num 500` + production error tracker       |
| Check failure   | `bun run check` locally; if green, branch may need rebase |
| Reported bug    | User-supplied repro + relevant module logs                |

### Step 3: Diagnose the root cause

Read the evidence. Name the cause in one sentence. Common patterns:

- **Build**: missing dep, lockfile out of sync, Dockerfile stage issue, Bun version mismatch
- **Startup crash**: missing env var, bad import, schema migration failure
- **Health check timeout**: app starts but doesn't bind to port, or crashes after binding
- **Runtime exception**: unhandled exception on a critical path
- **Test failure**: flaky test, real regression, or fixture out of sync
- **User bug**: edge case in a code path, off-by-one, race condition, missing validation

If the cause is outside our code (Railway infra, Postgres unreachable, GitHub outage), tell the user and stop. We don't paper over upstream outages.

### Step 4: Hot-fix tier — roll back first if production is broken

If tier is hot-fix AND production is currently down (5xx, deploy red, app crashing): invoke `w-deploy --rollback` to promote the previous green image digest. Target MTTR ≤5 minutes. Then proceed to fix on a clean branch.

Skip rollback for forensic tier or for failures contained to a branch (check failures, build failures on a PR).

### Step 5: Apply the fix

Minimal fix that resolves the failure. Build order:

1. Fix schema if it's a migration issue
2. Fix env.ts if it's a missing env var (and set it via `railway variable set` for runtime)
3. Fix the actual code/config that broke

For reported bugs, write the failing test FIRST (must reproduce the bug), then fix until green.

### Step 6: Verify locally

```sh
bun run check
```

All lint, typecheck, and tests must pass. For runtime fixes, also exercise the failing path locally if possible.

### Step 7: Ship the fix

Invoke gstack `/ship` to commit, push, and create a PR (or push to the existing branch).

### Step 8: Merge + verify production green

After CI passes:

```sh
gh pr merge --squash --delete-branch
```

Wait for the deploy to trigger and verify:

```sh
railway logs --num 50
```

For deploy/runtime classes: confirm the app is healthy. For check/bug classes: confirm the original failure no longer reproduces.

### Step 9: Encode the learning (forensic tier only)

If the failure could recur, invoke `h-rules` to add a rules.ts entry. Skip for true one-offs.

## Output

Mode: **fix** — the skill mutates code (and possibly platform state via `railway variable set` / rollback), opens a PR, merges it, and verifies production. Reports the failure class + root cause + applied fix + green verification.

```
=== W-DEBUG REPORT ===
Class: deploy | runtime | check | bug
Tier: hot-fix | forensic
Root cause: {one-sentence diagnosis}
Fix: {what changed}
Rollback: yes (digest <hash>) | no
PR: #{N} (merged | open)
Production: green | pending verification | unchanged
```

## Failure modes

When the skill cannot complete:

- **Cause is upstream** (Railway, Postgres, GitHub outage) — abort. Tell the user, stop. Don't paper over it.
- **Root cause is not identifiable from logs** after Step 3 — escalate. Add an entry to `decisions/humantasks.md` with the evidence collected and stop. Don't ship a guess.
- **Fix passes locally but production stays red** after Step 8 — roll back via `w-deploy --rollback`, escalate to humantasks.md with both the local-green and prod-red evidence.
- **Hot-fix tier exceeds 5-minute MTTR target** — note in PR description; review the runbook in retro for what slowed recovery. Don't block the recovery on the post-mortem.

In all escalation cases, the W-DEBUG REPORT block still gets written with `Production: unchanged` or `pending verification` and a clear `Root cause: UNKNOWN` or `Root cause: <upstream reason>`. Never pretend a partial run was a full one.

## Rules

- NEVER guess at the fix without reading evidence first
- NEVER skip `bun run check` before shipping
- ALWAYS state the failure class + tier before pulling evidence
- ALWAYS state the root cause diagnosis before fixing
- For hot-fix tier with production down: ROLL BACK FIRST, then fix on a green branch
- NEVER fix-forward in the middle of a production failure — it compounds blast radius
- For reported bugs: write the failing test first, then fix
- If the cause is upstream (Railway / Postgres / GitHub outage), tell the user and stop
- If multiple failures cluster on the same root cause, fix them in one PR — don't churn
- If a fix requires a new env var, set it via `railway variable set` BEFORE deploying
- ALWAYS verify production green at the end — the goal is full recovery, not just a merged PR
