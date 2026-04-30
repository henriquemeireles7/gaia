# Changelog

All notable changes to Gaia. Format adapted from [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [SemVer](https://semver.org/spec/v2.0.0.html).

The repo is pre-1.0. Breaking changes happen freely until v1.0.0.

## Unreleased

### Added — initiative 0002 (gaia-bootstrap)

- **README rewrite** with locked sections (hero ≤10 lines, demo placeholder, 4-step Quick start, "What you get" matrix, FAQ-of-5). Removed deprecated `decisions/` / "Migration in progress" / `.gaia/MANIFEST.md` references. (PR 1)
- **GitHub repo metadata** — fixed stale "Douala" name in issue templates; tightened pull_request_template; added `.github/FUNDING.yml`; placeholder `docs/assets/hero.svg` + `docs/assets/README.md`. (PR 1)
- **`scripts/check-readme.ts`** wired into `bun run check:scripts` — enforces locked-section structure + bans deprecated references. (PR 1)
- **`cli/` standalone-publishable package** (`@gaia/cli`) with `bin: { gaia, create-gaia }`, Bun ≥1.2 engine constraint. Workspace member. (PR 2)
- **`bun create gaia@latest <slug>` scaffolder** with banner (TTHW-1 <1000ms benchmark gate), `.gitignore`-first ordering invariant, `.env.local` template (no values), `.gaia/state.json` (env-var names only), boxed "▶ Next: cd <slug> && claude" hand-off. (PR 2)
- **Preflight checks** — Bun version (E1001), Windows refusal with WSL2 message (E1002), dir-exists semantics (E1003), write-permission probe (E1004). (PR 2)
- **`.gaia/protocols/cli.ts`** — TYPE-ONLY contract: verb registry, POSIX exit codes, NDJSON event names, TypeBox `StateSchemaV1`. Hooks may import; runtime stays in `cli/src/`. (PR 3)
- **CLI agent-native primitives** — `cli/src/{events,state,flags,exit-codes,telemetry}.ts` + `cli/src/ui/narrate.ts` (default-on stderr narration with steady-stream timestamps). NDJSON event_v: 1. State.json with TypeBox v1 schema, atomic write (tmp+rename), file lock. POSIX exit codes (0/1/2/64/65/69/70/75/77/78). (PR 3)
- **Telemetry** — anonymized first-run events with allowlist enforcement, irreversible `machine_id_hash`, 3-tier opt-out (env / flag / config). PostHog wiring deferred to v1.0 publish. (PR 3)
- **`scripts/check-state-json-no-secrets.ts`** — CI gate scanning state.json for known secret-shape prefixes (case-sensitive, lowercase real prefixes vs uppercase env-var names). (PR 3)
- **`bun gaia verify-keys`** — sequential provider verification (Polar, Resend, Neon, Railway) with mockable `Fetcher` injection. Soft warnings (Polar pending merchant verify, Resend domain DNS) per F-10. Updates `state.json.verified`. (PR 4)
- **`bun gaia deploy`** — preflight → Railway deploy → 7-class failure classifier → `d-fail` subprocess → 3-attempt cap with exponential backoff (1s/4s/16s) → optional `--with-ci` for `gh secret set` sync. (PR 5)
- **`bun gaia smoke`** — 4 assertions (health check, auth round-trip with `Set-Cookie` posture, Polar webhook signature, dashboard load). Celebration banner with TTFD elapsed on success. (PR 6)
- **`bun gaia explain <code>`** + error catalog — 21 entries across E0xxx-E4xxx namespaces. Each entry has cause/fix/docs/next-command. Falls back to GitHub-issue prompt for unknown codes. (PR 7)
- **Fresh-clone CI matrix** — `.github/workflows/e2e-fresh-clone.yml` (ubuntu-latest + macos-latest, 12-min budget) + `scripts/e2e-fresh-clone.ts` orchestrator. Live-deploy assertions gated to nightly via `GAIA_E2E_LIVE=1`. (PR 8)
- **`scripts/check-env-example-parity.ts`** — fails CI when EnvSchema and `.env.example` drift. 11 required + 14 optional keys aligned at v0.1. (PR 8)
- **Docs surface** — `docs/getting-started.md` (7-section walkthrough), `docs/cli.md` (auto-regenerable verb reference), `docs/architecture.md` (agent-tagged headings), `docs/contributing.md` (skills + upstream sync), `docs/privacy.md` (telemetry posture + 3-tier opt-out), `docs/CLAUDE.md` (folder context), `scripts/gen-cli-docs.ts` stub. (PR 9)
- **Demo recording tape** + launch checklist — `docs/assets/demo.tape` (vhs.charm.sh script using `--dry-run` mode for deterministic playback), `docs/launch.md` (founder-gate criteria + post-launch task list). (PR 10)

### Changed

- `packages/security/harden-check.ts` — added `cli/` to the `no-raw-env` exemption list (mirrors `scripts/`/`.claude/` — CLI runs on developer's machine, not in deployed app, and the standalone-publishable rule forbids `@gaia/config/env` import).
- Root `package.json` workspaces — added `cli` so the workspace resolver sees the new package.
- `.gaia/initiatives/0002-gaia-bootstrap/initiative.md` — full hardening pass via `/autoplan` (CEO + Eng + DX subagent reviews; codex unavailable due to model auth). 28 audit-trail rows added covering cross-phase themes A-G + 17 individual hardening findings.

### Earlier (also Unreleased)

- ast-grep replaces the broken Biome GritQL plugin path. 4 active rules in `tools/ast-grep/rules/`.
- `packages/security/{protected-route,public-route,security-headers,audit-log}.ts` — vision §Backend-5 middleware.
- `packages/ui/tokens.ts` + generated `styles.css` — three-tier design tokens (vision §Stack, tokens.md).
- Moon orchestration scaffolding (`.moon/workspace.yml`, per-project `moon.yml`).
- ADR directory at `.gaia/adrs/` with template + first decision (`0001-ast-grep-over-gritql.md`).

### Changed

- Removed Biome (`linter` + `formatter` were already disabled; the package now serves no role).
- knip flipped from advisory to a real CI gate.
- Five script-tier rules now active (`check-manifest`, `check-skills`, `validate-artifacts`, `check-tests-exist`).

### Removed

- `tools/gritql/` — the Biome GritQL drafts didn't fire in 2.4.x; replaced by `tools/ast-grep/rules/`.

## 0.1.0 — bootstrap (2026-04)

Initial commit set: kaz-setup template migrated onto the Gaia v6 stack across phases 1–8. See PR history on GitHub.
