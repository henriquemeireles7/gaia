# docs/

Human-readable reference. Where Claude routes a developer when the answer doesn't fit in a CLI hint.

## What's here

| File                 | Audience                               | Lifecycle                                             |
| -------------------- | -------------------------------------- | ----------------------------------------------------- |
| `getting-started.md` | Developer who just cloned              | Updates when CLI verbs change shape                   |
| `cli.md`             | Developer needing the verb reference   | Auto-regenerable from `bun gaia --help` (PR 11)       |
| `architecture.md`    | Contributor + Claude reading on-demand | Updates when stores, schema flow, or layering changes |
| `contributing.md`    | First-time contributor                 | Updates when CI / branching / process changes         |
| `privacy.md`         | Anyone evaluating telemetry            | Updates when allowlist / opt-out tiers change         |
| `assets/`            | Hero SVG, OG card, demo recordings     | PR 1 (placeholder), PR 10 (real recording)            |
| `runbooks/`          | Operations runbooks (rollback, etc.)   | Per-incident                                          |

## Conventions

- Markdown only. No HTML embedding (renders cleanly in GitHub + Scalar docs site).
- Headings are sentence case for prose, except per-verb headings in `cli.md` which use code formatting.
- Code blocks specify the language (`bash`, `ts`, `yaml`).
- `architecture.md` opens each section with a one-line `> **Abstract:**` so progressive-disclosure tools can resolve sections by name without reading the body.
- Cross-references use relative links from the file's own directory.

## When to update vs when to regenerate

`cli.md` is auto-regenerable (PR 11). Don't hand-edit; instead update the verb's `--help` text in `cli/src/`.

Everything else is hand-written. Update when the source-of-truth changes:

- `getting-started.md` ← `cli/src/verbs/*.ts` shape changes
- `architecture.md` ← `.gaia/vision.md` or `packages/CLAUDE.md` changes
- `contributing.md` ← `.github/` workflow changes
- `privacy.md` ← `cli/src/telemetry.ts:TELEMETRY_ALLOWLIST` changes

---

<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| architecture.md | Architecture |
| cli.md | CLI reference |
| contributing.md | Contributing |
| getting-started.md | Getting started |
| launch.md | Launch checklist — v1.0 founder gate |
| privacy.md | Privacy |

<!-- Generated: 2026-04-30T05:20:55.376Z -->
