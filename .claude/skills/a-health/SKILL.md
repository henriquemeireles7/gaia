---
name: a-health
description: 'Composite codebase health audit. Dispatcher: runs the bun run check harness, dispatches the 6 a-* sibling audits (a-security, a-ai, a-ax, a-ux, a-dx, a-observability, a-perf), aggregates a 12-axis vector, computes trend vs prior decisions/health.md, surfaces worst-file leaderboard. Mode: report. Tier: pulse (Phase 1 only, ~30s) | weekly (full 4-phase audit) | monthly (full + remediation plan). Triggers: "a-health", "health audit", "codebase health", "full audit", "how healthy is the code". Pair: every a-* sibling (composite). Artifact: decisions/health.md (vector + trend + fix plan) + .gaia/audits/a-health/<date>.md.'
---

# a-health — Comprehensive codebase health audit

> Reference: see `reference.md` in this folder (10 audit-orchestration principles, score formula, output shape).

## Quick reference

- `/a-health` — full audit (Phase 0–4); ~5–10 minutes.
- `/a-health pulse` — mechanical sweep only (Phase 1); ~30 seconds. Same path as the Stop hook.
- `/a-health monthly` — full audit + extended remediation plan with effort estimates.
- `/a-health --force` — bypass skip-intelligence; recompute every axis.

## What this does

`a-health` is the orchestra conductor, not an instrument. The 6 sibling audit skills (`a-security`, `a-ai`, `a-ax`, `a-ux`, `a-dx`, `a-observability`, `a-perf`) each own their domain principles. `a-health` runs the existing `bun run check` harness, dispatches to those siblings, aggregates findings into a 12-axis vector, computes per-axis trend vs the prior `decisions/health.md`, ranks the cross-audit worst-file leaderboard, and emits `decisions/health.md`.

**One mode: report.** No code mutations. The fix plan tells `w-review` and `w-code` what to fix.

## When to run

- Continuously: pulse fires automatically after sessions touching ≥10 files.
- Weekly: full audit cadence.
- Before a major release: full audit.
- After landing an initiative: full audit + monthly remediation plan.

## Phase 0: Pre-condition + reproducibility stamp

Verify `bun run check` is green and capture the provenance stamp. The audit produces output even if the harness is red — but the red harness becomes a P0 finding instead of an aborted run (per principle 8: sub-audit failure is a finding, not an abort).

```sh
bun run check                                                                                  # capture pass/fail
bun .claude/skills/a-health/scripts/reproducibility-stamp.ts > .gaia/audits/a-health/.stamp    # git SHA + tool versions
```

Read the prior audit if it exists:

```sh
ls decisions/health.md && cat decisions/health.md   # or absent → first-run flow
```

## Phase 1: Mechanical sweep

Run the existing harness; capture parseable output per script. **No checklists in this skill** — every check below is owned by an existing script that the harness already runs.

```sh
bun run check                                # full pipeline (lint, format, ast, types, harden, scripts, test)
bun run check:dead                           # knip — dead exports + unused deps
bun run rules:coverage                       # pending entries; flag >14d as P1
bun run harden                               # packages/security/harden-check.ts
bun .claude/skills/a-health/scripts/check-duplication.ts   # DRY rule (≥3 occurrences of 5-line shingles)
```

Phase 1 outputs feed Phase 3 aggregation. If `bun run check` is red, capture the failing script names — every red script is a P0 finding.

## Phase 2: Dispatch sibling audits

Invoke each sibling audit skill in **report mode**. Each writes its own `.gaia/audits/<skill>/<date>.md`. `a-health` reads the resulting markdown, never re-implements the domain check.

```
Skill(a-security,      mode: report)   → .gaia/audits/a-security/<date>.md
Skill(a-ai,            mode: report)   → .gaia/audits/a-ai/<date>.md
Skill(a-ax,            mode: report)   → .gaia/audits/a-ax/<date>.md
Skill(a-ux,            mode: report)   → .gaia/audits/a-ux/<date>.md
Skill(a-dx,            mode: report)   → .gaia/audits/a-dx/<date>.md
Skill(a-observability, mode: report)   → .gaia/audits/a-observability/<date>.md
Skill(a-perf,          mode: report)   → .gaia/audits/a-perf/<date>.md          # n/a until a-perf scaffolds full reference
```

**Skip-intelligence (per principle 6):** for each axis, if the prior score was ≥9.5 AND `git diff --name-only <prior-audit-sha>..HEAD` shows zero changed files in that domain's scope, mark the axis `(skipped)` and reuse the prior score. `--force` bypasses this.

