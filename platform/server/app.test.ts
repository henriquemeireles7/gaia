import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { AppEnv } from '../types'

/**
 * Server integration tests.
 *
 * These test the Hono app patterns (middleware, error handler, health)
 * using a lightweight test app that mirrors the real app structure
 * without requiring database or external service connections.
 */

function createTestApp() {
  const app = new Hono<AppEnv>()

  // Health check (mirrors real app — enhanced version)
  app.get('/health', (c) =>
    c.json({
      status: 'healthy',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: 'test',
    }),
  )

  // Middleware
  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
  )

  // Test routes
  app.get('/api/public', (c) => c.json({ ok: true, data: 'public' }))

  app.get('/api/error', () => {
    throw new Error('Test error')
  })

  // Global error handler (mirrors real app)
  app.onError((_err, c) => {
    return c.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      500,
    )
  })

  return app
}

describe('health endpoint', () => {
  const app = createTestApp()

  it('returns 200 with status healthy', async () => {
    const res = await app.request('/health')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(typeof body.uptime).toBe('number')
  })

  it('includes version and timestamp', async () => {
    const res = await app.request('/health')
    const body = await res.json()
    expect(body.version).toBe('0.1.0')
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.environment).toBe('test')
  })
})

describe('security headers', () => {
  const app = createTestApp()

  it('includes secure headers', async () => {
    const res = await app.request('/api/public')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
  })
})

describe('CORS', () => {
  const app = createTestApp()

  it('allows requests from configured origin', async () => {
    const res = await app.request('/api/public', {
      headers: { Origin: 'http://localhost:3000' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('rejects requests from unknown origins', async () => {
    const res = await app.request('/api/public', {
      headers: { Origin: 'http://evil.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).not.toBe('http://evil.com')
  })
})

describe('global error handler', () => {
  const app = createTestApp()

  it('returns 500 with consistent error shape', async () => {
    const res = await app.request('/api/error')
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Internal server error')
  })

  it('does not leak error details to client', async () => {
    const res = await app.request('/api/error')
    const body = await res.json()
    const text = JSON.stringify(body)
    expect(text).not.toContain('Test error')
  })
})

describe('404 handling', () => {
  const app = createTestApp()

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent')
    expect(res.status).toBe(404)
  })
})
