import { afterEach, describe, expect, it, mock } from 'bun:test'

// --- Mocks ---

const mockSessionRetrieve = mock(
  (): Promise<{
    status: string
    customer?: string
    subscription?: string
    customer_details?: { email: string } | null
  }> =>
    Promise.resolve({
      status: 'complete',
      customer: 'cus_123',
      subscription: 'sub_456',
      customer_details: { email: 'alice@example.com' },
    }),
)

const mockSubRetrieve = mock(() => Promise.resolve({ current_period_end: 1700000000 }))

mock.module('@/providers/payments', () => ({
  payments: {
    checkout: { sessions: { retrieve: mockSessionRetrieve } },
    subscriptions: { retrieve: mockSubRetrieve },
  },
}))

const mockInsert = mock(() => ({
  values: mock(() => ({
    onConflictDoNothing: mock(() => Promise.resolve({ rowCount: 1 })),
  })),
}))

const mockUpdate = mock(() => ({
  set: mock(() => ({
    where: mock(() => Promise.resolve({ rowCount: 1 })),
  })),
}))

const mockFindFirst = mock(
  (): Promise<{ userId: string | null }> => Promise.resolve({ userId: null }),
)

mock.module('@/platform/db/client', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    query: {
      subscriptions: { findFirst: mockFindFirst },
    },
  },
}))

mock.module('@/platform/db/schema', () => ({
  subscriptions: { stripeSubscriptionId: 'stripeSubscriptionId' },
  users: { id: 'id' },
}))

mock.module('@/platform/env', () => ({
  env: { PUBLIC_APP_URL: 'https://example.com' },
}))

const mockSignUp = mock(() => Promise.resolve({ user: { id: 'user_789' } }))

mock.module('@/platform/auth/config', () => ({
  auth: {
    api: { signUpEmail: mockSignUp },
  },
}))

// Import after mocks
const { completeCheckoutRoutes } = await import('./complete-checkout')

afterEach(() => {
  mockSessionRetrieve.mockClear()
  mockSubRetrieve.mockClear()
  mockInsert.mockClear()
  mockUpdate.mockClear()
  mockFindFirst.mockClear()
  mockSignUp.mockClear()
})

// --- Helpers ---

function postComplete(body: Record<string, string>) {
  return completeCheckoutRoutes.request('/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  sessionId: 'cs_test_123',
  name: 'Alice',
  email: 'alice@example.com',
  password: 'password123',
}

// --- Tests ---

describe('GET /session-info', () => {
  it('returns customer email for a complete session', async () => {
    const res = await completeCheckoutRoutes.request('/session-info?session_id=cs_123')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.email).toBe('alice@example.com')
  })

  it('returns 400 when session_id is missing', async () => {
    const res = await completeCheckoutRoutes.request('/session-info')
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when session is not complete', async () => {
    mockSessionRetrieve.mockImplementationOnce(() =>
      Promise.resolve({ status: 'open', customer_details: null }),
    )
    const res = await completeCheckoutRoutes.request('/session-info?session_id=cs_123')
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
  })

  it('returns 400 when Stripe throws', async () => {
    mockSessionRetrieve.mockImplementationOnce(() => Promise.reject(new Error('Invalid session')))
    const res = await completeCheckoutRoutes.request('/session-info?session_id=cs_bad')
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('Invalid session_id')
  })
})

describe('POST /complete', () => {
  it('creates account and returns redirect on success', async () => {
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.redirectUrl).toBe('/dashboard')
  })

  it('validates request body — rejects missing fields', async () => {
    const res = await postComplete({ sessionId: 'cs_123' })
    expect(res.status).toBe(400)
  })

  it('validates request body — rejects invalid email', async () => {
    const res = await postComplete({ ...validBody, email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('validates request body — rejects short password', async () => {
    const res = await postComplete({ ...validBody, password: '123' })
    expect(res.status).toBe(400)
  })

  it('returns error when session is not complete', async () => {
    mockSessionRetrieve.mockImplementationOnce(() => Promise.resolve({ status: 'open' }))
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('not complete')
  })

  it('returns error when Stripe session retrieval fails', async () => {
    mockSessionRetrieve.mockImplementationOnce(() => Promise.reject(new Error('expired')))
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('Invalid or expired')
  })

  it('returns error when email does not match Stripe session', async () => {
    mockSessionRetrieve.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'complete',
        customer: 'cus_123',
        subscription: 'sub_456',
        customer_details: { email: 'other@example.com' },
      }),
    )
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('Email must match')
  })

  it('returns error when customer or subscription is missing', async () => {
    mockSessionRetrieve.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'complete',
        customer: '',
        subscription: '',
        customer_details: { email: 'alice@example.com' },
      }),
    )
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.details).toContain('Missing Stripe customer')
  })

  it('is idempotent — returns error when subscription already linked to a user', async () => {
    mockFindFirst.mockImplementationOnce(() => Promise.resolve({ userId: 'existing_user' }))
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('already created')
  })

  it('handles race condition — atomic link returns rowCount 0', async () => {
    // First findFirst returns null userId (good), but update returns rowCount 0 (race)
    mockFindFirst.mockImplementationOnce(() => Promise.resolve({ userId: null }))
    mockUpdate.mockImplementationOnce(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve({ rowCount: 0 })),
      })),
    }))
    const res = await postComplete(validBody)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('already created')
  })

  it('normalizes email comparison (case + whitespace)', async () => {
    mockSessionRetrieve.mockImplementationOnce(() =>
      Promise.resolve({
        status: 'complete',
        customer: 'cus_123',
        subscription: 'sub_456',
        customer_details: { email: '  ALICE@EXAMPLE.COM  ' },
      }),
    )
    // Email in body is lowercase — should match after normalization
    const res = await postComplete({ ...validBody, email: 'alice@example.com' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})
