// packages/adapters/payments.ts — Polar payments adapter (vision §Stack)
//
// Capability-named API: callers see `verifyWebhook()` and a `polar`
// client, not vendor-specific Polar method paths. If Polar is replaced
// later, only this file changes.
//
// Webhook signature verification uses Web Crypto, so the adapter is
// independent of any specific @polar-sh/sdk version drift. The exported
// `polar` client is what feature code uses to create checkouts and
// customer portals — call its methods using the SDK's documented shape
// for the version pinned in package.json.

import { ProviderError } from '@gaia/adapters/errors'
import { env } from '@gaia/config'
import { Polar } from '@polar-sh/sdk'

export const polar = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN })

/**
 * Verify a Polar webhook signature against the body. Throws on mismatch.
 * Returns the parsed event payload on success.
 */
export async function verifyWebhook(headers: Headers, body: string): Promise<unknown> {
  const signature = headers.get('polar-signature') ?? headers.get('x-polar-signature')
  if (!signature) {
    throw new ProviderError('polar', 'verifyWebhook', 401, 'missing-signature')
  }
  const expected = await hmacSha256Hex(env.POLAR_WEBHOOK_SECRET, body)
  if (!timingSafeEqual(signature, expected)) {
    throw new ProviderError('polar', 'verifyWebhook', 401, 'signature-mismatch')
  }
  return JSON.parse(body)
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
