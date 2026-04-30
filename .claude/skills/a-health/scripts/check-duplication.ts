// .claude/skills/a-health/scripts/check-duplication.ts — health/duplication-budget
//
// DRY detector via 5-line shingles, ≥3 occurrences across distinct files
// (a-health/reference.md §10; panel: Sandi Metz forcing function).
//
// Walks apps/** and packages/**, normalizes each line (trim, collapse
// whitespace, drop comments), hashes 5-line windows, and reports clones.
//
// stdout: JSON { totalShingles, clones: [{ hash, files, occurrences, sample }] }
// Cap: top 50 clones, sorted by (file count desc, occurrence count desc).
// Exit codes: 0 always (advisory; aggregate-scores.ts treats budget overrun as a finding).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SCAN_ROOTS = ['apps', 'packages']
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  'migrations',
  'fixtures',
  '.turbo',
  '.cache',
])
const SKIP_SUFFIX = ['.test.ts', '.test.tsx', '.spec.ts', '.d.ts']
const ALLOWED_EXT = ['.ts', '.tsx']

const WINDOW = 5
const MIN_FILES = 3
const MAX_FILE_BYTES = 200_000

function* walk(dir: string): Generator<string> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
      continue
    }
    if (!ALLOWED_EXT.some((e) => entry.name.endsWith(e))) continue
    if (SKIP_SUFFIX.some((s) => entry.name.endsWith(s))) continue
    yield full
  }
}

function normalize(line: string): string {
  return line
    .replace(/\/\/.*$/, '') // line comments
    .replace(/\/\*.*?\*\//g, '') // block comments on one line
    .replace(/\s+/g, ' ')
    .trim()
}

function hashShingle(lines: readonly string[]): string {
  return createHash('sha1').update(lines.join('\n')).digest('hex').slice(0, 12)
}

type ShingleHit = { file: string; line: number; sample: string }
const shingles = new Map<string, ShingleHit[]>()
let scannedFiles = 0
let totalShingles = 0

for (const root of SCAN_ROOTS) {
  const fullRoot = join(ROOT, root)
  try {
    if (!statSync(fullRoot).isDirectory()) continue
  } catch {
    continue
  }
  for (const file of walk(fullRoot)) {
    let text: string
    try {
      const stat = statSync(file)
      if (stat.size > MAX_FILE_BYTES) continue
      text = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    scannedFiles++
    const lines = text.split('\n').map(normalize)
    for (let i = 0; i + WINDOW <= lines.length; i++) {
      const window = lines.slice(i, i + WINDOW)
      const meaningful = window.filter((l) => l.length >= 8).length
      if (meaningful < WINDOW) continue
      const hash = hashShingle(window)
      totalShingles++
      const hits = shingles.get(hash) ?? []
      hits.push({
        file: relative(ROOT, file),
        line: i + 1,
        sample: window[0]?.slice(0, 100) ?? '',
      })
      shingles.set(hash, hits)
    }
  }
}

const clones = [...shingles.entries()]
  .map(([hash, hits]) => {
    const distinctFiles = new Set(hits.map((h) => h.file))
    return {
      hash,
      occurrences: hits.length,
      fileCount: distinctFiles.size,
      files: [...distinctFiles].slice(0, 8),
      sample: hits[0]?.sample ?? '',
    }
  })
  .filter((c) => c.fileCount >= MIN_FILES)
  .sort((a, b) => b.fileCount - a.fileCount || b.occurrences - a.occurrences)
  .slice(0, 50)

const out = {
  scannedFiles,
  totalShingles,
  cloneCount: clones.length,
  clones,
}
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`)
