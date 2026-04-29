// scripts/check-funnel-events.ts — onboarding/funnel-events.
//
// Required onboarding analytics events:
//   - visit
//   - signup_start
//   - signup_complete
//   - activation
//
// Each must be tracked at least once across apps/web/src/routes/{signup,onboarding}/**.
// The check is presence-based (count > 0); it doesn't validate the call
// site (that's a /review judgment).

import { readFileSync, existsSync } from 'node:fs'
import { Glob } from 'bun'

const REQUIRED_EVENTS = ['visit', 'signup_start', 'signup_complete', 'activation'] as const

// Only the dedicated signup/onboarding surfaces — the auth feature is
// shared infra and shouldn't gate this rule.
const SCAN_GLOBS = [
  'apps/web/src/routes/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/(auth)/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/onboarding/**/*.{ts,tsx}',
  'apps/api/features/onboarding/**/*.ts',
] as const

const seen = new Set<string>()
let scanned = 0

for (const glob of SCAN_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    if (!existsSync(file)) continue
    scanned++
    const text = readFileSync(file, 'utf-8')
    for (const event of REQUIRED_EVENTS) {
      const re = new RegExp(`['"\`]${event}['"\`]`)
      if (re.test(text)) seen.add(event)
    }
  }
}

if (scanned === 0) {
  console.log('funnel-events — no signup/onboarding code found yet; skipping')
  process.exit(0)
}

const missing = REQUIRED_EVENTS.filter((e) => !seen.has(e))

if (missing.length > 0) {
  console.error('funnel-events — missing required onboarding events:')
  for (const m of missing) {
    console.error(`  - ${m}`)
  }
  console.error('\nTrack each step independently. See .gaia/reference/product/onboarding.md.')
  process.exit(1)
}

process.exit(0)
