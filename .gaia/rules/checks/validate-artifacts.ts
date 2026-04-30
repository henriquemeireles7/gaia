// .gaia/rules/checks/validate-artifacts.ts
//
// workflow/initiative-frontmatter-required: every initiative .md in
//   .gaia/initiatives/*/ declares parent / hypothesis / measurement.
// workflow/project-touches-required: every project .md declares
//   touches: and depends_on: arrays.
//
// Top-level files in .gaia/initiatives/ (roadmap.md, context.md) are the
// rolled-up snapshots and are exempt — they don't represent committed
// initiatives by themselves.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const INIT_DIR = join(ROOT, '.gaia/initiatives')

if (!existsSync(INIT_DIR)) {
  console.error('No .gaia/initiatives/ — skipping.')
  process.exit(0)
}

const errors: string[] = []

function fmBlock(content: string): string | null {
  if (!content.startsWith('---')) return null
  const end = content.indexOf('\n---', 3)
  if (end === -1) return null
  return content.slice(3, end)
}

function hasField(fm: string | null, body: string, field: string): boolean {
  if (fm && new RegExp(`^\\s*${field}\\s*:\\s*\\S`, 'm').test(fm)) return true
  // Fallback: header line in body, e.g. "## Hypothesis" or "## Measurement".
  return new RegExp(`^##+\\s*${field}\\b`, 'im').test(body)
}

function checkInitiative(file: string) {
  const content = readFileSync(file, 'utf-8')
  const fm = fmBlock(content)
  const rel = relative(ROOT, file)
  const required = ['parent', 'hypothesis', 'measurement']
  for (const f of required) {
    if (!hasField(fm, content, f)) {
      errors.push(
        `${rel}: missing ${f}: in frontmatter or "## ${f}" header (workflow/initiative-frontmatter-required)`,
      )
    }
  }
}

function checkProject(file: string) {
  const content = readFileSync(file, 'utf-8')
  const fm = fmBlock(content)
  const rel = relative(ROOT, file)
  const required = ['touches', 'depends_on']
  for (const f of required) {
    if (!hasField(fm, content, f)) {
      errors.push(`${rel}: missing ${f}: in frontmatter (workflow/project-touches-required)`)
    }
  }
}

for (const entry of readdirSync(INIT_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const dir = join(INIT_DIR, entry.name)
  // Initiative file inside the dir
  const initiativeMd = join(dir, 'initiative.md')
  if (existsSync(initiativeMd)) checkInitiative(initiativeMd)
  // Projects inside the dir
  const projectsDir = join(dir, 'projects')
  if (existsSync(projectsDir)) {
    for (const p of readdirSync(projectsDir, { withFileTypes: true })) {
      if (p.isFile() && p.name.endsWith('.md')) checkProject(join(projectsDir, p.name))
    }
  }
}

if (errors.length > 0) {
  console.error('Artifact validation FAILED:')
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
process.exit(0)
