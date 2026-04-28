# tools/gritql/

Custom Biome GritQL plugins (vision §Stack). Each `.grit` file would be loaded
by Biome 2.x and matched against the AST of TS/JS files during `biome check`.

## Status (April 2026 — v0.0.1, blocked on Biome plugin engine)

**The plugins in this directory are drafts. They are NOT active.** They are
not registered in `biome.json` and do not fire during `bun run check`.

Empirical findings from a session-long investigation against Biome 2.4.11:

| Step                                                                       | Result                    |
| -------------------------------------------------------------------------- | ------------------------- |
| Plugin file with full Grit syntax (rewrite or `register_diagnostic`)       | Compiles ✅               |
| Plugin loaded with `linter.enabled: true`, `gritMetavariables: true`       | Loads without error ✅    |
| Plugin matches `console.log($x)` against a TS file containing exactly that | **Does not fire** ❌      |
| Same plugin against a JS file with `language js` directive                 | **Does not fire** ❌      |
| With `--write` flag to apply rewrites                                      | **No changes applied** ❌ |

The plugin loads and compiles but the pattern matcher never produces output.
Biome 2.4's plugin engine is documented at high level (https://biomejs.dev/blog/biome-v2/)
but the pattern semantics, supported language tags, and which lint phase
plugins run in are not documented in detail. There are no `.grit` test
fixtures shipped in `node_modules/@biomejs/biome/`.

Probable cause (unconfirmed): Biome 2.4's plugin engine is alpha — pattern
matching is not yet wired to the diagnostic pipeline for TS source files.
Revisit when Biome 2.5+ ships with documented examples or a working
`@biomejs/biome` test that demonstrates a plugin firing on real code.

## Files in this directory

| File                             | Rule it would enforce               | Status              |
| -------------------------------- | ----------------------------------- | ------------------- |
| `no-vendor-sdk-in-features.grit` | `backend/no-vendor-sdk-in-features` | draft, doesn't fire |
| `route-typebox-required.grit`    | `backend/route-typebox-required`    | draft, doesn't fire |

The `rules.ts` entries for both rules stay `kind: 'pending'` until a Biome
plugin actually fires on these patterns.

## When picking this back up

1. Verify Biome's release notes for plugin-engine progress (probably 2.5+).
2. Find a working `.grit` example in Biome's own test suite or blog post.
3. Adapt one of the drafts here to that working syntax.
4. Test against an existing violating file before claiming the rule active.
5. Register in `biome.json` `plugins:` array. Flip `rules.ts` entries to
   `{ kind: 'gritql', rule: '<id>' }`.

## Reference

- https://biomejs.dev/blog/biome-v2/
- https://docs.grit.io/language/overview (the upstream GritQL — Biome's
  subset is constrained but not spec'd)
