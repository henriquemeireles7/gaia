# Review — Reference

> Status: scaffolded.
> Sibling skill: `w-review` (this folder's `SKILL.md`).

## What this is

The Gaia pre-commit review checklist. Runs BEFORE gstack `/review` in the execution chain (per `h-rules/reference.md` Part 4). Fast pass/fail against `.gaia/rules.ts` and the principles in skill `reference.md` files.

## Execution chain position

```
w-code  →  w-review  →  gstack /review  →  gstack /qa  →  gstack /ship  →  w-deploy
           ^^^^^^^^
           this skill
```

`w-review` is the principle-pass-fail gate. gstack `/review` is the deep correctness pass that runs on principle-passing diffs. A failure here kicks back to `w-code` immediately — saves the cost of a deep review on principle-violating code.

## What it checks

1. **Mechanical rules** — every rule in `.gaia/rules.ts` whose `mechanism.kind` is not `pending` runs against the diff.
2. **Pending rules** — flagged advisory; not blocking.
3. **Reference principles** — each skill's `reference.md` principles checked against the diff scope.
4. **Coverage** — `bun run rules:coverage` reports rules without references and references without rules.

## Output modes

- **fix** — auto-applies mechanical fixes (formatter, lint auto-fix), surfaces judgment-tier findings as a report.
- **report** — surfaces findings; never mutates.

## Cross-references

- Sibling skill: `.claude/skills/w-review/SKILL.md`
- Rules source: `.gaia/rules.ts`
- The Constitutional Loop: `.claude/skills/h-rules/reference.md`
- Coverage report: `bun run rules:coverage`
