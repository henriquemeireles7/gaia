// .claude/hooks/skill-reference.ts — auto-load <skill>/reference.md on Skill invocation
//
// Fires on PreToolUse for Skill. Looks up the invoked skill, finds its
// sibling reference.md (1:1 invariant per .claude/skills/h-rules/reference.md),
// and emits an advisory telling the agent to Read it before executing the
// skill's phases.
//
// Advisory only (exit 0). Pairs with domain-context.ts which fires on file
// edits; together they implement the SRR triad's two bridges:
//   - skill-reference: skill invoked → load skill's reference
//   - domain-context: file edited → load fractal CLAUDE.md tree

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()

const input = (await Bun.stdin.json()) as {
  tool_input?: { skill?: string; name?: string }
}
const skill = input.tool_input?.skill ?? input.tool_input?.name ?? ''
if (!skill) process.exit(0)

// Only advise for project-local skills (d-* convention). gstack and other
// vendored skills carry their own conventions and don't follow the
// 1:1 reference.md pairing.
if (!skill.startsWith('d-')) process.exit(0)

const skillDir = join(ROOT, '.claude/skills', skill)
const refPath = join(skillDir, 'reference.md')
if (!existsSync(refPath)) process.exit(0)

// Per-session marker — once per skill per session.
const markerDir = join(ROOT, '.gaia/memory/working')
const markerFile = join(markerDir, 'skill-reference.json')

let seen: Record<string, true> = {}
try {
  if (existsSync(markerFile)) seen = JSON.parse(await readFile(markerFile, 'utf-8'))
} catch {
  // fall through with empty seen
}

if (seen[skill]) process.exit(0)

seen[skill] = true
try {
  await Bun.write(markerFile, JSON.stringify(seen, null, 2))
} catch {
  // best-effort — never block on marker write failure
}

console.error(
  [
    `AGENT: invoking skill ${skill} — read its reference before executing phases:`,
    `  - .claude/skills/${skill}/reference.md`,
    `This advisory fires once per skill per session.`,
  ].join('\n'),
)

process.exit(0)
