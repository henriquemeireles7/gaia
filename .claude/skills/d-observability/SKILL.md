---
name: d-observability
description: 'Observability audit. Logs, metrics, traces, error tracking, init-at-boot, no PII in logs. Triggers: "d-observability", "obs audit", "audit observability".'
---

# d-observability — Observability audit

> Reference: see `reference.md` in this folder (observability patterns; migrated from `.gaia/reference/observability.md` in PR 8 of Initiative 0001).

## Quick reference

- `/d-observability` — full audit.
- `/d-observability report` — report-only.

## Phase 0: Scope select + pre-condition

Confirm scope and mode. Verify `bun run check` is green.

## Phase 1: Read codebase + reference.md

Walk `apps/api/server/**` for logger calls, init-at-boot, AI trace tags. Walk `apps/web/src/**` for client-side log calls.

## Phase 2: Surface findings

Per principle: console.log in prod, missing init, PII in logs, missing AI trace tags.

## Phase 3: Optional auto-fix or report

Fix mode applies to mechanical findings (replace console.log with structured logger).

## Phase 4: Final gate

Re-run `bun run check`.

## Output

Mode: **fix** or **report**.
