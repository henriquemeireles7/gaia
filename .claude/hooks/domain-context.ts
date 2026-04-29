// .claude/hooks/domain-context.ts — auto-load fractal CLAUDE.md by edit location
//
// Fires on PreToolUse for Edit | Write | MultiEdit. Walks the folder tree
// from the edit target up to repo root, collecting every CLAUDE.md found.
// Emits an advisory listing what the agent must have read before this edit.
//
// Replaces the legacy flat-reference lookup. Fractal CLAUDE.md is the
// folder-scoped surface; skill `reference.md` is the verb-scoped surface
// (handled by skill-reference.ts).
//
// Advisory only (exit 0). The agent decides whether to abort and read.
// Blocking would force a Read for every Edit, which is over-aggressive
// because the agent often has the file already loaded in context.

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

const ROOT = process.cwd()

const input = (await Bun.stdin.json()) as {
  tool_input?: { file_path?: string; path?: string }
}
const rawPath = input.tool_input?.file_path ?? input.tool_input?.path ?? ''
if (!rawPath) process.exit(0)

const relPath = rawPath.startsWith(ROOT) ? relative(ROOT, rawPath) : rawPath

// Skip files outside the project conventions.
if (
  relPath.startsWith('node_modules/') ||
  relPath.startsWith('.git/') ||
  relPath.startsWith('dist/') ||
  relPath.startsWith('.gaia/audit/') ||
  relPath.startsWith('.gaia/memory/working/')
) {
  process.exit(0)
}

// Walk from the edit target's directory up to repo root, collecting every
// CLAUDE.md found. Closest-first so the listing reads top-down (broadest
// scope first, narrowest scope last).
const found: string[] = []
let dir = dirname(join(ROOT, relPath))
while (dir.startsWith(ROOT)) {
  const candidate = join(dir, 'CLAUDE.md')
  if (existsSync(candidate)) found.push(relative(ROOT, candidate))
  if (dir === ROOT) break
  const parent = dirname(dir)
  if (parent === dir) break
  dir = parent
}

if (found.length === 0) process.exit(0)

// Order broadest → narrowest (root first).
found.reverse()

// Per-session marker: track which CLAUDE.mds the agent has already been
// told about for this transcript. Re-issuing the advisory every Edit in
// the same folder is noisy; once is enough. Markers live in working memory.
const markerDir = join(ROOT, '.gaia/memory/working')
const markerFile = join(markerDir, 'domain-context.json')

let seen: Record<string, true> = {}
try {
  if (existsSync(markerFile)) seen = JSON.parse(await readFile(markerFile, 'utf-8'))
} catch {
  // fall through with empty seen
}

const fresh = found.filter((p) => !seen[p])
if (fresh.length === 0) process.exit(0)

for (const p of fresh) seen[p] = true
try {
  await Bun.write(markerFile, JSON.stringify(seen, null, 2))
} catch {
  // best-effort — never block on marker write failure
}

const list = fresh.map((p) => `  - ${p}`).join('\n')
const targetDir = dirname(relPath) || '.'
const trail = relPath.split(sep).slice(0, -1).join(' / ') || '<root>'

console.error(
  [
    `AGENT: editing ${relPath} — folder trail: ${trail}.`,
    `Before this edit (once per session per CLAUDE.md), you must have read:`,
    list,
    `If any of these are not in your context, abort this Edit and Read them first.`,
    `These advisories are emitted once per session per file; already-read`,
    `CLAUDE.mds won't reappear.`,
  ].join('\n'),
)

void targetDir // referenced for potential future per-folder logic
process.exit(0)
