// .gaia/rules/skills/a-security.ts — rules owned by `a-security`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'a-security' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'a-security' as const

export const aSecurityRules = [
  {
    id: 'security/protect-config',
    skill: 'a-security',
    description: 'Block edits to locked config files unless explicitly authorized.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-config.ts' },
    blocked: ['tsconfig.json', '.oxlintrc.json', '.oxfmtrc.json', 'sgconfig.yml'],
  },
  {
    id: 'security/no-secrets-committed',
    skill: 'a-security',
    description: 'Block .env and *.key/*.pem files from being staged or committed.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.env', '*.key', '*.pem'],
  },
  {
    id: 'security/no-dangerous-shell',
    skill: 'a-security',
    description:
      'Block destructive shell commands (rm -rf, force-push, git reset --hard, etc.) at PreToolUse.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/block-dangerous.ts' },
  },
  {
    id: 'security/no-raw-env',
    skill: 'a-security',
    description:
      'Code outside packages/config/env.ts must not read process.env directly. Import `env` instead.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-hardcoded-secrets',
    skill: 'a-security',
    description: 'Block hardcoded production secrets matching common provider prefixes.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-eval',
    skill: 'a-security',
    description: 'eval() and new Function() are banned in shipped code.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/no-log-secrets',
    skill: 'a-security',
    description: 'console calls must not log password/secret/token/apiKey/auth_token variables.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'security/cve-scan-ci',
    skill: 'a-security',
    description: 'osv-scanner runs on every PR; high/critical CVEs block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'deps' },
  },
  {
    id: 'security/secret-scan-ci',
    skill: 'a-security',
    description: 'gitleaks runs on every PR; committed secrets block merge.',
    tier: 'hook',
    mechanism: { kind: 'ci', job: 'secrets' },
  },
  {
    id: 'security/csrf-on-mutations',
    skill: 'a-security',
    description:
      'POST/PUT/PATCH/DELETE routes apply CSRF middleware (better-auth provides it on protectedRoute).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'security-csrf-on-mutations' },
  },
  {
    id: 'security/rate-limit-on-public',
    skill: 'a-security',
    description: 'Public routes apply rate-limit middleware (publicRoute composes it).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'security-rate-limit-on-public' },
  },
] as const satisfies readonly Rule[]
