// .gaia/rules/skills/a-health.ts — rules owned by `a-health`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'a-health' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'a-health' as const

export const aHealthRules = [
  {
    id: 'health/dispatch-not-reaudit',
    skill: 'a-health',
    description:
      'a-health dispatches sibling a-* audits; SKILL.md must not contain checklists that re-implement a sibling audit.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'check-no-duplication.ts (planned) — greps SKILL.md for sibling-owned principle phrases',
    },
  },
  {
    id: 'health/composite-score-formula',
    skill: 'a-health',
    description:
      'Composite score is a 12-axis vector + scalar; weights live in a-health/reference.md and sum to 1.0.',
    tier: 'lint',
    mechanism: {
      kind: 'pending',
      note: 'check-score-formula.ts (planned) — asserts weights sum 1.0 and match aggregate-scores.ts',
    },
  },
  {
    id: 'health/trend-required',
    skill: 'a-health',
    description:
      'Every audit appends a row to the prior .gaia/audits/a-health/<YYYY-MM-DD>.md ## Audit History; missing history surfaces as P0.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/trend.ts',
    },
  },
  {
    id: 'health/worst-file-leaderboard',
    skill: 'a-health',
    description:
      'The audit report ranks top 5 worst files cross-audit; files in ≥3 audits get systemic-debt tag.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/worst-files.ts',
    },
  },
  {
    id: 'health/coverage-drift',
    skill: 'a-health',
    description:
      'Pending rules.ts entries past the 14-day SLO surface as P1 in the audit fix plan.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/rules-coverage.ts' },
  },
  {
    id: 'health/skip-intelligence',
    skill: 'a-health',
    description:
      'An axis with prior ≥9.5 AND zero changed files in scope reuses prior score with (skipped) annotation; --force overrides.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'aggregate-scores.ts respects skip rule and stamps git SHA + tool versions',
    },
  },
  {
    id: 'health/report-only',
    skill: 'a-health',
    description: 'a-health is report-only; only files under .gaia/audits/a-health/ may be written.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'Phase 4 sandwich gate compares git diff --name-only to allowed-writes whitelist',
    },
  },
  {
    id: 'health/partial-report-fallback',
    skill: 'a-health',
    description:
      'Sub-audit failure marks its axis error and the audit completes; partial report beats no report.',
    tier: 'architecture',
    mechanism: {
      kind: 'pending',
      note: 'aggregate-scores.ts wraps each Skill(a-*) call in try/catch; emits axis: "error" on failure',
    },
  },
  {
    id: 'health/continuous-pulse',
    skill: 'a-health',
    description:
      'Stop hook fires quick-pulse.ts after sessions touching ≥10 files; appends one row to .gaia/audits/a-health/pulse.jsonl.',
    tier: 'hook',
    mechanism: {
      kind: 'hook',
      hook: '.claude/skills/a-health/scripts/quick-pulse.ts',
    },
  },
  {
    id: 'health/duplication-budget',
    skill: 'a-health',
    description:
      'check-duplication detects ≥3 occurrences of 5-line normalized shingles across distinct files; budget threshold drives the duplication axis.',
    tier: 'lint',
    mechanism: {
      kind: 'script',
      script: '.claude/skills/a-health/scripts/check-duplication.ts',
    },
  },
  {
    id: 'health/self-audit',
    skill: 'a-health',
    description:
      'a-ax audits a-health on the standard quarterly cadence; a-health does not get a free pass.',
    tier: 'architecture',
    mechanism: {
      kind: 'review',
      skill: 'a-ax',
      heuristic: 'a-ax sweep includes .claude/skills/a-health/SKILL.md and reference.md',
    },
  },
] as const satisfies readonly Rule[]
