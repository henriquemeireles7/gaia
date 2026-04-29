# DX — Developer Experience

> Status: Reference
> Last verified: April 2026
> Scope: Every interaction a human developer has with Gaia — CLI, setup, docs, errors, feedback loops
> Paired with: `ax.md` (agent experience), `commands.md` (CLI command catalog), `errors.md` (error codes)

---

## What this file is

Gaia's developer experience principles and patterns. Covers how humans — solo founders, devs adopting Gaia — interact with the template: CLI, setup, docs, errors, and the feedback loops that keep flow state intact.

`ax.md` is the agent-facing counterpart. When both audiences are served by the same surface (CLI is the obvious example), principles from both apply.

The test: **would a solo founder who's never seen Gaia ship their first feature in 30 minutes?** If no, DX fails.

---

## The DX framework (from ACM Queue research)

Developer experience reduces to three dimensions:

| Dimension          | What it measures                       | How Gaia addresses                                                        |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| **Feedback loops** | Speed of response to developer actions | Sub-5s typecheck, sub-2s lint, sub-30s install, sub-5min CI               |
| **Cognitive load** | Mental effort to complete tasks        | Convention over configuration, one-job commands, colocated docs           |
| **Flow state**     | Continuous focus without interruption  | No dashboards required, errors point to fix, CLI never asks unnecessarily |

Every DX decision traces to one or more of these. If a new tool or pattern lengthens feedback loops, adds cognitive load, or breaks flow — it's a regression, even if technically better in isolation.

---

## The 12 DX principles

### Surface

**1. CLI is the primary operational surface.**
Every operation that matters is a CLI command with structured output and audit trail. Dashboards visualize; CLIs do work. `gaia deploy`, `gaia migrate`, `gaia scaffold` — no web UI required to run the product.

**2. Convention over configuration — defaults right 80% of the time.**
If a user must configure something before `bun create gaia@latest` produces a working app, the default is wrong. Every decision ships with a default; customization is an opt-in, not a prerequisite.

**3. Verb-noun subcommand structure.**
`gaia scaffold feature billing`, not `gaia --mode=scaffold --type=feature --name=billing`. Scales with additional commands without flag soup. Scriptable. Tab-completable. Readable in a log.

### Communication

**4. Every command teaches itself.**
`gaia <command> --help` is the documentation. Every flag explained. Every error has inline guidance. No "see the website for more" — the terminal is self-contained.

**5. Human-first output, machine-available on request.**
Default: readable ("Deploy finished in 2m 14s"). `--json` for automation. Never force users through `awk` or `grep` for common cases — provide a dedicated command or flag.

**6. Stdout for data, stderr for narration.**
Pipes work without wrangling. `gaia list projects | jq .` works because data goes to stdout; spinners, warnings, and progress go to stderr.

### Feedback

**7. Feedback is immediate and proportional.**
Operations >100ms: visible acknowledgment. Operations >1s: spinner or progress. Operations >10s: cancel affordance. Completion: structured message with result. Exit code 0 on success; non-zero + stderr on failure.

**8. Errors are three-part — what broke, why, what to do.**
Never "Something went wrong." Never cryptic codes as the primary message (codes go in expandable details). Every error message passes the test: can a new user act on this without reading docs?

### Safety

**9. Destructive commands dry-run or confirm.**
`gaia db reset` requires `--yes` or shows `--dry-run` preview. Destructive-by-default is a bug. Confirmations are specific: "Delete workspace 'acme-corp' and 1,247 records?" (not "Are you sure?").

### Targets

**10. First-success in under 5 minutes.**
TTHW (time-to-hello-world) is the single most important DX metric. `bun create gaia@latest my-app` → working dev server → first commit that CI accepts → under 5 minutes. Measured and tracked.

**11. Docs live where the code lives.**
Every package has a README. Every CLI command has `--help`. Every ADR in `docs/adr/`. Every runbook in `docs/runbook/`. Nothing lives in Notion, Confluence, or a Slack thread.

**12. Every feedback loop shorter than attention span.**
Typecheck <5s. Lint <2s. Single-file test <5s. Full CI <5min. `bun install` <30s. If any loop slows past threshold, it's a bug that blocks other work.

---

## CLI design specifications

### Command structure

