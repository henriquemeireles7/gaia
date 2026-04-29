// .gaia/rules/folders/apps/api.ts — rules owned by `apps/api`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'apps/api' (the shard's path identifier).

import type { Rule } from '../../types'

export const skill = 'apps/api' as const

export const appsApiRules = [
  {
    id: 'backend/route-typebox-required',
    skill: 'apps/api',
    description:
      'Every Elysia route with body/query/params must declare a TypeBox schema for each.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-route-typebox-required' },
  },
  {
    id: 'backend/route-response-schema-required',
    skill: 'apps/api',
    description: 'Every route declares response schemas keyed by status code.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-route-response-schema-required' },
  },
  {
    id: 'backend/protected-by-default',
    skill: 'apps/api',
    description:
      'Every Elysia plugin in features/*/routes.ts composes either protectedRoute or publicRoute.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-protected-by-default' },
  },
  {
    id: 'backend/no-hono-imports',
    skill: 'apps/api',
    description: 'Hono is the legacy stack; new code must not import from `hono` or `@hono/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-elysia-in-adapters',
    skill: 'apps/api',
    description:
      'Adapters (packages/adapters/) are framework-independent — no imports from `elysia` or `@elysiajs/*`.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'backend/no-vendor-sdk-in-features',
    skill: 'apps/api',
    description:
      'Feature code must not import vendor SDKs directly — go through @gaia/adapters/<capability>.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-vendor-sdk-in-features' },
  },
  {
    id: 'backend/no-sibling-feature-imports',
    skill: 'apps/api',
    description:
      'Features in apps/api/features/<X>/ must not import from sibling feature folders. Cross-feature reuse is via @gaia/<package> promotion.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'backend-no-sibling-feature-imports' },
  },
] as const satisfies readonly Rule[]
