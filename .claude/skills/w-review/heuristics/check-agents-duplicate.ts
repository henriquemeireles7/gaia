// .claude/skills/w-review/heuristics/check-agents-duplicate.ts — code/agents-duplicate-humans-extract.
//
// Heuristic — surface NEW abstractions added in the current diff so a
// reviewer can ask "is this the third occurrence?". An abstraction = a
// new function or class with ≥2 generic params, or a file under
// packages/*/src/ exporting a "helper" / "util" / "shared" identifier.
//
// Reads the diff vs origin/master and prints flagged additions.

import { spawnSync } from 'node:child_process'

const BASE = process.env.REVIEW_BASE ?? 'origin/master'
const diff = spawnSync('git', ['diff', `${BASE}...HEAD`, '--unified=0'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
if (diff.status !== 0) {
  console.error('agents-duplicate — git diff failed')
  process.exit(0)
}

const text = diff.stdout.toString()
const lines = text.split('\n')

type Hit = { file: string; line: number; sample: string }
const hits: Hit[] = []
let currentFile = ''
let lineCursor = 0

for (const raw of lines) {
  if (raw.startsWith('+++ b/')) {
    currentFile = raw.slice(6)
    continue
  }
  if (raw.startsWith('@@')) {
    const m = raw.match(/\+(\d+)/)
    if (m) lineCursor = Number(m[1])
    continue
  }
  if (!raw.startsWith('+')) continue
  const line = raw.slice(1)

  // Generic abstraction signature: function/class with ≥2 type params,
  // or "helper"/"util"/"shared" identifier in packages/.
  if (/\b(function|class|const)\s+\w+\s*<[^>]*,[^>]*>/.test(line)) {
    hits.push({ file: currentFile, line: lineCursor, sample: line.trim() })
  } else if (
    currentFile.startsWith('packages/') &&
    /\bexport\s+(const|function|class)\s+(\w*[Hh]elper|\w*[Uu]til|\w*[Ss]hared)\b/.test(line)
  ) {
    hits.push({ file: currentFile, line: lineCursor, sample: line.trim() })
  }
  lineCursor++
}

if (hits.length === 0) {
  console.log('agents-duplicate — no new abstractions in diff.')
  process.exit(0)
}

console.log('agents-duplicate — review these new abstractions:')
for (const h of hits) {
  console.log(`  ${h.file}:${h.line}  ${h.sample}`)
}
console.log(
  '\nFor each: is this the THIRD concrete occurrence with the same change reason? If not, inline it.',
)
process.exit(0)