Pattern: `gaia <verb> <noun> [args] [flags]`

```sh
gaia scaffold feature billing      # Scaffold a new feature
gaia migrate run                   # Run pending migrations
gaia migrate rollback --steps=1    # Roll back one migration
gaia deploy --env=staging          # Deploy to staging
gaia review                        # Run review pipeline
gaia ship                          # Ship to production
```

### Global flags (every command supports these)

| Flag              | Purpose                                     |
| ----------------- | ------------------------------------------- |
| `--help`, `-h`    | Show help for this command                  |
| `--version`, `-V` | Print Gaia CLI version                      |
| `--json`          | Output JSON instead of human format         |
| `--verbose`, `-v` | Verbose output (show all steps)             |
| `--quiet`, `-q`   | Suppress non-error output                   |
| `--no-color`      | Disable color output (pipes, CI)            |
| `--dry-run`       | Preview what would happen without executing |
| `--yes`, `-y`     | Skip confirmations (for scripts)            |

### Local flag conventions

- Long form is canonical: `--env=staging` (not `-e=staging`)
- Short form only for top-5 most-used flags
- Every flag has a default if possible
- No positional arguments where order matters — use named flags
- Boolean flags: `--json`, not `--json=true`
- Negation: `--no-color`, not `--color=false`

### Help output format

```
$ gaia scaffold --help

Usage: gaia scaffold <resource> [name] [flags]

Scaffold a new resource (feature, package, component, etc.).

Resources:
  feature    Vertical slice in apps/api/src/features/
  package    New workspace package in packages/
  component  UI component in packages/ui/
  adapter    External capability wrapper in packages/adapters/

Examples:
  gaia scaffold feature billing
    Scaffolds apps/api/src/features/billing/ with routes, service,
    schema, test, and index — wired into app.ts.

  gaia scaffold component button --variant=primary
    Creates packages/ui/src/button/ with 8 interaction states.

Flags:
  --dry-run       Preview without creating files
  --yes, -y       Skip confirmation
  --template      Use a custom template from .gaia/templates/
  --help, -h      Show this help
```

Three parts: **what it does** (one line), **concrete examples** (real usage), **flags** (every one explained).

### Error output format

```
$ gaia migrate run

Error: Migration 0003_add_billing_table failed.

Cause: Relation "users" does not exist in the current database.

What to do:
  1. Run migrations from the beginning: gaia migrate reset
  2. Or check connection: gaia db status
  3. Or see logs: gaia migrate run --verbose

Details:
  Migration file: packages/db/migrations/0003_add_billing_table.sql:4
  Database: postgres://***@ep-fake.neon.tech/main
  Error code: ERR_DB_MIGRATION_PRECONDITION

Exit code: 1
```

Three parts: **what**, **why**, **what to do**. Details below for debugging. Code at the end for support tickets. Non-zero exit code.

### Progress output

For operations >1s:

```
$ gaia deploy --env=production

✓ Linting                    (1.2s)
✓ Type checking              (3.4s)
✓ Running tests              (12.8s)
✓ Building                   (8.1s)
→ Deploying to Railway...    [elapsed 14s]
```

- Completed steps: `✓` + name + duration
- In-progress: `→` + name + elapsed time (updates every 500ms)
- Failed: `✗` + name + duration + reason on next line

### Color conventions (using @gaia/cli-colors)

| Color  | Usage                                    |
| ------ | ---------------------------------------- |
| Green  | Success, completion                      |
| Red    | Errors, failures                         |
| Yellow | Warnings, pending                        |
| Cyan   | Info, pointers, URLs                     |
| Dim    | Secondary info (paths, timings, details) |
| Bold   | Emphasis, key terms                      |

Colors auto-disable on non-TTY (piped output, CI without `FORCE_COLOR`).

---

## First-run experience

The most important 5 minutes in Gaia.

### Target flow (<5 minutes)

