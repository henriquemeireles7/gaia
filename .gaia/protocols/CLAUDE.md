# protocols/

The trust layer (vision §H7, §H8). Populated in Phase 2.

Will contain:

- `permissions.md` — always-allowed / requires-approval / never-allowed.
- `delegation.md` — sub-agent handoff rules.
- `tool-schemas/` — typed schemas per tool: `{ preconditions, side_effects, blocked_targets, requires_approval }`.

## Critical rules

- NEVER modify `permissions.md` from a skill or hook. It is a product decision; only humans edit.
- ALWAYS write tool schemas before the skills that use them (vision §H7).
- The `PreToolUse` hook enforces these schemas at runtime regardless of what a skill tried to do.
