---
name: a-dx
description: 'Developer experience audit. CLI ergonomics, getting-started flow, error messages, TTHW. Mode: report. Tier: quick (TTHW only) | standard (8 dimensions) | exhaustive (8 dimensions + competitor benchmark). Triggers: "a-dx", "dx audit", "audit developer experience". Pair: w-review (run before merging dev-facing changes). Artifact: .gaia/audits/a-dx/<YYYY-MM-DD>.md.'
---

# a-dx — Developer experience audit

> Reference: see `reference.md` in this folder (DX patterns; migrated from `.gaia/reference/dx.md` in PR 8 of Initiative 0001).

## Quick reference

- `/a-dx` — full audit.
- `/a-dx report` — report-only.

## Phase 0: Scope select + pre-condition

Confirm scope and mode. Verify `bun run check` is green.

## Phase 1: Read codebase + reference.md

Walk root README, scripts/\*, package.json scripts, CLI help text, error messages thrown by the API.

## Phase 2: Surface findings

Per principle: stdout/stderr separation, getting-started clarity, error message quality, time-to-hello-world budget.

## Phase 3: Optional auto-fix or report

Fix mode applies to mechanical findings (CLI scripts not separating stdout/stderr).

## Phase 4: Final gate

Re-run `bun run check`.

## Output

Mode: **fix** or **report**.
