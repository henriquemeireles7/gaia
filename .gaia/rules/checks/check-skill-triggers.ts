// .gaia/rules/checks/check-skill-triggers.ts — trigger uniqueness check (ENG-2 from autoplan)
//
// Walks .claude/skills/<gaia-skill>/SKILL.md, parses the YAML frontmatter
// description field, extracts trigger phrases (anything quoted after
// `Triggers:` or `Voice:`), and verifies:
//
//   1. No two skills share the same trigger phrase (intra-Gaia uniqueness).
//   2. No Gaia trigger phrase collides with a gstack global command name
//      from .context/gstack-globals.txt (extra-Gaia uniqueness).
//
// Why this matters: an agent reads triggers to route. If "review" maps to
// both gstack `/review` and Gaia `w-review`, the agent can't disambiguate
// without reading bodies — defeats the cold-start contract.
//
// Failure exits 1; clean exits 0. Runs as part of `bun run check`.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SKILLS_DIR = join(ROOT, '.claude/skills')
const GSTACK_GLOBALS_FILE = join(ROOT, 'scripts/gstack-globals.txt')

if (!existsSync(SKILLS_DIR)) {
  console.error('No .claude/skills/ directory — skipping trigger check.')
  process.exit(0)
}

function isGaiaSkill(name: string): boolean {
  return name.startsWith('h-') || name.startsWith('w-') || name.startsWith('a-')
}

function extractTriggers(description: string): { triggers: string[]; voice: string[] } {
  // Match `Triggers: 'a', 'b', 'c'` or `Triggers: "a", "b"` forms.
  // Stops at the next `Mode:` / `Tier:` / `Voice:` / `After:` / `Artifact:` field
  // or the end of string.
  const triggers: string[] = []
  const voice: string[] = []

  const triggersMatch = description.match(
    /Triggers?:\s*(.+?)(?=\.\s*(?:Mode|Tier|Voice|After|Artifact)\b|\.\s*$|$)/i,
  )
  if (triggersMatch) {
    const segment = triggersMatch[1] ?? ''
    for (const m of segment.matchAll(/['"]([^'"]+?)['"]/g)) {
      const phrase = m[1]?.trim()
      if (phrase) triggers.push(phrase.toLowerCase())
    }
  }

  const voiceMatch = description.match(
    /Voice:\s*(.+?)(?=\.\s*(?:Mode|Tier|Triggers|After|Artifact)\b|\.\s*$|$)/i,
  )
  if (voiceMatch) {
    const segment = voiceMatch[1] ?? ''
    for (const m of segment.matchAll(/['"]([^'"]+?)['"]/g)) {
      const phrase = m[1]?.trim()
      if (phrase) voice.push(phrase.toLowerCase())
    }
  }

  return { triggers, voice }
}

function parseFrontmatter(content: string): { description: string } | null {
  if (!content.startsWith('---')) return null
  const closeIdx = content.indexOf('\n---', 3)
  if (closeIdx === -1) return null
  const fm = content.slice(3, closeIdx)
  // description: "..." possibly multiline (YAML folded) — match double-quoted then single-quoted
  const dq = fm.match(/^\s*description\s*:\s*"((?:[^"\\]|\\.)*)"/ms)
  if (dq) return { description: dq[1] ?? '' }
  const sq = fm.match(/^\s*description\s*:\s*'((?:[^'\\]|\\.)*)'/ms)
  if (sq) return { description: sq[1] ?? '' }
  return null
}

type Issue = { kind: 'intra-collision' | 'gstack-collision'; phrase: string; skills: string[] }
const issues: Issue[] = []
const triggerOwner = new Map<string, string[]>() // phrase → list of skills

const gaiaSkills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && isGaiaSkill(d.name))
  .map((d) => d.name)

for (const skill of gaiaSkills) {
  const skillFile = join(SKILLS_DIR, skill, 'SKILL.md')
  if (!existsSync(skillFile)) continue
  const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'))
  if (!fm) continue
  const { triggers, voice } = extractTriggers(fm.description)
  for (const phrase of [...triggers, ...voice]) {
    // Skip the skill's own name (it's expected to be a trigger for itself).
    if (phrase === skill) continue
    const owners = triggerOwner.get(phrase) ?? []
    owners.push(skill)
    triggerOwner.set(phrase, owners)
  }
}

// Intra-Gaia collisions
for (const [phrase, owners] of triggerOwner) {
  if (owners.length > 1) {
    issues.push({ kind: 'intra-collision', phrase, skills: owners })
  }
}

// gstack global collisions
if (existsSync(GSTACK_GLOBALS_FILE)) {
  const gstackGlobals = new Set(
    readFileSync(GSTACK_GLOBALS_FILE, 'utf-8')
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith('#')),
  )
  for (const [phrase, owners] of triggerOwner) {
    if (gstackGlobals.has(phrase)) {
      issues.push({ kind: 'gstack-collision', phrase, skills: owners })
    }
  }
}

if (issues.length > 0) {
  console.error('skills/trigger-uniqueness — failures:')
  for (const issue of issues) {
    if (issue.kind === 'intra-collision') {
      console.error(
        `  Phrase "${issue.phrase}" claimed by multiple Gaia skills: ${issue.skills.join(', ')}`,
      )
    } else {
      console.error(
        `  Phrase "${issue.phrase}" collides with a gstack global command (used by: ${issue.skills.join(', ')})`,
      )
    }
  }
  console.error(
    '\nNamespace voice triggers when they collide. See Initiative 0011 §2a constraint C3-bis.',
  )
  process.exit(1)
}

console.log(
  `skills/trigger-uniqueness: ${triggerOwner.size} trigger phrases checked across ${gaiaSkills.length} skills — clean.`,
)
process.exit(0)
