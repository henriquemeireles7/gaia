// .claude/skills/d-health/checks/check-silent-failure.ts — onboarding/silent-first-failure.
//
// Onboarding routes don't render Alert(error). First-touch failures are
// absorbed silently and retried. Surface any <Alert>/<ErrorAlert> usage
// inside /signup or /onboarding/*.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const findings: { file: string; line: number; match: string }[] = []
const SIGNUP_GLOBS = [
  'apps/web/src/routes/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/(auth)/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/onboarding/**/*.{ts,tsx}',
] as const

const ALERT_RE = /<(Alert|ErrorAlert|ErrorBanner|Toast)\s/

for (const glob of SIGNUP_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    const lines = readFileSync(file, 'utf-8').split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      const m = line.match(ALERT_RE)
      if (m) findings.push({ file, line: i + 1, match: m[0] })
    }
  }
}

if (findings.length > 0) {
  console.error('silent-failure — alert components in onboarding routes:')
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.match}`)
  console.error(
    '\nFirst-touch failures should not surface alerts. See .gaia/reference/product/onboarding.md.',
  )
  process.exit(1)
}

process.exit(0)
