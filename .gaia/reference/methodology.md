# Methodology — The Constitutional Loop

> Status: Reference (the methodology that produces every other reference)
> Last verified: April 2026
> Scope: How `.gaia/` itself evolves. Names the methodology. Defines the relations between References, Rules, Skills, and Hooks.
> Paired with: `code.md` (the constitutional pattern), `harness.md` (mechanics), `ax.md` (agent experience), `skills.md` (skill conventions)

---

## What this file is

Most "AI rules" libraries hand the agent a markdown file. The agent reads it (sometimes), the rules drift from the code, and a year later you have a folder of advice nobody enforces.

Gaia's answer is **The Constitutional Loop**. It is the methodology that turns principles into a moat:

```
       ┌──────────── domain-context hook ─────────────┐
       │                                              ▼
   ┌───┴───┐         ┌──────────┐         ┌──────────────┐
   │ READ  │ ───►    │ WRITE    │ ───►    │ VERIFY       │
   │ ref/  │         │ code +   │         │ rules.ts     │
   │ <X>.md│         │ tests    │         │ mechanisms   │
   └───────┘         └──────────┘         └──────┬───────┘
                                                  │
                                          rules-coverage CI
                                                  │
                                          (loop closes)
```

Three substrates compose the methodology — call them **the Reference–Rule–Skill (RRS) triad**:

| Substrate     | Form         | Loaded when             | Verified when      | Failure if absent         |
| ------------- | ------------ | ----------------------- | ------------------ | ------------------------- |
| **Reference** | Loaded noun  | Before edits in domain  | n/a (informs)      | Agent guesses; drift      |
| **Rule**      | Mechanism    | n/a (executed)          | After edits, in CI | Reference is aspirational |
| **Skill**     | Invoked verb | When user/agent invokes | At end of skill    | Procedure is inconsistent |

Hooks bridge them: `domain-context.ts` auto-loads References before relevant edits; `harden-check.ts` and the script suite verify Rules after edits; the `Skill` tool surfaces Skills.

A principle that exists in only one substrate is incomplete. The methodology's job is to make sure every principle traverses the loop.

Read `code.md` first to understand the four-part principle shape (description + enforcement + anti-pattern + pattern). This file uses it.

---

## The 8 methodology principles

### 1. The Constitutional Loop is the methodology

Every concern in Gaia has up to three forms (Reference, Rule, Skill) connected by two bridges (auto-load Hook, verify Mechanism). The Loop closes when both bridges fire on the same concern. A concern that lives in only one substrate is debt.

**Enforcement:**

- `bun run rules:coverage` lists `rules.ts` entries with no matching reference and references with no matching rule (both directions).
- The `domain-context` hook reads the rule's `reference` field and loads `.gaia/reference/<reference>.md` when an agent edits a file in that domain.
- CI job `rules-coverage` runs the report on every PR.

**Anti-pattern:**

```ts
// ❌ A "rule" that doesn't load any reference and isn't enforced
{ id: 'mystery/be-careful', tier: 'architecture', mechanism: { kind: 'pending', note: '?' } }
// nothing teaches the agent what "careful" means; nothing fails when it isn't
```

**Pattern:**

```ts
// ✅ Reference + rule + (optional) skill, all wired
// .gaia/reference/security.md describes "Protected by default"
// .gaia/rules.ts: { id: 'backend/protected-by-default', reference: 'backend',
//                   mechanism: { kind: 'ast-grep', rule: 'backend-protected-by-default' } }
// .claude/hooks/domain-context.ts: editing apps/api/server/* → loads backend.md
// scripts (or ast-grep) verify on every commit
```

---

### 2. Reference principles map 1:1 to `rules.ts` entries

Every numbered principle in a reference file aspires to a `rules.ts` entry — even if the mechanism is `pending`. References without rules are aspirational; rules without references are inscrutable. Pending → enforced cycle time SLO: 14 days.

**Enforcement:**

- `scripts/rules-coverage.ts` reports total rules vs pending; CI prints the list on every PR.
- (Planned) `scripts/check-reference-rule-mapping.ts` walks reference files and reports principles not in `rules.ts`.
- A pending entry older than 14 days surfaces in the weekly `d-health` audit.

