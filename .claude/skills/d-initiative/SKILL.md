---
name: d-initiative
description: "Strategy session skill. Interactive founder Q&A that produces an initiative document with project suggestions. Triggers: 'd-initiative', 'strategy session', 'new initiative', 'what should we build next'."
---

# d-initiative — Strategy Session

## What this does

Interactive founder Q&A that produces a strategy initiative. Reads codebase state, past initiative learnings, and domain context to ask smart questions. Outputs an initiative folder with document.md, suggested project breakdown, and empty future-work.md.

## Pipeline

**d-initiative** → gstack reviews (CEO/eng/design) → d-initiative → /ship

## When to use

- Starting a new initiative in any domain (product, growth, harness)
- The founder has a strategic idea that needs structure
- Quarterly planning or roadmap refresh
- Maturity bottleneck identified in health.md needs a project

---

## Inputs (gathered automatically)

Before asking questions, load this context silently:

1. **Codebase state:**

   ```sh
   tokei --sort lines 2>/dev/null || echo "tokei not installed"
   git log --oneline -20
   ```

2. **All nested CLAUDE.md files** (skim for what exists):

   ```sh
   fd CLAUDE.md --type f
   ```

3. **Maturity context** (ALWAYS read these first):
   - `decisions/maturity.md` — principles, level definitions, categories, decision filter
   - `decisions/health.md` — current maturity scores per category, bottlenecks

4. **Domain context** (based on which domain the user specifies):
   - Product: `decisions/product/context.md`
   - Growth: `decisions/growth/context.md`
   - Harness: `decisions/harness/context.md`

5. **Previous initiative** (if exists):
   - Latest initiative folder in the domain: `ls decisions/{domain}/`
   - Read its `document.md` and `future-work.md` for continuity

6. **Universal files** relevant to the domain:
   - Always: `decisions/company.md`
   - Product: `decisions/voice.md` (for content positioning)
   - Growth: `decisions/voice.md`
   - Harness: `decisions/harness.md`, `decisions/code.md`

7. **Previous initiative** (if exists):
   - Latest initiative folder in the domain: `ls decisions/{domain}/`
   - Read its `document.md` and `future-work.md` for continuity

---

## Flow

### Step 0: Domain Selection

If the user didn't specify a domain, ask:

```
Which domain is this initiative for?
A) Product — features, UX, pricing, user experience
B) Growth — content, distribution, conversion, expansion
C) Harness — AI methodology, skills, hooks, workflows
```

Wait for response. Use the selected domain for all subsequent steps.

### Step 1: Frame Context (show the user)

Summarize in 3-5 bullets:

- What exists in the codebase (from tokei + git log)
- What the domain vision says
- What the previous initiative accomplished (if any)
- What future-work.md flagged as deferred

### Step 2: Ask 5-7 Questions

Each question must have **2-3 concrete options** (not open-ended "describe your thinking").

Example question format:

```
Q1: What's the primary goal of this initiative?

A) Revenue — get paying customers faster (free funnel, checkout optimization, pricing experiments)
B) Retention — make existing users stick (decision graph, streaks, follow-ups)
C) Foundation — build infrastructure that multiple future features need (schema, API, auth)
```

Question topics to cover:

1. **Goal** — what success looks like
2. **Scope** — how big (1 project? 3 projects? 5?)
3. **Constraint** — what's the tightest constraint (time, complexity, dependencies)?
4. **User** — who benefits most (LD users, BD clients, both, internal)?
5. **Risk** — what's the biggest risk if this fails?
6. Optional: **Sequencing** — does this block or unblock other work?
7. Optional: **Learning** — what do we need to learn from this?

Wait for the user to answer ALL questions before proceeding.

### Step 3: Write the Initiative

Determine the next initiative number. Use Bash:

```sh
ls .gaia/initiatives/ | grep -E '^[0-9]{4}' | sort -n | tail -1
```

If no numbered folders exist, start with `0001`. Otherwise increment the highest number by 1 (4-digit zero-padded). Create `.gaia/initiatives/NNNN-<slug>/initiative.md`.

#### 3a. initiative.md (canonical 6-section shape)

The template has six sections. Frontmatter requires `parent`, `hypothesis`, `measurement` (the three fields `validate-artifacts.ts` enforces). See an existing initiative (e.g. `.gaia/initiatives/0001-gaia-workflow-setup/initiative.md`) for a populated reference.

Section outline:

1. **Context / Research** — 2-3 paragraphs: what exists, what's missing, why now, named demand evidence, prior session learnings.
2. **Strategy** — Problem, Approach (chosen), Cap table (Ships v1.0 / Capped).
3. **Folder Structure** — ASCII tree of files/folders this initiative adds or modifies. Mark new paths with `# NEW`, extended paths with `# EXTENDS`. Copy-paste-ready so `d-code` can scaffold without ambiguity.
4. **Implementation** — Order of operations + Risks (priority-ordered with mitigations) + Out-of-scope list.
5. **PR Breakdown** — Table (`PR | Title | Files | Status`) — `d-code` reads this and codes PR by PR.
6. **Decision Audit Trail** — Table (`ID | Decision | Source`) — every decision traces to founder, autoplan voice, or AD-N mechanical.

### Step 4: Suggest Next Steps

```
Initiative created: .gaia/initiatives/NNNN-<slug>/initiative.md

Next steps:
1. Run gstack reviews to refine: /plan-ceo-review, /plan-eng-review, /plan-design-review
2. After reviews settle the PR breakdown: re-run /d-initiative for any expansions
3. Then execute per-PR: d-code (reads §5) or d-content
```

---

## Output

Mode: **report** — produces an initiative document with project suggestions. No code mutations. The founder's answers ARE the strategy; the skill captures them as a reviewable artifact.

---

## Rules

- NEVER write code — this is strategy only
- NEVER skip the Q&A — the founder's answers ARE the strategy
- ALWAYS provide 2-3 options per question (not open-ended)
- ALWAYS read domain vision.md and market.md before asking questions
- ALWAYS check previous initiative's future-work.md for continuity
- ALWAYS number initiatives sequentially within the domain
- Document status starts as "draft" — reviews change it to "reviewed"
- One initiative at a time per domain
- After saving, auto-commit and push (non-code doc)
