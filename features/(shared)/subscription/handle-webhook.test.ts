import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'

// --- Mocks ---

let eventIdCounter = 0

const mockConstructEvent = mock((body: string, _sig: string, _secret: string) => {
  const parsed = JSON.parse(body)
  eventIdCounter++
  return {
    id: parsed.id ?? `evt_test_${eventIdCounter}`,
    type: parsed.type ?? 'checkout.session.completed',
    data: { object: parsed.data ?? {} },
  }
})

const mockSubRetrieve = mock(() =>
  Promise.resolve({
    current_period_end: 1700000000,
    items: { data: [{ price: { id: 'price_monthly' } }] },
  }),
)

mock.module('@/providers/payments', () => ({
  payments: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubRetrieve },
  },
  intervalFromPriceId: mock(() => 'month'),
}))

// Track DB operations
const mockInsertValues: Array<Record<string, unknown>> = []
const mockUpdateSets: Array<Record<string, unknown>> = []

const mockWebhookInsert = mock(() => ({
  values: mock((vals: Record<string, unknown>) => {
    mockInsertValues.push(vals)
    return {
      onConflictDoNothing: mock(() => Promise.resolve({ rowCount: 1 })),
    }
  }),
}))

const mockSubInsert = mock(() => ({
  values: mock((vals: Record<string, unknown>) => {
    mockInsertValues.push(vals)
    return {
      onConflictDoNothing: mock(() => Promise.resolve({ rowCount: 1 })),
    }
  }),
}))

const mockUpdateSet = mock((vals: Record<string, unknown>) => {
  mockUpdateSets.push(vals)
  return {
    where: mock(() => Promise.resolve({ rowCount: 1 })),
  }
})

const mockDbInsert = mock((table: unknown) => {
  // Route to different mock based on table reference
  if (table === 'webhookEvents') return mockWebhookInsert()
  return mockSubInsert()
})

mock.module('@/platform/db/client', () => ({
  db: {
    insert: mockDbInsert,
    update: mock(() => ({
      set: mockUpdateSet,
    })),
  },
}))

mock.module('@/platform/db/schema', () => ({
  subscriptions: { stripeSubscriptionId: 'stripeSubscriptionId' },
  webhookEvents: 'webhookEvents',
}))

// Spread real env to avoid breaking other modules that depend on env keys (e.g. Stripe)
const { env: realEnv } = await import('@/platform/env')
mock.module('@/platform/env', () => ({
  env: {
    ...realEnv,
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    PUBLIC_APP_URL: 'https://example.com',
  },
}))

const mockSendEmail = mock(() => Promise.resolve({ id: 'email_123' }))

mock.module('@/providers/email', () => ({
  sendEmail: mockSendEmail,
}))

// Payment email templates are pure functions (no side effects).
// Use the real implementations — sendEmail is already mocked above
// to prevent actual email sends.

const mockGetUser = mock(
  (): Promise<{ id: string; email: string; name: string } | null> =>
    Promise.resolve({ id: 'user_1', email: 'alice@example.com', name: 'Alice' }),
)

mock.module('./helpers', () => ({
  getUserForSubscription: mockGetUser,
}))

// Import after mocks
const { webhookRoutes } = await import('./handle-webhook')

// Suppress console output during tests
let consoleSpy: ReturnType<typeof spyOn>
let consoleInfoSpy: ReturnType<typeof spyOn>

afterEach(() => {
  mockConstructEvent.mockClear()
  mockSubRetrieve.mockClear()
  mockDbInsert.mockClear()
  mockWebhookInsert.mockClear()
  mockSubInsert.mockClear()
  mockUpdateSet.mockClear()
  mockSendEmail.mockClear()
  mockGetUser.mockClear()
  mockInsertValues.length = 0
  mockUpdateSets.length = 0
  consoleSpy?.mockRestore()
  consoleInfoSpy?.mockRestore()
})

// --- Helpers ---

function postWebhook(eventPayload: Record<string, unknown>) {
  return webhookRoutes.request('/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'sig_test_123',
    },
    body: JSON.stringify(eventPayload),
  })
}

// --- Tests ---

describe('webhook signature validation', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await webhookRoutes.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test' }),
    })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details).toContain('No signature')
  })

  it('returns 400 when signature verification fails', async () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })
    const res = await postWebhook({ type: 'test' })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.details).toContain('Invalid signature')
  })
})

describe('webhook idempotency', () => {
  it('processes first delivery of an event', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      id: 'evt_unique_1',
      type: 'checkout.session.completed',
      data: { mode: 'subscription', subscription: 'sub_1', customer: 'cus_1' },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.received).toBe(true)
  })

  it('returns success but skips processing for duplicate events', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    // Simulate duplicate: onConflictDoNothing returns rowCount 0
    mockDbInsert.mockImplementationOnce(() => ({
      values: mock(() => ({
        onConflictDoNothing: mock(() => Promise.resolve({ rowCount: 0 })),
      })),
    }))

    const res = await postWebhook({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { mode: 'subscription', subscription: 'sub_1', customer: 'cus_1' },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
  })
})

