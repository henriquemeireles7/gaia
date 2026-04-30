// cli/src/providers/railway.ts — Railway token verification.
//
// Hits https://backboard.railway.app/graphql/v2 with the canonical "me" query.

import {
  failure,
  isContentTypeError,
  isEmptyToken,
  isTimeout,
  parseJsonOrThrow,
  timedFetch,
} from './_shared.ts'
import type { ProviderSetupInfo, Verifier } from './types.ts'

const BASE = 'https://backboard.railway.app'
const ME_QUERY = `query { me { id email } }`
const PLACEHOLDERS = ['YOUR_RAILWAY_TOKEN']

export const setupInfo: ProviderSetupInfo = {
  signupUrl: 'https://railway.app/login',
  tokenPath: 'Run: railway login + railway whoami --json',
  description: 'Railway — deployment platform',
}

export const verify: Verifier = async ({ token, fetcher = fetch }) => {
  if (isEmptyToken(token, PLACEHOLDERS))
    return failure('railway', 'E2013_RAILWAY_EMPTY', 'RAILWAY_TOKEN is empty.')

  try {
    const res = await timedFetch(fetcher, `${BASE}/graphql/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: ME_QUERY }),
    })
    if (res.status === 401 || res.status === 403) {
      return failure(
        'railway',
        'E2014_RAILWAY_INVALID',
        `Railway rejected the token (HTTP ${res.status}).`,
      )
    }
    if (!res.ok) {
      return failure('railway', 'E2015_RAILWAY_HTTP', `Unexpected HTTP ${res.status} from Railway.`)
    }
    const body = await parseJsonOrThrow<{
      data?: { me?: { id: string; email: string } }
      errors?: unknown[]
    }>(res)
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return failure(
        'railway',
        'E2016_RAILWAY_GRAPHQL',
        `Railway GraphQL returned errors: ${JSON.stringify(body.errors).slice(0, 200)}`,
      )
    }
    return {
      ok: true,
      provider: 'railway',
      account_id: body.data?.me?.id,
      scopes: ['project:read', 'project:write'],
      warnings: [],
      ttfd_blocking: false,
    }
  } catch (cause) {
    if (isTimeout(cause)) {
      return failure(
        'railway',
        'E2017_RAILWAY_NETWORK',
        'Railway API timed out after 15s — check connectivity.',
      )
    }
    if (isContentTypeError(cause)) {
      return failure(
        'railway',
        'E2015_RAILWAY_HTTP',
        `Railway returned a non-JSON response: ${(cause as Error).message}`,
      )
    }
    return failure(
      'railway',
      'E2017_RAILWAY_NETWORK',
      `Railway API unreachable: ${(cause as Error).message}`,
    )
  }
}
