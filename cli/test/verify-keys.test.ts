import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_FLAGS } from '../src/flags.ts'
import { verifyKeys } from '../src/verbs/verify-keys.ts'

const ENV_BODY = `# Gaia .env.local
POLAR_ACCESS_TOKEN=polar_at_test_xxxxxxxxxxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://u:p@ep-x.neon.tech/db?sslmode=require
RAILWAY_TOKEN=railway_xxxxxxxxxxxxxxxx
`

import type { Fetcher } from '../src/providers/types.ts'

function mockFetcher(plan: Map<string, () => Response | Promise<Response>>): Fetcher {
  return (url) => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    for (const [match, factory] of plan) {
      if (u.includes(match)) return Promise.resolve(factory())
    }
    return Promise.resolve(new Response('not mocked', { status: 599 }))
  }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('verifyKeys', () => {
  it('returns OK exit code when every provider verifies', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-vk-'))
    try {
      writeFileSync(join(tmp, '.env.local'), ENV_BODY)
      const result = await verifyKeys({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true, json: false },
        fetcher: mockFetcher(
          new Map([
            ['api.polar.sh', () => json({ id: 'usr_pol', organizations: [{ id: 'org_1' }] })],
            ['api.resend.com', () => json({ data: [] })],
            [
              'backboard.railway.app',
              () => json({ data: { me: { id: 'usr_rly', email: 'x@y' } } }),
            ],
          ]),
        ),
      })
      expect(result.exitCode).toBe(0)
      expect(result.results).toHaveLength(4)
      expect(result.results.every((r) => r.ok)).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns EX_DATAERR (65) when a blocking provider fails', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-vk-'))
    try {
      writeFileSync(join(tmp, '.env.local'), ENV_BODY)
      const result = await verifyKeys({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true, json: false },
        fetcher: mockFetcher(
          new Map([
            ['api.polar.sh', () => json({}, 401)],
            ['api.resend.com', () => json({ data: [] })],
            ['backboard.railway.app', () => json({ data: { me: { id: 'rly' } } })],
          ]),
        ),
      })
      expect(result.exitCode).toBe(65)
      expect(result.results.find((r) => r.provider === 'polar')?.ok).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('treats missing .env.local as all-empty (every blocking-provider fails)', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gaia-vk-'))
    try {
      const result = await verifyKeys({
        projectDir: tmp,
        flags: { ...DEFAULT_FLAGS, quiet: true, json: false },
      })
      expect(result.exitCode).toBe(65)
      expect(result.results.every((r) => !r.ok)).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
