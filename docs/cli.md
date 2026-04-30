<!-- AUTO-GENERATED — do not edit by hand. Regenerate via `bun scripts/gen-cli-docs.ts` (PR 9 of initiative 0002). -->

# CLI reference

> The Gaia CLI is published as `@gaia/cli` (with the `gaia` and `create-gaia` binaries) and is the front door of the template. Every verb shares the same standard flag set; live narration is on by default; stdout is reserved for events when `--json` is set.

## Standard flags (every verb supports)

| Flag                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `--json`              | NDJSON output on stdout (events with `event_v: 1`); narration → stderr |
| `--dry-run`           | No external side effects; verb emits the steps it WOULD have taken     |
| `--verbose` / `-v`    | Increase narration detail                                              |
| `--quiet` / `-q`      | Suppress narration; errors still print to stderr                       |
| `--yes` / `-y`        | Skip interactive confirmation prompts                                  |
| `--no-color`          | Strip ANSI; auto-disabled on non-TTY and when `NO_COLOR=1`             |
| `--no-telemetry`      | Disable anonymized first-run events                                    |
| `--ci`                | Implies `--yes --no-color --json` (CI-friendly)                        |
| `--state-file=<path>` | Override `./.gaia/state.json` location                                 |
| `--version`           | Print CLI + Bun + Node versions as JSON                                |
| `--help` / `-h`       | Per-verb help text                                                     |

## Verbs

### `bun create gaia@latest <project-slug>`

Scaffold a new Gaia project. Banner appears in <1000ms (TTHW-1 gate). Writes `.gitignore` first, then `.env.local`, then `.gaia/state.json`. Ends with a boxed "▶ Next: cd <slug> && claude" hint.

**Flags:** `--force` (overwrite existing dir), `--dry-run`, `--yes`, `--json`.

**Exit codes:** 0 success, 64 (usage error — bad slug), 65 (data error — slug shape invalid), 78 (config error — Bun too old / Windows / dir exists).

### `bun gaia verify-keys`

Read `.env.local` and verify the four provider tokens (Polar, Resend, Neon, Railway). Polar pending merchant verification and Resend domain-pending are soft warnings, not failures (per F-10). Hard failures exit 65 with a `bun gaia explain E2###` link. Updates `state.json.verified` on success.

**Flags:** all standard flags.

**Exit codes:** 0 success, 65 (≥1 blocking provider failed).

### `bun gaia deploy`

Run preflight (`bun run check`), then ship to Railway. On failure, `d-fail` classifies the error into one of seven known classes and patches the source. Three attempts with exponential backoff (1s / 4s / 16s). Pass `--with-ci` to also sync env vars to GitHub Actions secrets via `gh secret set`.

**Flags:** all standard flags + `--with-ci`.

**Exit codes:** 0 success, 65 (preflight failed), 75 (deploy failed after 3 attempts).

### `bun gaia smoke [--url=<url>]`

Run four assertions against the deployed URL: health check, auth round-trip, Polar webhook signature, dashboard load. Cookie posture (`HttpOnly`, `Secure`, `SameSite=Lax`) is asserted on the auth response. On success, prints a celebration banner with TTFD elapsed.

**Flags:** all standard flags + `--url=<base-url>` (defaults to the URL from `state.json.deploy.url`).

**Exit codes:** 0 success, 65 (≥1 assertion failed).

### `bun gaia explain [<error-code>]`

Look up an error code in the catalog. With no argument, lists every code grouped by phase namespace.

**Flags:** `--json` (machine-readable output).

**Exit codes:** 0 success, 65 (unknown code — falls back to GitHub-issue prompt).

## Error code namespaces

| Prefix  | Phase       | Examples                                           |
| ------- | ----------- | -------------------------------------------------- |
| `E0xxx` | dispatcher  | `E0001_VERB_NOT_IMPLEMENTED`, `E0002_UNKNOWN_VERB` |
| `E1xxx` | preflight   | `E1001` (Bun version), `E1002` (Windows refusal)   |
| `E2xxx` | verify-keys | `E2001_POLAR_EMPTY`, `E2010_NEON_EMPTY`            |
| `E3xxx` | deploy      | `E3001_DEPLOY_TYPECHECK`, `E3099_DEPLOY_UNKNOWN`   |
| `E4xxx` | smoke       | `E4001_SMOKE_AUTH_NO_COOKIE`, `E4009_SMOKE_HEALTH` |

Run `bun gaia explain` (no arg) for the full list.

## Examples

```bash
# Bootstrap a new project
bun create gaia@latest weekend-saas

# Verify keys with JSON output (for an agent)
bun gaia verify-keys --json --quiet

# Deploy with GitHub Actions secret sync
bun gaia deploy --with-ci

# Smoke test the live URL
bun gaia smoke --url=https://weekend-saas.up.railway.app

# Explain an error code
bun gaia explain E3001
```

## See also

- [`docs/getting-started.md`](./getting-started.md) — 15-min walkthrough.
- [`docs/architecture.md`](./architecture.md) — system shape, schema flow, observability boundaries.
- [`docs/privacy.md`](./privacy.md) — what telemetry collects + 3-tier opt-out.
