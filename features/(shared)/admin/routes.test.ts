import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { requirePermission } from '@/platform/auth/permissions'
import type { AppEnv } from '@/platform/types'

// Test admin route protection patterns (no DB needed)
function createTestApp(role: string) {
  const app = new Hono<AppEnv>()

  // Fake auth middleware
  app.use('*', async (c, next) => {
    c.set('user', {
      id: 'user-1',
      email: 'admin@test.com',
      name: 'Admin',
      role,
    } as AppEnv['Variables']['user'])
    c.set('session', { id: 'session-1', userId: 'user-1' })
    return next()
  })

  // Admin-protected route
  app.get('/admin/stats', requirePermission('admin'), (c) =>
    c.json({ ok: true, data: { totalUsers: 100 } }),
  )

  app.get('/admin/users', requirePermission('admin'), (c) => c.json({ ok: true, data: [] }))

  app.patch('/admin/users/:id', requirePermission('admin'), (c) => c.json({ ok: true }))

  app.delete('/admin/users/:id', requirePermission('admin'), (c) => c.json({ ok: true }))

  return app
}

describe('admin route protection', () => {
  describe('admin role', () => {
    const app = createTestApp('admin')

    it('allows GET /admin/stats', async () => {
      const res = await app.request('/admin/stats')
      expect(res.status).toBe(200)
    })

    it('allows GET /admin/users', async () => {
      const res = await app.request('/admin/users')
      expect(res.status).toBe(200)
    })

    it('allows PATCH /admin/users/:id', async () => {
      const res = await app.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'pro' }),
      })
      expect(res.status).toBe(200)
    })

    it('allows DELETE /admin/users/:id', async () => {
      const res = await app.request('/admin/users/user-2', {
        method: 'DELETE',
      })
      expect(res.status).toBe(200)
    })
  })

  describe('pro role', () => {
    const app = createTestApp('pro')

    it('denies GET /admin/stats', async () => {
      const res = await app.request('/admin/stats')
      expect(res.status).toBe(403)
    })

    it('denies GET /admin/users', async () => {
      const res = await app.request('/admin/users')
      expect(res.status).toBe(403)
    })
  })

  describe('free role', () => {
    const app = createTestApp('free')

    it('denies all admin routes', async () => {
      const res = await app.request('/admin/stats')
      expect(res.status).toBe(403)
    })
  })
})

describe('admin response shapes', () => {
  const app = createTestApp('admin')

  it('stats returns expected shape', async () => {
    const res = await app.request('/admin/stats')
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveProperty('totalUsers')
  })

  it('users list returns expected shape', async () => {
    const res = await app.request('/admin/users')
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})
