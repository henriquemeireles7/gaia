// .gaia/rules/folders/packages/auth.ts — rules owned by `packages/auth`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'packages/auth' (the shard's path identifier).

import type { Rule } from '../../types'

export const skill = 'packages/auth' as const

export const packagesAuthRules = [
  {
    id: 'auth/single-entry-point',
    skill: 'packages/auth',
    description:
      "import * from 'better-auth' (and better-auth/*) is allowed only in packages/auth/.",
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule scoped by file path' },
  },
  {
    id: 'auth/get-session-only',
    skill: 'packages/auth',
    description:
      'auth.api.getSession is the only API for session lookups — no manual cookie parsing or db.query.sessions reads outside packages/auth/.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'ast-grep on routes; advisory in /w-review' },
  },
  {
    id: 'auth/argon2id-passwords',
    skill: 'packages/auth',
    description:
      'Passwords hash with Bun.password.hash(pw, "argon2id"). bcrypt and sha-* are banned.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule; harden-check could enforce' },
  },
] as const satisfies readonly Rule[]
