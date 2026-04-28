import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import type { ErrorCode } from './errors'
import { errors, throwError } from './errors'

describe('errors', () => {
  it('has correct shape for all error codes', () => {
    for (const [key, error] of Object.entries(errors)) {
      expect(error).toHaveProperty('status')
      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('message')
      expect(typeof error.status).toBe('number')
      expect(typeof error.code).toBe('string')
      expect(typeof error.message).toBe('string')
      expect(error.code as string).toBe(key)
    }
  })

  it('has status codes in valid HTTP range', () => {
    for (const error of Object.values(errors)) {
      expect(error.status).toBeGreaterThanOrEqual(400)
      expect(error.status).toBeLessThanOrEqual(599)
    }
  })
})

describe('throwError', () => {
  const app = new Hono()

  app.get('/test/:code', (c) => {
    const code = c.req.param('code') as ErrorCode
    return throwError(c, code)
  })

  app.get('/test-details', (c) => {
    return throwError(c, 'NOT_FOUND', 'User with id 123')
  })

  it('returns correct JSON shape', async () => {
    const res = await app.request('/test/UNAUTHORIZED')
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      details: undefined,
    })
  })

  it('includes details when provided', async () => {
    const res = await app.request('/test-details')
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.details).toBe('User with id 123')
  })

  it('returns 429 for rate limited', async () => {
    const res = await app.request('/test/RATE_LIMITED')
    expect(res.status).toBe(429)
  })

  it('returns 500 for internal error', async () => {
    const res = await app.request('/test/INTERNAL_ERROR')
    expect(res.status).toBe(500)
  })
})
