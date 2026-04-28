# Workflow

> Last verified: 2026-04-19
> Bucket: Harness (1 of 3 — Workflow, Machinery, Loops)

The operating rhythm. How work moves from idea to deployed product, daily, without the user having to hold the system in their head.

## Northstar

> Every day, an idea becomes a shipped, quality-gated, value-delivering change — in minutes of user attention.

Every principle in this file derives from that sentence. If a principle would still be true with "daily" deleted, it's a Machinery principle, not a Workflow one.

## The three loops

Work flows through three loops at three cadences:

| Loop | Asks | Cadence | Produces |
|------|------|---------|----------|
| Strategy | WHY / WHAT | Weekly + on signal | `roadmap.md` (informed by `vision.md` + `context.md`) |
| Tactical | HOW | Daily | `initiative.md` → `projects/*.md` |
| Execution | DO | Continuous | Merged PR + measurement window |

Loops run in parallel, not in sequence. The default daily session touches all three: a strategic decision is confirmed, a tactical plan is produced, and one or more execution slices are merged. The user holds the steering wheel; the agent holds the keyboard.

## File hierarchy

```
vision.md                    monthly+, principles + north star + locked taxonomy
context.md                   per-strategy-run, dated, real-time business snapshot
roadmap.md                   weekly, portfolio of bets for the period
initiatives/
  YYYY-MM-DD-name/
    initiative.md            the bet, expanded — premises + phases + measurement
    projects/
      01-name.md             a parallel-executable slice
      02-name.md
      03-name.md
```

Artifacts nest physically the way they nest logically. A project's full context is its initiative's context; an initiative's full context is the active roadmap.

`context.md` is produced by the `roadmap` skill as its first step (gather metrics, analytics, logs, user feedback, competitor signals) and persisted dated. It is an *input* to roadmap creation, not a separate loop. Each `roadmap.md` carries a reference to the `context.md` it was generated from, so the strategic decision is always traceable to the data behind it.

---

## The 12 Workflow principles

Grouped into four clusters: cadence, loop structure, handoffs, outcomes. Each principle states its enforcement mechanism.

### Cluster A — Cadence and rhythm

**W1. The unit of success is a closed cycle, not a shipped change.**

A cycle closes when an initiative's measurement window produces a verdict — *moved the target*, *didn't move*, *inconclusive*, or *invalidated the hypothesis*. Daily shipping is the target rhythm; the rhythm is sustained only by cycles that actually close. An initiative that ships and is never measured is an orphan, not a cycle. Shipping volume without measurement is the build trap with daily-cadence theater on top.

*Enforcement:* every initiative declares a measurement window (duration + metric + threshold) at creation; a scheduled job surfaces unclosed cycles past their window; ship events open a countdown, not a finish line.

**W2. Cadences are minimums; any loop can be triggered by a signal.**

Strategy runs at least weekly but can be triggered immediately by a context invalidation (a metric crashed, a competitor shipped, an assumption broke) or a closed-cycle verdict that contradicts the current roadmap. Tactical runs at least daily but can be triggered when a project finishes and frees worker capacity. Execution runs continuously. Scheduled cadences are floors, not ceilings, and the triggers are named and finite — not vibes.

*Enforcement:* signal detectors (a `d-strategy-trigger`-style skill) watch for the trigger conditions and open PRs proposing loop runs; the user approves or defers.

**W3. The system supports a "check and leave" daily user, and scales up when the user wants to drive.**

The default daily session is a briefing, a few decisions, and close. It opens with the outcome briefing (what closed, what moved, what needs attention), offers the next decisions (which initiative to kick off, which project to merge), and is complete. A user who wants to work all day sees more, not different — the same briefing, the same decisions, plus deeper invocations one skill away.

*Enforcement:* the session-open skill produces a single briefing artifact; the first three actions are surfaced as suggestions; deeper work is one skill invocation away. No dashboard or queue is the default landing.

