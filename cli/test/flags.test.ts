import { describe, expect, it } from 'bun:test'

import { parseFlags } from '../src/flags.ts'

describe('parseFlags', () => {
  it('parses every recognized flag', () => {
    const { flags, positional, unknownFlags } = parseFlags([
      '--json',
      '--dry-run',
      '--verbose',
      '--quiet',
      '--yes',
      '--no-color',
      '--no-telemetry',
      '--state-file',
      '/tmp/x.json',
      'positional1',
      'positional2',
    ])
    expect(flags.json).toBe(true)
    expect(flags.dryRun).toBe(true)
    expect(flags.verbose).toBe(true)
    expect(flags.quiet).toBe(true)
    expect(flags.yes).toBe(true)
    expect(flags.noColor).toBe(true)
    expect(flags.noTelemetry).toBe(true)
    expect(flags.stateFile).toBe('/tmp/x.json')
    expect(positional).toEqual(['positional1', 'positional2'])
    expect(unknownFlags).toHaveLength(0)
  })

  it('--ci implies --yes --no-color --json', () => {
    const { flags } = parseFlags(['--ci'])
    expect(flags.ci).toBe(true)
    expect(flags.yes).toBe(true)
    expect(flags.noColor).toBe(true)
    expect(flags.json).toBe(true)
  })

  it('supports short forms (-v, -q, -y, -h)', () => {
    expect(parseFlags(['-v']).flags.verbose).toBe(true)
    expect(parseFlags(['-q']).flags.quiet).toBe(true)
    expect(parseFlags(['-y']).flags.yes).toBe(true)
    expect(parseFlags(['-h']).flags.help).toBe(true)
  })

  it('parses --state-file=path inline syntax', () => {
    const { flags } = parseFlags(['--state-file=/var/state.json'])
    expect(flags.stateFile).toBe('/var/state.json')
  })

  it('collects unknown flags without crashing', () => {
    const { unknownFlags } = parseFlags(['--made-up-flag', '--also-fake'])
    expect(unknownFlags).toEqual(['--made-up-flag', '--also-fake'])
  })

  it('ignores --state-file when no value follows', () => {
    const { flags } = parseFlags(['--state-file'])
    expect(flags.stateFile).toBeNull()
  })

  it('ignores --state-file when next arg is itself a flag (avoids consuming the wrong arg)', () => {
    const { flags } = parseFlags(['--state-file', '--quiet'])
    expect(flags.stateFile).toBeNull()
    expect(flags.quiet).toBe(true)
  })

  it('precedence: --quiet AND --verbose can both be set (callers must resolve)', () => {
    // Neither suppresses the other at parse time. Verb-level code chooses
    // a narrative posture (today: quiet > verbose because the narrator
    // checks `quiet` first).
    const { flags } = parseFlags(['--verbose', '--quiet'])
    expect(flags.quiet).toBe(true)
    expect(flags.verbose).toBe(true)
  })

  it('precedence: --ci forces --json even if --no-color is parsed first', () => {
    const { flags } = parseFlags(['--no-color', '--ci'])
    expect(flags.json).toBe(true)
    expect(flags.yes).toBe(true)
    expect(flags.noColor).toBe(true)
  })

  it('precedence: --json explicit + --ci → still json (idempotent)', () => {
    const { flags } = parseFlags(['--json', '--ci'])
    expect(flags.json).toBe(true)
  })

  it('precedence: positional after a flag value still collected', () => {
    const { positional } = parseFlags(['--state-file', '/tmp/s.json', 'create', 'myapp'])
    expect(positional).toEqual(['create', 'myapp'])
  })

  it('--state-file=<empty-string> still records the empty value (caller validates)', () => {
    const { flags } = parseFlags(['--state-file='])
    // Inline form always assigns; empty string is technically valid here.
    // The dispatcher should treat empty as "not provided" but parser stays dumb.
    expect(flags.stateFile).toBe('')
  })

  it('supports interleaved order: positional, flag, positional', () => {
    const { positional, flags } = parseFlags(['create', '--yes', 'myapp'])
    expect(positional).toEqual(['create', 'myapp'])
    expect(flags.yes).toBe(true)
  })
})
