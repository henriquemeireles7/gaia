// .gaia/rules/skills/h-rules.ts — rules owned by `h-rules`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'h-rules' (the shard's path identifier).

import type { Rule } from '../types'

export const skill = 'h-rules' as const

export const hRulesRules = [
  {
    id: 'harness/security-harden-gate',
    skill: 'h-rules',
    description: 'Mechanical security validations gate every commit (env, secrets, eval, SQL).',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/harden-gate.ts' },
  },
  {
    id: 'harness/auto-load-references',
    skill: 'h-rules',
    description:
      'Editing a file in domain X advises the agent to read .gaia/reference/<X>.md first.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/permissions-immutable',
    skill: 'h-rules',
    description:
      '.gaia/protocols/permissions.md and delegation.md cannot be modified by hook or skill.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/protect-files.ts' },
    blocked: ['.gaia/protocols/permissions.md', '.gaia/protocols/delegation.md'],
  },
  {
    id: 'harness/manifest-coverage',
    skill: 'h-rules',
    description: '.gaia/MANIFEST.md lists every folder with a CLAUDE.md and vice versa.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-manifest.ts' },
  },
  {
    id: 'commands/use-bun-not-npm',
    skill: 'h-rules',
    description: 'Bun is the package manager and runtime; npm/pnpm/yarn invocations are wrong.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'workflow/initiative-frontmatter-required',
    skill: 'h-rules',
    description:
      'Initiative .md files in .gaia/initiatives/*/ declare parent, hypothesis, and measurement fields.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/validate-artifacts.ts' },
  },
  {
    id: 'workflow/project-touches-required',
    skill: 'h-rules',
    description: 'Project .md files declare `touches:` (files/modules) and `depends_on:` arrays.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/validate-artifacts.ts' },
  },
  {
    id: 'methodology/constitutional-loop',
    skill: 'h-rules',
    description:
      'Every concern has up to three forms (Reference, Rule, Skill). A concern in only one substrate is debt.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/rules-coverage.ts' },
  },
  {
    id: 'methodology/principle-rule-mapping',
    skill: 'h-rules',
    description:
      'Every reference principle maps 1:1 to rules.ts entries. Pending → enforced cycle SLO 14 days.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-reference-rule-mapping.ts' },
  },
  {
    id: 'methodology/hooks-deterministic',
    skill: 'h-rules',
    description:
      'Hooks execute <100ms, no LLM calls, fail-closed. Judgment goes in CLAUDE.mds, not hooks.',
    tier: 'architecture',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-hook-determinism.ts' },
  },
  {
    id: 'methodology/memory-decay',
    skill: 'h-rules',
    description: 'memory/episodic/ entries older than 90 days without re-trigger are archived.',
    tier: 'architecture',
    mechanism: { kind: 'ci', job: 'memory-decay' },
  },
  {
    id: 'harness/skill-reference-pairing',
    skill: 'h-rules',
    description:
      'Every skill has exactly one reference.md sibling. The skill-reference hook auto-loads it on Skill invocation; fails closed if absent.',
    tier: 'lint',
    mechanism: { kind: 'script', script: '.gaia/rules/checks/check-skills.ts' },
  },
  {
    id: 'harness/auto-load-fractal-claude',
    skill: 'h-rules',
    description:
      'Editing a file walks the folder tree from edit target to repo root, loading every CLAUDE.md found. Folder-scoped principles live in fractal CLAUDE.md, not skill folders.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: '.claude/hooks/domain-context.ts' },
  },
  {
    id: 'harness/adr-numbering',
    skill: 'h-rules',
    description:
      'ADRs at .gaia/adrs/NNNN-<title>.md use append-only numbering; superseded ADRs stay with status updated, never deleted.',
    tier: 'lint',
    mechanism: { kind: 'pending', note: '.gaia/rules/checks/check-adr-numbering.ts (planned)' },
  },
] as const satisfies readonly Rule[]
