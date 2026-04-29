# Gaia

Open-source SaaS template for the agent-native era. Solo operator → production in minutes.

The full vision lives in `.gaia/vision.md`. **This file is the resolver** — it routes the agent to where the answer lives, not the answer itself.

## Four engineering disciplines

These shape the agent's behavior at the point of work (vision §Harness):

1. **Think before** — read the relevant `.gaia/reference/*.md` and the local `CLAUDE.md` before writing code. The constitution exists so you don't reason from first principles every time.
2. **Simplify** — every abstraction earns its place by being more legible than what it replaces (vision §10).
3. **Surgical** — change the smallest scope that solves the problem. Bug fixes don't need cleanup; one-shots don't need helpers.
4. **Goal-driven** — every change ties to an active commitment in `.gaia/initiatives/roadmap.md`. If it doesn't, ask why we're doing it.

## Docs resolver — read on demand

| Question                     | File                                                     |
| ---------------------------- | -------------------------------------------------------- |
| What is Gaia? Who is it for? | `.gaia/vision.md`                                        |
| How do I write code?         | `.gaia/reference/code.md`                                |
| Backend conventions          | `.gaia/reference/backend.md`                             |
| Frontend conventions         | `.gaia/reference/frontend.md`                            |
| DB / migrations              | `.gaia/reference/database.md`                            |
| Tests, coverage, mutation    | `.gaia/reference/testing.md`                             |
| Error model                  | `.gaia/reference/errors.md`                              |
| Security baseline            | `.gaia/reference/security.md`                            |
| Logs / metrics / traces      | `.gaia/reference/observability.md`                       |
| CLI commands                 | `.gaia/reference/commands.md`                            |
| Design system                | `.gaia/reference/design.md`, `.gaia/reference/tokens.md` |
| UX patterns                  | `.gaia/reference/ux.md`                                  |
| Developer experience         | `.gaia/reference/dx.md`                                  |
| Agent experience             | `.gaia/reference/ax.md`                                  |
| Brand voice                  | `.gaia/reference/voice.md`                               |
| Workflow loops               | `.gaia/reference/workflow.md`                            |
| Harness mechanics            | `.gaia/reference/harness.md`                             |
| Deploying / Docker / Railway | `.gaia/reference/deployment.md`                          |
| Evolving `.gaia/` itself     | `.gaia/reference/methodology.md`                         |
| AI features (Anthropic SDK)  | `.gaia/reference/ai.md`                                  |
| Writing SKILL.md files       | `.gaia/reference/skills.md`                              |
| Writing reference files      | `.gaia/reference/references.md`                          |
| Onboarding / activation      | `.gaia/reference/product/onboarding.md`                  |
| Retention / dunning          | `.gaia/reference/product/retention.md`                   |
| Currently being worked on    | `.gaia/initiatives/roadmap.md`                           |
| Latest data snapshot         | `.gaia/initiatives/context.md`                           |
| What's allowed/blocked       | `.gaia/protocols/permissions.md`                         |

## Skills resolver — invoke as your first action

When the user's request matches one of these, invoke the skill BEFORE any other tool.

### Workflow loop (Gaia)

| Trigger                                 | Skill         |
| --------------------------------------- | ------------- |
| Start an initiative, brainstorm a bet   | `d-initiative`  |
| Extract projects from an initiative     | `d-initiative`   |
| Implement a project (TDD)               | `d-code`       |
| Write blog/handbook/social/clip content | `d-content`   |
| Pre-commit principles review            | `d-review`    |
| Deep audit, scoring, trend tracking     | `d-health`    |
| Build/deploy error → prevention rule    | ``   |
| Deploy failed → recover                 | `d-fail`      |
| Author / rewrite a reference file       | `d-reference` |
| Author / rewrite a SKILL.md             | `d-skill`     |

### Foundation (gstack, vendored under `.claude/skills/gstack/`)

| Trigger                         | Skill    |
| ------------------------------- | -------- |
| Plan an implementation strategy | `plan`   |
| Review a PR diff                | `review` |
| QA test a web app               | `qa`     |

## Build order — never skip steps

1. Read `.gaia/reference/<domain>.md` for the area you're touching.
2. Read the folder's local `CLAUDE.md` if it has one (each opens with a one-line "why this exists" preamble).
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
- ALWAYS load `.gaia/reference/<domain>.md` when working in that domain.
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

Defined in `.claude/settings.json`. Hooks enforce facts; CLAUDE.mds describe judgment (vision §4).

- **PreToolUse** — block destructive shell commands, protect secrets, protect locked configs.
- **PostToolUse** — warn on `console.log` in prod paths, real-time security checks.
- **Stop** — batch lint + typecheck on changed files, regenerate auto-footers, notify.
- **SessionStart:compact** — re-inject critical rules after context compaction.

## Contradiction protocol

If `vision.md`, a `reference/*.md`, a `CLAUDE.md`, or an initiative file disagree:

1. STOP.
2. State the contradiction with file paths.
3. Ask which is correct.
4. Update the wrong file the same turn so the contradiction is gone.
