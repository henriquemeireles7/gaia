---
name: d-infra
description: 'Infrastructure config skill. Owns Kamal / Railway / Docker / GH Actions config patterns. Triggers: "d-infra", "infra", "configure infra".'
---

# d-infra — Infrastructure configuration

> Reference: see `reference.md` in this folder (infra patterns; expanded in Initiative 0004 — gaia-open-source-infra).

## Quick reference

- `/d-infra audit` — verify infra config is consistent.
- `/d-infra setup <target>` — scaffold deploy config for a new target.

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
