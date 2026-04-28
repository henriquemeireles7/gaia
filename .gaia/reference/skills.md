# Skills — Writing SKILL.md files

> Status: Reference
> Last verified: April 2026
> Scope: Conventions for the markdown files under `.claude/skills/<name>/SKILL.md`
> Paired with: `code.md` (constitution shape), `ax.md` (agent experience), `methodology.md` (when to add a skill vs reference vs hook)

---

## What this file is

Skills are how the agent acquires verbs. A skill is a markdown file (with optional sibling scripts) that the agent invokes via the `Skill` tool. The contract — frontmatter, structure, output format — has been implicit across the existing `d-*` skills. This file makes it explicit and enforceable.

If you're deciding whether something should be a skill at all, read `methodology.md` §"When to add a skill" first.

Read `code.md` for the four-part principle shape used below.

---

## The 8 skill principles

### 1. Folder name is the public invocation name

Skills live at `.claude/skills/<name>/SKILL.md`. Vendored skills live at `.claude/skills/<plugin>/<name>/` (e.g. `.claude/skills/gstack/review/`). The folder name IS the user surface — typing `/<name>` invokes the skill. Renaming is a breaking change (treat as ADR-worthy).

**Enforcement:**

- `scripts/check-skills.ts` (rule `ax/skill-md-frontmatter`) validates that `name` field equals folder name
- `MANIFEST.md` indexes skills; renaming flagged in code review
- ADR required for renames per `methodology.md` §"ADR for irreversible decisions"

**Anti-pattern:**

```
# ❌ Folder name doesn't match frontmatter
.claude/skills/d-foo/SKILL.md
  ---
  name: d-bar  # disagreement → check-skills.ts fails
  ---
```

**Pattern:**

```
# ✅ Folder == name == invocation surface
.claude/skills/d-review/SKILL.md
  ---
  name: d-review
  description: 'Pre-commit review. Triggers: "d-review", "review", "pre-commit check".'
  ---
```

---

### 2. Required frontmatter is the contract; validated on load

Every SKILL.md begins with YAML frontmatter delimited by `---`. Required fields: `name`, `description`. The harness uses these to surface the skill in "available skills" — without them, the agent can't decide when to invoke. `scripts/check-skills.ts` validates on every CI run.

**Enforcement:**

- Rule `ax/skill-md-frontmatter` (script: `scripts/check-skills.ts`)
- Validates: starts with `---`, contains `name:` and `description:`, frontmatter parses as YAML
- Fails closed: malformed frontmatter rejects the PR

**Anti-pattern:**

```md
<!-- ❌ Missing frontmatter — agent has no decision signal -->

# d-mystery — A Skill

This skill does something useful when invoked.
```

**Pattern:**

```md
---
name: d-review
description: 'Pre-commit review: script-first mechanical checks + AI-powered logic review. Triggers: "d-review", "review the code", "pre-commit check".'
---

# d-review — Intelligent Pre-Commit Review
```

---

### 3. A skill produces output; a CLAUDE.md adds context

Skills run via the `Skill` tool, execute phases linearly, and end with a **fix** / **report** / **question**. CLAUDE.mds load into context for random-access consultation. If your "skill" doesn't change state or produce output, it's a CLAUDE.md or a reference. The runtime surfaces are different — pick the right one.

**Enforcement:**

- `methodology.md` §"Add a skill when output must be consistent AND ≥3 phases" — code review filter
- Skills with no output section in their structure get flagged in `d-health` quarterly audit

**Anti-pattern:**

```md
<!-- ❌ A "skill" that just states tips — should be a CLAUDE.md -->

# helpful-tip

Reminder: always run tests before commit. Use `bun run check`.
```

**Pattern:**

```md
<!-- ✅ Skill ends with a structured output mode -->

## Output

Finding-first report (highest confidence first):

[N/10] file:line — description
Evidence: ...
Fix: applied / attempted-failed / needs-human
```

---

### 4. Skills must run from a cold start

The agent invoking the skill might have no prior context. The skill file must include enough instruction to complete the task from a cold start. Reference other docs by path (the agent can `Read` them mid-execution); do NOT reproduce them. If a referenced doc is missing, the skill MUST fail closed with a clear error.

**Enforcement:**

- Code review: skills should reference `code.md`, `methodology.md`, etc. by path, not embed them
- (Planned) `scripts/check-skill-cold-start.ts`: simulate cold-start invocation and verify all referenced paths exist
- Determinism: same inputs → same outputs (reproducibility test in `d-health`)

**Anti-pattern:**

```md
<!-- ❌ Skill assumes prior context: "as I mentioned earlier..." -->

## Phase 1

Continue the refactoring approach we established.
```

**Pattern:**

