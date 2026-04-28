// .gaia/rules.ts — single policy source (vision §H9)
//
// One file consumed by Claude Code hooks, CI workflows, editor
// integrations, and optional pre-commit hooks. Drift is structurally
// impossible because there is exactly one source.
//
// Each rule maps to a `reference` domain (one of the constitution files
// in .gaia/reference/) and a `mechanism` describing where enforcement
// lives. Mechanisms with `kind: 'pending'` are aspirational — the rule
// is documented but not yet enforced. v1 ships with at least one
// mechanism per reference file (vision §Open-Specs-4); the rest are
// tracked here so the gap is visible.

export type ReferenceDomain =
  | 'code'
  | 'backend'
  | 'frontend'
  | 'database'
  | 'testing'
  | 'errors'
  | 'security'
  | 'observability'
  | 'commands'
  | 'design'
  | 'tokens'
  | 'ux'
  | 'dx'
  | 'ax'
  | 'voice'
  | 'workflow'
  | 'harness'
  | 'deployment'
  | 'methodology'
  | 'ai'
  | 'skills'

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

export type Mechanism =
  | { kind: 'pending'; note: string }
  | { kind: 'hook'; hook: string }
  | { kind: 'script'; script: string }
  | { kind: 'oxlint'; rule: string }
  | { kind: 'ast-grep'; rule: string }
  | { kind: 'tsc' }
  | { kind: 'ci'; job: string }

export type Rule = {
  /** Stable identifier — used in hook output and CI logs. */
  id: string
  /** Reference file this rule enforces. */
  reference: ReferenceDomain
  /** One-line summary. */
  description: string
  /** Tier in the escalation hierarchy (vision §5). */
  tier: RuleTier
  /** Where enforcement lives. `pending` means documented but not enforced. */
  mechanism: Mechanism
  /** Optional blocked patterns/paths consumed by hooks. */
  blocked?: readonly string[]
}

// ============================================================
// Rules organized by reference domain. Keep this list flat — one
// entry per (reference × concern).
// ============================================================

