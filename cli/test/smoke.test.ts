// cli/test/smoke.test.ts — smoke verb orchestration (assertions are unit-tested
// separately in smoke.assertions.test.ts). Verifies state advancement, first-
// activation gating, exit codes, and TTFD timing.

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ExitCode } from '../src/exit-codes.ts'
import { DEFAULT_FLAGS } from '../src/flags.ts'
import { load, save } from '../src/state.ts'
import { smoke } from '../src/verbs/smoke.ts'

import type { StateV1 } from '../src/state.schema.ts'

function fixture(overrides: Partial<StateV1> = {}): StateV1 {
  return {
    version: 1,
    project_slug: 'weekend-saas',
    cli_version: '0.0.0',
    started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    bun_version: '1.3.11',
    platform: 'darwin',
    required_env: ['POLAR_ACCESS_TOKEN', 'RESEND_API_KEY', 'DATABASE_URL', 'RAILWAY_TOKEN'],
    last_step: 'deploy.complete',
    next_step: 'smoke',
    ...overrides,
  }
}

function happyFetcher(): typeof fetch {
  return (async (url: string | URL | Request) => {
    const u = url.toString()
    if (u.endsWith('/auth/sign-up/email')) {
      return new Response('ok', {
        status: 200,
        headers: { 'set-cookie': 'sid=abc; HttpOnly; Secure; SameSite=Lax' },
      })
    }
    if (u.endsWith('/webhooks/polar')) return new Response('ok', { status: 200 })
    if (u.endsWith('/')) return new Response('<html></html>', { status: 200 })
    if (u.endsWith('/health') || u.endsWith('/health/ready')) {
      return new Response('ok', { status: 200 })
    }
    return new Response('not found', { status: 404 })
  }) as typeof fetch
}

describe('smoke verb', () => {
  it('OK exit + advances state.last_step + sets activated_at on first run', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-smoke-'))
    const statePath = join(tmp, '.gaia/state.json')
    try {
      await save(statePath, fixture())
      const result = await smoke({
        projectDir: tmp,
        baseUrl: 'https://app.example.com',
        flags: { ...DEFAULT_FLAGS, quiet: true, json: true, stateFile: statePath },
        fetcher: happyFetcher(),
      })
      expect(result.exitCode).toBe(ExitCode.OK)
      const after = load(statePath)
      expect(after.ok).toBe(true)
      if (after.ok) {
        expect(after.state.last_step).toBe('smoke.complete')
        expect(after.state.activated_at).toBeTruthy()
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('does not re-set activated_at on subsequent smoke runs (RT-12)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-smoke-'))
    const statePath = join(tmp, '.gaia/state.json')
    const firstActivated = '2026-04-29T00:00:00.000Z'
    try {
      await save(statePath, fixture({ activated_at: firstActivated }))
      const result = await smoke({
        projectDir: tmp,
        baseUrl: 'https://app.example.com',
        flags: { ...DEFAULT_FLAGS, quiet: true, json: true, stateFile: statePath },
        fetcher: happyFetcher(),
      })
      expect(result.exitCode).toBe(ExitCode.OK)
      const after = load(statePath)
      if (after.ok) expect(after.state.activated_at).toBe(firstActivated)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns EX_DATAERR + does NOT advance state when an assertion fails', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-smoke-'))
    const statePath = join(tmp, '.gaia/state.json')
    try {
      await save(statePath, fixture())
      const failingFetcher = (async (url: string | URL | Request) => {
        const u = url.toString()
        if (u.endsWith('/health') || u.endsWith('/health/ready')) {
          return new Response('down', { status: 502 })
        }
        return happyFetcher()(url)
      }) as typeof fetch
      const result = await smoke({
        projectDir: tmp,
        baseUrl: 'https://app.example.com',
        flags: { ...DEFAULT_FLAGS, quiet: true, json: true, stateFile: statePath },
        fetcher: failingFetcher,
      })
      expect(result.exitCode).toBe(ExitCode.EX_DATAERR)
      const after = load(statePath)
      if (after.ok) {
        expect(after.state.last_step).toBe('deploy.complete')
        expect(after.state.activated_at).toBeUndefined()
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('computes ttfdMinutes from started_at when state is present', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-smoke-'))
    const statePath = join(tmp, '.gaia/state.json')
    try {
      await save(
        statePath,
        fixture({ started_at: new Date(Date.now() - 7 * 60_000).toISOString() }),
      )
      const result = await smoke({
        projectDir: tmp,
        baseUrl: 'https://app.example.com',
        flags: { ...DEFAULT_FLAGS, quiet: true, json: true, stateFile: statePath },
        fetcher: happyFetcher(),
      })
      expect(result.ttfdMinutes).toBeGreaterThanOrEqual(7)
      expect(result.ttfdMinutes).toBeLessThan(10)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
