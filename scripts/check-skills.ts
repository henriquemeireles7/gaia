// scripts/check-skills.ts — skills/* + ax/skill-md-frontmatter.
//
// Validates SKILL.md files in .claude/skills/. Covers:
//   - ax/skill-md-frontmatter        — name + description in YAML frontmatter
//   - skills/output-mode-required    — `## Output` section present
//   - skills/cold-start-safe         — no "as I mentioned"-style assumptions
//   - skills/numbered-phases         — non-trivial skills use `## Phase N:`
//   - skills/typed-output            — `## Output` declares a mode
//   - skills/sibling-layout          — sibling files in scripts/, templates/, rules-*.md
//
// Each issue is tagged with its rule id so trend reports can attribute
// blame correctly.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SKILLS_DIR = join(ROOT, '.claude/skills')

if (!existsSync(SKILLS_DIR)) {
  console.error('No .claude/skills/ directory — skipping.')
  process.exit(0)
}

type Issue = { skill: string; rule: string; problem: string; severity: 'error' | 'warn' }
const issues: Issue[] = []

const COLD_START_SMELL =
  /\b(as I mentioned|as discussed|remember earlier|like before|continuing from|picking up where|in our last)\b/i

const OUTPUT_MODES = ['fix', 'report', 'question'] as const
type OutputMode = (typeof OUTPUT_MODES)[number]

// Skills exempt from skills/numbered-phases. Two categories:
//   1. Skills short enough not to need phase headers.
//   2. Skills that use a domain-specific structural vocabulary
//      ("Sessions", "Steps", "Flow", "Process") instead of "Phase".
// Adding to this list requires a comment explaining why.
const PHASE_EXEMPT = new Set([
  'gstack/init',
  'gstack/review',
  'gstack/security-review',
  // d-health uses 10 numbered "## Session N:" headers — its phase vocabulary.
  'd-health',
  // d-fail uses "## Steps" with numbered substeps — recovery, not a phased build.
  'd-fail',
  // d-strategy uses "## Flow" — interactive Q&A, not a build pipeline.
  'd-strategy',
  // d-roadmap uses "## Process" — mechanical extraction, not phased.
  'd-roadmap',
  // d-content uses "## Process" — type-routed pipeline, not phased.
  'd-content',
  // d-harness uses "## The Loop: Error → Classify → Encode → Verify" — its phase shape.
  'd-harness',
])

const SIBLING_TYPES = ['scripts', 'templates', 'checks', 'heuristics'] as const

