# Initiative — Reference

> Status: Reference
> Last verified: April 2026
> Scope: How `initiative.md` files under `.gaia/initiatives/NNNN-<slug>/` get authored — falsifier-first, wave-aligned, with measurement wired at ship-time and an audit trail that classifies every decision.
> Sibling skill: `w-initiative` (this folder's `SKILL.md`).
> Paired with: `h-rules/reference.md` (constitutional loop), `h-skill/reference.md` (skill conventions), `h-reference/reference.md` (5-part shape).

---

## What this is

Initiatives are the **WHY/WHAT** layer of the workflow loop in vision §H1. One file per bet, end-to-end (research → strategy → folder structure → implementation → PR breakdown → audit trail). The file is the contract `w-code` reads to execute, and the artifact `a-health` reads to score.

This reference encodes the eight principles that distinguish a well-formed initiative from a wish. Each principle maps 1:1 to a `rules.ts` entry under skill `w-initiative` (per `h-rules/reference.md` §Part 5 §2).

---

## Required frontmatter

```yaml
---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: <one sentence — verb + metric + directional change>
falsifier: <metric < threshold over window_days>
measurement:
  metric: <name>
  source: <event-log table or query target>
  query: <concrete HogQL / SQL / scripts/<file>.ts filter>
  baseline: <current value or 0 if greenfield>
  threshold: <Q3 numeric threshold>
  window_days: <integer>
  window_opens_at: <date or TBD until ship>
  verdict: pending | moved | invalidated | inconclusive
status: draft | approved | in-progress | shipped | killed
wave: 0a | 0b | 1 | 2 | 3 | 4 | 5 | off-wave
---
```

`.gaia/rules/checks/validate-artifacts.ts` enforces `parent`, `hypothesis`, `measurement` (existing). Extended fields (`falsifier`, `wave`, `measurement.query`, `measurement.window_opens_at`, `measurement.verdict`) are enforced by the same script after this initiative ships.

---

## The eight principles

### 1. Falsifier-first interviewing

Every initiative starts with a hypothesis-and-falsifier pair, captured before any approach is chosen. Hypothesis names a verb, a metric, and a directional change. Falsifier names a threshold and a window. "We'll know it's working" is not a falsifier; "metric X < Y over Z days" is.

**Rules / Guidelines / Boundaries:**

- Phase 1 of `w-initiative` asks for hypothesis BEFORE asking for approach.
- Hypothesis must contain a metric and a directional change verb.
- Falsifier must contain a numeric threshold and a window in days.
- A hypothesis without a falsifier is reclassified as a User Challenge in §6 and the skill halts.

**Enforcement:** rule `workflow/falsifier-required` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check `falsifier:` field present and non-empty; ships in the next PR per the 14-day SLO).

**Anti-pattern:**

```yaml
# ❌ Hypothesis with no falsifier — wishful thinking dressed as a bet
hypothesis: We'll get more sign-ups by improving onboarding
# (no metric, no threshold, no window, no falsifier field)
```

**Pattern:**

```yaml
# ✅ Falsifiable bet with measurable verdict
hypothesis: Time-to-first-deploy on `bun create gaia` drops from 25 min to ≤5 min for a fresh-clone operator.
falsifier: p50 first-deploy time > 8 min over 30 days post-ship across ≥10 fresh clones.
```

---

### 2. Wave alignment is explicit

Every initiative either pins to a wave (0a, 0b, 1, 2, 3, 4, 5 — the v5 vision execution order) or marks itself off-wave with one-sentence justification. Off-wave bets are allowed but must justify why they don't fit the lexicographic execution order. A wave-N bet cannot precede an unfinished wave-(N-1) bet unless the founder explicitly accepts the inversion in §2.

**Rules / Guidelines / Boundaries:**

- Frontmatter `wave:` field is required (one of `0a|0b|1|2|3|4|5|off-wave`).
- Off-wave bets justify in §2 with at least one sentence ("standalone methodology bet", "user-blocking hardening", etc.).
- Wave inversion (later wave shipping before earlier) requires §2 acknowledgment + AD-N row in §6.

**Enforcement:** rule `workflow/wave-alignment` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check `wave:` field present; off-wave bets surface a notice but don't fail).

**Anti-pattern:**

```yaml
# ❌ No wave field; reader can't tell where this fits the execution order
---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: ...
status: draft
---
```

**Pattern:**

```yaml
# ✅ Wave-aligned with §2 acknowledging any inversion
---
wave: 1
status: draft
---
```

---

### 3. Cap table is mandatory and concrete

§2 of every initiative declares a Cap table — what ships in v1.0 vs. what is explicitly capped. A cap is a real decision someone could push back on; "we'll see" is not a cap. The cap matters more than the scope: it's where the bet's blast radius is bounded.

