// scripts/check-engagement-state.ts — retention/state-machine.
//
// A retention engine needs an engagement_state machine on users:
//   active | dormant | churned
//
// Verify the schema declares the column + enum, and that messaging code
// references the state (so emails are gated, not blasted).

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

type Issue = { area: string; problem: string }
const issues: Issue[] = []

let dbScanned = 0
let foundEnum = false
let foundColumn = false
for await (const file of new Glob('packages/db/**/*.ts').scan({ cwd: process.cwd() })) {
  dbScanned++
  const text = readFileSync(file, 'utf-8')
  if (/engagement_?[Ss]tate/.test(text)) foundColumn = true
  if (
    /pgEnum\s*\(\s*['"]engagement_state['"]/.test(text) ||
    /enum\s+engagement_?[Ss]tate\b/.test(text)
  ) {
    foundEnum = true
  }
}

let messagingScanned = 0
let messagingGated = false
for await (const file of new Glob('apps/api/features/{retention,email,messaging}/**/*.ts').scan({
  cwd: process.cwd(),
})) {
  messagingScanned++
  const text = readFileSync(file, 'utf-8')
  if (/engagement_?[Ss]tate/.test(text)) {
    messagingGated = true
    break
  }
}

// Activates only once retention/email/messaging features ship. Until
// then the rule documents intent without gating CI.
if (messagingScanned === 0) {
  console.log('engagement-state — no retention/email/messaging features yet; skipping')
  process.exit(0)
}

if (!foundEnum) issues.push({ area: 'schema', problem: 'no engagement_state enum in packages/db/' })
if (!foundColumn) issues.push({ area: 'schema', problem: 'no engagement_state column on users' })
if (!messagingGated) {
  issues.push({
    area: 'messaging',
    problem: 'no email/retention code references engagement_state — messaging is not state-gated',
  })
}

if (issues.length > 0) {
  console.error('engagement-state — findings:')
  for (const i of issues) console.error(`  [${i.area}] ${i.problem}`)
  console.error('\nSee .gaia/reference/product/retention.md.')
  process.exit(1)
}

process.exit(0)
