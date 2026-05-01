# Changelog

All notable changes to Gaia. Format adapted from [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); semver per [SemVer](https://semver.org/spec/v2.0.0.html).

The repo is pre-1.0. Breaking changes happen freely until v1.0.0.

## [0.2.4] - 2026-05-01

Ships `create-gaia-app@0.3.3` to fix two P0 bugs that broke first-run on the published 0.3.2 tag: every route returned HTTP 503 from `bun dev`, and `bun gaia <verb>` was unreachable post-scaffold. Both reproduced cleanly from a fresh `bun create gaia-app@latest myapp`. A new `bun run check` stage spawns the dev server and verifies it returns a non-503 status before letting any future regression through. Found by `/qa` against the published npm tag, fixed and re-verified end-to-end via fresh scaffold.

### Fixed

- `apps/web/app.config.ts`: SSR module-graph 503. `@solidjs/router`'s precompiled `dist/index.js` calls `template()` at module top level — on the server that's the `notSup` stub. vite externalized the router for SSR, so Bun resolved `default` not `solid`. Adding `vite.ssr.noExternal: ['@solidjs/router']` routes the import through `vite-plugin-solid`, which honors the `solid` export condition and compiles the JSX source for SSR. Also bumped the router pin to `^0.16.0` (current `latest`).
- `cli/src/create.ts`: `customizePackageJson` now writes `"create-gaia-app": "^<cliVersion>"` into the scaffolded project's `devDependencies`. Without this pin, the `gaia` bin from `create-gaia-app` was never linked into `node_modules/.bin/`, and every README on-ramp (`bun gaia live`, `bun gaia deploy`, `bun gaia smoke`, `bun gaia verify-keys`) hit "Script not found 'gaia'". Two regression tests cover the rewrite + the dependencies → devDependencies migration.
- Root `package.json`: declares `"create-gaia-app": "workspace:*"` so the source repo's own `bun install` symlinks `node_modules/.bin/gaia` for in-checkout dev. The scaffolder rewrites this to a real npm range when laying down a user project.

### Added

- `scripts/smoke-dev-boot.ts` + `bun run smoke:dev`: spawns `bun run dev` on a non-default port, polls `/` for a non-503 status, kills the process. Wired into `bun run check` as the final stage. Green path: ~3 seconds. This is the missing layer that let the SSR 503 ship across 0.3.0 → 0.3.2 without anyone noticing.
- `.gaia/audits/qa/2026-04-30-cli-0.3.2.md`: the full QA report against `npm:create-gaia-app@0.3.2` with repro commands, root-cause analysis, and a resolution log.

## [0.2.3] - 2026-04-29

Hardens initiative 0005 (Wave 0 runtime). Adds a substrate clarification (Inngest is today's runtime; the wrapper insulates from a future iii.dev migration), expands risks from 5 to 15 (replication slot leakage, replay attacks, push storms, partial-response corruption, thundering herd, snapshot/WAL gap, cross-tenant filtering), and adds §7 Hardening Specification with per-PR file lists — 147 files specified across the 13 PRs (what each does, why it exists). 24 mechanical fix rows (AD-1..AD-24) appended to the audit trail. Source: `/autoplan` Claude subagent dual review (CEO + Eng), Codex unavailable. No scope expansion.

### Changed

- `.gaia/initiatives/0005-foundation-runtime/initiative.md`: substrate clarification + 10 new risks + §7 Hardening Specification + 24 audit-trail rows. File grew from 145 to 558 lines (no scope expansion — all hardening detail).

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
