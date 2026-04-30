// .gaia/rules/skills/w-write.ts — rules owned by `w-write`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'w-write' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'w-write' as const

export const wWriteRules = [
  {
    id: 'voice/no-marketing-vocabulary',
    skill: 'w-write',
    description:
      'Avoid marketing buzzwords (revolutionize, seamless, leverage, unlock, cutting-edge) in content/ and root README.md.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-marketing-vocab.ts' },
  },
] as const satisfies readonly Rule[]
