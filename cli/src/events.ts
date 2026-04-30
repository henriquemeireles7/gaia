// cli/src/events.ts — NDJSON event emitter (AD-AP-2 + AD-AP-3).
//
// Two output modes:
//   1. --json: every event line written to stdout as JSON.
//   2. default: events not written to stdout; narration goes to stderr (see
//      cli/src/ui/narrate.ts). Stdout stays clean for downstream piping.
//
// `event_v: 1` is locked — adding a new event = adding to EVENT_NAMES in
// .gaia/protocols/cli.ts, never bumping the version.

import { randomBytes } from 'node:crypto'

/** @public */
export type Verb = 'create' | 'verify-keys' | 'deploy' | 'smoke' | 'explain' | 'setup' | 'status'

export type EventName =
  | 'cli.start'
  | 'cli.complete'
  | 'cli.error'
  | 'step.start'
  | 'step.progress'
  | 'step.ok'
  | 'step.warn'
  | 'step.error'
  | 'hint.next'
  | 'telemetry.first_run'
  | 'telemetry.ttfd'
  | 'flow.discover'
  | 'flow.scaffold'
  | 'flow.verify'
  | 'flow.deploy'
  | 'flow.smoke'
  | 'flow.activated'
  | 'catalog.miss'

export type Event = {
  event_v: 1
  ts: string
  verb: Verb
  run_id: string
  name: EventName
  data?: Record<string, unknown>
  next?: string
}

export function generateRunId(): string {
  return randomBytes(8).toString('hex')
}

/** @public */
export type EmitterOptions = {
  verb: Verb
  runId: string
  /** When true, emit JSON to stdout. When false, do not emit (callers handle stderr narration). */
  jsonMode: boolean
  /** Override sink for tests. Defaults to process.stdout.write. */
  sink?: (line: string) => void
}

export type Emitter = {
  emit: (name: EventName, opts?: { data?: Record<string, unknown>; next?: string }) => Event
  runId: string
}

export function createEmitter(options: EmitterOptions): Emitter {
  const sink = options.sink ?? ((line: string) => process.stdout.write(line))

  return {
    runId: options.runId,
    emit(name, opts) {
      const evt: Event = {
        event_v: 1,
        ts: new Date().toISOString(),
        verb: options.verb,
        run_id: options.runId,
        name,
        ...(opts?.data ? { data: opts.data } : {}),
        ...(opts?.next ? { next: opts.next } : {}),
      }
      if (options.jsonMode) {
        sink(`${JSON.stringify(evt)}\n`)
      }
      return evt
    },
  }
}