export const rules: readonly Rule[] = [
  // ─── code.md (the constitution itself) ───────────────────────
  {
    id: 'code/run-check-before-commit',
    reference: 'code',
    description: '`bun run check` (lint + typecheck + harden + test) must pass before any commit.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/pre-commit-check.ts' },
  },
  {
    id: 'code/no-as-any',
    reference: 'code',
    description: '`as any` is banned in feature/service code; types must be earned.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'typescript/no-explicit-any' },
  },
  {
    id: 'code/agents-duplicate-humans-extract',
    reference: 'code',
    description:
      'Agents do not invent abstractions. Humans extract after 3+ occurrences with shared change reason.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: '/review heuristic flags agent-invented abstractions' },
  },

  // ─── backend.md ───────────────────────────────────────────────
  {
    id: 'backend/route-typebox-required',
    reference: 'backend',
    description:
      'Every Elysia route with body/query/params must declare a TypeBox schema for each.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule require-route-schema (planned)',
    },
  },
  {
    id: 'backend/route-response-schema-required',
    reference: 'backend',
    description: 'Every route declares response schemas keyed by status code.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule require-route-response (planned)',
    },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    reference: 'backend',
    description: 'Feature code must not import vendor SDKs directly; go through packages/adapters.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule no-vendor-import-in-features (planned)',
    },
  },
  {
    id: 'backend/protected-by-default',
    reference: 'backend',
    description:
      'Every Elysia plugin in features/*/routes.ts composes either protectedRoute or publicRoute.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-route-wrapper (planned)' },
  },

  // ─── database.md ──────────────────────────────────────────────
  {
    id: 'database/no-sql-interpolation',
    reference: 'database',
    description: 'No SQL via string interpolation — use Drizzle query builder.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/migrations-versioned',
    reference: 'database',
    description: 'Schema changes go through drizzle-kit generate; manual SQL never edits live DB.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'documented in database.md' },
  },

  // ─── testing.md ───────────────────────────────────────────────
  {
    id: 'testing/colocated-tests',
    reference: 'testing',
    description: 'Tests live next to source: foo.ts → foo.test.ts in same folder.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tests-exist.ts' },
  },
  // testing/integration-uses-eden-treaty defined further below in
  // the additions section (single source of truth for this id).

  // ─── errors.md ────────────────────────────────────────────────
  {
    id: 'errors/no-throw-literal',
    reference: 'errors',
    description:
      'Throwing string literals is banned (`throw "fail"`); throw `new AppError("CODE")` instead.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-throw-literal' },
  },
  {
    id: 'errors/no-bare-catch',
    reference: 'errors',
    description:
      '`catch` blocks must either re-throw, call a typed handler, or check a specific error type.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'Oxlint no-bare-catch (planned)' },
  },

  // ─── security.md ──────────────────────────────────────────────
  {
    id: 'security/protect-config',
    reference: 'security',
    description: 'Block edits to locked config files unless explicitly authorized.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-config.ts' },
    blocked: ['tsconfig.json', '.oxlintrc.json', '.oxfmtrc.json', 'sgconfig.yml'],
  },
  {
    id: 'security/no-secrets-committed',
    reference: 'security',
    description: 'Block .env and *.key/*.pem files from being staged or committed.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.env', '*.key', '*.pem'],
  },
  {
    id: 'security/no-dangerous-shell',
    reference: 'security',
    description:
      'Block destructive shell commands (rm -rf, force-push, git reset --hard, etc.) at PreToolUse.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/block-dangerous.ts' },
  },
  {
    id: 'security/no-raw-env',
    reference: 'security',
    description:
      'Code outside packages/config/env.ts must not read process.env directly. Import `env` instead.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-hardcoded-secrets',
    reference: 'security',
    description: 'Block hardcoded production secrets matching common provider prefixes.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-eval',
    reference: 'security',
    description: 'eval() and new Function() are banned in shipped code.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-log-secrets',
    reference: 'security',
    description: 'console calls must not log password/secret/token/apiKey/auth_token variables.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── observability.md ────────────────────────────────────────
  {
    id: 'observability/no-console-log-in-prod',
    reference: 'observability',
    description: 'console.log in shipped code is a smell — use the structured logger.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/warn-console-log.ts' },
  },
  {
    id: 'observability/init-at-boot',
    reference: 'observability',
    description: 'apps/api/server/app.ts must call initObservability(env) before listen().',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-observability-init.ts' },
  },

  // ─── harness.md ──────────────────────────────────────────────
  {
    id: 'harness/security-harden-gate',
    reference: 'harness',
    description: 'Mechanical security validations gate every commit (env, secrets, eval, SQL).',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/harden-gate.ts' },
  },
  {
    id: 'harness/auto-load-references',
    reference: 'harness',
    description:
      'Editing a file in domain X advises the agent to read .gaia/reference/<X>.md first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/permissions-immutable',
    reference: 'harness',
    description:
      '.gaia/protocols/permissions.md and delegation.md cannot be modified by hook or skill.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.gaia/protocols/permissions.md', '.gaia/protocols/delegation.md'],
  },
  {
    id: 'harness/manifest-coverage',
    reference: 'harness',
    description: '.gaia/MANIFEST.md lists every folder with a CLAUDE.md and vice versa.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-manifest.ts' },
  },
  {
    id: 'code/knip-gate-production',
    reference: 'code',
    description:
      'Dead code / unused dependencies fail CI. Knip runs as a gate (not advisory) on every PR.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'dead-code' },
  },

  // ─── commands.md ─────────────────────────────────────────────
  {
    id: 'commands/use-bun-not-npm',
    reference: 'commands',
    description: 'Bun is the package manager and runtime; npm/pnpm/yarn invocations are wrong.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── code.md (additions) ─────────────────────────────────────
  {
    id: 'code/named-errors-no-bare-throw',
    reference: 'code',
    description:
      'Feature/service code must not `throw new Error(...)` — use AppError from @gaia/errors.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-no-throw-new-error-in-features' },
  },
  {
    id: 'code/one-schema-many-consumers',
    reference: 'code',
    description:
      'Shapes flow from one source (Drizzle schema → drizzle-typebox → Eden Treaty types). No manual `type Foo = {...}` paralleling a schema.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'GritQL rule detect-manual-shape-types-paralleling-schema',
    },
  },

  // ─── backend.md (additions) ──────────────────────────────────
  {
    id: 'backend/no-hono-imports',
    reference: 'backend',
    description: 'Hono is the legacy stack; new code must not import from `hono` or `@hono/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-elysia-in-adapters',
    reference: 'backend',
    description:
      'Adapters (packages/adapters/) are framework-independent — no imports from `elysia` or `@elysiajs/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    reference: 'backend',
    description:
      'Feature code must not import vendor SDKs directly — go through @gaia/adapters/<capability>.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-vendor-sdk-in-features' },
  },
  {
    id: 'backend/no-sibling-feature-imports',
    reference: 'backend',
    description:
      'Features in apps/api/features/<X>/ must not import from sibling feature folders. Cross-feature reuse is via @gaia/<package> promotion.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-sibling-feature-imports' },
  },

  // ─── frontend.md ─────────────────────────────────────────────
  {
    id: 'frontend/no-direct-fetch-in-routes',
    reference: 'frontend',
    description:
      'apps/web/src/routes/** must not call `fetch()` directly — use the typed Eden Treaty client from ~/lib/api.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-vendor-sdk-on-client',
    reference: 'frontend',
    description:
      'apps/web/** must not import vendor SDKs (Polar, Stripe, Resend, Anthropic). Vendor calls go server-side via Eden Treaty.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-hardcoded-colors',
    reference: 'frontend',
    description: 'apps/web/** must not embed hex/rgb colors — read from the design tokens.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/routes-call-pass-render-only',
    reference: 'frontend',
    description:
      'Route components do three things: call (service/resource/signal), pass (props), render (JSX). No business logic in routes.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL route-operations rule' },
  },

  // ─── database.md (additions) ─────────────────────────────────
  {
    id: 'database/no-raw-pg-bypass',
    reference: 'database',
    description:
      'Direct `postgres` driver imports are restricted to packages/db/. Everywhere else uses Drizzle via @gaia/db.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/typebox-derivation-mandatory',
    reference: 'database',
    description:
      'TypeBox schemas for tables must derive from Drizzle (drizzle-typebox createSelectSchema / createInsertSchema).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-drizzle-typebox' },
  },
  {
    id: 'database/audit-columns-required',
    reference: 'database',
    description:
      'Every Drizzle table (`pgTable(...)`) declares `createdAt`. Mutable tables also declare `updatedAt` (judgment-tier, /review).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'database-audit-columns-required' },
  },

  // ─── testing.md (additions) ──────────────────────────────────
  {
    id: 'testing/no-test-only',
    reference: 'testing',
    description:
      '`it.only` / `describe.only` / `test.only` must not be committed — they hide skipped tests.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'testing/integration-uses-eden-treaty',
    reference: 'testing',
    description:
      '*.integration.test.ts uses Eden Treaty (treaty(app)) against the live app instance.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-integration-treaty.ts' },
  },

  // ─── errors.md (additions) ───────────────────────────────────
  {
    id: 'errors/no-leak-secrets-in-messages',
    reference: 'errors',
    description:
      'Error messages must not interpolate password/secret/token/api_key into user-visible strings.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'errors/no-bare-catch',
    reference: 'errors',
    description:
      '`catch` blocks must rethrow, handle a specific error type, or call a typed handler.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-empty' },
  },

  // ─── security.md (additions) ─────────────────────────────────
  {
    id: 'security/cve-scan-ci',
    reference: 'security',
    description: 'osv-scanner runs on every PR; high/critical CVEs block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'deps' },
  },
  {
    id: 'security/secret-scan-ci',
    reference: 'security',
    description: 'gitleaks runs on every PR; committed secrets block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'secrets' },
  },
  {
    id: 'security/csrf-on-mutations',
    reference: 'security',
    description:
      'POST/PUT/PATCH/DELETE routes apply CSRF middleware (better-auth provides it on protectedRoute).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-csrf-on-mutation' },
  },
  {
    id: 'security/rate-limit-on-public',
    reference: 'security',
    description: 'Public routes apply rate-limit middleware (publicRoute composes it).',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule require-rate-limit-on-public' },
  },

  // ─── observability.md (additions) ────────────────────────────
  {
    id: 'observability/no-pii-in-logs',
    reference: 'observability',
    description:
      'Logger calls must not log objects keyed `password|secret|token|email` — redact first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },

  // ─── tokens.md ───────────────────────────────────────────────
  {
    id: 'tokens/single-source',
    reference: 'tokens',
    description:
      'CSS variables are generated from packages/ui/tokens.ts. packages/ui/styles.css must equal what scripts/generate-tokens-css.ts emits.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: 'scripts/check-tokens-sync.ts' },
  },

  // ─── ax.md ───────────────────────────────────────────────────
  {
    id: 'ax/skill-md-frontmatter',
    reference: 'ax',
    description: 'Every SKILL.md ships with YAML frontmatter declaring `name:` and `description:`.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-skills.ts' },
  },

  // ─── voice.md ────────────────────────────────────────────────
  {
    id: 'voice/no-marketing-vocabulary',
    reference: 'voice',
    description:
      'Avoid marketing buzzwords (revolutionize, seamless, leverage, unlock, cutting-edge) in content/ and root README.md.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-marketing-vocab.ts' },
  },

  // ─── workflow.md ─────────────────────────────────────────────
  {
    id: 'workflow/initiative-frontmatter-required',
    reference: 'workflow',
    description:
      'Initiative .md files in .gaia/initiatives/*/ declare parent, hypothesis, and measurement fields.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },
  {
    id: 'workflow/project-touches-required',
    reference: 'workflow',
    description: 'Project .md files declare `touches:` (files/modules) and `depends_on:` arrays.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/validate-artifacts.ts' },
  },

  // ─── dx.md ───────────────────────────────────────────────────
  {
    id: 'dx/stdout-data-stderr-narration',
    reference: 'dx',
    description:
      'CLI scripts print data to stdout and narration to stderr — enables piping without corruption.',
    tier: 'lint',
    mechanism: { kind: 'script', script: 'scripts/check-cli-stdout.ts' },
  },
] as const

export type RuleId = (typeof rules)[number]['id']

export function findRule(id: string): Rule | undefined {
  return rules.find((r) => r.id === id)
}

export function rulesForReference(ref: ReferenceDomain): readonly Rule[] {
  return rules.filter((r) => r.reference === ref)
}

export function rulesByMechanism(kind: Mechanism['kind']): readonly Rule[] {
  return rules.filter((r) => r.mechanism.kind === kind)
}

/**
 * Return all blocked patterns for a given rule id. Hooks that need a
 * shared blocklist (e.g. protect-config, protect-files) read from here
 * instead of hardcoding paths — vision §H9.
 */
export function blockedFor(id: string): readonly string[] {
  return findRule(id)?.blocked ?? []
}

/**
 * Reference domains the harness has at least one enforced mechanism for.
 * Used by /review and audit reporting to show the enforcement coverage
 * of the constitution.
 */
export function enforcedReferences(): readonly ReferenceDomain[] {
  const set = new Set<ReferenceDomain>()
  for (const r of rules) {
    if (r.mechanism.kind !== 'pending') set.add(r.reference)
  }
  return [...set]
}