### Cluster B — Loop structure

**W4. Three loops, bidirectional flow.**

Strategy (WHY / WHAT), Tactical (HOW), Execution (DO) run at their own cadences and produce typed artifacts forward. They also produce *signals* backward — context invalidations, coherence failures, realizability failures — that can trigger upstream revision. A loop that only flows forward turns into a waterfall; a loop that only flows backward turns into paralysis. Both flows are first-class.

*Enforcement:* every loop's primary skill ships with both a forward-produce function and a backward-signal function; backward signals land in a dedicated log that the strategy loop consumes on its next run.

**W5. Every artifact links up and down.**

A project states its parent initiative. An initiative states its parent roadmap commitment. A commitment states its parent vision principle or outcome. A PR states its parent project. Links are machine-checked; orphaned artifacts fail validation. This is what prevents the system from drifting into "where did this come from?" the moment scale picks up.

*Enforcement:* a frontmatter schema on every artifact carrying a `parent:` field; a validator that runs at each phase transition; CI rejects orphaned artifacts before merge.

**W6. The roadmap is a portfolio, not a buffet.**

The roadmap contains a small, opinionated set of bets for the period — each with a hypothesis, a stated commitment, and a link to the north star. "Parked" bets are explicitly parked with a re-pitch trigger. "Rejected" bets are explicitly rejected with a rationale. The roadmap is itself a decision, not a menu of decisions deferred to the moment of selection. The user confirms or overrides; they don't construct the sequence from scratch each week.

*Enforcement:* the `roadmap` skill produces a fixed-shape document with three named sections — *Committed for period*, *Parked with re-pitch trigger*, *Rejected with rationale* — and a cap on the *Committed* count (default 5–7 for a solo operator).

**W7. The strategic taxonomy is locked in vision.**

Whether the roadmap is structured by funnel stage (AARRR), customer job (JTBD outcomes), or commitment narrative (NCT-style) is a locked decision in `vision.md`. Changing the taxonomy is rare and deliberate — it requires a vision update. The tactical and execution layers inherit the taxonomy and don't re-debate it. Mixing taxonomies loses both their benefits.

The locked taxonomy for Gaia is **NCT-hybrid**: Narrative + Commitments at the strategic level, with initiatives functioning as the Tasks layer under each Commitment. Reason: AARRR is funnel-shaped and assumes a public product with traffic at each stage (Gaia is pre-launch); JTBD is outcome-rich but heavyweight for a solo operator at daily cadence; NCT is structured enough to gate initiatives, loose enough to admit strategic uncertainty, and naturally maps onto the file hierarchy (Narrative → vision.md, Commitments → roadmap.md sections, Tasks → initiatives).

*Enforcement:* the `roadmap` skill reads the taxonomy declaration from `vision.md` and fails if the value is anything other than `nct-hybrid`; a `vision-update` skill is the only path to change it; the change is logged as a major decision in `docs/adr/`.

### Cluster C — Handoffs and gates

**W8. Each phase transition is an artifact validation, not a ceremony.**

Strategy → Tactical requires a schema-valid `roadmap.md` with at least one *Committed* initiative. Tactical → Execution requires a schema-valid `initiative.md` with at least one committed project. Execution → Closed requires a merged PR and a recorded measurement-window start. No phase progresses without the prior artifact validating. No phase requires a meeting, a status call, or a vibes-based green light.

*Enforcement:* phase-transition skills run pre-flight validation (the `initiative` skill reads `roadmap.md` and fails if invalid; the `project` skill reads `initiative.md` and fails if invalid); validation is structural, not subjective.

**W9. Principles review runs before correctness review.**

Gaia's own review skill runs before gstack's review and QA. Principles review is a fast pass/fail gate against `.gaia/rules.ts` and the stated principles in `docs/reference/`. Technically-correct code that violates the principles is caught before expensive correctness review runs on it. The chain is: code → principles review → gstack review → gstack QA → gstack ship. A failure at any gate kicks back to coding.

