// scripts/check-tests-exist.ts — testing/colocated-tests
//
// Every public-export TS file in packages/ and apps/api/server/ must have
// a sibling foo.test.ts (vision §11 + code.md principle 7). Allowlist
// covers files where tests are not appropriate: configs, type-only
// modules, generated code.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const ROOTS = ['packages', 'apps/api/server', 'apps/api/scripts']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'migrations'])

// Files allowlisted as legitimately test-free.
const ALLOWLIST = new Set([
  'packages/db/client.ts', // wraps drizzle init; tested via integration
  'packages/db/schema.ts', // pure schema; tested via migrations
  'packages/config/types.ts', // type-only
  'packages/auth/index.ts', // wrapper around better-auth; integration-tested in app.test.ts
  'packages/workflows/index.ts', // Inngest wiring; integration-tested
  'packages/api/index.ts', // re-exports
  'packages/security/harden-check.ts', // self-tests via running on the repo
  'packages/security/security-headers.ts', // covered indirectly by app.test.ts boundary tests
  'packages/security/protected-route.ts', // Elysia plugin; tested via integration tests of consuming routes
  'packages/security/public-route.ts', // Elysia plugin; tested via integration tests
  'packages/security/audit-log.ts', // hits db; integration-tested when a real audit consumer exists
  'packages/core/observability.ts', // integration-tested via initObservability() at app boot
  'apps/api/server/app.ts', // tested via app.test.ts (next to it)
  'apps/api/scripts/migrate.ts', // CLI entry
  'apps/api/scripts/seed.ts', // CLI entry
])

function walk(dir: string): string[] {
  const out: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...walk(full))
      else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        out.push(full)
      }
    }
  } catch {
    /* missing */
  }
  return out
}

function isPublicSource(file: string): boolean {
  const content = readFileSync(file, 'utf-8')
  // Public = file has at least one `export ` statement (function, const, class, type re-export)
  // or it's an `index.ts` re-export module.
  return /^export\s+/m.test(content) || file.endsWith('/index.ts')
}

const missing: string[] = []
const sources = ROOTS.flatMap((r) => walk(join(ROOT, r)))

for (const src of sources) {
  const rel = relative(ROOT, src)
  if (ALLOWLIST.has(rel)) continue
  if (!isPublicSource(src)) continue
  const testFile = src.replace(/\.ts$/, '.test.ts')
  if (!existsSync(testFile)) {
    missing.push(rel)
  }
}

if (missing.length > 0) {
  console.error('Missing colocated tests (testing/colocated-tests):')
  for (const m of missing) {
    console.error(`  ${m} → expected ${m.replace(/\.ts$/, '.test.ts')}`)
  }
  console.error(
    '\nAdd a sibling .test.ts or extend ALLOWLIST in scripts/check-tests-exist.ts with rationale.',
  )
  process.exit(1)
}

process.exit(0)