**Anti-pattern:**

```md
<!-- ❌ Reference declares a principle with no rules.ts presence -->

## 7. Audit logs on every mutation

(no rules.ts entry; the agent has no signal that this is checked)
```

**Pattern:**

```md
<!-- ✅ Reference principle has a rules.ts entry, even if pending -->

## 7. Audit logs on every mutation

**Enforcement:** rule `security/audit-on-mutation` (mechanism: pending —
ast-grep on routes mounted under `protectedRoute` calling DB writes
without `auditLog()`). Coverage: see `bun run rules:coverage`.
```

---

### 3. Skills are invoked verbs; references are loaded nouns; they compose

References load via `Read` before edits in their domain (auto-loaded by the domain-context hook). Skills run via the `Skill` tool, with ≥3 phases per `skills.md`. Skills routinely `Read` references mid-execution. Both have a `Last verified:` field in their header — staleness is debt.

**Enforcement:**

- `scripts/check-skills.ts` validates SKILL.md frontmatter (`ax/skill-md-frontmatter` rule).
- (Planned) `scripts/check-staleness.ts` flags references and skills with `Last verified` >180 days old.
- The domain-context hook fails closed if a referenced file is missing.

**Anti-pattern:**

```md
<!-- ❌ A "skill" with no phases — really just a tip -->

# my-skill

When you see X, do Y.
```

**Pattern:**

```md
<!-- ✅ Skill with phases, frontmatter, references -->

---

name: d-tdd
description: 'TDD implementation. Triggers: "implement", "start coding".'

---

# d-tdd — TDD Implementation

## Phase 0: ...

## Phase 1: ...
```

---

### 4. Hooks are deterministic gates; CLAUDE.mds are judgment context

A hook executes in <100ms, makes a yes/no decision without an LLM call, and fails closed (block on error) by default. A CLAUDE.md is read into context and informs decisions that require judgment. Don't write a hook that needs a model call; don't put hard gates in CLAUDE.md prose.

**Enforcement:**

- Hooks live in `.claude/hooks/*.ts`; configured in `.claude/settings.json`.
- A hook that calls `fetch()` to an LLM endpoint is review-rejected.
- CLAUDE.mds are read-only context for the agent — the agent doesn't write to them mid-session.

**Anti-pattern:**

```ts
// ❌ "Smart" hook that asks an LLM for permission
// .claude/hooks/maybe-block.ts
const verdict = await fetch('https://api.anthropic.com/...', {...})
if (verdict === 'block') process.exit(1)
// Latency: seconds. Determinism: zero. Cost: real money. Bug: unbounded.
```

**Pattern:**

```ts
// ✅ Deterministic, fast, fail-closed
import { blockedFor } from '../../.gaia/rules'
const blocked = blockedFor('security/protect-config')
if (blocked.includes(input.tool_input.file_path)) {
  console.error('Blocked: config file edit not authorized.')
  process.exit(2) // hook fail-closed
}
```

---

### 5. Add a reference when ≥3 files in the same domain benefit; delete when dead

Domain ≠ file count. 3 random files don't justify a reference; 3 files sharing a concern do. Soft ceiling: ~25 references — beyond that, the agent can't reason across enough relevant context. Delete a reference when it hasn't been auto-loaded in 6 months (the domain-context hook can log loads).

**Enforcement:**

- `MANIFEST.md` enumerates references; `scripts/check-manifest.ts` prevents drift.
- (Planned) `scripts/reference-load-stats.ts` consumes hook telemetry; flags zero-load references.
- Quarterly review of references in `d-health`.

**Anti-pattern:**

```sh
# ❌ A reference per concern, no matter how narrow
.gaia/reference/
├── code.md
├── code-tests.md
├── code-tests-mocking.md
├── code-tests-mocking-resend.md
└── …  # 87 files, agent's context blows up
```

**Pattern:**

```sh
# ✅ Domain-grouped, ~21 references (current)
.gaia/reference/
├── code.md, backend.md, frontend.md, database.md, testing.md, …
```

---

### 6. Add a skill when output must be consistent AND ≥3 phases