*Enforcement:* the execution-loop skill chain is structurally ordered; principles review is scoped to fast pass/fail (does this diff violate any stated principle?), not deep analysis; gstack review runs only on principles-passing diffs.

**W10. Projects are parallel by declared concern, not assumed concern.**

Every project declares the files, modules, or concerns it intends to touch. A conflict-check runs at project creation (would this collide with an active project?) and at merge time (did the actual diff stay within declared scope?). Folder-disjointness is a useful heuristic but not a guarantee — two projects in different folders can still collide via a shared dependency, and two projects in the same folder can be parallel if they touch different files. Parallelism is enabled by structural declaration.

*Enforcement:* the `project` skill requires a `touches:` field in frontmatter; Conductor reads the field before spawning a worktree and refuses to spawn projects with overlapping scopes; a pre-merge hook verifies the actual diff stayed within declared scope.

### Cluster D — Outcomes and honesty

**W11. Every initiative states its hypothesized effect on the north star and its measurement plan.**

No initiative progresses to projects without a hypothesis: *we believe this will move [metric] by [amount] within [window], measured by [method].* Hypotheses can be wrong — that's the point — but they cannot be absent. The field has 40 years of consensus that outcomes are the primary value driver; this principle makes that structural at the artifact level.

To support daily cadence without becoming aspirational ("we'll measure later") or blocking ("we can't ship until we measure"), measurement runs as **measurement debt**: initiatives ship with a measurement plan and the system tracks pending verdicts in parallel. The strategy loop's next run consumes any verdicts that landed in the interim. The user sees pending-verdict count in the daily briefing.

*Enforcement:* the `initiative` skill requires `hypothesis:` and `measurement:` fields in frontmatter; a validator rejects initiatives missing either; post-ship, the measurement window auto-opens and feeds verdicts back to strategy as inbound signals (W4).

**W12. Daily sessions start with outcomes, then outputs.**

The first screen of any daily user session is the outcome briefing — which initiatives are in their measurement window, which closed and with what verdict, which metrics moved, which didn't. Output status (PRs, project queues, build status) comes after. This structural ordering at the UX layer is what prevents the daily cadence from accidentally optimizing for output volume instead of outcome movement. The user is curator-of-outcomes, not reviewer-of-outputs.

*Enforcement:* the daily-session-open skill produces a briefing artifact with outcomes first, outputs second, decisions surfaced at the end; outcome data sources (analytics, error logs, user feedback) are queried before output queues.

---

## Conductor's role

Conductor.build is the Workflow's runtime, not a peer concept. It implements the principles above:

- **W3** — Conductor opens new workspaces fast enough that "check and leave" works
- **W8** — Conductor enforces phase-transition validation before spawning execution sessions
- **W10** — Conductor reads `touches:` declarations and assigns worktrees without scope collisions
- **W2** — Conductor watches signal detectors and surfaces trigger candidates to the user

Conductor's worktree-assignment algorithm:

1. Read `initiatives/*/projects/*.md`; collect projects where frontmatter `status: ready`.
2. For each ready project, parse `touches:` (see Locked contracts).
3. Build a conflict graph: edge between two projects if their `files` globs or `modules` lists overlap.
4. Greedy maximum-independent-set selection: spawn one worktree per non-conflicting project, up to the configured concurrency cap.
5. Conflicting projects remain `status: ready` and are surfaced at session-start (W3) as "blocked by active project X."
6. On worktree merge, a pre-merge hook compares the actual diff to the declared `touches:`. Out-of-scope file changes block the merge; the user either expands the declaration (with conflict re-check) or shrinks the diff.
7. On merge, the project transitions to `status: shipped` and the parent initiative's measurement window auto-opens (W11).

## What's deferred to other buckets

Workflow does not specify:

