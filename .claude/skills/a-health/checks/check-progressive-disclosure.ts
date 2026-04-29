// .claude/skills/a-health/checks/check-progressive-disclosure.ts — onboarding/progressive-disclosure.
//
// Pre-activation users see ≤5 nav items. Approximates by counting
// rendered nav items in apps/web/src/components/Nav*.tsx and flagging
// those not gated on user state.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const NAV_GLOBS = [
  'apps/web/src/components/Nav*.tsx',
  'apps/web/src/components/nav/**/*.tsx',
  'apps/web/src/layouts/**/*.tsx',
] as const

const issues: string[] = []
let scanned = 0

for (const glob of NAV_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    scanned++
    const text = readFileSync(file, 'utf-8')
    const navLinks = (text.match(/<NavLink|<Link\s+to=/g) ?? []).length
    const hasGate = /isActivated|user\.activated|engagement_?[Ss]tate|hasOnboarded/.test(text)
    if (navLinks > 5 && !hasGate) {
      issues.push(`${file}  navLinks=${navLinks}  no activation gate`)
    }
  }
}

if (scanned === 0) {
  console.log('progressive-disclosure — no Nav components found; skipping')
  process.exit(0)
}

if (issues.length > 0) {
  console.error('progressive-disclosure — findings:')
  for (const i of issues) console.error(`  ${i}`)
  console.error(
    '\nGate advanced nav items behind activation. See .gaia/reference/product/onboarding.md.',
  )
  process.exit(1)
}

process.exit(0)
