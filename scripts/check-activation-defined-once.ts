// scripts/check-activation-defined-once.ts — onboarding/activation-defined-once.
//
// Exactly one trackActivation() function in packages/adapters/analytics.ts.
// Ad-hoc track('activation') / track('activated') calls scattered across
// the code break the funnel — they all need to share the canonical
// definition.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

type Hit = { file: string; line: number; match: string }

const definitionHits: Hit[] = []
const callHits: Hit[] = []

const TRACK_ACTIVATION = /['"`](activation|activated)['"`]/

for await (const file of new Glob('{apps,packages}/**/*.ts').scan({ cwd: process.cwd() })) {
  if (file.endsWith('.test.ts')) continue
  const text = readFileSync(file, 'utf-8')
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/\bfunction\s+trackActivation\b|\bconst\s+trackActivation\s*=/.test(line)) {
      definitionHits.push({ file, line: i + 1, match: line.trim() })
    }
    if (/\btrack\s*\(/.test(line) && TRACK_ACTIVATION.test(line)) {
      callHits.push({ file, line: i + 1, match: line.trim() })
    }
  }
}

const issues: string[] = []
if (definitionHits.length === 0) {
  // Allowed if no analytics code yet — don't fail.
} else if (definitionHits.length > 1) {
  issues.push(`trackActivation defined ${definitionHits.length} times — must be exactly 1`)
  for (const h of definitionHits) issues.push(`  ${h.file}:${h.line}`)
}

const adhoc = callHits.filter((h) => !/\btrackActivation\s*\(/.test(h.match))
if (adhoc.length > 0) {
  issues.push(`ad-hoc track('activation'|'activated') calls outside trackActivation():`)
  for (const h of adhoc) issues.push(`  ${h.file}:${h.line}  ${h.match}`)
}

if (issues.length > 0) {
  console.error('activation-defined-once — findings:')
  for (const i of issues) console.error(`  ${i}`)
  console.error('\nSee .gaia/reference/product/onboarding.md.')
  process.exit(1)
}

process.exit(0)