Skills are invocable verbs the user surfaces by name (`/d-review`). Phases run sequentially unless explicitly marked branching. Two reasons to make something a skill: **consistency** (same input → same output every time) and **discoverability** (the user can find it by name). Tasks with neither belong in a CLAUDE.md or a script.

**Enforcement:**

- SKILL.md frontmatter required (`ax/skill-md-frontmatter`, script-enforced).
- Quarterly skill audit in `d-health`; unused skills (no invocation in 6 months) get archived.

**Anti-pattern:**

```md
<!-- ❌ A "skill" that's actually a tip -->

# helpful-tip

Reminder: always run tests before commit.

(this is a CLAUDE.md line, not a skill)
```

**Pattern:**

See `.claude/skills/d-review/SKILL.md` — frontmatter, phases, pre-condition + final-gate sandwich, output format.

---

### 7. Write an ADR for irreversible decisions; append-only

Adopting a new framework, switching a payment provider, replacing the lint engine, changing the auth model — these need an ADR at `.gaia/adrs/NNNN-<title>.md`. Decisions log entries in references are _local_ (the evolution of one reference). ADRs are _global_ (the evolution of the project). Numbering is append-only; superseded ADRs stay with status updated.

**Enforcement:**

- ADR template: `.gaia/adrs/TEMPLATE.md`.
- The PR landing the decision links to the ADR. Reviewer reads ADR first.
- (Planned) `scripts/check-adr-numbering.ts` rejects renumbered ADRs.

**Anti-pattern:**

```sh
# ❌ Decision lives only in commit message
git commit -m "switch from Stripe to Polar (we should document this someday)"
```

**Pattern:**

```sh
# ✅ ADR + linked PR
ls .gaia/adrs/
0001-ast-grep-over-gritql.md
0002-polar-over-stripe.md  # status: accepted; supersedes nothing
```

---

### 8. Memory has three surfaces with explicit owners and decay

| Surface            | Owner    | Lifetime     | Promotes to              |
| ------------------ | -------- | ------------ | ------------------------ |
| `memory/working/`  | Agent    | Per session  | (cleared on session end) |
| `memory/episodic/` | Agent    | 90-day decay | `reference/` via human   |
| `memory/personal/` | Operator | Indefinite   | Stays (gitignored)       |

The agent writes to `memory/episodic/` during sessions. After 90 days without re-trigger, entries are archived. Promotion to `reference/` is manual via `d-harness` and requires the same review as a code change. `memory/personal/` is gitignored at the directory level — never commit personal notes.

**Enforcement:**

- `.gitignore` excludes `memory/personal/`.
- (Planned) `scripts/memory-decay.ts` archives episodic entries older than 90 days into `memory/episodic/.archive/`.
- `d-harness` is the only skill that promotes — code review enforces.

**Anti-pattern:**

```md
<!-- ❌ Personal preference committed to memory/personal/ in a PR -->

git diff --name-only
+memory/personal/henrique-prefs.md

(the operator just leaked their personal notes)
```

**Pattern:**

```sh
# ✅ Episodic learning gets observed → curated → promoted (via d-harness)
echo "Pattern observed: ..." >> .gaia/memory/episodic/$(date +%F).md
# 90 days later, d-harness reviews; if pattern is generalizable, promote to a reference
```

---

## Decision matrix

| New thing                                  | Where it goes                                       |
| ------------------------------------------ | --------------------------------------------------- |
| "We always X in domain Y"                  | `reference/<Y>.md` principle + `rules.ts` entry     |
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

The `d-harness` skill (or human review) sees a pattern in `memory/episodic/` ≥3 times across distinct contexts → proposes a reference addition. Promotion requires:

1. Pattern is generalizable (not specific to one bug).
2. Adding it doesn't contradict an existing reference.
3. Reviewer signs off on the diff.
4. A `rules.ts` entry is created at the same time (per principle #2 above).

### reference principle → enforced rule

A reference principle that becomes mechanically checkable converts its mechanism in `rules.ts` from `pending` → `script` / `oxlint` / `ast-grep` / `hook` / `tsc` / `ci`. Examples:

- "Use AppError, not bare Error" (code.md) → `code/named-errors-no-bare-throw` ast-grep rule
- "Don't read `process.env` outside config/env.ts" (security.md) → `security/no-raw-env` hook
- "Tests next to source" (testing.md) → `testing/colocated-tests` script

### rule pending → enforced

`rules.ts` entries with `mechanism: { kind: 'pending' }` are visible debt. The 14-day SLO from principle #2 is the working agreement.

---

## ADR workflow

1. Copy `.gaia/adrs/TEMPLATE.md` to `.gaia/adrs/NNNN-<title>.md` (next number).
2. Fill in: Status (proposed / accepted / superseded), Context, Decision, Consequences, Alternatives, References.
3. Land the ADR in the same PR as the change it documents. Reviewer reads ADR first.
4. When superseded: update old ADR's status to `superseded by NNNN`; do not delete.

---

## When to write nothing

The trap of methodology work is over-formalization. Defaults to **don't write** unless:

- The cost of the next agent re-discovering this is high
- The pattern has been seen in ≥3 distinct contexts
- A code-level fix isn't the right answer

A failing test, a clear error message, a sharp interface — these substitute for documentation. Write reference material only when the code can't be made to teach itself.

---

## Enforcement mapping

| Principle                              | Mechanism                                       | rules.ts entry              |
| -------------------------------------- | ----------------------------------------------- | --------------------------- |
| 1. Constitutional Loop                 | `bun run rules:coverage` + CI report            | (meta)                      |
| 2. 1:1 reference ↔ rule                | `rules-coverage.ts`; planned `check-mapping.ts` | (meta)                      |
| 3. Verbs vs nouns + last-verified      | `check-skills.ts`; planned `check-staleness.ts` | `ax/skill-md-frontmatter`   |
| 4. Hooks deterministic                 | Code review                                     | (meta)                      |
| 5. Reference threshold + dead deletion | Manifest check + planned load stats             | `harness/manifest-coverage` |
| 6. Skill threshold + audit             | `check-skills.ts`                               | `ax/skill-md-frontmatter`   |
| 7. ADR for irreversible                | Code review + template                          | (planned)                   |
| 8. Memory decay                        | Planned `memory-decay.ts`                       | (planned)                   |

---

## Cross-references

- Single policy source: `.gaia/rules.ts`
- Coverage report: `bun run rules:coverage`
- Folder index: `.gaia/MANIFEST.md`
- ADR template: `.gaia/adrs/TEMPLATE.md`
- Memory surfaces: `.gaia/memory/{working,episodic,personal}/`
- Harness mechanics: `harness.md`
- Skill conventions: `skills.md`
- Workflow loops: `workflow.md`
- Constitution shape: `code.md`

---

## Decisions log

| Date       | Decision                                      | Rationale                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Name the methodology: The Constitutional Loop | Most "AI rules" libraries hand the agent a markdown file. The Loop hands the agent the right file at the right moment AND fails the commit if the rule isn't followed. The auto-load + mechanical-verify combo is the moat. |
| 2026-04-28 | RRS triad (References, Rules, Skills)         | Three substrates with distinct lifecycles; each has its own bridge to the agent. References = loaded nouns; Rules = executed mechanisms; Skills = invoked verbs. A concern in fewer than its applicable substrates is debt. |
| 2026-04-28 | 1:1 reference principle ↔ rules.ts entry      | Without this, references rot into "advice nobody enforces." Pending entries are visible debt with a 14-day SLO.                                                                                                             |
| 2026-04-28 | Manual promotion only from memory → reference | Auto-promotion would let stochastic noise enter the constitution. Promotion is curation, not aggregation.                                                                                                                   |
| 2026-04-28 | ADRs for irreversible decisions only          | ADRs are expensive to write and read. Reserve for choices that cost real money / time to undo.                                                                                                                              |
| 2026-04-28 | Memory decay: 90 days for episodic            | Without decay, `memory/episodic/` grows forever. 90 days is "long enough to be useful, short enough to remain curated."                                                                                                     |

_Update this log when methodology rules change. The methodology is the only thing that's allowed to evolve recursively — be careful._
