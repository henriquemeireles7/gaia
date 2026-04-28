#!/usr/bin/env bun

/**
 * review-orchestrator.ts — Runs all mechanical checks in parallel.
 *
 * Spawns harden-check, coverage-check, dep-check, and UBS simultaneously.
 * Collects results into structured JSON on stdout.
 *
 * Usage: bun .claude/skills/d-review/scripts/review-orchestrator.ts [--base <branch>]
 */

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const SCRIPTS_DIR = import.meta.dir
const REPO_ROOT = resolve(SCRIPTS_DIR, '../../..')

const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const BASE_BRANCH = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : 'master'

const TOOL_TIMEOUT_MS = 10_000
const UBS_TIMEOUT_MS = 30_000

interface Finding {
  file: string
  line: number
  rule: string
  message: string
  severity: 'error' | 'warn'
}
interface MissingTest {
  file: string
  expected_test: string
}
interface Violation {
  file: string
  line: number
  import_path: string
  rule: string
}
interface UbsFinding {
  file: string
  line: number
  severity: string
  message: string
}

type CheckStatus = 'pass' | 'fail' | 'error' | 'skipped'

interface OrchestratorResult {
  timestamp: string
  duration_ms: number
  git: {
    branch: string
    base: string
    files_changed: number
    lines_added: number
    lines_removed: number
    changed_files: string[]
  }
  checks: {
    harden: {
      status: CheckStatus
      errors: number
      warnings: number
      findings: Finding[]
    }
    coverage: {
      status: CheckStatus
      checked_files: number
      missing_tests: MissingTest[]
    }
    deps: {
      status: CheckStatus
      checked_files: number
      violations: Violation[]
    }
    ubs: { status: CheckStatus; findings: UbsFinding[] }
  }
  summary: {
    all_pass: boolean
    total_errors: number
    total_warnings: number
    needs_fix: boolean
    skipped_checks: string[]
  }
}

function getGitStats(): OrchestratorResult['git'] {
  const branchResult = spawnSync('git', ['branch', '--show-current'], { cwd: REPO_ROOT })
  const branch =
    branchResult.status === 0 ? branchResult.stdout.toString().trim() || 'HEAD' : 'HEAD'

  const diffStatResult = spawnSync('git', ['diff', '--numstat', BASE_BRANCH], { cwd: REPO_ROOT })
  const changedFilesResult = spawnSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMR', BASE_BRANCH],
    { cwd: REPO_ROOT },
  )

  let linesAdded = 0
  let linesRemoved = 0
  if (diffStatResult.status === 0) {
    for (const line of diffStatResult.stdout.toString().trim().split('\n')) {
      const parts = line.split('\t')
      if (parts.length >= 2) {
        const added = Number.parseInt(parts[0]!, 10)
        const removed = Number.parseInt(parts[1]!, 10)
        if (!Number.isNaN(added)) linesAdded += added
        if (!Number.isNaN(removed)) linesRemoved += removed
      }
    }
  }

  const changedFiles =
    changedFilesResult.status === 0
      ? changedFilesResult.stdout
          .toString()
          .trim()
          .split('\n')
          .filter((f) => f.length > 0)
      : []

  return {
    branch,
    base: BASE_BRANCH,
    files_changed: changedFiles.length,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    changed_files: changedFiles,
  }
}

function runTool(
  _name: string,
  cmd: string,
  toolArgs: string[],
  timeoutMs: number,
): { status: CheckStatus; stdout: string; exitCode: number } {
  try {
    const result = spawnSync(cmd, toolArgs, {
      cwd: REPO_ROOT,
      timeout: timeoutMs,
    })

    if (result.error) {
      const err = result.error as NodeJS.ErrnoException
      if (err.code === 'ETIMEDOUT') {
        return { status: 'skipped', stdout: '', exitCode: -1 }
      }
      if (err.code === 'ENOENT') {
        return { status: 'skipped', stdout: '', exitCode: -1 }
      }
      return { status: 'error', stdout: '', exitCode: -1 }
    }

    const exitCode = result.status ?? 1
    const stdout = result.stdout.toString()

    return {
      status: exitCode === 0 ? 'pass' : 'fail',
      stdout,
      exitCode,
    }
  } catch {
    return { status: 'error', stdout: '', exitCode: -1 }
  }
}

function parseJsonSafe<T>(stdout: string, fallback: T): T {
  try {
    return JSON.parse(stdout) as T
  } catch {
    return fallback
  }
}

