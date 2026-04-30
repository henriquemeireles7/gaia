// .gaia/rules/skills/a-ai.ts — rules owned by `a-ai`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'a-ai' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'a-ai' as const

export const aAiRules = [
  {
    id: 'ai/prompts-as-constants',
    skill: 'a-ai',
    description:
      'System prompts are TypeScript constants in apps/api/server/<feature>/prompts.ts; no inline strings.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-prompts-as-constants' },
  },
  {
    id: 'ai/bounded-calls',
    skill: 'a-ai',
    description:
      'Every complete() call provides maxTokens; output structure pinned via JSON mode or tool-use.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-bounded-calls' },
  },
  {
    id: 'ai/model-pinned',
    skill: 'a-ai',
    description:
      'Model identity is a named constant (MODELS.<feature>); no string literals scattered.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-model-pinned' },
  },
  {
    id: 'ai/cache-hit-target',
    skill: 'a-ai',
    description: 'Per-feature cache-hit rate target ≥30%; alerts when sustained below.',
    tier: 'architecture',
    mechanism: {
      kind: 'advisory',
      reason:
        'Cache-hit rate is a runtime metric — not catchable at commit. Configure Axiom alert at <30% rolling 24h on apps/api/features/*/cache_hit gauge.',
    },
  },
  {
    id: 'ai/stream-cancel',
    skill: 'a-ai',
    description: 'Streaming routes propagate AbortSignal upstream and set X-Accel-Buffering: no.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-stream-cancel' },
  },
  {
    id: 'ai/tool-loop-bounded',
    skill: 'a-ai',
    description:
      'Tool-use loops bounded (max depth 10, max same-tool retries 3). Audit log on every tool call.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'ai-tool-loop-bounded' },
  },
] as const satisfies readonly Rule[]
