# Changelog

All notable changes to Gaia. Format adapted from [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [SemVer](https://semver.org/spec/v2.0.0.html).

The repo is pre-1.0. Breaking changes happen freely until v1.0.0.

## Unreleased

### Added

- Vision v5 carved into 7 wave-aligned initiatives in `.gaia/initiatives/`: `0004-foundation-substrate` (Wave 0a — events/hexagonal/tenancy/runtime/MCP/conversation/metering/telemetry), `0005-foundation-runtime` (Wave 0b — materialization/replicas/budgets/streaming/MCP push), `0006-projections-materialized` (Wave 1), `0007-contracts-network` (Wave 2), `0008-distribution-composer` (Wave 3), `0009-capabilities-runtime` (Wave 4), `0010-subscribers-autonomous` (Wave 5). Each follows the canonical 6-section initiative shape with hypothesis, falsifier, measurement, folder structure, PR breakdown, and decision audit trail. v5 source archived at `.gaia/initiatives/_archive/2026-04-29-vision-v5-source.md`.
- `## 3. Folder Structure` is now a required section in every initiative — ASCII tree marking `# NEW` and `# EXTENDS` paths so `d-code` can scaffold without ambiguity. `d-initiative/reference.md` documents the 6-section shape; `d-initiative/SKILL.md` template updated to match.
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

- Stub initiatives `0004-gaia-open-source-infra` (self-host Kamal) and `0005-gaia-platform-and-cms` (Stage 2a paid runtime) — deferred and superseded by the v5 wave breakdown. Material preserved in git history and the `_archive/`.
- `tools/gritql/` — the Biome GritQL drafts didn't fire in 2.4.x; replaced by `tools/ast-grep/rules/`.

## 0.1.0 — bootstrap (2026-04)

Initial commit set: kaz-setup template migrated onto the Gaia v6 stack across phases 1–8. See PR history on GitHub.
