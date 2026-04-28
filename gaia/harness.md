# Harness — Implementation Plan

> Status: Draft (plan, not yet built)
> Last verified: 2026-04-27
> Scope: The enforcement layer of Gaia
> Source of truth: `vision.md` (the 10x version) and the reference files in `docs/reference/`

---

## What this file is

This is the implementation plan for the Gaia harness. It is not the principles (those live in `vision.md` and the reference files). It is the plan for **what needs to be built so the principles actually hold.**

The principles already exist:

- 15 general principles in `vision.md`
- 12 architectural principles in `vision.md`
- 12 experience principles in `vision.md`
- 10 coding principles in `docs/reference/code.md`
- ~10 patterns each in `backend.md`, `frontend.md`, `testing.md`, `errors.md`, `security.md`, `observability.md`, `database.md`, `commands.md`, `design.md`, `tokens.md`, `ux.md`, `dx.md`, `ax.md`, `voice.md`

That is roughly **150 principles across 15+ documents.** Without enforcement, they are aspirational. The harness exists to make them real.

---

## Mission, in one sentence

> For every principle in every reference file, build the mechanism that catches violations before they merge — and a `.claude/rules.ts` entry that ties the document and the mechanism together.

This is general principle #6 ("Every rule has a document AND an enforcement") applied as the design brief for the entire harness.

---

## The three forms rule

Every principle exists in three forms:

| Form | Lives in | Authored by | Purpose |
|------|----------|-------------|---------|
| Document | `vision.md` or `docs/reference/*.md` | Human | Judgment, intent, examples |
| Mechanism | `.claude/hooks/`, oxlint config, GritQL rules, `scripts/`, CI workflow, `/review` skill | Mostly machine-enforced; some `/review`-based | What catches the violation |
| Policy | `.claude/rules.ts` | Generated from mechanisms | Single source of truth, machine-readable |

If a principle has only a document, it's aspirational. If it has only a mechanism, it's mystery. If it has only a policy, it's untestable. **All three or none.** A principle without an enforceable mechanism fails the test of general principle #6 and gets demoted to a memo (intent only) until enforcement is designed.

---

## Why Claude Code native

Vision-v5 prescribed `.gaia/` as the harness folder. **Override:** the harness lives in `.claude/`, native to Claude Code, because:

- Skill discovery is built in (no custom registry)
- CLAUDE.md auto-loads (no custom resolver protocol)
- Hooks fire at native lifecycle events (no custom event bus)
- `.claude/settings.json` is the canonical hook configuration

**Swap-test for portability:** if Claude Code disappears tomorrow, what survives?

- Hooks (Bun TS — runs anywhere)
- Skills (markdown — runs anywhere)
- Reference files (markdown — runs anywhere)
- `.claude/rules.ts` (TypeScript — runs anywhere)
- Memory log (JSONL in git — universal)

Only `.claude/settings.json` is Claude-Code-specific. That is the deliberate boundary.

