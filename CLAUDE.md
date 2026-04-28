# Project Name — Agent Instructions

## What is this
<!-- CUSTOMIZE: 1-2 sentence project description -->
<!-- Example: "MyApp is a SaaS platform. Solo developer + AI agents." -->
<!-- Example: "Stack: Bun, Hono, Preact, Drizzle, Zod, PostgreSQL." -->

## Architecture: Domain-Spec Architecture (DSA)
Every folder with code has a nested CLAUDE.md. Each has a human-authored header
(purpose, rules, imports, recipe) and an auto-generated footer (files, exports, deps).
The footer is refreshed automatically by the Stop hook whenever code in the folder changes.

When creating a new folder, create its CLAUDE.md FIRST using this template:
```markdown
# {folder-name}

## Purpose
{1-2 sentences: WHAT this does + WHY it matters architecturally}

## Critical Rules
- NEVER {most common mistake in this domain}
- ALWAYS {pattern that prevents the biggest class of errors}
- {3-5 more domain-specific NEVER/ALWAYS rules}

## Imports (use from other modules)
\```ts
import { myExport } from '@/this-module/file'
\```

## Recipe: New {most common operation}
\```ts
// minimal skeleton showing the correct shape
\```

## Verify
\```sh
{exact command to verify changes in this module}
\```
```

## Build Order (NEVER skip steps)
<!-- CUSTOMIZE: Define your project's build order -->
1. Write/update folder CLAUDE.md
2. Write/update schema (if applicable)
3. Update error definitions (if needed)
4. Update env config (if new env vars needed)
5. Write tests (MUST FAIL first)
6. Write code to pass tests
7. Refactor while tests stay green
8. Wire into UI/pages last

## Key Files You Must Know
<!-- CUSTOMIZE: List the 5-10 most important files in your project -->
<!-- Example:
1. config/env.ts — all environment variables
2. config/errors.ts — all error codes
3. db/schema.ts — all database tables
4. server/routes.ts — all API endpoints
-->

## Rules
<!-- CUSTOMIZE: Add your project rules -->
- ALWAYS run `bun run check` before committing
- 100% test coverage, no exceptions
- Tests colocated: foo.ts → foo.test.ts same folder
- No abstraction until the 3rd duplication

## Commands
<!-- CUSTOMIZE: Your project commands -->
- `bun run check` — lint + typecheck + test (run before every commit)
- `bun run dev` — start dev server
- `bun test` — run tests

## CLI & Tooling Rules
- NEVER use grep in Bash — use the Grep tool or `rg` (ripgrep)
- NEVER use find in Bash — use the Glob tool or `fd`
- NEVER use cat/head/tail in Bash to read files — use the Read tool
- Never run dev server inside Claude Code sessions — use a separate terminal

## Token Efficiency Rules
- NEVER read entire files — use Grep to find line numbers, then Read with offset/limit
- NEVER run unbounded commands — always constrain output
- NEVER run full test suite when working on one module — scope tests
- Use subagents for multi-file exploration — keeps main context clean

## Hooks System (auto-enforced)
Hooks are defined in .claude/settings.json and run automatically:
- **PreToolUse:** block dangerous commands, protect .env/secrets, protect config files
- **PostToolUse:** warn on console.log in production code, real-time security checks
- **Stop:** batch lint + typecheck on all changed files, auto-update CLAUDE.md footers, macOS notification
- **SessionStart (compact):** re-inject stack rules after context compaction

## Commit & Push Discipline
When work is done and the user confirms, run `bun run check`, then commit and push.
Do not commit after every edit — commit at logical completion points.

## Universal Reference Files (decisions/*.md)
Read the files that match your task:
- Maturity framework, principles, scoring → decisions/maturity.md
- AI harness methodology → decisions/harness.md
- Current maturity scores, bottlenecks → decisions/health.md
- Human tasks (AI-to-human) → decisions/humantasks.md
<!-- CUSTOMIZE: Add your project-specific reference files -->
<!-- Example:
- Company identity, ICP, pricing → decisions/company.md
- Content for end users → decisions/voice.md
- Architecture patterns → decisions/architecture.md
- Visual/UI/CSS/components → decisions/design.md
- Deploy, CI/CD, infrastructure → decisions/deploy.md
-->

## Contradiction Resolution
If you find contradictions between universal files, folder CLAUDE.md, or strategy docs:
1. STOP. Do not proceed with contradictory information.
2. Point out the specific contradiction and where each version lives.
3. Ask the user which is correct.
4. Update the wrong file immediately so the contradiction is gone.

## Decisions Folder (Three-Domain Structure)
```
decisions/
├── *.md                    # Universal reference files
├── product/                # Generate value
│   ├── context.md
│   └── NN-initiative/
├── growth/                 # Capture value as money
│   ├── context.md
│   └── NN-initiative/
└── harness/                # Self-evolving AI system
    ├── context.md
    └── NN-initiative/
```

## Two Session Types

### Strategy Session (1 workspace per initiative)
```
d-strategy → reviews → d-roadmap → ship
```
Interactive Q&A → initiative document → project breakdown → roadmaps.

### Execution Session (1 workspace per project)
```
Read project/roadmap.md → d-code or d-content → d-review → ship
```
TDD implementation from roadmap (d-code) or content creation (d-content).

## Skill Routing
When the user's request matches an available skill, ALWAYS invoke it:
- Strategy session, new initiative → d-strategy
- Extract projects from initiative → d-roadmap
- Implement from roadmap, start coding → d-code
- Write content (blog, handbook, social) → d-content
- Pre-commit review, check quality → d-review
- Codebase health, full audit → d-health
- Build/deploy error, learn from error → d-harness
- Deploy failed, fix the deploy → d-fail

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
