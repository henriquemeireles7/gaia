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

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

export type Mechanism =
  | { kind: 'pending'; note: string }
  | { kind: 'hook'; hook: string }
  | { kind: 'script'; script: string }
  | { kind: 'biome'; rule: string }
  | { kind: 'oxlint'; rule: string }
  | { kind: 'gritql'; rule: string }
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
    mechanism: { kind: 'oxlint', rule: 'no-explicit-any' },
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
    mechanism: { kind: 'pending', note: 'check-tests-exist.ts script (planned)' },
  },
  {
    id: 'testing/integration-uses-eden-treaty',
    reference: 'testing',
    description: '*.integration.test.ts must use Eden Treaty against the Elysia app instance.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'GritQL rule (planned)' },
  },

  // ─── errors.md ────────────────────────────────────────────────
  {
    id: 'errors/no-bare-throw-error',
    reference: 'errors',
    description:
      'No `throw new Error(...)` in feature/service code; use named codes from packages/errors.',
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
    blocked: ['biome.json', 'tsconfig.json'],
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
    mechanism: { kind: 'pending', note: 'GritQL rule (planned)' },
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
    description: '.gaia/protocols/permissions.md cannot be modified by hook or skill.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'protect-files.ts to add this path' },
  },

  // ─── commands.md ─────────────────────────────────────────────
  {
    id: 'commands/use-bun-not-npm',
    reference: 'commands',
    description: 'Bun is the package manager and runtime; npm/pnpm/yarn invocations are wrong.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'documented in commands.md' },
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
