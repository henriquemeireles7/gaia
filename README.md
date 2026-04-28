# Gaia

Open-source SaaS template for the agent-native era. **Idea to deployment in minutes.**

The Rails of TypeScript, redesigned for a world where agents write most of the code.

> **Status:** v6 — pre-MVP. See [`.gaia/vision.md`](./.gaia/vision.md) for the locked spec.

## What this is

Gaia is an MIT-licensed template for shipping production-grade SaaS as a solo operator. Clone it, `bun install`, deploy. Everything needed to go from zero to paying customer is wired, tested, documented, and enforceable by AI agents.

The template is the product. The course, the orchestrator, and the deployment platform are future tiers — explicitly out of scope for v1.

## Who it's for

The one-person unicorn — a solo founder who wants to build and scale a software company without a team, using AI agents as collaborators. Not indie hackers chasing $5K MRR. Operators shipping serious software alone, with agents writing most of the code.

## Stack (locked, v6)

| Layer           | Choice                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------- |
| Runtime         | [Bun](https://bun.sh)                                                                     |
| Backend         | [Elysia](https://elysiajs.com) _(swap in progress)_                                       |
| Frontend        | [SolidStart](https://start.solidjs.com) _(swap in progress)_                              |
| Type bridge     | [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html)                             |
| Validation      | [TypeBox](https://github.com/sinclairzx81/typebox) via Standard Schema                    |
| Database        | [Neon](https://neon.tech) (serverless Postgres) + [Drizzle ORM](https://orm.drizzle.team) |
| Cache / KV      | [Dragonfly](https://www.dragonflydb.io)                                                   |
| Auth            | [better-auth](https://www.better-auth.com)                                                |
| Payments        | [Polar](https://polar.sh) (merchant-of-record, solo-friendly)                             |
| Email           | [Resend](https://resend.com)                                                              |
| Background jobs | [Inngest](https://www.inngest.com)                                                        |
| Analytics       | [PostHog](https://posthog.com)                                                            |
| Errors          | [Sentry](https://sentry.io)                                                               |
| Logs/traces     | [Axiom](https://axiom.co) + [OpenTelemetry](https://opentelemetry.io)                     |
| API docs        | [Scalar](https://scalar.com)                                                              |
| Linter          | [Oxlint](https://oxc.rs) + Biome GritQL rules                                             |
| Formatter       | [oxfmt](https://oxc.rs)                                                                   |
| Test            | Bun test + [Playwright](https://playwright.dev) + [Stryker](https://stryker-mutator.io)   |
| Monorepo        | [Moon](https://moonrepo.dev) + [proto](https://moonrepo.dev/proto) + Bun workspaces       |
| Deploy          | [Railway](https://railway.app) (default)                                                  |

Full vendor reasoning lives in [`.gaia/vision.md`](./.gaia/vision.md#the-stack).

## Quick start

> **Migration in progress.** Phases 1–6 of the kaz-setup → gaia migration are landing. The current snapshot still runs on Hono/Preact while the rebuild is staged. See [`.gaia/initiatives/roadmap.md`](./.gaia/initiatives/roadmap.md) for status.

```bash
git clone https://github.com/henriquemeireles7/gaia
cd gaia
bun install
docker compose up -d  # local Postgres + (eventually) Dragonfly
cp .env.example .env  # then fill in your API keys
bun run db:migrate
bun run dev
```

Open http://localhost:3000.

## Repository layout

```
.
├── CLAUDE.md            # Root resolver — skills routing, docs routing, disciplines
├── .gaia/               # Methodology — vision, reference (constitution),
│                          initiatives (current bets), memory, protocols, audit
├── .claude/             # Claude Code home — settings, hooks, skills (gaia + gstack)
├── apps/                # api/, web/  *(arriving in Phase 3)*
├── packages/            # core/, config/, errors/, db/, adapters/, auth/, api/,
│                          ui/, security/, workflows/  *(arriving in Phase 3)*
├── content/             # Human-authored, git-tracked (blog, legal, emails)
├── tools/               # GritQL rules, custom scripts  *(arriving in Phase 6)*
├── .github/             # CI workflows
└── decisions/           # Legacy reference notes (health, maturity, deploy)
```

The visible split: **everything Gaia-methodology lives under `.gaia/`. `.claude/` holds only what Claude Code natively reads.** Root contains only `CLAUDE.md` and the actual project.

## Documentation

- [Vision](./.gaia/vision.md) — the locked v6 spec.
- [Reference](./.gaia/reference) — the 17-file constitution (code, backend, frontend, db, testing, errors, security, observability, commands, design, tokens, ux, dx, ax, voice, workflow, harness).
- [Roadmap](./.gaia/initiatives/roadmap.md) — current period commitments.
- [Manifest](./.gaia/MANIFEST.md) — index of folders with `CLAUDE.md`s.

## Scripts

| Command               | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `bun run dev`         | Dev server with hot reload.                                            |
| `bun run check`       | Full pipeline (lint + types + harden + test). Run before every commit. |
| `bun run lint`        | Auto-fix lint issues.                                                  |
| `bun run db:migrate`  | Run database migrations.                                               |
| `bun run db:generate` | Generate a new migration.                                              |
| `bun run db:studio`   | Open Drizzle Studio.                                                   |

## License

MIT. See [LICENSE](./LICENSE).
