# Douala

The maximal SaaS template. Clone it, describe your product to AI, and let AI remove what you don't need.

Built with **Hono + Bun + Preact SSR + Drizzle + PostgreSQL**.

## What's Included

- **Auth** — Email/password + OAuth via [better-auth](https://www.better-auth.com/)
- **Payments** — Stripe subscriptions (checkout, webhooks, customer portal)
- **Email** — Transactional email via [Resend](https://resend.com/)
- **Database** — PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) (migrations, type-safe queries)
- **AI** — Anthropic Claude integration
- **Storage** — S3/R2 file uploads with signed URLs
- **Analytics** — PostHog (optional, degrades gracefully)
- **SEO** — Meta tags, JSON-LD, sitemap generation
- **Security** — Secure headers, rate limiting, input validation, harden checks
- **CI/CD** — GitHub Actions, Dockerfile, Railway deployment
- **AI Harness** — Hooks and skills for Claude Code development

## Quick Start

```bash
git clone <your-repo-url> && cd douala
bun install
docker compose up -d
cp .env.example .env  # then fill in your API keys
bun run db:migrate
bun run dev
```

Open http://localhost:3000

## The Maximal Template Philosophy

Traditional templates ship minimal boilerplate. Douala ships **everything a SaaS needs** — auth, payments, email, database, AI, storage, analytics, security, CI/CD. When you start a new project:

1. Clone Douala
2. Describe your product to an AI agent
3. AI removes what you don't need
4. Build your unique features on top

AI makes deletion near-free. See [docs/ai-workflow.md](./docs/ai-workflow.md) for details.

## Project Structure

```
platform/       Shared infrastructure (env, auth, db, server, errors)
providers/      Thin SDK wrappers (AI, email, payments, storage, analytics)
features/       Business logic grouped by domain
styles/         Global CSS with design tokens
docs/           Project documentation
decisions/      Strategy documents and reference files
```

See [docs/architecture.md](./docs/architecture.md) for the full breakdown.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Dev server with hot reload |
| `bun run check` | Full CI pipeline (lint + types + harden + test) |
| `bun run check:lint` | Biome lint only |
| `bun run check:types` | TypeScript typecheck only |
| `bun run check:test` | Tests only |
| `bun run lint` | Auto-fix lint issues |
| `bun run db:migrate` | Run database migrations |
| `bun run db:generate` | Generate new migration |
| `bun run db:studio` | Open Drizzle Studio |

## Documentation

- [Getting Started](./docs/getting-started.md) — setup guide with env var reference
- [Architecture](./docs/architecture.md) — codebase structure and patterns
- [AI Workflow](./docs/ai-workflow.md) — how to customize using AI

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Hono](https://hono.dev) |
| UI | [Preact](https://preactjs.com) SSR |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [better-auth](https://www.better-auth.com) |
| Payments | [Stripe](https://stripe.com) |
| Email | [Resend](https://resend.com) |
| AI | [Anthropic](https://anthropic.com) |
| Linting | [Biome](https://biomejs.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |

## License

MIT
