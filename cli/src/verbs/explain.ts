// cli/src/verbs/explain.ts — `bun gaia explain <code>` (PR 7).
//
// Looks up an error code in the catalog and prints the four fields
// (cause / fix / docs / next). Falls back gracefully on unknown codes
// (offers to file an issue per AD-AP-16 / DX H3).

import { CATALOG, findEntry, type ErrorEntry } from '../errors/catalog.ts'
import { ExitCode, type ExitCodeValue } from '../exit-codes.ts'
import { type StandardFlags } from '../flags.ts'
import { defaultStatePath, load } from '../state.ts'
import { colorize } from '../ui/banner.ts'

const ISSUES_URL = 'https://github.com/henriquemeireles7/gaia/issues/new?title=unknown+error+code'

/** @public */
export type ExplainInput = {
  code: string | undefined
  /** Free-text search — matches code, cause, fix, next. */
  search?: string | undefined
  /** Project dir — used to filter the no-arg list by recent state. */
  projectDir?: string
  flags: StandardFlags
}

/** @public */
export type ExplainResult = {
  exitCode: ExitCodeValue
  entry?: ErrorEntry
}

export function explain(input: ExplainInput): ExplainResult {
  const { code, search, flags, projectDir } = input

  // --search overrides everything else.
  if (search) {
    const needle = search.toLowerCase()
    const matches = CATALOG.filter(
      (e) =>
        e.code.toLowerCase().includes(needle) ||
        e.cause.toLowerCase().includes(needle) ||
        e.fix.toLowerCase().includes(needle),
    )
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ matches }, null, 2)}\n`)
      return { exitCode: ExitCode.OK }
    }
    if (matches.length === 0) {
      process.stderr.write(`\n${colorize('amber', '!')} No codes match "${search}".\n\n`)
      return { exitCode: ExitCode.EX_DATAERR }
    }
    process.stdout.write(formatSearchResults(matches, search))
    return { exitCode: ExitCode.OK }
  }

  // No arg → list every code grouped by namespace, filtered by recent state if available.
  if (!code) {
    const filtered = projectDir ? filterByRecentState(projectDir) : null
    const list = filtered ?? CATALOG
    if (flags.json) {
      process.stdout.write(
        `${JSON.stringify({ codes: list.map((e) => e.code), filtered: filtered !== null }, null, 2)}\n`,
      )
      return { exitCode: ExitCode.OK }
    }
    process.stdout.write(formatCatalogList(list, filtered !== null))
    return { exitCode: ExitCode.OK }
  }

  const entry = findEntry(code)
  if (!entry) {
    if (flags.json) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, error: 'unknown_code', code, issuesUrl: ISSUES_URL }, null, 2)}\n`,
      )
    } else {
      process.stderr.write(formatUnknown(code))
    }
    return { exitCode: ExitCode.EX_DATAERR }
  }

  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ ok: true, entry }, null, 2)}\n`)
  } else {
    process.stdout.write(formatEntry(entry))
  }
  return { exitCode: ExitCode.OK, entry }
}

function formatEntry(e: ErrorEntry): string {
  return [
    '',
    `${colorize('green', '▶')} ${colorize('bold', e.code)}`,
    '',
    `  ${colorize('dim', 'cause:')} ${e.cause}`,
    `  ${colorize('dim', 'fix:  ')} ${e.fix}`,
    `  ${colorize('dim', 'docs: ')} ${e.docsUrl}`,
    `  ${colorize('dim', 'next: ')} ${e.nextCommand}`,
    '',
  ].join('\n')
}

function formatUnknown(code: string): string {
  return [
    '',
    `${colorize('amber', '!')} Code ${colorize('bold', code)} isn't in the catalog.`,
    '',
    `  Want to file an issue? ${ISSUES_URL}`,
    `  Or list every code: bun gaia explain`,
    '',
  ].join('\n')
}

function formatCatalogList(list: readonly ErrorEntry[], filtered: boolean): string {
  const groups = groupByPrefix(list)
  const headline = filtered
    ? `Gaia error catalog — codes for your current phase (${list.length} of ${CATALOG.length})`
    : `Gaia error catalog (${list.length} codes)`
  const lines: string[] = ['', `${colorize('green', '▶')} ${headline}`, '']
  for (const [prefix, entries] of groups) {
    lines.push(`  ${colorize('dim', prefix)}`)
    for (const e of entries) lines.push(`    ${e.code.padEnd(36)} ${e.cause}`)
    lines.push('')
  }
  if (filtered) {
    lines.push(
      `  ${colorize('dim', `tip: \`bun gaia explain --search <term>\` searches the full catalog`)}`,
    )
    lines.push('')
  }
  return lines.join('\n')
}

function formatSearchResults(matches: readonly ErrorEntry[], term: string): string {
  const lines: string[] = [
    '',
    `${colorize('green', '▶')} ${matches.length} match(es) for "${term}"`,
    '',
  ]
  for (const e of matches) {
    lines.push(`  ${colorize('bold', e.code)}`)
    lines.push(`    ${colorize('dim', 'cause:')} ${e.cause}`)
    lines.push(`    ${colorize('dim', 'fix:  ')} ${e.fix}`)
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Filter catalog by recent project phase. If state.json shows last_step is
 * 'create.complete', show E1xxx (preflight) + E2xxx (verify-keys). If
 * 'verify-keys.complete', show E2xxx + E3xxx. Etc. New users see only the
 * codes they'd actually encounter at their current step (Krug + Theo).
 */
function filterByRecentState(projectDir: string): ErrorEntry[] | null {
  const loaded = load(defaultStatePath(projectDir))
  if (!loaded.ok) return null
  const phase = loaded.state.last_step
  const allowedPrefixes = phaseAllowlist(phase)
  if (allowedPrefixes === null) return null
  return CATALOG.filter((e) => allowedPrefixes.some((p) => e.code.startsWith(p)))
}

function phaseAllowlist(phase: string): readonly string[] | null {
  if (phase.startsWith('create')) return ['E0', 'E1', 'E2']
  if (phase.startsWith('verify-keys')) return ['E0', 'E2', 'E3']
  if (phase.startsWith('deploy')) return ['E0', 'E3', 'E4']
  if (phase.startsWith('smoke')) return ['E0', 'E4']
  return null
}

function groupByPrefix(entries: readonly ErrorEntry[]): Array<[string, readonly ErrorEntry[]]> {
  const groups = new Map<string, ErrorEntry[]>()
  for (const e of entries) {
    const prefix = e.code.slice(0, 2) // E0, E1, E2, E3, E4
    const arr = groups.get(prefix) ?? []
    arr.push(e)
    groups.set(prefix, arr)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}
