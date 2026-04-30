// scripts/check-email-on-signup.ts — onboarding/email-on-signup.
//
// First transactional email arrives within 5 minutes of signup. With
// better-auth we get this via `sendOnSignUp: true` + a wired
// `sendVerificationEmail`. Verify both are present in the auth config.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const CANDIDATES = [
  'packages/auth/index.ts',
  'packages/auth/src/index.ts',
  'apps/api/server/auth.ts',
  'apps/api/features/auth/auth.ts',
]

const found = CANDIDATES.find((rel) => existsSync(join(ROOT, rel)))
if (!found) {
  console.log('email-on-signup — no auth config found at known paths; skipping')
  process.exit(0)
}

const text = readFileSync(join(ROOT, found), 'utf-8')
const issues: string[] = []

if (!/sendOnSignUp\s*:\s*true/.test(text)) {
  issues.push(`${found}: missing \`sendOnSignUp: true\``)
}
if (!/sendVerificationEmail\s*[:=]/.test(text)) {
  issues.push(`${found}: missing \`sendVerificationEmail\` handler`)
}

if (issues.length > 0) {
  console.error('email-on-signup — findings:')
  for (const i of issues) console.error(`  ${i}`)
  console.error('\nSee .gaia/reference/product/onboarding.md.')
  process.exit(1)
}

process.exit(0)
