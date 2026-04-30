// .gaia/rules/index.ts — single policy source (vision §H9), assembled
// from per-skill and per-folder shards.
//
// One module consumed by Claude Code hooks, CI workflows, editor
// integrations, and pre-commit scripts. Drift across mechanisms is
// structurally impossible because there is exactly one source.
//
// Layout:
//   types.ts              — Rule, Mechanism, SkillDomain, RuleTier
//   skills/{h,w,a}-X.ts   — rules owned by skill `<prefix>-X`
//   folders/<path>.ts     — rules owned by the CLAUDE.md at <path>
//                           (e.g. folders/apps/api.ts owns 'apps/api' rules)
//   checks/               — script-tier mechanism implementations
//   ast-grep/             — pattern-tier mechanism implementations
//
// Invariant: a shard's path equals every contained rule's `skill` field.
// Enforced by .gaia/rules/checks/check-rules-shards.ts.
//
// Hook mechanisms (`kind: 'hook'`) live under .claude/hooks/ because
// Claude Code reads them from there; oxlint/tsc/ci mechanisms live with
// their tools. The shards register them; the implementations stay where
// their invokers expect them.
//
// Schema renamed from ReferenceDomain → SkillDomain in Initiative 0001;
// skill prefix re-categorized in Initiative 0011 (h- harness, w- workflow,
// a- audit). Manifest split into shards in Initiative 0001 follow-up.

import type { Mechanism, Rule, SkillDomain } from './types'

import * as appsApi from './folders/apps/api'
import * as appsWeb from './folders/apps/web'
import * as packagesDb from './folders/packages/db'
import * as packagesUi from './folders/packages/ui'
import * as aAi from './skills/a-ai'
import * as aDx from './skills/a-dx'
import * as aHealth from './skills/a-health'
import * as aObservability from './skills/a-observability'
import * as aSecurity from './skills/a-security'
import * as hReference from './skills/h-reference'
import * as hRules from './skills/h-rules'
import * as hSkill from './skills/h-skill'
import * as wCode from './skills/w-code'
import * as wDeploy from './skills/w-deploy'
import * as wWrite from './skills/w-write'

export type { Mechanism, Rule, RuleTier, SkillDomain } from './types'

export const rules = [
  ...wCode.wCodeRules,
  ...wWrite.wWriteRules,
  ...wDeploy.wDeployRules,
  ...aSecurity.aSecurityRules,
  ...aObservability.aObservabilityRules,
  ...aAi.aAiRules,
  ...aDx.aDxRules,
  ...aHealth.aHealthRules,
  ...hRules.hRulesRules,
  ...hReference.hReferenceRules,
  ...hSkill.hSkillRules,
  ...appsApi.appsApiRules,
  ...appsWeb.appsWebRules,
  ...packagesDb.packagesDbRules,
  ...packagesUi.packagesUiRules,
] as const

export type RuleId = (typeof rules)[number]['id']

export function findRule(id: string): Rule | undefined {
  return rules.find((r) => r.id === id)
}

export function rulesForSkill(skill: SkillDomain): readonly Rule[] {
  return rules.filter((r) => r.skill === skill)
}

export function rulesByMechanism(kind: Mechanism['kind']): readonly Rule[] {
  return rules.filter((r) => r.mechanism.kind === kind)
}

/**
 * Return all blocked patterns for a given rule id. Hooks that need a
 * shared blocklist (e.g. protect-config, protect-files) read from here
 * instead of hardcoding paths — vision §H9.
 */
export function blockedFor(id: string): readonly string[] {
  return findRule(id)?.blocked ?? []
}

/**
 * Skill domains the harness has at least one enforced mechanism for.
 * Used by /w-review and audit reporting to show the enforcement coverage
 * of the constitution.
 */
export function enforcedSkills(): readonly SkillDomain[] {
  const set = new Set<SkillDomain>()
  for (const r of rules) {
    if (r.mechanism.kind !== 'pending') set.add(r.skill)
  }
  return [...set]
}
