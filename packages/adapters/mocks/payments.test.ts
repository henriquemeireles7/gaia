import { describe, expect, it } from 'bun:test'
import { polarMock, verifyWebhookMock } from './payments'

describe('polarMock', () => {
  it('checkouts.create returns a localhost URL with the customer email encoded', async () => {
    const result = await polarMock.checkouts.create({ customerEmail: 'a+b@example.com' })
    expect(result.id).toMatch(/^mock_checkout_\d+$/)
    expect(result.url).toContain('http://localhost:3000/billing/mock-checkout')
    // `+` in emails must be percent-encoded so the query string is unambiguous.
    expect(result.url).toContain('a%2Bb%40example.com')
  })

  it('customerSessions.create returns a mock portal URL', async () => {
    const result = await polarMock.customerSessions.create({ customerId: 'cust_123' })
    expect(result.url).toBe('http://localhost:3000/billing/mock-portal')
  })

  it('customerPortal.create returns a mock portal URL', async () => {
    const result = await polarMock.customerPortal.create({ customerId: 'cust_123' })
    expect(result.url).toBe('http://localhost:3000/billing/mock-portal')
  })
})

describe('verifyWebhookMock', () => {
  it('returns the parsed JSON body when valid', async () => {
    const body = JSON.stringify({ id: 'evt_42', type: 'subscription.created' })
    const result = (await verifyWebhookMock(new Headers(), body)) as { id: string; type: string }
    expect(result.id).toBe('evt_42')
    expect(result.type).toBe('subscription.created')
  })

  it('returns a synthetic event when the body is not JSON', async () => {
    const result = (await verifyWebhookMock(new Headers(), 'not json')) as { type: string }
    expect(result.type).toBe('mock.event')
  })

  it('accepts any signature header (or none)', async () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'test' })
    const withSig = await verifyWebhookMock(new Headers({ 'polar-signature': 'whatever' }), body)
    const noSig = await verifyWebhookMock(new Headers(), body)
    expect(withSig).toBeDefined()
    expect(noSig).toBeDefined()
  })
})
