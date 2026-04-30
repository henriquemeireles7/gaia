// apps/api/server/app.test.ts — boundary tests for the Elysia app.
//
// Uses app.handle(new Request(...)) — no port allocation, no network.
// Tests the HTTP boundary: routing, error mapping, webhook signature
// verification.

import { beforeAll, describe, expect, it } from 'bun:test'
import { env } from '@gaia/config'
import { app } from './app'

// Force live mode — these tests assert real HMAC webhook verification.
// Mock-mode webhooks accept anything; that path is tested in mocks/.
beforeAll(() => {
  ;(env as { VENDOR_MODE: string }).VENDOR_MODE = 'live'
})

const baseUrl = 'http://localhost'

describe('GET /health', () => {
  it('returns ok:true', async () => {
    const res = await app.handle(new Request(`${baseUrl}/health`))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})

describe('GET /me', () => {
  it('returns 401 without a session', async () => {
    const res = await app.handle(new Request(`${baseUrl}/me`))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('UNAUTHORIZED')
  })
})

describe('POST /webhooks/polar', () => {
  it('returns 401 without signature', async () => {
    const res = await app.handle(
      new Request(`${baseUrl}/webhooks/polar`, {
        method: 'POST',
        body: '{}',
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid signature', async () => {
    const res = await app.handle(
      new Request(`${baseUrl}/webhooks/polar`, {
        method: 'POST',
        headers: { 'polar-signature': 'deadbeef' },
        body: '{"type":"sub.created"}',
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe('GET /unknown', () => {
  it('returns a 404 for unmatched routes', async () => {
    const res = await app.handle(new Request(`${baseUrl}/this/does/not/exist`))
    expect(res.status).toBe(404)
  })
})
