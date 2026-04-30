# create-gaia

Scaffolder + CLI for [Gaia](https://github.com/henriquemeireles7/gaia) — the agent-native TypeScript SaaS template.

## Quick start

```bash
bun create gaia@latest myapp
cd myapp
bun gaia setup            # paste your 4 API keys (or `--ci` to skip prompts)
bun gaia deploy && bun gaia smoke
```

That's the full flow: clone → install → wire vendor keys → deploy to Railway → smoke test the live URL. Target time-to-live URL: **<30 minutes** on a fresh machine.

## What ships

`create-gaia` is one package with two binaries:

| Bin           | Used for                                                                                | Invoked by                                                                     |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `create-gaia` | One-shot scaffolder. Clones the template, installs deps, writes `state.json`.           | `bun create gaia@latest <name>`                                                |
| `gaia`        | In-project verb runner: `setup`, `verify-keys`, `deploy`, `smoke`, `status`, `explain`. | `bun gaia <verb>` (resolves via the scaffolded project's `node_modules/.bin/`) |

## Verbs

| Verb                        | Purpose                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `gaia setup`                | Interactive flow — paste vendor keys, write `.env.local`, validate everything boots.                                                          |
| `gaia verify-keys`          | Non-interactive equivalent for CI. Validates Polar / Resend / Neon / Railway tokens against each provider.                                    |
| `gaia deploy`               | Preflight → ship to Railway. Self-heals via `d-fail` classifier when the build breaks (typecheck, env, migration, lockfile, race conditions). |
| `gaia smoke`                | Sequential checks against the deployed URL: `/health`, auth round-trip, Polar webhook, dashboard load. Confirms the deploy is actually live.  |
| `gaia status`               | Reports current `state.json` — what's verified, what's deployed, what's smoke-tested.                                                         |
| `gaia explain <error-code>` | Looks up an error code (E1001, E2003, E3005, …) and returns the cause + fix + next command in JSON.                                           |

Every verb supports the standard flag set: `--json` (NDJSON to stdout), `--quiet`, `--verbose`, `--ci`, `--yes`, `--force`, `--state-file`.

## Requirements

- **Bun ≥1.2** (`engines.bun` is enforced). The CLI uses `#!/usr/bin/env bun` shebangs and Bun-specific APIs.
- macOS or Linux. Windows users get a clear exit-78 message pointing to WSL2.
- Optional: [Claude Code](https://claude.com/claude-code) — Gaia is built to be driven by an AI coding agent. The CLI's NDJSON event stream + typed error catalog give the agent the same observability you have.

## How `bun create gaia` works

`bun create gaia@latest <args>` is equivalent to `bunx create-gaia@latest <args>`. Bun rewrites the `<name>` token by prefixing `create-`, then invokes the package's default bin. This convention is shared by `npm init`, `yarn create`, and `pnpm create` — same package, four invocations.

## License

MIT — see [LICENSE](https://github.com/henriquemeireles7/gaia/blob/master/LICENSE).

## Source + docs

- Repo: https://github.com/henriquemeireles7/gaia
- CLI architecture: [`cli/CLAUDE.md`](https://github.com/henriquemeireles7/gaia/blob/master/cli/CLAUDE.md)
- Full template walkthrough: [`docs/cli.md`](https://github.com/henriquemeireles7/gaia/blob/master/docs/cli.md)
- File issues: https://github.com/henriquemeireles7/gaia/issues
