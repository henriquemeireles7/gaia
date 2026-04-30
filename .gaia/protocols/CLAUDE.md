# protocols/

The trust layer (vision §H7, §H8).

Contains:

- `permissions.md` — always-allowed / requires-approval / never-allowed.
- `delegation.md` — sub-agent handoff rules.

Tool schemas (`tool-schemas/`) are deferred until conductor.build ships a runtime that consumes them.

## Critical rules

- NEVER modify `permissions.md` or `delegation.md` from a skill or hook (enforced by `harness/permissions-immutable` rule). Only humans edit.
- The `PreToolUse` hook enforces permissions at runtime regardless of what a skill tried to do.

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File           | Exports        |
| -------------- | -------------- |
| delegation.md  | delegation.md  |
| permissions.md | permissions.md |

<!-- Generated: 2026-04-29T09:10:35.022Z -->
