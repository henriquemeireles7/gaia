# Fail — Reference

> Status: scaffolded.
> Sibling skill: `d-fail` (this folder's `SKILL.md`).

## What this is

Deploy failure recovery patterns. Invoked by `d-deploy` (or directly by the operator) when a deploy fails. Reads logs, diagnoses the failure class, applies the recovery pattern, ships the fix, merges the PR.

## Failure classes + recovery pattern

| Class                       | Signal                                     | Recovery                                           |
| --------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Build failure               | Build step exits non-zero                  | Read build log, fix code, re-run gstack `/ship`    |
| Migration failure           | DB migration step fails or partial-applied | Roll back migration, fix schema, re-deploy         |
| Health check failure        | `/health/ready` 5xx after deploy           | Roll back to previous image digest; fix; re-deploy |
| Env mismatch                | Boot panics on missing/invalid env var     | Set env var on platform; bounce service            |
| Dependency / CVE block      | osv-scanner or platform CI rejects merge   | Bump dep; re-run check; ship                       |
| Bad commit pushed to master | Operator force-pushed; CI red on master    | Revert PR; re-deploy from prior green commit       |

## Rollback contract

`d-deploy` exposes `--rollback` which promotes the previous image digest. Rollback MTTR target: ≤5 minutes from failure detection (per `d-deploy/reference.md`).

## Anti-pattern

Don't fix-forward when the production system is broken. Roll back first; fix on a green branch; re-deploy after the fix lands. Fix-forward in the middle of a failure compounds the blast radius.

## Cross-references

- Sibling skill: `.claude/skills/d-fail/SKILL.md`
- Triggered by: `d-deploy` on failure exit, or operator manual invocation.
- Ship workflow: `.claude/skills/d-deploy/reference.md`
- Rollback runbook (when written): `.gaia/runbooks/rollback.md`
