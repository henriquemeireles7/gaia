---
name: a-ux
description: 'User experience audit. User flows, states, journey, accessibility patterns. Mode: report. Tier: quick (single flow) | standard (all critical flows + a11y) | exhaustive (complete journey map + edge states). Triggers: "a-ux", "ux audit", "audit ux". Pair: w-review (run before merging user-facing changes). Artifact: .gaia/audits/a-ux/<YYYY-MM-DD>.md.'
---

# a-ux — User experience audit

> Reference: see `reference.md` in this folder (UX patterns; migrated from `.gaia/reference/ux.md` in PR 8 of Initiative 0001).

## Quick reference

- `/a-ux` — full audit.
- `/a-ux <flow>` — narrow to one user flow.

## Phase 0: Scope select + pre-condition

Confirm scope. Verify `bun run check` is green.

## Phase 1: Read codebase + reference.md

Walk `apps/web/src/routes/**`, focus on signup, onboarding, billing, settings.

## Phase 2: Surface findings

Per principle: states (loading/empty/error), accessibility, navigation, progressive disclosure.

## Phase 3: Optional auto-fix or report

Most UX is judgment-tier; fix mode applies to mechanical fixes only.

## Phase 4: Final gate

Re-run `bun run check`.

## Output

Mode: **fix** or **report**.