**Rules / Guidelines / Boundaries:**

- §2 contains a markdown table with header `| Surface | Ships v1.0 | Capped |`.
- Capped column has at least 3 entries; each names a specific scope someone might want.
- "Future work" is not a cap; the cap names what's NOT happening in v1.0 specifically.

**Enforcement:** rule `workflow/cap-table-required` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check §2 contains a Cap table with ≥3 rows in the Capped column).

**Anti-pattern:**

```md
<!-- ❌ Vague aspiration with no real cap -->

## 2. Strategy

Approach: build the onboarding flow.
We'll keep it simple for now and expand later.
```

**Pattern:**

```md
<!-- ✅ Concrete cap with surfaces someone could argue for -->

## 2. Strategy

**Cap table:**

| Surface           | Ships v1.0        | Capped                         |
| ----------------- | ----------------- | ------------------------------ |
| Auth providers    | Email + Google    | GitHub, Apple, magic link      |
| Onboarding length | 3 steps, ≤60s     | Tour modals, video walkthrough |
| First-run state   | One template repo | Multi-template picker          |
```

---

### 4. Abandonment ladder is the kill condition

Every hypothesis is a bet. Every bet has a kill condition. §2 declares an Abandonment ladder: when the falsifier fires, what happens next? Kill the initiative outright, pivot to a named alternative, or scope-down to a named smaller bet. A bet without a written kill path is theatre — the team will rationalize keeping it alive forever.

**Rules / Guidelines / Boundaries:**

- §2 contains a markdown table with header `| Trigger | Next step |`.
- Each trigger references a specific frontmatter measurement state (verdict=invalidated, threshold breach, etc.).
- Each next-step is named: "kill", "pivot to <named bet>", or "scope down to <named smaller bet>".

**Enforcement:** rule `workflow/abandonment-ladder-required` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check §2 contains an Abandonment ladder with ≥1 row).

**Anti-pattern:**

```md
<!-- ❌ No kill condition — the bet runs until forgotten -->

## 2. Strategy

If it doesn't work, we'll figure it out.
```

**Pattern:**

```md
<!-- ✅ Concrete kill paths -->

## 2. Strategy

**Abandonment ladder:**

| Trigger                                     | Next step                         |
| ------------------------------------------- | --------------------------------- |
| verdict=invalidated (p50 > 8 min @ 30 days) | Pivot to 0013-deploy-cli-overhaul |
| verdict=inconclusive (n<10 fresh clones)    | Extend window 30 days, re-measure |
| AGAINST principle 9 (legibility regression) | Kill — restore prior CLI          |
```

---

### 5. Decisions are classified (M / T / UC)

§6 Decision Audit Trail records every decision the initiative made, classified into one of three classes from autoplan: **Mechanical** (deterministic, no judgment — next NNNN, frontmatter scaffold), **Taste** (subjective but defensible — approach choice, cap line), **User Challenge** (requires human authority — falsifier rewrite, off-wave inversion, in-flight conflict). The class column makes authority distribution auditable: future-you can see how each decision was made.

**Rules / Guidelines / Boundaries:**

- §6 contains a markdown table with header `| ID | Decision | Class | Source |`.
- Class column values are exactly `M`, `T`, or `UC`.
- Audit trail is append-only — new decisions add rows; never rewrite past rows.
- Every Phase 3 panel conclusion that mutated §2/§3 gets an AD-N row.
- Every Phase 4 review lens conclusion that mutated §4/§5 gets an AD-N row.

**Enforcement:** rule `workflow/decision-class-column` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check §6 table has a `Class` column with values in {M, T, UC}).

**Anti-pattern:**

```md
<!-- ❌ Audit trail without class column — can't tell who had authority -->

## 6. Decision Audit Trail

| ID   | Decision  | Source  |
| ---- | --------- | ------- |
| AD-1 | Use Polar | founder |
```

**Pattern:**

```md
<!-- ✅ Class column reveals authority distribution -->

## 6. Decision Audit Trail

| ID   | Decision                                        | Class | Source                          |
| ---- | ----------------------------------------------- | ----- | ------------------------------- |
| AD-1 | Initiative number 0012                          | M     | Phase 2 mechanical              |
| AD-2 | Approach: skill rewrite (vs. multi-skill split) | T     | Founder Q1, panel D1 conclusion |
| AD-3 | Off-wave standalone — methodology bet           | UC    | Founder Q4 explicit             |
```

---

### 6. Measurement is wired at ship, not declared

Phase 6 of `w-initiative` produces a concrete query (`measurement.query`), a baseline value, and a window-opens-at date. A `measurement.query: TBD` field that survives to merge is a broken bet — the verdict step of the workflow loop has nothing to read. If no metric source exists, the initiative must add one in PR-1 of §5; if no baseline can be computed (greenfield), `baseline: 0` is acceptable but must be explicit.