```
$ bun create gaia@latest my-app

✓ Detected Bun v2.x
✓ Created my-app/

→ What are you building?
  > A SaaS (auth + billing + dashboard)
    An internal tool (auth + data + minimal UI)
    Agent backend (API + skills + no UI yet)
    Just exploring

→ Database?
  > Neon (free tier, auto-configured)
    Local Postgres
    I'll configure later

→ Email provider?
  > Resend (free tier, auto-configured)
    SMTP
    I'll configure later

✓ Cloning template...              (3.2s)
✓ Installing dependencies...        (18.4s)
✓ Setting up Neon database...       (4.1s)
✓ Running initial migrations...     (2.3s)
✓ Generating llms.txt...            (0.4s)
✓ Creating first commit...          (0.2s)

Ready in 28 seconds.

Next:
  cd my-app
  bun dev                   # Start dev server (localhost:3000)
  gaia scaffold feature X   # Add your first feature

Read docs/reference/code.md for the 10 coding principles.
```

### What this demonstrates

- 3 intent-based questions up front (see `ux.md` §Onboarding)
- Every step timed (transparency)
- Explicit "Ready in X seconds" success moment
- Three concrete next actions, not one
- Pointer to deeper docs when ready

### What NOT to do at first run

- Ask for credit card
- Require account creation
- Show marketing content
- Take longer than 60 seconds
- Fail silently on any step
- Open a browser without asking
- Install 500MB of deps
- Show a tutorial overlay

---

## Error message craft

### The three-part framework

Every CLI error:

1. **What happened** — plain language, first sentence
2. **Why** — one-line cause, no stack trace in user output
3. **What to do** — one or more numbered actions

### Error severity levels

| Level       | When                                | Example                                                 |
| ----------- | ----------------------------------- | ------------------------------------------------------- |
| **Info**    | FYI, no action needed               | `Using cached dependencies. Run --no-cache to rebuild.` |
| **Warning** | Action recommended but not blocking | `Node 18 is EOL. Consider upgrading to 20+.`            |
| **Error**   | Blocks current command              | `Migration failed. Run: gaia db status`                 |
| **Fatal**   | Cannot continue, corrupted state    | `Config corrupt. Restore from .gaia/backup/`            |

### Good vs bad error messages

**❌ Bad:**

```
Error: ENOENT
```

**✅ Good:**

```
Error: No .gaia/rules.ts file found in current directory.

This file defines your project's rules and is required.

What to do:
  1. Run from a Gaia project root: cd /path/to/gaia-app
  2. Or initialize: gaia init --here
  3. Or see: gaia --help
```

**❌ Bad:**

```
Error: Request failed with status 500
```

**✅ Good:**

```
Error: Deploy failed — Railway API returned 500.

Cause: Upstream incident. Railway reports degraded service.

What to do:
  1. Check status: https://status.railway.app
  2. Retry in a minute: gaia deploy --retry
  3. Contact support: https://help.railway.app

Your code is unchanged. Your last successful deploy is still live.
```

### What never to do

- Stack traces as primary message (goes in `--verbose`)
- Codes without explanation (codes go in details at end)
- Humor for errors (trivializes user frustration)
- Emoji in error output (lowers signal density)
- Blaming the user ("You did X wrong")
- Silent failures (always exit non-zero on error)

---

## Feedback loops — the numbers

Every loop has a target. Miss it, we investigate.

| Loop                         | Target | Current tool                     |
| ---------------------------- | ------ | -------------------------------- |
| Install dependencies         | <30s   | Bun                              |
| Cold start dev server        | <2s    | Bun + Elysia + Vite              |
| Hot reload after file change | <500ms | Vite HMR + Bun --hot             |
| Typecheck (single file)      | <1s    | tsgo                             |
| Typecheck (full project)     | <5s    | tsgo --noEmit                    |
| Lint (single file)           | <500ms | Oxlint                           |
| Lint (full project)          | <2s    | Oxlint                           |
| Format                       | <1s    | oxfmt                            |
| Run single test              | <5s    | Bun test                         |
| Run test file                | <10s   | Bun test                         |
| Run full test suite          | <60s   | Bun test + Playwright (parallel) |
| Build for production         | <30s   | Bun + Vite                       |
| Deploy to staging            | <2min  | Railway                          |
| Full CI (PR)                 | <5min  | GitHub Actions                   |

**When loops miss target:**

1. Add to the tracking list
2. Investigate within a week
3. Either fix or document why the slower target is acceptable
4. Never normalize slowness

---

## Docs that live close to code

### What goes where

