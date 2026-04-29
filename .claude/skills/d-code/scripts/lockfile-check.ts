#!/usr/bin/env bun

/**
 * lockfile-check.ts — Checks if package.json changed but bun.lock didn't.
 *
 * This catches the exact bug that broke the Railway build on 2026-04-08:
 * package.json was modified (new deps) but bun.lock wasn't committed,
 * causing `bun install` in Dockerfile to use stale lockfile.
 *
 * Usage: bun lockfile-check.ts [--base <branch>]
 * Output: JSON with pass/fail and message
 */

import { spawnSync } from 'node:child_process'
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

// --- Main ---
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const base = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'master'

const changedFiles = getChangedFiles(base)

const packageJsonChanged = changedFiles.includes('package.json')
const lockfileChanged = changedFiles.includes('bun.lock') || changedFiles.includes('bun.lockb')

let pass = true
let message = 'No lockfile issues detected.'

if (packageJsonChanged && !lockfileChanged) {
  pass = false
  message =
    'package.json was modified but bun.lock was not updated. ' +
    'Run `bun install` to regenerate the lockfile, then commit bun.lock. ' +
    'This prevents broken builds where Docker uses a stale lockfile.'
}

if (!packageJsonChanged && lockfileChanged) {
  // Not an error, but worth noting
  message = 'bun.lock changed without package.json changes — likely a dependency resolution update.'
}

const result = {
  pass,
  packageJsonChanged,
  lockfileChanged,
  message,
}

console.log(JSON.stringify(result, null, 2))
process.exit(pass ? 0 : 1)
