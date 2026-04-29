# Rules — How rules.ts entries get authored and enforced

> Status: Reference (the constitutional layer of Gaia)
> Last verified: April 2026
> Scope: How `rules.ts` entries are authored, what mechanisms enforce them, and how the workflow loop exercises them
> Sibling skill: `d-rules` — emits typed entries in `.gaia/rules.ts` from any skill's `reference.md` principles
> Paired with: `d-reference/reference.md` (5-part principle shape), `d-skill/reference.md` (skill conventions)

---

## What this file is

The merged constitutional layer for the rules.ts contract. Replaces three legacy reference files:

- `methodology.md` — The Constitutional Loop (the Skill ↔ Reference ↔ Rules triad)
- `harness.md` — mechanism inventory (lint, hook, script, ci, ast-grep, tsc, /review)
- `workflow.md` — the loop tying initiatives → code → review → ship

These three are the same concept viewed from different angles. They merge here so the agent has one place to consult when authoring or evolving the rule layer.

---

## Part 1 — The Constitutional Loop

Most "AI rules" libraries hand the agent a markdown file. The agent reads it (sometimes), the rules drift from the code, and a year later you have a folder of advice nobody enforces.

Gaia's answer is **The Constitutional Loop**. It is the methodology that turns principles into a moat:

```
       ┌──────────── domain-context hook ─────────────┐
       │                                              ▼
   ┌───┴───┐         ┌──────────┐         ┌──────────────┐
   │ READ  │ ───►    │ WRITE    │ ───►    │ VERIFY       │
   │ <skill│         │ code +   │         │ rules.ts     │
   │/ref.md│         │ tests    │         │ mechanisms   │
   └───────┘         └──────────┘         └──────┬───────┘
                                                  │
                                          rules-coverage CI
                                                  │
                                          (loop closes)
```

Three substrates compose the methodology — call them **the Skill–Reference–Rule (SRR) triad**:

| Substrate     | Form         | Loaded when                  | Verified when      | Failure if absent         |
| ------------- | ------------ | ---------------------------- | ------------------ | ------------------------- |
| **Skill**     | Invoked verb | When user/agent invokes      | At end of skill    | Procedure is inconsistent |
| **Reference** | Loaded noun  | On skill use + on file edit  | n/a (informs)      | Agent guesses; drift      |
| **Rule**      | Mechanism    | n/a (executed)               | After edits, in CI | Reference is aspirational |

Two bridges keep the triad closed:

1. **`skill-reference` hook** auto-loads `<skill>/reference.md` when a skill is invoked.
2. **`domain-context` hook** walks the folder tree on file edit, loading every `CLAUDE.md` from the edit target up to repo root.

A principle that exists in only one substrate is incomplete. The methodology's job is to make sure every principle traverses the loop.

The 1:1 invariant: every skill has exactly one `reference.md` inside its folder. No skill without a reference, no reference outside a skill folder (except fractal `CLAUDE.md` for folder-scoped principles, which is a different surface).

---

## Part 2 — Mechanism inventory: the seven enforcement surfaces

Every principle's enforcement gets matched to one or more of these surfaces. Pick the surface based on what the principle checks.

### 1. TypeScript (`tsc --noEmit`)

Best for: shape-level invariants. If types don't compile, code doesn't run. Used for schema-source-required, validate-at-edges, typed error codes.

### 2. Oxlint

Best for: fast, language-agnostic syntactic patterns. Built-in rules cover most general cases. Used for `no-bare-catch`, `no-console-in-prod`, `no-ad-hoc-error`.

### 3. Custom Biome ast-grep / GritQL rules

Best for: codebase-specific patterns built-in linters can't express. Lives at `tools/ast-grep-rules/`. Used for route shape, schema naming, service purity, route operations allowlist, auth context provider, design token usage.

This is where most custom enforcement work lives.

### 4. Scripts (`scripts/*.ts`)

Best for: cross-file checks that don't fit a per-file linter. Examples: test colocation, test ratio, CLAUDE.md presence, footer staleness, manifest sync, principle-to-mechanism coverage audit.

