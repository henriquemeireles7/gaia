// cli/src/providers/polar.ts — Polar token verification.
//
// Hits https://api.polar.sh/v1/users/me with Bearer auth.
// Per F-10: pending merchant verification is a soft warning, not a fail.

import {
  failure,
  isContentTypeError,
  isEmptyToken,
  isTimeout,
  parseJsonOrThrow,
  timedFetch,
} from './_shared.ts'
import type { ProviderSetupInfo, Verifier } from './types.ts'

const BASE = 'https://api.polar.sh'
const PLACEHOLDERS = ['YOUR_POLAR_ACCESS_TOKEN']

export const setupInfo: ProviderSetupInfo = {
  signupUrl: 'https://polar.sh/signup',
  tokenPath: 'https://polar.sh/dashboard → Settings → Access Tokens',
  description: 'Polar — payments (merchant-of-record, indie-friendly)',
}

export const verify: Verifier = async ({ token, fetcher = fetch }) => {
  if (isEmptyToken(token, PLACEHOLDERS))
    return failure('polar', 'E2001_POLAR_EMPTY', 'POLAR_ACCESS_TOKEN is empty.')

  try {
    const res = await timedFetch(fetcher, `${BASE}/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 401 || res.status === 403) {
      return failure(
        'polar',
        'E2002_POLAR_INVALID',
        `Polar rejected the token (HTTP ${res.status}).`,
      )
    }
    if (!res.ok) {
      return failure('polar', 'E2003_POLAR_HTTP', `Unexpected HTTP ${res.status} from Polar.`)
    }
    const body = await parseJsonOrThrow<{ id?: string; organizations?: unknown[] }>(res)
    const warnings: string[] = []
    if (token.includes('_test_') || token.includes('_sandbox_')) {
      warnings.push('Polar token is test/sandbox mode — ok for v1.0 (F-10).')
    }
    if (Array.isArray(body.organizations) && body.organizations.length === 0) {
      warnings.push('No Polar organization yet — merchant verification still pending.')
    }
    return {
      ok: true,
      provider: 'polar',
      account_id: body.id,
      scopes: ['user', 'organization:read'],
      warnings,
      ttfd_blocking: false,
    }
  } catch (cause) {
    if (isTimeout(cause)) {
      return failure(
        'polar',
        'E2004_POLAR_NETWORK',
        'Polar API timed out after 15s — check connectivity, possibly behind a corporate proxy.',
      )
    }
    if (isContentTypeError(cause)) {
      return failure(
        'polar',
        'E2003_POLAR_HTTP',
        `Polar returned a non-JSON response: ${(cause as Error).message}`,
      )
    }
    return failure(
      'polar',
      'E2004_POLAR_NETWORK',
      `Polar API unreachable: ${(cause as Error).message}`,
    )
  }
}
