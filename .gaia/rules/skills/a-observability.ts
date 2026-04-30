// .gaia/rules/skills/a-observability.ts — rules owned by `a-observability`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'a-observability' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'a-observability' as const

export const aObservabilityRules = [
  {
    id: 'observability/no-console-log-in-prod',
    skill: 'a-observability',
    description: 'console.log in shipped code is a smell — use the structured logger.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/warn-console-log.ts' },
  },
  {
    id: 'observability/init-at-boot',
    skill: 'a-observability',
    description: 'apps/api/server/app.ts must call initObservability(env) before listen().',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-observability-init.ts' },
  },
  {
    id: 'observability/no-pii-in-logs',
    skill: 'a-observability',
    description:
      'Logger calls must not log objects keyed `password|secret|token|email` — redact first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'observability/ai-trace-tags',
    skill: 'a-observability',
    description:
      'Every AI call emits a trace span with tags: model, tokens (in/out/cache), latency, cost, tool_use_count, error_class.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/w-review/heuristics/check-ai-trace-tags.ts',
    },
  },
] as const satisfies readonly Rule[]
