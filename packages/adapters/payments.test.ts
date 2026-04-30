import { beforeAll, describe, expect, it } from 'bun:test'
import { env } from '@gaia/config'
import { verifyWebhook } from './payments'

// Force live mode — these tests assert the real HMAC verification.
// Mock-mode behavior is tested in mocks/payments.test.ts.
beforeAll(() => {
  ;(env as { VENDOR_MODE: string }).VENDOR_MODE = 'live'
})

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('verifyWebhook (Polar)', () => {
  it('rejects when signature header is missing', async () => {
    await expect(verifyWebhook(new Headers(), '{}')).rejects.toMatchObject({
      provider: 'polar',
      operation: 'verifyWebhook',
      statusCode: 401,
    })
  })

  it('rejects when signature does not match', async () => {
    const headers = new Headers({ 'polar-signature': 'deadbeef' })
    await expect(verifyWebhook(headers, '{"type":"sub.created"}')).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns parsed body when signature is valid', async () => {
    const body = '{"type":"sub.created","id":"sub_1"}'
    const sig = await sign(process.env.POLAR_WEBHOOK_SECRET ?? 'polar_whsec_test', body)
    const headers = new Headers({ 'polar-signature': sig })
    const event = await verifyWebhook(headers, body)
    expect(event).toEqual({ type: 'sub.created', id: 'sub_1' })
  })
})
