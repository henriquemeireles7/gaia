// .claude/skills/d-health/checks/check-persist-anonymous.ts — onboarding/persist-anonymous.
//
// Anonymous-user work persists across signup. Verify the signup route
// reads/writes localStorage or IndexedDB.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

let scanned = 0
let foundPersist = false

const SIGNUP_GLOBS = [
  'apps/web/src/routes/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/(auth)/signup/**/*.{ts,tsx}',
  'apps/web/src/routes/onboarding/**/*.{ts,tsx}',
] as const

for (const glob of SIGNUP_GLOBS) {
  for await (const file of new Glob(glob).scan({ cwd: process.cwd() })) {
    scanned++
    const text = readFileSync(file, 'utf-8')
    if (
      /\blocalStorage\.(getItem|setItem)/.test(text) ||
      /\bsessionStorage\.(getItem|setItem)/.test(text) ||
      /\bidb-keyval|indexedDB/.test(text)
    ) {
      foundPersist = true
    }
  }
}

if (scanned === 0) {
  console.log('persist-anonymous — no signup/onboarding routes found; skipping')
  process.exit(0)
}

if (!foundPersist) {
  console.error(
    'persist-anonymous — signup/onboarding routes do not read localStorage/IndexedDB.\n' +
      'Anonymous work should rehydrate after signup. See .gaia/reference/product/onboarding.md.',
  )
  process.exit(1)
}

process.exit(0)
