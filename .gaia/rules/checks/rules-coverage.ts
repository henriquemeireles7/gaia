// .gaia/rules/checks/rules-coverage.ts — surface "% rules enforced" from
// the policy manifest.
//
// Reads the single policy source and prints a coverage matrix grouped by
// reference domain and mechanism kind. Run by CI ("rules-coverage" job)
// and printable locally with `bun .gaia/rules/checks/rules-coverage.ts`.
//
// Exit code 0 always. The point is visibility, not blocking — the rules
// themselves block via their own mechanisms.

import { rules, type Mechanism } from '..'

type Kind = Mechanism['kind']
const KINDS: readonly Kind[] = [
  'hook',
  'oxlint',
  'ast-grep',
  'script',
  'tsc',
  'ci',
  'review',
  'advisory',
  'pending',
] as const

const totals: Record<Kind, number> = {
  pending: 0,
  hook: 0,
  script: 0,
  oxlint: 0,
  'ast-grep': 0,
  tsc: 0,
  ci: 0,
  review: 0,
  advisory: 0,
}

for (const rule of rules) {
  totals[rule.mechanism.kind]++
}

const enforced = rules.length - totals.pending
const coverage = ((enforced / rules.length) * 100).toFixed(1)

console.error('Gaia rules.ts coverage')
console.error('═══════════════════════')
console.error(`Total rules:     ${rules.length}`)
console.error(`Enforced:        ${enforced} (${coverage}%)`)
console.error(`Pending:         ${totals.pending}`)
console.error('')
console.error('By mechanism:')
for (const kind of KINDS) {
  const n = totals[kind]
  if (n === 0) continue
  const bar = '█'.repeat(Math.round((n / rules.length) * 30))
  console.error(`  ${kind.padEnd(10)} ${String(n).padStart(2)}  ${bar}`)
}

// Pending rules: surface them so they're visible in CI logs.
if (totals.pending > 0) {
  console.error('')
  console.error('Pending rules (not yet enforced):')
  for (const rule of rules) {
    if (rule.mechanism.kind !== 'pending') continue
    console.error(`  ${rule.id} — ${rule.mechanism.note}`)
  }
}
