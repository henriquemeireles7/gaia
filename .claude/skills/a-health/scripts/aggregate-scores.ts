// .claude/skills/a-health/scripts/aggregate-scores.ts — Phase 3 synthesizer
//
// Read sibling a-* audit reports + Phase 1 mechanical outputs, compute the
// 12-axis vector, weighted composite, trend vs prior decisions/health.md,
// and emit the canonical health report (a-health/reference.md §Output).
//
// Usage:
//   bun .claude/skills/a-health/scripts/aggregate-scores.ts \
//     [--audits-dir .gaia/audits] \
//     [--prior decisions/health.md] \
//     [--stamp .gaia/audits/a-health/.stamp] \
//     [--out decisions/health.md] \
//     [--print]
//
// Sub-audit failure handling: missing or unparseable sibling report → axis
// score = null with status 'n/a' (a-health/reference.md §8). Audit completes.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'

type Severity = 'critical' | 'high' | 'medium' | 'low'
type AxisStatus = 'computed' | 'skipped' | 'n/a' | 'error'
type Axis =
  | 'security'
  | 'performance'
  | 'agent-x'
  | 'ux'
  | 'dx'
  | 'observability'
  | 'ai'
  | 'coherence'
  | 'dead'
  | 'test'
  | 'duplication'
  | 'architecture'
  | 'dependencies'

type AxisResult = {
  score: number | null
  findings: number
  critical: number
  status: AxisStatus
  notes: string
}

const AXIS_WEIGHTS: Record<Axis, number> = {
  security: 0.18,
  performance: 0.1,
  'agent-x': 0.05,
  ux: 0.05,
  dx: 0.05,
  observability: 0.07,
  ai: 0.05,
  coherence: 0.1,
  dead: 0.1,
  test: 0.1,
  duplication: 0.05,
  architecture: 0.05,
  dependencies: 0.05,
}

const AUDIT_AXIS_MAP: Record<string, Axis> = {
  'a-security': 'security',
  'a-perf': 'performance',
  'a-ax': 'agent-x',
  'a-ux': 'ux',
  'a-dx': 'dx',
  'a-observability': 'observability',
  'a-ai': 'ai',
}

// ─── args ────────────────────────────────────────────────────────────────
type Args = {
  auditsDir: string
  priorPath: string
  stampPath: string
  outPath: string
  print: boolean
}
function parseArgs(): Args {
  const a = process.argv.slice(2)
  const args: Args = {
    auditsDir: '.gaia/audits',
    priorPath: 'decisions/health.md',
    stampPath: '.gaia/audits/a-health/.stamp',
    outPath: 'decisions/health.md',
    print: false,
  }
  for (let i = 0; i < a.length; i++) {
    const k = a[i]
    if (k === '--audits-dir') args.auditsDir = a[++i] ?? args.auditsDir
    else if (k === '--prior') args.priorPath = a[++i] ?? args.priorPath
    else if (k === '--stamp') args.stampPath = a[++i] ?? args.stampPath
    else if (k === '--out') args.outPath = a[++i] ?? args.outPath
    else if (k === '--print') args.print = true
  }
  return args
}

// ─── helpers ─────────────────────────────────────────────────────────────
function safeRun(cmd: string, args: readonly string[]): { stdout: string; ok: boolean } {
  const res = spawnSync(cmd, args, { encoding: 'utf-8', timeout: 15_000 })
  return {
    stdout: (res.stdout || '').trim(),
    ok: !res.error && res.status === 0,
  }
}

function readMaybe(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function latestReport(skillDir: string): string | null {
  if (!existsSync(skillDir)) return null
  const dated = readdirSync(skillDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f))
    .sort()
  return dated.length ? join(skillDir, dated[dated.length - 1] as string) : null
}

const SEVERITY_RE = /\b(critical|high|medium|low)\b/gi

function severityCounts(md: string): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const m of md.matchAll(SEVERITY_RE)) {
    const k = (m[1] || '').toLowerCase() as Severity
    if (k in counts) counts[k]++
  }
  return counts
}

function axisFromSeverity(c: Record<Severity, number>): { score: number; findings: number } {
  const findings = c.critical + c.high + c.medium + c.low
  const raw = 10 - (c.critical * 3 + c.high * 1.5 + c.medium * 0.5 + c.low * 0.1)
  return { score: Math.max(0, Math.min(10, +raw.toFixed(2))), findings }
}

