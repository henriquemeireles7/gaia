# .gaia/

The Gaia methodology — the substrate that makes principles discoverable and enforceable for the AI coding agent.

## What's here

| Path           | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `vision.md`    | The locked source of truth — Gaia v7.                            |
| `reference/`   | The constitution. ~24 reference files; load on demand by domain. |
| `initiatives/` | Strategic bets per workflow period (NCT-hybrid).                 |
| `protocols/`   | Permissions, delegation rules.                                   |
| `rules.ts`     | Single policy source consumed by hooks, CI, scripts.             |
| `domains.ts`   | Canonical domain map (planned, open spec #17).                   |

## Routing — what to read for which question

| Question                          | File                         |
| --------------------------------- | ---------------------------- |
| What is Gaia?                     | `vision.md`                  |
| How do I write code?              | `reference/code.md`          |
| Backend conventions               | `reference/backend.md`       |
| Frontend conventions              | `reference/frontend.md`      |
| Database / migrations             | `reference/database.md`      |
| Tests, coverage, mutation         | `reference/testing.md`       |
| Error model                       | `reference/errors.md`        |
| Security baseline                 | `reference/security.md`      |
| Logs / metrics / traces           | `reference/observability.md` |
| CLI commands inventory            | `reference/commands.md`      |
| Design system                     | `reference/design.md`        |
| Design tokens                     | `reference/tokens.md`        |
| UX patterns                       | `reference/ux.md`            |
| Developer experience              | `reference/dx.md`            |
| Agent experience                  | `reference/ax.md`            |
| Brand voice                       | `reference/voice.md`         |
| Workflow loops                    | `reference/workflow.md`      |
| Harness mechanics                 | `reference/harness.md`       |
| Deploying to prod                 | `reference/deployment.md`    |
| Evolving `.gaia/` itself          | `reference/methodology.md`   |
| AI features (Anthropic SDK)       | `reference/ai.md`            |
| Writing SKILL.md files            | `reference/skills.md`        |
| Writing reference files           | `reference/references.md`    |
| What's currently being worked on? | `initiatives/roadmap.md`     |
| What's the latest data snapshot?  | `initiatives/context.md`     |
| What's allowed/blocked?           | `protocols/permissions.md`   |

## Critical rules

- NEVER edit `vision.md` from a skill or hook. Vision changes are explicit human decisions.
- ALWAYS load `reference/<domain>.md` when working in that domain. Don't reason from memory.
- State-changing actions emit structured logs to Axiom (event log store), not to a `.gaia/audit/` folder.

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File      | Exports                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| rules.ts  | ReferenceDomain, RuleTier, Mechanism, Rule, rules, RuleId, findRule, rulesForReference, rulesByMechanism, blockedFor, enforcedReferences |
| vision.md | Gaia                                                                                                                                     |

<!-- Generated: 2026-04-29T01:45:47.322Z -->
