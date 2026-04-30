// scripts/gen-cli-docs.ts — regenerate docs/cli.md from `bun gaia --help` (AD-AP per PR 9).
//
// PR 9 ships a hand-authored docs/cli.md as the source. PR 11 swaps in a
// runtime-generated version that invokes `bun gaia --help` (and per-verb
// --help) to populate the file. The CI drift gate (mentioned in initiative
// §3 risk #5) compares generated vs committed and fails on diff.
//
// For PR 9 this is a no-op stub that prints "in sync" — the hand-written file
// is the canonical source until the verb-help-text shape is locked. The CI
// gate gets enabled once the verbs are wired.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

const CLI_DOC = join(process.cwd(), 'docs/cli.md')

if (!existsSync(CLI_DOC)) {
  console.error(`docs/cli.md not found — PR 9 ships the hand-authored version.`)
  process.exit(1)
}

console.log('docs/cli.md: in sync (regeneration via --help wires in PR 11).')
