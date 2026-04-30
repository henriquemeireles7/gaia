import { describe, expect, it } from 'bun:test'

import { BACKOFF_MS, MAX_ATTEMPTS, withBackoff } from '../src/deploy/retry.ts'

describe('withBackoff', () => {
  it('returns ok on first success', async () => {
    const result = await withBackoff({
      attempt: () => Promise.resolve('hello'),
      sleep: () => Promise.resolve(),
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('hello')
      expect(result.attempts).toBe(1)
    }
  })

  it('retries up to MAX_ATTEMPTS times', async () => {
    let calls = 0
    const result = await withBackoff({
      sleep: () => Promise.resolve(),
      attempt: () => {
        calls++
        return Promise.reject(new Error(`attempt ${calls} failed`))
      },
    })
    expect(result.ok).toBe(false)
    expect(calls).toBe(MAX_ATTEMPTS)
    if (!result.ok) expect(result.attempts).toBe(MAX_ATTEMPTS)
  })

  it('succeeds on retry (e.g. 2nd attempt OK)', async () => {
    let calls = 0
    const result = await withBackoff({
      sleep: () => Promise.resolve(),
      attempt: () => {
        calls++
        if (calls < 2) return Promise.reject(new Error('flaky'))
        return Promise.resolve('eventual success')
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.attempts).toBe(2)
  })

  it('honors shouldRetry=false (early abort)', async () => {
    let calls = 0
    const result = await withBackoff({
      sleep: () => Promise.resolve(),
      attempt: () => {
        calls++
        return Promise.reject(new Error('non-retryable'))
      },
      shouldRetry: () => false,
    })
    expect(calls).toBe(1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.attempts).toBe(1)
  })

  it('uses correct backoff intervals (1s / 4s / 16s)', () => {
    expect(BACKOFF_MS).toEqual([1000, 4000, 16000])
  })

  it('passes the actual delays to sleep()', async () => {
    const sleeps: number[] = []
    await withBackoff({
      sleep: (ms) => {
        sleeps.push(ms)
        return Promise.resolve()
      },
      attempt: () => Promise.reject(new Error('always fails')),
    })
    // 3 attempts → 2 sleeps between (1s, 4s)
    expect(sleeps).toEqual([1000, 4000])
  })
})
