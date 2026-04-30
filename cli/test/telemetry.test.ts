import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createClient, isEnabled, machineIdHash, sanitize } from '../src/telemetry.ts'

describe('isEnabled — three-tier opt-out', () => {
  it('disabled when GAIA_TELEMETRY=off', () => {
    expect(isEnabled({ envOverride: 'off', flagOverride: false, configPath: '/nonexistent' })).toBe(
      false,
    )
  })

  it('disabled when GAIA_TELEMETRY=0', () => {
    expect(isEnabled({ envOverride: '0', flagOverride: false, configPath: '/nonexistent' })).toBe(
      false,
    )
  })

  it('disabled when --no-telemetry flag is set', () => {
    expect(
      isEnabled({ envOverride: undefined, flagOverride: true, configPath: '/nonexistent' }),
    ).toBe(false)
  })

  it('disabled when ~/.gaia/config.json has telemetry: false', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-tel-'))
    const path = join(tmp, 'config.json')
    try {
      writeFileSync(path, JSON.stringify({ telemetry: false }))
      expect(isEnabled({ envOverride: undefined, flagOverride: false, configPath: path })).toBe(
        false,
      )
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('enabled by default', () => {
    expect(
      isEnabled({ envOverride: undefined, flagOverride: false, configPath: '/nonexistent' }),
    ).toBe(true)
  })

  it('enabled when config.json is malformed (graceful fallback)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-tel-'))
    const path = join(tmp, 'config.json')
    try {
      writeFileSync(path, 'not-json{}')
      expect(isEnabled({ envOverride: undefined, flagOverride: false, configPath: path })).toBe(
        true,
      )
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('sanitize', () => {
  it('keeps allowlisted fields', () => {
    const result = sanitize({
      verb: 'deploy',
      cli_version: '1.0.0',
      duration_ms: 1234,
      project_slug: 'leaked', // NOT allowlisted
      DATABASE_URL: 'postgres://leak', // NOT allowlisted
    })
    expect(result.verb).toBe('deploy')
    expect(result.cli_version).toBe('1.0.0')
    expect(result.duration_ms).toBe(1234)
    expect(result).not.toHaveProperty('project_slug')
    expect(result).not.toHaveProperty('DATABASE_URL')
  })

  it('returns empty object for empty input', () => {
    expect(sanitize({})).toEqual({})
  })
})

describe('machineIdHash', () => {
  it('produces a deterministic 16-hex-char id', () => {
    const a = machineIdHash()
    const b = machineIdHash()
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{16}$/)
  })
})

describe('createClient', () => {
  it('does not buffer when disabled', () => {
    const client = createClient({
      envOverride: 'off',
      flagOverride: false,
      configPath: '/nonexistent',
    })
    expect(client.enabled).toBe(false)
    client.capture('cli.verb.start', { verb: 'create' })
    expect(client.buffer).toHaveLength(0)
  })

  it('buffers + sanitizes captured events', () => {
    const client = createClient({
      envOverride: undefined,
      flagOverride: false,
      configPath: '/nonexistent',
    })
    expect(client.enabled).toBe(true)
    client.capture('cli.verb.start', { verb: 'deploy', leak_field: 'should-strip' })
    expect(client.buffer).toHaveLength(1)
    const evt = client.buffer[0]!
    expect(evt.event).toBe('cli.verb.start')
    expect(evt.properties.verb).toBe('deploy')
    expect(evt.properties).toHaveProperty('machine_id_hash')
    expect(evt.properties).not.toHaveProperty('leak_field')
  })

  it('flush clears the buffer', async () => {
    const client = createClient({
      envOverride: undefined,
      flagOverride: false,
      configPath: '/nonexistent',
    })
    client.capture('cli.first_run', { os: 'darwin' })
    expect(client.buffer.length).toBeGreaterThan(0)
    await client.flush()
    expect(client.buffer).toHaveLength(0)
  })

  it('captures multiple events in order with monotonic timestamps', () => {
    const client = createClient({
      envOverride: undefined,
      flagOverride: false,
      configPath: '/nonexistent',
    })
    client.capture('cli.verb.start', { verb: 'verify-keys' })
    client.capture('cli.verb.complete', { verb: 'verify-keys', exit_code: 0 })
    expect(client.buffer).toHaveLength(2)
    const [a, b] = client.buffer
    expect(a?.event).toBe('cli.verb.start')
    expect(b?.event).toBe('cli.verb.complete')
    expect(Date.parse(a?.ts ?? '')).toBeLessThanOrEqual(Date.parse(b?.ts ?? ''))
  })

  it('every captured event includes machine_id_hash (16 hex)', () => {
    const client = createClient({
      envOverride: undefined,
      flagOverride: false,
      configPath: '/nonexistent',
    })
    client.capture('cli.ttfd', { duration_ms: 12_345 })
    const evt = client.buffer[0]!
    expect(evt.properties.machine_id_hash).toMatch(/^[a-f0-9]{16}$/)
    expect(evt.properties.duration_ms).toBe(12_345)
  })
})
