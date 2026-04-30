// .claude/skills/a-health/scripts/worst-files.ts — health/worst-file-leaderboard
//
// Walk every .gaia/audits/<sibling>/<latest>.md, parse file:line evidence,
// rank by weighted finding count. Files appearing in ≥3 distinct sub-audits
// get a `systemic` tag (a-health/reference.md §4).
//
// stdout: JSON array of { file, sessions, weightedScore, breakdown, tag }.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

type Severity = 'critical' | 'high' | 'medium' | 'low'

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3,
  high: 1.5,
  medium: 0.5,
  low: 0.1,
}

type Finding = { file: string; severity: Severity; audit: string }

const ROOT = process.cwd()
const AUDITS_DIR = join(ROOT, '.gaia', 'audits')

function latestReport(skillDir: string): string | null {
  if (!existsSync(skillDir)) return null
  const dated = readdirSync(skillDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f))
    .sort()
  return dated.length ? join(skillDir, dated[dated.length - 1]) : null
}

const FILE_LINE_RE = /(?<![a-zA-Z0-9_/.-])([\w./@-]+\.[a-z]+)(?::(\d+))?/g
const SEVERITY_TAG_RE =
  /\b(critical|high|medium|low)\b|\[(critical|high|medium|low)\]|severity:\s*(critical|high|medium|low)/i

const EXCLUDE = /(node_modules|\.git\/|dist\/|\.test\.|migrations\/|fixtures\/)/

function classifyLine(line: string): Severity {
  const m = line.match(SEVERITY_TAG_RE)
  if (!m) return 'low'
  return (m[1] ?? m[2] ?? m[3] ?? 'low').toLowerCase() as Severity
}

function parseAuditMarkdown(path: string, audit: string): Finding[] {
  let text: string
  try {
    text = readFileSync(path, 'utf-8')
  } catch {
    return []
  }
  const findings: Finding[] = []
  for (const line of text.split('\n')) {
    if (!FILE_LINE_RE.test(line)) continue
    FILE_LINE_RE.lastIndex = 0
    const severity = classifyLine(line)
    let m: RegExpExecArray | null
    while ((m = FILE_LINE_RE.exec(line))) {
      const file = m[1]
      if (EXCLUDE.test(file)) continue
      if (!file.includes('/')) continue
      findings.push({ file, severity, audit })
    }
  }
  return findings
}

function* listAuditDirs(): Generator<{ skill: string; dir: string }> {
  if (!existsSync(AUDITS_DIR)) return
  for (const name of readdirSync(AUDITS_DIR)) {
    if (name === 'a-health') continue
    const dir = join(AUDITS_DIR, name)
    try {
      if (statSync(dir).isDirectory()) yield { skill: name, dir }
    } catch {
      /* ignore */
    }
  }
}

const all: Finding[] = []
for (const { skill, dir } of listAuditDirs()) {
  const latest = latestReport(dir)
  if (!latest) continue
  all.push(...parseAuditMarkdown(latest, skill))
}

const byFile = new Map<
  string,
  { sessions: Set<string>; weighted: number; breakdown: Record<Severity, number> }
>()
for (const f of all) {
  const e = byFile.get(f.file) ?? {
    sessions: new Set<string>(),
    weighted: 0,
    breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
  }
  e.sessions.add(f.audit)
  e.weighted += SEVERITY_WEIGHT[f.severity]
  e.breakdown[f.severity]++
  byFile.set(f.file, e)
}

const ranked = [...byFile.entries()]
  .map(([file, v]) => ({
    file,
    sessions: v.sessions.size,
    weightedScore: +v.weighted.toFixed(2),
    breakdown: v.breakdown,
    sessionList: [...v.sessions].sort(),
    tag: v.sessions.size >= 3 ? 'systemic' : '',
  }))
  .sort((a, b) => b.weightedScore - a.weightedScore || b.sessions - a.sessions)
  .slice(0, 20)

process.stdout.write(`${JSON.stringify(ranked, null, 2)}\n`)
