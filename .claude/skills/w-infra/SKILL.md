---
name: w-infra
description: 'Infrastructure config skill. Owns Kamal / Railway / Docker / GH Actions config patterns. Mode: fix. Triggers: "w-infra", "infra", "configure infra". Pair: w-deploy (config feeds the deploy target). Artifact: config/deploy.yml, railway.toml, Dockerfile, .github/workflows/ci.yml (whichever the change touches).'
---

# w-infra — Infrastructure configuration

> Reference: see `reference.md` in this folder (infra patterns; expanded in Initiative 0004 — gaia-open-source-infra).

## Quick reference

- `/w-infra audit` — verify infra config is consistent.
- `/w-infra setup <target>` — scaffold deploy config for a new target.

## Phase 0: Scope select + pre-condition

Confirm target (Railway / Fly.io / Kamal / GitHub Actions). Verify `bun run check` is green.

## Phase 1: Read existing config + reference.md

Walk Dockerfile, .github/workflows/, railway.toml / fly.toml, Kamal config if present.

## Phase 2: Surface findings or scaffold

Audit mode: report drift / missing config. Setup mode: write target-specific config files.

## Phase 3: Verify

Run target-specific lint (e.g. `actionlint`, `dockerfile-lint`).

## Phase 4: Final gate

Re-run `bun run check`.

## Output

Mode: **fix** (scaffold) or **report** (audit).

## Failure modes

- **Config schema validation fails** (e.g. `railway.toml` malformed, `deploy.yml` missing required key) — revert the change; report the schema error with line numbers.
- **Drift detected between dashboard and tracked config** (CI flagged) — surface both versions; do not auto-resolve. Operator picks which is truth.
- **Bumped accessory tag introduces a breaking change** at boot — auto-roll-back the tag; escalate to `decisions/humantasks.md` with the break signature.
