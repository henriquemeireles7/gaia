# Debug — Reference

> Sibling skill: `w-debug` (this folder's `SKILL.md`).

## What this is

The single debugger pattern across four failure classes: deploy, runtime, check, bug. Reads the relevant evidence stream, diagnoses the failure class, applies the matching recovery pattern, ships the fix, verifies green. Two tiers: **hot-fix** (production currently broken — speed) and **forensic** (production fine, but something is wrong — root cause).

## Failure classes × recovery pattern

| Class                        | Signal                                     | Evidence                               | Recovery                                            |
| ---------------------------- | ------------------------------------------ | -------------------------------------- | --------------------------------------------------- |
| **Deploy** — build failure   | Build step exits non-zero                  | `railway logs --num 200`               | Read build log, fix code, re-run gstack `/ship`     |
| **Deploy** — migration       | DB migration step fails or partial-applied | `railway logs` + `bun db:status`       | Roll back migration, fix schema, re-deploy          |
| **Deploy** — health check    | `/health/ready` 5xx after deploy           | `railway logs --num 200`               | Roll back to previous image digest; fix; re-deploy  |
| **Deploy** — env mismatch    | Boot panics on missing/invalid env var     | `railway logs` first 50 lines          | Set env var on platform; bounce service             |
| **Deploy** — dep / CVE       | osv-scanner or CI rejects merge            | `bun run check` + osv output           | Bump dep; re-run check; ship                        |
| **Deploy** — bad master push | Operator force-pushed; CI red on master    | `gh run list --branch master`          | Revert PR; re-deploy from prior green commit        |
| **Runtime** — 5xx            | Production 5xx alert / Sentry burst        | `railway logs --num 500` + Sentry      | Identify route; isolate; ship fix; canary           |
| **Runtime** — crash loop     | Pod / container restarts repeatedly        | `railway logs --num 500`               | Roll back to last green digest; fix; re-deploy      |
| **Runtime** — OOM            | Memory limit exceeded                      | `railway logs` for OOMKilled signature | Identify allocator; bound it; ship                  |
| **Check** — typecheck red    | `bun run check` typecheck fails            | `bun run typecheck` output             | Fix types; re-run; ship                             |
| **Check** — test red         | `bun run check` test fails                 | `bun test --filter=<failing>`          | Determine flake vs regression; fix root cause; ship |
| **Check** — lint red         | `bun run check` lint fails                 | `bun run lint` output                  | Fix; ship (don't auto-fix without review)           |
| **Bug** — user repro         | "X happens when I do Y"                    | User repro + module logs               | Write failing test (TDD); fix until green; ship     |

## Tier decisions

- **hot-fix**: production currently broken. Roll back FIRST if app is down or deploys are red on master. Fix on a clean branch. Target MTTR ≤5 minutes from failure detection.
- **forensic**: production fine. Root-cause investigation is the goal — no rollback. Take time to write a regression test before fixing.

## Rollback contract

`w-deploy` (→ `w-deploy` post-rename) exposes `--rollback` which promotes the previous image digest. Rollback MTTR target: ≤5 minutes from failure detection (per `w-deploy/reference.md`).

## Anti-patterns

1. **Fix-forward in a fire**: never fix-forward when production is broken. Roll back first; fix on a green branch; re-deploy after the fix lands. Fix-forward in the middle of a failure compounds the blast radius.
2. **Fix without evidence**: never write a fix before reading the relevant log/repro stream. Hypothesis-first debugging finds the wrong cause about half the time.
3. **Skip the test for a "small" bug**: every reported bug gets a failing test before the fix. The test is what stops it from regressing.
4. **Paper over an upstream outage**: if Railway / Postgres / GitHub is down, that's not our bug to fix. Tell the user and stop.

## Cross-references

- Sibling skill: `.claude/skills/w-debug/SKILL.md`
- Auto-invoked by: `w-deploy` (→ `w-deploy`) on failure exit, or by the operator.
- Ship workflow: `.claude/skills/w-deploy/reference.md`
- Rollback runbook: `docs/runbooks/rollback.md`