- **Skill internal anatomy** (SKILL.md + walkthrough + research files) — Machinery
- **Hook timing and registry** — Machinery
- **Memory/docs unified tree** — Machinery
- **Self-learning, self-healing, self-optimization** — Loops
- **Scheduled cron jobs and their composition** — Loops
- **`.gaia/rules.ts` schema** — Machinery
- **Infra and deploy targets** — Architecture (already locked in v4)

## Locked contracts

The following schemas, grammars, and compositions are locked. Skills that produce or consume these artifacts validate against the contracts below; non-conforming artifacts fail validation and do not progress through phase transitions.

### `vision.md` frontmatter

```yaml
---
taxonomy: nct-hybrid          # locked value; only vision-update skill may change
north_star:
  metric: "..."               # the single metric the system optimizes
  current: 0.0                # latest measured value
  target: 0.0                 # what we are moving toward
  unit: "..."                 # e.g. "minutes", "ratio", "count"
last_reviewed: YYYY-MM-DD
---
```

### `context.md` frontmatter

```yaml
---
generated_at: YYYY-MM-DD
generated_by: roadmap         # always the roadmap skill (W7)
period_days: 7                # window the snapshot covers
sources:
  - posthog                   # which data sources were queried
  - axiom
  - sentry
  - user_feedback
---
```

The body is structured prose: metrics movements, user-feedback patterns, error-rate changes, competitor signals, open hypotheses pending verdict. No fixed body schema — the roadmap skill consumes prose, not fields.

### `roadmap.md` frontmatter

```yaml
---
parent: vision.md             # W5
context_ref: context.md       # which context.md this roadmap was generated from
period_start: YYYY-MM-DD
period_days: 7
taxonomy: nct-hybrid          # inherited from vision; validated to match
---
```

Body sections (W6):

```markdown
## Narrative
[The strategic story for this period. What's true now. What we're betting on and why.]

## Commitments
### C1: [outcome-shaped commitment, e.g. "Reduce checkout drop-off by 5pp"]
- Linked north-star contribution: [statement]

### C2: [...]

## Committed initiatives (cap: 5–7 for solo operator)
- [initiative slug] → [parent commitment ID]
- [initiative slug] → [parent commitment ID]

## Parked
- [initiative slug] — re-pitch trigger: [condition]

## Rejected
- [initiative slug] — rationale: [why this isn't worth doing]
```

### `initiative.md` frontmatter (W11 enforcement)

```yaml
---
parent: roadmap.md            # W5
parent_commitment: C1         # the specific commitment from roadmap
slug: YYYY-MM-DD-name
status: draft                 # draft | autoplanned | ready | active | shipped | closed
hypothesis: |
  We believe [change] will move [metric] by [amount]
  within [window] because [mechanism].
measurement:
  metric: "..."               # name matching a known data source
  source: "..."               # e.g. "posthog:event=checkout_completed"
  baseline: 0.0               # current value at initiative creation
  threshold: "..."            # what counts as "moved", e.g. "+0.05 absolute" or "≥10% relative"
  window_days: 7              # measurement window length
  verdict: pending            # pending | moved | unmoved | inconclusive | invalidated
  closed_at: null             # auto-set when verdict transitions away from pending
phases:                       # optional grouping of projects within the initiative
  - name: "..."
    project_slugs: ["01-...", "02-..."]
---
```

### `project.md` frontmatter (W10 enforcement)

```yaml
---
parent: initiative.md         # W5
parent_initiative: YYYY-MM-DD-name
slug: 01-name
status: draft                 # draft | autoplanned | ready | active | shipped
touches:
  files:                      # required: at least one of files or modules
    - "apps/web/src/routes/billing/**"
    - "packages/billing/src/**"
  modules:                    # package-boundary declaration (preferred when applicable)
    - "@gaia/billing"
  concerns:                   # optional, advisory tags for grouping
    - "ui:billing"
    - "data:invoices"
depends_on: []                # other project slugs in the same initiative; empty = parallel-eligible
---
```