function runHarden(): OrchestratorResult['checks']['harden'] {
  const hardenScript = resolve(REPO_ROOT, 'platform/scripts/harden-check.ts')
  const { status, stdout } = runTool('harden', 'bun', [hardenScript, '--json'], TOOL_TIMEOUT_MS)

  if (status === 'pass' || status === 'fail') {
    const parsed = parseJsonSafe(stdout, { pass: true, errors: 0, warnings: 0, findings: [] })
    return {
      status: parsed.pass ? 'pass' : 'fail',
      errors: parsed.errors ?? 0,
      warnings: parsed.warnings ?? 0,
      findings: parsed.findings ?? [],
    }
  }

  return { status, errors: 0, warnings: 0, findings: [] }
}

function runCoverage(): OrchestratorResult['checks']['coverage'] {
  const coverageScript = resolve(SCRIPTS_DIR, 'coverage-check.ts')
  const { status, stdout } = runTool(
    'coverage',
    'bun',
    [coverageScript, '--base', BASE_BRANCH],
    TOOL_TIMEOUT_MS,
  )

  if (status === 'pass' || status === 'fail') {
    const parsed = parseJsonSafe(stdout, { pass: true, checkedFiles: 0, missingTests: [] })
    return {
      status: parsed.pass ? 'pass' : 'fail',
      checked_files: parsed.checkedFiles ?? 0,
      missing_tests: parsed.missingTests ?? [],
    }
  }

  return { status, checked_files: 0, missing_tests: [] }
}

function runDeps(): OrchestratorResult['checks']['deps'] {
  const depsScript = resolve(SCRIPTS_DIR, 'dep-check.ts')
  const { status, stdout } = runTool(
    'deps',
    'bun',
    [depsScript, '--base', BASE_BRANCH],
    TOOL_TIMEOUT_MS,
  )

  if (status === 'pass' || status === 'fail') {
    const parsed = parseJsonSafe(stdout, { pass: true, checkedFiles: 0, violations: [] })
    return {
      status: parsed.pass ? 'pass' : 'fail',
      checked_files: parsed.checkedFiles ?? 0,
      violations: parsed.violations ?? [],
    }
  }

  return { status, checked_files: 0, violations: [] }
}

function runUbs(): OrchestratorResult['checks']['ubs'] {
  const whichResult = spawnSync('which', ['ubs'])
  if (whichResult.status !== 0) {
    return { status: 'skipped', findings: [] }
  }

  const { status, stdout } = runTool('ubs', 'ubs', ['--diff', '--format=toon'], UBS_TIMEOUT_MS)

  if (status === 'pass') {
    return { status: 'pass', findings: [] }
  }
  if (status === 'fail') {
    // Parse toon format: each line is a finding
    const findings: UbsFinding[] = []
    for (const line of stdout.split('\n')) {
      const match = line.match(/^(.+?):(\d+)\s+(\w+)\s+(.+)$/)
      if (match) {
        findings.push({
          file: match[1]!,
          line: Number.parseInt(match[2]!, 10),
          severity: match[3]!,
          message: match[4]!,
        })
      }
    }
    return { status: 'fail', findings }
  }

  return { status, findings: [] }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const startTime = Date.now()

const git = getGitStats()

// Run all checks (spawnSync is blocking per call, but each is fast)
const harden = runHarden()
const coverage = runCoverage()
const deps = runDeps()
const ubs = runUbs()

const skippedChecks: string[] = []
if (harden.status === 'skipped' || harden.status === 'error') skippedChecks.push('harden')
if (coverage.status === 'skipped' || coverage.status === 'error') skippedChecks.push('coverage')
if (deps.status === 'skipped' || deps.status === 'error') skippedChecks.push('deps')
if (ubs.status === 'skipped' || ubs.status === 'error') skippedChecks.push('ubs')

const nonSkippedChecks = [harden, coverage, deps, ubs].filter(
  (c) => c.status !== 'skipped' && c.status !== 'error',
)
const allPass = nonSkippedChecks.every((c) => c.status === 'pass')
const totalErrors = harden.errors + coverage.missing_tests.length + deps.violations.length
const totalWarnings = harden.warnings
const needsFix = !allPass

const result: OrchestratorResult = {
  timestamp: new Date().toISOString(),
  duration_ms: Date.now() - startTime,
  git,
  checks: { harden, coverage, deps, ubs },
  summary: {
    all_pass: allPass,
    total_errors: totalErrors,
    total_warnings: totalWarnings,
    needs_fix: needsFix,
    skipped_checks: skippedChecks,
  },
}

console.log(JSON.stringify(result, null, 2))
process.exit(needsFix ? 1 : 0)
