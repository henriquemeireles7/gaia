// scripts/check-reference-staleness.ts — references/staleness.
//
// Reference files declare `Last verified: YYYY-MM-DD` near the top. A
// reference unverified for >180 days is debt — the world has moved
// since it was last reviewed. Surface stale files; never block CI.
//
// Exit 0 with a printed list. a-health folds these findings into the
// trend report.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

const VERIFIED = /^>\s*Last\s+verified:\s*(\d{4}-\d{2}-\d{2})\b/im
const DAY_MS = 24 * 60 * 60 * 1000
const STALE_DAYS = 180

type Row = { file: string; verified?: Date; ageDays?: number; status: 'ok' | 'stale' | 'missing' }
const rows: Row[] = []

for await (const file of new Glob('.gaia/reference/**/*.md').scan({ cwd: process.cwd() })) {
  const text = readFileSync(file, 'utf-8')
  const match = text.match(VERIFIED)
  if (!match) {
    rows.push({ file, status: 'missing' })
    continue
  }
  const verified = new Date(match[1] ?? '')
  if (Number.isNaN(verified.valueOf())) {
    rows.push({ file, status: 'missing' })
    continue
  }
  const ageDays = Math.floor((Date.now() - verified.valueOf()) / DAY_MS)
  rows.push({
    file,
    verified,
    ageDays,
    status: ageDays > STALE_DAYS ? 'stale' : 'ok',
  })
}

const stale = rows.filter((r) => r.status === 'stale')
const missing = rows.filter((r) => r.status === 'missing')

if (stale.length > 0 || missing.length > 0) {
  console.log('reference-staleness — review needed:')
  for (const r of stale) {
    console.log(`  STALE   ${r.file}  (${r.ageDays}d since last verify)`)
  }
  for (const r of missing) {
    console.log(`  NO-DATE ${r.file}  (add "> Last verified: YYYY-MM-DD")`)
  }
} else {
  console.log(`reference-staleness — all ${rows.length} files verified within ${STALE_DAYS} days.`)
}

process.exit(0)
