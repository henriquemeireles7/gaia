/**
 * Architecture violation checker.
 * Detects cross-feature imports, upward dependency violations,
 * circular dependencies, and pages/ file length violations.
 * Reads files as TEXT — never imports from the application.
 */

import { dirname, join, resolve } from 'node:path'
import {
  type Finding,
  getRepoRoot,
  outputJson,
  readFileSafe,
  rel,
  type ScriptOutput,
  walkDir,
} from './utils'

type ArchitectureSummary = {
  total_imports: number
  violations: number
  cycles: number
  page_violations: number
}

const IMPORT_RE = /from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g
const SCAN_DIRS = ['features', 'platform', 'providers', 'pages']

function resolveImport(importPath: string, fromFile: string, root: string): string | null {
  if (importPath.startsWith('@/')) {
    return join(root, importPath.slice(2))
  }
  return resolve(dirname(fromFile), importPath)
}

function getSegment(relPath: string): { dir: string; sub?: string } | null {
  const parts = relPath.split('/')
  if (parts.length < 1) return null
  return { dir: parts[0], sub: parts[1] }
}

function main() {
  const root = getRepoRoot()
  const findings: Finding[] = []
  const errors: string[] = []

  // Collect all .ts/.tsx files in relevant dirs
  const files: string[] = []
  for (const dir of SCAN_DIRS) {
    files.push(...walkDir(join(root, dir), ['.ts', '.tsx']))
  }

  // Build import graph + check directional rules
  const graph = new Map<string, Set<string>>()
  let totalImports = 0
  let violations = 0

  for (const file of files) {
    const content = readFileSafe(file)
    if (!content) continue

    const relFile = rel(file, root)
    const fromSeg = getSegment(relFile)
    if (!fromSeg) continue

    const deps = new Set<string>()
    graph.set(file, deps)

    for (const match of content.matchAll(IMPORT_RE)) {
      const importPath = match[1]
      const resolved = resolveImport(importPath, file, root)
      if (!resolved) continue

      totalImports++
      const relResolved = rel(resolved, root)
      const toSeg = getSegment(relResolved)
      if (!toSeg) continue

      // Track edge for cycle detection (resolve to actual file)
      deps.add(resolved)

      // Rule: features/X must NOT import from features/Y
      if (
        fromSeg.dir === 'features' &&
        toSeg.dir === 'features' &&
        fromSeg.sub &&
        toSeg.sub &&
        fromSeg.sub !== toSeg.sub
      ) {
        violations++
        const lineNum = content.slice(0, match.index).split('\n').length
        findings.push({
          file: relFile,
          line: lineNum,
          severity: 'high',
          category: 'cross_feature',
          message: `Cross-feature import: ${relFile} imports from features/${toSeg.sub}`,
        })
      }

      // Rule: providers/ must NOT import from features/
      if (fromSeg.dir === 'providers' && toSeg.dir === 'features') {
        violations++
        const lineNum = content.slice(0, match.index).split('\n').length
        findings.push({
          file: relFile,
          line: lineNum,
          severity: 'high',
          category: 'upward_dep',
          message: `Upward dependency: providers/ imports from features/ (${relResolved})`,
        })
      }

      // Rule: platform/ must NOT import from features/
      if (fromSeg.dir === 'platform' && toSeg.dir === 'features') {
        violations++
        const lineNum = content.slice(0, match.index).split('\n').length
        findings.push({
          file: relFile,
          line: lineNum,
          severity: 'high',
          category: 'upward_dep',
          message: `Upward dependency: platform/ imports from features/ (${relResolved})`,
        })
      }
    }
  }

  // Detect circular dependencies via DFS
  let cycleCount = 0
  const MAX_CYCLES = 10
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const stackList: string[] = []

  function dfs(node: string): void {
    if (cycleCount >= MAX_CYCLES) return
    if (inStack.has(node)) {
      // Found a cycle — extract it
      const startIdx = stackList.indexOf(node)
      const cycle = stackList.slice(startIdx).map((f) => rel(f, root))
      cycle.push(rel(node, root))
      cycleCount++
      findings.push({
        file: rel(node, root),
        line: 0,
        severity: 'high',
        category: 'circular_dep',
        message: `Circular dependency: ${cycle.join(' → ')}`,
      })
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    inStack.add(node)
    stackList.push(node)

    const deps = graph.get(node)
    if (deps) {
      for (const dep of deps) {
        if (cycleCount >= MAX_CYCLES) break
        dfs(dep)
      }
    }

    inStack.delete(node)
    stackList.pop()
  }

  for (const file of graph.keys()) {
    if (cycleCount >= MAX_CYCLES) break
    if (!visited.has(file)) dfs(file)
  }

  // Check pages/ file length (max 20 lines)
  let pageViolations = 0
  const pageFiles = walkDir(join(root, 'pages'), ['.ts', '.tsx'])
  for (const file of pageFiles) {
    const content = readFileSafe(file)
    if (!content) continue
    const lineCount = content.split('\n').length
    if (lineCount > 20) {
      pageViolations++
      findings.push({
        file: rel(file, root),
        line: 0,
        severity: 'low',
        category: 'long_page',
        message: `Page file is ${lineCount} lines (max 20)`,
      })
    }
  }

  const summary: ArchitectureSummary = {
    total_imports: totalImports,
    violations,
    cycles: cycleCount,
    page_violations: pageViolations,
  }

  outputJson({ findings, errors, summary } satisfies ScriptOutput<ArchitectureSummary>)
}

main()
