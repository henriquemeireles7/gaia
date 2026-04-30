# Privacy

Gaia's CLI emits anonymized first-run telemetry to help us catch cold-start failures across machines we never see. This page documents exactly what's collected, what isn't, and how to opt out.

## What's collected

The CLI may emit these PostHog events:

| Event               | When                                   | Properties                             |
| ------------------- | -------------------------------------- | -------------------------------------- |
| `cli.create.start`  | First line of `bun create gaia@latest` | verb, cli_version, os, bun_version     |
| `cli.verb.start`    | Each verb invocation begins            | verb, cli_version                      |
| `cli.verb.complete` | Each verb invocation succeeds          | verb, duration_ms, exit_code           |
| `cli.verb.error`    | Each verb invocation fails             | verb, error_class, error_code, attempt |
| `cli.first_run`     | Once per machine (anonymized hash)     | os, bun_version, machine_id_hash       |
| `cli.ttfd`          | After `bun gaia smoke` succeeds        | duration_ms                            |

## What's NOT collected

The implementation uses an **allowlist** — anything outside the list above is stripped before send. Specifically:

- ❌ Project names, slugs, repository names
- ❌ Paths (no filesystem leaks)
- ❌ Env values (never read; the CLI sees env-var **names** only via state.json)
- ❌ Stack traces with file paths
- ❌ Hostname or username (only an irreversible hash, see below)
- ❌ IP addresses (PostHog `disable_geoip: true`; no `$ip` field set)
- ❌ Any field not listed in `cli/src/telemetry.ts:TELEMETRY_ALLOWLIST`

Tests (`cli/test/telemetry.test.ts`) assert the allowlist is enforced — sending a non-allowlisted field results in it being dropped, not transmitted.

## Machine identifier

`machine_id_hash` is derived from `sha256(hostname + uid + 'gaia-cli-v1').slice(0, 16)`. The raw values never leave the local process. The salt prevents cross-application correlation if other tools try the same approach.

## Opt-out (3-tier)

Any of these disables telemetry. Highest precedence wins.

### 1. Environment variable

```bash
export GAIA_TELEMETRY=off
```

Works for a single shell session. Set in your shell rc (`.zshrc` / `.bashrc`) for persistence.

### 2. Per-invocation flag

```bash
bun gaia verify-keys --no-telemetry
```

Disables telemetry for that one run.

### 3. Persistent config file

```bash
mkdir -p ~/.gaia
echo '{ "telemetry": false }' > ~/.gaia/config.json
```

Persists across all CLI runs on this machine.

## How we use the data

We use the events to:

1. **Detect cold-start failure rates.** If 30% of `cli.first_run` events are followed by `cli.verb.error: env-var` within 60s, we know `.env.local` is confusing — and we'd never see that without telemetry.
2. **Measure TTFD distribution.** The `cli.ttfd` event tells us whether the "30-min" claim holds in practice.
3. **Prioritize bug fixes.** `cli.verb.error` events with high `attempt` values reveal which `d-fail` classes are too narrow.

We do **not** use the data for marketing, lead generation, or to identify individual users.

## Storage + retention

Events are stored in PostHog (a single project; the API key is in `cli/src/telemetry.ts` and only writes events — no PII). Retention follows PostHog's default (currently 365 days for self-hosted, 7 years for PostHog Cloud Personal — adjustable in the project settings).

## Verifying

Want to see exactly what would be sent? Run any verb with `--verbose`:

```bash
bun gaia verify-keys --verbose
```

Telemetry events are buffered in-process during PR 3; a dump line prints at exit. PR 11 wires the actual PostHog flush — until then, no events leave your machine.

## Source

The full implementation is in [`cli/src/telemetry.ts`](../cli/src/telemetry.ts). The allowlist constant (`TELEMETRY_ALLOWLIST`) is the contract — anything not listed is stripped.

## Questions

Open an issue at [`https://github.com/henriquemeireles7/gaia/issues`](https://github.com/henriquemeireles7/gaia/issues) with the `privacy` label.
