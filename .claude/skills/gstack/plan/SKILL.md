---
name: plan
description: "Plan an implementation strategy before writing code. Use when the user asks to plan, design, architect, or scope a feature."
---

# plan — implementation strategy

> **Status:** vendored placeholder. The full skill body is tracked in the `gstack-vendor` initiative.

## What this does

Designs an implementation plan before code is written. Outputs a step-by-step plan, identifies critical files, and surfaces architectural trade-offs.

## When to use

- The user asks "how should we approach X?", "design X", "plan X".
- A change spans more than ~3 files or affects multiple modules.
- The implementation has non-obvious trade-offs that should be surfaced before code is written.

## Pipeline

`w-initiative → plan → w-code → w-review → /ship`

## Verify

The plan should answer: which files change, in what order, what tests catch regressions, what's explicitly out of scope.
