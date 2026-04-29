# Changelog

All notable changes to Gaia. Format adapted from [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [SemVer](https://semver.org/spec/v2.0.0.html).

The repo is pre-1.0. Breaking changes happen freely until v1.0.0.

## [0.2.0] - 2026-04-29

Initiative 0006 — Skills Committee. Renames the 17 d-\* skills into three role-prefixed categories (h- harness, w- workflow, a- audit) and mechanically enforces 10 cold-start invariants. Agents now route by prefix instead of reading every skill description; the constraint linter blocks any new SKILL.md missing Mode/Tier/Artifact/Failure-modes/After fields.

### Added

- Initiative 0006 (`.gaia/initiatives/0006-skills-committee/initiative.md`) — Committee-of-Garry review + 10 cold-start invariants + h/w/a category proposal + autoplan review (CEO + Eng + DX phases) baked in.
- `scripts/measure-skill-resolution.ts` — TTHW + skill-resolution round-trip baseline measurement (Initiative 0006 PR 0).
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
- Pinned overrides for transitive deps with no upstream release: `esbuild ^0.25.0`, `fast-xml-parser ^5.7.0` (`@aws-sdk/xml-builder` pin), `h3 ^1.15.9` (`vinxi` pin), `hono ^4.12.14`. Closes osv-scanner findings on PR #54.

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
