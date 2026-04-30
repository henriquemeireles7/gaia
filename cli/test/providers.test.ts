import { describe, expect, it } from 'bun:test'

import { parseEnvFile } from '../src/providers/index.ts'
import * as neon from '../src/providers/neon.ts'
import * as polar from '../src/providers/polar.ts'
import * as railway from '../src/providers/railway.ts'
import * as resend from '../src/providers/resend.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('parseEnvFile', () => {
  it('parses KEY=value pairs', () => {
    expect(parseEnvFile('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('strips surrounding double quotes', () => {
    expect(parseEnvFile('FOO="bar baz"')).toEqual({ FOO: 'bar baz' })
  })

  it('strips surrounding single quotes', () => {
    expect(parseEnvFile("FOO='bar baz'")).toEqual({ FOO: 'bar baz' })
  })

  it('skips comments and blank lines', () => {
    expect(parseEnvFile('# comment\n\nFOO=bar\n# another')).toEqual({ FOO: 'bar' })
  })

  it('preserves = inside values (e.g. base64 padding)', () => {
    expect(parseEnvFile('TOKEN=abc=def==')).toEqual({ TOKEN: 'abc=def==' })
  })
})

describe('polar.verify', () => {
  it('rejects empty token with E2001', async () => {
    const result = await polar.verify({ token: '', fetcher: fetch })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E2001_POLAR_EMPTY')
    expect(result.ttfd_blocking).toBe(true)
  })

  it('rejects 401 with E2002', async () => {
    const result = await polar.verify({
      token: 'polar_at_test_xxx',
      fetcher: () => Promise.resolve(jsonResponse({}, 401)),
    })
    expect(result.error?.code).toBe('E2002_POLAR_INVALID')
  })

  it('returns ok with account_id on success', async () => {
    const result = await polar.verify({
      token: 'polar_at_test_xxx',
      fetcher: () =>
        Promise.resolve(jsonResponse({ id: 'usr_abc', organizations: [{ id: 'org_1' }] })),
    })
    expect(result.ok).toBe(true)
    expect(result.account_id).toBe('usr_abc')
    expect(result.ttfd_blocking).toBe(false)
  })

  it('emits "merchant verification still pending" warning when no organizations', async () => {
    const result = await polar.verify({
      token: 'polar_at_test_xxx',
      fetcher: () => Promise.resolve(jsonResponse({ id: 'usr_abc', organizations: [] })),
    })
    expect(result.warnings.some((w) => w.includes('merchant verification'))).toBe(true)
    expect(result.ttfd_blocking).toBe(false) // F-10
  })
})

describe('resend.verify', () => {
  it('rejects empty token', async () => {
    const result = await resend.verify({ token: '', fetcher: fetch })
    expect(result.error?.code).toBe('E2005_RESEND_EMPTY')
  })

  it('rejects wrong-shape token (must start with re_)', async () => {
    const result = await resend.verify({ token: 'sk_wrong', fetcher: fetch })
    expect(result.error?.code).toBe('E2006_RESEND_SHAPE')
  })

  it('returns ok with domain-pending soft warning', async () => {
    const result = await resend.verify({
      token: 're_test_xxxxxxxxxxxxxxxxxxxxxxxxx',
      fetcher: () => Promise.resolve(jsonResponse({ data: [] })),
    })
    expect(result.ok).toBe(true)
    expect(result.warnings.some((w) => w.includes('Domain DNS'))).toBe(true)
    expect(result.ttfd_blocking).toBe(false)
  })
})

describe('neon.verify (parses URL)', () => {
  it('rejects empty token', async () => {
    const result = await neon.verify({ token: '' })
    expect(result.error?.code).toBe('E2010_NEON_EMPTY')
  })

  it('rejects wrong-protocol URL', async () => {
    const result = await neon.verify({ token: 'mysql://x:y@host/db' })
    expect(result.error?.code).toBe('E2011_NEON_SHAPE')
  })

  it('accepts a Neon postgres URL', async () => {
    const result = await neon.verify({
      token: 'postgresql://u:p@ep-x.neon.tech/mydb?sslmode=require',
    })
    expect(result.ok).toBe(true)
    expect(result.account_id).toBe('mydb')
    expect(result.warnings).toHaveLength(0)
  })

  it('warns when sslmode is missing', async () => {
    const result = await neon.verify({ token: 'postgresql://u:p@ep-x.neon.tech/mydb' })
    expect(result.warnings.some((w) => w.includes('sslmode'))).toBe(true)
  })

  it('warns when host is not Neon', async () => {
    const result = await neon.verify({
      token: 'postgresql://u:p@localhost:5432/mydb?sslmode=disable',
    })
    expect(result.warnings.some((w) => w.includes('not a Neon endpoint'))).toBe(true)
  })
})

