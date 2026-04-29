# Health — Comprehensive codebase health audit

> Status: Reference
> Last verified: April 2026
> Scope: How `a-health` orchestrates audits, computes the composite score, tracks trend, and surfaces systemic debt.
> Sibling skill: `a-health` (this folder's `SKILL.md`).
> Paired with: every `a-*` audit skill (dispatched), `h-rules/reference.md` (constitutional loop), `w-review` (post-audit fix loop).

---

## What this file is

The constitution for the meta-audit. `a-health` is not a domain inspector — it is the orchestra conductor. The 6 sibling audit skills (`a-security`, `a-ai`, `a-ax`, `a-ux`, `a-dx`, `a-observability`, plus `a-perf` once scaffolded) each own their domain. `a-health` runs the existing `bun run check` harness, dispatches to those siblings, aggregates their findings into a 12-axis vector, computes trend vs the prior audit, and surfaces the worst-file leaderboard.

This file is consulted by the agent at the moment of action. Read it before mutating `SKILL.md`, before adding new sessions, before touching the score formula.

---

## The 10 audit-orchestration principles

### 1. Dispatch; never re-audit

`a-health` invokes the sibling audit skills and aggregates their outputs. It does not contain its own security checklist, UX checklist, observability checklist. Domain principles live in the sibling's `reference.md`; duplicating them in `a-health/SKILL.md` guarantees drift the moment a sibling's reference moves.

**Rules / Guidelines / Boundaries:**

- `SKILL.md` body must not contain Sessions / Phases that re-implement a sibling's checklist (security input validation, observability init, etc.).
- New domain principles go in the sibling's `reference.md` + `rules.ts` entry, never in `a-health`.
- The dispatcher reads the sibling's latest `.gaia/audits/<skill>/<date>.md`, not the sibling's source code.
- A sibling that hasn't been run for the current audit cycle scores `n/a` on its axis — never silently zeroed.

**Enforcement:** rule `health/dispatch-not-reaudit` (mechanism: `script` `.claude/skills/a-health/scripts/check-no-duplication.ts` — pending; planned to grep `SKILL.md` for sibling-owned principle phrases).

**Anti-pattern:**

```md
<!-- ❌ a-health/SKILL.md re-implementing security checks -->

## Session 1: Security

- [ ] Every POST/PUT/PATCH uses route schemas
- [ ] Auth middleware on every /api/\* route
- [ ] Webhook signatures verified before processing
```

**Pattern:**

```md
<!-- ✅ a-health/SKILL.md dispatches; security lives in a-security -->

## Phase 2: Dispatch sibling audits

Skill(a-security, mode: report) → .gaia/audits/a-security/<date>.md
Skill(a-observability, mode: report) → .gaia/audits/a-observability/<date>.md
... (one per a-\* sibling)
```

---

### 2. Composite score is a vector, scalar is the headline

A single-number health score hides which axis moved. `a-health` always emits the 12-axis vector alongside the composite. CI surfaces every axis on the PR; trend tracking happens per-axis, not on the scalar. Weighted-average exists for the dashboard headline only.

**Rules / Guidelines / Boundaries:**

- The audit output declares both the vector (12 axes) and the scalar composite.
- Per-axis weights live in this reference (Part — Score formula); they sum to 1.0.
- Changing weights requires updating this reference + the formula check script in the same PR.
- Per-axis trend is reported even when the composite is flat.

**Enforcement:** rule `health/composite-score-formula` (mechanism: `script` `.claude/skills/a-health/scripts/check-score-formula.ts` — pending; planned to assert weights sum 1.0 and match this reference).

**Anti-pattern:**

```text
❌ "Composite score: 8.5/10" — scalar without the vector.
   Reader can't tell whether security collapsed or DX improved.
```

**Pattern:**

```text
✅ Composite: 8.5/10  [↓0.3 from 2026-04-22]
   Driver: DX axis dropped 1.5 (TTHW regressed)
   Vector:
     Security 9.2  AI 8.0  Agent-X 9.5  UX 8.7  DX 7.5
     Obs 9.0  Coh 8.0  Dead 9.5  Test 7.0  Dup 8.5
     Arch 9.5  Deps 8.0
```

---

### 3. Trend is mandatory; single-shot scores are theater

A health score with no prior context is a vibes report. Every audit run reads the prior `.gaia/audits/a-health/<YYYY-MM-DD>.md`, computes per-axis delta, declares the direction (improving / stable / degrading). The first run of a fresh repo opens the trend; every subsequent run extends it. An audit that can't compare to history fails closed.

**Rules / Guidelines / Boundaries:**

- `.gaia/audits/a-health/<YYYY-MM-DD>.md` MUST contain an `## Audit History` table.
- Each run appends one row: date, composite, vector, top driver.
- Trend direction is computed mechanically: `delta > +0.2` improving / `delta < -0.2` degrading / else stable.
- Missing history is reported, not silently bypassed.

**Enforcement:** rule `health/trend-required` (mechanism: `script` `.claude/skills/a-health/scripts/trend.ts` — exists; surfaces missing history as a P0 finding in the audit itself).

**Anti-pattern:**

```md
❌ Audit emits a score but never opens .gaia/audits/a-health/<YYYY-MM-DD>.md.
Two consecutive audits look identical, no signal that they're independent.
```

**Pattern:**

```md
✅ ## Audit History

| Date       | Composite | Sec | AI  | Agent-X | UX  | DX  | Obs | Coh | Dead | Test | Dup | Arch | Deps |
| ---------- | --------- | --- | --- | ------- | --- | --- | --- | --- | ---- | ---- | --- | ---- | ---- |
| 2026-04-29 | 8.5       | 9.2 | 8.0 | 9.5     | 8.7 | 7.5 | 9.0 | 8.0 | 9.5  | 7.0  | 8.5 | 9.5  | 8.0  |
| 2026-04-22 | 8.8       | 9.2 | 8.0 | 9.5     | 8.7 | 9.0 | 9.0 | 8.0 | 9.5  | 7.0  | 8.5 | 9.5  | 8.0  |
```

---

### 4. Worst-file leaderboard surfaces systemic debt

Findings clustered into a single file are 1-shot fixes. Findings smeared across the codebase are systemic. The leaderboard cross-references every sub-audit's `file:line` evidence; files appearing in ≥3 distinct sub-audits are flagged as **systemic debt** — fixing them ships disproportionate signal.

**Rules / Guidelines / Boundaries:**

- The leaderboard ranks files by weighted finding count: critical=3, high=1.5, medium=0.5, low=0.1.
- Top 5 files appear in the audit report regardless of severity floor.
- Files crossing 3+ sub-audits get a "systemic" tag in the report.
- Test files and migrations are excluded from the ranking (they are bounded contexts, not code-debt vectors).

**Enforcement:** rule `health/worst-file-leaderboard` (mechanism: `script` `.claude/skills/a-health/scripts/worst-files.ts` — exists; emits the leaderboard table).

**Anti-pattern:**

```text
❌ Audit lists 47 findings; reader has no idea which file would unlock the most.
```

**Pattern:**

```text
✅ ## Top 5 worst files

| File                                  | Sessions | Score | Tag       |
| ------------------------------------- | -------- | ----- | --------- |
| apps/api/features/billing/routes.ts   | 4        | 7.5   | systemic  |
| packages/adapters/payments.ts         | 3        | 6.0   | systemic  |
| apps/web/src/routes/billing/cancel.tsx| 2        | 4.5   |           |
```

---

### 5. Pending rules with a 14-day SLO surface as P1

`bun run rules:coverage` lists `rules.ts` entries still in `kind: 'pending'`. The h-rules constitution sets a 14-day SLO from author to enforced mechanism. `a-health` reads this list, flags any pending entry past 14 days as a P1 finding, and includes it in the fix plan. References without rules and rules without references are both P1 debt.

**Rules / Guidelines / Boundaries:**

- Phase 1 invokes `bun run rules:coverage` and parses output.
- Pending entries with author-date older than 14 days surface as P1 in the fix plan.
- References declared in `.claude/skills/<x>/reference.md` with no matching `rules.ts` entry surface as P0.
- Rules without a reference principle surface as P1.

**Enforcement:** rule `health/coverage-drift` (mechanism: `script` `scripts/rules-coverage.ts` — exists; `a-health` parses its output as input).

**Anti-pattern:**

```text
❌ Pending rules accumulate. After a year, half of rules.ts is pending. The
   constitution rotted into a wishlist; no audit ever flagged it.
```

**Pattern:**

```text
✅ Phase 1 output:
   bun run rules:coverage
     pending entries past 14d SLO: 4
       - skills/output-mode-required (author 2026-03-10, 50 days)
       - skills/cold-start-safe      (author 2026-03-10, 50 days)
       ...
   → P1 finding: "4 pending rules past SLO" added to fix plan
```

---

### 6. Skip-intelligence preserves cost; provenance preserves trust

Re-running the full audit when nothing changed is waste. If a domain's source files have not changed since the last green audit, that domain skips with a note. Trade-off: this only fires when the prior axis was ≥9.5 AND `git diff --name-only` shows zero changes in scope. Reproducibility stamp pins commit SHA + tool versions per audit; trend comparisons across mismatched stacks degrade gracefully (delta marked "stack-changed").

**Rules / Guidelines / Boundaries:**

- Skip rule: prior axis ≥9.5 AND zero changes in scope since prior audit date.
- Skip is a note, not a silent omission — the report says `Sec: 9.2 (skipped: no changes since 2026-04-22)`.
- `--force` flag bypasses skip-intelligence.
- Reproducibility stamp: git SHA, tool versions for `bun`, `oxlint`, `oxfmt`, `knip`, `tsc`, `ast-grep`. Captured per audit run.

**Enforcement:** rule `health/skip-intelligence` (mechanism: `pending`, note: "skip + provenance verified by aggregate-scores.ts which respects skip rule and writes stamp.json").

**Anti-pattern:**

```text
❌ Audit runs end-to-end every time; weekly cadence costs 10 minutes per run
   even when nothing in the security path changed.

❌ Trend graph compares scores across major bun/oxlint upgrades — unrelated
   noise drives the line.
```

**Pattern:**

```text
✅ Phase 0: capture reproducibility stamp
   bun .claude/skills/a-health/scripts/reproducibility-stamp.ts > stamp.json

   Phase 2 with skip-intelligence:
   Sec: 9.2  (skipped: prior 9.5, 0 changed files in apps/api/server, packages/security)
   AI:  8.0  (computed: 4 changed files in apps/api/llm/, packages/adapters/anthropic.ts)
```

---

### 7. Report-only by contract; final gate confirms

`a-health` is a diagnostic, never a treatment. It mutates `.gaia/audits/a-health/<YYYY-MM-DD>.md` and `.gaia/audits/a-health/*` only. Every other write is a violation. The final phase re-runs `bun run check` to confirm no source mutation slipped through. Fix work belongs to `w-review` and `w-code` after the report lands.

**Rules / Guidelines / Boundaries:**

- Output mode: **report**. The skill never auto-applies fixes.
- Allowed writes: `.gaia/audits/a-health/<YYYY-MM-DD>.md`, `.gaia/audits/a-health/<date>.md`, `.gaia/audits/a-health/pulse.jsonl`, `.gaia/audits/a-health/.stamp`.
- Phase 4 runs `bun run check` and asserts zero diff in tracked source files.
- A report listing zero findings still ships — the report IS the output.

**Enforcement:** rule `health/report-only` (mechanism: `pending`, note: "Phase 4 sandwich gate compares `git diff --name-only` to allowed-writes whitelist").

**Anti-pattern:**

```ts
// ❌ a-health helper "fixes" a console.log it found
await Bash('sed -i "" "/console.log/d" apps/api/server/app.ts')
// audit just mutated source code; the report no longer reflects pre-state
```

**Pattern:**

```ts
// ✅ Finding emitted; fix deferred
findings.push({
  axis: 'observability',
  severity: 'medium',
  file: 'apps/api/server/app.ts',
  line: 42,
  rule: 'observability/no-console-log-in-prod',
  fix: 'NEEDS w-review',
})
```

---

### 8. Sub-audit failure is a finding, not an abort

If `a-security` crashes mid-run, `a-health` emits the partial report with that axis marked `error` and the failure message captured in the findings list. The audit must complete and produce `.gaia/audits/a-health/<YYYY-MM-DD>.md` even when a sibling skill is broken. A skipped audit is more dangerous than a partial one because the operator never sees that the audit is broken.

**Rules / Guidelines / Boundaries:**

- Each `Skill(a-*)` call is wrapped: failure is captured, axis marked `error`, audit continues.
- Composite score is computed across non-error axes; the report flags reduced confidence.
- An axis with `error` status surfaces the captured stderr in the fix plan as a P0 ("audit infra broken").
- `bun run check` failure in Phase 0 is captured as a P0 but the audit still produces output.

**Enforcement:** rule `health/partial-report-fallback` (mechanism: `pending`, note: "aggregate-scores.ts wraps each sub-audit invocation in try/catch; emits axis: 'error' on failure").

**Anti-pattern:**

```ts
// ❌ a-security crash aborts the whole audit; operator gets no signal at all
const findings = await runSecurityAudit() // throws
// nothing else runs; .gaia/audits/a-health/<YYYY-MM-DD>.md not written; trend stops
```

**Pattern:**

```ts
// ✅ Failures captured per-axis
try {
  results.security = await runSecurityAudit()
} catch (err) {
  results.security = { axis: 'security', status: 'error', error: String(err) }
}
// audit continues with the remaining 11 axes
```

---

### 9. Continuous mode: pulse on every substantial session

Periodic-only audits detect rot 90 days late. The `Stop` hook fires `quick-pulse.ts` after sessions that touched ≥10 files; this runs Phase 1 only (mechanical sweep, ~30s) and appends one row to `.gaia/audits/a-health/pulse.jsonl`. Trend is rolling, not bucketed. The full audit (Phase 0–4) still runs on weekly cadence and on explicit invocation.

**Rules / Guidelines / Boundaries:**

- Pulse fires only when the session touched ≥10 files (avoid noise on small sessions).
- Pulse runs Phase 1 only; never dispatches sub-audits (they have their own cadence).
- Pulse output: one JSON line per run with timestamp, git SHA, axis subset (mechanical axes only).
- Full audit still runs weekly; pulse fills the gap between weekly runs.

**Enforcement:** rule `health/continuous-pulse` (mechanism: `pending`, note: "wired in .claude/settings.json Stop hook → quick-pulse.ts").

**Anti-pattern:**

```text
❌ Quarterly health audit: rot accumulates for 90 days, dashboard moves once
   per quarter, problems compound between runs.
```

**Pattern:**

```jsonl
✅ .gaia/audits/a-health/pulse.jsonl (rolling, append-only)
{"ts":"2026-04-29T14:02:11Z","sha":"a1b2","mech":{"check":"green","dead":2,"pending":4,"dup":7}}
{"ts":"2026-04-29T15:18:44Z","sha":"c3d4","mech":{"check":"green","dead":2,"pending":4,"dup":8}}
{"ts":"2026-04-29T16:55:02Z","sha":"e5f6","mech":{"check":"red:check:test","dead":2,"pending":4,"dup":8}}
```

---

### 10. The audit is itself audited

`a-health` is a skill, so `a-ax` audits it on the quarterly cadence — cold-start safety, frontmatter shape, phase numbering, sandwich gates, output mode declaration. `a-health` does not get a free pass. The reference's own `Last verified` field gets bumped on every meaningful change to this file; >180 days unbumped is debt picked up by the next `a-health` run.

**Rules / Guidelines / Boundaries:**

- `a-ax` audits this skill the same way it audits all skills.
- This reference's `Last verified` date is bumped when principles change.
- `Last verified` >180 days surfaces as P1 in the next audit (recursive — `a-health` audits its own staleness).
- Versioning: changes to phase count, output format, or score formula are ADR-worthy per `h-skill/reference.md`.

**Enforcement:** rule `health/self-audit` (mechanism: `pending`, note: "a-ax/SKILL.md picks up .claude/skills/a-health/SKILL.md in its standard sweep").

**Anti-pattern:**

```text
❌ a-health graded everyone but itself for two years; its reference rotted into
   a kaz-era artifact with broken paths and zero rules.ts ownership.
   (This is the actual state pre-rebuild. The lesson is real.)
```

**Pattern:**

```md
✅ # Health — Comprehensive codebase health audit

> Last verified: April 2026
> ...
> bumped on every principle change; a-ax flags staleness; recursion holds.
```

---

## Score formula (the weighted vector)

12 axes; weights sum to 1.0. Each axis scored 0–10. Composite = Σ(weight × axis_score).

| Axis          | Weight | Source                                                    |
| ------------- | ------ | --------------------------------------------------------- |
| Security      | 0.18   | `a-security` audit findings, severity-weighted            |
| Performance   | 0.10   | `a-perf` audit findings (or `n/a` until a-perf scaffolds) |
| Agent-X       | 0.05   | `a-ax` audit findings                                     |
| UX            | 0.05   | `a-ux` audit findings                                     |
| DX            | 0.05   | `a-dx` audit findings                                     |
| Observability | 0.07   | `a-observability` audit findings                          |
| AI            | 0.05   | `a-ai` audit findings                                     |
| Coherence     | 0.10   | `bun run rules:coverage` + reference shape/voice scripts  |
| Dead-weight   | 0.10   | `bun run check:dead` (knip)                               |
| Test-health   | 0.10   | `scripts/check-tests-exist.ts` + e2e/integration coverage |
| Duplication   | 0.05   | `scripts/check-duplication.ts`                            |
| Architecture  | 0.05   | `bun run check:ast` (ast-grep)                            |
| Dependencies  | 0.05   | `bun outdated` + osv-scanner CI artifact                  |

Per-axis score formula: `10 - (critical*3 + high*1.5 + medium*0.5 + low*0.1)`, clamped to [0, 10].

Skip-intelligence: an axis with prior score ≥9.5 AND zero changed files in scope since the prior audit reuses the prior score with `(skipped)` annotation.

---

## Output (canonical shape of `.gaia/audits/a-health/<YYYY-MM-DD>.md`)

```md
# Codebase Health Report

> Last audit: <date>
> Composite score: X.X/10
> Trend: <improving|stable|degrading> (delta from last run)
> Stamp: <git SHA> · bun <ver> · oxlint <ver> · knip <ver> · tsc <ver>

## Vector

| Axis | Score | Findings | Critical | Notes |
| ---- | ----- | -------- | -------- | ----- |

... 12 rows

## Top 5 worst files (cross-audit)

| File | Sessions | Weighted score | Tag |
| ---- | -------- | -------------- | --- |

## Top 5 highest-impact fixes

1. ...

## Fix plan

### P0 — Fix now

| # | Axis | File | Issue | Effort |

### P1 — Fix this week

### P2 — Fix this month

### P3 — Track

## Detailed findings (per axis)

### Security

[from a-security audit]

### AI

[from a-ai audit]

... (one section per axis)

## Audit History

| Date | Composite | Sec | Perf | Agent-X | UX | DX | Obs | AI | Coh | Dead | Test | Dup | Arch | Deps |
```

---

## Cross-references

- Sibling skill: `.claude/skills/a-health/SKILL.md`
- Constitutional loop: `.claude/skills/h-rules/reference.md`
- Skill conventions: `.claude/skills/h-skill/reference.md`
- Reference conventions: `.claude/skills/h-reference/reference.md`
- Sibling audits dispatched: `a-security`, `a-ai`, `a-ax`, `a-ux`, `a-dx`, `a-observability`, `a-perf`
- Coverage report: `bun run rules:coverage`
- Dead code: `bun run check:dead`
- Architecture: `bun run check:ast`
- Tool inventory: `package.json` scripts (`check`, `check:scripts`, `harden`)

---

## Decisions log

| Date       | Decision                                                             | Rationale                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-29 | Rebuild a-health as dispatcher, not domain inspector                 | The kaz-era body duplicated checklists owned by a-\* siblings. Drift was guaranteed; ownership was unclear. Dispatching is the only architectural move that closes the loop.                           |
| 2026-04-29 | Composite score is a vector + scalar; weights live in this reference | Single-number scores hide which axis moved. Vector is the signal; scalar is the headline. Co-locating weights with principles makes formula changes traceable.                                         |
| 2026-04-29 | Trend is mandatory; first run opens the history                      | A score with no comparator is theater. Audit history table forces every run to compare itself to its predecessor.                                                                                      |
| 2026-04-29 | Continuous pulse via Stop hook                                       | Periodic-only audits detect rot 90 days late. Pulse runs the mechanical sweep on every substantial session; full audit stays weekly.                                                                   |
| 2026-04-29 | Skip-intelligence: prior ≥9.5 + zero changed files = skip with note  | Re-auditing unchanged scope is waste. The 9.5 floor + zero-diff constraint catches honest changes without burning cost on truly stable areas.                                                          |
| 2026-04-29 | Reproducibility stamp on every audit                                 | Trend comparisons across major tool upgrades produce noise. Stamping git SHA + tool versions lets the trend differ degrade gracefully when stacks change.                                              |
| 2026-04-29 | Sub-audit failure → axis: 'error', audit completes                   | A skipped audit is worse than a partial one because the operator can't tell it's broken. Partial completion + visible error preserves trend continuity.                                                |
| 2026-04-29 | Performance moved to dedicated a-perf skill                          | a-health is the dispatcher; performance needs its own skill or the dispatcher invariant breaks. Scaffolding a-perf in the same PR keeps the architecture clean even if a-perf's reference starts thin. |

_Update this log when audit principles change. Trend continuity depends on the formula staying stable; flag formula changes loudly._
