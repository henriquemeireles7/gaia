# Skills — Writing SKILL.md files

> Status: Reference
> Last verified: April 2026
> Scope: Conventions for the markdown files under `.claude/skills/<name>/SKILL.md`
> Paired with: `ax.md` (broader agent experience), `methodology.md` (when to add a skill vs reference vs hook)

---

## What this file is

Skills are how the agent acquires verbs. A skill is a markdown file (with optional sibling scripts) that the agent invokes via the `Skill` tool. The contract — frontmatter, structure, output format — has been implicit across the existing `d-*` skills. This file makes it explicit.

If you're deciding whether something should be a skill at all, read `methodology.md` §"When to add a skill" first.

---

## The 8 skill principles

### Naming and shape

**1. Skills live in `.claude/skills/<name>/SKILL.md`.**
Each skill is a folder. The folder name IS the invocable name (`d-tdd` → `/d-tdd`). A SKILL.md is mandatory; sibling files (scripts, sub-rules) are optional.

**2. Frontmatter is the contract.**
Every SKILL.md begins with YAML frontmatter declaring `name` and `description`. The harness shows the description to the agent as part of "available skills" — write it like a tool description, not a marketing tagline. Triggers go in the description so the agent knows when to invoke.

```yaml
---
name: d-review
description: 'Pre-commit review: script-first mechanical checks + AI-powered logic review. Triggers: "d-review", "review the code", "pre-commit check".'
---
```

**3. The first line after frontmatter is the title.**

```md
# d-review — Intelligent Pre-Commit Review
```

This becomes the H1 the agent reads when running the skill. Keep it short and parallel across skills.

### When to invoke vs when to instruct

**4. Skills are imperative; CLAUDE.mds are declarative.**
A skill is invoked. The agent runs through its phases in order. A CLAUDE.md is read for context — the agent uses it to inform its decisions but isn't following a script. If your "skill" is really just principles to consult, it's a reference, not a skill.

**5. Self-contained — assume cold start.**
The agent invoking a skill might have no prior context about the project. The skill file must include enough instruction that the agent can complete the task from a cold start. Reference other docs by path, but don't assume the agent has them loaded.

### Phases

**6. Multi-step skills use numbered phases.**
Three or more distinct steps → number them. Each phase has a heading, a goal sentence, and concrete actions / shell commands. Examples: `d-review` (Phase 0–7), `d-tdd` (5 phases). Phases are sequential by default; if a phase is optional or branching, say so explicitly.

**7. Pre-conditions come first; final gates come last.**
Skills that mutate state need a "pre-condition" phase (`bun run check` must pass) and a "final gate" phase (re-run the same check). Sandwiching the work between two identical gates catches regressions introduced by the skill itself.

### Output

**8. Skills produce one of: a fix, a report, a question.**

- **Fix** — the skill changed code; the agent reports what changed
- **Report** — the skill discovered something; the agent describes findings, no mutation
- **Question** — the skill needs the user to decide; the agent asks via `AskUserQuestion`

Mixing modes mid-skill is confusing. Pick one per phase.

---

## Canonical structure

Sections every SKILL.md should have, in order. See `d-review/SKILL.md` and
`d-tdd/SKILL.md` for full examples.

1. **YAML frontmatter** — `name:` and `description:` (with triggers).
2. **H1 title** — `# <skill-name> — <full title>`.
3. **Quick Reference** — bullet list of invocation modes (`/<skill>`, `/<skill> quick`).
4. **What this does** — one paragraph stating the problem and default mode.
5. **When to run** — bulleted concrete triggers ("before /ship", "after build fails").
6. **Phase 0: pre-condition** — gate the skill enforces before any work (e.g. `bun run check`).
7. **Phase N: work phases** — numbered, each with goal + concrete actions / shell commands.
8. **Phase final: gate** — re-run pre-conditions; skill is incomplete until this passes.
9. **Output** — specific format for reporting back to the user (finding / fix / question).
10. **Rules** — bulleted absolute invariants ("ALWAYS X", "NEVER Y").

---

## Triggers

Triggers tell the agent when to invoke a skill on its own initiative. They live in
the `description` field of the frontmatter:

```yaml
description: 'Pre-commit review. Triggers: "d-review", "review the code", "pre-commit check".'
```

Pick triggers that real users would type or say. Avoid synonyms — the agent matches
loosely; one good trigger beats five clever ones. Voice triggers (speech-to-text
aliases) can be a separate line in the description if useful:

```yaml
description: |
  Pre-commit review.
  Triggers: "d-review", "review the code", "pre-commit check".
  Voice triggers (speech-to-text aliases): "review my code", "check the code".
```

---

## Sibling files

Skills can ship with scripts, sub-rules, and templates:

```

.claude/skills/d-review/
├── SKILL.md
├── scripts/
│ ├── review-orchestrator.ts
│ ├── coverage-check.ts
│ └── dep-check.ts

```

Path conventions:

- **Scripts**: `<skill>/scripts/<name>.ts`. Invoked from SKILL.md via shell calls.
- **Templates**: `<skill>/templates/<name>.md`. Read by the skill, not by the agent runtime.
- **Rules**: `<skill>/rules-*.md`. Sub-instructions referenced from the main SKILL.md.

The harness only loads SKILL.md; siblings are accessed by path during execution.

---

## Confidence and safety nets

Skills that auto-apply fixes attach confidence scores per fix:

- **1–3** — flagged for human review; do not auto-apply
- **4–6** — auto-apply with caveat; report as "verify"
- **7–10** — auto-apply confidently

Every auto-fix runs the project's check pipeline (`bun run check`) before reporting success. If the check fails, the fix is reverted and reported as "attempted-failed."

This convention lives in `d-review` SKILL.md and is reusable for any other skill that mutates code.

---

## What NOT to put in a skill

- **Stable conventions** that the agent should know by default → those go in `CLAUDE.md` or a reference
- **Single-shot research tasks** → just describe the task in chat; don't formalize
- **Logic that depends on a long-running process** → a skill is invoked once and runs to completion; if you need long-running orchestration, write a script and invoke it from a skill

---

## Cross-references

- Existing skills: `.claude/skills/d-*/SKILL.md`
- Foundation skills (vendored): `.claude/skills/gstack/{plan,review,qa}/`
- Skill validation script: `scripts/check-skills.ts` (rule `ax/skill-md-frontmatter`)
- Agent experience patterns: `.gaia/reference/ax.md`
- When to add a skill: `.gaia/reference/methodology.md`

---

## Decisions log

| Date       | Decision                                          | Rationale                                                                                                                          |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Frontmatter `name` + `description` is required    | The harness uses these to surface the skill in "available skills." Without them the agent can't decide when to invoke.             |
| 2026-04-28 | Multi-phase skills number their phases            | Phase numbers let the agent recover after interruption ("resume from Phase N+1") and let users reason about progress.              |
| 2026-04-28 | Skills are imperative; references are declarative | Conflating them produced "skills" that were really just style guides. Reference describes; skill executes. Different mental model. |

_Update this log when skill conventions change. The goal is the same shape across every skill so the agent doesn't need to re-learn the format._

```

```
