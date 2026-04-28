---
name: d-strategy
description: "Strategy session skill. Interactive founder Q&A that produces an initiative document with project suggestions. Triggers: 'd-strategy', 'strategy session', 'new initiative', 'what should we build next'."
---

# d-strategy — Strategy Session

## What this does
Interactive founder Q&A that produces a strategy initiative. Reads codebase state, past initiative learnings, and domain context to ask smart questions. Outputs an initiative folder with document.md, suggested project breakdown, and empty future-work.md.

## Pipeline
**d-strategy** → gstack reviews (CEO/eng/design) → d-roadmap → /ship

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

4. **Previous initiative** (if exists):
   - Latest initiative folder in the domain: `ls decisions/{domain}/`
   - Read its `document.md` and `future-work.md` for continuity

5. **Universal files** relevant to the domain:
   - Always: `decisions/company.md`
   - Product: `decisions/voice.md` (for content positioning)
   - Growth: `decisions/voice.md`
   - Harness: `decisions/harness.md`, `decisions/code.md`

6. **Previous initiative** (if exists):
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
ls decisions/{domain}/ | sort -n | tail -1
```
If no numbered folders exist, start with `01`. Otherwise increment the highest number.
Increment by 1. Create the folder.

#### 3a. document.md
```markdown
# {Initiative Title}

> Domain: {product|growth|harness}
> Created: {YYYY-MM-DD}
> Status: draft

## Context
{2-3 paragraphs: what exists, what's missing, why now}

## Goal
{1 sentence: what success looks like}

## Constraint
{1 sentence: the tightest constraint}

## Projects (suggested breakdown)

### Project 1: {name}
- **Scope:** {1-2 sentences}
- **Deliverables:** {bullet list}
- **Acceptance criteria:** {bullet list}
- **Risk:** {1 sentence}

### Project 2: {name}
...

## Decision Log
| Decision | Choice | Why |
|----------|--------|-----|
| {first decision from Q&A} | {choice} | {reasoning} |

## Open Questions
- {anything unresolved from the Q&A}
```

#### 3b. future-work.md
```markdown
# Future Work — {Initiative Title}

> Updated: {YYYY-MM-DD}

Items deferred from this initiative for future consideration.

(empty — populated by d-code as projects complete)
```

### Step 4: Suggest Next Steps
```
Initiative created: decisions/{domain}/NN-name/

Next steps:
1. Run gstack reviews to refine: /plan-ceo-review, /plan-eng-review, /plan-design-review
2. After reviews settle the project breakdown: /d-roadmap
3. Then execute per-project: d-code or d-content
```

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
