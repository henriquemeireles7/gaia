import { describe, expect, it } from 'bun:test'

import { createEmitter, generateRunId } from '../src/events.ts'

describe('createEmitter', () => {
  it('emits NDJSON with event_v: 1 and required fields when jsonMode=true', () => {
    const lines: string[] = []
    const emitter = createEmitter({
      verb: 'create',
      runId: 'abc123ef',
      jsonMode: true,
      sink: (l) => lines.push(l),
    })
    emitter.emit('cli.start', { data: { project: 'demo' } })
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!.trim()) as Record<string, unknown>
    expect(parsed.event_v).toBe(1)
    expect(parsed.verb).toBe('create')
    expect(parsed.run_id).toBe('abc123ef')
    expect(parsed.name).toBe('cli.start')
    expect(parsed.data).toEqual({ project: 'demo' })
    expect(typeof parsed.ts).toBe('string')
  })

  it('does not emit to stdout when jsonMode=false', () => {
    const lines: string[] = []
    const emitter = createEmitter({
      verb: 'create',
      runId: 'r',
      jsonMode: false,
      sink: (l) => lines.push(l),
    })
    emitter.emit('cli.start')
    expect(lines).toHaveLength(0)
  })

  it('attaches `next` hint when provided', () => {
    const lines: string[] = []
    const emitter = createEmitter({
      verb: 'verify-keys',
      runId: 'r',
      jsonMode: true,
      sink: (l) => lines.push(l),
    })
    emitter.emit('hint.next', { next: 'bun gaia deploy' })
    const parsed = JSON.parse(lines[0]!.trim()) as Record<string, unknown>
    expect(parsed.next).toBe('bun gaia deploy')
  })

  it('returns the event from emit() so callers can persist it', () => {
    const emitter = createEmitter({
      verb: 'smoke',
      runId: 'r',
      jsonMode: false,
    })
    const evt = emitter.emit('step.ok', { data: { name: 'auth-roundtrip' } })
    expect(evt.name).toBe('step.ok')
    expect(evt.data).toEqual({ name: 'auth-roundtrip' })
  })
})

describe('generateRunId', () => {
  it('produces a 16-char hex string (uniqueness assumed by 64 bits of entropy)', () => {
    const id = generateRunId()
    expect(id).toMatch(/^[a-f0-9]{16}$/)
  })

  it('produces different ids on consecutive calls', () => {
    const ids = new Set([generateRunId(), generateRunId(), generateRunId(), generateRunId()])
    expect(ids.size).toBe(4)
  })
})
