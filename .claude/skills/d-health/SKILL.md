---
name: d-health
description: "Comprehensive codebase health audit: 10 sessions covering security, performance, UI, coherence, dead weight, test health, architecture, dependencies, content, and scoring. Single mode, report-only, never fixes code. Produces decisions/health.md with scored report + fix plan + trend. Triggers: 'd-health', 'health audit', 'codebase health', 'full audit', 'how healthy is the code'."
---

# d-health — Comprehensive Codebase Health Audit

## What this does
Deep periodic audit of the entire codebase across 10 sessions. Report-only — never fixes code,
never fixes code. Produces a scored report with a prioritized fix plan.

Run this every few days, before major releases, or when the codebase "feels off."

**One mode. No flags. No decisions during the run.**

## When to run
- Every few days as a health pulse
- Before a major release or milestone
- When the codebase "feels off" but nothing specific is broken
- After a large implementation session (post d-code)

## Before Starting
```sh
bun run check
```
If this fails, report it as a P0 finding in the health report and continue the audit.
Do NOT stop. Do NOT ask the user what to do.

Read:
- Root CLAUDE.md (build order, seven files, rules)
- `decisions/code.md` (dependency rules, security, performance)
- `decisions/health.md` (prior audit findings, if exists)
- `decisions/architecture.md` (data storage rule, feature groups)
- `decisions/design.md` (for UI session)
- `decisions/health.md` (prior health report, if exists — needed for trend)

---

## DX Rules (mandatory)
- **NEVER ask questions during the audit.** Zero interaction. Pure diagnostic.
- **NEVER fix code.** Report only. The fix plan tells the user what to fix.
- **NEVER create tasks.** The report IS the output.
- **ALWAYS produce a report**, even if some sessions fail or scripts crash.
- **After each session**, print one line: `Session N (Name): X findings (Y critical)`
- **At the end**, print a 3-line summary in chat:
  ```
  Composite score: X.X/10 [↑/↓/= from last run]
  Top findings: [1-3 highest severity items]
  Full report: decisions/health.md
  ```

---

## Session 1: Security

### 1a. Mechanical check
```sh
bun platform/scripts/harden-check.ts --json 2>/dev/null || bun platform/scripts/harden-check.ts
```
Read findings. Each error = high severity. Each warning = medium severity.

### 1b. Input validation — every route handler
- [ ] Every POST/PUT/PATCH uses `zValidator()` with Zod schema
- [ ] No `c.req.json()` or `c.req.query()` used directly
- [ ] Zod schemas validate all fields (no `.passthrough()` on user input)
- [ ] Error responses use `throwError()` — no raw error objects
- [ ] User-supplied IDs validated as proper format before DB lookup
- [ ] Email always normalized: `.toLowerCase().trim()`

### 1c. Auth & authorization — every `/api/*` route
- [ ] Has `requireAuth` middleware (except auth/webhook endpoints)
- [ ] Role-gated routes use `requirePermission()`, not manual checks
- [ ] No session tokens in URL query strings
- [ ] IDOR check: trace each route — can user A see user B's data?
- [ ] Rate limiting on auth and public endpoints

### 1d. Payment security — all payment/subscription code
- [ ] Stripe webhook signature verified via `constructEvent` BEFORE processing
- [ ] Purchase insert uses `onConflictDoNothing` (idempotent)
- [ ] No full card numbers stored anywhere
- [ ] Stripe secret key only in `platform/env.ts`
- [ ] Price amounts from server-side config, not client request
- [ ] `client_reference_id` set on checkout sessions
- [ ] All relevant Stripe event types handled

### 1e. UBS scan
```sh
ubs . --format=toon --skip=11,14 2>/dev/null || echo "UBS not installed"
```

**Output:** List findings with severity and file location.

---

## Session 2: Performance

Check all DB queries in features/ and platform/db/:
- [ ] No N+1 queries (loops with queries inside)
- [ ] All list endpoints have pagination
- [ ] Indexes exist on foreign keys and commonly queried columns
- [ ] No unbounded `SELECT *` without WHERE or LIMIT
- [ ] `uniqueIndex` on columns that must be unique
- [ ] No synchronous file I/O in request handlers
- [ ] `fetch()` calls have timeouts

---

## Session 3: UI Quality

Read `decisions/design.md` first.
- [ ] Clear visual hierarchy on every page
- [ ] Spacing/color/radius from design system
- [ ] Error states have recovery actions
- [ ] Loading states use skeletons
- [ ] Empty states guide user to next action
- [ ] Typography on-scale (Instrument Serif + Sans)
- [ ] Interactive elements have hover/focus/active states
- [ ] Forms preserve input on submission failure
- [ ] Success actions give clear feedback
- [ ] Keyboard navigation for critical flows

