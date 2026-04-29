---
name: h-skill
description: 'Author or rewrite a SKILL.md file. Adversarial-review of phases, then write per skills.md conventions, then validate frontmatter. Mode: fix. Triggers: "h-skill", "write a skill", "create new skill", "audit skill", "rewrite skill". Artifact: .claude/skills/<skill>/SKILL.md (created or rewritten in place).'
---

# h-skill — Author / rewrite a SKILL.md

## Quick Reference

- `/h-skill <name>` — author a new skill at `.claude/skills/<name>/SKILL.md`
- `/h-skill rewrite <name>` — rewrite an existing skill against current `skills.md` conventions

## What this does

Implements the workflow defined in `.gaia/reference/skills.md`. The skill enforces: required frontmatter (`name`, `description`), the 10-section canonical structure (frontmatter, H1, Quick Reference, What this does, When to run, Phase 0 pre-condition, Phase N work, Phase final gate, Output, Rules), and the sandwich-gate pattern (same `bun run check` at start and end).

Fix mode — the skill writes the file. Output: the new SKILL.md + (optional) sibling scripts under `<skill>/scripts/` + a folder-name validation pass.

## When to run

- Adding a new skill (recurring multi-phase procedure with consistent output)
- Rewriting a stale skill (per `methodology.md` §"audit skills quarterly")
- Updating a skill after a phase-count or output-format change (ADR-worthy per `skills.md`)

---

## Phase 0: Pre-condition (`bun run check`)

```sh
bun run check
```

Must pass. If failing, stop — fix that first.

Then read, in this order:

1. `.gaia/reference/code.md` — original 4-part principle shape (skills inherit this)
2. `.gaia/reference/skills.md` — the 8 skill principles + canonical structure
3. `.gaia/reference/methodology.md` — Constitutional Loop, when-to-add-a-skill threshold
4. `.gaia/reference/ax.md` — agent experience patterns
5. The existing skill being rewritten (if rewrite mode)
6. ≥2 reference skills for shape: `.claude/skills/w-review/SKILL.md`, `.claude/skills/w-code/SKILL.md`

Cold-start guarantee.

---

## Phase 1: Validate the trigger

Before writing, confirm the skill is justified per `methodology.md` §"Add a skill when output must be consistent AND ≥3 phases":

- [ ] Output must be consistent (same input → same output)
- [ ] Procedure has ≥3 phases
- [ ] Discoverable by name (user / agent invokes by `/<name>`)
- [ ] Not a CLAUDE.md style guide (no output mutation)
- [ ] Not a single-shot research task (chat handles those)

If any of these is "no," halt and propose alternative: a CLAUDE.md addition, a script, or a reference principle. Don't ship a "skill" that's actually a tip.

---

## Phase 2: Adversarial review of the phase shape

Pick a panel of 6 specialists for the skill's domain. Per phase (after the first draft of phases): one-line comment from each. Conclusions tighten or restructure.

Specialist sets by skill type:

| Skill purpose              | Panel                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Code review / quality gate | Joel Spolsky · Linus Torvalds · Hillel Wayne · Camille Fournier · Pamela Fox · Bret Victor       |
| Implementation / TDD       | Kent Beck · Sandi Metz · Jessica Joy Kerr · Will Larson · Rich Harris · GeePaw Hill              |
| Documentation / writing    | Diana Larsen · Phillip Carter · Tantek Çelik · Anne Helen Petersen · Joel Spolsky · Bret Victor  |
| Health / audit             | Charity Majors · Will Larson · Tanya Reilly · Camille Fournier · Hamel Husain · Sarah Constantin |
| Deploy / failure recovery  | Adam Wiggins · Charity Majors · Tanya Reilly · Jez Humble · Camille Fournier · Will Larson       |

Show panel review in the PR body for traceability. Format identical to `h-reference`:

```
### Phase N: <name>

| Specialist | Comment |
| --- | --- |
| Name      | One-line |

**Conclusion:** <synthesis>

**Phase rewritten:** <new phase title + first sentence>
```

---

## Phase 3: Write the SKILL.md

Use the canonical structure from `skills.md`:

```md
---
name: <skill-name>
description: '<one-sentence purpose>. Triggers: "<phrase 1>", "<phrase 2>", "<phrase 3>".'
---

# <skill-name> — <full title>

## Quick Reference

- `/<name>` — default mode
- `/<name> <flag>` — variant if any

## What this does

<One paragraph: problem + default mode>

## When to run

- <concrete trigger 1>
- <concrete trigger 2>

## Phase 0: Pre-condition (`<command>`)

\`\`\`sh
<command>
\`\`\`

<What this gate verifies. What to do if it fails.>

Then read, in order: <list of references / files>

## Phase 1: <work step>

<Detailed instructions, code snippets, examples>

## Phase 2: <next step>

...

## Phase N: Final gate (re-run `<same command>`)

\`\`\`sh
<same command as Phase 0>
\`\`\`

<Sandwich pattern: identical gate to Phase 0; skill incomplete until green.>

## Output

<Specific format. Lead with finding/fix/question, not phase narration. Include numeric confidence on reports.>

## Rules

- ALWAYS <rule 1>
- NEVER <rule 2>
```

**Validation requirements (`scripts/check-skills.ts`):**

- Frontmatter starts with `---`
- `name:` field exists and equals folder name
- `description:` field exists; non-empty

---

## Phase 4: Create sibling files (if applicable)

Layout per `skills.md` §8:

```
.claude/skills/<name>/
├── SKILL.md
├── scripts/         # invoked from SKILL.md via shell
│   └── *.ts
├── templates/       # inputs the skill reads (rare)
│   └── *.md
└── rules-*.md       # sub-instructions referenced from SKILL.md (rare)
```

Only create folders that the SKILL.md references. Empty folders = layout debt.

---

## Phase 5: Add `rules.ts` entry for the skill itself

If the skill enforces a new principle (e.g., d-tokens enforces tokens-in-sync), add a `rules.ts` entry:

```ts
{
  id: '<area>/<principle>',
  reference: '<domain>',
  description: '<what the skill enforces>',
  tier: 'lint' | 'architecture' | 'hook',
  mechanism: { kind: 'script', script: '.claude/skills/<name>/scripts/<file>.ts' },
}
```

Skills that are pure procedures (w-review, w-code) don't add rules; they consume them.

---

## Phase 6: Update resolvers + MANIFEST

1. **Root `CLAUDE.md`** — add the skill to the appropriate skills-resolver table (Workflow loop / Foundation)
2. **`.gaia/MANIFEST.md`** — add the skill folder to the index if new

---

## Phase 7: Final gate (`bun run check`)

```sh
bun run check
```

Same script as Phase 0. The skill is incomplete until this is green again. Specifically:

- `scripts/check-skills.ts` validates the new SKILL.md frontmatter
- `oxfmt` formats the file (markdown style)
- `tsc` confirms any sibling `.ts` files type-check

If `check-skills.ts` rejects the SKILL.md, fix the frontmatter and re-run.

---

## Output

Mode: **fix** — the skill writes a new (or rewritten) `.claude/skills/<name>/SKILL.md` plus optional sibling files, validates frontmatter, and verifies the check pipeline. Posted to the PR body:

```
=== D-SKILL: .claude/skills/<name>/SKILL.md ===

Adversarial reviews: <N> phases, 6 specialists each
SKILL.md: <line count> lines
Sibling scripts: <list or "none">
Frontmatter validation: pass
Resolvers updated: CLAUDE.md (root), MANIFEST.md
Check pipeline: green
```

---

## Rules

- ALWAYS read `.gaia/reference/skills.md` and `code.md` before authoring (Phase 0)
- NEVER skip Phase 1 (the trigger validation) — most "should be a skill" candidates aren't
- ALWAYS sandwich the work between identical gates (Phase 0 + final phase = same `bun run check`)
- NEVER ship a skill without a Quick Reference, Output section, and Rules
- ALWAYS make `name` (frontmatter) match the folder name; renaming is a breaking change (ADR per `skills.md` §1)
- NEVER write a "skill" that's just a tip — that's a CLAUDE.md addition

## Failure modes

- **Adversarial review (Phase 3) finds critical gaps** that the author won't or can't address — escalate to `decisions/humantasks.md` with the gap list and stop. Don't ship a SKILL.md that fails its own review.
- **Frontmatter validation fails after rewrite** (e.g. unparseable YAML, missing required field) — abort the rewrite, leave the prior SKILL.md in place, report the YAML error.
- **`bun run check` red on the final gate** — revert the rewrite. Report what failed and why.
