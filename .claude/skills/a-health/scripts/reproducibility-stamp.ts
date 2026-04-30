// .claude/skills/a-health/scripts/reproducibility-stamp.ts — health/skip-intelligence
//
// Capture provenance for an a-health run so trend comparisons can degrade
// gracefully when the tool stack changes (a-health/reference.md §6).
//
// Output: JSON to stdout (also written to .gaia/audits/a-health/.stamp by
// callers that redirect). Reads no files; runs `--version` on tools.

import { spawnSync } from 'node:child_process'

type Stamp = {
  ts: string
  git: { sha: string; branch: string; dirty: boolean }
  tools: Record<string, string>
}

function run(cmd: string, args: readonly string[]): string {
  const res = spawnSync(cmd, args, { encoding: 'utf-8' })
  if (res.error || res.status !== 0) return 'unknown'
  return (res.stdout || '').trim() || 'unknown'
}

function firstLine(s: string): string {
  return s.split('\n')[0]?.trim() ?? 'unknown'
}

const stamp: Stamp = {
  ts: new Date().toISOString(),
  git: {
    sha: run('git', ['rev-parse', '--short', 'HEAD']),
    branch: run('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: run('git', ['status', '--porcelain']).length > 0,
  },
  tools: {
    bun: firstLine(run('bun', ['--version'])),
    oxlint: firstLine(run('bunx', ['oxlint', '--version'])),
    oxfmt: firstLine(run('bunx', ['oxfmt', '--version'])),
    knip: firstLine(run('bunx', ['knip', '--version'])),
    tsc: firstLine(run('bunx', ['tsc', '--version'])),
    'ast-grep': firstLine(run('bunx', ['ast-grep', '--version'])),
  },
}

process.stdout.write(`${JSON.stringify(stamp, null, 2)}\n`)