```md
<!-- ✅ Self-contained; references docs by path -->

## Phase 1: Read the constitution

Read `.gaia/reference/code.md` (the 10 principles).
Read the domain reference for the file you're touching:
`.gaia/reference/<domain>.md` (see routing in `.gaia/CLAUDE.md`).
```

---

### 5. Numbered phases are checkpoints

Three or more distinct steps → number them. Phases run sequentially by default. A failed phase aborts the skill unless explicitly marked `[recoverable]`. Phase boundaries are valid resumption points; on interrupt, the next invocation can resume at the first incomplete phase.

**Enforcement:**

- Code review: skills with non-trivial work have phases
- (Planned) `scripts/check-skill-phases.ts`: skills referenced as having phases must use `## Phase N:` headers consistently

**Anti-pattern:**

```md
<!-- ❌ Wall of instructions — no checkpoints, no resumption -->

# d-bigjob

First read X. Then run Y. Then check Z. If failure, do W. Otherwise...
(50 more lines)
```

**Pattern:**

```md
<!-- ✅ Numbered phases — clear checkpoints -->

## Phase 0: Pre-condition (`bun run check`)

## Phase 1: Mechanical fix

## Phase 2: Logic review

## Phase 3: Final gate (re-run `bun run check`)
```

---

### 6. Sandwich the work between identical gates

Skills that mutate state need a "pre-condition" phase (`bun run check` must pass) and a "final gate" phase (re-run the same check). The two gates are the **same** script — same input, same expected output. The skill is incomplete until the second run is green. This catches regressions the skill itself introduced.

**Enforcement:**

- Code review: skills mutating files have a Phase 0 and a final phase running the same check
- The first phase fails closed: pre-condition fail = no mutation, exit with clear message
- The final gate fails the skill: skill output reports the regression, doesn't claim success

**Anti-pattern:**

```md
<!-- ❌ Pre-condition only; no verification that the work was correct -->

## Phase 0: Run check

## Phase 1: Apply fixes

(no final gate; if a fix breaks something, skill claims success)
```

**Pattern:**

```md
<!-- ✅ Identical gate at Phase 0 and the final phase. Both invoke `bun run check`. -->

## Phase 0: Pre-condition — bun run check

(must pass before any work)

## Phase N: Final gate — bun run check

(re-run; if this fails, you introduced a regression — revert and try again)
```

---

### 7. Output is fix / report / question; one mode per line

A skill can produce multiple modes across phases (fix some, report on others, question for indecision) but each output line is unambiguous. **Reports** include confidence scores (1-10). **Questions** use `AskUserQuestion`. **Fixes** show the diff. On indecision, default to question — don't fabricate.

**Enforcement:**

- Code review: each skill's "Output" section names its mode(s)
- Reports: confidence scores numerically scored, not just "low/high"
- (Planned) Linting of skill output sections — must contain at least one of: "Applied", "Confidence:", "Question:"

**Anti-pattern:**

```text
# ❌ Mixed modes in one line; ambiguous
Maybe fixed maybe not — score: medium-ish? you should probably look
```

**Pattern:**

```text
# ✅ Modes per line; confidence numeric
[9/10] auth/routes.ts:34 — Missing null check on session.userId
       Evidence: getUserById called with undefined when session expires
       Fix: applied — added early return with throwError(UNAUTHORIZED)

[3/10] payments.ts:52 — Possible race on concurrent webhook delivery
       Fix: NEEDS HUMAN REVIEW

QUESTION: For low-confidence finding above, should I split it into
its own commit or include in this one?
```

---

### 8. Sibling files are typed by location; SKILL.md is the only loaded entrypoint

Skills can ship with sibling files: `<skill>/scripts/*.ts` (executables invoked from SKILL.md), `<skill>/templates/*.md` (inputs the skill reads), `<skill>/rules-*.md` (sub-instructions referenced from SKILL.md). The harness only loads SKILL.md; siblings are accessed by path during execution.

**Enforcement:**

- Code review: deviations from the layout flagged
- `scripts/check-skills.ts` (planned extension): warns on `<skill>/foo.ts` not under `scripts/`

**Anti-pattern:**

```
# ❌ Mixed concerns at skill root — agent doesn't know what loads
.claude/skills/d-foo/
├── SKILL.md
├── helper.ts          # is this the entrypoint? a script? a template?
├── instructions.md    # is this loaded automatically?
└── data.json
```

**Pattern:**

```
# ✅ Typed layout
.claude/skills/d-review/
├── SKILL.md                    # the only thing the harness loads
├── scripts/
│   ├── review-orchestrator.ts  # invoked from SKILL.md
│   ├── coverage-check.ts
│   └── dep-check.ts
└── rules-coherence.md          # referenced from SKILL.md mid-execution
```

---

## Canonical structure

Sections every SKILL.md should have, in order. See `d-review/SKILL.md` and `d-tdd/SKILL.md` for full examples.

