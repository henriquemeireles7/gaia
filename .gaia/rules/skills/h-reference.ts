// .gaia/rules/skills/h-reference.ts — rules owned by `h-reference`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'h-reference' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'h-reference' as const

export const hReferenceRules = [
  {
    id: 'references/voice-consulted',
    skill: 'h-reference',
    description:
      'References are imperative and consulted-during-action; tutorial-style narration belongs in dx.md or README.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-voice.ts' },
  },
  {
    id: 'references/principle-shape',
    skill: 'h-reference',
    description:
      'Every numbered reference principle has the 5-part shape: title+description, 2-4 rules bullets, enforcement, anti-pattern, pattern.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-shape.ts' },
  },
  {
    id: 'references/principle-has-rule',
    skill: 'h-reference',
    description:
      'Every reference principle maps 1:1 to a rules.ts entry (even pending). Reference principles without a rule are aspirational.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-rule-mapping.ts' },
  },
  {
    id: 'references/feature-scope',
    skill: 'h-reference',
    description:
      'Per-feature references live at .gaia/reference/features/<feature>.md and load only when editing that feature.',
    tier: 'architecture',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'references/adversarial-review',
    skill: 'h-reference',
    description:
      'New reference files (or major rewrites) include a 6-specialist adversarial review per principle in the PR.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'w-review',
      heuristic: '.claude/skills/w-review/heuristics/check-adversarial-review.ts',
    },
  },
  {
    id: 'references/staleness',
    skill: 'h-reference',
    description:
      'References declare a Last verified date; >180 days without re-verification is debt, surfaced by a-health.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-staleness.ts' },
  },
  {
    id: 'references/voice-imperative',
    skill: 'h-reference',
    description:
      'Reference principles use imperative present tense; avoid hedge words ("tend to", "usually", "you might want to").',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-voice.ts' },
  },
] as const satisfies readonly Rule[]
