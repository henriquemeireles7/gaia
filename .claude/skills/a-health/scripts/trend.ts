// .claude/skills/a-health/scripts/trend.ts — health/trend-required
//
// Parse the ## Audit History table in the latest dated a-health report and
// emit per-axis delta vs the most recent prior row (a-health/reference.md §3).
//
// Usage:
//   bun .claude/skills/a-health/scripts/trend.ts \
//     --current '{"composite":8.5,"vector":{"security":9.2,...}}' \
//     [--prior auto]
//
// stdout: JSON { direction, deltaComposite, deltaPerAxis, priorDate, priorComposite }
// Exit codes: 0 ok, 2 no prior history (first run), 1 parse error.
//
// Defaults: --prior auto-detects the most recent dated file under
// .gaia/audits/a-health/ (excluding today's report).

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

type Vector = Record<string, number | null>
type Current = { composite: number; vector: Vector }
type PriorRow = { date: string; composite: number; vector: Vector }

const AXES = [
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
] as const

function parseArgs(): { current: Current; priorPath: string } {
  const args = process.argv.slice(2)
  let currentRaw = ''
  let priorPath = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--current') currentRaw = args[++i] ?? ''
    else if (args[i] === '--prior') priorPath = args[++i] ?? priorPath
  }
  if (!currentRaw) {
    console.error('trend: --current <json> required')
    process.exit(1)
  }
  if (!priorPath) {
    const today = new Date().toISOString().slice(0, 10)
    const healthDir = '.gaia/audits/a-health'
    if (existsSync(healthDir)) {
      const dated = readdirSync(healthDir)
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f) && f !== `${today}.md`)
        .sort()
      priorPath = dated.length ? join(healthDir, dated[dated.length - 1] as string) : ''
    }
  }
  return { current: JSON.parse(currentRaw) as Current, priorPath }
}

function parseHistoryTable(md: string): PriorRow[] {
  const idx = md.indexOf('## Audit History')
  if (idx < 0) return []
  const tail = md.slice(idx)
  const lines = tail.split('\n')
  const rows: PriorRow[] = []
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 4) continue
    const date = cells[1]
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue
    const composite = Number(cells[2])
    if (Number.isNaN(composite)) continue
    const vector: Vector = {}
    AXES.forEach((axis, i) => {
      const raw = cells[3 + i]
      const n = raw === undefined || raw === '' || raw === 'n/a' ? null : Number(raw)
      vector[axis] = Number.isFinite(n as number) ? (n as number) : null
    })
    rows.push({ date, composite, vector })
  }
  return rows
}

function direction(delta: number): 'improving' | 'stable' | 'degrading' {
  if (delta > 0.2) return 'improving'
  if (delta < -0.2) return 'degrading'
  return 'stable'
}

const { current, priorPath } = parseArgs()
if (!existsSync(priorPath)) {
  console.log(JSON.stringify({ direction: 'first-run', reason: `${priorPath} not found` }))
  process.exit(2)
}

const md = readFileSync(priorPath, 'utf-8')
const history = parseHistoryTable(md)
if (history.length === 0) {
  console.log(JSON.stringify({ direction: 'first-run', reason: 'no rows in ## Audit History' }))
  process.exit(2)
}

const prior = history[0] // most recent row first by convention; callers prepend
const deltaComposite = +(current.composite - prior.composite).toFixed(2)
const deltaPerAxis: Record<string, number | null> = {}
for (const axis of AXES) {
  const c = current.vector[axis]
  const p = prior.vector[axis]
  deltaPerAxis[axis] = c == null || p == null ? null : +(c - p).toFixed(2)
}

const output = {
  direction: direction(deltaComposite),
  deltaComposite,
  deltaPerAxis,
  priorDate: prior.date,
  priorComposite: prior.composite,
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
