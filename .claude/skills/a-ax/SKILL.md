---
name: a-ax
description: 'Agent experience audit. SKILL.md frontmatter, phase shape, output modes, cold-start safety. Mode: report. Tier: quick (frontmatter only) | standard (frontmatter + phases + output) | exhaustive (full cold-start TTHW measurement per skill). Triggers: "a-ax", "ax audit", "audit agent experience". Pair: h-skill (output drives skill-authoring fixes). Artifact: .gaia/audits/a-ax/<YYYY-MM-DD>.md.'
---

# a-ax — Agent experience audit

> Reference: see `reference.md` in this folder (AX patterns; migrated from `.gaia/reference/ax.md` in PR 8 of Initiative 0001).

## Quick reference

- `/a-ax` — full audit across every skill folder.
- `/a-ax <skill>` — narrow to one skill.

## Phase 0: Scope select + pre-condition

Confirm scope. Verify `bun run check` is green.

## Phase 1: Read every SKILL.md + reference.md sibling

Load reference.md. Walk `.claude/skills/*/SKILL.md`; check frontmatter, phase shape, sandwich gates, output mode.

## Phase 2: Surface findings

Per skill: missing frontmatter, phase count <3, no sibling reference.md, output mode missing, cold-start unsafe.

## Phase 3: Optional auto-fix

Fix mechanical issues (frontmatter, output section). Judgment-tier findings (phase quality, sandwich gates) stay as report.

## Phase 4: Final gate

Re-run `scripts/check-skills.ts` and `bun run check`.

## Output

Mode: **fix** or **report**.
