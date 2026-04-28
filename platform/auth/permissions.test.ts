import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { requirePermission } from './permissions'

function createTestApp(role: string) {
  const app = new Hono<AppEnv>()

  // Fake auth middleware that sets the user
  app.use('*', async (c, next) => {
    c.set('user', {
      id: '1',
      email: 'test@test.com',
      name: 'Test',
      role,
    } as AppEnv['Variables']['user'])
    return next()
  })

  app.get('/public', requirePermission('read:public'), (c) => c.json({ ok: true }))
  app.get('/premium', requirePermission('read:premium'), (c) => c.json({ ok: true }))
  app.get('/write', requirePermission('write:own'), (c) => c.json({ ok: true }))
  app.get('/admin', requirePermission('admin'), (c) => c.json({ ok: true }))

  return app
}

describe('requirePermission', () => {
  describe('free role', () => {
    const app = createTestApp('free')

    it('allows read:public', async () => {
      const res = await app.request('/public')
      expect(res.status).toBe(200)
    })

    it('denies read:premium', async () => {
      const res = await app.request('/premium')
      expect(res.status).toBe(403)
    })

    it('denies write:own', async () => {
      const res = await app.request('/write')
      expect(res.status).toBe(403)
    })

    it('denies admin', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(403)
    })
  })

  describe('pro role', () => {
    const app = createTestApp('pro')

    it('allows read:public', async () => {
      const res = await app.request('/public')
      expect(res.status).toBe(200)
    })

    it('allows read:premium', async () => {
      const res = await app.request('/premium')
      expect(res.status).toBe(200)
    })

    it('allows write:own', async () => {
      const res = await app.request('/write')
      expect(res.status).toBe(200)
    })

    it('denies admin', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(403)
    })
  })

  describe('admin role', () => {
    const app = createTestApp('admin')

    it('allows read:public', async () => {
      const res = await app.request('/public')
      expect(res.status).toBe(200)
    })

    it('allows read:premium', async () => {
      const res = await app.request('/premium')
      expect(res.status).toBe(200)
    })

    it('allows write:own', async () => {
      const res = await app.request('/write')
      expect(res.status).toBe(200)
    })

    it('allows admin', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(200)
    })
  })

  describe('unknown role', () => {
    const app = createTestApp('unknown')

    it('denies all permissions', async () => {
      const res = await app.request('/public')
      expect(res.status).toBe(403)
    })
  })
})
