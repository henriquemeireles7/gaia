// .claude/skills/a-health/scripts/quick-pulse.ts — health/continuous-pulse
//
// Stop-hook entry point. Records a one-line pulse to .gaia/audits/a-health/pulse.jsonl
// when the session touched ≥10 files (a-health/reference.md §9).
//
// Constraint: hook latency budget is <500ms (h-rules/reference.md §4). This script
// must be deterministic and fast — it does NOT run bun run check. It captures cheap
// signals (touched-file count, knip cache count if present, pending-rules count from
// rules.ts inspection) and exits. The next foreground /a-health consumes pulse.jsonl
// to compute trend between full audits.
//
// Exit codes: always 0 (advisory; hooks must not block).

import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()
const PULSE_DIR = join(ROOT, '.gaia', 'audits', 'a-health')
const PULSE_FILE = join(PULSE_DIR, 'pulse.jsonl')
const MIN_TOUCHED = 10

function safeRun(cmd: string, args: readonly string[]): string {
  const res = spawnSync(cmd, args, { encoding: 'utf-8', timeout: 1500 })
  if (res.error || res.status !== 0) return ''
  return (res.stdout || '').trim()
}

function touchedSince(ref: string): string[] {
  const diff = safeRun('git', ['diff', '--name-only', `${ref}..HEAD`])
  const wt = safeRun('git', ['diff', '--name-only'])
  const set = new Set<string>()
  for (const f of [...diff.split('\n'), ...wt.split('\n')]) {
    if (f) set.add(f)
  }
  return [...set]
}

function priorPulseRef(): string {
  if (!existsSync(PULSE_FILE)) return safeRun('git', ['merge-base', 'HEAD', 'master']) || 'HEAD'
  try {
    const lines = readFileSync(PULSE_FILE, 'utf-8').trim().split('\n').filter(Boolean)
    const last = lines[lines.length - 1]
    if (!last) return 'HEAD'
    const j = JSON.parse(last) as { sha?: string }
    return j.sha ?? 'HEAD'
  } catch {
    return 'HEAD'
  }
}

function countPendingRules(): number {
  const rulesPath = join(ROOT, '.gaia', 'rules.ts')
  if (!existsSync(rulesPath)) return -1
  try {
    const text = readFileSync(rulesPath, 'utf-8')
    return (text.match(/kind:\s*['"]pending['"]/g) ?? []).length
  } catch {
    return -1
  }
}

function main(): void {
  const ref = priorPulseRef()
  const touched = touchedSince(ref)
  if (touched.length < MIN_TOUCHED) return

  if (!existsSync(PULSE_DIR)) mkdirSync(PULSE_DIR, { recursive: true })

  const sha = safeRun('git', ['rev-parse', '--short', 'HEAD']) || 'unknown'
  const pulse = {
    ts: new Date().toISOString(),
    sha,
    touched: touched.length,
    pending: countPendingRules(),
    scope: classifyScope(touched),
  }

  appendFileSync(PULSE_FILE, `${JSON.stringify(pulse)}\n`)
}

function classifyScope(files: readonly string[]): Record<string, number> {
  const scope = {
    apps_api: 0,
    apps_web: 0,
    packages: 0,
    skills: 0,
    scripts: 0,
    other: 0,
  }
  for (const f of files) {
    if (f.startsWith('apps/api/')) scope.apps_api++
    else if (f.startsWith('apps/web/')) scope.apps_web++
    else if (f.startsWith('packages/')) scope.packages++
    else if (f.startsWith('.claude/skills/')) scope.skills++
    else if (f.startsWith('scripts/')) scope.scripts++
    else scope.other++
  }
  return scope
}

try {
  main()
} catch {
  // Hook must never throw — advisory only.
}
process.exit(0)
