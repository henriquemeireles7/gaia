# Changelog

All notable changes to Gaia. Format adapted from [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [SemVer](https://semver.org/spec/v2.0.0.html).

The repo is pre-1.0. Breaking changes happen freely until v1.0.0.

## [0.2.3] - 2026-04-29

Hardens initiative 0005 (Wave 0 runtime). Adds a substrate clarification (Inngest is today's runtime; the wrapper insulates from a future iii.dev migration), expands risks from 5 to 15 (replication slot leakage, replay attacks, push storms, partial-response corruption, thundering herd, snapshot/WAL gap, cross-tenant filtering), and adds §7 Hardening Specification with per-PR file lists — 147 files specified across the 13 PRs (what each does, why it exists). 24 mechanical fix rows (AD-1..AD-24) appended to the audit trail. Source: `/autoplan` Claude subagent dual review (CEO + Eng), Codex unavailable. No scope expansion.

### Changed

- `.gaia/initiatives/0005-foundation-runtime/initiative.md`: substrate clarification + 10 new risks + §7 Hardening Specification + 24 audit-trail rows. File grew from 145 to 558 lines (no scope expansion — all hardening detail).

### Fixed

- `packages/workflows/index.ts`: `inngest.createFunction` 2-arg → 3-arg shape (matches Inngest v3 SDK + the example in `packages/workflows/CLAUDE.md`).
- `apps/api/server/billing.ts`: `polar.checkouts.create` migrated to `polar.checkouts.custom.create` with `productId` + `metadata` (legacy API was deprecated; `products: [...]` field never existed).
- `packages/adapters/email.test.ts`: drop `headers: null` from Resend mock + assertion (Resend SDK response type no longer carries `headers`).

## [0.2.2] - 2026-04-29

a-health rebuild — composite dispatcher with a 12-axis vector. The kaz-era 10-session checklist is gone; a-health now runs the existing `bun run check` harness, dispatches each a-\* sibling audit (a-security, a-ai, a-ax, a-ux, a-dx, a-observability, a-perf), and aggregates findings into a vector + trend + worst-file leaderboard. New a-perf skill scaffolded so the performance axis has an owner.

### Added

- `.claude/skills/a-health/reference.md` — 10 numbered principles in canonical 5-part shape (was a 38-line stub).
- `.claude/skills/a-health/scripts/aggregate-scores.ts` — Phase 3 synthesizer; reads sibling audit reports, computes 12-axis vector + composite, runs trend against the latest prior dated report, embeds worst-file leaderboard, writes `.gaia/audits/a-health/<YYYY-MM-DD>.md`.
- `.claude/skills/a-health/scripts/trend.ts` — parses prior `## Audit History` table, emits per-axis delta + direction (improving / stable / degrading).
- `.claude/skills/a-health/scripts/worst-files.ts` — cross-audit hot-spot ranking; files in ≥3 sub-audits get a `systemic` tag.
- `.claude/skills/a-health/scripts/check-duplication.ts` — DRY detector via 5-line shingle hashing, surfaces clones with ≥3 occurrences across distinct files.
- `.claude/skills/a-health/scripts/reproducibility-stamp.ts` — captures git SHA + tool versions per audit so trend comparisons degrade gracefully across stack changes.
- `.claude/skills/a-health/scripts/quick-pulse.ts` — Stop-hook entry point; appends a one-line pulse to `.gaia/audits/a-health/pulse.jsonl` when a session touched ≥10 files.
- `.claude/skills/a-perf/{SKILL.md,reference.md}` — new performance audit skill scaffolded with 6 budget-first principles (P95 route budget, bundle budget, FK indexing, Lighthouse, no sync I/O, fetch timeouts).
- 11 new `rules.ts` entries owned by `a-health` (dispatch invariant, score formula, trend, worst-file, coverage drift, skip intelligence, report-only contract, partial-report fallback, continuous pulse, duplication budget, self-audit). `a-perf` added to the `SkillDomain` union.
- `.claude/settings.json` Stop hook fires `quick-pulse.ts` after every session.

### Changed

- `.claude/skills/a-health/SKILL.md` — collapsed from 10 unnumbered Sessions to 4 numbered Phases (pre-condition + stamp / mechanical sweep / dispatch siblings / aggregate + score + trend). Frontmatter `description` rewritten to declare dispatcher mode + tier (pulse / weekly / monthly).

### Removed

- `.claude/skills/a-health/scripts/health-coherence.ts`, `health-dead-exports.ts`, `health-architecture.ts`, `health-test-coverage.ts`, `utils.ts` — kaz-era helpers that referenced `platform/*` paths absent in gaia.

## [0.2.1] - 2026-04-29

Cleanup: `decisions/` folder retired. Operational deploy runbook (Railway config, Dockerfile rules, rollback, CLI cheatsheets) merged into `.claude/skills/w-deploy/reference.md` next to the principles it enforces. The empty `health.md` and the unfilled `maturity.md` template are gone — `a-health` now writes audits to `.gaia/audits/a-health/<YYYY-MM-DD>.md`, matching every other `a-*` skill.

### Changed

- `decisions/deploy.md` content merged into `.claude/skills/w-deploy/reference.md` as a new "Operational runbook" section. Stale rightdecision.io artifacts dropped (Stripe references, subdomain plan, personal contact info, "PostgreSQL on Railway" — Gaia uses Polar + Neon per vision §Stack).
- `a-health` audit output path: `decisions/health.md` → `.gaia/audits/a-health/<YYYY-MM-DD>.md` (consistent with `a-security`, `a-ax`, `a-ux`, etc.).
- `.gaia/reference/product/retention.md` cohort-comparison refs repointed to the new audits path.
- `.claude/hooks/reinject-context.ts` swapped the `decisions/` reminder for the skill-reference equivalent.

### Removed

- `decisions/` folder and all three files inside it (`deploy.md`, `health.md`, `maturity.md`).
- `decisions/` line from the README repository layout.

## [0.2.0] - 2026-04-29

Initiative 0011 — Skills Committee. Renames the 17 d-\* skills into three role-prefixed categories (h- harness, w- workflow, a- audit) and mechanically enforces 10 cold-start invariants. Agents now route by prefix instead of reading every skill description; the constraint linter blocks any new SKILL.md missing Mode/Tier/Artifact/Failure-modes/After fields.

### Added

- Initiative 0011 (`.gaia/initiatives/0011-skills-committee/initiative.md`) — Committee-of-Garry review + 10 cold-start invariants + h/w/a category proposal + autoplan review (CEO + Eng + DX phases) baked in.
- `scripts/measure-skill-resolution.ts` — TTHW + skill-resolution round-trip baseline measurement (Initiative 0011 PR 0).
- `scripts/check-skill-triggers.ts` — validates trigger uniqueness across Gaia skills + against gstack global namespace; runs in `bun run check`.
- `scripts/gstack-globals.txt` — snapshot of 49 gstack global skill names for collision detection.
- `## Failure modes` section on every fix-mode skill (8 skills).

### Changed

- 17 skill folders renamed to h-/w-/a- prefixes:
  - `h-skill`, `h-reference`, `h-rules` (harness — meta-authoring)
  - `w-initiative`, `w-code`, `w-write`, `w-review`, `w-deploy`, `w-debug`, `w-infra` (workflow)
  - `a-ai`, `a-ax`, `a-dx`, `a-ux`, `a-observability`, `a-security`, `a-health` (audit)
- `d-content → w-write` (rename) — frontmatter declares Mode/Tier/Artifact/After.
- `d-fail → w-debug` (rename + scope expansion) — now covers deploy + runtime + checks + bug-repro debugging with `hot-fix | forensic` tiers, not just Railway recovery.
- All 17 SKILL.md `description:` fields now declare `Mode:` (fix or report), `Tier:` (where invocation cost varies), `Triggers:`, `Voice:` (where applicable), `After:`/`Pair:`, and `Artifact:`.
- `scripts/check-skills.ts` extended with frontmatter constraint validators C3-C8 (error-mode, blocking).
- `scripts/check-skills.ts` `sibling-layout` linter now accepts `reference.md` as canonical sibling (was: only `rules-*.md`).
- `.gaia/rules.ts` `SkillDomain` enum rewritten to h-/w-/a- variants.
- `.claude/skills/w-infra/reference.md` grown from 14 lines to ~95 lines (Kamal patterns + Railway escape hatches + Docker stages + GH Actions matrix).
- Resolver tables refreshed in `CLAUDE.md`, `.gaia/CLAUDE.md`, `.gaia/vision.md`.
- 91 cross-reference files updated (skill bodies, references, scripts, hooks, runbooks).

### Fixed

- Stale references to skills deleted in Initiative 0001:
  - `d-tdd` → `w-code` (h-skill, h-reference, a-health)
  - `d-harness` → `h-rules` (decisions/health.md, decisions/deploy.md)
  - `d-roadmap` → annotated as deleted (gstack/plan, .gaia/initiatives/context.md)
- `w-debug` voice trigger `'something's wrong'` → `"something broke"` (apostrophe parser fragility).

### Removed

- Dead names from `scripts/check-skills.ts` PHASE_EXEMPT (`d-strategy`, `d-roadmap`, `d-harness` — deleted in 0001).

### Security

- `drizzle-orm` ^0.38 → ^0.45.2 (GHSA-gpj5-g38j-94v9, CVSS 7.5).
- `drizzle-kit` ^0.30 → ^0.31.10 (drops `@esbuild-kit/core-utils` → clears esbuild 0.18/0.19).
- Pinned overrides for transitive deps with no upstream release: `esbuild ^0.25.0`, `fast-xml-parser ^5.7.0` (`@aws-sdk/xml-builder` pin), `h3 ^1.15.9` (`vinxi` pin), `hono ^4.12.14`, `uuid ^14.0.0` (`svix` pin via `resend`, GHSA-w5hq-g745-h8pq). Closes osv-scanner findings on PR #54.

### Dependencies (major bumps)

- `@anthropic-ai/sdk` ^0.39 → ^0.91.1
- `@polar-sh/sdk` ^0.20 → ^0.47.1 — `polar.checkouts.custom.create` collapsed into `polar.checkouts.create({ products: [...] })`; `productId` → `products` array.
- `@sentry/node` ^9 → ^10.50 — init signature compatible.
- `@solidjs/router` ^0.15 → ^0.16.1
- `inngest` ^3 → ^4.2.5 — `createFunction(opts, trigger, handler)` collapsed into `createFunction({ ...opts, triggers: [...] }, handler)`.
- `posthog-node` ^4 → ^5.30.7
- `resend` ^4 → ^6.12.2 — `CreateEmailResponse` now includes `headers`.
- `knip` ^5 → ^6.8 (dev)
- `typescript` ^5.9 → ^6.0.3 (dev)
- Patch bumps: `@aws-sdk/client-s3` + `s3-request-presigner` 3.1030 → 3.1038, `better-auth` 1.6.2 → 1.6.9, `@types/bun` 1.3.12 → 1.3.13.

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
