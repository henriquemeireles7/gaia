---
name: d-code
description: "TDD implementation from project roadmaps. Five phases: plan decomposition, TDD implementation, completion audit, wiring audit, handoff. Triggers: 'd-code', 'implement', 'start coding', 'code this project'."
---

# d-code — TDD Implementation

## What this does
Implements a project from its roadmap.md using strict TDD. Five phases ensure nothing is missed:
plan decomposition, TDD implementation, completion audit, wiring audit, and handoff.

## Pipeline
d-strategy → gstack reviews → d-roadmap → **d-code** → d-review → /ship

## When to use
- A project has a roadmap.md with deliverables and acceptance criteria
- Ready to write code (not strategy, not content)

---

## Input
The user provides the path to a project's `roadmap.md` or the project folder.
If not provided, ask the user which project to implement.

## Before Starting

### Codebase Audit (MANDATORY)
Understand what exists before coding. Read these files using the Read tool (not cat):
- `platform/db/schema.ts` — What tables exist?
- `platform/server/routes.ts` — What routes exist?
- `platform/errors.ts` — What errors exist?
- `platform/env.ts` — What env vars exist?

Read root CLAUDE.md (build order, rules, seven key files).
Read `decisions/code.md` (patterns, TDD, dependency rules).
Read the CLAUDE.md of EVERY folder you're about to modify.

---

## Phase 1: Plan Decomposition

Read the project's `roadmap.md`. Extract every deliverable into a checklist:

```
CHECKLIST:
[ ] Deliverable 1: {name}
    Acceptance: {criteria from roadmap}
    Files: {CREATE/MODIFY list}
[ ] Deliverable 2: {name}
    ...
```

Order the checklist by the Build Order:
1. CLAUDE.md (new folders)
2. schema.ts changes
3. errors.ts additions
4. env.ts additions
5. Tests (write first)
6. Implementation code
7. Route wiring
8. Page wiring

---

## Phase 2: TDD Implementation

For each deliverable in order:

### 2a. RED — Write Failing Tests
Write tests derived from the **acceptance criteria in the roadmap**, NOT from your implementation model.

```sh
bun test <test-file>  # MUST fail
```

If the test passes without writing implementation code, the test is wrong — it's not testing anything new.

### 2b. GREEN — Write Minimum Code
Write only what's needed to make the failing test pass. No more.

```sh
bun test <test-file>  # MUST pass now
```

### 2c. REFACTOR — Clean Up
Extract shared logic only if duplicated 3+ times. Run tests after every change.

### 2d. VERIFY — All Checks Pass
```sh
bun run check
```

NEVER move to the next deliverable until all checks pass.

### 2e. Mark Complete
Check off the deliverable in your checklist. Move to next.

**CRITICAL: Follow the Build Order strictly.** If a deliverable needs schema changes, do schema → errors → env → tests → code → wire.

**CRITICAL: Read the CLAUDE.md of EVERY folder you modify.** If the folder doesn't exist yet, create its CLAUDE.md FIRST.

---

## Phase 3: Completion Audit

After all deliverables are checked off, re-read the roadmap.md:

1. For EVERY acceptance criterion in the roadmap, verify it exists in actual code:
   - Check the file exists
   - Check tests cover it
   - Check DB migrations were generated if schema changed
2. For EVERY deliverable, verify the implementation matches the spec
3. If ANY gaps found: implement them with TDD (back to Phase 2 for that gap)

**Why this phase exists:** Implementation covers ~90% of the plan. The remaining 10% are details like missing migrations, GET endpoints the plan assumed, or config flags not wired through.

---

## Phase 4: Wiring Audit

Run dead code detection:
```sh
bunx knip 2>/dev/null || echo "knip not installed, skip"
```

For each dead export found:
1. Trace it back to the roadmap — is this an INCOMPLETE implementation?
2. If yes: the export exists because something should USE it but doesn't yet. Fix the gap with TDD.
3. If no: it's genuinely dead code. Remove it.

The goal: every export is either used or justified by the roadmap.

---

## Phase 5: Handoff

### 5a. Final Quality Gate
```sh
bun run check
```
Must pass. No exceptions.

### 5b. Fresh Eyes Self-Review
1. Re-read ALL new/modified code looking for obvious bugs
2. Check edge cases: empty inputs, concurrent access, error paths, boundaries
3. Fix anything found. Repeat 1-2 rounds.

### 5c. Update future-work.md
Append deferred items to the initiative's `future-work.md`:
```markdown
### {Project Name} ({date})
- {item deferred and why}
```

### 5d. Output Summary
```
=== IMPLEMENTATION COMPLETE ===
Project: {name}
Roadmap: {path}

Deliverables: {N}/{N} complete
Tests: {X} passed, 0 failed
bun run check: PASS

Files created:  [list]
Files modified: [list]

Deferred to future-work.md:
- {item} (reason)

Next: /d-review → /ship
```

---

## THE LOOP RULE
**NEVER STOP. NEVER ASK "should I continue?"**
After completing a deliverable, IMMEDIATELY start the next one.
Keep going until all deliverables are done and all 5 phases complete.
The ONLY reasons to stop:
1. All phases complete
2. Genuinely blocked (needs user input, external service, credentials)
3. User explicitly tells you to stop

---

## Rules
- NEVER skip the Build Order — even if the deliverable only mentions one file
- NEVER move to next deliverable with failing checks
- NEVER close without the Completion Audit (Phase 3)
- NEVER ignore dead exports — trace them back to the plan (Phase 4)
- NEVER modify a file without reading its folder's CLAUDE.md first
- ALWAYS write tests from ACCEPTANCE CRITERIA, not from your implementation
- ALWAYS follow TDD: write failing test → make it pass → refactor
- ALWAYS run `bun run check` before declaring done
- Security: validate all input via Zod, use throwError(), never log sensitive data
- Performance: no N+1 queries, < 200ms API responses
- When done, ALWAYS suggest `/d-review` before `/ship`
