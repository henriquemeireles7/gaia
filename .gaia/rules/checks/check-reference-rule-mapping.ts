// .gaia/rules/checks/check-reference-rule-mapping.ts — references/principle-has-rule + methodology/principle-rule-mapping.
//
// Walk skill `reference.md` files and fractal CLAUDE.mds. For each file
// with numbered principles (### N. ...), require that rules.ts contains
// at least one rule whose `skill` field matches the file's owner domain.
// A reference with N principles but zero rules is purely aspirational.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'
import { rules, type SkillDomain } from '..'

const PRINCIPLE_HEADER = /^###\s+\d+\.\s+/

type Failure = { file: string; principles: number; ruleCount: number; severity: 'error' | 'warn' }
const failures: Failure[] = []

function skillFor(file: string): SkillDomain | null {
  // .claude/skills/<skill>/reference.md → <skill> (h-/w-/a- prefix per Initiative 0011)
  const skillMatch = file.match(/^\.claude\/skills\/([hwa]-[a-z-]+)\/reference\.md$/)
  if (skillMatch) return skillMatch[1] as SkillDomain

  // apps/<x>/CLAUDE.md, packages/<x>/CLAUDE.md → <folder path>
  const folderMatch = file.match(
    /^(apps\/(?:api|web)|packages\/(?:db|ui|auth|security|adapters))\/CLAUDE\.md$/,
  )
  if (folderMatch) return folderMatch[1] as SkillDomain

  return null
}

const counts = new Map<SkillDomain, number>()
for (const r of rules) {
  counts.set(r.skill, (counts.get(r.skill) ?? 0) + 1)
}

const SCAN_PATTERNS = [
  '.claude/skills/[hwa]-*/reference.md',
  'apps/*/CLAUDE.md',
  'packages/*/CLAUDE.md',
]

for (const pattern of SCAN_PATTERNS) {
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    const text = readFileSync(file, 'utf-8')
    const principles = text.split('\n').filter((l) => PRINCIPLE_HEADER.test(l)).length
    if (principles === 0) continue
    const domain = skillFor(file)
    if (!domain) continue
    const ruleCount = counts.get(domain) ?? 0
    if (ruleCount === 0) {
      failures.push({ file, principles, ruleCount, severity: 'error' })
    } else if (ruleCount < principles) {
      failures.push({ file, principles, ruleCount, severity: 'warn' })
    }
  }
}

const errors = failures.filter((f) => f.severity === 'error')

if (failures.length > 0) {
  console.error('reference-rule-mapping — findings:')
  for (const f of failures) {
    const tag = f.severity === 'error' ? 'ERROR' : 'WARN'
    console.error(`  [${tag}] ${f.file}  principles=${f.principles}  rules.ts=${f.ruleCount}`)
  }
  console.error(
    '\nEvery numbered principle should map to a rules.ts entry. Zero-rule references are aspirational.',
  )
}

process.exit(errors.length > 0 ? 1 : 0)