`touches:` semantics:
- `files` are glob patterns (gitignore-syntax). Two projects collide if their resolved file sets intersect.
- `modules` are package or workspace identifiers. Two projects collide if their module sets intersect.
- `concerns` are free-form tags used for human-readable grouping; concerns alone never trigger a conflict.
- A project must declare at least one of `files` or `modules`. A project that declares neither fails validation.

### Autoplan panel composition (W8 enforcement)

`gstack /autoplan` runs at the tactical layer, on both `initiative.md` and `project.md`, with the same panel composition: **plan-ceo-review + design + devex + eng**. The four reviewers operate at different lenses depending on the artifact:

| Reviewer | At initiative | At project |
|----------|---------------|------------|
| plan-ceo-review | Does this serve the locked Commitment and the north star? | Does this slice contribute to the parent hypothesis? |
| design | Does the user-facing change pass the AI Slop Test and the experience principles? | Does the slice's UI surface conform to design tokens? |
| devex | Does the initiative compose cleanly with existing skills, hooks, and CLIs? | Does the slice introduce new agent-callable surfaces, and are they typed? |
| eng | Is the bet technically realizable in the declared `phases:`? Is the data plan consistent? | Is the `touches:` declaration accurate? Are tests planned for boundaries? |

Reviewer outputs compose into a single autoplan delta — a diff against the input artifact. The user accepts the delta whole, accepts a subset, or rejects it. No reviewer's output is silently merged.

Strategy-layer artifacts (`vision.md`, `roadmap.md`) do not run gstack `/autoplan`. They run Gaia's `d-review` (principles review) only.

### Execution-loop skill chain (W9)

```
code  →  d-review (Gaia, principles)  →  gstack /review  →  gstack /qa  →  gstack /ship
```

A failure at any gate kicks the diff back to coding. `d-review` is scoped to fast pass/fail against `.gaia/rules.ts` and the principles in `docs/reference/`; gstack `/review` is the deep correctness pass; `/qa` runs the test suite and any e2e checks; `/ship` performs the merge and deploy.

---

## What's next

The only remaining downstream work for the Workflow bucket is per-skill production. For each Workflow skill (`vision`, `roadmap`, `initiative`, `project`, plus the supporting `vision-update`, `daily-session-open`, and `d-review`), produce three files:

1. `SKILL.md` — the skill itself, reading from this document's locked contracts
2. `SKILL.md.tmpl` — the walkthrough template (gstack-style systematic questioning with AI-pre-filled recommendations)
3. `research.md` — the frameworks, authors, and prior art that informed the skill (acknowledgements pattern from gstack)

This work begins after the Machinery and Loops buckets are also principle-locked, so skills can be written against the full Harness contract.

## Verification

This file is principle-locked. The criteria below are machine-checkable for any artifact produced under this Workflow:

- Every artifact carries the frontmatter shown in Locked contracts. Missing or malformed frontmatter fails validation.
- Every artifact's `parent:` reference resolves to an existing artifact one layer up (W5).
- `vision.md` carries `taxonomy: nct-hybrid` (W7); the `roadmap` skill rejects any other value.
- `roadmap.md` `Committed` section contains 5–7 items inclusive (W6); fewer is allowed only if no eligible initiatives exist; more fails validation.
- `initiative.md` carries non-empty `hypothesis:` and a fully-populated `measurement:` block (W11).
- `project.md` carries `touches:` with at least one of `files` or `modules` populated (W10).
- The execution-loop skill chain (W9) runs in the order: `d-review` → gstack `/review` → gstack `/qa` → gstack `/ship`. A skill in the chain refuses to run if its predecessor's output is not present.
- Conductor refuses to spawn parallel worktrees for projects whose `touches:` overlap (W10).
- Initiative `verdict:` transitions from `pending` to a closed state within `window_days` of `closed_at` being null and ship event recorded (W1, W11). Past-window pending verdicts surface in the daily briefing (W12).

Machinery work begins next.