// ─── axis computation: sibling audits ────────────────────────────────────
function siblingAxis(auditsDir: string, skill: string): AxisResult {
  const dir = join(auditsDir, skill)
  const path = latestReport(dir)
  if (!path) {
    return { score: null, findings: 0, critical: 0, status: 'n/a', notes: 'no audit report yet' }
  }
  const md = readMaybe(path)
  if (!md) {
    return { score: null, findings: 0, critical: 0, status: 'error', notes: `unreadable ${path}` }
  }
  const counts = severityCounts(md)
  const { score, findings } = axisFromSeverity(counts)
  return {
    score,
    findings,
    critical: counts.critical,
    status: 'computed',
    notes: `from ${path.replace(`${auditsDir}/`, '')}`,
  }
}

// ─── mechanical axes: coherence, dead, test, duplication, architecture, deps
function axisCoherence(): AxisResult {
  const cov = safeRun('bun', ['run', 'rules:coverage'])
  const text = cov.stdout
  const pendingMatch = text.match(/(\d+)\s+pending/i)
  const orphansMatch = text.match(/(\d+)\s+(?:orphan|missing)/i)
  const pending = pendingMatch ? Number(pendingMatch[1]) : 0
  const orphans = orphansMatch ? Number(orphansMatch[1]) : 0
  const findings = pending + orphans
  const score = Math.max(0, +(10 - findings * 0.3).toFixed(2))
  return {
    score,
    findings,
    critical: orphans,
    status: 'computed',
    notes: `${pending} pending, ${orphans} orphan/missing`,
  }
}

function axisDead(): AxisResult {
  const r = safeRun('bun', ['run', 'check:dead', '--reporter', 'compact'])
  const lines = r.stdout.split('\n').filter((l) => /^[a-z]/i.test(l))
  const findings = Math.max(0, lines.length - 2)
  const score = Math.max(0, +(10 - findings * 0.3).toFixed(2))
  return {
    score,
    findings,
    critical: 0,
    status: 'computed',
    notes: `knip: ~${findings} unused symbols/files`,
  }
}

function axisTest(): AxisResult {
  const r = safeRun('bun', ['scripts/check-tests-exist.ts'])
  const missing = r.ok ? 0 : (r.stdout.match(/missing/gi) ?? []).length
  const score = r.ok ? 10 : Math.max(0, +(10 - missing * 0.3).toFixed(2))
  return {
    score,
    findings: missing,
    critical: r.ok ? 0 : Math.max(1, missing),
    status: 'computed',
    notes: r.ok ? 'all tests colocated' : `${missing} files missing tests`,
  }
}

function axisDuplication(): AxisResult {
  const r = safeRun('bun', ['.claude/skills/a-health/scripts/check-duplication.ts'])
  try {
    const j = JSON.parse(r.stdout) as { cloneCount: number }
    const findings = j.cloneCount ?? 0
    const score = Math.max(0, +(10 - findings * 0.2).toFixed(2))
    return {
      score,
      findings,
      critical: 0,
      status: 'computed',
      notes: `${findings} clones (≥3 files × ≥5 lines)`,
    }
  } catch {
    return {
      score: null,
      findings: 0,
      critical: 0,
      status: 'error',
      notes: 'duplication check failed',
    }
  }
}

function axisArchitecture(): AxisResult {
  const r = safeRun('bun', ['run', 'check:ast'])
  const violations = r.ok ? 0 : (r.stdout.match(/error|violation/gi) ?? []).length
  const score = r.ok ? 10 : Math.max(0, +(10 - violations * 0.5).toFixed(2))
  return {
    score,
    findings: violations,
    critical: r.ok ? 0 : violations,
    status: 'computed',
    notes: r.ok ? 'ast-grep clean' : `${violations} violations`,
  }
}

function axisDependencies(): AxisResult {
  const r = safeRun('bun', ['outdated'])
  const lines = r.stdout.split('\n').filter((l) => l.includes('|'))
  const findings = Math.max(0, lines.length - 2)
  const score = Math.max(0, +(10 - findings * 0.1).toFixed(2))
  return {
    score,
    findings,
    critical: 0,
    status: 'computed',
    notes: `~${findings} packages outdated`,
  }
}