---

## Session 4: Coherence

### 4a. Run companion script
```sh
bun .claude/skills/d-health/scripts/health-coherence.ts
```
Read the JSON output. Each gap in the `findings` array is a health finding.
If the script crashes, note the error and continue with manual checks below.

### 4b. Manual cross-reference (supplement script findings)
Read all seven files:
1. `platform/env.ts`
2. `platform/errors.ts`
3. `platform/db/schema.ts`
4. `platform/server/routes.ts`
5. `platform/server/responses.ts`
6. `platform/auth/permissions.ts`
7. `providers/analytics.ts`

Check for gaps the script may have missed:
- Role → Feature completeness (does each role have the right permissions?)
- Analytics event coverage (are significant user actions tracked?)
- Schema → Index coverage (foreign keys indexed?)

---

## Session 5: Dead Weight

### 5a. Run companion script
```sh
bun .claude/skills/d-health/scripts/health-dead-exports.ts
```
Read the JSON output. Each item in `dead` array is a health finding.
If the script crashes, note the error and do manual checks.

### 5b. Manual supplement
- [ ] Dead files (`.ts` file with no imports from other files and not an entry point)
- [ ] Dead dependencies (package.json deps never imported in source)

---

## Session 6: Test Health

### 6a. Run companion script
```sh
bun .claude/skills/d-health/scripts/health-test-coverage.ts
```
Read the JSON output. Each missing test file is a finding.
If the script crashes, note the error and check manually.

### 6b. Manual test depth review
For each `.test.ts` file:
- [ ] Tests happy path
- [ ] Tests at least one error path
- [ ] Tests edge cases (empty arrays, null values, boundaries)
- Flag: test file that only tests happy path = shallow coverage

### 6c. Test anti-patterns
- [ ] No tests that depend on execution order
- [ ] No tests with hardcoded timestamps or IDs that will break
- [ ] No tests that mock what they should test
- [ ] No tests that test implementation instead of behavior

---

## Session 7: Architecture

### 7a. Run companion script
```sh
bun .claude/skills/d-health/scripts/health-architecture.ts
```
Read the JSON output. Violations and cycles are findings.
If the script crashes, note the error and check manually.

### 7b. Manual architecture review
- [ ] Feature bleeding: all code for a feature lives in its folder
- [ ] No feature logic scattered across platform/ or providers/
- [ ] CLAUDE.md freshness: footer matches actual files in each folder
- [ ] decisions/ drift: architecture.md and code.md match actual patterns

---

## Session 8: Dependencies

```sh
bun outdated 2>/dev/null || echo "bun outdated not available"
```

- [ ] Flag: major version behind (breaking changes available)
- [ ] Flag: minor version behind with security patches
- [ ] Cross-reference package.json against actual imports (unused deps)
- [ ] Version pinning: all deps use exact versions (no `^` or `~`)
- [ ] For the 5 largest dependencies: note size impact

---

## Session 9: Content

```sh
bun run content:check 2>/dev/null || echo "content:check not available"
bun run freshness 2>/dev/null || echo "freshness not available"
```

- [ ] All content/ .md files pass content-quality.ts validation
- [ ] Freshness: all content files updated within 90 days
- [ ] decisions/ files: all have `Last verified:` date within 30 days
- [ ] CLAUDE.md files: footer matches actual files in folder
- [ ] No orphaned content files (not referenced in any route or sitemap)

---

## Session 10: Score & Trend

### Scoring (0-10 per session)

| Session | Weight | Formula |
|---------|--------|---------|
| Security | 20% | 10 - (critical*3 + high*1.5 + medium*0.5 + low*0.1) |
| Performance | 10% | 10 - (critical*3 + high*1.5 + medium*0.5 + low*0.1) |
| UI Quality | 5% | 10 - (issues * 0.5) |
| Coherence | 20% | 10 * (coherent / total) from script summary |
| Dead Weight | 10% | 10 - (dead_items * 0.3), min 0 |
| Test Health | 15% | 10 * (with_tests / total_files) from script summary |
| Architecture | 10% | 10 - (violations * 0.5 + cycles * 1.0) |
| Dependencies | 5% | 10 - (critical_vuln*3 + outdated_major*1 + unused*0.5) |
| Content | 5% | 10 * (passing_checks / total_checks) |

**Composite score** = weighted average, capped at 0-10.

