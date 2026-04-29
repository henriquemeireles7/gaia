// .claude/skills/w-review/heuristics/check-adversarial-review.ts — references/adversarial-review.
//
// New or majorly-rewritten reference files require a 6-specialist
// adversarial review in the PR body. Detect when .gaia/reference/*.md
// changes substantively (>50 added lines) and assert the PR description
// mentions the review.

import { spawnSync } from 'node:child_process'

const BASE = process.env.REVIEW_BASE ?? 'origin/master'
const SHORTSTAT = spawnSync(
  'git',
  ['diff', '--numstat', `${BASE}...HEAD`, '--', '.gaia/reference/'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)
if (SHORTSTAT.status !== 0) {
  console.log('adversarial-review — diff failed; skipping')
  process.exit(0)
}

const heavy = SHORTSTAT.stdout
  .toString()
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [add = '0', del = '0', file = ''] = l.split('\t')
    return { add: Number(add), del: Number(del), file }
  })
  .filter((row) => row.file.endsWith('.md') && (row.add >= 50 || row.del >= 50))

if (heavy.length === 0) {
  console.log('adversarial-review — no major reference changes; skipping')
  process.exit(0)
}

const PR_BODY = process.env.PR_BODY ?? ''
if (!PR_BODY) {
  console.log(
    'adversarial-review — heavy reference edits detected, but PR_BODY env unset (cannot check). Set PR_BODY in CI.',
  )
  for (const r of heavy) console.log(`  ${r.file}  +${r.add}/-${r.del}`)
  process.exit(0)
}

const SPECIALISTS = ['CEO', 'eng', 'design', 'devex', 'security', 'voice']
const missing = SPECIALISTS.filter((s) => !new RegExp(`\\b${s}\\b`, 'i').test(PR_BODY))

if (missing.length > 0) {
  console.error('adversarial-review — major reference edit lacks 6-specialist review:')
  console.error(`  files changed:`)
  for (const r of heavy) console.error(`    ${r.file}  +${r.add}/-${r.del}`)
  console.error(`  PR body missing perspectives: ${missing.join(', ')}`)
  console.error('\nSee .gaia/reference/references.md for the 6-specialist format.')
  process.exit(1)
}

console.log('adversarial-review — all 6 perspectives present in PR body.')
process.exit(0)
