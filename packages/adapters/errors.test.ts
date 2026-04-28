import { describe, expect, it } from 'bun:test'
import { ProviderError } from './errors'

describe('ProviderError', () => {
  it('formats the message as `provider.operation failed (status)`', () => {
    const err = new ProviderError('polar', 'createCheckout', 400, { raw: 'data' })
    expect(err.message).toBe('polar.createCheckout failed (400)')
    expect(err.name).toBe('ProviderError')
  })

  it('exposes provider, operation, statusCode, rawResponse', () => {
    const raw = { error: 'bad request' }
    const err = new ProviderError('resend', 'sendEmail', 422, raw)
    expect(err.provider).toBe('resend')
    expect(err.operation).toBe('sendEmail')
    expect(err.statusCode).toBe(422)
    expect(err.rawResponse).toBe(raw)
  })

  it('is an instanceof Error and has a stack trace', () => {
    const err = new ProviderError('s3', 'upload', 500, null)
    expect(err).toBeInstanceOf(Error)
    expect(err.stack).toBeDefined()
  })
})
