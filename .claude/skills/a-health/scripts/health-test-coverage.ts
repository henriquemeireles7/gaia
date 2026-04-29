/**
 * health-test-coverage — finds .ts files missing colocated .test.ts files.
 * Reads files as text only; never imports from the application.
 * Always exits 0.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { type Finding, getRepoRoot, outputJson, rel, type ScriptOutput, walkDir } from './utils'

type TestCoverageSummary = {
  total_files: number
  with_tests: number
  without_tests: number
  coverage_percent: number
}

function main() {
  const root = getRepoRoot()
  const dirs = ['features', 'platform', 'providers']

  // Collect all .ts source files from target directories
  const allFiles: string[] = []
  for (const dir of dirs) {
    allFiles.push(...walkDir(join(root, dir), ['.ts', '.tsx']))
  }

  // Filter to source files only
  const sourceFiles = allFiles.filter((f) => {
    const relPath = rel(f, root)
    if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) return false
    if (f.endsWith('.d.ts')) return false
    if (relPath.startsWith('platform/scripts/')) return false
    if (f.endsWith('CLAUDE.md')) return false
    return true
  })

  const findings: Finding[] = []
  let withTests = 0

  for (const file of sourceFiles) {
    // foo.ts -> foo.test.ts, foo.tsx -> foo.test.tsx
    const ext = file.endsWith('.tsx') ? '.tsx' : '.ts'
    const testFile = file.replace(new RegExp(`${ext.replace('.', '\\.')}$`), `.test${ext}`)

    if (existsSync(testFile)) {
      withTests++
    } else {
      findings.push({
        severity: 'medium',
        category: 'missing_test',
        file: rel(file, root),
        line: 0,
        message: 'No colocated .test.ts file',
      })
    }
  }

  const total = sourceFiles.length
  const without = total - withTests
  const coverage = total > 0 ? Math.round((withTests / total) * 10000) / 100 : 100

  const result: ScriptOutput<TestCoverageSummary> = {
    findings,
    errors: [],
    summary: {
      total_files: total,
      with_tests: withTests,
      without_tests: without,
      coverage_percent: coverage,
    },
  }

  outputJson(result)
}

main()