describe('railway.verify', () => {
  it('rejects empty token', async () => {
    const result = await railway.verify({ token: '', fetcher: fetch })
    expect(result.error?.code).toBe('E2013_RAILWAY_EMPTY')
  })

  it('rejects 401', async () => {
    const result = await railway.verify({
      token: 'railway_xxxxxxxx',
      fetcher: () => Promise.resolve(jsonResponse({}, 401)),
    })
    expect(result.error?.code).toBe('E2014_RAILWAY_INVALID')
  })

  it('returns ok with account_id on GraphQL success', async () => {
    const result = await railway.verify({
      token: 'railway_xxxxxxxx',
      fetcher: () =>
        Promise.resolve(jsonResponse({ data: { me: { id: 'usr_rly', email: 'x@y.z' } } })),
    })
    expect(result.ok).toBe(true)
    expect(result.account_id).toBe('usr_rly')
  })

  it('rejects GraphQL errors', async () => {
    const result = await railway.verify({
      token: 'railway_xxxxxxxx',
      fetcher: () => Promise.resolve(jsonResponse({ errors: [{ message: 'Invalid token' }] })),
    })
    expect(result.error?.code).toBe('E2016_RAILWAY_GRAPHQL')
  })
})

// ----------------------------------------------------------------------------
// 5xx + network + non-JSON paths.
// Every provider's failure() builder must produce a typed code without
// throwing — even when the upstream returns garbage. These tests pin that
// contract so a future refactor can't silently downgrade error reporting.

describe('5xx upstream', () => {
  it('polar surfaces E2003 on 503', async () => {
    const result = await polar.verify({
      token: 'polar_at_test_xxx',
      fetcher: () => Promise.resolve(jsonResponse({ message: 'down' }, 503)),
    })
    expect(result.error?.code).toBe('E2003_POLAR_HTTP')
  })

  it('resend surfaces E2008 on 502', async () => {
    const result = await resend.verify({
      token: 're_test_xxxxxxxxxxxxxxxxxxxxxxxxx',
      fetcher: () => Promise.resolve(jsonResponse({}, 502)),
    })
    expect(result.error?.code).toBe('E2008_RESEND_HTTP')
  })

  it('railway surfaces E2015 on 504', async () => {
    const result = await railway.verify({
      token: 'railway_xxxxxxxx',
      fetcher: () => Promise.resolve(jsonResponse({}, 504)),
    })
    expect(result.error?.code).toBe('E2015_RAILWAY_HTTP')
  })
})

const networkErr = () => Promise.reject(new TypeError('fetch failed: ECONNRESET'))

describe('network errors', () => {
  it('polar surfaces E2004', async () => {
    const result = await polar.verify({ token: 'polar_at_test_xxx', fetcher: networkErr })
    expect(result.error?.code).toBe('E2004_POLAR_NETWORK')
  })

  it('resend surfaces E2009', async () => {
    const result = await resend.verify({
      token: 're_test_xxxxxxxxxxxxxxxxxxxxxxxxx',
      fetcher: networkErr,
    })
    expect(result.error?.code).toBe('E2009_RESEND_NETWORK')
  })

  it('railway surfaces E2017', async () => {
    const result = await railway.verify({ token: 'railway_xxxxxxxx', fetcher: networkErr })
    expect(result.error?.code).toBe('E2017_RAILWAY_NETWORK')
  })
})

// A 2xx HTML response (proxy login page intercepting the call) — provider
// must NOT crash in res.json(); must surface a typed HTTP error.
const htmlOk = () =>
  Promise.resolve(
    new Response('<html>captive portal</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  )

describe('non-JSON response (#28)', () => {
  it('polar refuses HTML at the Content-Type check', async () => {
    const result = await polar.verify({ token: 'polar_at_test_xxx', fetcher: htmlOk })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E2003_POLAR_HTTP')
  })

  it('railway refuses HTML at the Content-Type check', async () => {
    const result = await railway.verify({ token: 'railway_xxxxxxxx', fetcher: htmlOk })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('E2015_RAILWAY_HTTP')
  })
})
