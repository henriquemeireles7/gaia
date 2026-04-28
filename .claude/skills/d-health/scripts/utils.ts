/**
 * Shared utilities for d-health companion scripts.
 * All health scripts read files as text (never import from the application).
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type Finding = {
  file: string
  line: number
  severity: Severity
  category: string
  message: string
}

export type ScriptOutput<T = Record<string, unknown>> = {
  findings: Finding[]
  errors: string[]
  summary: T
}

// ─── File Discovery ───────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules',
  '.claude',
  '.venv',
  '.context',
  'dist',
  'mcp_agent_mail',
  '.git',
  '.beads',
  '.agents',
  '.codex',
])

export function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // directory doesn't exist or permission denied — skip silently
  }
  return results
}

// ─── File Reading ─────────────────────────────────────────────────────────────

export function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ─── Path Helpers ─────────────────────────────────────────────────────────────

export function getRepoRoot(): string {
  // Walk up from this script's location to find the repo root
  // Scripts live in .claude/skills/d-health/scripts/, so 4 levels up
  let dir = import.meta.dir
  for (let i = 0; i < 4; i++) {
    dir = join(dir, '..')
  }
  return dir
}

export function rel(absPath: string, root: string): string {
  return relative(root, absPath)
}

// ─── Output ───────────────────────────────────────────────────────────────────

export function outputJson<T>(result: ScriptOutput<T>): void {
  console.log(JSON.stringify(result, null, 2))
}
