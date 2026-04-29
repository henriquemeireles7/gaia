# Initiatives — index

Strategic bets, ordered by 4-digit folder prefix. Each initiative is a single `initiative.md` file with research + strategy + implementation + PR breakdown.

| #    | Folder                         | One-liner                                                                                            | Status       |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------ |
| 0001 | `0001-gaia-workflow-setup/`    | Methodology refactor: 1:1 skill↔reference, fractal CLAUDE.md, 3 meta-skills, drop reference folder.  | in-progress  |
| 0002 | `0002-gaia-bootstrap/`         | Clone-to-deploy in 30 min via CLI alone (no orchestrator skill). Template + onboarding CLI verbs.    | draft (stub) |
| 0003 | `0003-gaia-launch-hardening/`  | Public OSS launch: security audit, claim hygiene, X thread, Show HN.                                 | draft (stub) |
| 0004 | `0004-gaia-open-source-infra/` | Self-hostable Kamal-based deploy platform.                                                           | draft (stub) |
| 0005 | `0005-gaia-platform-and-cms/`  | Hosted Gaia Cloud paid runtime + CMS Hub v1 + Admin Panel v1 + mini-CRM.                             | draft (stub) |
| 0006 | `0006-skills-committee/`       | Committee-of-Garry skills review: 10 common constraints + h/w/a category prefixes + 2 scope changes. | draft        |

Archive: `_archive/` preserves prior initiative documents as research input.

## Conventions

- Folder name: `NNNN-<slug>` (4-digit zero-padded; lexicographic order = execution order).
- One file per initiative: `initiative.md`. Sections: research → strategy → implementation → PR breakdown → audit trail.
- `w-initiative` writes new initiative.md files. `w-code` reads the PR breakdown and codes PR by PR.
- gstack `/autoplan` reviews the file end-to-end after `w-initiative` finishes; appends to the audit trail.

## Critical rules

- NEVER edit an initiative.md from a hook. Initiatives are explicit human + w-initiative decisions.
- Append-only audit trail: every change traces to a decision (founder, autoplan voice, or AD-N mechanical).

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files

| File       | Exports |
| ---------- | ------- |
| context.md | Context |

<!-- Generated: 2026-04-29T09:10:35.020Z -->