| Location               | What                                   | Audience             |
| ---------------------- | -------------------------------------- | -------------------- |
| `README.md` (root)     | Quick start, what Gaia is, links       | Newcomers            |
| `CLAUDE.md` (root)     | Global rules for agents                | Agents               |
| `docs/reference/*.md`  | Living cheat sheets per domain         | Everyone             |
| `docs/adr/*.md`        | Architectural decisions                | Maintainers          |
| `docs/spec/*.md`       | Product behavior specs                 | Implementers         |
| `docs/runbook/*.md`    | Operational procedures                 | Ops, on-call         |
| `<package>/README.md`  | What this package does, how to use it  | Users of the package |
| `<package>/CLAUDE.md`  | Local rules for agents in this package | Agents               |
| `src/**/*.ts` comments | Function-level why (not what)          | Readers of the code  |

### What does NOT go in docs

- Marketing content (goes in landing page, not repo)
- Blog posts (goes in `content/blog/`, not docs)
- Team availability (goes in Slack, not repo)
- Meeting notes (goes in Linear/Notion, not repo)
- TODOs (goes in issues, not docs)

### The docs test

A new contributor clones the repo and opens it in Claude Code. Claude reads CLAUDE.md (root), notices relevant package CLAUDE.mds, references the living cheat sheets. The contributor gets a working mental model in <10 minutes.

If Claude has to ask questions that docs could answer, the docs fail.

---

## CLI command inventory

The complete set Gaia ships. Each traces to a DX need.

### Setup & scaffold

```sh
bun create gaia@latest <name>      # Create new project
gaia init                          # Initialize in existing project
gaia scaffold feature <name>       # New feature slice
gaia scaffold package <name>       # New package
gaia scaffold component <name>     # New UI component
gaia scaffold adapter <name>       # New external adapter
gaia scaffold skill <name>         # New Claude Code skill
```

### Development

```sh
gaia dev                           # Start dev server (alias: bun dev)
gaia test [path]                   # Run tests
gaia lint [path]                   # Run linter
gaia format [path]                 # Format code
gaia typecheck                     # Run typecheck
gaia check                         # Run all quality checks
```

### Database

```sh
gaia db status                     # Connection + migration status
gaia db migrate                    # Run pending migrations
gaia db rollback [--steps=N]       # Roll back migrations
gaia db reset [--yes]              # DANGER: drop and re-migrate
gaia db seed                       # Seed with sample data
gaia db backup                     # Dump to .gaia/backups/
gaia db studio                     # Open Drizzle Studio
```

### Review & ship

```sh
gaia review                        # Run review pipeline
gaia review plan                   # Review current plan (pre-code)
gaia ship                          # Deploy to production
gaia deploy --env=<env>            # Deploy to specific env
gaia rollback                      # Roll back last deploy
```

### Maintenance

```sh
gaia upgrade                       # Upgrade Gaia CLI
gaia docs serve                    # Serve docs locally
gaia docs build                    # Build static docs
gaia llms-txt generate             # Regenerate /llms.txt
gaia audit                         # Run full security audit
gaia clean                         # Clean build artifacts
```

### Introspection

```sh
gaia status                        # Project health overview
gaia info                          # Version, config, paths
gaia rules                         # List active rules from .gaia/rules.ts
gaia context                       # Print context map (for agents)
```

Full reference in `commands.md`. Count: 28 commands. Each has `--help`. Each has one job.

---

## The DX review checklist

Before any new CLI command, setup flow, or error message ships:

- [ ] Command follows verb-noun pattern
- [ ] `--help` output: what it does + examples + flags
- [ ] Default values for every flag that can have one
- [ ] Output human-first; `--json` for automation
- [ ] Stdout for data, stderr for narration
- [ ] Progress feedback for operations >1s
- [ ] Three-part error messages (what/why/how to fix)
- [ ] Exit code 0 on success, non-zero with stderr on error
- [ ] Destructive ops require `--yes` or show `--dry-run`
- [ ] Adds no new dependencies unless essential
- [ ] Docs in the code (function comments) + in `docs/reference/` (principles)
- [ ] First-run effect measured (if onboarding-related)

If any checkbox fails, the DX isn't shipped.

---

## Measuring DX

You can't improve what you don't measure.

### Key metrics

