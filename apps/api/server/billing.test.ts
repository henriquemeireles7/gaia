import { describe, expect, test } from 'bun:test'
import { processPolarEvent } from './billing'

// processPolarEvent is the idempotency-bearing helper. These tests cover
// shape validation only — the DB integration is exercised via the live
// app in integration tests once the seed/migrate scripts are in CI.

describe('processPolarEvent — shape guards', () => {
  test('returns silently on missing event id', async () => {
    await expect(processPolarEvent({ type: 'subscription.created' })).resolves.toBeUndefined()
  })

  test('returns silently on non-subscription events', async () => {
    await expect(
      processPolarEvent({ type: 'order.created', id: 'evt_x', data: { id: 'ord_1' } }),
    ).resolves.toBeUndefined()
  })

  test('returns silently when subscription event lacks metadata.user_id', async () => {
    await expect(
      processPolarEvent({
        type: 'subscription.created',
        id: 'evt_y',
        data: { id: 'sub_1', customer_id: 'cus_1', product_id: 'prod_1' },
      }),
    ).resolves.toBeUndefined()
  })
})
