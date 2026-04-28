// scripts/check-skills.ts — ax/skill-md-frontmatter
//
// Validates that every .claude/skills/<name>/SKILL.md has YAML frontmatter
// declaring `name:` and `description:`. The two fields drive the skill
// resolver — missing them means Claude Code can't surface or invoke the
// skill correctly.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SKILLS_DIR = join(ROOT, '.claude/skills')

if (!existsSync(SKILLS_DIR)) {
  console.error('No .claude/skills/ directory — skipping.')
  process.exit(0)
}

type Issue = { skill: string; problem: string }
const issues: Issue[] = []

function checkSkill(dir: string, name: string) {
  const file = join(dir, 'SKILL.md')
  if (!existsSync(file)) {
    issues.push({ skill: name, problem: 'no SKILL.md' })
    return
  }
  const content = readFileSync(file, 'utf-8')
  if (!content.startsWith('---')) {
    issues.push({ skill: name, problem: 'no YAML frontmatter (must start with ---)' })
    return
  }
  const closeIdx = content.indexOf('\n---', 3)
  if (closeIdx === -1) {
    issues.push({ skill: name, problem: 'unterminated frontmatter (no closing ---)' })
    return
  }
  const fm = content.slice(3, closeIdx)
  if (!/^\s*name\s*:\s*\S/m.test(fm)) {
    issues.push({ skill: name, problem: 'frontmatter missing `name:` field' })
  }
  if (!/^\s*description\s*:\s*\S/m.test(fm)) {
    issues.push({ skill: name, problem: 'frontmatter missing `description:` field' })
  }
}

function walkSkills(dir: string, parentName = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const name = parentName ? `${parentName}/${entry.name}` : entry.name
    const full = join(dir, entry.name)
    if (existsSync(join(full, 'SKILL.md'))) {
      checkSkill(full, name)
    } else {
      // Nested grouping (e.g., .claude/skills/gstack/plan/) — recurse.
      walkSkills(full, name)
    }
  }
}

walkSkills(SKILLS_DIR)

if (issues.length > 0) {
  console.error('Skill frontmatter check FAILED:')
  for (const i of issues) {
    console.error(`  ${i.skill}: ${i.problem}`)
  }
  process.exit(1)
}

process.exit(0)