// ─── compose ─────────────────────────────────────────────────────────────
function build(args: Args): {
  vector: Record<Axis, AxisResult>
  composite: number
  computedCount: number
} {
  const v: Record<Axis, AxisResult> = {} as Record<Axis, AxisResult>
  for (const [skill, axis] of Object.entries(AUDIT_AXIS_MAP)) {
    v[axis] = siblingAxis(args.auditsDir, skill)
  }
  v.coherence = axisCoherence()
  v.dead = axisDead()
  v.test = axisTest()
  v.duplication = axisDuplication()
  v.architecture = axisArchitecture()
  v.dependencies = axisDependencies()

  let totalWeight = 0
  let weighted = 0
  let computedCount = 0
  for (const axis of Object.keys(AXIS_WEIGHTS) as Axis[]) {
    const r = v[axis]
    if (!r || r.score == null) continue
    weighted += AXIS_WEIGHTS[axis] * r.score
    totalWeight += AXIS_WEIGHTS[axis]
    computedCount++
  }
  const composite = totalWeight > 0 ? +(weighted / totalWeight).toFixed(2) : 0
  return { vector: v, composite, computedCount }
}

// ─── report ──────────────────────────────────────────────────────────────
function fmtScore(r: AxisResult): string {
  if (r.score == null) return r.status === 'n/a' ? 'n/a' : 'error'
  return r.score.toFixed(1)
}

function buildHistoryRow(date: string, composite: number, vec: Record<Axis, AxisResult>): string {
  const order: Axis[] = [
    'security',
    'performance',
    'agent-x',
    'ux',
    'dx',
    'observability',
    'ai',
    'coherence',
    'dead',
    'test',
    'duplication',
    'architecture',
    'dependencies',
  ]
  const cells = order.map((a) => {
    const r = vec[a]
    return r?.score == null ? 'n/a' : r.score.toFixed(1)
  })
  return `| ${date} | ${composite.toFixed(1)} | ${cells.join(' | ')} |`
}

function preserveHistory(prior: string, newRow: string): string {
  const idx = prior.indexOf('## Audit History')
  if (idx < 0) {
    return [
      '',
      '## Audit History',
      '',
      '| Date | Composite | Sec | Perf | Agent-X | UX | DX | Obs | AI | Coh | Dead | Test | Dup | Arch | Deps |',
      '| ---- | --------- | --- | ---- | ------- | -- | -- | --- | -- | --- | ---- | ---- | --- | ---- | ---- |',
      newRow,
    ].join('\n')
  }
  const tail = prior.slice(idx)
  const headerEnd = tail.indexOf('|')
  const head = tail.slice(0, headerEnd)
  const tableLines = tail
    .slice(headerEnd)
    .split('\n')
    .filter((l) => l.startsWith('|'))
  const [headerRow, sepRow, ...rest] = tableLines
  return ['', '## Audit History', head.trim(), '', headerRow, sepRow, newRow, ...rest].join('\n')
}

function trendDirection(
  args: Args,
  composite: number,
  vector: Record<Axis, AxisResult>,
): {
  delta: number | null
  direction: string
  priorDate: string
} {
  const vec: Record<string, number | null> = {}
  for (const [axis, r] of Object.entries(vector)) vec[axis] = r.score
  const r = safeRun('bun', [
    '.claude/skills/a-health/scripts/trend.ts',
    '--current',
    JSON.stringify({ composite, vector: vec }),
    '--prior',
    args.priorPath,
  ])
  if (!r.stdout) return { delta: null, direction: 'first-run', priorDate: '' }
  try {
    const j = JSON.parse(r.stdout) as {
      direction: string
      deltaComposite?: number
      priorDate?: string
    }
    return {
      delta: j.deltaComposite ?? null,
      direction: j.direction,
      priorDate: j.priorDate ?? '',
    }
  } catch {
    return { delta: null, direction: 'first-run', priorDate: '' }
  }
}

function loadStamp(path: string): string {
  const raw = readMaybe(path)
  if (!raw) return ''
  try {
    const j = JSON.parse(raw) as {
      git?: { sha?: string }
      tools?: { bun?: string; oxlint?: string; knip?: string; tsc?: string }
    }
    const sha = j.git?.sha ?? '?'
    const t = j.tools ?? {}
    return `${sha} · bun ${t.bun ?? '?'} · oxlint ${t.oxlint ?? '?'} · knip ${t.knip ?? '?'} · tsc ${t.tsc ?? '?'}`
  } catch {
    return ''
  }
}

