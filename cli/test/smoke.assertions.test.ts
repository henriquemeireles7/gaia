import { describe, expect, it } from 'bun:test'

import {
  ASSERTIONS,
  authRoundTrip,
  dashboardLoad,
  healthCheck,
  polarWebhookRoundTrip,
} from '../src/smoke/assertions.ts'
import type { Fetcher } from '../src/providers/types.ts'

const ok = (body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })

const html = (status = 200): Response =>
  new Response('<html></html>', { status, headers: { 'content-type': 'text/html' } })

const stub =
  (factory: (url: string, init?: RequestInit) => Response): Fetcher =>
  (url, init) => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    return Promise.resolve(factory(u, init))
  }

describe('authRoundTrip', () => {
  it('passes when Set-Cookie has HttpOnly + Secure + SameSite=Lax', async () => {
    const result = await authRoundTrip({
      baseUrl: 'https://app.test',
      fetcher: stub(() =>
        ok({}, { 'set-cookie': 'gaia.session=x; HttpOnly; Secure; SameSite=Lax' }),
      ),
    })
    expect(result.ok).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('fails when Set-Cookie is missing entirely', async () => {
    const result = await authRoundTrip({
      baseUrl: 'https://app.test',
      fetcher: stub(() => ok({})),
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E4001_SMOKE_AUTH_NO_COOKIE')
  })

  it('flags missing HttpOnly + Secure flags', async () => {
    const result = await authRoundTrip({
      baseUrl: 'https://app.test',
      fetcher: stub(() => ok({}, { 'set-cookie': 'gaia.session=x; SameSite=Lax' })),
    })
    expect(result.ok).toBe(false)
    expect(result.warnings.some((w) => w.includes('HttpOnly'))).toBe(true)
    expect(result.warnings.some((w) => w.includes('Secure'))).toBe(true)
  })
})

describe('polarWebhookRoundTrip', () => {
  it('passes on 2xx response', async () => {
    const result = await polarWebhookRoundTrip({
      baseUrl: 'https://app.test',
      fetcher: stub(() => ok({ ok: true })),
    })
    expect(result.ok).toBe(true)
  })

  it('fails on 401 (signature rejected)', async () => {
    const result = await polarWebhookRoundTrip({
      baseUrl: 'https://app.test',
      fetcher: stub(() => new Response('', { status: 401 })),
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E4004_SMOKE_POLAR_WEBHOOK_AUTH')
  })
})

describe('dashboardLoad', () => {
  it('passes on 200 HTML', async () => {
    const result = await dashboardLoad({
      baseUrl: 'https://app.test',
      fetcher: stub(() => html(200)),
    })
    expect(result.ok).toBe(true)
  })

  it('fails on 500', async () => {
    const result = await dashboardLoad({
      baseUrl: 'https://app.test',
      fetcher: stub(() => html(500)),
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E4007_SMOKE_DASHBOARD_HTTP')
  })
})

describe('healthCheck', () => {
  it('passes when both /health and /health/ready return 200', async () => {
    const result = await healthCheck({
      baseUrl: 'https://app.test',
      fetcher: stub(() => ok({})),
    })
    expect(result.ok).toBe(true)
  })

  it('fails when /health/ready returns 503', async () => {
    const result = await healthCheck({
      baseUrl: 'https://app.test',
      fetcher: stub((url) => (url.endsWith('/ready') ? new Response('', { status: 503 }) : ok({}))),
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E4009_SMOKE_HEALTH')
  })
})

describe('ASSERTIONS registry', () => {
  it('exports the expected 4 assertions', () => {
    expect(ASSERTIONS).toHaveLength(4)
    const names = ASSERTIONS.map((a) => a.name)
    expect(names).toContain('healthCheck')
    expect(names).toContain('authRoundTrip')
    expect(names).toContain('polarWebhookRoundTrip')
    expect(names).toContain('dashboardLoad')
  })
})