### Session Skip Intelligence
If `decisions/health.md` exists with prior scores:
- For each session: if prior score >= 9.5 AND `git diff --name-only` shows 0 changed files
  in that session's scope since the last audit date → skip with note.
- Override: user passes `--force` argument when invoking d-health.
- First run: no skipping (no baseline exists).

### Worst-File Leaderboard
- Aggregate all findings from Sessions 1-9 per file
- Rank by weighted count (critical=3, high=1.5, medium=0.5, low=0.1)
- Show top 5 worst files with per-session breakdown
- Cross-session patterns: files appearing in 3+ sessions = "systemic debt"

### Trend
If `decisions/health.md` exists, compare to last run:
- Score delta per session
- New issues vs resolved issues
- Overall trajectory: improving / stable / degrading

---

## Output

### Chat summary (always print)
```
Session 1 (Security): X findings (Y critical)
Session 2 (Performance): X findings (Y critical)
...
Session 9 (Content): X findings (Y critical)

═══════════════════════════════════════
Composite score: X.X/10 [↑0.3 from last run]
Top findings: [1] IDOR in profile route [2] 8 dead exports [3] 3 files missing tests
Full report: decisions/health.md
═══════════════════════════════════════
```

### Health Report (saved to `decisions/health.md`)

```markdown
# Codebase Health Report

> Last audit: YYYY-MM-DD
> Composite score: X.X/10
> Trend: [improving|stable|degrading] (delta from last run)

## Session Scores
| Session | Score | Findings | Critical |
|---------|-------|----------|----------|
| Security | X/10 | N | N |
| Performance | X/10 | N | N |
| UI Quality | X/10 | N | N |
| Coherence | X/10 | N | N |
| Dead Weight | X/10 | N | N |
| Test Health | X/10 | N | N |
| Architecture | X/10 | N | N |
| Dependencies | X/10 | N | N |
| Content | X/10 | N | N |

## Top 5 Worst Files
| File | Sessions | Total Score | Breakdown |
|------|----------|-------------|-----------|

## Top 5 Highest-Impact Fixes
1. [item] — [why it matters] — [effort estimate]
2. ...

## Fix Plan

### P0 — Fix now (security holes, data integrity)
| # | Session | File | Issue | Effort |
|---|---------|------|-------|--------|

### P1 — Fix this week (coherence gaps, dead weight, test gaps)
| # | Session | File | Issue | Effort |
|---|---------|------|-------|--------|

### P2 — Fix this month (architecture drift, dependency updates)
| # | Session | File | Issue | Effort |
|---|---------|------|-------|--------|

### P3 — Track (cosmetic, nice-to-have)
- [items]

## Detailed Findings

### Session 1: Security
[findings]

### Session 2: Performance
[findings]

### Session 3: UI Quality
[findings]

### Session 4: Coherence
[findings]

### Session 5: Dead Weight
[findings]

### Session 6: Test Health
[findings]

### Session 7: Architecture
[findings]

### Session 8: Dependencies
[findings]

### Session 9: Content
[findings]

## Audit History
| Date | Score | Sec | Perf | UI | Coh | Dead | Test | Arch | Deps | Cont |
|------|-------|-----|------|----|-----|------|------|------|------|------|
```

## Running Individual Sessions

You can run a single session:
- `/d-health security` — Session 1 only
- `/d-health performance` — Session 2 only
- `/d-health ui` — Session 3 only
- `/d-health coherence` — Session 4 only
- `/d-health dead-weight` — Session 5 only
- `/d-health tests` — Session 6 only
- `/d-health architecture` — Session 7 only
- `/d-health deps` — Session 8 only
- `/d-health content` — Session 9 only
- `/d-health score` — Session 10 only (requires other sessions to have run first)

Default (no argument): run all 10 sessions sequentially.

## Rules
- NEVER fix issues during d-health — this is a diagnostic, not a treatment
- NEVER ask questions — this is a zero-interaction skill
- NEVER create tasks or fix code — the report is the output
- ALWAYS produce a report, even if partial (some sessions errored)
- ALWAYS save the full report to `decisions/health.md`
- ALWAYS produce the fix plan — the report without a plan is just complaining
- ALWAYS compare to prior run if `decisions/health.md` exists
- If a companion script crashes, note the error and continue with manual checks
- If `bun run check` fails, report it as P0 and continue the audit

## Chaining
This skill is called by:
- **CLAUDE.md routing**: `/d-health` or triggers like "health audit", "codebase health"
- **d-code**: Can reference health report findings for cleanup work

Standalone usage: `/d-health` for full audit.
After the report: use d-review or d-code to fix the prioritized items.
