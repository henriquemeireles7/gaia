# Methodology — Evolving the `.gaia/` substrate

> Status: Reference
> Last verified: April 2026
> Scope: How `.gaia/` itself changes — when to add a reference, when to add a skill, when to add a hook, when to write an ADR
> Paired with: `harness.md` (mechanics), `ax.md` (agent experience)

---

## What this file is

The `.gaia/` folder is not static. It evolves as the project learns. This file is the discipline for those changes — what kinds of additions belong where, and what gates them.

Without this discipline you get one of two failure modes:

1. **Drift toward bloat** — every learning becomes a reference doc; the constitution turns into a CMS the agent can't fit in context.
2. **Drift toward chaos** — learnings live in commit messages and Slack threads; the agent re-discovers the same fix every week.

Methodology is the antidote: a small set of rules that decide where each new piece of knowledge lives.

---

## The 7 methodology principles

### Where things live

**1. Reference files describe taste; rules.ts describes mechanism.**
A reference (`code.md`, `backend.md`, etc.) is the _why_ — opinions, principles, examples. `rules.ts` is the _what_ — a mechanically enforceable rule with a `mechanism: { kind, ... }`. New rule = entry in `rules.ts`. New principle that can't be mechanically checked = section in a reference. Never both at the same level — references explain, rules enforce.

**2. Skills are verbs; references are nouns.**
A skill (`d-tdd`, `d-review`) is something you _do_ — a procedure with phases, checks, and outputs. A reference is something you _consult_ before doing. If a new pattern is "read these files, follow these steps, produce this output," it's a skill. If it's "here are the conventions for X," it's a reference.

**3. Hooks enforce facts; CLAUDE.mds describe judgment (vision §4).**
Anything mechanical (block this path, run this script on save) goes in `.claude/hooks/` referenced from `.claude/settings.json`. Anything that requires the agent to _decide_ (use this pattern when, prefer X over Y) goes in CLAUDE.md or a reference. Don't write a hook that requires a model call to evaluate.

### When to add what

**4. Add a reference when 3+ files would benefit from the same context.**
A reference exists to be loaded. If only one file ever reads it, the content belongs in that file's CLAUDE.md or as inline comments. Three+ consumers across folders → it's a real reference.

**5. Add a skill when there's a procedure with ≥3 phases.**
A two-step thing is just two tool calls. A multi-phase procedure with cross-checks, fix-first behavior, or specific output formats is a skill. Skills live in `.claude/skills/<name>/SKILL.md` with the canonical frontmatter (see `skills.md`).

**6. Add an ADR for irreversible architecture changes.**
ADRs (`.gaia/adrs/NNNN-name.md`) capture _why_ a one-way decision was made. Examples: choosing Polar over Stripe, replacing GritQL with ast-grep, adopting OKLCH. Reversible changes (a new rule, a new reference) don't need an ADR. The TEMPLATE.md is the canonical shape.

### What never moves

**7. Memory has three surfaces; none auto-promote.**

- `.gaia/memory/working/` — volatile, scoped to a session. Cleared whenever.
- `.gaia/memory/episodic/` — append-only log. Patterns observed once.
- `.gaia/memory/personal/` — per-developer, gitignored. Personal preferences.

Promotion to `reference/` is **manual** via the `d-harness` skill. Never auto-promote — observed patterns must be reviewed before becoming constitutional.

---

## Decision matrix

| New thing                                  | Where it goes                                       |
| ------------------------------------------ | --------------------------------------------------- |
| "We always X in domain Y"                  | `reference/<Y>.md` principle                        |
| "Block this file from being edited"        | `rules.ts` rule + `.claude/hooks/protect-files.ts`  |
| "Run this script on every save"            | `.claude/settings.json` hook → `.claude/hooks/*.ts` |
| Multi-step procedure agent invokes by name | `.claude/skills/<name>/SKILL.md`                    |
| Irreversible technology choice             | `adrs/NNNN-<choice>.md`                             |
| Lessons learned during one task            | `memory/episodic/<date>.md`                         |
| Per-developer scratchpad                   | `memory/personal/<name>.md` (gitignored)            |
| Local rule for one folder                  | That folder's `CLAUDE.md`                           |
| Index of folders with CLAUDE.md            | `.gaia/MANIFEST.md`                                 |

---

## Promotion paths

### memory → reference

When `d-harness` (or a human review) sees the same pattern in `memory/episodic/` ≥3 times across distinct contexts, propose adding it to a reference file. Promotion requires:

1. The pattern is generalizable (not specific to one bug)
2. Adding it doesn't contradict an existing reference
3. A reviewer signs off on the diff

Never promote silently. Memory's job is recall; the reference's job is constitution.

### reference principle → rule

When a reference principle becomes mechanically checkable, add it to `rules.ts` with the appropriate mechanism. Examples:

- "Use AppError, not bare Error" (code.md) → `code/named-errors-no-bare-throw` ast-grep rule
- "Don't read `process.env` outside config/env.ts" (security.md) → `security/no-raw-env` hook
- "Tests next to source" (testing.md) → `testing/colocated-tests` script

The principle stays in the reference (the _why_); the rule does the enforcement (the _what_).

### rule pending → enforced

`rules.ts` entries with `mechanism: { kind: 'pending' }` are visible debt. Convert to one of `hook` / `script` / `oxlint` / `ast-grep` / `tsc` / `ci` when the enforcement mechanism is ready. The `rules-coverage` CI job lists the remaining pending rules every PR.

---

## ADR workflow

1. Copy `.gaia/adrs/TEMPLATE.md` to `.gaia/adrs/NNNN-<title>.md` (next number).
2. Fill in: Status (proposed/accepted/superseded), Context, Decision, Consequences, Alternatives, References.
3. Land the ADR in the same PR as the change it documents. Reviewer reads the ADR first.
4. When superseded, update the old ADR's status to `superseded by NNNN` instead of deleting it. The history is the value.

---

## When to write nothing

The trap of methodology work is over-formalization. Defaults to **don't write** unless:

- The cost of the next agent re-discovering this is high
- The pattern has been seen in ≥3 distinct contexts
- A code-level fix isn't the right answer

A failing test, a clear error message, a sharp interface — these substitute for documentation. Write reference material only when the code can't be made to teach itself.

---

## Cross-references

- Single policy source: `.gaia/rules.ts`
- Folder index: `.gaia/MANIFEST.md`
- ADR template: `.gaia/adrs/TEMPLATE.md`
- Memory surfaces: `.gaia/memory/{working,episodic,personal}/`
- Harness mechanics: `.gaia/reference/harness.md`
- Skill conventions: `.gaia/reference/skills.md`
- Workflow loops: `.gaia/reference/workflow.md`

---

## Decisions log

| Date       | Decision                                      | Rationale                                                                                                                                         |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | References describe taste, rules.ts enforces  | Splits "the why" (debatable, evolving) from "the what" (mechanical, automatable). Rules without a why drift; principles without a rule rot.       |
| 2026-04-28 | Manual promotion only from memory → reference | Auto-promotion would let stochastic noise enter the constitution. Promotion is a curation act, not an aggregation act.                            |
| 2026-04-28 | ADRs for irreversible decisions only          | ADRs are expensive to write and read. Reserve them for choices that cost real money / time to undo. Reversible rules can change without ceremony. |

_Update this log when methodology rules change. The methodology is the only thing that's allowed to evolve recursively — be careful._
