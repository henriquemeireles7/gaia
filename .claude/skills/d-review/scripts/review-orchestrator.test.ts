import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const SCRIPT = join(import.meta.dir, 'review-orchestrator.ts')
const REPO_ROOT = join(import.meta.dir, '../../..')

function run(args: string[] = []) {
  const result = spawnSync('bun', [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    timeout: 60_000,
  })
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.status ?? 1,
  }
}

function parseOutput(args: string[] = []) {
  const { stdout } = run(args)
  return JSON.parse(stdout)
}

describe('review-orchestrator', () => {
  it('produces valid JSON with correct top-level structure', () => {
    const output = parseOutput()
    expect(output).toHaveProperty('timestamp')
    expect(output).toHaveProperty('duration_ms')
    expect(output).toHaveProperty('git')
    expect(output).toHaveProperty('checks')
    expect(output).toHaveProperty('summary')
  })

  it('includes all four checks in output', () => {
    const output = parseOutput()
    expect(output.checks).toHaveProperty('harden')
    expect(output.checks).toHaveProperty('coverage')
    expect(output.checks).toHaveProperty('deps')
    expect(output.checks).toHaveProperty('ubs')
  })

  it('each check has a valid status field', () => {
    const output = parseOutput()
    const validStatuses = ['pass', 'fail', 'error', 'skipped']
    expect(validStatuses).toContain(output.checks.harden.status)
    expect(validStatuses).toContain(output.checks.coverage.status)
    expect(validStatuses).toContain(output.checks.deps.status)
    expect(validStatuses).toContain(output.checks.ubs.status)
  })

  it('git section has correct fields', () => {
    const output = parseOutput()
    expect(typeof output.git.branch).toBe('string')
    expect(typeof output.git.base).toBe('string')
    expect(typeof output.git.files_changed).toBe('number')
    expect(typeof output.git.lines_added).toBe('number')
    expect(typeof output.git.lines_removed).toBe('number')
    expect(Array.isArray(output.git.changed_files)).toBe(true)
  })

  it('summary has correct fields', () => {
    const output = parseOutput()
    expect(typeof output.summary.all_pass).toBe('boolean')
    expect(typeof output.summary.total_errors).toBe('number')
    expect(typeof output.summary.total_warnings).toBe('number')
    expect(typeof output.summary.needs_fix).toBe('boolean')
    expect(Array.isArray(output.summary.skipped_checks)).toBe(true)
  })

  it('harden check findings have correct shape when present', () => {
    const output = parseOutput()
    if (output.checks.harden.findings.length > 0) {
      const finding = output.checks.harden.findings[0]
      expect(finding).toHaveProperty('file')
      expect(finding).toHaveProperty('line')
      expect(finding).toHaveProperty('rule')
      expect(finding).toHaveProperty('message')
      expect(finding).toHaveProperty('severity')
    }
  })

  it('respects --base flag for branch comparison', () => {
    const output = parseOutput(['--base', 'master'])
    expect(output.git.base).toBe('master')
  })

  it('handles detached HEAD gracefully', () => {
    // The branch field should be a non-empty string even in edge cases
    const output = parseOutput()
    expect(output.git.branch.length).toBeGreaterThan(0)
  })

  it('ubs is skipped when not installed (or reports findings)', () => {
    const output = parseOutput()
    // UBS may or may not be installed. Either status is valid.
    const validUbsStatuses = ['pass', 'fail', 'skipped']
    expect(validUbsStatuses).toContain(output.checks.ubs.status)
    if (output.checks.ubs.status === 'skipped') {
      expect(output.summary.skipped_checks).toContain('ubs')
    }
  })
})
