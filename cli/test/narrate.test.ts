// cli/test/narrate.test.ts — narrator output, catalog inline-fix, catalog-miss event.

import { describe, expect, it } from 'bun:test'

import { createEmitter } from '../src/events.ts'
import { createNarrator } from '../src/ui/narrate.ts'

function captureStderr(): { restore: () => string } {
  const chunks: string[] = []
  const orig = process.stderr.write.bind(process.stderr)
  process.stderr.write = ((data: string | Uint8Array) => {
    chunks.push(typeof data === 'string' ? data : new TextDecoder().decode(data))
    return true
  }) as typeof process.stderr.write
  return {
    restore: () => {
      process.stderr.write = orig
      return chunks.join('')
    },
  }
}

function captureStdout(): { restore: () => string } {
  const chunks: string[] = []
  const orig = process.stdout.write.bind(process.stdout)
  process.stdout.write = ((data: string | Uint8Array) => {
    chunks.push(typeof data === 'string' ? data : new TextDecoder().decode(data))
    return true
  }) as typeof process.stdout.write
  return {
    restore: () => {
      process.stdout.write = orig
      return chunks.join('')
    },
  }
}

describe('createNarrator', () => {
  it('quiet=true suppresses stderr but events still emit', () => {
    const emitter = createEmitter({ verb: 'verify-keys', runId: 'run-1', jsonMode: true })
    const narrate = createNarrator({ emitter, quiet: true, verbose: false })
    const stderr = captureStderr()
    const stdout = captureStdout()
    narrate.ok('foo', 'all good')
    expect(stderr.restore()).toBe('')
    expect(stdout.restore()).toMatch(/"name":"step.ok"/)
  })

  it('writes ok to stderr when quiet=false', () => {
    const emitter = createEmitter({ verb: 'verify-keys', runId: 'run-1', jsonMode: false })
    const narrate = createNarrator({ emitter, quiet: false, verbose: false })
    const stderr = captureStderr()
    narrate.ok('foo', 'all good')
    expect(stderr.restore()).toMatch(/foo/)
  })

  it('error inlines fix + next from the catalog when an E#### code is present', () => {
    const emitter = createEmitter({ verb: 'verify-keys', runId: 'run-1', jsonMode: false })
    const narrate = createNarrator({ emitter, quiet: false, verbose: false })
    const stderr = captureStderr()
    narrate.error('verify polar', 'E2002_POLAR_INVALID Polar rejected the token (HTTP 401).')
    const out = stderr.restore()
    expect(out).toMatch(/fix:/)
    expect(out).toMatch(/next:/)
  })

  it('emits catalog.miss event when a code has no catalog entry', () => {
    const emitter = createEmitter({ verb: 'verify-keys', runId: 'run-1', jsonMode: true })
    const narrate = createNarrator({ emitter, quiet: true, verbose: false })
    const stdout = captureStdout()
    narrate.error('verify polar', 'E9999_DOES_NOT_EXIST something happened')
    const out = stdout.restore()
    expect(out).toMatch(/"name":"catalog.miss"/)
    expect(out).toMatch(/E9999_DOES_NOT_EXIST/)
  })

  it('hint is silent unless --verbose', () => {
    const emitter = createEmitter({ verb: 'verify-keys', runId: 'run-1', jsonMode: false })
    const quietHint = createNarrator({ emitter, quiet: false, verbose: false })
    const stderr1 = captureStderr()
    quietHint.hint('bun gaia deploy')
    expect(stderr1.restore()).toBe('')

    const verboseHint = createNarrator({ emitter, quiet: false, verbose: true })
    const stderr2 = captureStderr()
    verboseHint.hint('bun gaia deploy')
    expect(stderr2.restore()).toMatch(/bun gaia deploy/)
  })
})
