# .gaia/

The Gaia methodology — the substrate that makes principles discoverable and enforceable for the AI coding agent.

## What's here

| Path           | Purpose                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `vision.md`    | The locked source of truth — Gaia v6.                                                          |
| `reference/`   | The constitution. 17 reference files; load on demand by domain.                                |
| `initiatives/` | Strategic bets per workflow period (NCT-hybrid).                                               |
| `memory/`      | Three surfaces: `working/` (volatile), `episodic/` (append-only), `personal/` (per-developer). |
| `protocols/`   | Typed tool schemas, permissions, delegation rules.                                             |
| `audit/`       | Append-only structured action logs.                                                            |
| `MANIFEST.md`  | Index of folders with CLAUDE.mds and why.                                                      |
| `rules.ts`     | Single policy source consumed by hooks, CI, editors. _(Phase 2)_                               |
| `conductor.ts` | Thin Bun loop, ~200 LOC. _(Phase 2)_                                                           |

## Routing — what to read for which question

| Question                          | File                                   |
| --------------------------------- | -------------------------------------- |
| What is Gaia?                     | `vision.md`                            |
| How do I write code?              | `reference/code.md`                    |
| Backend conventions               | `reference/backend.md`                 |
| Frontend conventions              | `reference/frontend.md`                |
| Database / migrations             | `reference/database.md`                |
| Tests, coverage, mutation         | `reference/testing.md`                 |
| Error model                       | `reference/errors.md`                  |
| Security baseline                 | `reference/security.md`                |
| Logs / metrics / traces           | `reference/observability.md`           |
| CLI commands inventory            | `reference/commands.md`                |
| Design system                     | `reference/design.md`                  |
| Design tokens                     | `reference/tokens.md`                  |
| UX patterns                       | `reference/ux.md`                      |
| Developer experience              | `reference/dx.md`                      |
| Agent experience                  | `reference/ax.md`                      |
| Brand voice                       | `reference/voice.md`                   |
| Workflow loops                    | `reference/workflow.md`                |
| Harness mechanics                 | `reference/harness.md`                 |
| What's currently being worked on? | `initiatives/roadmap.md`               |
| What's the latest data snapshot?  | `initiatives/context.md`               |
| What's allowed/blocked?           | `protocols/permissions.md` _(Phase 2)_ |

## Critical rules

- NEVER edit `vision.md` from a skill or hook. Vision changes are explicit human decisions.
- NEVER auto-promote `memory/episodic/` patterns into `reference/`. v1 promotion is manual via `d-harness`.
- ALWAYS load `reference/<domain>.md` when working in that domain. Don't reason from memory.
- ALWAYS append to `audit/` for any state-changing action. The trail is the product, not a side-effect.

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File         | Exports                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| conductor.ts | LoopInput, LoopOutput, tick                                                                                                              |
| MANIFEST.md  | MANIFEST                                                                                                                                 |
| rules.ts     | ReferenceDomain, RuleTier, Mechanism, Rule, rules, RuleId, findRule, rulesForReference, rulesByMechanism, blockedFor, enforcedReferences |
| vision.md    | Gaia                                                                                                                                     |

<!-- Generated: 2026-04-28T06:43:38.474Z -->
