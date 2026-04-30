// scripts/check-readme.ts — README is the storefront. Its shape is a contract.
//
// Enforces the locked sections from .gaia/initiatives/0002-gaia-bootstrap (AD-AP-4):
//   - hero block (first paragraph after H1) ≤ 10 lines
//   - at least one demo asset reference (img/svg under docs/assets/, or asciinema link)
//   - at least one shields.io badge
//   - "Quick start" or "Install" section with a 4-step install path
//   - "What you get" table with ≥4 data rows
//   - "FAQ" section with ≥5 question subheadings
//
// Bans references to deleted/renamed surfaces:
//   - decisions/ (constitution moved to fractal CLAUDE.md + .claude/skills/<x>/reference.md per 0001)
//   - "Migration in progress" prose (carry-over from a stale README)
//   - .gaia/MANIFEST.md (file-system-as-index per 0001 F-9)
//
// Run: bun scripts/check-readme.ts
// Wired into: bun run check:scripts

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const README = join(ROOT, 'README.md')

if (!existsSync(README)) {
  console.error('No README.md at repo root.')
  process.exit(1)
}

const content = readFileSync(README, 'utf-8')

type Issue = { rule: string; problem: string }
const issues: Issue[] = []

// --- Bans (deprecated references) ---

const BANNED: Array<{ rule: string; pattern: RegExp; reason: string }> = [
  {
    rule: 'readme/no-decisions-tree',
    pattern: /\bdecisions\/(?:[A-Za-z0-9_-]+\.md|\b)/,
    reason:
      'README must not direct readers to decisions/ — the constitution moved to fractal CLAUDE.md and .claude/skills/<x>/reference.md (initiative 0001).',
  },
  {
    rule: 'readme/no-migration-prose',
    pattern: /Migration in progress/i,
    reason: '"Migration in progress" prose is stale — drop it; the migration shipped in c0c7272.',
  },
  {
    rule: 'readme/no-manifest',
    pattern: /\.gaia\/MANIFEST\.md/,
    reason:
      '.gaia/MANIFEST.md no longer exists — the file system is the index per 0001 (vision §6).',
  },
]

for (const ban of BANNED) {
  if (ban.pattern.test(content)) {
    issues.push({ rule: ban.rule, problem: ban.reason })
  }
}

// --- Required structure ---

// Extract H1 + hero (everything between H1 and the next H2 or H1).
const lines = content.split('\n')
const h1Idx = lines.findIndex((l) => /^#\s+\S/.test(l))
if (h1Idx === -1) {
  issues.push({ rule: 'readme/h1', problem: 'README has no H1 title.' })
} else {
  // Hero = non-empty lines between H1 and the next ## (excluding badges/blockquotes).
  const heroLines: string[] = []
  for (let i = h1Idx + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/^##\s/.test(line)) break
    if (line.trim() === '') continue
    // Skip badge-only lines (markdown image or shields.io link).
    const trimmed = line.trim()
    if (/^!\[.*?\]\(.*?\)$/.test(trimmed)) continue
    if (trimmed.startsWith('<!--')) continue
    heroLines.push(line)
  }
  if (heroLines.length === 0) {
    issues.push({ rule: 'readme/hero', problem: 'README has no hero block under the H1.' })
  } else if (heroLines.length > 10) {
    issues.push({
      rule: 'readme/hero-length',
      problem: `Hero block is ${heroLines.length} non-empty lines — keep it ≤ 10 (AD-AP-4).`,
    })
  }
}

// Demo asset reference.
const hasDemoAsset =
  /docs\/assets\/[A-Za-z0-9_-]+\.(svg|png|gif|cast|tape)/i.test(content) ||
  /asciinema\.org/i.test(content) ||
  /vhs\.charm\.sh/i.test(content)
if (!hasDemoAsset) {
  issues.push({
    rule: 'readme/demo-asset',
    problem:
      'README must reference a demo asset (e.g. docs/assets/hero.svg, asciinema link, or vhs.tape). PR 10 lands the real recording; PR 1 ships a placeholder.',
  })
}

// Shields.io badge.
const hasBadge =
  /img\.shields\.io/i.test(content) ||
  /badge\.fury\.io/i.test(content) ||
  /github\.com\/.+\/(actions\/workflows|workflows)\/.+\.svg/i.test(content)
if (!hasBadge) {
  issues.push({
    rule: 'readme/badge',
    problem: 'README must include at least one shields.io (or equivalent) badge.',
  })
}

// "Quick start" or "Install" section.
const hasQuickStart = /^##\s+(Quick start|Install|Getting started|Get started)\b/im.test(content)
if (!hasQuickStart) {
  issues.push({
    rule: 'readme/quick-start',
    problem: 'README must have a "## Quick start" (or Install / Getting started) section.',
  })
}

// 4-step install — count fenced-block lines that look like commands inside the
// Quick start section. Pragmatic check: ≥3 command lines in the section.
function sectionBody(heading: RegExp): string {
  const start = lines.findIndex((l) => heading.test(l))
  if (start === -1) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i] ?? '')) {
      end = i
      break
    }
  }
  return lines.slice(start + 1, end).join('\n')
}

