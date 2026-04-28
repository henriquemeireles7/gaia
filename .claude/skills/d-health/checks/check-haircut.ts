// .claude/skills/d-health/checks/check-haircut.ts — retention/haircut-offered.
//
// Cancel flow surfaces tier-down or pause options BEFORE confirming
// cancellation.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const CANCEL_GLOBS = [
  'apps/web/src/components/billing/cancel*.{ts,tsx}',
  'apps/web/src/routes/billing/cancel/**/*.{ts,tsx}',
  'apps/web/src/components/cancel-flow/**/*.{ts,tsx}',
] as const

let scanned = 0
let foundOption = false

for (const glob of CANCEL_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    scanned++
    const text = readFileSync(file, 'utf-8')
    if (/\b(downgrade|pause|tier[-_]?down|switch[_-]?plan|keep[_-]?subscription)\b/i.test(text)) {
      foundOption = true
    }
  }
}

if (scanned === 0) {
  console.log('haircut-offered — no cancel-flow components found; skipping')
  process.exit(0)
}

if (!foundOption) {
  console.error(
    'haircut-offered — cancel flow has no downgrade/pause/tier-down option.\n' +
      'See .gaia/reference/product/retention.md.',
  )
  process.exit(1)
}

process.exit(0)
