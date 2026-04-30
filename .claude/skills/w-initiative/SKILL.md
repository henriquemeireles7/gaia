---
name: w-initiative
description: "Strategy session skill. Falsifier-first interview + adversarial panel + composed CEO/eng/design/devex review that produces a wave-aligned initiative.md with measurement wired at ship-time. Mode: fix. Tier: scoping (Phases 0-2 sketch) | full-bet (all phases). Triggers: 'w-initiative', 'strategy session', 'new initiative', 'what should we build next'. After: w-code (reads §5 PR Breakdown). Artifact: .gaia/initiatives/NNNN-<slug>/initiative.md."
---

# w-initiative — Strategy Session

## Quick Reference

- `/w-initiative` — full bet (all phases, ~25-40 min interactive)
- `/w-initiative scoping <idea>` — Phases 0-2 only, produces a one-page sketch
- `/w-initiative full-bet <slug>` — all phases against an existing scoping sketch

## What this does

Turns a founder idea into a falsifiable, wave-aligned strategic bet captured as one initiative.md file. The file is the residue of the work — research, strategy, folder structure, implementation plan, PR breakdown, decision audit trail — all in one place so `w-code` can execute PR by PR without re-deciding.

The skill composes four review lenses inside its own flow (CEO scope-rethink, eng architecture, design, devex). The reviews land **inside** the initiative document, not in PR comments. The audit trail in §6 records every decision with its class (Mechanical / Taste / User Challenge), so future-you can read why each call was made.

Fix-first: the artifact is written and committed by the skill; the founder edits prose inline as questions get answered.

## Pipeline

**w-initiative** → w-code (reads §5 PR Breakdown) → w-review → /ship → w-deploy

## When to run

- Starting a new strategic bet (any wave or off-wave)
- Quarterly roadmap refresh — re-running against the active initiative index
- A maturity bottleneck identified by `a-health` needs an initiative
- A previous initiative's verdict closed and the next bet is unclear

---

## Pre-condition: `bun run check`

```sh
bun run check
```

Lint + typecheck + `validate-artifacts.ts` MUST pass before we start. If a prior initiative.md is broken, fix it first — never write a new one on top of red.

---

## Phase 0: Grounding load (cold-start, ~30s)

Read these files in order. Echo the path of each one into a working list — Phase 2 will paste this list into §1 of the new initiative so reviewers see what was loaded.

