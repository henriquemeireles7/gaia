import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { csrfProtection } from './csrf'
import type { AppEnv } from './types'

function createTestApp() {
  const app = new Hono<AppEnv>()
  app.use('*', csrfProtection())
  app.get('/page', (c) => c.json({ ok: true }))
  app.post('/action', (c) => c.json({ ok: true }))
  app.put('/update', (c) => c.json({ ok: true }))
  app.delete('/remove', (c) => c.json({ ok: true }))
  return app
}

function extractCsrfCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) return null
  const match = setCookie.match(/__csrf=([^;]+)/)
  return match?.[1] ?? null
}

describe('csrfProtection', () => {
  const app = createTestApp()

  it('sets CSRF cookie on GET when not present', async () => {
    const res = await app.request('/page')
    expect(res.status).toBe(200)
    const token = extractCsrfCookie(res)
    expect(token).toBeTruthy()
    expect(token!.length).toBe(64) // 32 bytes * 2 hex chars
  })

  it('does not overwrite existing CSRF cookie on GET', async () => {
    const res = await app.request('/page', {
      headers: { cookie: '__csrf=existing-token' },
    })
    expect(res.status).toBe(200)
    const newToken = extractCsrfCookie(res)
    expect(newToken).toBeNull() // no new set-cookie
  })

  it('rejects POST without CSRF token', async () => {
    const res = await app.request('/action', { method: 'POST' })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('rejects POST with mismatched CSRF token', async () => {
    const res = await app.request('/action', {
      method: 'POST',
      headers: {
        cookie: '__csrf=token-a',
        'x-csrf-token': 'token-b',
      },
    })
    expect(res.status).toBe(403)
  })

  it('allows POST with matching CSRF token', async () => {
    // First get a token
    const getRes = await app.request('/page')
    const token = extractCsrfCookie(getRes)!

    const res = await app.request('/action', {
      method: 'POST',
      headers: {
        cookie: `__csrf=${token}`,
        'x-csrf-token': token,
      },
    })
    expect(res.status).toBe(200)
  })

  it('allows PUT with matching CSRF token', async () => {
    const getRes = await app.request('/page')
    const token = extractCsrfCookie(getRes)!

    const res = await app.request('/update', {
      method: 'PUT',
      headers: {
        cookie: `__csrf=${token}`,
        'x-csrf-token': token,
      },
    })
    expect(res.status).toBe(200)
  })

  it('allows DELETE with matching CSRF token', async () => {
    const getRes = await app.request('/page')
    const token = extractCsrfCookie(getRes)!

    const res = await app.request('/remove', {
      method: 'DELETE',
      headers: {
        cookie: `__csrf=${token}`,
        'x-csrf-token': token,
      },
    })
    expect(res.status).toBe(200)
  })

  it('rejects POST with cookie but no header', async () => {
    const res = await app.request('/action', {
      method: 'POST',
      headers: { cookie: '__csrf=some-token' },
    })
    expect(res.status).toBe(403)
  })

  it('rejects POST with header but no cookie', async () => {
    const res = await app.request('/action', {
      method: 'POST',
      headers: { 'x-csrf-token': 'some-token' },
    })
    expect(res.status).toBe(403)
  })

  it('passes through OPTIONS requests', async () => {
    const res = await app.request('/action', { method: 'OPTIONS' })
    // OPTIONS should not be blocked by CSRF
    expect(res.status).not.toBe(403)
  })
})
