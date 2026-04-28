import { afterEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../types'

// --- Mocks ---

let mockOrgResult: Record<string, unknown> | undefined
let mockMembershipResult: Record<string, unknown> | undefined

mock.module('@/platform/db/client', () => ({
  db: {
    query: {
      organizations: {
        findFirst: mock(() => Promise.resolve(mockOrgResult)),
      },
      memberships: {
        findFirst: mock(() => Promise.resolve(mockMembershipResult)),
      },
    },
  },
}))

mock.module('@/platform/db/schema', () => ({
  organizations: { slug: 'slug' },
  memberships: { orgId: 'orgId', userId: 'userId' },
}))

// Import after mocks
const { requireOrg, requireOrgRole } = await import('./org-middleware')

// --- Helpers ---

const testUser = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test',
  role: 'pro' as const,
}

function createOrgApp() {
  const app = new Hono<AppEnv>()

  // Simulate authenticated user
  app.use('*', async (c, next) => {
    c.set('user', testUser as AppEnv['Variables']['user'])
    c.set('session', { id: 'sess-1', userId: 'user-1' })
    return next()
  })

  app.get('/org-test', requireOrg, (c) => {
    const org = c.get('org')
    const orgRole = c.get('orgRole')
    return c.json({ ok: true, orgId: org.id, orgRole })
  })

  return app
}

// --- Tests ---

afterEach(() => {
  mockOrgResult = undefined
  mockMembershipResult = undefined
})

describe('requireOrg', () => {
  it('returns error when x-org-slug header is missing', async () => {
    const app = createOrgApp()
    const res = await app.request('/org-test')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details).toContain('x-org-slug')
  })

  it('returns error when org slug is unknown', async () => {
    mockOrgResult = undefined // org not found
    const app = createOrgApp()
    const res = await app.request('/org-test', {
      headers: { 'x-org-slug': 'nonexistent-org' },
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('ORG_NOT_FOUND')
  })

  it('returns error when user is not a member', async () => {
    mockOrgResult = { id: 'org-1', name: 'Test Org', slug: 'test-org', plan: 'free' }
    mockMembershipResult = undefined // no membership
    const app = createOrgApp()
    const res = await app.request('/org-test', {
      headers: { 'x-org-slug': 'test-org' },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('NOT_A_MEMBER')
  })

  it('sets org context when org exists and user is a member', async () => {
    mockOrgResult = { id: 'org-1', name: 'Test Org', slug: 'test-org', plan: 'free' }
    mockMembershipResult = { id: 'mem-1', userId: 'user-1', orgId: 'org-1', role: 'admin' }
    const app = createOrgApp()
    const res = await app.request('/org-test', {
      headers: { 'x-org-slug': 'test-org' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.orgId).toBe('org-1')
    expect(body.orgRole).toBe('admin')
  })
})

describe('requireOrgRole', () => {
  function createRoleApp(currentRole: string) {
    const app = new Hono<AppEnv>()

    app.use('*', async (c, next) => {
      c.set('user', testUser as AppEnv['Variables']['user'])
      c.set('org', {
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        plan: 'free',
      } as AppEnv['Variables']['org'])
      c.set('orgRole', currentRole as AppEnv['Variables']['orgRole'])
      return next()
    })

    app.get('/member', requireOrgRole('member'), (c) => c.json({ ok: true }))
    app.get('/admin', requireOrgRole('admin'), (c) => c.json({ ok: true }))
    app.get('/owner', requireOrgRole('owner'), (c) => c.json({ ok: true }))

    return app
  }

  describe('member role', () => {
    const app = createRoleApp('member')

    it('allows member-level access', async () => {
      const res = await app.request('/member')
      expect(res.status).toBe(200)
    })

    it('denies admin-level access', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(403)
    })

    it('denies owner-level access', async () => {
      const res = await app.request('/owner')
      expect(res.status).toBe(403)
    })
  })

  describe('admin role', () => {
    const app = createRoleApp('admin')

    it('allows member-level access', async () => {
      const res = await app.request('/member')
      expect(res.status).toBe(200)
    })

    it('allows admin-level access', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(200)
    })

    it('denies owner-level access', async () => {
      const res = await app.request('/owner')
      expect(res.status).toBe(403)
    })
  })

  describe('owner role', () => {
    const app = createRoleApp('owner')

    it('allows member-level access', async () => {
      const res = await app.request('/member')
      expect(res.status).toBe(200)
    })

    it('allows admin-level access', async () => {
      const res = await app.request('/admin')
      expect(res.status).toBe(200)
    })

    it('allows owner-level access', async () => {
      const res = await app.request('/owner')
      expect(res.status).toBe(200)
    })
  })
})
