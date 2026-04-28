---
name: d-review
description: "Intelligent pre-commit review: script-first mechanical checks + AI-powered logic review. Fix-first, finding-first. Triggers: 'd-review', 'review', 'check quality', 'review the code', 'pre-commit check'."
---

# d-review — Intelligent Pre-Commit Review

## Quick Reference
- `/d-review` — Full review: orchestrator + 6 AI phases (~1-2 min)
- `/d-review quick` — Orchestrator + final gate only (~15s)
- `/d-review mechanical` — Just orchestrator JSON, no AI phases

## What this does
Script-first quality gate before committing. The orchestrator runs all mechanical checks
in parallel (~5s), then AI focuses on what scripts can't catch: logic bugs, ripple effects,
test quality, coherence, and adversarial thinking.

Fix-first: every issue found is fixed immediately. Report leads with findings, not phases.

## Pipeline
d-code → **d-review** → /ship

## When to run
- Before every commit
- Before /ship
- After d-code completes a project

---

## Pre-condition: bun run check

```sh
bun run check
```

This runs lint + typecheck + tests. MUST pass before the review starts.
If it fails, fix those failures first. This is NOT part of the review.

---

## Phase 0: Orchestrator (script, ~5s)

```sh
bun .claude/skills/d-review/scripts/review-orchestrator.ts
```

Read the JSON output. It runs 4 checks in parallel:
- **harden-check** — security patterns, raw env, raw json, SQL injection, secrets
- **coverage-check** — every changed .ts file has a .test.ts
- **dep-check** — no cross-feature imports, no upward dependencies
- **ubs** — bug scanner (optional, skipped if not installed)

If any check has `status: "error"` or `status: "skipped"`, note the warning:
- Tool crash: "[tool] crashed (exit code N). Run `bun [path]` manually to see the error. Review continues without [tool] checks."
- Tool timeout: "[tool] timed out after Ns. Your diff may touch many files. Run `bun [path]` manually."
- Tool missing: "[tool] not found. Install with [command] or skip (optional tool)."

**For `/d-review quick`:** Skip to Phase 7 after this phase.
**For `/d-review mechanical`:** Output the JSON and stop.

---

## Phase 1: Mechanical Fix (AI)

Read the Phase 0 JSON. For each check with `status: "fail"`:
1. Read the findings array
2. Fix each issue
3. Re-run the specific check that failed to verify the fix
4. Run `bun run check` to ensure no regressions

Move on only when all fixable issues are resolved.

---

## Phase 2: Fresh Eyes (AI — logic bug hunting)

Read every changed file via `git diff -p`.

**Systematic technique** — for each changed function:
1. Read the function name and signature
2. Predict what it should do based on the name alone
3. Read the implementation
4. Note any mismatch between prediction and reality
5. Check every branch: what happens with null? empty string? 0? negative? max value?

Specific patterns to catch:
- Logic bugs (function says X but does Y)
- Off-by-one errors, wrong comparisons (< vs <=, > vs >=)
- Wrong variable used (copy-paste with a different name)
- Missing null/undefined checks on paths that CAN be null
- Dead code introduced by the diff
- Function names that don't match actual behavior

For each finding: file, line, what's wrong, suggested fix, confidence 1-10.

**Auto-fix** findings with confidence >= 4. Run `bun run check` after each fix.
If check fails, revert the fix and report as "attempted fix failed."

---

## Phase 3: Ripple Effect (AI — trace callers)

**Smart filter:** Only analyze exports where the SIGNATURE changed (parameters, return
type, or export name). If only the function body changed, skip that export.

For each export with a changed signature:
1. Run `rg 'functionName' --glob '*.{ts,tsx}'` to find all callers
2. Read each caller's surrounding context (~10 lines)
3. Check: does the change break any caller's assumptions?
4. Check: did return type change? Callers may not handle new cases.
5. Check: did parameter order or types change?

