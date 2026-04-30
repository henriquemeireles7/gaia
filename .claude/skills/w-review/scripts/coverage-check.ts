#!/usr/bin/env bun

/**
 * coverage-check.ts — Checks that every .ts file has a corresponding .test.ts file.
 *
 * Excludes: .test.ts, .d.ts, CLAUDE.md files
 * Only checks changed files from git diff.
 *
 * Usage: bun coverage-check.ts [--base <branch>]
 * Output: JSON with missing test files
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../../..')

function getChangedFiles(base: string): string[] {
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', base], {
    cwd: repoRoot,
  })
  if (result.status !== 0) return []
  return result.stdout
    .toString()
    .trim()
    .split('\n')
    .filter((f) => f.length > 0)
}

function shouldCheck(file: string): boolean {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return false
  if (file.endsWith('.d.ts')) return false
  if (file.includes('CLAUDE.md')) return false
  // Skip config/entry files that typically don't need tests
  if (file === 'app.ts' || file === 'index.ts') return false
  return true
}

function getTestPath(file: string): string {
  const ext = file.endsWith('.tsx') ? '.tsx' : '.ts'
  const base = file.slice(0, -ext.length)
  return `${base}.test${ext}`
}

// --- Main ---
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const base = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'master'

const changedFiles = getChangedFiles(base)
const filesToCheck = changedFiles.filter(shouldCheck)

const missing: Array<{ file: string; expectedTest: string }> = []

for (const file of filesToCheck) {
  const testPath = getTestPath(file)
  const absTestPath = resolve(repoRoot, testPath)
  if (!existsSync(absTestPath)) {
    missing.push({ file, expectedTest: testPath })
  }
}

const result = {
  pass: missing.length === 0,
  checkedFiles: filesToCheck.length,
  missingTests: missing,
}

console.log(JSON.stringify(result, null, 2))
process.exit(missing.length > 0 ? 1 : 0)
