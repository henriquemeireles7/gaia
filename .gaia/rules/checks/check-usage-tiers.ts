// scripts/check-usage-tiers.ts — retention/usage-tiers.
//
// Users have a usage_tier enum (light | middle | power). A
// `tier_promoted` analytics event fires on transitions so we can run
// upgrade campaigns.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const issues: string[] = []

let dbScanned = 0
let foundColumn = false
let foundEnum = false
for await (const file of new Glob('packages/db/**/*.ts').scan({ cwd: process.cwd() })) {
  dbScanned++
  const text = readFileSync(file, 'utf-8')
  if (/usage_?[Tt]ier/.test(text)) foundColumn = true
  if (/pgEnum\s*\(\s*['"]usage_tier['"]/.test(text) || /enum\s+usage_?[Tt]ier\b/.test(text)) {
    foundEnum = true
  }
}

let analyticsScanned = 0
let foundEvent = false
for await (const file of new Glob('{apps/api/features,packages/adapters}/**/*.ts').scan({
  cwd: process.cwd(),
})) {
  analyticsScanned++
  const text = readFileSync(file, 'utf-8')
  if (/['"`]tier_promoted['"`]/.test(text)) {
    foundEvent = true
    break
  }
}

// Rule activates once a billing/subscription feature exists — until then
// the column doesn't make sense.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const billingExists = ['apps/api/features/billing', 'apps/api/features/subscription'].some((p) =>
  existsSync(join(process.cwd(), p)),
)

if (!billingExists) {
  console.log('usage-tiers — no billing/subscription feature yet; skipping')
  process.exit(0)
}

if (!foundColumn) issues.push('users.usage_tier column not found in packages/db/')
if (!foundEnum) issues.push('usage_tier enum not declared in packages/db/')
if (!foundEvent) issues.push('tier_promoted analytics event not emitted anywhere')
void analyticsScanned // referenced for clarity

if (issues.length > 0) {
  console.error('usage-tiers — findings:')
  for (const i of issues) console.error(`  - ${i}`)
  console.error('\nSee .gaia/reference/product/retention.md.')
  process.exit(1)
}

process.exit(0)