function checkSkill(dir: string, name: string) {
  const file = join(dir, 'SKILL.md')
  if (!existsSync(file)) {
    issues.push({
      skill: name,
      rule: 'ax/skill-md-frontmatter',
      problem: 'no SKILL.md',
      severity: 'error',
    })
    return
  }

  const content = readFileSync(file, 'utf-8')

  // 1. Frontmatter — name + description.
  if (!content.startsWith('---')) {
    issues.push({
      skill: name,
      rule: 'ax/skill-md-frontmatter',
      problem: 'no YAML frontmatter (must start with ---)',
      severity: 'error',
    })
    return
  }
  const closeIdx = content.indexOf('\n---', 3)
  if (closeIdx === -1) {
    issues.push({
      skill: name,
      rule: 'ax/skill-md-frontmatter',
      problem: 'unterminated frontmatter (no closing ---)',
      severity: 'error',
    })
    return
  }
  const fm = content.slice(3, closeIdx)
  const body = content.slice(closeIdx + 4)
  if (!/^\s*name\s*:\s*\S/m.test(fm)) {
    issues.push({
      skill: name,
      rule: 'ax/skill-md-frontmatter',
      problem: 'frontmatter missing `name:` field',
      severity: 'error',
    })
  }
  if (!/^\s*description\s*:\s*\S/m.test(fm)) {
    issues.push({
      skill: name,
      rule: 'ax/skill-md-frontmatter',
      problem: 'frontmatter missing `description:` field',
      severity: 'error',
    })
  }

  // 2. skills/output-mode-required + skills/typed-output — ## Output section.
  // Walk lines to extract the section body (regex with m flag is fragile
  // around lazy matching + $ anchors).
  const bodyLines = body.split('\n')
  let outputBody: string | null = null
  let collecting = false
  for (const line of bodyLines) {
    if (/^##\s+Output\b/.test(line)) {
      outputBody = ''
      collecting = true
      continue
    }
    if (collecting && /^##\s/.test(line)) break
    if (collecting) outputBody += `${line}\n`
  }

  if (outputBody === null) {
    issues.push({
      skill: name,
      rule: 'skills/output-mode-required',
      problem: 'missing `## Output` section — declare what the skill returns',
      severity: 'error',
    })
  } else {
    const declared: OutputMode[] = OUTPUT_MODES.filter((m) =>
      new RegExp(`\\b${m}\\b`, 'i').test(outputBody as string),
    )
    if (declared.length === 0) {
      issues.push({
        skill: name,
        rule: 'skills/typed-output',
        problem: '## Output section does not name a mode (fix | report | question)',
        severity: 'error',
      })
    }
  }

  // 3. skills/cold-start-safe — no "as I mentioned"-style language.
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (COLD_START_SMELL.test(line)) {
      issues.push({
        skill: name,
        rule: 'skills/cold-start-safe',
        problem: `cold-start unsafe phrase at line ${i + 1}: "${line.match(COLD_START_SMELL)?.[0]}"`,
        severity: 'error',
      })
    }
  }

  // 4. skills/numbered-phases — non-trivial skills use `## Phase N:`.
  if (!PHASE_EXEMPT.has(name)) {
    const isNonTrivial = body.length > 1500
    const hasPhases = /^##\s+Phase\s+\d+\b/m.test(body)
    if (isNonTrivial && !hasPhases) {
      issues.push({
        skill: name,
        rule: 'skills/numbered-phases',
        problem: 'non-trivial skill (>1500 chars) without `## Phase N:` headers',
        severity: 'warn',
      })
    }
  }

  // 5. skills/sibling-layout — siblings live in typed folders.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'SKILL.md') continue
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        !SIBLING_TYPES.includes(entry.name as 'scripts' | 'templates' | 'checks' | 'heuristics')
      ) {
        // Allow nested skills (gstack/plan/) — those have their own SKILL.md.
        if (existsSync(join(full, 'SKILL.md'))) continue
        issues.push({
          skill: name,
          rule: 'skills/sibling-layout',
          problem: `unexpected sub-folder "${entry.name}/" — use scripts/, templates/, checks/, or heuristics/`,
          severity: 'warn',
        })
      }
    } else if (entry.name.endsWith('.md')) {
      // Sub-instructions must match rules-*.md.
      if (!entry.name.startsWith('rules-')) {
        issues.push({
          skill: name,
          rule: 'skills/sibling-layout',
          problem: `sibling markdown "${entry.name}" should be named rules-*.md`,
          severity: 'warn',
        })
      }
    }
  }
}

// Only enforce on Gaia-authored skills (d-*). Vendored/installed skills
// (gstack, init, review, security-review, third-party Claude-Code skills)
// are out of our control and would generate noise.
function isGaiaSkill(name: string): boolean {
  const top = name.split('/')[0] ?? ''
  return top.startsWith('d-')
}

function walkSkills(dir: string, parentName = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const name = parentName ? `${parentName}/${entry.name}` : entry.name
    const full = join(dir, entry.name)
    // Ignore typed sibling folders (scripts/, templates/, checks/, heuristics/) at any depth.
    if (
      parentName &&
      SIBLING_TYPES.includes(entry.name as 'scripts' | 'templates' | 'checks' | 'heuristics')
    ) {
      continue
    }
    if (existsSync(join(full, 'SKILL.md'))) {
      if (isGaiaSkill(name)) checkSkill(full, name)
      walkSkills(full, name)
    } else {
      walkSkills(full, name)
    }
  }
}

walkSkills(SKILLS_DIR)

const errors = issues.filter((i) => i.severity === 'error')

if (issues.length > 0) {
  console.error('Skill checks — findings:')
  for (const i of issues) {
    const tag = i.severity === 'error' ? 'ERROR' : 'WARN'
    console.error(`  [${tag}] ${i.skill}  [${i.rule}]  ${i.problem}`)
  }
  if (errors.length > 0) {
    console.error('\nFix the errors. Warnings are advisory.')
  }
}

process.exit(errors.length > 0 ? 1 : 0)
