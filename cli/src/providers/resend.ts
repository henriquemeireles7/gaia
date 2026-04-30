// cli/src/providers/resend.ts — Resend API key verification.
//
// Hits https://api.resend.com/api-keys with Bearer auth.
// Per F-10: domain-pending is a soft warning, not a fail.

import {
  failure,
  isContentTypeError,
  isEmptyToken,
  isTimeout,
  parseJsonOrThrow,
  timedFetch,
} from './_shared.ts'
import type { ProviderSetupInfo, Verifier } from './types.ts'

const BASE = 'https://api.resend.com'
const PLACEHOLDERS = ['YOUR_RESEND_API_KEY']

export const setupInfo: ProviderSetupInfo = {
  signupUrl: 'https://resend.com/signup',
  tokenPath: 'https://resend.com/api-keys → Create API Key',
  description: 'Resend — transactional email',
}

export const verify: Verifier = async ({ token, fetcher = fetch }) => {
  if (isEmptyToken(token, PLACEHOLDERS))
    return failure('resend', 'E2005_RESEND_EMPTY', 'RESEND_API_KEY is empty.')
  if (!token.startsWith('re_'))
    return failure('resend', 'E2006_RESEND_SHAPE', 'Resend API keys begin with "re_".')

  try {
    const res = await timedFetch(fetcher, `${BASE}/api-keys`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 401 || res.status === 403) {
      return failure(
        'resend',
        'E2007_RESEND_INVALID',
        `Resend rejected the token (HTTP ${res.status}).`,
      )
    }
    if (!res.ok) {
      return failure('resend', 'E2008_RESEND_HTTP', `Unexpected HTTP ${res.status} from Resend.`)
    }
    // Drain the body to confirm Content-Type, then ignore — /api-keys shape varies.
    await parseJsonOrThrow<unknown>(res)
    return {
      ok: true,
      provider: 'resend',
      scopes: ['api-keys:read'],
      warnings: [
        'Domain DNS verification is checked at first /emails send — not blocking TTFD (F-10).',
      ],
      ttfd_blocking: false,
    }
  } catch (cause) {
    if (isTimeout(cause)) {
      return failure(
        'resend',
        'E2009_RESEND_NETWORK',
        'Resend API timed out after 15s — check connectivity.',
      )
    }
    if (isContentTypeError(cause)) {
      return failure(
        'resend',
        'E2008_RESEND_HTTP',
        `Resend returned a non-JSON response: ${(cause as Error).message}`,
      )
    }
    return failure(
      'resend',
      'E2009_RESEND_NETWORK',
      `Resend API unreachable: ${(cause as Error).message}`,
    )
  }
}
