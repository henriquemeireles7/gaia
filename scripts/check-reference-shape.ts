// scripts/check-reference-shape.ts — references/principle-shape.
//
// Walks .gaia/reference/**/*.md and verifies every numbered principle
// (### 1. ... ### 10.) has the 5-part shape:
//   1. title + description
//   2. **Rules / Guidelines / Boundaries:** with 2-4 bullet points
//   3. **Enforcement:** naming a mechanism kind
//   4. **Anti-pattern:** with code/example
//   5. **Pattern:** with code/example
//
// Skip references where the 4-part or simpler shape is intentionally
// preserved (code.md, security.md — pre-existing layout). The skip list
// is explicit so additions are visible.

import { readFileSync } from 'node:fs'
import { Glob } from 'bun'

// References that ship with a different shape. Adding to this list
// requires a comment explaining why the 5-part shape doesn't apply.
const SHAPE_EXEMPT = new Set([
  '.gaia/reference/code.md', // the original 4-part shape; foundational
  '.gaia/reference/security.md', // its own format with "Attacks defended"
  '.gaia/reference/ax.md', // narrative meta-reference
  '.gaia/reference/dx.md', // narrative meta-reference
  '.gaia/reference/voice.md', // brand-voice doc; not principle-numbered
  '.gaia/reference/workflow.md', // procedural — phases, not principles
  '.gaia/reference/harness.md', // mechanics doc; mixed shape
  '.gaia/reference/commands.md', // inventory, not principles
  '.gaia/reference/ux.md', // narrative + patterns
  '.gaia/reference/design.md', // pre-existing 12 principles in different shape
  '.gaia/reference/tokens.md', // values doc
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

for await (const file of new Glob('.gaia/reference/**/*.md').scan({ cwd: process.cwd() })) {
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

if (failures.length > 0) {
  console.error('references/principle-shape — failures:')
  for (const f of failures) {
    console.error(`  ${f.file} — "${f.principle}"`)
    for (const m of f.missing) console.error(`    missing: ${m}`)
  }
  console.error(
    '\nEvery numbered principle (### 1. ...) needs the 5-part shape: description, Rules/Guidelines/Boundaries (2–4 bullets), Enforcement, Anti-pattern, Pattern. See .gaia/reference/references.md.',
  )
  process.exit(1)
}

process.exit(0)
