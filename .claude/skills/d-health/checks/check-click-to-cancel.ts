// .claude/skills/d-health/checks/check-click-to-cancel.ts — retention/click-to-cancel.
//
// /billing surfaces a Cancel control. Static check: route file or
// adjacent component contains a `Cancel` link/button referencing the
// Polar customer portal.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const BILLING_GLOBS = [
  'apps/web/src/routes/billing/**/*.{ts,tsx}',
  'apps/web/src/routes/(app)/billing/**/*.{ts,tsx}',
  'apps/web/src/routes/settings/billing/**/*.{ts,tsx}',
  'apps/web/src/components/billing/**/*.{ts,tsx}',
] as const

let scanned = 0
let foundCancel = false
let foundPortal = false

for (const glob of BILLING_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    scanned++
    const text = readFileSync(file, 'utf-8')
    if (/\b[Cc]ancel\s+subscription\b|\b[Cc]ancel\s+plan\b|>Cancel</.test(text)) {
      foundCancel = true
    }
    if (/customer[_-]?portal|polar.*portal|billing.*portal/i.test(text)) {
      foundPortal = true
    }
  }
}

if (scanned === 0) {
  console.log('click-to-cancel — no /billing routes found; skipping')
  process.exit(0)
}

const issues: string[] = []
if (!foundCancel) issues.push('no Cancel control surfaced in /billing')
if (!foundPortal) issues.push('no customer-portal link to Polar in /billing')

if (issues.length > 0) {
  console.error('click-to-cancel — findings:')
  for (const i of issues) console.error(`  - ${i}`)
  console.error('\nSee .gaia/reference/product/retention.md.')
  process.exit(1)
}

process.exit(0)