**Failure handling (per principle 8):** wrap every dispatch in try/capture. A failing sibling marks its axis `error` with the captured stderr; the audit continues. The failure surfaces as a P0 finding ("audit infra broken: a-security").

## Phase 3: Aggregate, score, trend

```sh
bun .claude/skills/a-health/scripts/aggregate-scores.ts \
  --stamp .gaia/audits/a-health/.stamp \
  --audits-dir .gaia/audits \
  --prior decisions/health.md \
  --out decisions/health.md
```

This script:

1. Reads each sibling's latest `.gaia/audits/<skill>/<date>.md` and parses severity counts.
2. Reads Phase 1 output (knip, rules:coverage, harden, check-duplication, ast-grep).
3. Computes per-axis scores via the formula in `reference.md` Part — Score formula.
4. Computes the composite as the weighted sum.
5. Diffs against the prior `decisions/health.md` (per `trend.ts`) → emits per-axis delta + direction.
6. Ranks worst files cross-audit (per `worst-files.ts`) → top 5 with systemic-debt tag.
7. Builds the fix plan (P0–P3) ordered by severity and worst-file weight.
8. Writes `decisions/health.md` (replaces) and appends a row to its `## Audit History` table.

Companion scripts under `.claude/skills/a-health/scripts/`:

- `aggregate-scores.ts` — orchestrates the above
- `trend.ts` — diff against prior
- `worst-files.ts` — cross-audit ranking
- `reproducibility-stamp.ts` — git SHA + tool versions
- `quick-pulse.ts` — Stop-hook entry point (Phase 1 only)

## Phase 4: Final gate

Re-run `bun run check` and confirm no source mutations slipped through (per principle 7: report-only by contract).

```sh
bun run check                                   # must match Phase 0 result
git diff --name-only                            # allowed-write whitelist:
                                                #   decisions/health.md
                                                #   .gaia/audits/a-health/<date>.md
                                                #   .gaia/audits/a-health/.stamp
                                                #   .gaia/audits/a-health/pulse.jsonl (pulse mode)
                                                # any other diff = abort + P0 violation
```

If anything outside the whitelist appears in `git diff --name-only`, the audit reports a self-inflicted regression and surfaces it as a P0 finding.

## Output

Mode: **report**.

### Chat summary (always print)

```
Phase 1 (mechanical sweep): N axes scored, M findings
Phase 2 (sibling dispatch): 7 audits dispatched, K errors
Phase 3 (aggregate + trend): composite X.X/10 [↑/↓/= delta from <prior-date>]

Top driver: <axis> moved <±delta> due to <one-line cause>
Top 3 fixes:
  1. <file:line> — <issue> (<severity>)
  2. ...
  3. ...

Full report: decisions/health.md
```

### Health Report (`decisions/health.md`)

Canonical shape lives in `reference.md` Part — Output. Summary:

- Header: composite, trend, reproducibility stamp.
- 12-axis vector table.
- Top 5 worst files cross-audit (systemic-debt tag).
- Top 5 highest-impact fixes.
- Fix plan: P0 / P1 / P2 / P3 tables.
- Detailed findings per axis (one section each).
- Audit History table (append-only row per run).

## Rules

- NEVER fix issues during a-health — diagnostic, not treatment.
- NEVER ask questions — zero-interaction skill.
- NEVER duplicate a sibling's domain checklist into this skill (principle 1).
- ALWAYS produce `decisions/health.md`, even when sub-audits error (principle 8).
- ALWAYS bump the prior `## Audit History` table — append, don't replace.
- ALWAYS capture the reproducibility stamp before scoring; never trend across mismatched stacks without flagging.
- If `bun run check` fails in Phase 0, capture as a P0 finding and continue (principle 8).
- If skip-intelligence reuses a prior score, the report MUST mark the axis `(skipped)`.

## Running individual phases

- `/a-health pulse` — Phase 1 only. Same path as the Stop hook continuous mode (per principle 9).
- `/a-health <axis>` — full pipeline scoped to a single axis (e.g. `/a-health security` runs only a-security + recomputes only the security axis).
- `/a-health --force` — bypass skip-intelligence.

Default (no argument): full Phase 0–4 audit.

## Chaining

This skill is invoked by:

- **CLAUDE.md routing**: `/a-health` or triggers like "health audit", "codebase health".
- **Stop hook**: `quick-pulse.ts` runs after sessions touching ≥10 files (per principle 9; wired in `.claude/settings.json`).
- **w-review**: can read the latest `decisions/health.md` for fix-plan context.

After the report, fix work flows: `decisions/health.md` → `w-review` (fast pass/fail) → `w-code` (TDD fix) → `gstack /review` → `gstack /qa` → `gstack /ship`.
