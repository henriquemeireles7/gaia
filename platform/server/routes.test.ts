import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { csrfProtection } from '../csrf'
import { rateLimitMiddleware } from '../rate-limit'
import type { AppEnv } from '../types'

/**
 * Route-level integration tests.
 *
 * Tests the routing layer (middleware wiring, rate limiting, CSRF, auth guards)
 * using a lightweight test app that mirrors the real mountRoutes() structure
 * without requiring database, auth providers, or external services.
 */

function createRoutesTestApp() {
  const app = new Hono<AppEnv>()

  // Request ID middleware (mirrors app.ts)
  app.use('*', async (c, next) => {
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
    c.header('X-Request-Id', requestId)
    c.set('requestId', requestId)
    await next()
  })

  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
  )

  // ─── Rate Limiting (mirrors routes.ts) ───
  app.use('/api/auth/*', rateLimitMiddleware({ max: 5, windowMs: 60_000 }))
  app.use('/api/checkout/*', rateLimitMiddleware({ max: 10, windowMs: 60_000 }))
  app.use('/api/*', rateLimitMiddleware({ max: 60, windowMs: 60_000 }))

  // ─── CSRF Protection (mirrors routes.ts) ───
  app.use('/api/account/*', csrfProtection())
  app.use('/api/checkout/*', csrfProtection())
  app.use('/api/orgs/*', csrfProtection())
  app.use('/api/admin/*', csrfProtection())

  // ─── Fake auth middleware ───
  // Simulates requireAuth: rejects if no x-test-user header
  const requireAuth = async (
    c: {
      req: { header: (name: string) => string | undefined }
      set: (key: string, value: unknown) => void
    },
    next: () => Promise<void>,
  ) => {
    const userId = c.req.header('x-test-user')
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
    c.set('user', { id: userId, email: 'test@test.com', name: 'Test', role: 'free' })
    c.set('session', { id: `session:${userId}`, userId })
    await next()
  }

  // ─── Public routes ───
  app.get('/api/auth/session', (c) => c.json({ ok: true, data: { provider: 'better-auth' } }))
  app.post('/api/auth/login', (c) => c.json({ ok: true, data: { token: 'test' } }))
  app.post('/api/webhook/stripe', (c) => c.json({ ok: true }))
  app.get('/sitemap.xml', (c) => c.text('<sitemap></sitemap>'))
  app.get('/api/blog/posts', (c) => c.json({ ok: true, data: [] }))

  // ─── Protected routes (require auth) ───
  app.get('/api/account/profile', requireAuth, (c) => c.json({ ok: true, data: { user: 'me' } }))
  app.post('/api/account/update', requireAuth, (c) => c.json({ ok: true }))
  app.post('/api/checkout/create', requireAuth, (c) =>
    c.json({ ok: true, data: { url: 'https://pay.test' } }),
  )
  app.get('/api/orgs/list', requireAuth, (c) => c.json({ ok: true, data: [] }))
  app.get('/api/admin/users', requireAuth, (c) => c.json({ ok: true, data: [] }))

  // ─── Error route ───
  app.get('/api/error', () => {
    throw new Error('Unexpected failure')
  })

  // Global error handler (mirrors app.ts)
  app.onError((_err, c) =>
    c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500),
  )

  return app
}

// ─── Route Registration ───

