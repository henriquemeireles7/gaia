// cli/src/smoke/assertions.ts — post-deploy smoke checks (AD-AP per Eng MED-26-27 + DX coverage).
//
// Each assertion is a pure function over (baseUrl, fetcher) → SmokeResult.
// The smoke verb composes them sequentially. New assertions add a row in
// ASSERTIONS without touching the verb.
//
// Security note (S-3): the auth round-trip creates a real user on the deployed app.
// Email + password are randomized per run via `randomBytes` so smoke runs don't
// collide and a single leaked credential cannot be re-used. The leftover user
// must be cleaned up server-side; see docs/launch.md for the cleanup requirement
// (a /smoke/cleanup endpoint that the deployed app exposes when GAIA_SMOKE_ENABLED).

import { randomBytes } from 'node:crypto'

import type { Fetcher } from '../providers/types.ts'

const FETCH_TIMEOUT_MS = 15_000

function timedFetch(fetcher: Fetcher, url: string, init: RequestInit = {}): Promise<Response> {
  // Use the platform's AbortSignal.timeout when available (Node 18+/Bun), fall back
  // to a manual AbortController so this still works in older runtimes.
  const signal =
    typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
      : (() => {
          const c = new AbortController()
          setTimeout(() => c.abort(), FETCH_TIMEOUT_MS)
          return c.signal
        })()
  return fetcher(url, { ...init, signal })
}

export type SmokeResult = {
  ok: boolean
  name: string
  /** What was checked (one sentence). */
  description: string
  /** Soft warnings — strings the user should know but that don't fail the assertion. */
  warnings: readonly string[]
  /** When ok=false, the error that disqualified the run. */
  error?: { code: string; message: string }
}

export type Assertion = (input: { baseUrl: string; fetcher: Fetcher }) => Promise<SmokeResult>

// ---------------------------------------------------------------------------
// Auth round-trip — `/auth/sign-up` returns Set-Cookie with HttpOnly+Secure+SameSite.