const quickStartBody = sectionBody(/^##\s+(Quick start|Install|Getting started|Get started)\b/i)
const cmdLineCount = (
  quickStartBody.match(/^[ \t]*[$>]?\s*(bun|cd|claude|gh|git|npm|npx)\b/gim) || []
).length
if (hasQuickStart && cmdLineCount < 3) {
  issues.push({
    rule: 'readme/quick-start-steps',
    problem: `Quick start section has only ${cmdLineCount} command lines — need ≥3 (target: bun create / cd / claude).`,
  })
}

// "What you get" table with ≥4 data rows.
const hasMatrix = /^##\s+(What you get|What ships|What's included)\b/im.test(content)
if (!hasMatrix) {
  issues.push({
    rule: 'readme/matrix',
    problem: 'README must have a "## What you get" matrix (table) section.',
  })
} else {
  const matrixBody = sectionBody(/^##\s+(What you get|What ships|What's included)\b/i)
  // Count markdown table rows. Header + separator + data rows. Need ≥6 lines (1 header + 1 sep + ≥4 data).
  const tableRows = matrixBody.split('\n').filter((l) => /^\s*\|.*\|\s*$/.test(l))
  if (tableRows.length < 6) {
    issues.push({
      rule: 'readme/matrix-rows',
      problem: `"What you get" table has ${Math.max(0, tableRows.length - 2)} data rows — need ≥4 (auth, billing, deploy, agent harness at minimum).`,
    })
  }
}

// FAQ section with ≥5 question subheadings.
const hasFaq = /^##\s+FAQ\b/im.test(content)
if (!hasFaq) {
  issues.push({
    rule: 'readme/faq',
    problem: 'README must have a "## FAQ" section with ≥5 question subheadings.',
  })
} else {
  const faqBody = sectionBody(/^##\s+FAQ\b/i)
  // Question subheadings are H3 (### …) inside the FAQ body.
  const questions = faqBody.split('\n').filter((l) => /^###\s+\S/.test(l)).length
  if (questions < 5) {
    issues.push({
      rule: 'readme/faq-questions',
      problem: `FAQ has ${questions} question subheadings — need ≥5 (free, lock-in, prereqs, what-if-it-breaks, framework).`,
    })
  }
}

// --- Report ---

if (issues.length > 0) {
  console.error('README checks — findings:')
  for (const i of issues) {
    console.error(`  [ERROR] [${i.rule}]  ${i.problem}`)
  }
  console.error(
    '\nFix the README per .gaia/initiatives/0002-gaia-bootstrap/initiative.md §4 PR 1 (AD-AP-4).',
  )
  process.exit(1)
}

console.log('README checks passed.')