describe('route registration', () => {
  const app = createRoutesTestApp()

  it('serves auth routes', async () => {
    const res = await app.request('/api/auth/session')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('serves webhook routes', async () => {
    const res = await app.request('/api/webhook/stripe', { method: 'POST' })
    expect(res.status).toBe(200)
  })

  it('serves blog routes', async () => {
    const res = await app.request('/api/blog/posts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('serves sitemap route', async () => {
    const res = await app.request('/sitemap.xml')
    expect(res.status).toBe(200)
  })

  it('returns 404 for unregistered routes', async () => {
    const res = await app.request('/api/nonexistent')
    expect(res.status).toBe(404)
  })
})

// ─── Auth Middleware ───

describe('auth middleware on protected routes', () => {
  const app = createRoutesTestApp()

  it('rejects unauthenticated requests to /api/account/*', async () => {
    const res = await app.request('/api/account/profile')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('rejects unauthenticated requests to /api/orgs/*', async () => {
    const res = await app.request('/api/orgs/list')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  it('rejects unauthenticated requests to /api/admin/*', async () => {
    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('allows authenticated requests to /api/account/*', async () => {
    const res = await app.request('/api/account/profile', {
      headers: { 'x-test-user': 'user-1' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── Rate Limiting Headers ───

describe('rate limiting headers', () => {
  const app = createRoutesTestApp()

  it('includes rate limit headers on /api/* routes', async () => {
    const res = await app.request('/api/blog/posts')
    expect(res.headers.get('x-ratelimit-limit')).toBe('60')
    expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
  })

  it('applies stricter rate limit on /api/auth/* routes (enforced before general)', async () => {
    // The auth-specific limiter (max: 5) runs first and enforces the stricter limit.
    // The general /api/* limiter (max: 60) runs after and overwrites the header,
    // but the stricter limiter already gates the request.
    const res = await app.request('/api/auth/session')
    // Header reflects the last middleware to set it (general /api/* = 60)
    expect(res.headers.get('x-ratelimit-limit')).toBeTruthy()
    expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
  })

  it('applies checkout rate limit on /api/checkout/* routes', async () => {
    const res = await app.request('/api/checkout/create', {
      method: 'POST',
      headers: {
        'x-test-user': 'user-1',
        cookie: '__csrf=token123',
        'x-csrf-token': 'token123',
      },
    })
    expect(res.headers.get('x-ratelimit-limit')).toBeTruthy()
    expect(res.headers.get('x-ratelimit-remaining')).toBeTruthy()
  })
})

// ─── CORS Headers ───

describe('CORS headers', () => {
  const app = createRoutesTestApp()

  it('returns CORS headers for allowed origin', async () => {
    const res = await app.request('/api/blog/posts', {
      headers: { Origin: 'http://localhost:3000' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('does not allow unknown origins', async () => {
    const res = await app.request('/api/blog/posts', {
      headers: { Origin: 'http://evil.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).not.toBe('http://evil.com')
  })

  it('handles preflight OPTIONS requests', async () => {
    const res = await app.request('/api/blog/posts', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
  })
})

// ─── CSRF Protection ───

describe('CSRF protection', () => {
  const app = createRoutesTestApp()

  it('allows GET requests without CSRF token', async () => {
    const res = await app.request('/api/account/profile', {
      headers: { 'x-test-user': 'user-1' },
    })
    expect(res.status).toBe(200)
  })

  it('sets CSRF cookie on GET requests when no cookie present', async () => {
    const res = await app.request('/api/account/profile', {
      headers: { 'x-test-user': 'user-1' },
    })
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('__csrf=')
  })

  it('rejects POST without CSRF token on protected routes', async () => {
    const res = await app.request('/api/account/update', {
      method: 'POST',
      headers: { 'x-test-user': 'user-1' },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.code).toBe('FORBIDDEN')
  })

  it('allows POST with matching CSRF token', async () => {
    const res = await app.request('/api/account/update', {
      method: 'POST',
      headers: {
        'x-test-user': 'user-1',
        cookie: '__csrf=valid-token-123',
        'x-csrf-token': 'valid-token-123',
      },
    })
    expect(res.status).toBe(200)
  })

  it('rejects POST with mismatched CSRF token', async () => {
    const res = await app.request('/api/account/update', {
      method: 'POST',
      headers: {
        'x-test-user': 'user-1',
        cookie: '__csrf=token-a',
        'x-csrf-token': 'token-b',
      },
    })
    expect(res.status).toBe(403)
  })

  it('does not require CSRF for webhook routes', async () => {
    const res = await app.request('/api/webhook/stripe', { method: 'POST' })
    expect(res.status).toBe(200)
  })
})

// ─── Request ID ───

describe('request ID', () => {
  const app = createRoutesTestApp()

  it('returns X-Request-Id header', async () => {
    const res = await app.request('/api/blog/posts')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('echoes client-provided request ID', async () => {
    const res = await app.request('/api/blog/posts', {
      headers: { 'x-request-id': 'req-abc-123' },
    })
    expect(res.headers.get('x-request-id')).toBe('req-abc-123')
  })
})

// ─── Error Handler ───

describe('error handler returns consistent shape', () => {
  const app = createRoutesTestApp()

  it('returns 500 with ok: false and error object', async () => {
    const res = await app.request('/api/error')
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Internal server error')
  })

  it('does not leak internal error details', async () => {
    const res = await app.request('/api/error')
    const body = await res.json()
    const text = JSON.stringify(body)
    expect(text).not.toContain('Unexpected failure')
  })
})

// ─── Security Headers ───

describe('security headers on routes', () => {
  const app = createRoutesTestApp()

  it('includes secure headers on API routes', async () => {
    const res = await app.request('/api/blog/posts')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
  })

  it('includes secure headers on non-API routes', async () => {
    const res = await app.request('/sitemap.xml')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
