// .gaia/rules/folders/packages/adapters.ts — rules owned by `packages/adapters`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'packages/adapters' (the shard's path identifier).
//
// Stub coverage — the canonical 10 patterns deserve full enforcement;
// emit via /h-rules. These three pin the highest-leverage invariants.

import type { Rule } from '../../types'

export const skill = 'packages/adapters' as const

export const packagesAdaptersRules = [
  {
    id: 'adapters/no-vendor-sdk-outside-package',
    skill: 'packages/adapters',
    description:
      'Vendor SDK imports (resend, @polar-sh/sdk, @anthropic-ai/sdk, posthog-node) are allowed only in packages/adapters/.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule scoped by file path; emit via /h-rules' },
  },
  {
    id: 'adapters/provider-error-on-failure',
    skill: 'packages/adapters',
    description:
      'Every public adapter function wraps its vendor call in try/catch and throws ProviderError on failure.',
    tier: 'architecture',
    mechanism: { kind: 'pending', note: 'ast-grep on packages/adapters/*.ts; emit via /h-rules' },
  },
  {
    id: 'adapters/no-fetch-outside-adapters',
    skill: 'packages/adapters',
    description:
      'Plain fetch() / Bun.fetch() forbidden outside packages/adapters/ — user-driven URLs go through safeFetch.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: 'oxlint rule; SSRF defense (security #11)' },
  },
] as const satisfies readonly Rule[]
