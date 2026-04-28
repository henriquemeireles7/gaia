# ADR-0001 — Use ast-grep instead of Biome GritQL plugins

> Status: Accepted
> Date: 2026-04-28
> Deciders: gaia core (kaz)

## Context

Vision §Stack listed "custom Biome GritQL rules for agent anti-patterns" as the AST-pattern enforcement surface. We need this for ~6–8 rules in `.gaia/rules.ts` that regex can't express cleanly: route schema requirements, sibling-import detection, audit-column presence, integration-test patterns.

Phase 8 attempted to wire Biome 2.4.11's GritQL plugin support. Empirical result: plugins compile and load with `gritMetavariables: true`, but the matcher never fires on real source files (tested rewrites + `register_diagnostic` against both `.ts` and `.js`). Biome's plugin engine is shipped as alpha; no working examples in the wild, no `.grit` test fixtures in `node_modules/@biomejs/biome/`. See `tools/gritql/README.md` (now removed) for the full empirical matrix.

## Decision

Replace Biome GritQL with [ast-grep](https://ast-grep.github.io/) (`@ast-grep/cli`). Vision's commitment was "AST-aware patterns," not "Biome plugins specifically." ast-grep is a Rust-based, tree-sitter-backed AST tool with the same conceptual promise (declarative pattern → diagnostic) but a working YAML pipeline today.

## Consequences

**Positive**

- 6–8 architectural rules become enforceable: vendor-SDK isolation in features, sibling-import bans, audit-column requirements, `throw new Error` bans in feature paths.
- Per-rule path scoping (`files:` / `ignores:` arrays in YAML) — Biome plugins don't support this.
- `bun run check:ast` runs in ~50ms across ~150 files; same order as oxlint.
- Built-in `--update-all` for auto-fixes when `fix:` is declared.
- Same conceptual model as the original GritQL plan — engineers don't relearn the idea, just the syntax.

**Negative**

- One more CLI in the install graph. ~10MB Rust binary downloaded via npm postinstall (postinstall must be trusted via `bun pm trust @ast-grep/cli`).
- Two pattern languages on the team: oxlint rules (TypeScript-based) and ast-grep rules (YAML). Distinct contexts; not a deep cost.
- Biome no longer has a role. Removed from devDeps; `biome.json` deleted; the GritQL drafts in `tools/gritql/` are now dead code (also removed).

**Neutral**

- `.gaia/rules.ts` adds a new `kind: 'ast-grep'` mechanism alongside `oxlint`, `script`, `hook`, `ci`. The single-source-of-policy property holds.

## Alternatives considered

- **Wait for Biome 2.5+ to ship a working plugin engine** — unbounded timeline, blocks ~8 vision-rules indefinitely. Rejected.
- **Custom TypeScript compiler-API scripts** — most flexible, highest implementation cost; would duplicate ast-grep's tree-sitter + diagnostic format. Rejected.
- **ESLint custom rules via `@typescript-eslint/parser`** — would re-introduce ESLint (we replaced it with oxlint in Phase 8); custom rules are heavyweight (Node API + plugin registration). Rejected.
- **Comby / semgrep** — Comby is less popular than ast-grep; semgrep adds Python runtime to the install graph. Rejected on ergonomics.

## References

- Vision §Stack — locked tech stack section.
- `.gaia/reference/code.md` — principle 1 (one schema, many consumers) and principle 9 (opinionated security) both lean on AST patterns.
- [ast-grep YAML rule schema](https://ast-grep.github.io/reference/yaml.html)
- [Biome v2 plugin announcement](https://biomejs.dev/blog/biome-v2/)
- This repo's PR #18 — the Phase 8 commit history shows the empirical investigation.
