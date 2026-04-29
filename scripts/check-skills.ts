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
  // a-health uses 10 numbered "## Session N:" headers — its phase vocabulary.
  'a-health',
  // w-debug uses "## Steps" with numbered substeps — debug recovery, not a phased build.
  'w-debug',
  // w-write uses "## Process" — type-routed pipeline, not phased.
  'w-write',
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

  // 1b. skills/frontmatter-constraints — Initiative 0011 cold-start invariants.
  // Per autoplan DX-1/2/3, the description field is the contract. As of the
  // 0011 sweep, every Gaia-authored skill passes — flipped from 'warn' to
  // 'error' (Task 24, Initiative 0011 §5 audit trail).
  const desc = fm.match(/^\s*description\s*:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? ''
  const top = name.split('/')[0] ?? ''
  const requiresTier =
    top.startsWith('a-') || top === 'w-debug' || top === 'w-write' || top === 'a-health'
  const isFixSkill = top.startsWith('w-') || top.startsWith('h-')

  // C3 — Triggers must be declared.
  if (!/Triggers?:/i.test(desc)) {
    issues.push({
      skill: name,
      rule: 'skills/c3-triggers-declared',
      problem: 'description missing `Triggers:` (C3)',
      severity: 'error',
    })
  }

  // C4 — Mode must be declared.
  if (!/Mode:/i.test(desc)) {
    issues.push({
      skill: name,
      rule: 'skills/c4-mode-declared',
      problem: 'description missing `Mode:` (C4 — declare report or fix)',
      severity: 'error',
    })
  }

  // C5 — Tier must be declared where invocation cost varies.
  if (requiresTier && !/Tier:/i.test(desc)) {
    issues.push({
      skill: name,
      rule: 'skills/c5-tier-declared',
      problem: 'description missing `Tier:` (C5 — audits/composites need tier discipline)',
      severity: 'error',
    })
  }

  // C6 — Output artifact must be pinned.
  if (!/Artifact:/i.test(desc)) {
    issues.push({
      skill: name,
      rule: 'skills/c6-artifact-pinned',
      problem: 'description missing `Artifact:` (C6 — name where output lands)',
      severity: 'error',
    })
  }

  // C7 — Failure modes section must exist for fix-mode skills.
  if (isFixSkill && !/^##\s+Failure modes\b/m.test(body)) {
    issues.push({
      skill: name,
      rule: 'skills/c7-failure-modes',
      problem:
        'missing `## Failure modes` section (C7 — fix-mode skills must declare failure paths)',
      severity: 'error',
    })
  }

  // C8 — Chain hint (After: or Pair:) for non-isolated skills.
  // Harness skills (h-*) work alone; everything else benefits from a chain hint.
  if (!top.startsWith('h-') && !/(After|Pair):/i.test(desc)) {
    issues.push({
      skill: name,
      rule: 'skills/c8-chain-hint',
      problem: 'description missing `After:` or `Pair:` (C8 — declare the chain)',
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
      // Allowed sibling markdowns:
      //   reference.md         — canonical sibling (post-Initiative 0001 SRR triad)
      //   rules-<type>.md      — per-mode sub-instructions (e.g. w-write/rules-blog.md)
      const allowed = entry.name === 'reference.md' || entry.name.startsWith('rules-')
      if (!allowed) {
        issues.push({
          skill: name,
          rule: 'skills/sibling-layout',
          problem: `sibling markdown "${entry.name}" should be reference.md or rules-*.md`,
          severity: 'warn',
        })
      }
    }
  }
}

// Only enforce on Gaia-authored skills (h-* harness, w-* workflow, a-* audit).
// Vendored/installed skills (gstack, init, review, security-review, third-party
// Claude-Code skills) are out of our control and would generate noise.
function isGaiaSkill(name: string): boolean {
  const top = name.split('/')[0] ?? ''
  return top.startsWith('h-') || top.startsWith('w-') || top.startsWith('a-')
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
