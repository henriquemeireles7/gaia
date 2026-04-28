import { sessions, subscriptions, users } from '@/platform/db/schema'
import { testDb } from './setup'

let counter = 0
function nextId() {
  counter++
  return counter
}

export async function createTestUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const n = nextId()
  const [user] = await testDb
    .insert(users)
    .values({
      email: `test-${n}@example.com`,
      name: `Test User ${n}`,
      role: 'free',
      ...overrides,
    })
    .returning()
  return user
}

export async function createTestSession(userId: string) {
  const [session] = await testDb
    .insert(sessions)
    .values({
      userId,
      token: `test-session-${nextId()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning()
  return session
}

export async function createTestSubscription(
  userId: string,
  overrides: Partial<typeof subscriptions.$inferInsert> = {},
) {
  const n = nextId()
  const [subscription] = await testDb
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: `cus_test_${n}`,
      stripeSubscriptionId: `sub_test_${n}`,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ...overrides,
    })
    .returning()
  return subscription
}

// CUSTOMIZE: Add factories for your app-specific tables