describe('checkout.session.completed', () => {
  it('creates subscription record for subscription-mode checkout', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'checkout.session.completed',
      data: {
        mode: 'subscription',
        subscription: 'sub_new',
        customer: 'cus_new',
      },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)

    // Verify DB insert was called with correct subscription values
    const subInsert = mockInsertValues.find((v) => v.stripeSubscriptionId === 'sub_new')
    expect(subInsert).toBeDefined()
    expect(subInsert!.stripeCustomerId).toBe('cus_new')
    expect(subInsert!.status).toBe('active')
    expect(subInsert!.planInterval).toBe('month')
    expect(subInsert!.currentPeriodEnd).toBeInstanceOf(Date)
  })

  it('skips non-subscription mode sessions', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'checkout.session.completed',
      data: { mode: 'payment', subscription: null, customer: 'cus_1' },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
  })
})

describe('invoice.payment_succeeded', () => {
  it('updates period end and sends renewal email for subscription_cycle', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'invoice.payment_succeeded',
      data: {
        billing_reason: 'subscription_cycle',
        subscription: 'sub_renew',
        amount_paid: 990,
        lines: { data: [{ period: { end: 1700100000 } }] },
      },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect((mockSendEmail.mock.calls[0] as unknown[])[0]).toBe('alice@example.com')
  })

  it('skips non-cycle billing reasons', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'invoice.payment_succeeded',
      data: {
        billing_reason: 'subscription_create',
        subscription: 'sub_new',
      },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips email when no user is linked to subscription', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    mockGetUser.mockImplementationOnce(() => Promise.resolve(null))
    const res = await postWebhook({
      type: 'invoice.payment_succeeded',
      data: {
        billing_reason: 'subscription_cycle',
        subscription: 'sub_orphan',
        lines: { data: [{ period: { end: 1700100000 } }] },
      },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('invoice.payment_failed', () => {
  it('sets status to past_due and sends payment failed email', async () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'invoice.payment_failed',
      data: {
        subscription: 'sub_fail',
        attempt_count: 1,
        amount_due: 990,
      },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)

    // Verify DB update set status to past_due
    const pastDueUpdate = mockUpdateSets.find((v) => v.status === 'past_due')
    expect(pastDueUpdate).toBeDefined()
    expect(pastDueUpdate!.status).toBe('past_due')
  })

  it('skips email when user is not found', async () => {
    consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    mockGetUser.mockImplementationOnce(() => Promise.resolve(null))
    const res = await postWebhook({
      type: 'invoice.payment_failed',
      data: { subscription: 'sub_fail', attempt_count: 2 },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('customer.subscription.updated', () => {
  it('maps active status correctly', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_update',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()

    // Verify the correct status was passed to set()
    const activeUpdate = mockUpdateSets.find((v) => v.status === 'active')
    expect(activeUpdate).toBeDefined()
    expect(activeUpdate!.status).toBe('active')
  })

  it('maps canceled status to cancelled', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_cancel',
        status: 'canceled',
        cancel_at_period_end: false,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)

    // Verify canceled maps to cancelled in DB
    const cancelledUpdate = mockUpdateSets.find((v) => v.status === 'cancelled')
    expect(cancelledUpdate).toBeDefined()
    expect(cancelledUpdate!.status).toBe('cancelled')
  })

  it('maps unpaid status to cancelled', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_unpaid',
        status: 'unpaid',
        cancel_at_period_end: false,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)

    // Verify unpaid maps to cancelled in DB
    const cancelledUpdate = mockUpdateSets.find((v) => v.status === 'cancelled')
    expect(cancelledUpdate).toBeDefined()
    expect(cancelledUpdate!.status).toBe('cancelled')
  })

  it('maps unknown status to past_due', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_weird',
        status: 'trialing',
        cancel_at_period_end: false,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)

    // Verify unknown status maps to past_due in DB
    const pastDueUpdate = mockUpdateSets.find((v) => v.status === 'past_due')
    expect(pastDueUpdate).toBeDefined()
    expect(pastDueUpdate!.status).toBe('past_due')
  })

  it('sends cancellation email when cancel_at_period_end is true', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_cancel_end',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('skips cancellation email when user not found', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    mockGetUser.mockImplementationOnce(() => Promise.resolve(null))
    const res = await postWebhook({
      type: 'customer.subscription.updated',
      data: {
        id: 'sub_cancel_no_user',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: 1700200000,
      },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('customer.subscription.deleted', () => {
  it('sets status to cancelled and sends access revoked email', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'customer.subscription.deleted',
      data: { id: 'sub_deleted' },
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('skips email when user not found', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    mockGetUser.mockImplementationOnce(() => Promise.resolve(null))
    const res = await postWebhook({
      type: 'customer.subscription.deleted',
      data: { id: 'sub_deleted_no_user' },
    })
    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('unhandled event types', () => {
  it('returns received: true for unknown event types', async () => {
    consoleInfoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const res = await postWebhook({
      type: 'charge.refunded',
      data: {},
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.received).toBe(true)
  })
})
