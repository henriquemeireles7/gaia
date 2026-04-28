import { afterEach, describe, expect, it, mock } from 'bun:test'

// --- Mocks ---

const mockUserFindFirst = mock(
  (): Promise<{ id: string; email: string; name: string; createdAt: Date } | null> =>
    Promise.resolve({
      id: 'user_1',
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: new Date('2024-01-15'),
    }),
)

const mockSubsFindMany = mock(() =>
  Promise.resolve([
    {
      status: 'active',
      currentPeriodEnd: new Date('2025-01-15'),
      createdAt: new Date('2024-01-15'),
    },
  ]),
)

const mockDeleteWhere = mock(() => Promise.resolve({ rowCount: 1 }))
const mockDelete = mock(() => ({ where: mockDeleteWhere }))

const mockMembershipsFindMany = mock(
  (): Promise<Array<{ orgId: string; role: string }>> => Promise.resolve([]),
)

const mockCancelSubscription = mock(() => Promise.resolve())

mock.module('@/platform/db/client', () => ({
  db: {
    query: {
      users: { findFirst: mockUserFindFirst },
      subscriptions: { findMany: mockSubsFindMany },
      memberships: { findMany: mockMembershipsFindMany },
    },
    delete: mockDelete,
  },
}))

mock.module('@/platform/db/schema', () => ({
  subscriptions: {
    userId: 'userId',
    stripeSubscriptionId: 'stripeSubscriptionId',
    status: 'status',
  },
  users: { id: 'id' },
  memberships: { userId: 'userId', orgId: 'orgId', role: 'role' },
}))

mock.module('@/providers/payments', () => ({
  payments: {
    subscriptions: { cancel: mockCancelSubscription },
  },
}))

// Import after mocks
const { exportUserData, deleteUserAccount } = await import('./privacy')

afterEach(() => {
  mockUserFindFirst.mockClear()
  mockSubsFindMany.mockClear()
  mockMembershipsFindMany.mockClear()
  mockCancelSubscription.mockClear()
  mockDelete.mockClear()
  mockDeleteWhere.mockClear()
})

// --- Tests ---

describe('exportUserData', () => {
  it('returns user profile, subscriptions, and export timestamp', async () => {
    const data = await exportUserData('user_1')
    expect(data.user).toEqual({
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: new Date('2024-01-15'),
    })
    expect(data.subscriptions).toHaveLength(1)
    expect(data.subscriptions[0]!.status).toBe('active')
    expect(data.exportedAt).toBeDefined()
    expect(typeof data.exportedAt).toBe('string')
  })

  it('does not include sensitive fields like password or tokens', async () => {
    const data = await exportUserData('user_1')
    const json = JSON.stringify(data)
    expect(json).not.toContain('password')
    expect(json).not.toContain('token')
    expect(json).not.toContain('hash')
  })

  it('returns null user when user is not found', async () => {
    mockUserFindFirst.mockImplementationOnce(() => Promise.resolve(null))
    const data = await exportUserData('nonexistent')
    expect(data.user).toBeNull()
  })

  it('returns empty subscriptions array when user has none', async () => {
    mockSubsFindMany.mockImplementationOnce(() => Promise.resolve([]))
    const data = await exportUserData('user_1')
    expect(data.subscriptions).toEqual([])
  })

  it('includes exportedAt as ISO string', async () => {
    const before = new Date().toISOString()
    const data = await exportUserData('user_1')
    const after = new Date().toISOString()
    expect(data.exportedAt >= before).toBe(true)
    expect(data.exportedAt <= after).toBe(true)
  })

  it('strips subscription fields to only safe fields', async () => {
    mockSubsFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        {
          id: 'sub_1',
          stripeCustomerId: 'cus_secret',
          stripeSubscriptionId: 'sub_secret',
          status: 'active',
          currentPeriodEnd: new Date('2025-06-01'),
          createdAt: new Date('2024-06-01'),
          userId: 'user_1',
        },
      ]),
    )
    const data = await exportUserData('user_1')
    const subJson = JSON.stringify(data.subscriptions)
    expect(subJson).not.toContain('cus_secret')
    expect(subJson).not.toContain('sub_secret')
    expect(data.subscriptions[0]!.status).toBe('active')
  })
})

describe('deleteUserAccount', () => {
  it('deletes subscriptions then user and returns { deleted: true }', async () => {
    const result = await deleteUserAccount('user_1')
    expect(result).toEqual({ deleted: true })
    // delete called twice: once for subscriptions, once for users
    expect(mockDelete).toHaveBeenCalledTimes(2)
  })

  it('deletes subscriptions before deleting user (cascade order)', async () => {
    const tablesDeleted: unknown[] = []
    ;(
      mockDelete as { mockImplementation: (fn: (...args: unknown[]) => unknown) => void }
    ).mockImplementation((table: unknown) => {
      tablesDeleted.push(table)
      return { where: mockDeleteWhere }
    })

    await deleteUserAccount('user_1')
    // First call should be subscriptions table (has userId field)
    expect(tablesDeleted[0]).toHaveProperty('userId')
    // Second call should be users table (has id field)
    expect(tablesDeleted[1]).toHaveProperty('id')
  })
})
