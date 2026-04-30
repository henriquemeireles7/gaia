# cli/

The Gaia CLI — published as `@gaia/cli` (and registered as the `gaia` and `create-gaia` npm bins). This is the front door of initiative 0002: a developer runs `bun create gaia@latest <name>` and the scaffolder takes them from `git clone` to live URL in ≤30 minutes.

## Folder layout

| Path                    | Purpose                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `package.json`          | Standalone npm package, published independently. `bin` exposes `gaia` (verb dispatcher) and `create-gaia` (scaffolder).    |
| `src/cli.ts`            | Entry point for `bun gaia <verb>`. Dispatches to verbs/. Standard flag parsing + Windows refusal.                          |
| `src/create.ts`         | Scaffolder: preflight → banner → clone template → install → init `.gitignore` first → write `state.json` → next-step hint. |
| `src/preflight.ts`      | Bun version, platform, write-permission (sentinel write to detect EROFS), dir-exists checks. Typed E1xxx codes.            |
| `src/template.ts`       | Resolves the template directory (in-source detection, git-clone fallback, 60s timeout).                                    |
| `src/state.ts`          | TypeBox v1 state.json — atomic write (tmp + fsync + rename), file lock with PID recovery, sweep stale tmp files.           |
| `src/state.schema.ts`   | Duplicated TypeBox `StateSchemaV1` (the CLI is standalone-publishable, so schema cannot import from `.gaia/protocols/`).   |
| `src/exit-codes.ts`     | POSIX exit-code constants (0/1/2/64/65/69/70/75/77/78).                                                                    |
| `src/flags.ts`          | Standard flag parser — `--json`, `--quiet`, `--verbose`, `--ci`, `--yes`, `--force`, `--state-file`. Precedence-tested.    |
| `src/events.ts`         | NDJSON emitter (`event_v: 1`) — stdout when `--json`, otherwise no-op. Run-id generator.                                   |
| `src/telemetry.ts`      | Allowlisted telemetry sink. Drift-gated against `.gaia/protocols/cli.ts` allowlist.                                        |
| `src/_spawn.ts`         | Shared subprocess runner — `timeoutMs`, `forwardSignals` (SIGINT/SIGTERM), `RunResult` shape.                              |
| `src/ui/banner.ts`      | The TTHW-1 banner. Must render in <1000ms from CLI start (gated by `cli/test/banner.test.ts`).                             |
| `src/ui/narrate.ts`     | Live narrator — stderr default, catalog-miss observability, inline fix hints from `errors/catalog.ts`.                     |
| `src/errors/catalog.ts` | Error code catalog (E0xxx dispatcher, E1xxx preflight, E2xxx verify, E3xxx deploy, E4xxx smoke).                           |
| `src/providers/`        | Verifier modules per provider (polar, resend, neon, railway). Each exports `verify` + `setupInfo`.                         |
| `src/deploy/`           | `runner.ts` (spawn), `classifier.ts` (7 d-fail classes), `retry.ts` (backoff), `sync-ci.ts` (gh secrets).                  |
| `src/smoke/`            | `assertions.ts` — sequential smoke checks against the deployed URL.                                                        |
| `src/verbs/*.ts`        | One file per verb (`verify-keys`, `setup`, `deploy`, `smoke`, `status`, `explain`).                                        |
| `test/*.test.ts`        | Unit tests + cassette tests for verbs.                                                                                     |

## Critical rules (cli-specific)

- **Standalone publishable.** This package MUST work installed alone via `npm i -g @gaia/cli` with no monorepo context. Do NOT import from `@gaia/*` workspace packages — copy the code or duplicate the type. The CLI has its own minimal dependency tree.
- **`.gitignore` before state.json.** The scaffolder writes `.gitignore` as the FIRST file. State.json and `.env.local` come AFTER. This invariant is unit-tested (AD-AP-17).
- **No secrets in `state.json`.** State holds env-var **names**, never values (AD-AP-18). Validated by `scripts/check-state-json-no-secrets.ts` (lands in PR 3).
- **TTHW-1 < 1000ms.** Banner must appear in <1s from `bun create gaia@latest` exec. Benchmark gate in `cli/test/banner.test.ts`.
- **Live narration default-on** (PR 3). Stderr human narration; stdout = clean events. `--quiet` opts out; `--json` switches stdout to NDJSON.
- **Exit codes are POSIX-aligned.** 0 success, 1 generic, 2 usage, 64 EX_USAGE, 65 EX_DATAERR, 69 EX_UNAVAILABLE, 70 EX_SOFTWARE, 75 EX_TEMPFAIL, 77 EX_NOPERM, 78 EX_CONFIG.
- **Windows refusal.** v1 supports macOS and Linux. Windows users get exit 78 with WSL2 message until v1.1 (AD-AP-24).

## Initiative

This package implements `0002-gaia-bootstrap/initiative.md` PR 2-7. PR 2 is the skeleton + create scaffolder + preflight. PR 3 wires the typed protocol + agent primitives + telemetry. PRs 4-6 add the three onboard verbs. PR 7 adds `bun gaia explain` + the error catalog.

## Subprocess discipline

Every external command goes through `src/_spawn.ts` (`runCommand`). Direct `spawnSync` / `spawn` calls outside the helper require justification — the helper enforces:

- A timeout (no orphaned children: 60s git clone, 30s gh / quick checks, 5min preflight, 12min deploy)
- SIGINT/SIGTERM forwarding (so Ctrl-C in the parent kills the child)
- A typed `RunResult` (`{exitCode, stdout, stderr, timedOut, durationMs}`)

If a verb spawns a subprocess and you skip these guarantees, `d-fail/surfaced-cleanly` will eventually catch you with a hung CI run.
