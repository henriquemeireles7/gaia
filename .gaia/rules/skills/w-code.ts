// .gaia/rules/skills/w-code.ts — rules owned by `w-code`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'w-code' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'w-code' as const

export const wCodeRules = [
  {
    id: 'code/run-check-before-commit',
    skill: 'w-code',
    description: '`bun run check` (lint + typecheck + harden + test) must pass before any commit.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/pre-commit-check.ts' },
  },
  {
    id: 'code/no-as-any',
    skill: 'w-code',
    description: '`as any` is banned in feature/service code; types must be earned.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'typescript/no-explicit-any' },
  },
  {
    id: 'code/agents-duplicate-humans-extract',
    skill: 'w-code',
    description:
      'Agents do not invent abstractions. Humans extract after 3+ occurrences with shared change reason.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'w-review',
      heuristic: '.claude/skills/w-review/heuristics/check-agents-duplicate.ts',
    },
  },
  {
    id: 'testing/colocated-tests',
    skill: 'w-code',
    description: 'Tests live next to source: foo.ts → foo.test.ts in same folder.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-tests-exist.ts' },
  },
  {
    id: 'errors/no-throw-literal',
    skill: 'w-code',
    description:
      'Throwing string literals is banned (`throw "fail"`); throw `new AppError("CODE")` instead.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-throw-literal' },
  },
  {
    id: 'code/knip-gate-production',
    skill: 'w-code',
    description:
      'Dead code / unused dependencies fail CI. Knip runs as a gate (not advisory) on every PR.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'dead-code' },
  },
  {
    id: 'code/named-errors-no-bare-throw',
    skill: 'w-code',
    description:
      'Feature/service code must not `throw new Error(...)` — use AppError from @gaia/errors.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-no-throw-new-error-in-features' },
  },
  {
    id: 'code/one-schema-many-consumers',
    skill: 'w-code',
    description:
      'Shapes flow from one source (Drizzle schema → drizzle-typebox → Eden Treaty types). No manual `type Foo = {...}` paralleling a schema.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'code-one-schema-many-consumers' },
  },
  {
    id: 'testing/no-test-only',
    skill: 'w-code',
    description:
      '`it.only` / `describe.only` / `test.only` must not be committed — they hide skipped tests.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'testing/integration-uses-eden-treaty',
    skill: 'w-code',
    description:
      '*.integration.test.ts uses Eden Treaty (treaty(app)) against the live app instance.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-integration-treaty.ts' },
  },
  {
    id: 'errors/no-leak-secrets-in-messages',
    skill: 'w-code',
    description:
      'Error messages must not interpolate password/secret/token/api_key into user-visible strings.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'errors/no-bare-catch',
    skill: 'w-code',
    description:
      '`catch` blocks must rethrow, handle a specific error type, or call a typed handler.',
    tier: 'lint',
    mechanism: { kind: 'oxlint', rule: 'no-empty' },
  },
] as const satisfies readonly Rule[]
