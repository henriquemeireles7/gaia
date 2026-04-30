// cli/src/providers/_shared.ts — DRY helpers shared across all four provider verifiers.
//
// Per /review #13: all four files (polar/resend/neon/railway) had the same
// shape — isEmpty check, failure() builder, fetch timeout, Content-Type guard
// before res.json(). This module is now the single source of truth.

import type { Fetcher, VerifyResult } from './types.ts'

const PROVIDER_FETCH_TIMEOUT_MS = 15_000

/** Build a VerifyResult.failure with consistent shape (#13). */
export function failure(
  provider: VerifyResult['provider'],
  code: string,
  message: string,
): VerifyResult {
  return {
    ok: false,
    provider,
    scopes: [],
    warnings: [],
    ttfd_blocking: true,
    error: { code, message },
  }
}

/** Empty-token check (#13). Treats whitespace + the placeholder values as empty. */
export function isEmptyToken(token: string, placeholders: readonly string[] = []): boolean {
  if (!token || token.trim() === '') return true
  return placeholders.includes(token)
}

/**
 * Parse a JSON response body, but only after confirming the Content-Type is
 * actually JSON (#28). HTML error pages on 200 (Cloudflare interstitials,
 * proxy login pages) used to throw SyntaxError that got mis-classified as
 * NETWORK errors.
 */
export async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.toLowerCase().includes('json')) {
    throw new Error(
      `expected JSON response, got content-type "${ct || '(none)'}" (status ${res.status})`,
    )
  }
  return (await res.json()) as T
}

export function timedFetch(
  fetcher: Fetcher,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const signal =
    typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS)
      : (() => {
          const c = new AbortController()
          setTimeout(() => c.abort(), PROVIDER_FETCH_TIMEOUT_MS)
          return c.signal
        })()
  return fetcher(url, { ...init, signal })
}

/** True when an error from `await fetcher(...)` is an abort/timeout. */
export function isTimeout(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.name === 'AbortError' || err.name === 'TimeoutError' || err.message.includes('aborted')
}

/** True when an error from `await res.json()` is a content-type / parse miss (#28). */
export function isContentTypeError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('expected JSON response')
}
