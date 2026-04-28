// scripts/check-reference-rule-mapping.ts — references/principle-has-rule + methodology/principle-rule-mapping.
//
// Walk reference files. For each file with numbered principles
// (### N. ...), require that rules.ts contains at least one rule whose
// `reference` matches the file's domain. A reference with N principles
// but zero rules is purely aspirational — it fails the three-forms rule.
//
// Stricter check (warn-only): if a reference has more principles than
// rules, surface the gap so the next pending → enforced cycle has a
// target.

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { Glob } from 'bun'
import { rules, type ReferenceDomain } from '../.gaia/rules'

const PRINCIPLE_HEADER = /^###\s+\d+\.\s+/

const ALIAS: Record<string, ReferenceDomain> = {
  onboarding: 'onboarding',
  retention: 'retention',
}

type Failure = { file: string; principles: number; ruleCount: number; severity: 'error' | 'warn' }
const failures: Failure[] = []

function domainFor(file: string): ReferenceDomain | null {
  // .gaia/reference/<domain>.md — strip extension and folder.
  // Product files: .gaia/reference/product/<x>.md
  const stem = basename(file, '.md')
  const known: ReferenceDomain[] = [
    'code',
    'backend',
    'frontend',
    'database',
    'testing',
    'errors',
    'security',
    'observability',
    'commands',
    'design',
    'tokens',
    'ux',
    'dx',
    'ax',
    'voice',
    'workflow',
    'harness',
    'deployment',
    'methodology',
    'ai',
    'skills',
    'references',
    'onboarding',
    'retention',
  ]
  if (known.includes(stem as ReferenceDomain)) return stem as ReferenceDomain
  return ALIAS[stem] ?? null
}

const counts = new Map<ReferenceDomain, number>()
for (const r of rules) {
  counts.set(r.reference, (counts.get(r.reference) ?? 0) + 1)
}

for await (const file of new Glob('.gaia/reference/**/*.md').scan({ cwd: process.cwd() })) {
  const text = readFileSync(file, 'utf-8')
  const principles = text.split('\n').filter((l) => PRINCIPLE_HEADER.test(l)).length
  if (principles === 0) continue
  const domain = domainFor(file)
  if (!domain) continue
  const ruleCount = counts.get(domain) ?? 0
  if (ruleCount === 0) {
    failures.push({ file, principles, ruleCount, severity: 'error' })
  } else if (ruleCount < principles) {
    failures.push({ file, principles, ruleCount, severity: 'warn' })
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
    '\nEvery numbered principle should map to a rules.ts entry (vision §H6). Zero-rule reference files are aspirational.',
  )
}

process.exit(errors.length > 0 ? 1 : 0)
