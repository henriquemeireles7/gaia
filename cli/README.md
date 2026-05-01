# create-gaia-app

Scaffolder + CLI for [Gaia](https://github.com/henriquemeireles7/gaia) — the agent-native TypeScript SaaS template.

## Quick start

```bash
bun create gaia-app@latest myapp
cd myapp
bun dev                       # mock mode — see your app at http://localhost:3000
```

The app boots in **mock mode** by default. Polar (payments), Resend (email), Anthropic (AI), and the database all run as in-process fakes so you can iterate without signing up for any vendor.

## Make it real (three on-ramps)

### Recommended (Claude Code users)

```
/w-launch                     # interview-driven onboarding — JTBD interview, first feature, your real landing
```

### CLI

```bash
bun gaia live                 # connect Polar / Resend / Neon / Railway interactively
bun gaia deploy && bun gaia smoke
```

### Just exploring

```bash
bun dev                       # see the mock app, edit code, restart, iterate
bun run dev:all               # full stack — runs API + web in parallel (signup/login work)
```

## What ships

`create-gaia-app` is one package with two binaries:

| Bin               | Used for                                                                              | Invoked by                                                                     |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `create-gaia-app` | One-shot scaffolder. Clones template, installs deps, writes `state.json`, `git init`. | `bun create gaia-app@latest <name>`                                            |
| `gaia`            | In-project verb runner: `live`, `setup`, `verify-keys`, `deploy`, `smoke`, `status`.  | `bun gaia <verb>` (resolves via the scaffolded project's `node_modules/.bin/`) |

## Verbs

| Verb                        | Purpose                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `gaia live`                 | Flip `VENDOR_MODE=mock → live`. Walks through Polar / Resend / Neon / Railway signup + token paste. Free-tier on every vendor.                |
| `gaia setup`                | Alias of `live` (back-compat with v0.2.x).                                                                                                    |
| `gaia verify-keys`          | Non-interactive: validates each provider's API key against its real API. CI-safe.                                                             |
| `gaia deploy`               | Preflight → ship to Railway. Self-heals via `d-fail` classifier when the build breaks (typecheck, env, migration, lockfile, race conditions). |
| `gaia smoke`                | Sequential checks against the deployed URL: `/health`, auth round-trip, Polar webhook, dashboard load. Confirms the deploy is actually live.  |
| `gaia status`               | Reports current `state.json` — what's verified, what's deployed, what's smoke-tested.                                                         |
| `gaia explain <error-code>` | Looks up an error code (E1001, E2003, E3005, …) and returns the cause + fix + next command in JSON.                                           |

Every verb supports the standard flag set: `--json` (NDJSON to stdout), `--quiet`, `--verbose`, `--ci`, `--yes`, `--force`, `--state-file`.

## Vendors (when you go live)

| Vendor    | Purpose                                                                              | Free tier                         |
| --------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| Polar     | Merchant-of-record payments — checkout, subscriptions, customer portal.              | Free tier (per-transaction fees). |
| Resend    | Transactional email — verify domain, send templated mail.                            | 3000 emails/month.                |
| Neon      | Serverless Postgres — separate branch per PR for safe data migrations.               | Free tier.                        |
| Railway   | Deploy host — handles build, deploy, healthcheck, and rollback.                      | $5 trial credit.                  |
| Anthropic | LLM (Claude) for AI features. Per-user daily budget enforced by `packages/security`. | Pay-as-you-go (no free tier).     |

Docs: <https://github.com/henriquemeireles7/gaia/blob/master/docs/getting-started.md>

## Requirements

- **Bun ≥1.2** (`engines.bun` is enforced). The CLI uses `#!/usr/bin/env bun` shebangs and Bun-specific APIs.
- macOS or Linux. Windows users get a clear exit-78 message pointing to WSL2.
- Optional: [Claude Code](https://claude.com/claude-code) — Gaia is built to be driven by an AI coding agent. The CLI's NDJSON event stream + typed error catalog give the agent the same observability you have. The `/w-launch` skill ships in the scaffolded project at `.claude/skills/w-launch/`.

## How `bun create gaia-app` works

`bun create gaia-app@latest <args>` is equivalent to `bunx create-gaia-app@latest <args>`. Bun rewrites the `<name>` token by prefixing `create-`, then invokes the package's default bin. This convention is shared by `npm init`, `yarn create`, and `pnpm create` — same package, four invocations.

## License

MIT — see [LICENSE](https://github.com/henriquemeireles7/gaia/blob/master/LICENSE).

## Source + docs

- Repo: <https://github.com/henriquemeireles7/gaia>
- CLI architecture: [`cli/CLAUDE.md`](https://github.com/henriquemeireles7/gaia/blob/master/cli/CLAUDE.md)
- Full template walkthrough: [`docs/cli.md`](https://github.com/henriquemeireles7/gaia/blob/master/docs/cli.md)
- File issues: <https://github.com/henriquemeireles7/gaia/issues>
