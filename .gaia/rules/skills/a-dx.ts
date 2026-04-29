// .gaia/rules/skills/a-dx.ts — rules owned by `a-dx`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'a-dx' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'a-dx' as const

export const aDxRules = [
  {
    id: 'dx/stdout-data-stderr-narration',
    skill: 'a-dx',
    description:
      'CLI scripts print data to stdout and narration to stderr — enables piping without corruption.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-cli-stdout.ts' },
  },
] as const satisfies readonly Rule[]
