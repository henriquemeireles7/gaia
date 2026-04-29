---
name: d-security
description: 'Security audit skill. Reads codebase against the security principles, surfaces findings, optional auto-fix or report-only. Triggers: "d-security", "security audit", "audit security".'
---

# d-security — Security audit

> Reference: see `reference.md` in this folder (security principles; migrated from `.gaia/reference/security.md` in PR 8 of Initiative 0001).

## Quick reference

- `/d-security` — full audit, fix mode (auto-fix where mechanical).
- `/d-security report` — report-only, no mutations.
- `/d-security <scope>` — narrow to a single principle or path glob.

## Phase 0: Scope select + pre-condition

Confirm scope (full / narrow), confirm mode (fix / report). Verify `bun run check` is green before mutating anything; if not, abort and surface the failure.

## Phase 1: Read codebase + reference.md

Load `reference.md` (auto-loaded by skill-reference hook). Walk the codebase paths the principles cover (typically `apps/api/server/**`, `packages/security/**`, route wrappers).

## Phase 2: Surface findings

For each principle, report findings as: severity / file:line / principle id / fix proposal. No fixes applied yet.

## Phase 3: Optional auto-fix or report

Fix mode: apply mechanical fixes (the ones with safe, deterministic transforms); leave judgment-tier findings as a report. Report mode: emit the findings markdown only.

## Phase 4: Final gate

Re-run `bun run check`. If red, the fix introduced a regression — revert and surface to operator.

## Output

Mode: **fix** (default) or **report**. Reports include numeric confidence per finding.
