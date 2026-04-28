# tools/gritql/

Custom Biome GritQL plugins. Each `.grit` file is a pattern matched against
the AST of TypeScript / JavaScript / TSX / JSX files when `biome check` runs.

Vision §Stack: "custom Biome GritQL rules for agent anti-patterns."

## Files

| File                             | Rule (rules.ts)                     | Status                               |
| -------------------------------- | ----------------------------------- | ------------------------------------ |
| `no-vendor-sdk-in-features.grit` | `backend/no-vendor-sdk-in-features` | active                               |
| `route-typebox-required.grit`    | `backend/route-typebox-required`    | partial (warns when 3rd arg missing) |

## Adding a new GritQL rule

1. Identify the rule in `.gaia/rules.ts` with `mechanism: { kind: 'pending', note: 'GritQL ...' }`.
2. Create `tools/gritql/<rule-id>.grit`. Reference: https://docs.grit.io/language/overview
3. Add the file to `biome.json` `plugins` array.
4. Update `rules.ts` mechanism to `{ kind: 'gritql', rule: '<rule-id>' }`.
5. Run `bun run check:lint` to verify.
