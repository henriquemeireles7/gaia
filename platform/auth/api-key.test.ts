import { afterEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../types'

// --- Mocks ---

const mockApiKeyRecord = {
  id: 'key-1',
  userId: 'user-1',
  name: 'Test Key',
  keyHash: '', // Will be set dynamically
  role: 'pro',
  expiresAt: null as Date | null,
  revokedAt: null as Date | null,
  lastUsedAt: null as Date | null,
  createdAt: new Date(),
}

const mockSelectResult: Array<typeof mockApiKeyRecord> = []

const mockWhere = mock(() => ({
  limit: mock(() => Promise.resolve(mockSelectResult)),
}))

const mockFrom = mock(() => ({
  where: mockWhere,
}))

const mockSelect = mock(() => ({
  from: mockFrom,
}))

const mockUpdateWhere = mock(() => Promise.resolve())
const mockUpdateSet = mock(() => ({
  where: mockUpdateWhere,
}))
const mockUpdate = mock(() => ({
  set: mockUpdateSet,
}))

mock.module('@/platform/db/client', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}))

mock.module('@/platform/db/schema', () => ({
  apiKeys: {
    keyHash: 'keyHash',
    id: 'id',
  },
  subscriptions: {},
  webhookEvents: {},
  users: {},
  sessions: {},
  accounts: {},
  verifications: {},
  organizations: {},
  memberships: {},
  invitations: {},
}))

// Import after mocks
const { generateApiKey, apiKeyAuth } = await import('./api-key')

// --- Helpers ---

function createApp() {
  const app = new Hono<AppEnv>()
  app.use('/api/*', apiKeyAuth)
  app.get('/api/test', (c) => {
    const user = c.get('user')
    if (user) {
      return c.json({ ok: true, userId: user.id, role: user.role })
    }
    return c.json({ ok: true, userId: null })
  })
  return app
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// --- Tests ---

afterEach(() => {
  mockSelect.mockClear()
  mockFrom.mockClear()
  mockWhere.mockClear()
  mockUpdate.mockClear()
  mockUpdateSet.mockClear()
  mockUpdateWhere.mockClear()
  mockSelectResult.length = 0
})

describe('generateApiKey', () => {
  it('generates a key with sk_ prefix', async () => {
    const { key, hash } = await generateApiKey()
    expect(key).toMatch(/^sk_[a-f0-9]{64}$/)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generates unique keys each time', async () => {
    const key1 = await generateApiKey()
    const key2 = await generateApiKey()
    expect(key1.key).not.toBe(key2.key)
    expect(key1.hash).not.toBe(key2.hash)
  })

  it('produces different hash from raw key', async () => {
    const { key, hash } = await generateApiKey()
    const rawPart = key.slice(3)
    expect(hash).not.toBe(rawPart)
  })
})

describe('apiKeyAuth middleware', () => {
  it('passes through when no Authorization header is present', async () => {
    const app = createApp()
    const res = await app.request('/api/test')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBeNull()
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('passes through for non-sk_ bearer tokens', async () => {
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { Authorization: 'Bearer some-session-token' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBeNull()
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('sets user context with valid API key and correct hash in DB', async () => {
    const app = createApp()
    const { key } = await generateApiKey()
    const hash = await hashKey(key)

    mockSelectResult.push({ ...mockApiKeyRecord, keyHash: hash })

    const res = await app.request('/api/test', {
      headers: { Authorization: `Bearer ${key}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('user-1')
    expect(body.role).toBe('pro')
    expect(mockSelect).toHaveBeenCalled()
  })

  it('returns 401 for API key not found in DB', async () => {
    const app = createApp()
    // mockSelectResult is empty — no record found
    const res = await app.request('/api/test', {
      headers: {
        Authorization: 'Bearer sk_abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
    expect(body.details).toContain('Invalid API key')
  })

  it('returns 401 for revoked API key', async () => {
    const app = createApp()
    const { key } = await generateApiKey()
    const hash = await hashKey(key)

    mockSelectResult.push({
      ...mockApiKeyRecord,
      keyHash: hash,
      revokedAt: new Date('2024-01-01'),
    })

    const res = await app.request('/api/test', {
      headers: { Authorization: `Bearer ${key}` },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
    expect(body.details).toContain('revoked')
  })

  it('returns 400 when both session cookie and API key are present', async () => {
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: {
        Authorization: 'Bearer sk_abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        Cookie: 'better-auth.session_token=abc123',
      },
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('INVALID_REQUEST')
    expect(body.details).toContain('Cannot use both')
  })

  it('returns 401 for expired API key', async () => {
    const app = createApp()
    const { key } = await generateApiKey()
    const hash = await hashKey(key)

    mockSelectResult.push({
      ...mockApiKeyRecord,
      keyHash: hash,
      expiresAt: new Date('2020-01-01'), // expired in the past
    })

    const res = await app.request('/api/test', {
      headers: { Authorization: `Bearer ${key}` },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
    expect(body.details).toContain('expired')
  })
})
