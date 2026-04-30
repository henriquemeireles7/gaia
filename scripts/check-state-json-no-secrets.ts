// scripts/check-state-json-no-secrets.ts — CI gate (AD-AP-18).
//
// state.json must hold env-var NAMES only, never values. Scans every state.json
// under the repo (typically just cli/test/ fixtures + the e2e fresh-clone artifact)
// for known secret-shape prefixes.
//
// Patterns are case-SENSITIVE: real secret prefixes are lowercase, env-var
// names are UPPERCASE — case-sensitive matching avoids false positives on
// legitimate env-var names like "RAILWAY_TOKEN".

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

import { SECRET_PATTERNS } from './_secret-patterns.ts'

const SCAN_GLOBS = ['**/.gaia/state.json', '**/state.json']
const IGNORE_PATHS = ['node_modules', '.git', 'dist', '.vinxi', '.output']

let scanned = 0
let findings = 0

for (const pattern of SCAN_GLOBS) {
  // eslint-disable-next-line no-await-in-loop -- script-tier; sequential is intentional for clear logging
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    if (IGNORE_PATHS.some((skip) => file.includes(`/${skip}/`))) continue
    if (file.includes('cli/test/')) continue // test fixtures may contain mock secret-shaped data
    scanned++
    const raw = readFileSync(file, 'utf-8')
    for (const { name, pattern: rx } of SECRET_PATTERNS) {
      if (rx.test(raw)) {
        console.error(`[ERROR] [state-json/no-secrets] ${file}: matches ${name} pattern`)
        findings++
      }
    }
  }
}

if (findings > 0) {
  console.error(
    `\nstate.json must hold env-var NAMES only, never values (AD-AP-18). Found ${findings} violation(s) in ${scanned} files.`,
  )
  process.exit(1)
}

console.log(`state.json checks passed (${scanned} files scanned).`)
