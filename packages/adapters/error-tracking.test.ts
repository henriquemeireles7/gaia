import { describe, expect, it } from 'bun:test'
import { captureException, captureMessage, flush } from './error-tracking'

describe('error-tracking provider', () => {
  // Without SENTRY_DSN set, all functions should be no-ops (graceful degradation)

  it('captureException does not throw without SENTRY_DSN', async () => {
    const error = new Error('test error')
    await expect(captureException(error)).resolves.toBeUndefined()
  })

  it('captureException accepts context without throwing', async () => {
    const error = new Error('test error')
    await expect(
      captureException(error, {
        userId: 'user-123',
        requestId: 'req-abc',
        method: 'GET',
        path: '/api/test',
      }),
    ).resolves.toBeUndefined()
  })

  it('captureMessage does not throw without SENTRY_DSN', async () => {
    await expect(captureMessage('test message')).resolves.toBeUndefined()
  })

  it('captureMessage accepts level and context', async () => {
    await expect(
      captureMessage('warning message', 'warning', { requestId: 'req-123' }),
    ).resolves.toBeUndefined()
  })

  it('flush does not throw without SENTRY_DSN', async () => {
    await expect(flush()).resolves.toBeUndefined()
  })

  it('flush accepts custom timeout', async () => {
    await expect(flush(1000)).resolves.toBeUndefined()
  })
})
