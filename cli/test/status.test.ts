// cli/test/status.test.ts — `bun gaia status` reads state.json + artifacts and
// prints a 1-screen summary. Unit-tested in --json mode for stable assertions.

import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ExitCode } from '../src/exit-codes.ts'
import { DEFAULT_FLAGS, type StandardFlags } from '../src/flags.ts'
import { save } from '../src/state.ts'
import { status } from '../src/verbs/status.ts'

import type { StateV1 } from '../src/state.schema.ts'

function defaultFlags(): StandardFlags {
  return { ...DEFAULT_FLAGS }
}

function fixture(overrides: Partial<StateV1> = {}): StateV1 {
  return {
    version: 1,
    project_slug: 'weekend-saas',
    cli_version: '0.0.0',
    started_at: '2026-04-29T12:00:00.000Z',
    bun_version: '1.3.11',
    platform: 'darwin',
    required_env: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY', 'DATABASE_URL', 'RAILWAY_TOKEN'],
    last_step: 'create.complete',
    next_step: 'verify-keys',
    ...overrides,
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

describe('status', () => {
  it('returns EX_DATAERR + amber message when no state.json', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-status-'))
    const stderr = captureStderr()
    try {
      const result = status({
        projectDir: tmp,
        flags: { ...defaultFlags(), json: false },
      })
      expect(result.exitCode).toBe(ExitCode.EX_DATAERR)
      expect(stderr.restore()).toMatch(/No Gaia project here/)
    } finally {
      stderr.restore()
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('json mode emits a parseable object on missing state', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-status-'))
    const stdout = captureStdout()
    try {
      const result = status({
        projectDir: tmp,
        flags: { ...defaultFlags(), json: true },
      })
      const out = stdout.restore()
      expect(result.exitCode).toBe(ExitCode.EX_DATAERR)
      const parsed = JSON.parse(out)
      expect(parsed.ok).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('suggests verify-keys after create.complete', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-status-'))
    const path = join(tmp, '.gaia/state.json')
    const stdout = captureStdout()
    try {
      await save(path, fixture({ last_step: 'create.complete', next_step: 'verify-keys' }))
      const result = status({
        projectDir: tmp,
        flags: { ...defaultFlags(), json: true },
      })
      const out = stdout.restore()
      expect(result.exitCode).toBe(ExitCode.OK)
      const parsed = JSON.parse(out)
      expect(parsed.next_command).toBe('bun gaia verify-keys')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('flags failing providers in next_command suggestion', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-status-'))
    const path = join(tmp, '.gaia/state.json')
    const stdout = captureStdout()
    try {
      await save(
        path,
        fixture({
          last_step: 'verify-keys.complete',
          verified: {
            polar: {
              ok: true,
              verified_at: '2026-04-29T12:01:00.000Z',
              warnings: [],
              ttfd_blocking: false,
            },
            resend: {
              ok: false,
              verified_at: '2026-04-29T12:01:00.000Z',
              warnings: [],
              ttfd_blocking: true,
            },
          },
        }),
      )
      const result = status({
        projectDir: tmp,
        flags: { ...defaultFlags(), json: true },
      })
      const out = stdout.restore()
      expect(result.exitCode).toBe(ExitCode.OK)
      const parsed = JSON.parse(out)
      expect(parsed.next_command).toMatch(/verify-keys/)
      expect(parsed.next_command).toMatch(/1 provider/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('lists discovered failure artifacts', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-status-'))
    const path = join(tmp, '.gaia/state.json')
    const stdout = captureStdout()
    try {
      await save(path, fixture())
      mkdirSync(join(tmp, '.gaia'), { recursive: true })
      writeFileSync(join(tmp, '.gaia/last-deploy-failure.log'), '...')
      const result = status({
        projectDir: tmp,
        flags: { ...defaultFlags(), json: true },
      })
      const out = stdout.restore()
      expect(result.exitCode).toBe(ExitCode.OK)
      const parsed = JSON.parse(out)
      expect(parsed.artifacts).toContain('.gaia/last-deploy-failure.log')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
