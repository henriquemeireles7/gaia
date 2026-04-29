---
name: a-perf
description: 'Performance audit. Bundle size, route latency budgets, query EXPLAIN cost, Lighthouse on the marketing site, hot-path profiling. Mode: report. Tier: quick (bundle + budget check) | standard (bundle + Lighthouse + EXPLAIN) | exhaustive (+ flame graphs + load test). Triggers: "a-perf", "perf audit", "audit performance", "bundle size", "latency check". Pair: w-review (run before merging anything touching the request path or shipping new client code). Artifact: .gaia/audits/a-perf/<YYYY-MM-DD>.md.'
---

# a-perf — Performance audit

> Reference: see `reference.md` in this folder. This skill is **scaffolded** — the reference declares the intent and budgets; mechanical checks land incrementally.

## Quick reference

- `/a-perf` — full audit, report mode.
- `/a-perf report` — report-only (same as default).
- `/a-perf <scope>` — narrow to a single principle (bundle / latency / db / lighthouse).

## Phase 0: Scope select + pre-condition

Confirm scope (full / narrow). Verify `bun run check` is green; if not, surface and continue (a-perf reports rather than blocks).

## Phase 1: Read codebase + reference.md

Load `reference.md` (auto-loaded by skill-reference hook). Gather inputs: `bun run build` output (bundle size), route table from `apps/api/server/app.ts`, query plans for hot routes, Lighthouse on production URL if available.

## Phase 2: Surface findings

Per principle: bundle-budget, route-latency-budget, query-cost-budget, lighthouse-budget, no-sync-io-on-request-path, fetch-has-timeout. Report severity / file:line / principle id / fix proposal.

## Phase 3: Optional auto-fix or report

Default mode is report. Fix mode is reserved — perf fixes are usually judgment calls (caching strategy, index design) that don't auto-apply safely.

## Phase 4: Final gate

Re-run `bun run check`. The audit report is mode-locked to read-only; this step confirms.

## Output

Mode: **report**.

Findings emitted to `.gaia/audits/a-perf/<YYYY-MM-DD>.md` for `a-health` to consume. One section per axis (bundle, latency, db, lighthouse) with severity-tagged file:line evidence.
