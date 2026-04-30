# .gaia/

The Gaia methodology — the substrate that makes principles discoverable and enforceable for the AI coding agent.

## What's here

| Path           | Purpose                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `vision.md`    | The locked source of truth — Gaia v7.                                                |
| `initiatives/` | Strategic bets, 4-digit folder ordering. Index in `initiatives/CLAUDE.md`.           |
| `protocols/`   | Permissions, delegation rules.                                                       |
| `rules/`       | Policy source: `index.ts` aggregator, `skills/`, `folders/`, `checks/`, `ast-grep/`. |
| `memory/`      | Working / episodic / personal surfaces (working + personal are gitignored).          |

The bulk of the constitution lives in two surfaces (Initiative 0001):

- Authoring/audit principles → `.claude/skills/<skill>/reference.md`
- Folder-scoped principles → fractal `CLAUDE.md` (e.g. `apps/api/CLAUDE.md`)

## Routing — what to read for which question

| Question                          | File                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| What is Gaia?                     | `vision.md`                                                                 |
| The constitutional loop           | `../.claude/skills/h-rules/reference.md` (methodology + harness + workflow) |
| How do I write code?              | `../.claude/skills/w-code/reference.md`                                     |
| Backend conventions               | `../apps/api/CLAUDE.md`                                                     |
| Frontend conventions              | `../apps/web/CLAUDE.md`                                                     |
| Database / migrations             | `../packages/db/CLAUDE.md`                                                  |
| Design system / tokens            | `../packages/ui/CLAUDE.md`                                                  |
| Auth boundaries                   | `../packages/auth/CLAUDE.md`                                                |
| Runtime security primitives       | `../packages/security/CLAUDE.md`                                            |
| Vendor adapters                   | `../packages/adapters/CLAUDE.md`                                            |
| Security audit                    | `../.claude/skills/a-security/reference.md`                                 |
| Observability audit               | `../.claude/skills/a-observability/reference.md`                            |
| AI / Anthropic SDK audit          | `../.claude/skills/a-ai/reference.md`                                       |
| UX audit                          | `../.claude/skills/a-ux/reference.md`                                       |
| DX audit                          | `../.claude/skills/a-dx/reference.md`                                       |
| Agent experience audit            | `../.claude/skills/a-ax/reference.md`                                       |
| Brand voice                       | `../.claude/skills/w-write/reference.md`                                    |
| Deployment                        | `../.claude/skills/w-deploy/reference.md`                                   |
| Infra config (Kamal / Railway)    | `../.claude/skills/w-infra/reference.md`                                    |
| Writing SKILL.md files            | `../.claude/skills/h-skill/reference.md`                                    |
| Writing reference files           | `../.claude/skills/h-reference/reference.md`                                |
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

<!-- Generated: 2026-04-29T10:42:32.453Z -->
