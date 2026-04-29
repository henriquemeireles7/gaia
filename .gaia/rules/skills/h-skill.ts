// .gaia/rules/skills/h-skill.ts — rules owned by `h-skill`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'h-skill' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'h-skill' as const

export const hSkillRules = [
  {
    id: 'ax/skill-md-frontmatter',
    skill: 'h-skill',
    description: 'Every SKILL.md ships with YAML frontmatter declaring `name:` and `description:`.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'skills/output-mode-required',
    skill: 'h-skill',
    description:
      'Every SKILL.md ends with an Output section naming its mode (fix, report, or question).',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'skills/cold-start-safe',
    skill: 'h-skill',
    description:
      'Skills run from a cold start; no "as I mentioned" assumptions; references-by-path for shared content.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'skills/numbered-phases',
    skill: 'h-skill',
    description: 'Skills with non-trivial work use ## Phase N: headers (sequential by default).',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'skills/sandwich-gates',
    skill: 'h-skill',
    description:
      'Skills mutating files have an identical pre-condition (Phase 0) and final-gate phase running the same check.',
    tier: 'architecture',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/w-review/heuristics/check-sandwich-gates.ts',
    },
  },
  {
    id: 'skills/typed-output',
    skill: 'h-skill',
    description:
      'Skill output: one mode per line (fix, report, or question). Reports include numeric confidence.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'skills/sibling-layout',
    skill: 'h-skill',
    description:
      'Sibling files typed by location: <skill>/scripts/* for code, <skill>/templates/* for inputs, <skill>/rules-*.md for sub-instructions.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
] as const satisfies readonly Rule[]
