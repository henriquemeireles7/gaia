---
name: d-initiative
description: 'Strategy session skill. Diarizes vision + index + sibling reference + archive, asks 7 forcing questions via AskUserQuestion (each option tagged with "(recommended)"), then writes a 5-section initiative.md per .claude/skills/d-initiative/reference.md. Modeled on gstack /plan-ceo-review 4-mode framing. Triggers: "d-initiative", "strategy session", "new initiative", "refine initiative", "rewrite initiative".'
---

# d-initiative — Strategy Session

## Quick Reference

- `/d-initiative` — author a NEW initiative at `.gaia/initiatives/NNNN-<slug>/initiative.md`
- `/d-initiative refine <NNNN>` — expand an existing stub initiative in place
- `/d-initiative rewrite <NNNN>` — adversarial-rewrite a shipped initiative against current methodology

## What this does

Diarization skill — reads `.gaia/vision.md`, the initiatives index, the sibling `reference.md`, and any `_archive/` research; frames the founder a 4-5-bullet context summary; picks one of four scope-framing modes (per gstack `/plan-ceo-review`: SCOPE EXPANSION / SELECTIVE EXPANSION / HOLD SCOPE / SCOPE REDUCTION); asks **seven forcing questions** via `AskUserQuestion`, each with 2-4 concrete options where one is suffixed `(recommended)` so an autonomous agent has a default; writes a 5-section `initiative.md` with locked frontmatter (per `reference.md`); updates the `.gaia/initiatives/CLAUDE.md` index row.

Procedure-only. No code mutations. No auto-commit — the founder reviews the diff before any push.

## When to run

- Starting a new strategic bet (writes the next `NNNN-<slug>/initiative.md`)
- Expanding a stub initiative whose `status: draft` says "stub"
- Rewriting an initiative after methodology drift (e.g. after a meta-skill change in 0001)
- Quarterly portfolio refresh: walk every `status: in-progress` row and decide ship / kill / reshape

---

## Phase 0: Pre-condition (`bun run check`)

```sh
bun run check
```

Must pass. If failing, stop — fix that first.

Then read, in this order:

1. `.gaia/vision.md` — locked source of truth (Gaia v7)
2. `.gaia/initiatives/CLAUDE.md` — index of every initiative with one-liner + status
3. `.claude/skills/d-initiative/reference.md` — frontmatter spec + 5-section shape
4. `.claude/skills/d-rules/reference.md` — the constitutional loop (so questions tie to references/rules/skills)
5. The target initiative file (refine/rewrite mode) OR the latest sibling for shape (new mode)
6. `.gaia/initiatives/_archive/<slug>-source.md` if a `research_input:` frontmatter pointer exists
7. `git log --oneline -20` for recent codebase signal

Cold-start guarantee: every subsequent phase assumes these are loaded.

---

## Phase 1: Mode selection

Detect mode from the invocation argument:

| Argument         | Mode    | Behavior                                                                                                                                                      |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)           | NEW     | Compute `NNNN` = highest-numbered folder + 1; ask AskUserQuestion for the slug; create folder.                                                                |
| `refine <NNNN>`  | REFINE  | Load `NNNN-*/initiative.md`; preserve frontmatter (esp. `parent`, `research_input`); rewrite body sections 1-5.                                               |
| `rewrite <NNNN>` | REWRITE | Same as REFINE plus: archive prior body to `_archive/<NNNN>-rewrite-<YYYY-MM-DD>.md`; treat existing audit-trail as read-only history; append AD-rewrite row. |

Refuse if:

- NEW mode and a folder for the same slug already exists.
- REFINE/REWRITE mode and the target file is missing or has no frontmatter.

---

## Phase 2: Frame context (show the user)

Output a 4-5 bullet brief BEFORE any question. Bullets must cover:

- What exists in the codebase (apps/packages skeleton, shipped features per recent commits)
- What `vision.md` says about this initiative's surface
- What the prior initiative shipped and any carry-overs (mention `_archive/` research inputs)
- What `reference.md` says about the required shape
- (REFINE/REWRITE only) what the existing initiative captured vs what's stale

End the brief with one sentence asking the founder to correct anything wrong before questions land. Wait for response (free-form text, not a tool call).

---

## Phase 3: Pick a plan-ceo-review framing mode

Inspired by gstack `/plan-ceo-review`. One `AskUserQuestion` call:

```
Question: "Which framing is this session?"
Options:
  - "SCOPE EXPANSION — dream big, find the 10-star product, expand if it's a better product (recommended for NEW initiatives)"
  - "SELECTIVE EXPANSION — hold scope, cherry-pick the few expansions that pay for themselves"
  - "HOLD SCOPE — maximum rigor, no scope changes (recommended for REFINE)"
  - "SCOPE REDUCTION — strip to essentials, defer everything else"
```

The mode steers Phase 4's recommended-tag selection:

- SCOPE EXPANSION → recommend the maximalist option per question
- SELECTIVE EXPANSION → recommend a per-question middle option
- HOLD SCOPE → recommend whichever option preserves the existing scope
- SCOPE REDUCTION → recommend the minimalist option

---

## Phase 4: Forcing questions (one AskUserQuestion call per question)

Cover **all seven topics**, in this order. Each call MUST:

