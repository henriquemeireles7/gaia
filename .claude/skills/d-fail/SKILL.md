---
name: d-fail
description: "Deploy failure recovery. Checks Railway logs, diagnoses the failure, fixes the code, ships the fix, and merges the PR. Triggers: 'd-fail', 'deploy failed', 'deploy broke', 'railway failed', 'fix the deploy'."
---

# d-fail — Deploy Failure Recovery

## What this does
When a deploy fails on Railway, this skill pulls the logs, diagnoses the root cause,
fixes the code, runs checks, ships the fix via /ship, and merges the PR — end to end.
One command to go from "deploy failed" to "fixed and merged."

## When to use
- After a Railway deploy fails
- After a health check timeout
- After a build failure in production
- Anytime the user says "deploy failed" or "it's broken in prod"

## Steps

### Step 1: Pull Railway Logs
```sh
railway logs --num 200
```
Read the last 200 lines of Railway logs. Look for:
- Build errors (dependency missing, TypeScript compilation, Dockerfile issue)
- Runtime errors (crash on startup, unhandled exception, missing env var)
- Health check failures (app doesn't respond in time)

If the logs are unclear, also check:
```sh
railway status
```

### Step 2: Diagnose the Root Cause
Analyze the logs and identify the specific failure. Common patterns:

- **Build failure**: Missing dependency, lockfile out of sync, Dockerfile stage issue
- **Startup crash**: Missing env var, bad import, schema migration failure
- **Health check timeout**: App starts but doesn't bind to port, or crashes after binding
- **Runtime error**: Unhandled exception on a critical path

State the diagnosis clearly before proceeding to fix.

### Step 3: Fix the Code
Apply the minimal fix that resolves the deploy failure. Follow the build order:
1. Fix schema if it's a migration issue
2. Fix env.ts if it's a missing env var (and set it via `railway variable set`)
3. Fix the actual code/config that broke

### Step 4: Verify Locally
```sh
bun run check
```
All lint, typecheck, and tests must pass.

### Step 5: Ship the Fix
Invoke /ship to commit, push, and create a PR (or push to the existing branch/PR).

### Step 6: Merge the PR
After CI passes, merge the PR:
```sh
gh pr merge --squash --delete-branch
```
Wait for the Railway deploy to trigger from the merge, then verify:
```sh
railway logs --num 50
```
Confirm the deploy succeeds and the app is healthy.

### Step 7: Encode the Learning (if systematic)
If this failure could recur, invoke /d-harness to encode a prevention rule.
Skip this for true one-offs (typo, missing comma, etc.).

## Rules
- NEVER guess at the fix without reading the logs first
- NEVER skip `bun run check` before shipping
- ALWAYS state the root cause diagnosis before fixing
- ALWAYS merge the PR at the end — the goal is full recovery, not just a fix
- If the fix requires a new env var, set it via `railway variable set` BEFORE deploying
- If multiple things are broken, fix them all in one PR — don't create churn
- If the logs show a problem outside our code (Railway infra, PostgreSQL down), tell the user instead of trying to fix it
