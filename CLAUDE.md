# Gaia

Open-source SaaS template for the agent-native era. Solo operator → production in minutes.

The full vision lives in `.gaia/vision.md`. **This file is the resolver** — it routes the agent to where the answer lives, not the answer itself.

## Four engineering disciplines

These shape the agent's behavior at the point of work (vision §Harness):

1. **Think before** — read the relevant skill `reference.md` and the closest `CLAUDE.md` before writing code. The constitution exists so you don't reason from first principles every time.
2. **Simplify** — every abstraction earns its place by being more legible than what it replaces (vision §10).
3. **Surgical** — change the smallest scope that solves the problem. Bug fixes don't need cleanup; one-shots don't need helpers.
4. **Goal-driven** — every change ties to an active commitment in `.gaia/initiatives/CLAUDE.md`. If it doesn't, ask why we're doing it.

## Docs resolver — read on demand

Principles live in two surfaces:

- **Skill references** at `.claude/skills/<skill>/reference.md` — verb-scoped (auto-loaded by the `skill-reference` hook on Skill invocation).
- **Fractal CLAUDE.md** at the folder where the principle applies — folder-scoped (auto-loaded by the `domain-context` hook on file edit, walking the tree to repo root).

| Question                      | Where it lives                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------- |
| What is Gaia? Who is it for?  | `.gaia/vision.md`                                                               |
| How do I write code?          | `.claude/skills/w-code/reference.md` (code + testing + errors merged)           |
| Backend conventions           | `apps/api/CLAUDE.md`                                                            |
| Frontend conventions          | `apps/web/CLAUDE.md`                                                            |
| Database / migrations         | `packages/db/CLAUDE.md`                                                         |
| Design system + tokens        | `packages/ui/CLAUDE.md`                                                         |
| Auth boundaries               | `packages/auth/CLAUDE.md`                                                       |
| Runtime security primitives   | `packages/security/CLAUDE.md`                                                   |
| Vendor adapters               | `packages/adapters/CLAUDE.md`                                                   |
| Security audit                | `.claude/skills/a-security/reference.md` (audit) — invoke `/a-security`         |
| Logs / metrics / traces audit | `.claude/skills/a-observability/reference.md` — invoke `/a-observability`       |
| AI / Anthropic SDK audit      | `.claude/skills/a-ai/reference.md` — invoke `/a-ai`                             |
| UX patterns audit             | `.claude/skills/a-ux/reference.md` — invoke `/a-ux`                             |
| DX audit                      | `.claude/skills/a-dx/reference.md` — invoke `/a-dx`                             |
| Agent experience audit        | `.claude/skills/a-ax/reference.md` — invoke `/a-ax`                             |
| Brand voice                   | `.claude/skills/w-write/reference.md`                                           |
| Deployment                    | `.claude/skills/w-deploy/reference.md`                                          |
| Infra config (Kamal/Railway)  | `.claude/skills/w-infra/reference.md`                                           |
| The constitutional loop       | `.claude/skills/h-rules/reference.md` (methodology + harness + workflow merged) |
| Writing SKILL.md files        | `.claude/skills/h-skill/reference.md`                                           |
| Writing reference files       | `.claude/skills/h-reference/reference.md`                                       |
| Onboarding / activation       | `.gaia/reference/product/onboarding.md`                                         |
| Retention / dunning           | `.gaia/reference/product/retention.md`                                          |
| Currently being worked on     | `.gaia/initiatives/CLAUDE.md` (6-row index of 0001–0006)                        |
| Latest data snapshot          | `.gaia/initiatives/context.md`                                                  |
| What's allowed/blocked        | `.gaia/protocols/permissions.md`                                                |

## Skills resolver — invoke as your first action

When the user's request matches one of these, invoke the skill BEFORE any other tool.

### Workflow loop (Gaia)

| Trigger                                     | Skill          |
| ------------------------------------------- | -------------- |
| Start an initiative, brainstorm a bet       | `w-initiative` |
| Implement a project (TDD)                   | `w-code`       |
| Write blog/handbook/social/clip content     | `w-write`      |
| Pre-commit principles review                | `w-review`     |
| Deep audit, scoring, trend tracking         | `a-health`     |
| Deploy after gstack /ship                   | `w-deploy`     |
| Deploy failed / runtime crash / bug → debug | `w-debug`      |
| Author / rewrite a SKILL.md                 | `h-skill`      |
| Author / rewrite a reference                | `h-reference`  |
| Emit rules.ts entries from a reference      | `h-rules`      |

### Audit skills (invoked explicitly)

| Trigger                          | Skill             |
| -------------------------------- | ----------------- |
| Security audit                   | `a-security`      |
| AI feature audit (Anthropic SDK) | `a-ai`            |
| Agent experience audit           | `a-ax`            |
| User experience audit            | `a-ux`            |
| Observability audit              | `a-observability` |
| DX audit                         | `a-dx`            |
| Infra config                     | `w-infra`         |

### Foundation (gstack, vendored under `.claude/skills/gstack/`)

| Trigger                         | Skill    |
| ------------------------------- | -------- |
| Plan an implementation strategy | `plan`   |
| Review a PR diff                | `review` |
| QA test a web app               | `qa`     |

## Build order — never skip steps

1. Read the relevant skill `reference.md` (auto-loaded on Skill invocation).
2. Read the folder's local `CLAUDE.md` (auto-loaded on file edit; walks the tree to repo root).
3. Update schema (if applicable).
4. Update error definitions (if needed).
5. Update env config (if new env vars).
6. Write tests (must fail first).
7. Write code to pass tests.
8. Refactor while tests stay green.
9. Wire into UI/pages last.

## Always-on rules

- ALWAYS run `bun run check` before committing (lint + typecheck + test).
- 100% test coverage at boundaries; mutation testing in the middle (vision §11).
- Tests colocated: `foo.ts` → `foo.test.ts` in the same folder.
- No abstraction until the third duplication.
- ALWAYS load the closest `CLAUDE.md` and the relevant skill `reference.md` when working in a domain.
- NEVER force-push to `master`. NEVER skip hooks. See `.gaia/protocols/permissions.md`.

## CLI rules

- NEVER use `grep` in Bash — use the Grep tool or `rg`.
- NEVER use `find` in Bash — use the Glob tool or `fd`.
- NEVER use `cat`/`head`/`tail` in Bash to read files — use the Read tool.
- Never run the dev server inside Claude Code sessions — use a separate terminal.

## Token efficiency

- NEVER read entire files — Grep for line numbers, then Read with `offset`/`limit`.
- NEVER run unbounded commands — always constrain output.
- Prefer subagents (Explore) for multi-file reconnaissance.

## Hooks (auto-enforced, Bun TypeScript)

Defined in `.claude/settings.json`. Hooks enforce facts; CLAUDE.mds describe judgment.

- **PreToolUse** — block destructive shell commands, protect secrets, protect locked configs, walk fractal CLAUDE.md tree on edit, advise reading sibling `reference.md` on Skill invocation.
- **PostToolUse** — warn on `console.log` in prod paths, real-time security checks.
- **Stop** — batch lint + typecheck on changed files, regenerate auto-footers, notify.
- **SessionStart:compact** — re-inject critical rules after context compaction.

## Contradiction protocol

If `vision.md`, a `reference.md`, a `CLAUDE.md`, or an initiative file disagree:

1. STOP.
2. State the contradiction with file paths.
3. Ask which is correct.
4. Update the wrong file the same turn so the contradiction is gone.
