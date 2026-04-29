---
parent: .gaia/initiatives/CLAUDE.md
hypothesis: A one-command Kamal deploy (`bun gaia infra deploy`) that puts the template on the user's own VPS in <10 min beats Railway-locked deploy as the moat moment for the no-code-graduate ICP.
falsifier: 0/10 alphas attempt self-host post-0003 launch.
measurement:
  {
    metric: '% of alphas who attempt self-host within 14 days of 0003 launch',
    source: 'alpha session logs + telemetry',
    baseline: '0',
    threshold: '≥3/10',
    window_days: 14,
    verdict: 'pending',
  }
status: not-started
---

# Initiative 0004 — Gaia Open-Source Infra (Kamal)

Stub. Self-hostable Kamal-based deploy platform. Owns the `w-infra` skill content fully. Gates: 0003 must hit ≥50 stars before this starts.

Anticipated scope:

- `packages/infra/kamal/` adapter (deploy.yml templates for Hetzner, DigitalOcean, AWS).
- `bun gaia infra init` / `bun gaia infra deploy` CLI verbs.
- Migration guides: `migration-from-railway-to-kamal.md`.

To be expanded by `w-initiative` when its time arrives.
