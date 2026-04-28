# Principle → hook mapping methodology

> Personal memory. Captures the logic for translating `.gaia/reference/*.md` principles into mechanical enforcement in `.gaia/rules.ts` + hooks + CI.
>
> Status: draft (Apr 2026). Updated as the matrix lands.

---

## Why this exists

Vision §H9 says "one policy, many surfaces." Vision §H6 says "every reference principle has a mechanism." Without a clear mapping methodology, those become aspirational. This document is the methodology — readable across sessions so any agent (and future me) can extend the matrix without re-deriving the categories.

---

## The 10 enforcement categories

Every principle falls into exactly one category — pick the **cheapest** mechanism that catches it.

| Category | What it is | When to use |
|---|---|---|
| `regex` | Pattern detectable by regex; lives in `packages/security/harden-check.ts` | Static text patterns (e.g. hardcoded secrets, banned imports, magic values) |
| `hook-runtime` | Claude Code PreToolUse/PostToolUse hook in `.claude/hooks/` | Tool-call-time enforcement (file edits, bash, Skill invocations) |
| `biome` | Existing Biome rule | When the rule already ships in Biome |
| `oxlint` | Oxlint rule (we don't ship oxlint yet) | Future; mark as `pending: oxlint X` |
| `gritql` | Custom GritQL pattern via Biome plugin (not built yet) | AST-aware patterns (route shape, import direction); almost always `pending` for now |
| `ts-config` | tsconfig path restrictions, workspace boundaries, TS strict mode | Architecture (no sibling imports, package boundaries) |
| `script` | One-shot validation script in `scripts/` or in CI | Cross-file invariants (test-exists, manifest-valid) |
| `ci` | GitHub Actions workflow check | External tools (osv-scanner, gitleaks, knip, pa11y, lighthouse) |
| `review` | Judgment flagged by `/review` skill | Tone, copy quality, design taste |
| `domain-context` | Already enforced by `.claude/hooks/domain-context.ts` auto-loading the reference file | Judgment principles where reading the doc is the enforcement |

---

## Process per reference file

1. **Read the file.** Extract every "ALWAYS X" / "NEVER Y" / "every Z does W" sentence — those are the rules.
2. **Filter to enforceable.** Bullets like "voice is direct, no AI vocabulary" are judgment; tag them `domain-context`. Bullets like "no `console.log` in shipped code" are mechanical; add the regex.
3. **Pick the cheapest mechanism that catches it.** Order of preference:
   - `domain-context` (already wired, costs zero) — if the principle is read-on-edit
   - `regex` in existing `harden-check.ts` — append a pattern, smallest possible
   - `script` in `scripts/` — for cross-file invariants
   - `hook-runtime` new file — only if no existing hook fits
   - `gritql` / `oxlint` — `pending`, with a specific note about what the rule would do
4. **Honesty:** never tag `kind: 'hook'` with a path that doesn't exist. If the mechanism doesn't exist yet, tag `pending` with a specific actionable note.
5. **Add to `rules.ts`.** Even pending rules go in — the file is the gap report.
6. **Smoke-test new mechanisms.** Pipe synthetic input through new hook patterns; confirm they fire.
7. **Run `bun run check`** after each batch.

---

## The safety net: domain-context hook

For principles where mechanical enforcement is impossible, the answer is **NOT** to fake a hook. The answer is the domain-context hook (already shipped) which forces the agent to load the relevant `reference/<X>.md` before editing matching code. Vision §H6 + §H4 working together: facts get hooks; judgment gets context.

So a `voice.md` principle saying "use direct language" doesn't need a regex — it needs the agent to have `voice.md` in context when editing copy. That's enforcement, just at a different layer.

---

## Categorization matrix

Across all 17 reference files. Filtered to ~6-12 highest-leverage rules per file. Numbers are rough estimates of how many `regex|hook-runtime|domain-context` rules each file yields after honest filtering.

### code.md (constitution; 10 principles)

| Rule | Category | Mechanism |
|---|---|---|
| `code/run-check-before-commit` | hook-runtime | `.claude/hooks/pre-commit-check.ts` ✅ exists |
| `code/no-as-any` in interior | oxlint pending | would be `noExplicitAny` |
| `code/agents-duplicate-humans-extract` | review | /review heuristic flags premature abstraction |
| `code/one-schema-many-consumers` | gritql pending | detect manual `type Foo = {...}` for shapes that have a schema source |
| `code/validate-at-edges-trust-interior` | gritql pending | route handlers must have body/query/params schema |
| `code/named-errors-no-swallowing` | regex | ban `throw new Error(` in `apps/` and `packages/` features |
| `code/predictable-locations` | ts-config | path restrictions in tsconfig (planned) |

### backend.md (10 patterns)

| Rule | Category | Mechanism |
|---|---|---|
| `backend/route-typebox-required` | gritql pending | every Elysia route with body/query/params declares schema |
| `backend/route-response-schema-required` | gritql pending | every route declares response shapes |
| `backend/no-vendor-sdk-in-features` | regex | ban imports of `polar-sh|stripe|resend|anthropic` outside `packages/adapters/**` |
| `backend/protected-by-default` | gritql pending | every plugin uses `protectedRoute` or `publicRoute` |
| `backend/feature-plugin-one-file` | script | per-feature route file count check |
| `backend/no-hono-imports` | regex | ban `from 'hono'` (legacy stack remnants) |
| `backend/no-elysia-in-adapters` | regex | adapters must not import from `elysia|@elysiajs/*` |
| `backend/no-console-in-shipped-code` | regex ✅ | exists as `observability/no-console-log-in-prod` hook |
| `backend/integration-test-via-eden` | gritql pending | `*.integration.test.ts` uses `treaty(app)` |
| `backend/error-via-named-codes` | regex | adopt errors-md rule |

### frontend.md (SolidStart patterns)

| Rule | Category | Mechanism |
|---|---|---|
| `frontend/routes-call-pass-render-only` | gritql pending | route files contain no `.map().filter().reduce()` chains |
| `frontend/no-direct-fetch-use-eden-treaty` | regex | ban `fetch(` in `apps/web/src/routes/**` (use `api.*`) |
| `frontend/no-vendor-sdk-on-client` | regex | ban `polar-sh|stripe|resend` imports in `apps/web/**` |
| `frontend/file-routing` | ts-config | SolidStart enforces via `vinxi`; nothing to add |
| `frontend/load-tokens-from-source` | regex | ban hardcoded hex/rgb in `apps/web/**` (refer to `tokens.md`) |
| `frontend/accessibility-baseline` | ci | `pa11y` job (planned for Phase 6 follow-up) |

### database.md

| Rule | Category | Mechanism |
|---|---|---|
| `database/no-sql-interpolation` | regex ✅ | exists in harden-check |
| `database/migrations-versioned` | script | check `packages/db/migrations/` files have not been edited after first commit |
| `database/typebox-derivation-mandatory` | gritql pending | TypeBox/Zod schemas for tables must use `createSelectSchema` |
| `database/no-drizzle-push-in-ci` | ci | ban in CI workflow definition |
| `database/audit-columns` | gritql pending | every table has `createdAt`, `updatedAt` |
| `database/no-raw-pg-bypass-drizzle` | regex | ban direct `postgres()` import outside `packages/db/client.ts` |

### testing.md

| Rule | Category | Mechanism |
|---|---|---|
| `testing/colocated-tests` | script | `check-tests-exist.ts` — every public export has `.test.ts` next to it |
| `testing/no-test-only` | regex | ban `it.only` / `describe.only` in committed code |
| `testing/no-test-skip-without-comment` | regex | warn on `it.skip` / `describe.skip` without a `// TODO:` comment |
| `testing/integration-uses-eden-treaty` | gritql pending | `*.integration.test.ts` uses `treaty(app)` |
| `testing/no-real-network-in-unit` | regex | ban `fetch(` / `globalThis.fetch` in non-`integration.test.ts` test files |
| `testing/mutation-score-gate` | ci pending | Stryker config |

### errors.md

| Rule | Category | Mechanism |
|---|---|---|
| `errors/no-bare-throw-error` | regex | ban `throw new Error(` in `apps/` and feature paths |
| `errors/named-codes-only` | regex | ban `throw new` of any class except `AppError` and `ProviderError` in features |
| `errors/no-bare-catch` | oxlint pending | catch must rethrow or handle a specific type |
| `errors/no-leak-secrets-in-error-messages` | regex | ban template strings that interpolate `password|secret|token|api_key` into Error messages |
| `errors/structured-error-shape` | ts-config | the `AppError.toJSON()` shape is the contract |

### security.md

| Rule | Category | Mechanism |
|---|---|---|
| `security/protect-config` | hook-runtime ✅ | `protect-config.ts` (rule-driven) |
| `security/no-secrets-committed` | hook-runtime ✅ | `protect-files.ts` |
| `security/no-dangerous-shell` | hook-runtime ✅ | `block-dangerous.ts` |
| `security/no-raw-env` | regex ✅ | exists in harden-check |
| `security/no-hardcoded-secrets` | regex ✅ | exists in harden-check |
| `security/no-eval` | regex ✅ | exists in harden-check |
| `security/no-log-secrets` | regex ✅ | exists in harden-check |
| `security/csrf-on-mutations` | gritql pending | every mutation route uses CSRF middleware |
| `security/rate-limit-on-public` | gritql pending | every public route uses rate-limit middleware |
| `security/audit-log-on-writes` | gritql pending | mutations write to audit log |
| `security/cve-scan` | ci ✅ | `osv-scanner` already in `.github/workflows/ci.yml` |
| `security/secret-scan` | ci ✅ | `gitleaks` already in CI |

### observability.md

| Rule | Category | Mechanism |
|---|---|---|
| `observability/no-console-log-in-prod` | hook-runtime ✅ | `warn-console-log.ts` |
| `observability/init-at-boot` | regex | check `apps/api/server/app.ts` calls `initObservability(env)` |
| `observability/structured-logger-not-console` | regex | in `apps/`/`packages/` ban `console.log/info/debug` (allow `console.error` for fatal) |
| `observability/trace-id-correlation` | gritql pending | every adapter span includes a trace_id |
| `observability/no-pii-in-logs` | regex | ban logging objects keyed `password|secret|token|email` literally |

### commands.md (CLI patterns)

| Rule | Category | Mechanism |
|---|---|---|
| `commands/use-bun-not-npm` | regex | ban `npm install`, `npm run` in scripts and docs |
| `commands/verb-noun-script-naming` | script | `package.json` scripts match `verb` or `verb:noun` pattern |
| `commands/help-flag-supported` | review | flagged by /review when adding CLI commands |

### design.md, tokens.md, ux.md, dx.md, ax.md, voice.md

These are heavily judgment. The MAJORITY map to `domain-context` (load file before edit) + `review` (post-hoc audit). Only mechanical extracts:

| Rule | Category | Mechanism |
|---|---|---|
| `design/no-hardcoded-colors` | regex | ban hex `#[0-9a-f]{3,8}` and `rgb(` in `apps/web/**` (force tokens) |
| `design/no-magic-z-index` | regex | ban `z-index: \d+` outside semantic ranges |
| `design/wcag-baseline` | ci pending | pa11y |
| `tokens/single-source` | script | generated CSS/Tailwind token files match `tokens.ts` |
| `dx/stdout-data-stderr-narration` | regex | in scripts/, ban `console.log` (use `process.stdout.write` for data, `console.error` for narration) |
| `ax/skill-md-frontmatter` | script | every `SKILL.md` has `name:` + `description:` frontmatter |
| `voice/no-hedge-phrases-in-docs` | review | /review heuristic; regex would false-positive too much |
| `voice/no-marketing-vocabulary` | regex (advisory) | warn (not block) on `revolutionize|seamless|leverage|unlock` in `content/`, `README.md` |

Most of these files: the domain-context hook (already wired) loads the reference whenever someone edits matching code. That's the enforcement. The reference file itself is the rule book.

### workflow.md

Mostly process. Few mechanical hooks. Most enforced via artifact frontmatter validation (script category).

| Rule | Category | Mechanism |
|---|---|---|
| `workflow/initiative-frontmatter-required` | script | initiative `.md` files in `.gaia/initiatives/*/` have `parent`, `hypothesis`, `measurement` |
| `workflow/project-touches-required` | script | project `.md` files declare `touches:` and `depends_on:` |
| `workflow/principles-review-before-correctness` | hook-runtime | the `domain-context.ts` hook (already enforces this) |

### harness.md

| Rule | Category | Mechanism |
|---|---|---|
| `harness/security-harden-gate` | hook-runtime ✅ | `harden-gate.ts` |
| `harness/auto-load-references` | hook-runtime ✅ | `domain-context.ts` |
| `harness/permissions-immutable` | hook-runtime | `protect-files.ts` should add `.gaia/protocols/permissions.md` to its blocklist |
| `harness/rules-ts-single-source` | architecture | every hook should import from rules.ts (pattern set in Phase 8) |
| `harness/manifest-coverage` | script | `MANIFEST.md` lists every folder with a `CLAUDE.md` and vice versa |

---

## Concrete shipping plan from this doc

1. **Add ~30 new rules to `.gaia/rules.ts`** covering the matrix above.
2. **Append patterns to `harden-check.ts`** for the regex-tier rules: hardcoded colors, no-fetch-in-frontend-routes, no-hono-imports, no-vendor-in-features, no-it-only, no-real-fetch-in-unit-tests, observability/structured-logger.
3. **Add `protect-files.ts` paths** for `permissions.md` and `delegation.md` (rule-driven).
4. **Mark the GritQL + Oxlint candidates as `pending`** with the specific rule name they'd need.
5. **Smoke-test each new pattern** with synthetic input before committing.
6. **Run `bun run check`** after every batch.

After all 17 files are mapped, `enforcedReferences()` (helper in `rules.ts`) returns the set of references with at least one non-pending mechanism. That's the coverage report.

---

## What this doc is NOT

- Not a prescription for "every rule must have a hook." Some rules genuinely shouldn't.
- Not a substitute for the markdown constitution. The reference files are still the source. `rules.ts` is the index of mechanism status.
- Not exhaustive. The categorization captures the highest-leverage 6-12 rules per file. Smaller principles get rolled up.

---

## Next time you extend this

Workflow:
1. Read the reference file you're enforcing.
2. Find this doc. Add the principle to the matrix table for that file.
3. Pick a category (cheapest viable).
4. If `regex` or `hook-runtime`, write the mechanism in the same change.
5. If `pending`, write a SPECIFIC note: not "GritQL rule" but "GritQL rule that detects X without Y, suggesting Z."
6. Add the entry to `.gaia/rules.ts`.
7. Run `bun run check`.

---

*This file is personal memory — captures session-spanning logic. Distinct from `.gaia/reference/` which is the constitution.*
