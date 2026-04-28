import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const input = await Bun.stdin.json()

// Prevent infinite loops when Stop hook triggers another Stop
if (input.stop_hook_active) {
  process.exit(0)
}

const cwd = resolve(import.meta.dir, '../..')

// Check if there are any modified code files
const gitResult = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACM'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const untrackedResult = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

// CUSTOMIZE: Add your source file extensions
const codeExtensions = /\.(ts|tsx|js|jsx|css)$/

const modifiedFiles = (gitResult.stdout?.toString().trim() || '')
  .split('\n')
  .filter((f) => codeExtensions.test(f))

const untrackedFiles = (untrackedResult.stdout?.toString().trim() || '')
  .split('\n')
  .filter((f) => codeExtensions.test(f))

const allFiles = [...new Set([...modifiedFiles, ...untrackedFiles])].filter(Boolean)

if (allFiles.length === 0) {
  process.exit(0)
}

console.log(`Running quality gate on ${allFiles.length} changed file(s)...`)

// CUSTOMIZE: Replace with your linter auto-fix command
const lintFix = spawnSync('bunx', ['biome', 'check', '--write', '--unsafe', ...allFiles], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const lintOutput = lintFix.stderr?.toString() || lintFix.stdout?.toString() || ''
if (lintOutput.trim()) {
  const lines = lintOutput.trim().split('\n')
  console.log('Lint auto-fix:', lines.slice(-3).join('\n'))
}

// CUSTOMIZE: Replace with your linter verify command
const lintVerify = spawnSync('bunx', ['biome', 'ci', ...allFiles], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let hasErrors = false

if (lintVerify.status !== 0) {
  const verifyOutput = lintVerify.stderr?.toString() || lintVerify.stdout?.toString() || ''
  if (verifyOutput.trim()) {
    const lines = verifyOutput.trim().split('\n')
    console.log('\n  Lint check FAILED (unfixable violations):')
    for (const line of lines.slice(-10)) {
      console.log(`  ${line}`)
    }
  }
  hasErrors = true
}

// CUSTOMIZE: Replace with your typechecker command
const tscResult = spawnSync('bunx', ['tsc', '--noEmit'], {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
})

const tscOutput = tscResult.stdout?.toString() || tscResult.stderr?.toString() || ''
if (tscResult.status !== 0) {
  hasErrors = true
  if (tscOutput.trim()) {
    const lines = tscOutput.trim().split('\n')
    console.log('\n  TypeScript errors:')
    for (const line of lines.slice(-5)) {
      console.log(`  ${line}`)
    }
  }
}

if (hasErrors) {
  console.log('\n  Quality gate FAILED — fix errors before committing.')
  process.exit(2)
}

process.exit(0)