- Use exactly one `AskUserQuestion` invocation per topic (no batching — one decision at a time so the founder can think on each).
- Provide **3 concrete options** (4 max). No open-ended "describe your thinking" — the founder can override via the auto-supplied "Other" slot.
- Suffix exactly one option with " (recommended)" — chosen per the Phase 3 mode.
- Phrase options as **load-bearing differences** (not synonyms). If two options compress to the same outcome, redesign.

Topic checklist:

1. **Goal / wedge** — what's the single load-bearing outcome that defines success?
2. **Scope cap** — how much surface ships v1.0?
3. **Agent/DX surface** — how machine-legible is the artifact (CLI flags, JSON streams, typed protocols)?
4. **Docs surface** — what docs ship?
5. **Risk / magical moment** — what's the WOW for the first session, and what's the biggest risk if it fails?
6. **Launch gate** — how do we know we're done? (founder-only / alpha / soft-launch)
7. **Cap discipline / cut list** — what is EXPLICITLY NOT in this initiative? (deferred to which future NNNN?)

Capture each answer verbatim for the §5 audit trail. Write the answers to a scratch file `.context/initiative-NNNN-answers.md` so a session resume can recover.

---

## Phase 5: Write the `initiative.md`

Use the canonical shape from `reference.md`. **Locked frontmatter** (the validator rejects deviations):

```yaml
---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: <one sentence — falsifiable, names the load-bearing claim>
falsifier: <what would prove this wrong, with date or numeric threshold>
measurement: { metric, source, baseline, threshold, window_days, verdict }
status: draft | approved | in-progress | shipped | killed
research_input: <relative path to _archive doc, or omit>
---
```

Then the **five sections** in order:

1. **Context / Research** — codebase state, prior sessions, archived research, status quo, named adjacent products.
2. **Strategy** — problem, hypothesis (echoes frontmatter), narrowest wedge, constraints, premises (each with falsifier), approaches considered, **recommended approach**, **cap table**, abandonment ladder.
3. **Implementation** — order of operations (so nothing breaks mid-build), risks priority-ordered with mitigations, dependencies, out-of-scope explicit list.
4. **PR Breakdown** — table with columns: `PR | Title | Files (high-level) | Status`. `d-code` reads this and codes PR by PR.
5. **Decision Audit Trail** — table with columns: `ID | Decision | Source`. Every founder Q&A answer becomes an AD-N or F-N row. Append-only on REFINE/REWRITE.

In REFINE/REWRITE mode: preserve the prior trail rows; append new rows below them.

---

## Phase 6: Update the index row

Edit `.gaia/initiatives/CLAUDE.md`:

- Update the row for this `NNNN` with the new one-liner and the new status.
- Status transitions: NEW → `approved`; REFINE/REWRITE → preserve current status unless founder says otherwise.

Do NOT touch other rows.

---

## Phase 7: Suggest next steps (NO auto-commit)

Print to stdout:

```
Initiative written: .gaia/initiatives/NNNN-<slug>/initiative.md
Index updated: .gaia/initiatives/CLAUDE.md

Next steps (manual — review the diff first):
  1. Read the diff: git diff .gaia/initiatives/
  2. Run gstack /autoplan to adversarial-review the file (writes AD-N rows into §5)
  3. When satisfied, /d-code <NNNN> reads §4 and codes PR by PR
  4. Commit when ready: git add .gaia/initiatives/ && git commit
```

NEVER auto-commit. The founder reviews initiative changes before they hit git.

---

## Phase 8: Final gate (re-run `bun run check`)

```sh
bun run check
```

Sandwich pattern: identical gate to Phase 0. Specifically, `validate-artifacts.ts` must accept the new frontmatter. If it rejects, fix the YAML and re-run.

---

## Output

Mode: **report** — the skill writes one or two files (`initiative.md` + the index edit), validates frontmatter, and exits. No code mutations. No commit. Posted to stdout (and the PR body when committed later):

```
=== D-INITIATIVE: .gaia/initiatives/NNNN-<slug>/initiative.md ===

Mode: NEW | REFINE | REWRITE
Framing: SCOPE EXPANSION | SELECTIVE EXPANSION | HOLD SCOPE | SCOPE REDUCTION
Questions answered: 7/7
Recommended-tagged options taken: <count> (e.g. "5/7 — founder overrode Q3, Q6")
Frontmatter validation: pass
Index row updated: yes
Check pipeline: green
```

---

## Rules

- ALWAYS use `AskUserQuestion` (Conductor MCP) for the seven forcing questions — one call per topic, never batched.
- ALWAYS suffix exactly one option per question with ` (recommended)`. The recommended choice MUST follow the Phase 3 framing mode.
- ALWAYS read `.gaia/vision.md`, the index, and the sibling `reference.md` in Phase 0. Cold-start is a hard requirement.
- ALWAYS write the locked frontmatter (`parent`, `hypothesis`, `falsifier`, `measurement`, `status`) — the `validate-artifacts.ts` script enforces it.
- ALWAYS produce all five sections (Context, Strategy, Implementation, PR Breakdown, Audit Trail). A missing section is a bug.
- ALWAYS preserve audit-trail rows on REFINE/REWRITE — append, don't overwrite.
- NEVER auto-commit or push. The founder reviews `git diff` before commit.
- NEVER write code mutations. This skill is strategy-only; `d-code` is the implementation surface.
- NEVER batch questions. One `AskUserQuestion` per topic so the founder thinks on each independently.
- NEVER edit `.gaia/vision.md` from this skill (vision changes are explicit human edits per `.gaia/CLAUDE.md`).
