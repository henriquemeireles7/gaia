// .gaia/rules/folders/packages/db.ts — rules owned by `packages/db`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'packages/db' (the shard's path identifier).

import type { Rule } from '../../types'

export const skill = 'packages/db' as const

export const packagesDbRules = [
  {
    id: 'database/no-sql-interpolation',
    skill: 'packages/db',
    description: 'No SQL via string interpolation — use Drizzle query builder.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/migrations-versioned',
    skill: 'packages/db',
    description: 'Schema changes go through drizzle-kit generate; manual SQL never edits live DB.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-migrations.ts' },
  },
  {
    id: 'database/no-raw-pg-bypass',
    skill: 'packages/db',
    description:
      'Direct `postgres` driver imports are restricted to packages/db/. Everywhere else uses Drizzle via @gaia/db.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'database/typebox-derivation-mandatory',
    skill: 'packages/db',
    description:
      'TypeBox schemas for tables must derive from Drizzle (drizzle-typebox createSelectSchema / createInsertSchema).',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-typebox-derivation.ts' },
  },
  {
    id: 'database/audit-columns-required',
    skill: 'packages/db',
    description:
      'Every Drizzle table (`pgTable(...)`) declares `createdAt`. Mutable tables also declare `updatedAt` (judgment-tier, /review).',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'database-audit-columns-required' },
  },
] as const satisfies readonly Rule[]
