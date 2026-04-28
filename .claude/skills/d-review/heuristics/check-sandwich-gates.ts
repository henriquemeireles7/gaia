// .claude/skills/d-review/heuristics/check-sandwich-gates.ts — skills/sandwich-gates.
//
// Skills that mutate files declare a Phase 0 pre-condition gate AND a
// final verification phase running the same check. This avoids partial
// writes leaving the repo in an inconsistent state.
//
// Heuristic: if SKILL.md mentions Edit/Write/MultiEdit, look for "Phase 0"
// and a final phase that re-runs whatever Phase 0 checked. We approximate
// by counting "## Phase" headers and requiring ≥2.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SKILLS = join(ROOT, '.claude/skills')

if (!existsSync(SKILLS)) {
  console.log('sandwich-gates — no skills directory')
  process.exit(0)
}

type Issue = { skill: string; problem: string }
const issues: Issue[] = []

function scan(dir: string, name: string) {
  const file = join(dir, 'SKILL.md')
  if (!existsSync(file)) return
  const text = readFileSync(file, 'utf-8')
  const mutates = /\b(Edit|Write|MultiEdit)\b/.test(text)
  if (!mutates) return
  const phases = (text.match(/^##\s+Phase\s+(\d+)/gm) ?? []).map((s) => Number(s.match(/\d+/)?.[0]))
  if (!phases.includes(0)) {
    issues.push({ skill: name, problem: 'mutating skill missing `## Phase 0:` pre-condition gate' })
  }
  if (phases.length < 2) {
    issues.push({ skill: name, problem: 'mutating skill needs ≥2 phases (pre-gate + final-gate)' })
  }
}

// Only enforce on Gaia-authored skills (d-*). See scripts/check-skills.ts.
function isGaiaSkill(name: string): boolean {
  const top = name.split('/')[0] ?? ''
  return top.startsWith('d-')
}

function walk(dir: string, parent = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const name = parent ? `${parent}/${entry.name}` : entry.name
    const full = join(dir, entry.name)
    if (existsSync(join(full, 'SKILL.md')) && isGaiaSkill(name)) {
      scan(full, name)
    }
    walk(full, name)
  }
}

walk(SKILLS)

if (issues.length > 0) {
  console.error('sandwich-gates — findings:')
  for (const i of issues) console.error(`  ${i.skill}  ${i.problem}`)
  console.error('\nSee .gaia/reference/skills.md.')
  process.exit(1)
}

console.log('sandwich-gates — all mutating skills have sandwich gates.')
process.exit(0)
