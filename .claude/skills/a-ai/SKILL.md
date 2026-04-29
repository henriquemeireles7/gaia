---
name: a-ai
description: 'AI feature audit. Anthropic SDK / agent-native patterns review. Mode: report. Tier: quick (smoke check) | standard (all dimensions) | exhaustive (deep dive + suggested fixes). Triggers: "a-ai", "ai audit", "audit ai". Pair: w-review (run before merging AI features). Artifact: .gaia/audits/a-ai/<YYYY-MM-DD>.md.'
---

# a-ai — AI feature audit

> Reference: see `reference.md` in this folder (AI patterns; migrated from `.gaia/reference/ai.md` in PR 8 of Initiative 0001).

## Quick reference

- `/a-ai` — full audit, fix mode.
- `/a-ai report` — report-only.

## Phase 0: Scope select + pre-condition

Confirm scope and mode. Verify `bun run check` is green.

## Phase 1: Read codebase + reference.md

Walk every `complete()` call site, prompt constants, streaming routes, tool-use loops.

## Phase 2: Surface findings

Per principle: prompt-as-constant, bounded calls, model-pinned, cache-hit target, stream-cancel, tool-loop bounded.

## Phase 3: Optional auto-fix or report

Most AI principles are judgment-tier; fix mode applies only to mechanical findings (literal prompts in call sites).

## Phase 4: Final gate

Re-run `bun run check`.

## Output

Mode: **fix** or **report**. Includes per-feature cache-hit rate snapshot.
