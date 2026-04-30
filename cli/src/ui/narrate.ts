// cli/src/ui/narrate.ts — live narration helpers (AD-AP-3).
//
// Default-on stderr narration. Stdout stays clean (events when --json,
// otherwise nothing). --quiet suppresses; --json + --quiet combine cleanly.
//
// The narrator wraps `step.start` / `step.ok` / `step.warn` / `step.error`
// events from cli/src/events.ts. Verbs call these instead of mixing
// process.stderr.write + emitter.emit at every site.

import { performance } from 'node:perf_hooks'

import { findEntry } from '../errors/catalog.ts'
import type { Emitter } from '../events.ts'
import { colorize } from './banner.ts'

/** @public */
export type NarrateOptions = {
  emitter: Emitter
  /** When true, no stderr output. Events still emit if --json. */
  quiet: boolean
  /** When true, includes timestamps + relative offsets in stderr. */
  verbose: boolean
}

/** @public */
export type Narrator = {
  step: <T>(name: string, fn: () => Promise<T> | T, opts?: { hint?: string }) => Promise<T>
  ok: (name: string, message?: string) => void
  warn: (name: string, message: string) => void
  error: (name: string, message: string) => void
  hint: (next: string) => void
}

const T0 = performance.now()

function formatRelTime(): string {
  const elapsed = performance.now() - T0
  if (elapsed < 1000) return `[+${elapsed.toFixed(0)}ms]`
  const seconds = elapsed / 1000
  if (seconds < 60) return `[+${seconds.toFixed(1)}s]`
  const minutes = Math.floor(seconds / 60)
  const remSec = Math.floor(seconds % 60)
  return `[+${minutes}m${remSec.toString().padStart(2, '0')}s]`
}

function write(quiet: boolean, line: string): void {
  if (!quiet) process.stderr.write(line)
}

export function createNarrator({ emitter, quiet, verbose }: NarrateOptions): Narrator {
  return {
    async step(name, fn, opts) {
      emitter.emit('step.start', { data: { name } })
      write(quiet, `${formatRelTime()} ${colorize('green', '→')} ${name}…\n`)
      try {
        const result = await fn()
        emitter.emit('step.ok', {
          data: { name },
          ...(opts?.hint ? { next: opts.hint } : {}),
        })
        write(quiet, `${formatRelTime()} ${colorize('green', '✓')} ${name}\n`)
        return result
      } catch (err) {
        const message = (err as Error).message
        emitter.emit('step.error', { data: { name, message } })
        write(quiet, `${formatRelTime()} ${colorize('amber', '✗')} ${name} — ${message}\n`)
        throw err
      }
    },
    ok(name, message) {
      emitter.emit('step.ok', { data: { name, message } })
      write(
        quiet,
        `${formatRelTime()} ${colorize('green', '✓')} ${name}${message ? ` — ${message}` : ''}\n`,
      )
    },
    warn(name, message) {
      emitter.emit('step.warn', { data: { name, message } })
      write(quiet, `${formatRelTime()} ${colorize('amber', '!')} ${name} — ${message}\n`)
    },
    error(name, message) {
      emitter.emit('step.error', { data: { name, message } })
      write(quiet, `${formatRelTime()} ${colorize('amber', '✗')} ${name} — ${message}\n`)
      // Inline fix hint (Theme A / Principle 3 — empty states ARE the tutorial).
      // Extract any E#### code in the message and surface the catalog entry's
      // fix + next-command on the same screen.
      const codeMatch = message.match(/\b(E\d{4}(?:_[A-Z][A-Z0-9_]*)?)\b/)
      const entry = codeMatch?.[1] ? findEntry(codeMatch[1]) : undefined
      if (entry) {
        write(quiet, `${' '.repeat(8)}${colorize('dim', 'fix:  ')}${entry.fix}\n`)
        write(quiet, `${' '.repeat(8)}${colorize('dim', 'next: ')}${entry.nextCommand}\n`)
      } else if (codeMatch?.[1]) {
        // #32: catalog miss — emit observability event so we can spot codes
        // that get raised in code but were never added to the catalog.
        emitter.emit('catalog.miss', { data: { code: codeMatch[1], step: name } })
      }
    },
    hint(next) {
      emitter.emit('hint.next', { next })
      if (verbose) write(quiet, `${colorize('dim', `  next: ${next}`)}\n`)
    },
  }
}
