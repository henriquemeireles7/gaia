/**
 * PreToolUse hook on Bash — intercepts `git commit` commands.
 * Runs linter + typechecker before allowing the commit.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const input = await Bun.stdin.json()
const cmd: string = input.tool_input?.command ?? ''

// Only intercept git commit commands
if (!/\bgit\s+commit\b/.test(cmd)) {
  process.exit(0)
}

const cwd = resolve(import.meta.dir, '../..')

// CUSTOMIZE: Replace with your linter command
const lint = spawnSync('bunx', ['biome', 'ci', '.'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (lint.status !== 0) {
  const output = lint.stderr?.toString() || lint.stdout?.toString() || ''
  console.error('\n  Pre-commit check FAILED: linter found violations.')
  console.error('  Fix the issues, then try again.')
  if (output.trim()) {
    const lines = output.trim().split('\n')
    for (const line of lines.slice(-8)) {
      console.error(`  ${line}`)
    }
  }
  process.exit(2)
}

// CUSTOMIZE: Replace with your typechecker command
const tsc = spawnSync('bunx', ['tsc', '--noEmit'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (tsc.status !== 0) {
  const output = tsc.stdout?.toString() || tsc.stderr?.toString() || ''
  console.error('\n  Pre-commit check FAILED: TypeScript errors found.')
  if (output.trim()) {
    const lines = output.trim().split('\n')
    for (const line of lines.slice(-8)) {
      console.error(`  ${line}`)
    }
  }
  process.exit(2)
}

process.exit(0)
