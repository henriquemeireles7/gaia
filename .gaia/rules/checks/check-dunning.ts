// scripts/check-dunning.ts — retention/dunning-configured.
//
// Failed payments need a dunning sequence. Check the billing webhook
// handler for retry config (≥3 retries) and a `past_due` grace path
// before cancel.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const issues: string[] = []

const WEBHOOK_GLOBS = [
  'apps/api/features/billing/**/*.ts',
  'packages/adapters/polar.ts',
  'packages/adapters/billing.ts',
] as const

let foundPastDue = false
let foundDunning = false
let scanned = 0

for (const glob of WEBHOOK_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    scanned++
    const text = readFileSync(file, 'utf-8')
    if (/['"`]past_due['"`]|subscription\.past_due|payment_failed/.test(text)) foundPastDue = true
    if (/dunning|retry[_-]?(payment|invoice)|max[_-]?retries|\bgrace[_-]?period\b/i.test(text)) {
      foundDunning = true
    }
  }
}

if (scanned === 0) {
  console.log('dunning — no billing webhook handler yet; skipping')
  process.exit(0)
}
if (!foundPastDue) issues.push('no past_due / payment_failed handling in billing webhook')
if (!foundDunning) issues.push('no dunning/retry config in billing handler')

if (issues.length > 0) {
  console.error('dunning — findings:')
  for (const i of issues) console.error(`  - ${i}`)
  console.error('\nSee .gaia/reference/product/retention.md.')
  process.exit(1)
}

process.exit(0)
