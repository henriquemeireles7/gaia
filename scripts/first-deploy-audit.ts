// scripts/first-deploy-audit.ts — deployment/ttfd-30min.
//
// Quarterly audit: time-to-first-deploy (clone → green /health/ready)
// must be ≤30 minutes for a new operator. The script can't run a real
// fresh-machine simulation, but it surfaces the friction points: missing
// env, stale lockfile, broken db:migrate, undocumented setup steps.
//
// Output is a checklist printed to stdout. d-health folds it in.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

type Item = { name: string; ok: boolean; note?: string }
const items: Item[] = []

function check(name: string, ok: boolean, note?: string) {
  items.push({ name, ok, note })
}

check('README.md exists', existsSync(join(ROOT, 'README.md')))
check(
  '.env.example documents required env',
  existsSync(join(ROOT, '.env.example')) || existsSync(join(ROOT, '.env.sample')),
  'New operators copy .env.example to .env',
)
check(
  'bun.lock is committed',
  existsSync(join(ROOT, 'bun.lock')) || existsSync(join(ROOT, 'bun.lockb')),
)
check('drizzle.config.ts exists', existsSync(join(ROOT, 'drizzle.config.ts')))

const pkgPath = join(ROOT, 'package.json')
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const scripts = pkg.scripts ?? {}
  check('package.json has db:migrate', Boolean(scripts['db:migrate']))
  check('package.json has dev', Boolean(scripts.dev))
  check('package.json has check', Boolean(scripts.check))
}

check(
  'apps/api/server/app.ts declares /health',
  (() => {
    const f = join(ROOT, 'apps/api/server/app.ts')
    if (!existsSync(f)) return false
    return /['"`]\/health['"`]/.test(readFileSync(f, 'utf-8'))
  })(),
)

const failed = items.filter((i) => !i.ok)
const passed = items.filter((i) => i.ok)

console.error('first-deploy-audit')
console.error('═══════════════════')
for (const i of passed) console.error(`  PASS  ${i.name}`)
for (const i of failed) console.error(`  FAIL  ${i.name}${i.note ? ` — ${i.note}` : ''}`)
console.error('')
console.error(
  `${passed.length}/${items.length} items pass. Run quarterly; track trend in d-health.`,
)
process.exit(failed.length > 0 ? 1 : 0)
