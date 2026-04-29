# .gaia/

The Gaia methodology — the substrate that makes principles discoverable and enforceable for the AI coding agent.

## What's here

| Path           | Purpose                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `vision.md`    | The locked source of truth — Gaia v7.                                           |
| `reference/`   | Preserved product references (`product/onboarding.md`, `product/retention.md`). |
| `initiatives/` | Strategic bets, 4-digit folder ordering. Index in `initiatives/CLAUDE.md`.      |
| `protocols/`   | Permissions, delegation rules.                                                  |
| `rules.ts`     | Single policy source consumed by hooks, CI, scripts.                            |
| `memory/`      | Working / episodic / personal surfaces (working + personal are gitignored).     |

The bulk of the constitution moved out of `.gaia/reference/` in Initiative 0001:

- Authoring/audit principles → `.claude/skills/<skill>/reference.md`
- Folder-scoped principles → fractal `CLAUDE.md` (e.g. `apps/api/CLAUDE.md`)

Only the product references stay here (they map to flows, not skills or folders).

## Routing — what to read for which question

| Question                          | File                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| What is Gaia?                     | `vision.md`                                                                 |
| The constitutional loop           | `../.claude/skills/d-rules/reference.md` (methodology + harness + workflow) |
| How do I write code?              | `../.claude/skills/d-code/reference.md`                                     |
| Backend conventions               | `../apps/api/CLAUDE.md`                                                     |
| Frontend conventions              | `../apps/web/CLAUDE.md`                                                     |
| Database / migrations             | `../packages/db/CLAUDE.md`                                                  |
| Design system / tokens            | `../packages/ui/CLAUDE.md`                                                  |
| Auth boundaries                   | `../packages/auth/CLAUDE.md`                                                |
| Runtime security primitives       | `../packages/security/CLAUDE.md`                                            |
| Vendor adapters                   | `../packages/adapters/CLAUDE.md`                                            |
| Security audit                    | `../.claude/skills/d-security/reference.md`                                 |
| Observability audit               | `../.claude/skills/d-observability/reference.md`                            |
| AI / Anthropic SDK audit          | `../.claude/skills/d-ai/reference.md`                                       |
| UX audit                          | `../.claude/skills/d-ux/reference.md`                                       |
| DX audit                          | `../.claude/skills/d-dx/reference.md`                                       |
| Agent experience audit            | `../.claude/skills/d-ax/reference.md`                                       |
| Brand voice                       | `../.claude/skills/d-content/reference.md`                                  |
| Deployment                        | `../.claude/skills/d-deploy/reference.md`                                   |
| Infra config (Kamal / Railway)    | `../.claude/skills/d-infra/reference.md`                                    |
| Writing SKILL.md files            | `../.claude/skills/d-skill/reference.md`                                    |
| Writing reference files           | `../.claude/skills/d-reference/reference.md`                                |
| Onboarding / activation           | `reference/product/onboarding.md`                                           |
| Retention / dunning               | `reference/product/retention.md`                                            |
| What's currently being worked on? | `initiatives/CLAUDE.md`                                                     |
| Latest data snapshot              | `initiatives/context.md`                                                    |
| What's allowed/blocked?           | `protocols/permissions.md`                                                  |

## Critical rules

- NEVER edit `vision.md` from a skill or hook. Vision changes are explicit human decisions.
- ALWAYS load the closest `CLAUDE.md` and the relevant skill `reference.md` when working in a domain.
- State-changing actions emit structured logs to Axiom (event log store), not to a `.gaia/audit/` folder.

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File      | Exports                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| rules.ts  | SkillDomain, RuleTier, Mechanism, Rule, rules, RuleId, findRule, rulesForSkill, rulesByMechanism, blockedFor, enforcedSkills |
| vision.md | Gaia                                                                                                                         |

<!-- Generated: 2026-04-29T01:45:47.322Z -->
