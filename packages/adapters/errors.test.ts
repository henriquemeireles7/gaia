import { describe, expect, it } from 'bun:test'
import { ProviderError } from './errors'

describe('ProviderError', () => {
  it('creates error with correct message format', () => {
    const err = new ProviderError('stripe', 'createCheckout', 400, { raw: 'data' })
    expect(err.message).toBe('stripe.createCheckout failed (400)')
    expect(err.name).toBe('ProviderError')
  })

  it('stores provider, operation, statusCode, and rawResponse', () => {
    const raw = { error: 'bad request' }
    const err = new ProviderError('resend', 'sendEmail', 422, raw)
    expect(err.provider).toBe('resend')
    expect(err.operation).toBe('sendEmail')
    expect(err.statusCode).toBe(422)
    expect(err.rawResponse).toBe(raw)
  })

  it('is an instance of Error', () => {
    const err = new ProviderError('s3', 'upload', 500, null)
    expect(err).toBeInstanceOf(Error)
  })

  it('has a stack trace', () => {
    const err = new ProviderError('s3', 'upload', 500, null)
    expect(err.stack).toBeDefined()
  })
})
