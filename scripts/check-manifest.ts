// scripts/check-manifest.ts — harness/manifest-coverage
//
// Validates that .gaia/MANIFEST.md lists every folder containing a CLAUDE.md
// (and vice versa). Catches drift where a new module gets a CLAUDE.md but
// the index isn't updated, or the index references folders that no longer
// have one.

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const MANIFEST_PATH = join(ROOT, '.gaia/MANIFEST.md')
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.vinxi',
  '.output',
  '.gaia/audit',
  '.gaia/memory/working',
])

function walk(dir: string): string[] {
  const out: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = relative(ROOT, join(dir, entry.name))
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...walk(full))
      else if (entry.name === 'CLAUDE.md') out.push(rel)
    }
  } catch {
    /* missing dir */
  }
  return out
}

const claudeFiles = walk(ROOT)
const folders = claudeFiles.map((f) => f.replace(/\/?CLAUDE\.md$/, '') || '/')

const manifestFull = readFileSync(MANIFEST_PATH, 'utf-8')
// Split at the "Out of scope" section — entries below that line are
// explicitly flagged as NOT having CLAUDE.md, so don't validate them as
// missing.
const outOfScopeIdx = manifestFull.search(/^## Out of scope/im)
const manifest = outOfScopeIdx === -1 ? manifestFull : manifestFull.slice(0, outOfScopeIdx)

const errors: string[] = []
const warnings: string[] = []

// Each folder with a CLAUDE.md must appear in MANIFEST.md (as a backtick-quoted path).
for (const folder of folders) {
  // The repo root CLAUDE.md is documented under the `/` row.
  const search = folder === '/' ? '`/`' : `\`${folder}/\``
  if (!manifest.includes(search) && !manifest.includes(`\`${folder}\``)) {
    errors.push(`MANIFEST.md missing entry for folder with CLAUDE.md: ${folder}`)
  }
}

// Folders mentioned in MANIFEST.md (between backticks) should still exist with a CLAUDE.md.
const mentioned = [...manifest.matchAll(/`([^`]+)\/?`/g)].map((m) => m[1])
for (const m of mentioned) {
  if (
    !m ||
    m === '/' ||
    (!m.startsWith('.') && !m.startsWith('apps') && !m.startsWith('packages'))
  ) {
    continue
  }
  const expected = `${m.replace(/\/$/, '')}/CLAUDE.md`
  if (
    !folders.some((f) => f === m.replace(/\/$/, '') || f === expected.replace(/\/CLAUDE\.md$/, ''))
  ) {
    warnings.push(`MANIFEST.md mentions ${m} but no CLAUDE.md found there.`)
  }
}

if (errors.length > 0) {
  console.error('Manifest coverage check FAILED:')
  for (const e of errors) console.error(`  ERROR: ${e}`)
  for (const w of warnings) console.error(`  WARN:  ${w}`)
  process.exit(1)
}

if (warnings.length > 0) {
  console.error('Manifest coverage check passed with warnings:')
  for (const w of warnings) console.error(`  WARN:  ${w}`)
}
process.exit(0)
