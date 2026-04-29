# Initiatives — index

Strategic bets, ordered by 4-digit folder prefix. Each initiative is a single `initiative.md` file with research + strategy + folder structure + implementation + PR breakdown + audit trail.

The 0004–0010 block implements Vision v5 — six waves, with Wave 0 split into substrate (0004) and runtime (0005). Source: `_archive/2026-04-29-vision-v5-source.md`.

| #    | Folder                           | Wave | One-liner                                                                                                  | Status       |
| ---- | -------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- | ------------ |
| 0001 | `0001-gaia-workflow-setup/`      | —    | Methodology refactor: 1:1 skill↔reference, fractal CLAUDE.md, 3 meta-skills, drop reference folder.        | in-progress  |
| 0002 | `0002-gaia-bootstrap/`           | —    | Clone-to-deploy in 30 min via CLI alone. Template + onboarding CLI verbs.                                  | draft (stub) |
| 0003 | `0003-gaia-launch-hardening/`    | —    | Public OSS launch: security audit, claim hygiene, X thread, Show HN.                                       | draft (stub) |
| 0004 | `0004-foundation-substrate/`     | 0a   | Wave 0 substrate: events, hexagonal, tenancy, agent-native runtime, metering, telemetry.                   | not-started  |
| 0005 | `0005-foundation-runtime/`       | 0b   | Wave 0 runtime: materialization, replicas, iii Function budgets, streaming spine, MCP push.                | not-started  |
| 0006 | `0006-projections-materialized/` | 1    | Triple-rendered projections (admin + MCP + pricing) with per-projection materialization workers.           | not-started  |
| 0007 | `0007-contracts-network/`        | 2    | Contract surface + docs app, hybrid retrieval (BM25 + embeddings + cache), network discovery via replicas. | not-started  |
| 0008 | `0008-distribution-composer/`    | 3    | Composer + marketing, channels (newsletter/social/broadcast) as backpressured iii Functions, syndication.  | not-started  |
| 0009 | `0009-capabilities-runtime/`     | 4    | Capability primitives + bundles + sandbox + labor app + `gaia-cloud/` separate repo + revenue-share.       | not-started  |
| 0010 | `0010-subscribers-autonomous/`   | 5    | Time/domain/cross-instance subscribers as iii Functions, escalations, playbooks; `d-autonomous` skill.     | not-started  |

Archive: `_archive/` preserves prior initiative documents as research input.

## Conventions

- Folder name: `NNNN-<slug>` (4-digit zero-padded; lexicographic order = execution order).
- One file per initiative: `initiative.md`. Sections: research → strategy → implementation → PR breakdown → audit trail.
- `d-initiative` writes new initiative.md files. `d-code` reads the PR breakdown and codes PR by PR.
- gstack `/autoplan` reviews the file end-to-end after `d-initiative` finishes; appends to the audit trail.

## Critical rules

- NEVER edit an initiative.md from a hook. Initiatives are explicit human + d-initiative decisions.
- Append-only audit trail: every change traces to a decision (founder, autoplan voice, or AD-N mechanical).
