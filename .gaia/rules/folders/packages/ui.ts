// .gaia/rules/folders/packages/ui.ts — rules owned by `packages/ui`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'packages/ui' (the shard's path identifier).

import type { Rule } from '../../types'

export const skill = 'packages/ui' as const

export const packagesUiRules = [
  {
    id: 'tokens/single-source',
    skill: 'packages/ui',
    description:
      'CSS variables are generated from packages/ui/tokens.ts. packages/ui/styles.css must equal what scripts/generate-tokens-css.ts emits.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-tokens-sync.ts' },
  },
] as const satisfies readonly Rule[]
