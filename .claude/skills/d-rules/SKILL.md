---
name: d-rules
description: 'Author rules.ts entries from a skill''s reference principles. Triggers: "d-rules", "write rules", "rules from reference", "emit rule entries", "rule coverage".'
---

# d-rules — Author rules.ts entries from reference principles

> Status: scaffolded — full SKILL.md content lands in PR 6 of Initiative 0001.
> Reference: see `reference.md` in this folder (rules.md content; merged from methodology.md + harness.md + workflow.md in PR 2).

## Quick reference

- `/d-rules <skill>` — emit rules.ts entries for `<skill>`'s reference principles.
- `/d-rules audit` — walk every skill, surface unmapped principles.

## What this does

For each principle in a skill's `reference.md` (in the 5-part shape per `d-reference/reference.md`), emit a typed entry in `.gaia/rules.ts` with mechanism + tier + reference link. Closes the Skill ↔ Reference ↔ Rules triad.

(Phases will be filled in PR 6.)
