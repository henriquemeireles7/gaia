// .claude/hooks/domain-context.ts — auto-load .gaia/reference/*.md by domain
//
// Fires on PreToolUse for Edit | Write | MultiEdit. Maps the target file
// path to the relevant reference docs and emits an advisory listing what
// the agent must have read before this edit. Vision §H6: "folder
// CLAUDE.mds auto-load by location" — this is the same idea applied to
// the reference constitution.
//
// Advisory only (exit 0). The agent decides whether to abort and read.
// Blocking would force a Read for every Edit, which is over-aggressive
// because the agent often has the reference already loaded in context.

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

type Rule = {
  test: (path: string) => boolean
  references: readonly string[]
  reason: string
}

// Always include code.md — it's the constitution.
const ALWAYS = ['code.md']

const DOMAIN_MAP: readonly Rule[] = [
  {
    test: (p) => p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.includes('/test/'),
    references: ['testing.md'],
    reason: 'test file — testing patterns and coverage rules apply',
  },
  {
    test: (p) => p.startsWith('apps/api/') || p.includes('/apps/api/'),
    references: ['backend.md', 'errors.md', 'security.md'],
    reason: 'backend Elysia code',
  },
  {
    test: (p) => p.startsWith('apps/web/') || p.includes('/apps/web/'),
    references: ['frontend.md', 'ux.md', 'design.md', 'tokens.md'],
    reason: 'frontend SolidStart code',
  },
  {
    test: (p) => p.includes('packages/db/'),
    references: ['database.md'],
    reason: 'database schema or migration',
  },
  {
    test: (p) => p.includes('packages/auth/') || p.includes('packages/security/'),
    references: ['security.md', 'backend.md'],
    reason: 'auth or security boundary',
  },
  {
    test: (p) => p.includes('packages/adapters/') || p.includes('packages/workflows/'),
    references: ['backend.md'],
    reason: 'external capability adapter',
  },
  {
    test: (p) => p.includes('packages/api/'),
    references: ['backend.md', 'frontend.md'],
    reason: 'Eden Treaty type bridge',
  },
  {
    test: (p) => p.includes('packages/errors/'),
    references: ['errors.md'],
    reason: 'error catalog',
  },
  {
    test: (p) => p.includes('packages/core/observability'),
    references: ['observability.md'],
    reason: 'observability primitives',
  },
  {
    test: (p) => p.startsWith('.claude/hooks/') || p.includes('/.claude/hooks/'),
    references: ['harness.md'],
    reason: 'harness hook',
  },
  {
    test: (p) =>
      p.startsWith('.gaia/rules.ts') ||
      p.startsWith('.gaia/conductor.ts') ||
      p.startsWith('.gaia/protocols/'),
    references: ['harness.md'],
    reason: 'harness substrate',
  },
  {
    test: (p) => p.endsWith('.css'),
    references: ['design.md', 'tokens.md'],
    reason: 'styling',
  },
  {
    test: (p) => p.startsWith('.github/workflows/') || p.includes('/.github/workflows/'),
    references: ['commands.md', 'observability.md'],
    reason: 'CI configuration',
  },
  // ── Product surfaces (auth flows, signup, billing, dunning, notifications) ─
  {
    test: (p) =>
      /apps\/web\/src\/routes\/(login|signup|forgot-password|reset-password|onboard)/.test(p) ||
      /onboard/i.test(p),
    references: ['product/onboarding.md'],
    reason: 'onboarding / signup surface',
  },
  {
    test: (p) => /billing|subscription|dunning|notification|retention/i.test(p),
    references: ['product/retention.md'],
    reason: 'retention / billing / notifications surface',
  },
  // ── Per-feature references (scoped loading) ───────────────────────────────
  // For files under apps/{api,web}/src/.../features/<x>/* or apps/api/features/<x>/*,
  // also auto-load .gaia/reference/features/<x>.md if present.
  // Implemented via a wildcard rule below, post-DOMAIN_MAP.
  // ── Reference / skill authoring (the meta layer) ──────────────────────────
  {
    test: (p) => p.startsWith('.gaia/reference/'),
    references: ['references.md', 'methodology.md'],
    reason: 'editing a reference file (meta-layer)',
  },
  {
    test: (p) => p.startsWith('.claude/skills/') && p.endsWith('SKILL.md'),
    references: ['skills.md', 'methodology.md', 'ax.md'],
    reason: 'editing a skill (meta-layer)',
  },
]

// Per-feature reference loader: extract <feature> from path and add features/<feature>.md if it exists.
function featureRefFor(path: string): string | null {
  const m = path.match(/(?:apps\/(?:api|web)\/(?:src\/)?features\/|features\/)([a-z][a-z0-9-]*)/i)
  if (!m) return null
  return `features/${m[1]}.md`
}

const input = (await Bun.stdin.json()) as {
  tool_input?: { file_path?: string; path?: string }
}
const rawPath = input.tool_input?.file_path ?? input.tool_input?.path ?? ''
if (!rawPath) process.exit(0)

const relPath = rawPath.startsWith(ROOT) ? relative(ROOT, rawPath) : rawPath

// Skip files outside the project conventions (node_modules, .git, generated).
if (
  relPath.startsWith('node_modules/') ||
  relPath.startsWith('.git/') ||
  relPath.startsWith('dist/') ||
  relPath.startsWith('.gaia/audit/') ||
  relPath.startsWith('.gaia/memory/working/')
) {
  process.exit(0)
}

const required = new Set<string>(ALWAYS)
const reasons: string[] = []
for (const rule of DOMAIN_MAP) {
  if (rule.test(relPath)) {
    for (const ref of rule.references) required.add(ref)
    reasons.push(rule.reason)
  }
}

// Per-feature reference (scoped loading by path)
const featureRef = featureRefFor(relPath)
if (featureRef) {
  required.add(featureRef)
  reasons.push(
    `per-feature reference for ${featureRef.replace(/^features\//, '').replace(/\.md$/, '')}`,
  )
}

// Filter to references that actually exist on disk.
const referenceDir = join(ROOT, '.gaia/reference')
const existing = [...required].filter((r) => existsSync(join(referenceDir, r)))
if (existing.length === 0) process.exit(0)

// Per-session marker: track which refs the agent has already been told
// about for this transcript. Re-issuing the advisory every Edit on the
// same domain is noisy; once is enough. Markers live in working memory,
// which is gitignored and per-clone.
const markerDir = join(ROOT, '.gaia/memory/working')
const markerFile = join(markerDir, 'domain-context.json')

let seen: Record<string, true> = {}
try {
  if (existsSync(markerFile)) seen = JSON.parse(await readFile(markerFile, 'utf-8'))
} catch {
  // fall through with empty seen
}

const fresh = existing.filter((r) => !seen[r])
if (fresh.length === 0) process.exit(0)

for (const r of fresh) seen[r] = true
try {
  await Bun.write(markerFile, JSON.stringify(seen, null, 2))
} catch {
  // best-effort — never block on marker write failure
}

const list = fresh.map((r) => `  - .gaia/reference/${r}`).join('\n')
const reasonStr = [...new Set(reasons)].join(', ')

console.error(
  [
    `AGENT: editing ${relPath} — domain: ${reasonStr || 'general'}.`,
    `Before this edit (and once per session per reference), you must have read:`,
    list,
    `If any of these are not in your context, abort this Edit and Read them first.`,
    `These advisories are emitted once per session per reference; if you've already`,
    `read a file this session it won't reappear.`,
  ].join('\n'),
)

process.exit(0)
