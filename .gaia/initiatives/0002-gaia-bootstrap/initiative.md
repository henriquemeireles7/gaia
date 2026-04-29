---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: A complete MIT TypeScript SaaS template + a CLI scaffolder (`bun create gaia@latest`) — onboarding driven by CLI verbs alone, no orchestrator skill — gets a Lovable-graduate from `git clone` to deployed Railway URL in ≤30 min.
falsifier: <7/10 alpha sessions reach a live URL in 30 min.
measurement:
  {
    metric: '% of alpha sessions reaching deployed Railway URL within 30 min',
    source: 'alpha session telemetry + manual TTFD timing',
    baseline: 'TBD (no current bootstrap CLI)',
    threshold: '≥7/10',
    window_days: 30,
    verdict: 'pending',
  }
research_input: ../_archive/2026-04-27-gaia-bootstrap-source.md
status: draft
---

# Initiative 0002 — Gaia Template Bootstrap

Stub. Full strategy + implementation + PR breakdown will be expanded by `w-initiative` once Initiative 0001 (methodology refactor) ships.

Carry-overs from research input (the prior bootstrap doc, archived):

- Cap table for template surfaces (auth, billing, admin v0.1, content v0.1).
- TTHW <5 min and TTFD ≤30 min targets (both via CLI alone — no `d-onboard` skill).
- CLI ships two modes from day 1: `bun create gaia@latest <name>` (full template) and `--bare` (methodology only).
- Onboarding flow becomes CLI verbs: `bun gaia onboard verify-keys`, `bun gaia onboard deploy`, `bun gaia onboard smoke`.
- Self-healing deploy recovery via `w-debug` (deploy mode) is the magical moment.

See `_archive/2026-04-27-gaia-bootstrap-source.md` for the full prior thinking.
