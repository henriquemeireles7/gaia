// scripts/check-cli-stdout.ts — dx/stdout-data-stderr-narration.
//
// CLI scripts must print machine-readable data to stdout and human
// narration to stderr. This lets users pipe `bun script.ts | jq` etc.
// without ANSI noise. Advisory only — flagged scripts get a heads-up,
// not a hard block.
//
// Heuristic: in scripts/ and apps/api/scripts/, flag files that use
// console.log() with prefixed strings (emojis, "INFO:", "✓", etc.) —
// those are narration that should be on stderr.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const ROOTS = ['scripts/**/*.ts', 'apps/api/scripts/**/*.ts'] as const
const NARRATION_HINT = /console\.log\s*\(\s*['"`].*(?:✓|✗|→|⚠|info|warn|err|note|fix|done|run)/i

const findings: string[] = []
for (const pattern of ROOTS) {
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    if (file.includes('node_modules/')) continue
    if (file.endsWith('.test.ts')) continue
    const text = readFileSync(file, 'utf-8')
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      if (NARRATION_HINT.test(line)) {
        findings.push(`${file}:${i + 1}: looks like narration via console.log — use console.error`)
      }
    }
  }
}

if (findings.length > 0) {
  console.error('dx/stdout-data-stderr-narration — flagged (advisory):')
  for (const f of findings) console.error(`  ${f}`)
  console.error(
    '\nNarration belongs on stderr (console.error). Stdout is reserved for pipeable data.',
  )
}
process.exit(0) // advisory