1. **YAML frontmatter** (required: `name`, `description`)
2. **H1 title** — `# <skill-name> — <full title>`
3. **Quick Reference** — bullet list of invocation modes (`/<skill>`, `/<skill> quick`)
4. **What this does** — one paragraph (problem + default mode)
5. **When to run** — bulleted concrete triggers
6. **Phase 0: pre-condition** — gate the skill enforces (e.g. `bun run check`)
7. **Phase N: work phases** — numbered, each with goal + concrete actions
8. **Phase final: gate** — same script as Phase 0; skill incomplete until this passes
9. **Output** — specific format for reporting (finding-first / diff / question)
10. **Rules** — bulleted absolute invariants ("ALWAYS X", "NEVER Y")

---

## Triggers

Triggers tell the agent when to invoke a skill on its own initiative. They live in the `description` field of the frontmatter:

```yaml
description: 'Pre-commit review. Triggers: "d-review", "review the code", "pre-commit check".'
```

Pick triggers that real users would type or say. Avoid synonyms — the agent matches loosely; one good trigger beats five clever ones. Voice triggers (speech-to-text aliases) can be a separate line:

```yaml
description: |
  Pre-commit review.
  Triggers: "d-review", "review the code", "pre-commit check".
  Voice triggers (speech-to-text aliases): "review my code", "check the code".
```

---

## Versioning

A skill's "API" is its phase count + output format. Changing either is a breaking change for users who built workflows around it. Treat as ADR-worthy:

- Adding a phase that runs by default: ADR
- Removing a phase: ADR
- Changing output format (finding-first → JSON, etc.): ADR
- Renaming the skill: ADR (per principle #1)

Adding optional flags or fixing bugs in phases doesn't need an ADR.

---

## Confidence scoring (for skills that auto-apply fixes)

Skills that mutate code attach confidence scores per fix:

- **1–3** — flagged for human review; do not auto-apply
- **4–6** — auto-apply with caveat; report as "verify"
- **7–10** — auto-apply confidently

Every auto-fix runs the project's check pipeline (`bun run check`). If the check fails, the fix is reverted and reported as "attempted-failed."

This convention lives in `d-review` SKILL.md and is reusable for any other skill that mutates code.

---

## What NOT to put in a skill

- **Stable conventions** — those go in `CLAUDE.md` or a reference
- **Single-shot research tasks** — describe in chat; don't formalize
- **Long-running orchestration** — invoke a script from a skill instead
- **Pure context** — that's a reference

---

## Enforcement mapping

| Principle                                 | Mechanism                                       | rules.ts entry            |
| ----------------------------------------- | ----------------------------------------------- | ------------------------- |
| 1. Folder name = invocation name          | `scripts/check-skills.ts` validates frontmatter | `ax/skill-md-frontmatter` |
| 2. Required frontmatter validated on load | `scripts/check-skills.ts`                       | `ax/skill-md-frontmatter` |
| 3. Output mode required                   | Code review                                     | _pending_                 |
| 4. Cold-start safety                      | Planned `check-skill-cold-start.ts`             | _pending_                 |
| 5. Numbered phases                        | Code review                                     | _pending_                 |
| 6. Sandwich gates                         | Code review                                     | _pending_                 |
| 7. Typed output (fix/report/question)     | Code review; planned output-section linter      | _pending_                 |
| 8. Sibling layout                         | Code review                                     | _pending_                 |

The pending entries are visible debt — `bun run rules:coverage` lists them.

---

## Cross-references

- Existing skills: `.claude/skills/d-*/SKILL.md`
- Foundation skills (vendored): `.claude/skills/gstack/{plan,review,qa}/`
- Skill validation script: `scripts/check-skills.ts`
- Agent experience patterns: `ax.md`
- When to add a skill: `methodology.md`
- Constitution shape: `code.md`

---

## Decisions log

| Date       | Decision                                                   | Rationale                                                                                                                      |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-28 | Frontmatter `name` + `description` is required + validated | Without it the harness can't surface the skill; `scripts/check-skills.ts` rejects malformed skills at CI time.                 |
| 2026-04-28 | Numbered phases for multi-step skills                      | Phase numbers let the agent recover after interruption and let users reason about progress.                                    |
| 2026-04-28 | Skills are imperative; references are declarative          | Conflating them produced "skills" that were really just style guides. Different runtime surfaces; different consumption modes. |
| 2026-04-28 | Sandwich gates (same check at start + end)                 | Catches regressions the skill itself introduces. Pre-condition only is insufficient.                                           |
| 2026-04-28 | One output mode per line                                   | Mixed modes in a single output line are unparseable; users skim by mode.                                                       |
| 2026-04-28 | Phase count + output format are ADR-worthy                 | Skill API stability matters for users who build workflows around invocations.                                                  |

_Update this log when skill conventions change. The goal: same shape across every skill so the agent doesn't re-learn the format on each invocation._