### 5. Hooks (`.claude/hooks/*.ts`)

Best for: agent-time enforcement at tool-call boundaries. Reads from `.gaia/rules.ts`. Fires at `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart:compact`. Examples: block dangerous commands, protect `.env`, regenerate footers, batch quality gate at session end, re-inject rules after compaction.

Hooks are deterministic (no LLM calls) and small. Size budget: warn at 1KB, hard cap at 3KB. Latency budget: warn at 100ms, hard at 500ms.

### 6. CI gates

Best for: budget-and-threshold enforcement. Bundle size, API latency, mutation score, Lighthouse, pa11y, dependency CVEs (osv-scanner), secrets (gitleaks), SAST. Required checks block merge.

### 7. `/review` skill (LLM judgment)

Best for: principles that cannot be mechanically enforced — abstraction quality, code health scoring, legibility, voice/tone audits.

Used sparingly — most principles get a deterministic surface first, with `/review` only when no deterministic mechanism is possible.

---

## Part 3 — The rules.ts entry shape

Every mechanism is registered in `.gaia/rules.ts` with a stable shape so hooks, CI, the editor, and `/review` consume from one source.

```ts
{
  id: 'security/protect-config',
  skill: 'd-security',                           // owner skill
  description: 'Config files (rules.ts, biome.json, …) require explicit operator approval to edit.',
  tier: 'hook',                                  // see tier list below
  mechanism: { kind: 'hook', file: 'protect-config.ts' },
}
```

### Tier list

`script` — cross-file shell check
`ast-grep` — codebase-specific pattern
`oxlint` — language-syntactic rule
`tsc` — TypeScript compile-time guarantee
`hook` — agent-time gate
`ci` — required-check budget
`pending` — debt; names target mechanism in `note:` field

### Pending → enforced lifecycle

A `pending` entry is visible debt. SLO: 14 days from author to convert pending → real mechanism. `bun run rules:coverage` lists pending entries; CI surfaces on every PR.

### Coverage check

```sh
bun run rules:coverage   # lists rules without references and references without rules
```

A reference principle with no rule is aspirational. A rule with no reference is inscrutable. Both are debt.

---

## Part 4 — The workflow loop: where rules get exercised

Work flows through one loop with three layers, all parallelizable, all measured by closed cycles (not shipped changes):

| Layer       | Asks         | Cadence      | Produces                                  |
| ----------- | ------------ | ------------ | ----------------------------------------- |
| Initiative  | WHY / WHAT   | On-signal    | `initiatives/NNNN-name/initiative.md`     |
| Coding      | HOW + DO     | Continuous   | One PR per row in initiative §4 PR table  |
| Verdict     | DID-IT-WORK  | Window-based | Measurement window auto-opens on ship     |

