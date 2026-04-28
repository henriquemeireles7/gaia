import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { checkRateLimit, createRateLimiter, rateLimitMiddleware } from './rate-limit'
import type { AppEnv } from './types'

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter(5, 60_000)
    const result = limiter.check('test-key')
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.remaining).toBe(4)
    }
  })

  it('allows exactly maxRequests', () => {
    const limiter = createRateLimiter(5, 60_000)
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('test-key')
      expect(result.allowed).toBe(true)
    }
  })

  it('denies requests over the limit', () => {
    const limiter = createRateLimiter(3, 60_000)
    for (let i = 0; i < 3; i++) {
      limiter.check('test-key')
    }
    const result = limiter.check('test-key')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0)
      expect(result.remaining).toBe(0)
    }
  })

  it('refills tokens over time', () => {
    const limiter = createRateLimiter(3, 1) // 1ms window — tokens refill almost instantly
    for (let i = 0; i < 3; i++) {
      limiter.check('test-key')
    }
    // Busy-wait for token refill
    const start = Date.now()
    while (Date.now() - start < 5) {
      /* wait */
    }
    const result = limiter.check('test-key')
    expect(result.allowed).toBe(true)
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter(2, 60_000)
    limiter.check('key-a')
    limiter.check('key-a')
    expect(limiter.check('key-a').allowed).toBe(false)
    expect(limiter.check('key-b').allowed).toBe(true)
  })

  it('reset clears a specific key', () => {
    const limiter = createRateLimiter(2, 60_000)
    limiter.check('key-a')
    limiter.check('key-a')
    expect(limiter.check('key-a').allowed).toBe(false)
    limiter.reset('key-a')
    expect(limiter.check('key-a').allowed).toBe(true)
  })

  it('reset without key clears all entries', () => {
    const limiter = createRateLimiter(1, 60_000)
    limiter.check('key-a')
    limiter.check('key-b')
    expect(limiter.size).toBe(2)
    limiter.reset()
    expect(limiter.size).toBe(0)
  })

  it('reports store size', () => {
    const limiter = createRateLimiter(5, 60_000)
    expect(limiter.size).toBe(0)
    limiter.check('a')
    limiter.check('b')
    expect(limiter.size).toBe(2)
  })
})

describe('checkRateLimit (legacy API)', () => {
  it('allows requests under the limit', () => {
    const key = `legacy-allow-${Date.now()}`
    const result = checkRateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(true)
  })

  it('denies requests over the limit', () => {
    const key = `legacy-deny-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000)
    }
    const result = checkRateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0)
    }
  })
})

describe('rateLimitMiddleware', () => {
  function createTestApp(max: number, windowMs: number) {
    const app = new Hono<AppEnv>()
    app.use('*', rateLimitMiddleware({ max, windowMs }))
    app.get('/test', (c) => c.json({ ok: true }))
    return app
  }

  it('allows requests under the limit', async () => {
    const app = createTestApp(3, 60_000)
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': `mw-allow-${Date.now()}` },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3')
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy()
  })

  it('returns 429 when limit exceeded', async () => {
    const app = createTestApp(2, 60_000)
    const ip = `mw-deny-${Date.now()}`
    await app.request('/test', { headers: { 'x-forwarded-for': ip } })
    await app.request('/test', { headers: { 'x-forwarded-for': ip } })
    const res = await app.request('/test', { headers: { 'x-forwarded-for': ip } })
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.code).toBe('RATE_LIMITED')
  })

  it('uses custom keyFn when provided', async () => {
    const app = new Hono<AppEnv>()
    app.use(
      '*',
      rateLimitMiddleware({
        max: 1,
        windowMs: 60_000,
        keyFn: (c) => c.req.header('x-api-key') ?? 'anon',
      }),
    )
    app.get('/test', (c) => c.json({ ok: true }))

    const res1 = await app.request('/test', { headers: { 'x-api-key': 'key-a' } })
    expect(res1.status).toBe(200)

    const res2 = await app.request('/test', { headers: { 'x-api-key': 'key-a' } })
    expect(res2.status).toBe(429)

    // Different key should still work
    const res3 = await app.request('/test', { headers: { 'x-api-key': 'key-b' } })
    expect(res3.status).toBe(200)
  })
})
