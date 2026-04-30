// .gaia/rules/types.ts — types for the policy manifest.
//
// Pulled out of index.ts so shards (skills/*, folders/**) and the index
// can both import without circularity. Consumers should keep importing
// from `.gaia/rules` (i.e. index.ts), which re-exports everything here.
//
// Skill prefix categorization (Initiative 0011):
//   h- harness    — meta-authoring of the SRR triad (skill/reference/rules)
//   w- workflow   — does the work
//   a- audit      — scores the work

export type SkillDomain =
  // Workflow (w-*) — does the work
  | 'w-code'
  | 'w-write'
  | 'w-deploy'
  | 'w-infra'
  | 'w-initiative'
  | 'w-review'
  | 'w-debug'
  // Audit (a-*) — scores the work
  | 'a-health'
  | 'a-security'
  | 'a-ai'
  | 'a-ax'
  | 'a-ux'
  | 'a-observability'
  | 'a-dx'
  // Harness (h-*) — meta-authoring of the SRR triad
  | 'h-rules'
  | 'h-reference'
  | 'h-skill'
  // Fractal CLAUDE.md folders
  | 'apps/api'
  | 'apps/web'
  | 'packages/db'
  | 'packages/ui'
  | 'packages/auth'
  | 'packages/security'
  | 'packages/adapters'

export type RuleTier = 'test' | 'lint' | 'hook' | 'architecture'

export type Mechanism =
  | { kind: 'pending'; note: string }
  | { kind: 'hook'; hook: string }
  | { kind: 'script'; script: string }
  | { kind: 'oxlint'; rule: string }
  | { kind: 'ast-grep'; rule: string }
  | { kind: 'tsc' }
  | { kind: 'ci'; job: string }
  /** LLM-judgment heuristic, executed by a skill (e.g. /w-review). Not deterministic. */
  | { kind: 'review'; skill: string; heuristic: string }
  /** Genuinely unmechanizable; documented only. Reason is mandatory. */
  | { kind: 'advisory'; reason: string }

export type Rule = {
  /** Stable identifier — used in hook output and CI logs. */
  id: string
  /** Skill or folder owning this rule. */
  skill: SkillDomain
  /** One-line summary. */
  description: string
  /** Tier in the escalation hierarchy (vision §5). */
  tier: RuleTier
  /** Where enforcement lives. `pending` means documented but not enforced. */
  mechanism: Mechanism
  /** Optional blocked patterns/paths consumed by hooks. */
  blocked?: readonly string[]
}
