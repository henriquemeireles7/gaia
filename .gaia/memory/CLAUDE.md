# memory/

Three retention surfaces (vision §H10). Each has a different lifecycle and retrieval policy.

| Surface  | Path               | Lifecycle                           | Retrieval        |
| -------- | ------------------ | ----------------------------------- | ---------------- |
| Working  | `working/`         | Volatile, cleared per task          | Always loaded    |
| Episodic | `episodic/*.jsonl` | Append-only, kept indefinitely (v1) | Top-k by recency |
| Personal | `personal/*.md`    | Stable per-developer                | Always loaded    |

## Critical rules

- NEVER write to `working/` from a task that didn't create it.
- NEVER promote episodic patterns to `reference/` automatically. v1 promotion is manual via `d-harness`.
- ALWAYS append to `episodic/*.jsonl`; never edit existing entries.
- ALWAYS use one file per developer in `personal/` (e.g. `personal/style.md`, `personal/workflow.md`).
- `working/` is gitignored. `audit/` is gitignored. `episodic/` and `personal/` are tracked.

## Imports

This folder is read by the harness, not imported as code.
