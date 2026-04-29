// scripts/measure-skill-resolution.ts — baseline measurement for Initiative 0011
//
// Falsifier instrumentation per CEO-1 of the autoplan review. Captures:
//   - cold-start TTHW (tokens read between Skill invocation and first phase output)
//   - skill-resolution round-trips per session ("which skill?" / "what does X do?" patterns)
//
// Reads Claude Code session transcripts from ~/.claude/sessions/*.jsonl
// (or whatever path the harness uses on this machine), aggregates per session,
// and writes the result to .context/skill-baseline.json or `--out <path>`.
//
// Output schema:
//   {
//     "captured_at": "2026-04-29T12:34:56Z",
//     "n_sessions": 12,
//     "tthw_tokens": { "p50": 1820, "p95": 3450, "avg": 2100 },
//     "tthw_seconds": { "p50": 28, "p95": 62, "avg": 31 },
//     "round_trips_per_session": { "avg": 3.4, "max": 8 },
//     "samples": [{ "session_id": "...", "skill": "w-debug", "tthw_tokens": 1820, ... }]
//   }
//
// Usage:
//   bun run scripts/measure-skill-resolution.ts                       # default sessions dir, default output
//   bun run scripts/measure-skill-resolution.ts --sessions <dir>      # explicit sessions dir
//   bun run scripts/measure-skill-resolution.ts --out baseline.json   # explicit output path
//
// Pre-rename: run on `master` to capture baseline.
// Post-rename: run on `skills-committee` after merge to capture new state.
// PR 5 of Initiative 0011 compares the two and writes the verdict to the falsifier.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

type Sample = {
  session_id: string
  skill: string | null
  tthw_tokens: number | null
  tthw_seconds: number | null
  round_trips: number
}

const args = process.argv.slice(2)
function arg(flag: string, fallback: string): string {
  const i = args.indexOf(flag)
  if (i >= 0 && i + 1 < args.length) return args[i + 1] ?? fallback
  return fallback
}

const SESSIONS_DIR = arg('--sessions', join(homedir(), '.claude', 'sessions'))
const OUT_PATH = arg('--out', join(process.cwd(), '.context', 'skill-baseline.json'))

if (!existsSync(SESSIONS_DIR)) {
  console.error(`No sessions directory at ${SESSIONS_DIR} — falsifier baseline not captured.`)
  console.error('Pass --sessions <dir> to point at session transcripts.')
  process.exit(0) // graceful exit so this never blocks `bun run check`
}

const ROUND_TRIP_PATTERNS = [
  /which skill/i,
  /what does ([dwha]-\w+)/i,
  /how do I (run|invoke|use) /i,
  /what is the (right|correct) skill/i,
]

function tokenize(text: string): number {
  // Cheap proxy for token count: 1 token ≈ 4 characters of English text.
  // For exact counts use Bun.tokenizer; this estimator avoids the dependency.
  return Math.ceil(text.length / 4)
}

function processSessionFile(file: string): Sample | null {
  const content = readFileSync(file, 'utf-8')
  const lines = content.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return null

  let session_id = file.split('/').pop() ?? 'unknown'
  let skillInvocationIdx: number | null = null
  let skillName: string | null = null
  let firstPhaseIdx: number | null = null
  let invocationTime: number | null = null
  let firstPhaseTime: number | null = null
  let tokensBetween = 0
  let roundTrips = 0

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    let entry: {
      type?: string
      tool?: string
      input?: { skill?: string }
      text?: string
      ts?: string
    }
    try {
      entry = JSON.parse(raw)
    } catch {
      continue
    }

    if (entry.type === 'session_start' || (i === 0 && (entry as { id?: string }).id)) {
      session_id = (entry as { id?: string }).id ?? session_id
    }

    if (entry.tool === 'Skill' && skillInvocationIdx === null) {
      skillInvocationIdx = i
      skillName = entry.input?.skill ?? null
      invocationTime = entry.ts ? Date.parse(entry.ts) : null
    }

    if (skillInvocationIdx !== null && firstPhaseIdx === null && entry.text) {
      const text = entry.text
      // Heuristic: phase starts when the assistant says "Phase 1", "Step 1", or "## "
      if (/\b(phase|step)\s*1\b/i.test(text) || /^##\s/.test(text)) {
        firstPhaseIdx = i
        firstPhaseTime = entry.ts ? Date.parse(entry.ts) : null
      }
    }

    if (skillInvocationIdx !== null && firstPhaseIdx === null && entry.text) {
      tokensBetween += tokenize(entry.text)
    }

    if (entry.text) {
      for (const pat of ROUND_TRIP_PATTERNS) {
        if (pat.test(entry.text)) {
          roundTrips++
          break
        }
      }
    }
  }

  return {
    session_id,
    skill: skillName,
    tthw_tokens: skillInvocationIdx !== null && firstPhaseIdx !== null ? tokensBetween : null,
    tthw_seconds:
      invocationTime !== null && firstPhaseTime !== null
        ? Math.round((firstPhaseTime - invocationTime) / 1000)
        : null,
    round_trips: roundTrips,
  }
}

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx] ?? 0
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round(sum / values.length)
}

const samples: Sample[] = []
for (const entry of readdirSync(SESSIONS_DIR)) {
  if (!entry.endsWith('.jsonl')) continue
  const result = processSessionFile(join(SESSIONS_DIR, entry))
  if (result) samples.push(result)
}

const tthwTokens = samples.map((s) => s.tthw_tokens).filter((v): v is number => v !== null)
const tthwSeconds = samples.map((s) => s.tthw_seconds).filter((v): v is number => v !== null)
const roundTrips = samples.map((s) => s.round_trips)

const report = {
  captured_at: new Date().toISOString(),
  n_sessions: samples.length,
  tthw_tokens: {
    p50: pct(tthwTokens, 0.5),
    p95: pct(tthwTokens, 0.95),
    avg: avg(tthwTokens),
  },
  tthw_seconds: {
    p50: pct(tthwSeconds, 0.5),
    p95: pct(tthwSeconds, 0.95),
    avg: avg(tthwSeconds),
  },
  round_trips_per_session: {
    avg: avg(roundTrips),
    max: roundTrips.length ? Math.max(...roundTrips) : 0,
  },
  samples: samples.slice(0, 50),
}

mkdirSync(dirname(OUT_PATH), { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(report, null, 2))
console.log(
  `Wrote ${OUT_PATH}: ${samples.length} sessions, TTHW avg ${report.tthw_tokens.avg} tokens (${report.tthw_seconds.avg}s)`,
)