**Rules / Guidelines / Boundaries:**

- `measurement.query` field present and non-`TBD` at merge time.
- `measurement.baseline` field present (0 acceptable for greenfield).
- `measurement.window_opens_at` is `TBD` until last PR merges; `w-deploy` updates it on merge.
- If query source doesn't exist, §4 Implementation lists "PR-1 adds emit site for <metric>".

**Enforcement:** rule `workflow/measurement-wired` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check `measurement.query` is non-empty and not `TBD` for any initiative with `status` ∈ {`approved`, `in-progress`, `shipped`}).

**Anti-pattern:**

```yaml
# ❌ Hypothesis declared, measurement deferred forever
measurement:
  metric: time-to-deploy
  query: TBD
  baseline: TBD
status: in-progress # — but the verdict step has nothing to read
```

**Pattern:**

```yaml
# ✅ Concrete query, real baseline, scheduled window
measurement:
  metric: time-to-deploy-p50
  source: events.cli_first_deploy
  query: |
    SELECT percentile(duration_ms, 0.5) FROM cli_first_deploy
    WHERE event_time > $window_opens_at AND fresh_clone = true
  baseline: 1500000 # 25 min in ms
  threshold: 480000 # 8 min in ms
  window_days: 30
  window_opens_at: 2026-05-15
  verdict: pending
```

---

### 7. Adversarial review is recorded inside the document

Phase 3 of `w-initiative` runs a 6-specialist adversarial panel across six dimensions. The full panel review lands in `§1.5 Adversarial Review` of the initiative.md itself — not in a PR comment, not in a separate file. The document carries its own provenance: a reader six months later can see who challenged what and how the bet evolved.

**Rules / Guidelines / Boundaries:**

- §1.5 contains a `Panel:` heading naming the panel type and listing 6 specialists with one-line bios.
- 6 dimensions reviewed minimum (the bet, scope, falsifier, sequencing, risk, cap line).
- Each dimension has 6 specialist comments + a synthesis Conclusion paragraph + an "Action taken" line.
- Conclusions that mutated §2/§3 also get an AD-N row in §6 (per principle 5).

**Enforcement:** rule `workflow/adversarial-review-recorded` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check §1.5 exists and contains a `Panel:` heading with ≥6 specialist rows).

**Anti-pattern:**

```md
<!-- ❌ Panel review sits in a PR comment — disappears once the PR merges -->

(In GitHub PR description: "Panel: Lenny said scope is too small...")

## 1.5 Adversarial Review

TBD
```

**Pattern:**

```md
<!-- ✅ Review preserved inside the artifact -->

## 1.5 Adversarial Review

### Panel: methodology / harness

| Specialist   | Why on this panel                            |
| ------------ | -------------------------------------------- |
| Joel Spolsky | Skill-as-procedure, agent reasoning surfaces |
| Hillel Wayne | Falsifier rigor                              |

| ...

#### D1. The bet itself

| Specialist | Comment |
| ---------- | ------- |
| Joel       | "..."   |

**Conclusion:** ...
**Action taken:** Mutated §2 approach; AD-4 added.
```

---

### 8. Grounding paths are echoed into §1

Phase 0 of `w-initiative` loads a fixed set of files (vision.md, initiatives index, latest in-flight, \_archive, h-rules reference, event-log inventory). Phase 2 echoes that load list into §1 Context — not "I read context" but the actual file paths with one-line summaries. The artifact teaches itself: a reader can audit what the agent grounded against and re-read those sources to verify.

**Rules / Guidelines / Boundaries:**

- §1 ends with a "Sources read" subsection or footer listing every file Phase 0 loaded.
- Each entry is a path plus one-line summary of what was relevant.
- Missing files (e.g., context.md absent) are noted with "(missing)" rather than silently omitted.

**Enforcement:** rule `workflow/grounding-paths-echoed` (mechanism: pending — `.gaia/rules/checks/validate-artifacts.ts` will check §1 contains a `Sources read` heading with ≥3 path entries).

**Anti-pattern:**

```md
<!-- ❌ "I have context" — unauditable -->

## 1. Context / Research

We've reviewed the relevant background and decided to proceed.
```

**Pattern:**