This change should propagate to vision-v5 as a v5.1 edit (replace `.gaia/` with `.claude/` throughout the Harness section; drop AGENTS.md, RESOLVER.md, `_manifest.jsonl` since Claude Code's native skill discovery is sufficient).

---

## What the harness must enforce: the inventory

Every reference file is read and every principle is counted. For each, a mechanism is built. Below is the master inventory — the full list of principles that need enforcement, grouped by reference file, with proposed mechanism category.

### From `docs/reference/code.md` (10 principles)

| # | Principle | Proposed mechanism |
|---|-----------|-------------------|
| 1 | One schema, many consumers | `tsgo --noEmit` + GritQL `schema-source-required` |
| 2 | Validate at edges, trust the interior | Oxlint `no-unknown-or-any-in-interior` + GritQL `require-route-schema` |
| 3 | Named errors, no swallowing | Oxlint `no-bare-catch` + typed error code enum |
| 4 | Routes do three things: call, pass, render | GritQL `route-operations-allowlist` |
| 5 | Code goes in a predictable place | Moon workspace boundaries + path-import lint rule |
| 6 | Agents duplicate; humans extract | `/review` skill heuristic (no mechanical rule) |
| 7 | Test behavior at boundaries; mutation-test the interior | `scripts/check-tests-exist.ts` + Bun test coverage + Stryker mutation |
| 8 | Every boundary emits observability | Auto-instrumenting middleware + Oxlint `no-console-in-prod` |
| 9 | Security is opinionated, not optional | GritQL `require-route-wrapper` + default middleware composition |
| 10 | Code Health is a gate, not a guideline | CI required checks + `/review` skill |

### From `docs/reference/backend.md` (~10 patterns)

Selected for harness inventory (full list TBD when full file is parsed):

| Pattern | Proposed mechanism |
|---------|-------------------|
| One Elysia plugin per feature, ≤10 routes per file | GritQL `feature-plugin-shape` |
| TypeBox models in `schema.ts` with dotted naming | GritQL `schema-naming-convention` |
| Services are pure; routes are thin | GritQL `service-purity` (no Elysia imports) |
| Adapters wrap external systems with capability names | Path-lint: `packages/adapters/*.ts` exports must match capability list |
| Auth context provided by middleware, not per route | GritQL `auth-context-provider` |

### From `docs/reference/frontend.md` (~10 patterns)

To inventory: Solid signal patterns, route-component shape, component-state matrix, design-token usage, accessibility patterns. **Mechanism categories likely:** GritQL rules for component shape, scripts for token usage audit, pa11y for accessibility, Lighthouse for performance.

### From `docs/reference/testing.md` (10 patterns)

Selected (full list TBD):

| Pattern | Proposed mechanism |
|---------|-------------------|
| Pyramid ratio (~80/15/5) | `scripts/test-ratio-check.ts` |
| Unit tests are pure (no I/O) | Custom Bun test reporter flagging I/O in unit suite |
| Integration via Eden Treaty (no HTTP loopback) | GritQL on `*.integration.test.ts` rejecting `fetch` |
| Mutation score ≥80% on `packages/*/src/` | Stryker run in CI |
| Tests colocated with source | `scripts/check-tests-colocated.ts` |

### From `docs/reference/errors.md` (10 patterns)

| Pattern | Proposed mechanism |
|---------|-------------------|
| Throw default; Result for specific seams | GritQL `result-only-at-allowed-seams` |
| Every error code in `packages/errors/src/codes.ts` | TypeBox enum import + `tsgo` |
| No `throw new Error('…')` in services | Oxlint `no-ad-hoc-error` |
| Error context required for non-trivial errors | GritQL `throwError-requires-context` |

### From the remaining reference files (`security.md`, `observability.md`, `database.md`, `commands.md`, `design.md`, `tokens.md`, `ux.md`, `dx.md`, `ax.md`, `voice.md`)

Inventory pending — these get expanded when each file is parsed in detail. Estimated 80–100 additional principles, each requiring a mechanism. Categories will mostly cluster into:

- **GritQL rules** for codebase-pattern enforcement
- **Oxlint rules** for TypeScript-specific patterns
- **Scripts** for cross-file checks (test ratios, coverage, dead code beyond Knip)
- **Hooks** for tool-call-time enforcement (token efficiency, dangerous commands, file protection)
- **CI gates** for budgets (size, latency, mutation score, Lighthouse, pa11y)
- **`/review` heuristics** for judgment calls (abstraction quality, naming, code-health scoring)

---

## Enforcement surfaces

The mechanism layer has seven surfaces. Each principle gets matched to one or more.

### 1. TypeScript (`tsgo --noEmit`)

Best for: shape-level invariants. If types don't compile, code doesn't run. Used for principles 1, 2, 3 of `code.md` (schema source, validation at edges, typed error codes).

### 2. Oxlint

Best for: fast, language-agnostic syntactic patterns. Built-in rules cover most general cases. Used for: `no-unknown-in-interior`, `no-bare-catch`, `no-console-in-prod`, `no-ad-hoc-error`, etc.

### 3. Custom Biome GritQL rules

Best for: codebase-specific patterns that built-in linters can't express. Lives at `tools/gritql-rules/`. Used for: route shape, schema naming, service purity, route operations allowlist, auth context provider, design token usage.

This is where most of the custom enforcement work lives.

### 4. Scripts (`scripts/*.ts`)

Best for: cross-file checks that don't fit a per-file linter. Examples: test colocation, test ratio, CLAUDE.md presence, footer staleness, manifest sync, principle-to-mechanism coverage audit.

### 5. Hooks (`.claude/hooks/*.ts`)

Best for: agent-time enforcement at tool-call boundaries. Reads from `.claude/rules.ts`. Fires at `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart:compact`. Examples: block dangerous commands, protect `.env`, regenerate CLAUDE.md footers, batch quality gate at session end, re-inject rules after compaction, token-efficiency hooks.

Hooks are deterministic (no LLM calls) and small (size budget: warn at 1KB, hard cap at 3KB; latency budget: warn at 100ms, hard at 500ms).

### 6. CI gates

Best for: budget-and-threshold enforcement. Bundle size (size-limit), API latency, mutation score, Lighthouse performance, pa11y accessibility, dependency CVEs (osv-scanner), secrets (gitleaks), SAST (semgrep + CodeQL).

Required checks block merge.

### 7. `/review` skill (LLM judgment)

Best for: principles that cannot be mechanically enforced. Examples: agents duplicate / humans extract (judgment about abstraction quality), code health score (multi-factor scoring with judgment), legibility evaluation, voice/tone audits.

`/review` is the catch-all for intent-level enforcement. **Used sparingly** — most principles get a deterministic surface first, with `/review` only when no deterministic mechanism is possible.

---

## `.claude/rules.ts` — the single policy source

Every mechanism is registered in `.claude/rules.ts` with a stable shape so hooks, CI, the editor, and `/review` all consume from one source.

```ts
// .claude/rules.ts (sketch — final schema in open spec #1)
export const rules = {
  schemaSource: {
    document: 'docs/reference/code.md#1-one-schema-many-consumers',
    mechanisms: ['tsgo', 'gritql:schema-source-required'],
    severity: 'error',
    fixable: false,
  },
  validation: {
    document: 'docs/reference/code.md#2-validate-at-edges',
    mechanisms: ['oxlint:no-unknown-in-interior', 'gritql:require-route-schema'],
    severity: 'error',
    fixable: false,
  },
  errors: {
    document: 'docs/reference/code.md#3-named-errors',
    mechanisms: ['oxlint:no-bare-catch', 'oxlint:no-ad-hoc-error', 'tsgo'],
    severity: 'error',
    fixable: false,
  },
  // ... one entry per principle
}
```

Hooks read this object. CI workflow reads this object. `/review` skill reads this object. The editor (via Biome plugin) reads this object. Drift becomes structurally impossible.

---

## CLAUDE.md strategy: resolver, not knowledge dump

The current implementation's CLAUDE.md is ~120 lines mixing routing, rules, and tool conventions. The 10x version separates concerns.

### Root `CLAUDE.md` (target ~50 lines)

Just two sections:

**1. Resolver (~30 lines)** — task-conditional routing:

```markdown
## When you are touching...

- Anything code-shaped → read `docs/reference/code.md` first
- Backend (Elysia/adapters) → also read `docs/reference/backend.md`
- Frontend (Solid) → also read `docs/reference/frontend.md`
- Database/migrations → also read `docs/reference/database.md`
- Tests → also read `docs/reference/testing.md`
- Errors → also read `docs/reference/errors.md`
- Anything user-facing visual → read `docs/reference/design.md`
- Anything user-facing copy → read `docs/reference/voice.md`
- Strategy/initiative work → run `d-strategy`
- Project breakdown from initiative → run `d-roadmap`
- Implementation from project → run `d-tdd` (was `d-code`)
- Pre-commit review → run `d-review`
```

**2. Thin policy (~20 lines)** — only what cannot be deferred:

- Build order (CLAUDE.md → schema → tests → code)
- Contradiction handling (STOP, name versions, ask, fix)
- Commit discipline (logical completion points)
- Token-efficiency rules are hooks, not text

Everything else moves to reference files. The root CLAUDE.md is a routing table, not a manual.

### Nested `CLAUDE.md` per code-bearing folder

Three sections, all thin:

**1. Inheritance line** — which references apply:

```markdown
## This folder follows
- `docs/reference/code.md` (all 10 principles)
- `docs/reference/backend.md` (patterns 1, 2, 3)
- Plus local overrides below
```

**2. Local overrides (only if any exist)** — deviations from global rules with stated reason:

```markdown
## Local overrides
- This feature uses `Result<T, E>` even outside the seams listed in `errors.md`,
  because it integrates with an LLM API where partial success matters.
```

**3. Auto-generated footer** — regenerated by Stop hook:

```markdown
<!-- AUTO-GENERATED — DO NOT EDIT MANUALLY -->
<!-- Last regenerated: 2026-04-27T18:42:00Z -->

## Files in this folder
- `routes.ts` — exports `userRoutes` Elysia plugin (5 routes)
- `service.ts` — exports `userService` (4 functions)
- `schema.ts` — exports `UserSchemas` (3 TypeBox models)
- `service.test.ts` — 12 tests covering service.ts

## External dependencies
- `@gaia/security` (auth wrappers)
- `@gaia/errors` (named errors)
- `drizzle-orm` (DB types)
```

The **header** is human intent. The **footer** is machine state. Together: an agent reading the folder understands purpose AND current shape in <50 lines.

### `docs/MANIFEST.md`

A single index file listing every folder that has a CLAUDE.md and why. Folders not listed inherit only from root. Maintained by the Stop hook (auto-updated) and verified by a script (`scripts/check-manifest.ts`).

---

## Folder structure

The complete harness layout, locked.

```
.claude/                                  # Claude Code native, harness root
├── settings.json                         # Hook wiring (canonical Claude Code config)
├── rules.ts                              # Single policy source (consumed by hooks/CI/editor)
│
├── hooks/                                # Lifecycle hooks, TS + Bun
│   ├── lib/                              # Shared hook utilities (size budget, instrumentation)
│   ├── block-dangerous.ts                # PreToolUse:Bash — destructive command guard
│   ├── protect-files.ts                  # PreToolUse:Edit/Write — .env, secrets, .git
│   ├── protect-config.ts                 # PreToolUse:Edit/Write — rules.ts, biome.json, etc.
│   ├── pre-commit-check.ts               # PreToolUse:Bash — lint+typecheck before commit
│   ├── harden-gate.ts                    # PostToolUse:Write/Edit — real-time security checks
│   ├── warn-console-log.ts               # PostToolUse:Write/Edit — console.log warning
│   ├── warn-unbounded-read.ts            # PostToolUse:Read — token efficiency
│   ├── warn-unbounded-bash.ts            # PreToolUse:Bash — token efficiency
│   ├── stop-quality-gate.ts              # Stop — batch lint+typecheck on changed files
│   ├── update-context-files.ts           # Stop — regenerate CLAUDE.md footers
│   ├── update-manifest.ts                # Stop — keep docs/MANIFEST.md in sync
│   ├── reinject-context.ts               # SessionStart:compact — re-inject rules
│   ├── consistency-checks.ts             # SessionStart — north-star + taxonomy + skills match
│   └── notify-done.ts                    # Stop — finish notification
│
├── skills/                               # Gaia + gstack skills
│   ├── gstack/                           # Vendored foundation
│   │   ├── plan/SKILL.md
│   │   ├── review/SKILL.md
│   │   └── qa/SKILL.md
│   ├── d-strategy/                       # Initiative Q&A → initiative.md
│   ├── d-roadmap/                        # Initiative → projects/*.md
│   ├── d-tdd/                            # (was d-code) TDD orchestration from project
│   ├── d-content/                        # Strategy → branded content
│   ├── d-review/                         # Pre-commit review (principles + code health)
│   ├── d-harness/                        # Error → prevention artifact at correct tier
│   ├── d-health/                         # Codebase health audit
│   └── d-fail/                           # Deploy failure recovery
│
├── memory/                               # Agent-only append-only log
│   └── log/                              # *.jsonl, dream-cycle reads from here
│
├── state/                                # Volatile working state, cleared per task
│   ├── WORKSPACE.md
│   └── ACTIVE_PLAN.md
│
└── protocols/                            # Typed tool schemas
    ├── tool-schemas/
    │   ├── github.schema.ts
    │   ├── bash.schema.ts
    │   ├── deploy.schema.ts
    │   └── database.schema.ts
    ├── permissions.md                    # Always-allowed / requires-approval / never-allowed
    └── delegation.md                     # Sub-agent handoff rules

CLAUDE.md                                 # Root resolver (~50 lines)

docs/
├── MANIFEST.md                           # Index of folders with CLAUDE.mds and why
├── reference/                            # The 15 reference files (the constitution)
│   ├── code.md
│   ├── backend.md
│   ├── frontend.md
│   ├── database.md
│   ├── testing.md
│   ├── errors.md
│   ├── security.md
│   ├── observability.md
│   ├── commands.md
│   ├── design.md
│   ├── tokens.md
│   ├── ux.md
│   ├── dx.md
│   ├── ax.md
│   └── voice.md
├── adr/                                  # Append-only architecture decisions
├── spec/                                 # Product behavior specs
├── memo/                                 # Strategy and positioning memos
└── runbook/                              # Operational procedures

tools/
└── gritql-rules/                         # Custom Biome GritQL rules
    ├── schema-source-required.grit
    ├── require-route-schema.grit
    ├── route-operations-allowlist.grit
    ├── feature-plugin-shape.grit
    ├── schema-naming-convention.grit
    ├── service-purity.grit
    ├── auth-context-provider.grit
    ├── result-only-at-allowed-seams.grit
    ├── throwError-requires-context.grit
    └── ... (one per principle that needs codebase-pattern enforcement)

scripts/                                  # Cross-file checks
├── check-tests-exist.ts
├── check-tests-colocated.ts
├── test-ratio-check.ts
├── check-manifest.ts
├── check-rules-coverage.ts               # Audits: every principle has a mechanism
├── check-resolvable.ts                   # Audits: every skill is reachable from CLAUDE.md
└── ...

.github/workflows/
├── ci.yml                                # Required checks
├── mutation.yml                          # Weekly mutation testing
├── lighthouse.yml                        # Weekly perf audit
└── ...
```

---

## Build sequence

The order of construction matters. Earlier steps unblock later ones.

1. **Lock `.claude/rules.ts` schema** — what shape does a rule entry have? Without this, every mechanism is freestyle. (Open spec #1)

2. **Build `lib/instrumentation.ts`** — size + latency budget for hooks. Every later hook imports this.

3. **Port the existing 11 hooks** from the current implementation to read from `.claude/rules.ts` instead of from inline constants. Add the missing ones (`warn-unbounded-read`, `warn-unbounded-bash`, `update-manifest`, `consistency-checks`).

4. **Set up GritQL rules folder** at `tools/gritql-rules/` with one starter rule (`schema-source-required.grit`) end-to-end — proves the pipeline.

5. **Inventory every reference file's principles** into a master table at `scripts/check-rules-coverage.ts`. This is the audit that catches drift between document and mechanism.

6. **Build mechanisms one reference file at a time**, in dependency order: `code.md` → `errors.md` → `backend.md` → `frontend.md` → `database.md` → `testing.md` → `security.md` → `observability.md` → `commands.md` → `design.md` → `tokens.md` → `ux.md` → `dx.md` → `ax.md` → `voice.md`.

7. **For each principle:** write the mechanism, register in `.claude/rules.ts`, add a fixture test that proves it catches the violation it should and doesn't false-positive on valid code.

8. **Build the seven scripts** in `scripts/`. Wire them into CI.

9. **Build the `/review` skill** to run the full mechanism suite + LLM-judgment heuristics for principles 6 (extraction quality) and 10 (code health scoring).

10. **Rewrite root CLAUDE.md** to resolver-only shape (~50 lines).

11. **Build `docs/MANIFEST.md`** with current folder list and why each folder has its own CLAUDE.md.

12. **Add the auto-footer regeneration** to `update-context-files.ts` (Stop hook).

13. **Wire CI** with the full required-check list.

14. **Run `check-rules-coverage.ts`** — every principle in every reference file has a mechanism. Any orphan = bug.

---

## Open questions

These block downstream work and need to be answered before implementation begins.

**Q1. The exact `.claude/rules.ts` schema.** What fields are required per rule? Document path + line, mechanism IDs, severity, fixable flag, severity auto-promotion conditions, demotion conditions. The schema affects everything downstream because all mechanisms register against it. **Recommendation:** lock as the first build step, with a schema validator that tests a sample rule round-trips through the editor / hooks / CI / `/review`.

**Q2. Oxlint vs. Biome with GritQL — is it both?** Vision-v5 says both. Oxlint is fast for built-in rules; GritQL is more expressive for codebase-specific patterns. **Recommendation:** keep both. Built-in patterns (no-unknown, no-bare-catch, no-console-log) → Oxlint. Codebase-specific patterns (route shape, schema source, service purity) → GritQL. One mechanism per rule; never both for the same principle.

**Q3. Which reference files are v1-mandatory and which are deferred?** All 15 are listed in vision-v5 but writing 150+ mechanisms before shipping is a long road. **Recommendation:** v1 ships with mechanisms for `code.md`, `backend.md`, `errors.md`, `testing.md`, `security.md` (the engineering core). `frontend.md` ships with at least the route-shape and accessibility mechanisms. The experience-axis files (`design.md`, `voice.md`, `ux.md`, `dx.md`, `ax.md`, `tokens.md`) ship with `/review`-skill heuristics initially, with deterministic mechanisms added as patterns repeat.

**Q4. d-code rename to d-tdd or d-implement?** The current d-code skill is "TDD orchestration from a project file," not code generation. The name invites confusion with vision-v5's "no code skill" principle. **Recommendation:** rename to `d-tdd`. Update root CLAUDE.md routing.

**Q5. The fifth lifecycle moment (SkillActivate).** Claude Code does not natively emit a skill-activation event. Two options: (a) drop the fifth moment, handle "load knowledge on first activation" inside the skill file itself; (b) build a custom event by intercepting skill loads in a sub-skill wrapper. **Recommendation:** drop. Four native moments are enough; skills handle their own first-load logic.

**Q6. Where does memory dream cycle live?** `.claude/memory/dream.ts` as a Bun cron, or a `scripts/dream.ts` that's just any cron job? **Recommendation:** `.claude/memory/dream.ts` because it's harness machinery, not a one-off script. Wired to system cron at install time.

**Q7. Footer regeneration cost.** The Stop hook regenerating every changed folder's CLAUDE.md footer can be slow on large changes. **Recommendation:** the hook regenerates only folders whose contents changed in this session (diff against session-start state); full regeneration is a separate `bun run regen-footers` command for occasional maintenance.

**Q8. Vision-v5 update.** Vision-v5 currently says `.gaia/`. Harness lives in `.claude/`. Vision-v5 also prescribes `AGENTS.md`, `RESOLVER.md`, and `_manifest.jsonl` which Claude Code's native discovery makes redundant. **Recommendation:** ship a vision v5.1 update alongside this plan: replace `.gaia/` with `.claude/` throughout, drop the AGENTS/RESOLVER/manifest files, document the resolver-pattern-in-CLAUDE.md as the replacement.

**Q9. The decisions/ folder confusion.** The current implementation has a `decisions/` folder with three-domain split (product/growth/harness). Vision-v5 has `docs/reference/` for the constitution and `initiatives/` for strategic bets. These conflict. **Recommendation:** vision-v5 wins. Constitution lives in `docs/reference/`; initiatives live at `initiatives/YYYY-MM-DD-name/` per `workflow.md`. The `decisions/` folder is retired. The three-domain split (product/growth/harness) is preserved as roadmap section structure inside `roadmap.md`, not as a folder hierarchy.

**Q10. Skill self-rewrite gating.** Vision-v5 says skills self-rewrite via PR with trigger-eval diff. The trigger-eval infrastructure does not yet exist. **Recommendation:** block self-rewrite until trigger-eval suite exists (open spec). Skills can propose edits as inert markdown comments; they don't auto-PR until evals are in place.

**Q11. Hook order on the same event.** Multiple hooks fire on `Stop`. What's the order? **Recommendation:** explicit order in `.claude/settings.json`; hooks declare dependencies in their frontmatter; `consistency-checks` runs first, `notify-done` runs last, others ordered by declared dependencies.

**Q12. CI vs. local hook redundancy.** Many checks (lint, typecheck, test) run in both `pre-commit-check.ts` (local) and CI. Is this redundancy intentional? **Recommendation:** yes, but with different scopes. Local hook runs on changed files only (fast feedback). CI runs on the full repo (correctness gate). Local hook failure does not block commit if `--no-verify` is used; CI failure blocks merge regardless.

---

## What this plan does not specify

Deliberately deferred:

- **The 150+ specific mechanisms.** The plan names categories and shows examples; the actual GritQL queries, oxlint rule configurations, and script implementations are work to do during build, not to specify in advance.
- **The exact CI workflow file content.** Depends on which mechanisms ship in v1 (Q3).
- **The `/review` skill's full prompt.** Depends on which principles are LLM-judgment-only (varies by reference file).
- **The trigger-eval infrastructure.** Listed as a vision-v5 open spec; harness depends on it but doesn't define it.
- **Conductor.build configuration.** Workflow's runtime, specified in vision's Orchestration section (deferred).

---

## Verification

This plan is ready to execute when:

- All 12 open questions have answers (or are deferred with explicit rationale)
- The `.claude/rules.ts` schema is locked (Q1)
- The reference-file v1 scope is locked (Q3)
- Vision-v5.1 update is committed (Q8, Q9)

Then build sequence step 1 begins.

---

*Next move after this plan is read: lock the open questions, then start step 1 (rules.ts schema).*