Limits:
- Max 10 exports analyzed regardless of diff size
- Priority: changed signatures > changed return types > changed behavior
- 1-hop depth only (direct callers, not callers of callers)

---

## Phase 4: Test Quality (AI — assertion review)

For each changed file that has a `.test.ts` or `.test.tsx`:
1. Read the test file completely
2. List what IS asserted
3. List what is NOT asserted (compare against the function's branches)
4. Check: are assertions testing behavior or implementation details?
5. Check: are error paths tested (not just happy path)?
6. Check: are edge cases covered (empty arrays, null, 0, boundaries)?
7. Check: are mocks targeting external deps (correct) or internal logic (wrong)?
8. Check: do test descriptions match what they actually test?

To find shared/integration tests that may also cover changed code:
```sh
rg 'from.*changed-module-name' --glob '*.test.{ts,tsx}'
```

---

## Phase 5: Coherence (AI — Seven Files cross-check)

Read all seven files:
1. `platform/env.ts`
2. `platform/errors.ts`
3. `platform/db/schema.ts`
4. `platform/server/routes.ts`
5. `platform/server/responses.ts`
6. `platform/auth/permissions.ts`
7. `providers/analytics.ts`

Then check coherence **only for entities touched by the diff**:

### 5a. Schema → Routes
If a **new table** was added to schema.ts:
- [ ] At least one route reads/writes it (or it's a join table)
- [ ] Route is registered in routes.ts

### 5b. Schema → Errors
If a **new table or lookup** was added:
- [ ] Corresponding NOT_FOUND error exists in errors.ts
- [ ] Validation errors exist if the table has constrained fields

### 5c. Routes → Errors
If a **new route** was added:
- [ ] Uses `throwError()` for all error paths
- [ ] Error codes it throws actually exist in errors.ts

### 5d. Routes → Responses
If a **new route** was added:
- [ ] Returns via `success()`, `created()`, `paginated()`, `accepted()`, `noContent()`, or `partial()`
- [ ] Never returns raw `c.json()`

### 5e. Routes → Auth
If a **new route** was added under `/api/*`:
- [ ] Has `requireAuth` middleware (unless auth/webhook endpoint)
- [ ] If role-specific, uses `requirePermission()`

### 5f. Routes → Permissions
If a **new permission-gated feature** was added:
- [ ] Permission exists in permissions.ts
- [ ] At least one role has the permission

### 5g. Env → Usage
If a **new env var** was added:
- [ ] Actually referenced in at least one file outside env.ts
- [ ] Has correct Zod type

If code **references a new external service**:
- [ ] Env var exists in env.ts for its API key/config

### 5h. Errors → Usage
If a **new error code** was added:
- [ ] Actually thrown somewhere via `throwError()`

### 5i. Permissions → Completeness
If a **new feature route** was added that serves paying users:
- [ ] `pro` role has a permission that gates it

### 5j. Analytics gaps
If a **new user-facing action** was added:
- [ ] `track()` call exists for the action

**Fix every coherence gap found. If a fix requires adding to a Seven File, do it.**

---

## Phase 6: Adversarial (AI — hostile QA)

**NEVER SKIP regardless of diff size.**
For large diffs (>500 lines): scope to the top 5 riskiest changes
(endpoints handling auth, payments, data mutations, or user-facing state changes).

**Systematic technique** — for each new/changed endpoint or user action:
1. Identify the input surface (params, body, headers, query)
2. Try each input as: null, empty, negative, huge string, special chars, HTML/script
3. Ask: "What if two requests hit this simultaneously?" (race condition)
4. Ask: "What if the user submits twice in 100ms?" (double-submit)
5. Ask: "Old code and new code running during deploy... what breaks?" (deploy edge)
6. Ask: "Process crashes mid-operation... what state is left?" (corruption)

---

## Phase 7: Final Gate

```sh
bun run check
```

Must pass. If it fails, you introduced a regression. Fix it.

---

## Checkpoint Behavior

Before starting each AI phase (2-6), note internally which phases have completed.
If the review crashes or is interrupted:
- Fixes from completed phases are already applied to files
- On the next `/d-review` invocation, check for an incomplete prior review
- Offer: "Previous review completed through Phase N. Resume from Phase N+1? Or start fresh?"

---

## Confidence Scores (AI phases 2-6)

Every finding gets a confidence score:
- **1-3 (Low):** Flagged for human review. NOT auto-fixed. "I think this might be an issue but I'm not sure."
- **4-6 (Medium):** Auto-fix attempted with safety net. Reported with caveat: "Medium confidence, verify this is correct."
- **7-10 (High):** Auto-fixed with safety net. Clear issue with evidence.

**Safety net:** `bun run check` after each AI-generated fix. If check fails, revert the fix and report as "attempted fix failed."

All findings appear in the report regardless of confidence. Confidence only determines auto-fix behavior.

Evidence format per finding:
```
[CONFIDENCE/10] file:line — description
  Evidence: what the code does vs what it should do
  Fix: applied / attempted-failed / needs-human
```

---

## Scaling Rules
- **< 200 lines:** All phases, full depth
- **200-500 lines:** Phase 3 limited to top 10 modified exports
- **500+ lines:** Phase 3 limited to top 5 exports. Phase 6 scoped to top 5 riskiest changes. Warning: "Large diff, consider splitting."
- **1000+ lines:** Same as 500+ with stronger warning: "This diff is very large. Review quality degrades. Strongly recommend splitting."

---

## Output

### Finding-First Report

When issues ARE found, lead with findings (sorted by confidence, highest first):

```
=== D-REVIEW: X ISSUES FOUND ===

FINDINGS (sorted by confidence):
  [9/10] platform/auth/routes.ts:34 — Missing null check on session.userId
         Evidence: getUserById called with potentially undefined userId when session expires
         Fix: Applied. Added early return with throwError(UNAUTHORIZED).

  [6/10] features/(life)/course/progress.ts:89 — Off-by-one in lesson completion check
         Evidence: lessonIndex >= lessons.length should be lessonIndex > lessons.length - 1
         Fix: Applied (medium confidence, verify this is correct).

  [3/10] providers/payments.ts:52 — Possible race condition on concurrent webhook delivery
         Fix: Needs human review.

PHASE DETAILS:
  Phase 0 (Orchestrator): Harden PASS | Coverage PASS | Deps PASS | UBS SKIPPED
  Phase 1 (Mechanical Fix): 0 issues
  Phase 2 (Fresh Eyes): 2 findings
  Phase 3 (Ripple Effect): 5 callers checked, 0 concerns
  Phase 4 (Test Quality): 3 tests reviewed, 1 shallow
  Phase 5 (Coherence): 8/8 checks passed
  Phase 6 (Adversarial): 1 attack vector

CONFIDENCE SUMMARY:
  High (7-10): 1 finding (auto-fixed)
  Medium (4-6): 1 finding (auto-fixed with caveat)
  Low (1-3): 1 finding (NEEDS HUMAN REVIEW)

Review completed in 1:47 | 8 files | 3 findings | 2 auto-fixes
VERDICT: NEEDS HUMAN REVIEW (1 low-confidence finding requires your attention)
```

### Clean Report (0 issues found)

When ALL phases find zero issues:

```
=== D-REVIEW: READY TO COMMIT ===
0 issues found | 8 files checked | 47s
All phases clean. Commit away.
```

---

## Rules
- ALWAYS run `bun run check` as pre-condition before starting
- NEVER skip a phase (use `/d-review quick` if you need speed)
- NEVER approve code with failing `bun run check`
- FIX first, report second
- Add issues too large to fix in-session to decisions/humantasks.md
- Coherence checks only apply to entities touched by the diff (that's d-health's job for the full codebase)
- Lead the report with findings, not phases
