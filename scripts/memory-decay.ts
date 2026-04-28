// scripts/memory-decay.ts — methodology/memory-decay.
//
// Archive .gaia/memory/episodic/* entries older than 90 days that haven't
// been re-triggered. Re-triggered = mtime updated within window.
//
// Runs as a CI cron (.github/workflows/ci.yml — memory-decay job, weekly).
// Local invocation is also safe; the script is idempotent.

import { readdirSync, statSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, '.gaia/memory/episodic')
const ARCHIVE = join(ROOT, '.gaia/memory/archive')
const DAY_MS = 24 * 60 * 60 * 1000
const TTL_DAYS = Number(process.env.MEMORY_TTL_DAYS ?? 90)

if (!existsSync(SRC)) {
  console.log(`memory-decay — no episodic memory at ${SRC}; skipping.`)
  process.exit(0)
}

if (!existsSync(ARCHIVE)) mkdirSync(ARCHIVE, { recursive: true })

const cutoff = Date.now() - TTL_DAYS * DAY_MS
let archived = 0
let kept = 0

for (const entry of readdirSync(SRC, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  const src = join(SRC, entry.name)
  const stat = statSync(src)
  if (stat.mtimeMs < cutoff) {
    const dest = join(ARCHIVE, entry.name)
    renameSync(src, dest)
    archived++
  } else {
    kept++
  }
}

console.log(`memory-decay — archived=${archived} kept=${kept} ttlDays=${TTL_DAYS}`)
process.exit(0)
