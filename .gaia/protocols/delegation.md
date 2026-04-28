# delegation.md

Sub-agent handoff rules. The main agent delegates to sub-agents (Task agents in Claude Code) when:

- A task spans many files and would pollute the main context window with raw search output.
- A task is independent of the in-progress work and can run in parallel.
- A task needs an opinion that should be uninfluenced by the main agent's prior reasoning (e.g. independent code review).

## Always brief sub-agents in self-contained terms

The sub-agent does not see the main conversation. The prompt must include:

1. **Goal** — what outcome the main agent needs.
2. **Context** — what's already been ruled out, what files matter.
3. **Boundaries** — what the sub-agent should NOT do (e.g. don't write code, just report).
4. **Output shape** — structured report, word limit, file paths to cite.

## Trust contract

- The sub-agent's report describes what it intended to do, not necessarily what it did. **Verify** when the report includes file changes.
- The sub-agent inherits the parent's permissions but cannot escalate. A sub-agent cannot acquire `requires-approval` permissions the parent didn't have.
- Sub-agents do not write to `.gaia/protocols/` or `.gaia/rules.ts` regardless of permissions.

## Default sub-agent types

| Sub-agent       | Use for                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| Explore         | Multi-file reconnaissance, "where does X live", "what's the current shape of Y". |
| Plan            | Designing an implementation strategy before code is written.                     |
| general-purpose | Open-ended research that needs writes (e.g. authoring docs based on inputs).     |