1. `.gaia/vision.md` — the 15 principles. The bet must trace to ≥1.
2. `.gaia/initiatives/CLAUDE.md` — the live index (wave alignment + status of every active initiative).
3. The most recent **in-progress** or **draft** initiative in the index — read its `initiative.md` end-to-end. Continuity check: if the new bet duplicates or contradicts an in-flight one, halt and surface in Phase 1.
4. `.gaia/initiatives/_archive/` — research source documents (e.g., `2026-04-29-vision-v5-source.md`). Skim filenames; read any whose slug matches the founder's topic.
5. `.gaia/initiatives/context.md` — the latest data snapshot (auto-generated).
6. `.claude/skills/h-rules/reference.md` — the constitutional loop (so the skill respects the SRR triad it's writing under).
7. **Event-log metric inventory** (for Phase 6 measurement wiring):

   ```sh
   rg -l 'track\(|logger\.info\(' apps/api/server/ | head -20
   ```

   Skim emit sites; you'll need a queryable metric in Phase 6.

If `_archive/` or `context.md` is missing, note it but continue — those are advisory.

---

## Phase 1: Falsifier-first interview

The first questions are NOT multiple-choice. They are open prose questions that force the founder to articulate the bet in their own words. Multiple-choice is reserved for **mechanical** decisions (next NNNN number, status defaults).

Ask in this order. Wait for an answer before the next question. Each answer is captured verbatim into a working buffer for Phase 2.

### Q1 — The 10× version

> What is the **10× version** of this idea — the version that scares you, that would change the trajectory of Gaia if it worked? Don't pick the realistic version yet. Name the ambitious one.

We preserve this answer in §2 even if the founder steps it back. Garry-mode forcing function: the audit trail must show what was declined.

### Q2 — Hypothesis (verb + metric + change)

> In one sentence: **what will be true after this ships that isn't true today?** Use a verb, a metric, and a directional change.

Example shape: "After this ships, time-to-first-deploy on `bun create gaia` drops from 25 min to ≤5 min for a fresh-clone operator."

If the answer doesn't contain a metric: ask once for a metric. If still none, classify as **User Challenge** in the audit trail and continue — Phase 6 will fail to wire measurement and surface this as a blocker.

### Q3 — Falsifier (threshold + window)

> What would prove this hypothesis **wrong**, by what date or numeric threshold? "We'll know when we see it" doesn't count.

Required shape: `<metric> < <threshold> over <window_days> days post-ship`. If missing either threshold or window, halt and ask once more. Hypothesis without falsifier = User Challenge in the audit trail (founder must amend before Phase 6 succeeds).

### Q4 — Wave alignment

Read the wave column in `.gaia/initiatives/CLAUDE.md`. Ask:

> Does this fit a wave (0a, 0b, 1, 2, 3, 4, 5) or is it explicitly off-wave (a standalone bet)?

If wave: confirm it doesn't violate the lexicographic execution order (waves must ship in order; a wave-3 bet cannot precede an unfinished wave-2 bet unless the founder explicitly accepts the inversion in §2 with reasoning).

If off-wave: note in §2 with one-sentence justification. Off-wave bets are fine but must justify.

### Q5 — Cap table (ships v1.0 / capped)

> What are we explicitly NOT building in v1.0? Three to five things, each one a real decision someone could push back on.

This becomes the §2 Cap table. Larson-mode: the cap matters more than the scope.

### Q6 — Abandonment ladder

> If the falsifier fires (verdict = invalidated), what's the next step? Kill, pivot to a named alternative, or scope-down to a named smaller bet?

This is §2's Abandonment ladder. Ries-mode: a bet without a kill condition is theatre.

### Q7 — Continuity check

If Phase 0 found an in-progress initiative whose verdict is still pending:

> Initiative NNNN-<slug> is in-progress (verdict opens <date>). This new bet [duplicates / extends / supersedes / is independent of] it — which?

If "duplicates" or "supersedes": halt the skill. Ask the founder to either close NNNN-<slug> or fold this into it. Don't ship two competing bets in the same wave.

---

## Phase 2: Draft §1-3 with steelmanned alternatives

Determine the next initiative number:

```sh
ls .gaia/initiatives/ | grep -E '^[0-9]{4}' | sort -n | tail -1
```

Increment by 1, 4-digit zero-padded. Slug from Q2 (kebab-case, ≤40 chars). Create `.gaia/initiatives/NNNN-<slug>/initiative.md` with frontmatter:

```yaml
---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: <Q2 verbatim>
falsifier: <Q3 verbatim>
measurement:
  metric: <metric name from Q2>
  source: <event log table or query target — fill in Phase 6>
  query: TBD
  baseline: <current value or "unknown — Phase 6 measures">
  threshold: <Q3 threshold>
  window_days: <Q3 window>
  window_opens_at: TBD
  verdict: pending
status: draft
wave: <Q4 answer or "off-wave">
---
```

Draft §1, §2, §3:

### §1 — Context / Research

Start with the **grounding load list** from Phase 0 (paste the file paths the agent read, with one-line summaries each). Then 2–3 paragraphs: what exists, what's missing, why now, named demand evidence, prior session learnings. End with a "Sources read" footer.

### §1.5 — Adversarial Review

Leave a placeholder. Phases 3 + 4 fill this in.

### §2 — Strategy

- **Problem** (one paragraph)
- **Hypothesis** (Q2 verbatim)
- **Falsifier** (Q3 verbatim)
- **Approaches considered** — write at least three: (a) the founder's chosen approach, (b) the 10× version from Q1 even if declined, (c) one steelmanned alternative the agent generates by reading the closest CLAUDE.md and proposing a more conservative path. For each: one paragraph, one tradeoff line. Mark which one ships.
- **Cap table** (table from Q5):
  | Surface | Ships v1.0 | Capped |
  | --- | --- | --- |
- **Abandonment ladder** (table from Q6):
  | Trigger | Next step |
  | --- | --- |

### §3 — Folder Structure

Generate the ASCII tree of files this initiative adds or modifies. Mark new paths with `# NEW`, extended with `# EXTENDS`, deletes with `# DELETE`. Copy-paste-ready: `w-code` should be able to scaffold from this without re-deciding paths.

---

> **`/w-initiative scoping`** stops here. The skill writes a stub initiative.md (§1, §2, §3 only; §4-6 left as TODO headings) and exits. Use this when the founder isn't ready to commit but wants the bet captured.

---

## Phase 3: Adversarial panel (6 specialists)

Pick a panel matched to the initiative type. Examples:

| Initiative type          | Panel                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Product feature          | Lenny Rachitsky · Andrew Chen · Stewart Butterfield · Ryan Singer · Sean Ellis · Bret Victor      |
| Infrastructure / runtime | Adam Wiggins · Charity Majors · Will Larson · Camille Fournier · Tanya Reilly · Jez Humble        |
| Methodology / harness    | Joel Spolsky · Hillel Wayne · Sandi Metz · Will Larson · Bret Victor · Camille Fournier           |
| Growth / distribution    | Sean Ellis · Andrew Chen · Casey Winters · Brian Balfour · Rahul Vohra · Itamar Gilad             |
| AI feature               | Hamel Husain · Eugene Yan · Simon Willison · Chip Huyen · Sarah Constantin · Anthropic safety eng |
| Any new domain           | Pick 6 by recognized expertise; state why each was picked in §1.5                                 |

For each of these dimensions, one comment per specialist + a synthesis conclusion:

1. **The bet itself** — is the hypothesis the right hypothesis?
2. **Scope ambition** — should the cap table be wider or tighter?
3. **Falsifier strength** — would they accept Q3 as a falsifier?
4. **Sequencing** — is now the right time vs. blocked by another bet?
5. **Risk** — biggest blast radius if it fails?
6. **Cap line** — what's explicitly cut that they'd push back on?

Append the panel review to `§1.5 Adversarial Review` of the initiative.md inline (not a PR comment), formatted as:

```md
### Panel: <initiative type>

| Specialist | Why on this panel |
| ---------- | ----------------- |
| Name       | one-line          |

#### D1. <dimension>

| Specialist | Comment  |
| ---------- | -------- |
| Name       | one-line |

**Conclusion:** <one paragraph synthesis>
**Action taken:** <how this changed §2 / §3, or "no change — panel reinforced existing decision">
```

Repeat per dimension. Each conclusion that mutates §2 or §3 also writes an AD-N row to §6 (see Phase 5).

---

## Phase 4: Compose review lenses

Run four focused review passes. Each is a few minutes of agent reasoning, not a full sibling-skill invocation. Each appends a row to §6 and may mutate §2/§3/§5.

### 4a. CEO scope-rethink

Re-read §2. Ask: is this the smallest valuable bet that proves the hypothesis, OR is the founder accidentally shipping the realistic version of a bigger idea? If the latter, propose the bigger version as a §2 "Approach considered (CEO mode)" row even if it gets declined. Garry-mode preserves the 10× option in writing.

### 4b. Engineering / architecture

Re-read §3 (Folder Structure). Ask:

- Does the tree respect the three-layer dependency graph (vision principle 3)?
- Are there cross-feature imports implied? (forbidden — adapters or `@gaia/*` instead)
- What schema changes does this imply? Surface them in §4 Implementation.
- What's the test surface? Boundaries get integration tests; middle gets mutation tests.

Append findings as new §4 rows + audit-trail entries.

### 4c. Design (skip if no UI surface)

If §3 touches `apps/web/`: read `packages/ui/CLAUDE.md` for token constraints. Probe state coverage (loading, empty, error, offline), accessibility, hierarchy. One-paragraph review.

If no UI: write "No UI surface — skipped" in §1.5.

### 4d. DevEx (skip if no external surface)

If the initiative ships a CLI / API / SDK / docs / template (anything an external operator will encounter): probe time-to-hello-world, error message quality, getting-started friction. One-paragraph review.

If purely internal: write "No external dev surface — skipped" in §1.5.

---

## Phase 5: Draft §4, §5, §6

### §4 — Implementation

- **Order of operations** — numbered list, sequenced so nothing breaks mid-refactor
- **Risks** — priority-ordered table with mitigations: `Priority | Risk | Mitigation | Owner`
- **Out-of-scope** — explicit bullet list (everything cut from Q5 cap table + anything Phase 4 surfaced)
- **Schema changes** — if any, list table-by-table; mark NEW / EXTEND / DROP

### §5 — PR Breakdown

Table:

| PR  | Title | Files | Status |
| --- | ----- | ----- | ------ |

`w-code` reads this table and codes one PR per row. Files column lists the new/extended paths from §3. Status starts as `not-started`. Keep PRs ≤500 lines each; split if you can't.

### §6 — Decision Audit Trail

Every decision a Phase made traces to a row. Three classes:

| Class                   | What it means              | When to use                                                    |
| ----------------------- | -------------------------- | -------------------------------------------------------------- |
| **M** (Mechanical)      | Deterministic, no judgment | Next NNNN number, status=draft, frontmatter scaffold           |
| **T** (Taste)           | Subjective but defensible  | Approach choice, cap line, panel-driven mutation               |
| **UC** (User Challenge) | Requires human authority   | Hypothesis without falsifier, off-wave bet, in-flight conflict |

Table shape:

| ID   | Decision                                                                | Class | Source                          |
| ---- | ----------------------------------------------------------------------- | ----- | ------------------------------- |
| AD-1 | Initiative number 0012                                                  | M     | Phase 2 mechanical              |
| AD-2 | Approach: skill rewrite under fractal CLAUDE.md (vs. multi-skill split) | T     | Founder Q1, panel D1 conclusion |
| AD-3 | Off-wave (standalone) — methodology bet                                 | UC    | Founder Q4, accepted off-wave   |

Every panel/review conclusion that changed §2/§3/§4/§5 gets an AD-N row. Append-only. Future edits to the initiative add new rows; never rewrite past ones.

---

## Phase 6: Wire measurement

Frontmatter `measurement` started as a stub in Phase 2. Now make it real.

1. **Pick the metric source.** From Phase 0's event-log inventory, find the existing metric that answers Q2. If none exists, you must add one — flag in §4 Implementation as a required emit site (PR 1 typically).
2. **Write the query.** Concrete HogQL / SQL / `bun scripts/<verdict>.ts` filter that returns the metric value. Paste into frontmatter `measurement.query`.
3. **Set `window_opens_at`.** Two options:
   - If the initiative ships in one PR: `window_opens_at: <ship-date placeholder>` — `w-deploy` updates this on merge.
   - If multi-PR: leave as `TBD`, set on the last PR's merge.
4. **Set `baseline`.** Run the query against current data; record the value. If the table doesn't exist yet (greenfield bet), `baseline: 0` is acceptable.
5. **Schedule the verdict check.** If `scripts/check-verdict.ts` exists, register the initiative folder. Otherwise, add a note to §4: "PR-N adds verdict-check entry."

If any step fails (no metric source, query unwritable, baseline incomputable): the hypothesis is unfalsifiable. Reclassify Q2 as **UC** in §6 and halt the skill — the founder must rewrite the hypothesis or accept that this initiative ships without measurement (which kills the verdict step of the workflow loop).

---

## Phase 7: Final gate (`bun run check`)

```sh
bun run check
```

Same script as Pre-condition. Specifically validates:

- `validate-artifacts.ts` accepts the new initiative.md frontmatter (parent, hypothesis, measurement, plus extended fields if Phase 4 changes are merged)
- `oxfmt` formats the markdown
- `tsc` passes (no .ts touched, but the gate is the same)

If red: revert the file write, surface the failing field. Do not commit a partial initiative.

Then commit + push:

```sh
git add .gaia/initiatives/NNNN-<slug>/
git commit -m "feat(NNNN): <slug> — initiative draft"
git push -u origin HEAD
```

The PR description is the initiative.md §1 Context paragraph + §2 Hypothesis + §2 Cap table.

---

## Output

Mode: **fix** — the skill writes one new file (`.gaia/initiatives/NNNN-<slug>/initiative.md`), commits, and pushes. The founder reviews the PR, requests amendments, then merges.

Report at end of skill:

```
=== W-INITIATIVE: 0012-<slug> ===

Wave: <0a..5 | off-wave>
Hypothesis: <Q2>
Falsifier: <Q3>
Measurement window: <window_days> days, opens at <date or TBD>

Decisions logged: <N> total
  Mechanical: <count>
  Taste: <count>
  User Challenge: <count>

Adversarial panel: <panel type>, 6 specialists, 6 dimensions
Review lenses run: CEO + eng + design + devex (skipped: <list>)
PR breakdown: <N> PRs queued

Final gate: green
Pushed: origin/<branch>
```

---

## Rules

- ALWAYS run `bun run check` as the pre-condition AND the final gate (sandwich)
- ALWAYS read `.gaia/vision.md`, `.gaia/initiatives/CLAUDE.md`, the latest in-flight initiative, and `h-rules/reference.md` in Phase 0 before asking any question
- ALWAYS echo loaded paths into §1 Context — the document carries its own provenance
- ALWAYS render the adversarial panel review INSIDE §1.5 of initiative.md, not in a PR comment
- ALWAYS classify every audit-trail row as M / T / UC
- NEVER write code — this is strategy only; `w-code` is the next step
- NEVER skip the falsifier step — a hypothesis without `<threshold> + <window_days>` is not a bet, it's a wish
- NEVER ship an initiative with `measurement.query: TBD` — Phase 6 must produce a real query or the hypothesis is reclassified UC
- NEVER duplicate an in-flight initiative — Phase 1 Q7 halts if continuity check finds conflict
- One initiative per founder session — don't batch two bets into one document

## Failure modes

- **Q2/Q3 cannot produce a real falsifier** — record the hypothesis as UC in §6 and halt. Founder must amend offline or accept an unmeasurable bet (rare; usually a smell).
- **Continuity check finds an in-flight conflict** (Q7) — halt; surface the conflicting initiative path; ask the founder to close it, fold into it, or rename the new bet.
- **Phase 4 review surfaces a blocking architecture issue** (e.g., this bet violates vision principle N) — write the finding into §1.5, set `status: draft`, do not push. The founder amends or kills.
- **`validate-artifacts.ts` red on the new file** — revert the write, report which field failed validation. Never commit a partial initiative.
- **Phase 6 cannot wire measurement** — append the failure to §4 Implementation as PR-1 required work; reclassify hypothesis as UC; mark `measurement.query: BLOCKED — see §4`.