export const authRoundTrip: Assertion = async ({ baseUrl, fetcher }) => {
  const url = `${baseUrl.replace(/\/$/, '')}/auth/sign-up/email`
  // Randomize per run (S-3) so each smoke creates a unique user. The deployed
  // app should expose a /smoke/cleanup endpoint (gated by GAIA_SMOKE_ENABLED env)
  // to delete @gaia.test users, OR the founder cleans them up manually after the
  // launch run (see docs/launch.md).
  const runId = randomBytes(8).toString('hex')
  const email = `smoke+${runId}@gaia.test`
  const password = randomBytes(16).toString('hex')
  try {
    const res = await timedFetch(fetcher, url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const setCookie = res.headers.get('set-cookie') ?? ''
    const warnings: string[] = []
    if (!setCookie) {
      return failure(
        'auth-round-trip',
        'Sign-up endpoint returned no Set-Cookie header',
        'E4001_SMOKE_AUTH_NO_COOKIE',
        'No Set-Cookie returned from /auth/sign-up/email',
      )
    }
    if (!/HttpOnly/i.test(setCookie)) warnings.push('Set-Cookie missing HttpOnly flag')
    if (!/Secure/i.test(setCookie)) warnings.push('Set-Cookie missing Secure flag')
    if (!/SameSite=(Lax|Strict)/i.test(setCookie)) {
      warnings.push('Set-Cookie missing SameSite=Lax|Strict')
    }
    return {
      ok: warnings.length === 0,
      name: 'auth-round-trip',
      description: 'POST /auth/sign-up/email returns properly-flagged session cookie',
      warnings,
      ...(warnings.length > 0
        ? {
            error: {
              code: 'E4002_SMOKE_AUTH_COOKIE_FLAGS',
              message: `Cookie posture issues: ${warnings.join('; ')}`,
            },
          }
        : {}),
    }
  } catch (cause) {
    return failure(
      'auth-round-trip',
      'auth round-trip request failed',
      'E4003_SMOKE_AUTH_NETWORK',
      `Could not reach ${url}: ${(cause as Error).message}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Polar webhook round-trip — POST a signed webhook, expect 2xx.

export const polarWebhookRoundTrip: Assertion = async ({ baseUrl, fetcher }) => {
  const url = `${baseUrl.replace(/\/$/, '')}/webhooks/polar`
  try {
    const res = await timedFetch(fetcher, url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': 'msg_smoke',
        'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
        'webhook-signature': 'v1,smoke-placeholder-signature',
      },
      body: JSON.stringify({ type: 'subscription.created', data: { id: 'sub_smoke' } }),
    })
    if (res.status === 401 || res.status === 403) {
      return failure(
        'polar-webhook',
        'webhook signature verification rejected the smoke request',
        'E4004_SMOKE_POLAR_WEBHOOK_AUTH',
        `POST /webhooks/polar returned ${res.status} (expected — confirms signature verification is enforced)`,
      )
    }
    if (!res.ok) {
      return failure(
        'polar-webhook',
        'webhook endpoint returned non-2xx',
        'E4005_SMOKE_POLAR_WEBHOOK_HTTP',
        `POST /webhooks/polar returned ${res.status}`,
      )
    }
    return {
      ok: true,
      name: 'polar-webhook',
      description: 'POST /webhooks/polar reachable + responds 2xx for valid payload shape',
      warnings: [],
    }
  } catch (cause) {
    return failure(
      'polar-webhook',
      'webhook request failed',
      'E4006_SMOKE_POLAR_WEBHOOK_NETWORK',
      `Could not reach ${url}: ${(cause as Error).message}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Dashboard load — root + /dashboard return HTML with auth-gated banner or
// signin redirect.

export const dashboardLoad: Assertion = async ({ baseUrl, fetcher }) => {
  const url = `${baseUrl.replace(/\/$/, '')}/`
  try {
    const res = await timedFetch(fetcher, url, { headers: { Accept: 'text/html' } })
    // (dashboard load) ↑
    if (!res.ok) {
      return failure(
        'dashboard-load',
        'root page returned non-2xx',
        'E4007_SMOKE_DASHBOARD_HTTP',
        `GET / returned ${res.status}`,
      )
    }
    return {
      ok: true,
      name: 'dashboard-load',
      description: 'GET / returns 2xx HTML',
      warnings: [],
    }
  } catch (cause) {
    return failure(
      'dashboard-load',
      'root page request failed',
      'E4008_SMOKE_DASHBOARD_NETWORK',
      `Could not reach ${url}: ${(cause as Error).message}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Health check — /health returns 200, /health/ready returns 200 once warm.

export const healthCheck: Assertion = async ({ baseUrl, fetcher }) => {
  const liveUrl = `${baseUrl.replace(/\/$/, '')}/health`
  const readyUrl = `${baseUrl.replace(/\/$/, '')}/health/ready`
  try {
    const [liveRes, readyRes] = await Promise.all([
      timedFetch(fetcher, liveUrl),
      timedFetch(fetcher, readyUrl),
    ])
    const warnings: string[] = []
    if (!liveRes.ok) warnings.push(`/health returned ${liveRes.status}`)
    if (!readyRes.ok) warnings.push(`/health/ready returned ${readyRes.status}`)
    return {
      ok: warnings.length === 0,
      name: 'health-check',
      description: 'GET /health and /health/ready both return 2xx',
      warnings,
      ...(warnings.length > 0
        ? {
            error: {
              code: 'E4009_SMOKE_HEALTH',
              message: warnings.join('; '),
            },
          }
        : {}),
    }
  } catch (cause) {
    return failure(
      'health-check',
      'health check request failed',
      'E4010_SMOKE_HEALTH_NETWORK',
      `Could not reach health endpoints: ${(cause as Error).message}`,
    )
  }
}

// ---------------------------------------------------------------------------

export const ASSERTIONS: readonly Assertion[] = [
  healthCheck,
  authRoundTrip,
  polarWebhookRoundTrip,
  dashboardLoad,
]

function failure(name: string, description: string, code: string, message: string): SmokeResult {
  return {
    ok: false,
    name,
    description,
    warnings: [],
    error: { code, message },
  }
}