| Metric                         | What it tells you                         | Target         |
| ------------------------------ | ----------------------------------------- | -------------- |
| **TTHW (time-to-hello-world)** | First-success speed                       | <5 min         |
| **TT1PR (time-to-first-PR)**   | When new users commit something           | <30 min        |
| **Install time**               | How fast deps resolve                     | <30s           |
| **Cold start**                 | Dev server boot                           | <2s            |
| **Full CI time**               | PR feedback latency                       | <5 min         |
| **Error recovery rate**        | % of errors users resolve without support | >80%           |
| **Command help usage**         | `--help` invocations / unique commands    | High = good DX |
| **Support ticket clustering**  | Which CLI areas generate tickets          | Trend down     |

### How to measure

- **Telemetry (opt-in, like gstack):** collect command usage, error frequency, install timing. Local-only unless user opts into community mode.
- **First-run walkthroughs:** watch 5 new users complete setup, video recorded, annotated. Do this quarterly.
- **Dogfooding:** solo maintainers build production apps on Gaia monthly. Friction surfaces.
- **Issue label:** every new issue tagged `dx` gets prioritized.

---

## Anti-patterns — what Gaia explicitly rejects

| Anti-pattern                           | Why rejected                                                     |
| -------------------------------------- | ---------------------------------------------------------------- |
| Web dashboards for routine ops         | CLI-first (principle #1); dashboard is the exception             |
| Tutorials as onboarding                | Docs are for after; first-run succeeds without them              |
| Full-screen modals in CLI              | Breaks scrollback, hostile to dev flow                           |
| Confetti / celebration animations      | AI slop, wastes attention                                        |
| Mandatory account creation             | First-run must work offline                                      |
| Phone-home at startup                  | Telemetry opt-in only                                            |
| Emojis in production output            | Signal density dropper                                           |
| Heavy install-time scripts             | <30s install is sacred                                           |
| Custom DSLs for config                 | TypeScript for config; agents already know TS                    |
| Global CLI state                       | `.gaia/` per-project; nothing in `$HOME` without explicit opt-in |
| "Are you sure?" on non-destructive ops | Cost of decision > cost of undo                                  |
| Breaking changes in patch releases     | SemVer or it doesn't ship                                        |

---

## Decisions log

| Date       | Decision                                                  | Rationale                                                                                                 |
| ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-04-02 | CLI is primary operational surface (VISION principle #13) | Agents operate via CLIs, not dashboards. Audit trail is the product, not separate.                        |
| 2026-04-02 | Convention over configuration as default                  | Rails's gift. 80% defaults right means most users never configure.                                        |
| 2026-04-19 | 12 DX principles adopted                                  | Grounded in ACM Queue DevEx framework (feedback loops + cognitive load + flow state) + gstack + clig.dev. |
| 2026-04-19 | TTHW <5 min as KPI                                        | Industry data: first-session completion is most predictive of retention. 5 min is the onboarding target.  |
| 2026-04-19 | Three-part error framework                                | What/why/how-to-fix. Error recovery rate >80% target.                                                     |
| 2026-04-19 | Feedback loop numerical targets                           | Install <30s, typecheck <5s, lint <2s, CI <5min. Missing any is a bug.                                    |
| 2026-04-19 | Verb-noun subcommand structure                            | Git/docker proven pattern. Scales. Scriptable. Tab-completable.                                           |
| 2026-04-19 | Stdout/stderr split                                       | Pipes work. `grep` and `jq` both succeed. Scripts don't break.                                            |
| 2026-04-19 | Destructive ops require `--yes` or `--dry-run`            | Destructive-by-default is a bug. Explicit opt-in for irreversibility.                                     |
| 2026-04-19 | Docs live where code lives                                | Nothing in Notion. Every package has README. Every command has --help.                                    |

---

## Cross-references

- CLI command catalog: `docs/reference/commands.md`
- Error code catalog: `docs/reference/errors.md`
- Onboarding flow: `docs/reference/ux.md` §Onboarding
- Voice in CLI output: `docs/reference/voice.md` §Microcopy
- Agent experience (the other half): `docs/reference/ax.md`
- First-run spec: `docs/spec/onboarding.md`

_DX is reviewed on every PR that touches CLI surfaces. Changes to principles or feedback-loop targets require an ADR._
