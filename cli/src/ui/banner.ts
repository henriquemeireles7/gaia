// cli/src/ui/banner.ts — the TTHW-1 banner.
//
// Per initiative 0002 AD-AP-13: the banner must render in <1000ms from
// `bun create gaia@latest` exec. It's the first thing a developer sees
// after cloning, and it sets the live-narration tone for the next 28 minutes.
//
// PR 2 ships the banner with synchronous ANSI output. PR 3 wires the NDJSON
// emitter so an agent can parse the same moment as a structured event.

import { isatty } from 'node:tty'

const SUPPORTS_COLOR = isatty(2) && process.env.NO_COLOR !== '1' && process.env.TERM !== 'dumb'

type Color = 'green' | 'amber' | 'dim' | 'reset' | 'bold'

const ANSI: Record<Color, string> = SUPPORTS_COLOR
  ? {
      green: '\x1b[32m',
      amber: '\x1b[33m',
      dim: '\x1b[2m',
      reset: '\x1b[0m',
      bold: '\x1b[1m',
    }
  : { green: '', amber: '', dim: '', reset: '', bold: '' }

export function colorize(color: Color, text: string): string {
  return `${ANSI[color]}${text}${ANSI.reset}`
}

export type BannerOptions = {
  projectSlug: string
  cliVersion: string
  startedAt: Date
}

/**
 * Render the GAIA banner that opens every `bun create` run.
 * Pure string builder — no I/O — so the same function is testable for shape AND timing.
 */
export function renderBanner({ projectSlug, cliVersion, startedAt }: BannerOptions): string {
  const supportsEmoji = process.env.LANG?.toLowerCase().includes('utf') !== false
  const arrow = supportsEmoji ? '▶' : '>'
  const clock = supportsEmoji ? '⏱ ' : '[clock]'

  const isoTime = startedAt.toISOString()

  return [
    colorize('green', colorize('bold', `${arrow} GAIA`)) +
      colorize('dim', '  clone-to-deploy SaaS template'),
    colorize('dim', `${clock} 30-min clock started · v${cliVersion} · project: ${projectSlug}`),
    colorize('dim', `   started_at: ${isoTime}`),
    '',
  ].join('\n')
}

/**
 * Print the banner to stderr (per AD-AP-3: stdout stays clean for events; stderr is for narration).
 * Returns the elapsed milliseconds from `since` to first byte written — used by the TTHW-1 benchmark.
 */
export function printBanner(opts: BannerOptions, since: number = performance.now()): number {
  const text = renderBanner(opts)
  process.stderr.write(text)
  return performance.now() - since
}
