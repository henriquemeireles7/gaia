# Health — Reference

> Status: scaffolded.
> Sibling skill: `a-health` (this folder's `SKILL.md`).

## What this is

Comprehensive codebase health audit: 10 sessions across security, performance, UI, coherence, dead weight, test health, architecture, dependencies, content, and scoring. Report-only — never fixes code. Produces a scored report + fix plan + trend in `.gaia/audits/a-health/<YYYY-MM-DD>.md`.

## When to run

- Quarterly: full audit cadence.
- After a major refactor: confirm shape is still healthy.
- When test/build pain is increasing: identify which axis is rotting.

## The 10 audit sessions

1. **Security** — runs `a-security` audit; rolls findings up.
2. **Performance** — bundle size, route latency, query cost.
3. **UI** — design token coverage, accessibility lint, visual regression.
4. **Coherence** — naming consistency, abstraction quality, circular deps.
5. **Dead weight** — `knip` unused exports, deps with zero imports.
6. **Test health** — coverage, mutation score, flake rate, ratio (unit/integration/e2e).
7. **Architecture** — layering violations (apps→packages only), folder shape vs intended.
8. **Dependencies** — CVE scan (osv-scanner), version drift, license compliance.
9. **Content** — voice/tone audit (`w-write`), README freshness, doc staleness.
10. **Scoring** — composite 0-10 health score; trend vs prior audits.

## Output

`.gaia/audits/a-health/<YYYY-MM-DD>.md` — scored report. Comparison with the last audit shows trend. The scored axis identifies what to fix first.

## Cross-references

- Sibling skill: `.claude/skills/a-health/SKILL.md`
- Quarterly trigger: stale-reference detection (per `h-rules/reference.md` principle 3 — `Last verified` >180 days).
- Audit skills it dispatches: `a-security`, `a-ai`, `a-ux`, `a-dx`, `a-observability`, `a-ax`.