```md
<!-- ✅ Sources visible; reader can verify the grounding -->

## 1. Context / Research

(2-3 paragraphs of context)

**Sources read (Phase 0):**

- `.gaia/vision.md` — principle 9 (template is the manual) directly motivates this bet.
- `.gaia/initiatives/CLAUDE.md` — wave 1 in-progress; this bet sits in wave 2.
- `.gaia/initiatives/0006-projections-materialized/initiative.md` — verdict pending; no conflict.
- `.gaia/initiatives/_archive/2026-04-29-vision-v5-source.md` — wave structure source.
- `.claude/skills/h-rules/reference.md` — constitutional loop confirms 1:1 SRR triad.
- Event-log inventory: 47 metrics queryable; metric `cli_first_deploy.duration_ms` exists.
```

---

## Workflow

```
w-initiative
  Pre-condition: bun run check
  Phase 0: Grounding load → echoed paths
  Phase 1: Falsifier-first interview (Q1-Q7)
  Phase 2: Draft §1, §1.5 placeholder, §2, §3
  Phase 3: 6-specialist adversarial panel → §1.5
  Phase 4: CEO + eng + design + devex review lenses → §2-§5 mutations + §6 rows
  Phase 5: Draft §4, §5, §6 (with M/T/UC class column)
  Phase 6: Wire measurement (concrete query + baseline + window_opens_at)
  Phase 7: Final gate (bun run check) + commit + push
   ↓
w-code (reads §5 PR Breakdown, codes PR by PR)
   ↓
w-review → /ship → w-deploy
   ↓
verdict window opens at window_opens_at; closes at threshold hit OR window_days elapsed
```

The unit of success is a closed cycle, not a shipped change (`h-rules/reference.md` Part 4).

---

## Enforcement mapping

| Principle                      | Mechanism                       | rules.ts entry                         |
| ------------------------------ | ------------------------------- | -------------------------------------- |
| 1. Falsifier-first             | pending — validate-artifacts.ts | `workflow/falsifier-required`          |
| 2. Wave alignment              | pending — validate-artifacts.ts | `workflow/wave-alignment`              |
| 3. Cap table                   | pending — validate-artifacts.ts | `workflow/cap-table-required`          |
| 4. Abandonment ladder          | pending — validate-artifacts.ts | `workflow/abandonment-ladder-required` |
| 5. Decision class column       | pending — validate-artifacts.ts | `workflow/decision-class-column`       |
| 6. Measurement wired           | pending — validate-artifacts.ts | `workflow/measurement-wired`           |
| 7. Adversarial review recorded | pending — validate-artifacts.ts | `workflow/adversarial-review-recorded` |
| 8. Grounding paths echoed      | pending — validate-artifacts.ts | `workflow/grounding-paths-echoed`      |

All eight ship as `pending` in this PR (the existing `validate-artifacts.ts` enforces only `parent`, `hypothesis`, `measurement`). The follow-up PR extends `validate-artifacts.ts` to enforce all eight and flips each entry from `pending` to `kind: 'script'`. Pending → enforced cycle SLO is 14 days per `h-rules/reference.md` §Part 5 §2.

---

## Cross-references

- Sibling skill: `.claude/skills/w-initiative/SKILL.md`
- Constitutional loop: `.claude/skills/h-rules/reference.md` (Part 4 — workflow loop)
- Skill conventions: `.claude/skills/h-skill/reference.md`
- Reference shape: `.claude/skills/h-reference/reference.md` (5-part principle shape)
- Initiatives index: `.gaia/initiatives/CLAUDE.md`
- Vision: `.gaia/vision.md`
- Validation script: `.gaia/rules/checks/validate-artifacts.ts`

---

## Decisions log

| Date       | Decision                                                       | Rationale                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29 | Drop the Product/Growth/Harness domain split                   | Domains were a `decisions/` folder construct; folder retired in commit 56c45b9. Initiatives are wave-aligned (per `_archive/2026-04-29-vision-v5-source.md`) plus standalone. |
| 2026-04-29 | Adopt autoplan's M/T/UC decision classification in §6          | Autoplan's decomposed authority pattern (mechanical silent, taste recommended, user-challenge escalated) is the cleanest model for making the audit trail auditable.          |
| 2026-04-29 | Render the adversarial panel inside §1.5 of initiative.md      | PR comments evaporate when the PR merges; the document must carry its own provenance per Bret Victor's "the document teaches itself" rule.                                    |
| 2026-04-29 | Measurement.query must be concrete at merge                    | A `query: TBD` that survives merge is a broken verdict step. Better to fail at merge than silently ship an unmeasurable bet.                                                  |
| 2026-04-29 | Falsifier-first interviewing (open prose, not multiple-choice) | Multiple-choice questions cap the bet's ambition before the founder's thinking is on paper. Open prose with agent-steelmanned alternatives is Ries + Metz best practice.      |
| 2026-04-29 | Falsifier becomes a required frontmatter field                 | `validate-artifacts.ts` was 3-field; extended to enforce falsifier so the verdict step always has a kill condition.                                                           |
