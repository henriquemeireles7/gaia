// .claude/skills/d-health/checks/check-notification-quality.ts — retention/notification-quality.
//
// ≤3 emails/week, ≤1 push/day. Static analysis: count distinct email
// templates that send weekly cadence; surface any flagged > 3.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const TEMPLATE_GLOBS = [
  'apps/email/templates/**/*.{ts,tsx,html}',
  'packages/email/templates/**/*.{ts,tsx,html}',
  'apps/api/features/email/**/*.ts',
] as const

const TEMPLATES_PER_WEEK_BUDGET = 3

let weeklyCount = 0
const seen: string[] = []
for (const glob of TEMPLATE_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    const text = readFileSync(file, 'utf-8')
    if (/\b(weekly|cadence:\s*['"]?weekly|frequency:\s*['"]?weekly)\b/i.test(text)) {
      weeklyCount++
      seen.push(file)
    }
  }
}

if (weeklyCount > TEMPLATES_PER_WEEK_BUDGET) {
  console.error(
    `notification-quality — ${weeklyCount} weekly-cadence templates (budget ${TEMPLATES_PER_WEEK_BUDGET}):`,
  )
  for (const f of seen) console.error(`  - ${f}`)
  console.error('\nSee .gaia/reference/product/retention.md.')
  process.exit(1)
}

console.log(
  `notification-quality — weekly-cadence templates=${weeklyCount} budget=${TEMPLATES_PER_WEEK_BUDGET}`,
)
process.exit(0)
