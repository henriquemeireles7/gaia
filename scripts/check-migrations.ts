// scripts/check-migrations.ts — database/migrations-versioned.
//
// Schema changes flow through drizzle-kit generate. Verify:
//   - packages/db/migrations/ exists and contains *.sql files
//   - drizzle.config.ts points the output at packages/db/migrations/
//
// Manual edits to live DB never appear here, so the check is structural,
// not behavioural. w-debug / runtime checks catch missing migrations.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const issues: string[] = []

const MIGRATIONS_DIR = join(ROOT, 'packages/db/migrations')
if (!existsSync(MIGRATIONS_DIR)) {
  issues.push('packages/db/migrations/ does not exist — run `bun run db:generate`')
} else {
  const sqlFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
  if (sqlFiles.length === 0) {
    issues.push('packages/db/migrations/ has no *.sql files')
  }
}

const DRIZZLE_CONFIG = join(ROOT, 'drizzle.config.ts')
if (existsSync(DRIZZLE_CONFIG)) {
  const text = readFileSync(DRIZZLE_CONFIG, 'utf-8')
  if (!/packages\/db\/migrations/.test(text)) {
    issues.push('drizzle.config.ts does not point output at packages/db/migrations/')
  }
}

if (issues.length > 0) {
  console.error('migrations — findings:')
  for (const i of issues) console.error(`  - ${i}`)
  console.error('\nSee .gaia/reference/database.md.')
  process.exit(1)
}

process.exit(0)
