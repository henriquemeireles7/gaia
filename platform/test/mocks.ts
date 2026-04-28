/**
 * Shared mock factories for ALL test files.
 * Prevents schema mock duplication across feature tests.
 */

/** Full schema mock — prevents Bun mock.module leakage between test files.
 * Every table must be present even if empty, otherwise other test files
 * in the same Bun process get partial schema imports. */
export function mockSchema() {
  return {
    users: { id: 'id', email: 'email', role: 'role' },
    sessions: { id: 'id', userId: 'user_id', token: 'token' },
    accounts: {},
    verifications: {},
    subscriptions: {
      id: 'id',
      userId: 'user_id',
      stripeCustomerId: 'stripe_customer_id',
      stripeSubscriptionId: 'stripe_subscription_id',
      status: 'status',
    },
    webhookEvents: { id: 'id', stripeEventId: 'stripe_event_id' },
    // CUSTOMIZE: Add mocks for your app-specific tables
  }
}
