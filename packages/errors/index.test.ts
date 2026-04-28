import { describe, expect, it } from 'bun:test'
import { AppError, type ErrorCode, errors } from '.'

describe('errors catalog', () => {
  it('every entry has a numeric status, string code, and string message', () => {
    for (const [key, entry] of Object.entries(errors)) {
      expect(typeof entry.status).toBe('number')
      expect(typeof entry.code).toBe('string')
      expect(typeof entry.message).toBe('string')
      expect(entry.code as string).toBe(key)
    }
  })

  it('status codes are in valid HTTP error range', () => {
    for (const entry of Object.values(errors)) {
      expect(entry.status).toBeGreaterThanOrEqual(400)
      expect(entry.status).toBeLessThanOrEqual(599)
    }
  })
})

describe('AppError', () => {
  it('exposes code, status, details', () => {
    const err = new AppError('UNAUTHORIZED')
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.status).toBe(401)
    expect(err.details).toBeUndefined()
  })

  it('captures details when provided', () => {
    const err = new AppError('NOT_FOUND', 'user 42')
    expect(err.details).toBe('user 42')
  })

  it('serializes to the v1 wire shape', () => {
    const err = new AppError('RATE_LIMITED', 'limit=10/m')
    expect(err.toJSON()).toEqual({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: 'limit=10/m',
    })
  })

  it('omits details from JSON when not provided', () => {
    const err = new AppError('INTERNAL_ERROR')
    expect(err.toJSON()).toEqual({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    })
  })

  it('is instanceof Error', () => {
    const err = new AppError('FORBIDDEN' satisfies ErrorCode)
    expect(err).toBeInstanceOf(Error)
  })
})
