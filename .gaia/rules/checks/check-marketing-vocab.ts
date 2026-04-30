// .gaia/rules/checks/check-marketing-vocab.ts — voice/no-marketing-vocabulary.
//
// Soft rule: flag marketing buzzwords in user-facing copy (README,
// CHANGELOG, content/, .gaia/initiatives/*). Code comments are exempt.
// Advisory exit code (0 always); messages go to stderr so CI surfaces them.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const BANNED = [
  'revolutionize',
  'revolutionary',
  'seamless',
  'leverage',
  'unlock',
  'cutting-edge',
  'best-in-class',
  'world-class',
  'game-changing',
  'paradigm shift',
] as const

const SCAN: readonly string[] = [
  'README.md',
  'CHANGELOG.md',
  'content/**/*.md',
  '.gaia/initiatives/**/*.md',
  '.gaia/vision.md',
] as const

const findings: string[] = []
for (const pattern of SCAN) {
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    const text = readFileSync(file, 'utf-8')
    for (const word of BANNED) {
      const re = new RegExp(`\\b${word}\\b`, 'gi')
      const match = re.exec(text)
      if (match) {
        const before = text.slice(0, match.index)
        const line = before.split('\n').length
        findings.push(`${file}:${line}: marketing word "${match[0]}"`)
      }
    }
  }
}

if (findings.length > 0) {
  console.error('voice/no-marketing-vocabulary — flagged (advisory):')
  for (const f of findings) console.error(`  ${f}`)
  console.error(
    '\nReplace with specific, observable phrases. See .claude/skills/w-write/reference.md.',
  )
}
process.exit(0) // advisory
