import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { updateClaudeMd } from './lib/update-claude-md'

const input = await Bun.stdin.json()

// Prevent infinite loops
if (input.stop_hook_active) {
  process.exit(0)
}

// Dynamic cwd: hooks live in .claude/hooks/, project root is two levels up
const cwd = resolve(import.meta.dir, '../..')

// Get changed files from git
const gitDiff = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACM'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const changedFiles = [
  ...(gitDiff.stdout?.toString().trim() || '').split('\n'),
  ...(untracked.stdout?.toString().trim() || '').split('\n'),
]
  .filter(Boolean)
  .filter((f) => /\.(ts|tsx|js|jsx|mdx|md)$/.test(f))
  .filter((f) => !f.endsWith('CLAUDE.md')) // Don't trigger on CLAUDE.md changes

if (changedFiles.length === 0) {
  process.exit(0)
}

// Extract unique directories (skip root — root CLAUDE.md is the master instructions file)
const dirs = [...new Set(changedFiles.map((f) => dirname(f)))].filter((d) => d !== '.')

// Update CLAUDE.md for each directory that has one
let updated = 0
for (const dir of dirs) {
  const fullDir = join(cwd, dir)
  if (existsSync(join(fullDir, 'CLAUDE.md'))) {
    if (updateClaudeMd(fullDir)) {
      updated++
    }
  }
}

if (updated > 0) {
  console.log(`Updated ${updated} context file(s).`)
}

process.exit(0)