function buildReport(
  args: Args,
  date: string,
  composite: number,
  vector: Record<Axis, AxisResult>,
  trend: { delta: number | null; direction: string; priorDate: string },
  stamp: string,
  prior: string,
  worstFilesJson: string,
): string {
  const order: Axis[] = [
    'security',
    'performance',
    'agent-x',
    'ux',
    'dx',
    'observability',
    'ai',
    'coherence',
    'dead',
    'test',
    'duplication',
    'architecture',
    'dependencies',
  ]
  const vectorRows = order
    .map(
      (a) =>
        `| ${a} | ${fmtScore(vector[a])} | ${vector[a].findings} | ${vector[a].critical} | ${vector[a].status}${vector[a].notes ? ` — ${vector[a].notes}` : ''} |`,
    )
    .join('\n')

  let worstFilesTable = '| File | Sessions | Score | Tag |\n| ---- | -------- | ----- | --- |\n'
  try {
    const j = JSON.parse(worstFilesJson) as Array<{
      file: string
      sessions: number
      weightedScore: number
      tag: string
    }>
    worstFilesTable += j
      .slice(0, 5)
      .map((f) => `| ${f.file} | ${f.sessions} | ${f.weightedScore.toFixed(1)} | ${f.tag} |`)
      .join('\n')
    if (j.length === 0) worstFilesTable += '| _no findings yet_ | 0 | 0.0 | |'
  } catch {
    worstFilesTable += '| _worst-files report unavailable_ | 0 | 0.0 | |'
  }

  const trendLine =
    trend.delta == null
      ? `> Trend: first-run (no prior audit found at ${args.priorPath})`
      : `> Trend: ${trend.direction} (${trend.delta >= 0 ? '+' : ''}${trend.delta} vs ${trend.priorDate})`

  const newRow = buildHistoryRow(date, composite, vector)
  const history = preserveHistory(prior, newRow)

  return [
    '# Codebase Health Report',
    '',
    `> Last audit: ${date}`,
    `> Composite score: ${composite.toFixed(1)}/10`,
    trendLine,
    stamp ? `> Stamp: ${stamp}` : '> Stamp: (no .stamp captured)',
    '',
    '## Vector',
    '',
    '| Axis | Score | Findings | Critical | Notes |',
    '| ---- | ----- | -------- | -------- | ----- |',
    vectorRows,
    '',
    '## Top 5 worst files (cross-audit)',
    '',
    worstFilesTable,
    '',
    '## Fix plan',
    '',
    '> P0 = security/data integrity / red `bun run check`. P1 = systemic-debt files, coverage drift past SLO. P2 = arch drift, dep updates. P3 = polish.',
    '',
    '### P0 — Fix now',
    '',
    '_(populated by w-review when consuming this report)_',
    '',
    '### P1 — Fix this week',
    '',
    '_(per-axis findings rolled up from sibling audits)_',
    '',
    '### P2 — Fix this month',
    '',
    '### P3 — Track',
    '',
    '## Detailed findings (per axis)',
    '',
    order.map((a) => `### ${a}\n\n${vector[a].notes || '_no findings_'}`).join('\n\n'),
    history,
    '',
  ].join('\n')
}

// ─── main ────────────────────────────────────────────────────────────────
function main(): void {
  const args = parseArgs()
  const date = new Date().toISOString().slice(0, 10)
  const stamp = loadStamp(args.stampPath)
  const prior = readMaybe(args.priorPath)
  const { vector, composite, computedCount } = build(args)
  const trend = trendDirection(args, composite, vector)

  const worstFiles = safeRun('bun', ['.claude/skills/a-health/scripts/worst-files.ts'])
  const report = buildReport(args, date, composite, vector, trend, stamp, prior, worstFiles.stdout)

  if (args.print) {
    process.stdout.write(report)
    return
  }

  mkdirSync(dirname(args.outPath), { recursive: true })
  writeFileSync(args.outPath, report)

  // also drop a snapshot under .gaia/audits/a-health/<date>.md
  const snapDir = '.gaia/audits/a-health'
  mkdirSync(snapDir, { recursive: true })
  writeFileSync(join(snapDir, `${date}.md`), report)

  process.stdout.write(
    `${JSON.stringify({ date, composite, computedAxes: computedCount, out: args.outPath }, null, 2)}\n`,
  )
}

main()
