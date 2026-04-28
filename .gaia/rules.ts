// .gaia/rules.ts — single policy source (vision §H9)
//
// One file consumed by Claude Code hooks (.claude/hooks/*.ts), CI workflows
// (.github/workflows/*.yml), editor integrations, and optional pre-commit
// hooks. Drift is structurally impossible because there is exactly one
// source.
//
// Every reference principle in `.gaia/reference/*.md` should have at least
// one rule here that enforces it (vision §H14). Rules without enforcement
// are aspirational and get demoted to memo until the mechanism exists.

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

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

export type Rule = {
  /** Stable identifier — referenced by hook output and CI logs. */
  id: string
  /** Reference file this rule enforces. */
  reference: ReferenceDomain
  /** One-line summary. */
  description: string
  /** Where the rule lives in the tier hierarchy (vision §5). */
  tier: RuleTier
  /** Path or symbol implementing the rule. */
  mechanism: string
  /** Optional patterns/paths blocked by this rule. */
  blocked?: readonly string[]
}

/**
 * Starter ruleset. Each phase adds rules; v1 ships at least one mechanism per
 * reference file (vision §Open-Specs-4). Rules without a mechanism file path
 * fail validation in CI.
 */
export const rules: readonly Rule[] = [
  {
    id: 'security/no-secrets-committed',
    reference: 'security',
    description: 'Block .env and *.key/*.pem from being staged or committed.',
    tier: 'hook',
    mechanism: '.claude/hooks/protect-config.ts',
    blocked: ['.env', '*.key', '*.pem'],
  },
  {
    id: 'security/no-dangerous-shell',
    reference: 'security',
    description: 'Block destructive shell commands (rm -rf, force-push, etc.) at PreToolUse.',
    tier: 'hook',
    mechanism: '.claude/hooks/block-dangerous.ts',
  },
  {
    id: 'code/run-check-before-commit',
    reference: 'code',
    description: '`bun run check` (lint + typecheck + harden + test) must pass before any commit.',
    tier: 'hook',
    mechanism: '.claude/hooks/pre-commit-check.ts',
  },
  {
    id: 'observability/no-console-log-in-prod',
    reference: 'observability',
    description: 'console.log in production paths is a smell — use the structured logger.',
    tier: 'hook',
    mechanism: '.claude/hooks/warn-console-log.ts',
  },
  {
    id: 'harness/security-harden-gate',
    reference: 'harness',
    description:
      'Mechanical security validations on every commit (env, headers, CSRF, rate limits).',
    tier: 'hook',
    mechanism: '.claude/hooks/harden-gate.ts',
  },
] as const

export type RuleId = (typeof rules)[number]['id']

export function findRule(id: RuleId): Rule | undefined {
  return rules.find((r) => r.id === id)
}

export function rulesForReference(ref: ReferenceDomain): readonly Rule[] {
  return rules.filter((r) => r.reference === ref)
}
