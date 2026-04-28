---
name: review
description: "Pre-landing PR review. Analyzes a diff against the base branch for SQL safety, LLM trust boundary violations, conditional side effects, and structural issues. Triggers: 'review', 'check my diff', 'pre-landing review'."
---

# review — pre-landing PR review

> **Status:** vendored placeholder. The full skill body is tracked in the `gstack-vendor` initiative.

## What this does

Independent diff review against the base branch. Flags:

- SQL safety (parameterization, N+1 queries, missing indexes).
- LLM trust boundary violations (untrusted input flowing to a tool call).
- Conditional side effects (state changes inside a branch the test doesn't cover).
- Structural issues (sibling imports, missing CLAUDE.md updates, dependency-direction violations).

## Pipeline

Per vision §W9, **`d-review` runs first** (principles review). `review` runs after on principles-passing diffs.

`d-tdd → d-review → review → /ship`

## Verify

`review` reports pass/fail with structured findings. Failing findings block merge.
