// scripts/check-reference-shape.ts — references/principle-shape.
//
// Walks .claude/skills/<skill>/reference.md and verifies every numbered
// principle (### 1. ... ### 10.) has the 5-part shape:
//   1. title + description
//   2. **Rules / Guidelines / Boundaries:** with 2-4 bullet points
//   3. **Enforcement:** naming a mechanism kind
//   4. **Anti-pattern:** with code/example
//   5. **Pattern:** with code/example
//
// Skip references where the 4-part or simpler shape is intentionally
// preserved (legacy migrations from the flat reference folder). The skip
// list is explicit so additions are visible.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

// References that ship with a different shape. Adding to this list
// requires a comment explaining why the 5-part shape doesn't apply.
const SHAPE_EXEMPT = new Set([
  '.claude/skills/w-code/reference.md', // concatenated code+testing+errors; pre-existing 4-part shape
  '.claude/skills/a-security/reference.md', // own format with "Attacks defended"
  '.claude/skills/a-ax/reference.md', // narrative meta-reference
  '.claude/skills/a-dx/reference.md', // narrative meta-reference
  '.claude/skills/w-write/reference.md', // brand-voice doc; not principle-numbered
  '.claude/skills/w-deploy/reference.md', // procedural deployment doc
  '.claude/skills/a-ux/reference.md', // narrative + patterns
  '.claude/skills/a-ai/reference.md', // narrative ai patterns
  '.claude/skills/a-observability/reference.md', // mechanics doc; mixed shape
  '.claude/skills/w-infra/reference.md', // scaffold; full content lands in 0004
  '.gaia/reference/product/onboarding.md', // legacy product reference; preserved
  '.gaia/reference/product/retention.md', // legacy product reference; preserved
])

const PRINCIPLE_HEADER = /^###\s+\d+\.\s+/
const RULES_LABEL = /\*\*Rules\s*\/\s*Guidelines\s*\/\s*Boundaries:?\*\*/i
const ENFORCEMENT_LABEL = /\*\*Enforcement:?\*\*/
const ANTIPATTERN_LABEL = /\*\*Anti-pattern:?\*\*/i
const PATTERN_LABEL = /\*\*Pattern:?\*\*/i

type Failure = { file: string; principle: string; missing: readonly string[]; bullets?: number }

function checkPrinciple(body: string): Pick<Failure, 'missing' | 'bullets'> {
  const missing: string[] = []
  if (!RULES_LABEL.test(body)) missing.push('Rules/Guidelines/Boundaries')
  if (!ENFORCEMENT_LABEL.test(body)) missing.push('Enforcement')
  if (!ANTIPATTERN_LABEL.test(body)) missing.push('Anti-pattern')
  if (!PATTERN_LABEL.test(body)) missing.push('Pattern')

  let bullets: number | undefined
  if (RULES_LABEL.test(body)) {
    const rulesIdx = body.search(RULES_LABEL)
    const enforcementIdx = body.search(ENFORCEMENT_LABEL)
    if (rulesIdx >= 0 && enforcementIdx > rulesIdx) {
      const segment = body.slice(rulesIdx, enforcementIdx)
      bullets = segment.split('\n').filter((l) => /^\s*-\s+\S/.test(l)).length
      if (bullets < 2 || bullets > 4) {
        missing.push(`Rules bullets (got ${bullets}, expected 2–4)`)
      }
    }
  }

  return { missing, bullets }
}

function splitPrinciples(text: string): { title: string; body: string }[] {
  const lines = text.split('\n')
  const out: { title: string; body: string }[] = []
  let currentTitle: string | null = null
  let buffer: string[] = []
  for (const line of lines) {
    if (PRINCIPLE_HEADER.test(line)) {
      if (currentTitle) out.push({ title: currentTitle, body: buffer.join('\n') })
      currentTitle = line.replace(/^###\s+/, '').trim()
      buffer = []
    } else if (currentTitle) {
      // Stop at the next ## header (end of principles section)
      if (/^##\s+/.test(line) && !line.startsWith('### ')) {
        out.push({ title: currentTitle, body: buffer.join('\n') })
        currentTitle = null
        buffer = []
      } else {
        buffer.push(line)
      }
    }
  }
  if (currentTitle) out.push({ title: currentTitle, body: buffer.join('\n') })
  return out
}

const failures: Failure[] = []

const SCAN_PATTERNS = ['.claude/skills/*/reference.md', '.gaia/reference/**/*.md']

for (const pattern of SCAN_PATTERNS) {
  for await (const file of new Glob(pattern).scan({ cwd: process.cwd() })) {
    if (SHAPE_EXEMPT.has(file)) continue
    const text = readFileSync(file, 'utf-8')
    if (!PRINCIPLE_HEADER.test(text)) continue // no numbered principles; skip
    const principles = splitPrinciples(text)
    for (const { title, body } of principles) {
      const { missing, bullets } = checkPrinciple(body)
      if (missing.length > 0) {
        failures.push({ file, principle: title, missing, bullets })
      }
    }
  }
}

if (failures.length > 0) {
  console.error('references/principle-shape — failures:')
  for (const f of failures) {
    console.error(`  ${f.file} — "${f.principle}"`)
    for (const m of f.missing) console.error(`    missing: ${m}`)
  }
  console.error(
    '\nEvery numbered principle (### 1. ...) needs the 5-part shape: description, Rules/Guidelines/Boundaries (2–4 bullets), Enforcement, Anti-pattern, Pattern. See .claude/skills/h-reference/reference.md.',
  )
  process.exit(1)
}

process.exit(0)
