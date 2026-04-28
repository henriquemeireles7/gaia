import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '@/platform/types'

// Test org route validation patterns (no DB needed)
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('organization slug validation', () => {
  it('accepts valid slugs', () => {
    expect(slugRegex.test('my-org')).toBe(true)
    expect(slugRegex.test('myorg')).toBe(true)
    expect(slugRegex.test('my-cool-org-123')).toBe(true)
    expect(slugRegex.test('a')).toBe(true)
  })

  it('rejects invalid slugs', () => {
    expect(slugRegex.test('My-Org')).toBe(false)
    expect(slugRegex.test('my_org')).toBe(false)
    expect(slugRegex.test('-my-org')).toBe(false)
    expect(slugRegex.test('my-org-')).toBe(false)
    expect(slugRegex.test('my--org')).toBe(false)
    expect(slugRegex.test('')).toBe(false)
    expect(slugRegex.test('my org')).toBe(false)
  })
})

describe('org create validation', () => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
  })

  it('accepts valid input', () => {
    const result = schema.safeParse({ name: 'My Org', slug: 'my-org' })
    expect(result.success).toBe(true)
  })

  it('rejects name too short', () => {
    const result = schema.safeParse({ name: 'A', slug: 'my-org' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug', () => {
    const result = schema.safeParse({ name: 'My Org', slug: 'My Org!' })
    expect(result.success).toBe(false)
  })

  it('rejects slug too short', () => {
    const result = schema.safeParse({ name: 'My Org', slug: 'a' })
    expect(result.success).toBe(false)
  })
})

describe('invitation validation', () => {
  const schema = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member'),
  })

  it('accepts valid invitation', () => {
    const result = schema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('member')
    }
  })

  it('accepts admin role', () => {
    const result = schema.safeParse({ email: 'user@example.com', role: 'admin' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = schema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = schema.safeParse({ email: 'user@example.com', role: 'owner' })
    expect(result.success).toBe(false)
  })
})

describe('member role update validation', () => {
  const schema = z.object({
    role: z.enum(['admin', 'member']),
  })

  it('accepts valid roles', () => {
    expect(schema.safeParse({ role: 'admin' }).success).toBe(true)
    expect(schema.safeParse({ role: 'member' }).success).toBe(true)
  })

  it('rejects owner role (cannot promote to owner via API)', () => {
    expect(schema.safeParse({ role: 'owner' }).success).toBe(false)
  })
})

describe('org route protection (middleware chain)', () => {
  function createProtectedApp(hasAuth: boolean) {
    const app = new Hono<AppEnv>()

    if (hasAuth) {
      app.use('*', async (c, next) => {
        c.set('user', {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test',
          role: 'pro',
        } as AppEnv['Variables']['user'])
        return next()
      })
    }

    // Simulate requireAuth check
    app.get('/orgs', async (c) => {
      const user = c.get('user')
      if (!user) {
        return c.json({ ok: false, code: 'UNAUTHORIZED' }, 401)
      }
      return c.json({ ok: true, data: [] })
    })

    return app
  }

  it('allows authenticated requests', async () => {
    const app = createProtectedApp(true)
    const res = await app.request('/orgs')
    expect(res.status).toBe(200)
  })
})