The unit of success is a **closed cycle**: an initiative whose hypothesis returned a verdict (moved / didn't / inconclusive / invalidated). Shipping volume without measurement is the build trap with daily-cadence theater on top.

### Phase transitions are artifact validations, not ceremonies

- Initiative → Coding: schema-valid `initiative.md` with §4 PR Breakdown populated.
- Coding → Shipped: green `bun run check` + merged PR.
- Shipped → Verdict: measurement window opens; pending verdict surfaces in daily briefing; window closes when threshold hits or `window_days` elapses.

No phase progresses without the prior artifact validating. No phase requires a meeting, a status call, or a vibes-based green light.

### Execution chain

```
d-code  →  d-review (Gaia)  →  gstack /review  →  gstack /qa  →  gstack /ship  →  d-deploy
                                                                                       │
                                                                                       └─ on failure → d-fail
```

`d-review` is fast pass/fail against `rules.ts`; gstack `/review` is deep correctness; `/qa` runs tests + e2e; `/ship` merges; `d-deploy` deploys. A failure at any gate kicks back to coding.

### Bidirectional flow

Forward: artifact → next artifact. Backward: signals that trigger upstream revision (a metric crashed, a hypothesis got falsified, a constraint changed). Both flows are first-class. A loop that only flows forward turns into a waterfall; a loop that only flows backward turns into paralysis.

---

## Part 5 — The 8 rule-authoring principles

### 1. The Constitutional Loop is the methodology

Every concern in Gaia has up to three forms (Skill, Reference, Rule) connected by two bridges (skill-reference hook, domain-context hook + mechanism verification). The Loop closes when both bridges fire on the same concern. A concern that lives in only one substrate is debt.

**Rules / Guidelines / Boundaries:**

- Every skill has exactly one `reference.md` inside its folder.
- Every reference principle gets a `rules.ts` entry — even if `pending`.
- Every `rules.ts` entry names its owner skill.
- A `pending` mechanism names its target enforcement (not "TBD").

**Enforcement:** `bun run rules:coverage` (existing) lists rules without references and references without rules; CI surfaces on every PR; rule `harness/loop-coverage`.

**Anti-pattern:**

```ts
// ❌ A "rule" that doesn't load any reference and isn't enforced
{ id: 'mystery/be-careful', tier: 'pending', mechanism: { kind: 'pending', note: '?' } }
// nothing teaches the agent what "careful" means; nothing fails when it isn't
```

**Pattern:**

```ts
// ✅ Skill + reference + rule, all wired
// .claude/skills/d-security/reference.md describes "Protected by default"
// .gaia/rules.ts:
{ id: 'security/protected-by-default', skill: 'd-security',
  tier: 'ast-grep',
  mechanism: { kind: 'ast-grep', rule: 'route-protected-by-default' } }
// .claude/hooks/domain-context.ts: editing apps/api/server/* → loads apps/api/CLAUDE.md
// CI runs ast-grep on every PR
```

---

### 2. Reference principles map 1:1 to rules.ts entries

Every numbered principle in any skill's `reference.md` aspires to a `rules.ts` entry — even if the mechanism is `pending`. References without rules are aspirational; rules without references are inscrutable. Pending → enforced cycle time SLO: 14 days.

**Rules / Guidelines / Boundaries:**

- Adding a principle to a reference requires adding a `rules.ts` entry in the SAME PR.
- Pending entries name the target mechanism in `note:` (e.g. `"ast-grep rule X (planned)"`).
- Pending → enforced cycle time SLO: 14 days; older entries surface in `d-health`.
- `bun run rules:coverage` is the canonical drift report.

**Enforcement:** `scripts/rules-coverage.ts` (existing); planned `scripts/check-reference-rule-mapping.ts`.

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

References load via the `skill-reference` hook on Skill invocation, plus the `domain-context` hook on file edit (walks the folder tree). Skills run via the `Skill` tool, with ≥3 phases per `d-skill/reference.md`. Skills routinely `Read` references mid-execution. Both have a `Last verified:` field — staleness is debt.

**Rules / Guidelines / Boundaries:**

- One skill = one reference.md sibling. No skill without a reference; no reference outside a skill folder (fractal CLAUDE.md is a different surface).
- The skill-reference hook fails closed if the sibling reference is missing.
- `Last verified:` field mandatory; >180 days is debt picked up by `d-health`.
- Skill phases are sequential unless explicitly marked branching.

**Enforcement:** `scripts/check-skills.ts` (existing); planned `scripts/check-staleness.ts`; rule `harness/skill-reference-pairing`.

**Anti-pattern:**

```md
<!-- ❌ A "skill" with no reference sibling and no phases -->

# my-skill

When you see X, do Y.
```

**Pattern:**

See `.claude/skills/d-review/SKILL.md` — frontmatter, phases, pre-condition + final-gate sandwich, output format, with `reference.md` sibling carrying the principles.

---

### 4. Hooks are deterministic gates; CLAUDE.mds are judgment context

A hook executes in <100ms, makes a yes/no decision without an LLM call, and fails closed (block on error) by default. A CLAUDE.md is read into context and informs decisions that require judgment. Don't write a hook that needs a model call; don't put hard gates in CLAUDE.md prose.

**Rules / Guidelines / Boundaries:**

- Hooks live in `.claude/hooks/*.ts`; configured in `.claude/settings.json`.
- A hook that calls `fetch()` to an LLM endpoint is review-rejected.
- Hook size budget: warn at 1KB, hard cap at 3KB. Latency: warn at 100ms, hard at 500ms.
- CLAUDE.mds are read-only context for the agent — the agent doesn't write to them mid-session.

**Enforcement:** code review; planned `scripts/check-hook-determinism.ts`.

**Anti-pattern:**

```ts
// ❌ "Smart" hook that asks an LLM for permission
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

### 5. Add a skill (and its reference) when output must be consistent AND ≥3 phases

Skills are invocable verbs the user surfaces by name (`/d-review`). Two reasons to make something a skill: **consistency** (same input → same output every time) and **discoverability** (the user can find it by name). Tasks with neither belong in a CLAUDE.md or a script. The reference.md sibling carries the principles; without it, the skill is a procedure without a constitution.

**Rules / Guidelines / Boundaries:**

- SKILL.md frontmatter required (`ax/skill-md-frontmatter`, script-enforced).
- Phases ≥3; pre-condition + final-gate sandwich; output format declared.
- `reference.md` sibling required; same folder; 5-part principle shape per principle.
- Quarterly skill audit in `d-health`; unused skills (no invocation in 6 months) get archived.

**Enforcement:** `scripts/check-skills.ts` (existing); rule `ax/skill-md-frontmatter`; rule `harness/skill-reference-pairing`.

**Anti-pattern:**

```md
<!-- ❌ A "skill" that's actually a tip, no reference sibling -->

# helpful-tip

Reminder: always run tests before commit.
```

**Pattern:**

`.claude/skills/d-review/{SKILL.md,reference.md}` — full pair.

---

### 6. Folder-scoped principles live in fractal CLAUDE.md, not the skill folder

Cross-cutting principles that apply to a specific folder (apps/api conventions, packages/db invariants) live as `CLAUDE.md` in that folder, NOT in a skill's reference. The `domain-context` hook walks the folder tree on edit, loading every `CLAUDE.md` from the edit target up to repo root. This kills the "context blowout" problem.

**Rules / Guidelines / Boundaries:**

- Skill references = principles for an authoring or audit task (e.g. `d-security/reference.md`).
- Fractal `CLAUDE.md` = principles for a folder (e.g. `apps/api/CLAUDE.md` for backend conventions).
- Editing `apps/web/ui/Button.tsx` loads: `/CLAUDE.md` → `apps/CLAUDE.md` → `apps/web/CLAUDE.md` → `apps/web/ui/CLAUDE.md`.
- Don't duplicate principles between a skill reference and a fractal CLAUDE.md; pick the surface and link from the other.

**Enforcement:** `.claude/hooks/domain-context.ts` walks the tree; rule `harness/auto-load-fractal-claude`.

**Anti-pattern:**

```sh
# ❌ Backend conventions buried in a skill folder no one invokes for backend edits
.claude/skills/d-some-audit/reference.md   # contains "Use TypeBox at route boundaries"
# editing apps/api/server/users/route.ts loads nothing relevant
```

**Pattern:**

```sh
# ✅ Backend conventions in apps/api/CLAUDE.md; auto-loaded on backend edits
apps/api/CLAUDE.md             # 8 backend principles
.claude/hooks/domain-context.ts # walks tree on edit, loads CLAUDE.mds
```

---

### 7. Write an ADR for irreversible decisions; append-only

Adopting a new framework, switching a payment provider, replacing the lint engine, changing the auth model — these need an ADR at `.gaia/adrs/NNNN-<title>.md`. Decisions log entries in references are _local_ (one reference's evolution). ADRs are _global_ (the project's evolution). Numbering is append-only; superseded ADRs stay with status updated.

**Rules / Guidelines / Boundaries:**

- ADR template: `.gaia/adrs/TEMPLATE.md`.
- The PR landing the decision links to the ADR. Reviewer reads ADR first.
- Numbering append-only; superseded ADRs stay with `status: superseded by NNNN`.
- ADR cost is real — reserve for choices expensive to undo (months of work, real money).

**Enforcement:** code review; planned `scripts/check-adr-numbering.ts`.

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

| Surface            | Owner    | Lifetime     | Promotes to                       |
| ------------------ | -------- | ------------ | --------------------------------- |
| `memory/working/`  | Agent    | Per session  | (cleared on session end)          |
| `memory/episodic/` | Agent    | 90-day decay | A skill's `reference.md` (manual) |
| `memory/personal/` | Operator | Indefinite   | Stays (gitignored)                |

The agent writes to `memory/episodic/` during sessions. After 90 days without re-trigger, entries archive. Promotion to a skill's `reference.md` is manual via `d-rules` and requires the same review as a code change. `memory/personal/` is gitignored at the directory level — never commit personal notes.

**Rules / Guidelines / Boundaries:**

- `.gitignore` excludes `memory/personal/`.
- Promotion path: episodic entry observed ≥3 times → reviewed → reference principle + rules.ts entry land in same PR.
- `d-rules` is the only skill that promotes; code review enforces.
- Episodic entries older than 90 days auto-archive (planned `scripts/memory-decay.ts`).

**Enforcement:** `.gitignore` (existing); planned `scripts/memory-decay.ts`; rule `harness/memory-decay`.

**Anti-pattern:**

```md
<!-- ❌ Personal preference committed to memory/personal/ in a PR -->

git diff --name-only
+memory/personal/henrique-prefs.md

(the operator just leaked their personal notes)
```

**Pattern:**

```sh
# ✅ Episodic learning gets observed → curated → promoted (via d-rules)
echo "Pattern observed: ..." >> .gaia/memory/episodic/$(date +%F).md
# 90 days later, d-rules reviews; if pattern is generalizable, promote to a reference principle + rules.ts entry
```

---

## Part 6 — Promotion paths

### memory → skill reference

The `d-rules` skill (or human review) sees a pattern in `memory/episodic/` ≥3 times across distinct contexts → proposes a reference addition. Promotion requires:

1. Pattern is generalizable (not specific to one bug).
2. Adding it doesn't contradict an existing principle.
3. Reviewer signs off on the diff.
4. A `rules.ts` entry is created at the same time (per principle #2).

### reference principle → enforced rule

A reference principle that becomes mechanically checkable converts its mechanism in `rules.ts` from `pending` → `script` / `oxlint` / `ast-grep` / `hook` / `tsc` / `ci`. Examples:

- "Use AppError, not bare Error" (`d-code/reference.md`) → `code/named-errors-no-bare-throw` ast-grep rule
- "Don't read `process.env` outside config/env.ts" (`d-security/reference.md`) → `security/no-raw-env` hook
- "Tests next to source" (`d-code/reference.md`) → `testing/colocated-tests` script

### rule pending → enforced

`rules.ts` entries with `mechanism: { kind: 'pending' }` are visible debt. The 14-day SLO is the working agreement.

---

## Part 7 — Decision matrix

| New thing                                  | Where it goes                                                |
| ------------------------------------------ | ------------------------------------------------------------ |
| "We always X in domain Y"                  | `<skill>/reference.md` principle + `rules.ts` entry          |
| "Block this file from being edited"        | `rules.ts` rule + `.claude/hooks/protect-files.ts`           |
| "Run this script on every save"            | `.claude/settings.json` hook → `.claude/hooks/*.ts`          |
| Multi-step procedure agent invokes by name | `.claude/skills/<name>/SKILL.md` + sibling `reference.md`    |
| Folder-specific convention                 | That folder's `CLAUDE.md` (auto-loaded by domain-context)    |
| Irreversible technology choice             | `.gaia/adrs/NNNN-<choice>.md`                                |
| Lessons learned during one task            | `memory/episodic/<date>.md`                                  |
| Per-developer scratchpad                   | `memory/personal/<name>.md` (gitignored)                     |

---

## Part 8 — When to write nothing

The trap of methodology work is over-formalization. Default to **don't write** unless:

- The cost of the next agent re-discovering this is high.
- The pattern has been seen in ≥3 distinct contexts.
- A code-level fix isn't the right answer.

A failing test, a clear error message, a sharp interface — these substitute for documentation. Write reference material only when the code can't be made to teach itself.

---

## Enforcement mapping

| Principle                                | Mechanism                                       | rules.ts entry                       |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| 1. Constitutional Loop                   | `bun run rules:coverage` + CI report            | `harness/loop-coverage`              |
| 2. 1:1 reference ↔ rule                  | `rules-coverage.ts`; planned mapping check      | `harness/rule-reference-pair`        |
| 3. Skill ↔ reference 1:1 + last-verified | `check-skills.ts`; planned `check-staleness.ts` | `harness/skill-reference-pairing`    |
| 4. Hooks deterministic                   | code review; planned hook-determinism check     | `harness/hook-determinism`           |
| 5. Skill threshold + audit               | `check-skills.ts`                               | `ax/skill-md-frontmatter`            |
| 6. Fractal CLAUDE.md auto-load           | `domain-context.ts`                             | `harness/auto-load-fractal-claude`   |
| 7. ADR for irreversible                  | code review + template                          | `harness/adr-numbering` (planned)    |
| 8. Memory decay                          | planned `scripts/memory-decay.ts`               | `harness/memory-decay` (planned)     |

---

## Cross-references

- Single policy source: `.gaia/rules.ts`
- Coverage report: `bun run rules:coverage`
- ADR template: `.gaia/adrs/TEMPLATE.md`
- Memory surfaces: `.gaia/memory/{working,episodic,personal}/`
- Reference shape: `.claude/skills/d-reference/reference.md`
- Skill conventions: `.claude/skills/d-skill/reference.md`
- Hook configuration: `.claude/settings.json`

---

## Decisions log

| Date       | Decision                                            | Rationale                                                                                                                   |
| ---------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | Name the methodology: The Constitutional Loop       | Most "AI rules" libraries hand the agent a markdown file. The Loop hands the agent the right file at the right moment AND fails the commit if the rule isn't followed. The auto-load + mechanical-verify combo is the moat. |
| 2026-04-28 | SRR triad (Skills, References, Rules)               | Three substrates with distinct lifecycles; each has its own bridge to the agent. Skills = invoked verbs; References = loaded nouns; Rules = executed mechanisms. A concern in fewer than its applicable substrates is debt. |
| 2026-04-28 | 1:1 skill ↔ reference; reference inside skill folder | Co-locating the reference with the skill kills "where does this principle live?" drift. The skill-reference hook auto-loads the sibling on invocation. |
| 2026-04-28 | Fractal `CLAUDE.md` for folder-scoped principles    | A skill reference is wrong for "rules that apply when editing this folder." Folder-scoped principles live with the folder; the domain-context hook walks the tree. |
| 2026-04-28 | 1:1 reference principle ↔ rules.ts entry            | Without this, references rot into "advice nobody enforces." Pending entries are visible debt with a 14-day SLO.            |
| 2026-04-28 | Manual promotion only from memory → reference       | Auto-promotion would let stochastic noise enter the constitution. Promotion is curation, not aggregation.                   |
| 2026-04-28 | ADRs for irreversible decisions only                | ADRs are expensive to write and read. Reserve for choices that cost real money / time to undo.                              |
| 2026-04-28 | Memory decay: 90 days for episodic                  | Without decay, `memory/episodic/` grows forever. 90 days is "long enough to be useful, short enough to remain curated."     |
| 2026-04-28 | Merge methodology + harness + workflow into rules reference | The three were redundant views of the same triad. One file kills the "which one do I read?" decision.                    |

_Update this log when methodology rules change. The methodology is the only thing that's allowed to evolve recursively — be careful._
