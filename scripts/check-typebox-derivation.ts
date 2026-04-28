// scripts/check-typebox-derivation.ts — database/typebox-derivation-mandatory.
//
// TypeBox schemas for tables must derive from Drizzle via
// drizzle-typebox (createSelectSchema / createInsertSchema). Hand-rolled
// `Type.Object({ id: Type.String(), ... })` paralleling a table is a
// drift vector — flag it.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

type Finding = { file: string; line: number; sample: string }
const findings: Finding[] = []
let scanned = 0

for await (const file of new Glob('packages/db/**/*.ts').scan({ cwd: process.cwd() })) {
  scanned++
  const text = readFileSync(file, 'utf-8')
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (
      /Type\.Object\s*\(\s*\{/.test(line) &&
      !text.includes('createSelectSchema') &&
      !text.includes('createInsertSchema')
    ) {
      findings.push({ file, line: i + 1, sample: line.trim() })
    }
  }
}

if (scanned === 0) {
  console.log('typebox-derivation — no packages/db/ files yet; skipping')
  process.exit(0)
}

if (findings.length > 0) {
  console.error('typebox-derivation — hand-rolled TypeBox in packages/db/:')
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.sample}`)
  console.error(
    '\nUse `createSelectSchema(table)` / `createInsertSchema(table)` from drizzle-typebox. See .gaia/reference/database.md.',
  )
  process.exit(1)
}

process.exit(0)
