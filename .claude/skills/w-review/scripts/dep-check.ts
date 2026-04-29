#!/usr/bin/env bun

/**
 * dep-check.ts — Checks dependency direction violations in changed files.
 *
 * Rules:
 *   - features/ must NOT import from other features/ folders
 *   - providers/ must NOT import from features/
 *   - platform/ must NOT import from features/
 *
 * Usage: bun dep-check.ts [--base <branch>]
 * Output: JSON with violations array
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
    .filter((f) => /\.tsx?$/.test(f))
}

interface Violation {
  file: string
  line: number
  importPath: string
  rule: string
}

function checkImports(files: string[]): Violation[] {
  const violations: Violation[] = []

  for (const file of files) {
    const result = spawnSync('rg', ['-n', 'from [\'"]', resolve(repoRoot, file)], {
      cwd: repoRoot,
    })
    if (result.status !== 0) continue

    const lines = result.stdout.toString().trim().split('\n')
    for (const line of lines) {
      const match = line.match(/^(\d+):.*from\s+['"]([^'"]+)['"]/)
      if (!match) continue

      const lineNum = Number.parseInt(match[1], 10)
      const importPath = match[2]

      // Extract the feature folder name from the file path
      const featureMatch = file.match(/^features\/([^/]+)\//)
      const isFeature = file.startsWith('features/')
      const isProvider = file.startsWith('providers/')
      const isPlatform = file.startsWith('platform/')

      // Rule 1: features/ must not import from other features/ folders
      if (isFeature && featureMatch) {
        const currentFeature = featureMatch[1]
        const importFeatureMatch = importPath.match(/(?:@\/)?features\/([^/]+)/)
        if (importFeatureMatch && importFeatureMatch[1] !== currentFeature) {
          violations.push({
            file,
            line: lineNum,
            importPath,
            rule: `features/${currentFeature} must not import from features/${importFeatureMatch[1]}`,
          })
        }
      }

      // Rule 2: providers/ must not import from features/
      if (isProvider) {
        if (/(?:@\/)?features\//.test(importPath)) {
          violations.push({
            file,
            line: lineNum,
            importPath,
            rule: 'providers/ must not import from features/',
          })
        }
      }

      // Rule 3: platform/ must not import from features/
      if (isPlatform) {
        if (/(?:@\/)?features\//.test(importPath)) {
          violations.push({
            file,
            line: lineNum,
            importPath,
            rule: 'platform/ must not import from features/',
          })
        }
      }
    }
  }

  return violations
}

// --- Main ---
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const base = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'master'

const changedFiles = getChangedFiles(base)
const violations = checkImports(changedFiles)

const result = {
  pass: violations.length === 0,
  checkedFiles: changedFiles.length,
  violations,
}

console.log(JSON.stringify(result, null, 2))
process.exit(violations.length > 0 ? 1 : 0)
