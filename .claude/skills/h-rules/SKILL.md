---
name: h-rules
description: 'Author rules.ts entries from a skill''s reference principles. Mode: fix. Triggers: "h-rules", "write rules", "rules from reference", "emit rule entries", "rule coverage". Artifact: .gaia/rules.ts (new entries appended; SkillDomain enum updated if a new skill is introduced).'
---

# h-rules — Author rules.ts entries from reference principles

> Reference: see `reference.md` in this folder (the constitutional layer — Skill ↔ Reference ↔ Rules triad, mechanism inventory, rules.ts entry shape).

## Quick reference

- `/h-rules <skill>` — emit rules.ts entries for `<skill>`'s reference principles.
- `/h-rules audit` — walk every skill, surface unmapped principles + pending entries past 14-day SLO.

## What this does

For each principle in a skill's `reference.md` (5-part shape per `h-reference/reference.md`), emit a typed entry in `.gaia/rules.ts` with mechanism + tier + reference link. Closes the Skill ↔ Reference ↔ Rules triad.

## Phase 0: Pre-condition — confirm inputs

Before doing any work, verify:

1. The target skill folder exists at `.claude/skills/<skill>/`.
2. The skill has a `reference.md` sibling. If missing, abort and tell the operator to run `h-reference` first.
3. The reference uses the 5-part principle shape (per `h-reference/reference.md`). If it doesn't, abort and tell the operator to run `h-reference` first.
4. `.gaia/rules.ts` is writable and currently parses (run `bun run check` first).

If the input is `audit` instead of a skill name, skip 1–3; this mode reports across every skill.

## Phase 1: Walk the reference principles

Read the skill's `reference.md`. Extract every numbered principle (`### N. <title>`). For each, capture:

- **id candidate** — `<skill-domain>/<kebab-title>` (e.g. `security/protect-config` for the principle "Protect config files" in `a-security/reference.md`).
- **description** — first sentence of the principle.
- **enforcement mechanism** — read the **Enforcement:** line; map it to one of the seven surfaces (`tsc`, `oxlint`, `ast-grep`, `script`, `hook`, `ci`, `pending`).
- **tier** — `lint` for static checks, `hook` for agent-time gates, `architecture` for judgment-tier, `test` for test-coverage rules.

If the **Enforcement:** line says `pending`, capture the named target mechanism (it must be specific, not "TBD").

## Phase 2: Diff against current rules.ts

Compare the captured set against `rules` in `.gaia/rules.ts`:

- **Already present + mechanism unchanged** — no-op. Skip.
- **Present but mechanism drift** (reference says `ast-grep`, rules.ts says `pending`) — flag for operator review; do not auto-edit.
- **Present in rules.ts but not in reference** — flag as orphan; recommend either (a) deleting the rule or (b) adding a principle to the reference.
- **Missing from rules.ts** — author the entry.

## Phase 3: Author missing entries

For each missing entry, write a `Rule` object literal at the appropriate spot in `.gaia/rules.ts` (group by `skill` field). Shape:

```ts
{
  id: '<skill-domain>/<kebab-title>',
  skill: '<skill-name>',         // post-PR-15 schema; today: reference field
  description: '<one sentence>',
  tier: '<tier>',
  mechanism: { kind: '<surface>', ...details },
}
```

Pending entries name their target mechanism in `note:` (e.g. `"ast-grep rule X (planned)"`).

## Phase 4: Verify the loop closes

Run:

```sh
bun run rules:coverage
```

Confirm:

1. Every newly-authored rule appears in the report.
2. No drift surfaces between the skill's reference and rules.ts.
3. `bun run check` is green.

If `audit` mode: produce a markdown table of pending entries with `(days_pending)` per row; flag entries past the 14-day SLO.

## Phase 5: Final gate — same as Phase 0

Re-verify:

1. The skill's `reference.md` is unchanged (this skill never edits references; it only emits rules entries).
2. `.gaia/rules.ts` parses and `bun run check` is green.
3. Coverage report is consistent.

If any verify step fails, surface the failure and stop. Do not commit.

## Output

One mode: **fix**. Authors entries directly in `.gaia/rules.ts` and reports the diff.

For `audit` mode: **report** only. No file mutations.

Confidence: high for principle extraction (5-part shape is mechanically parseable). Low for mechanism mapping when the reference's **Enforcement:** line is vague — surface to operator with a specific question.

## Failure modes

- **Reference principles are unparseable** (no 5-part shape detectable) — report which principles need `h-reference` first. Don't author rules over a malformed reference.
- **Mechanism mapping is ambiguous** for a principle (operator can't tell hook vs lint vs test) — surface the specific question; pause until clarified. Don't pick a mechanism on a coin flip.
- **rules.ts compile fails** after insertion (duplicate id, invalid SkillDomain) — revert the insertion; report the conflict.
