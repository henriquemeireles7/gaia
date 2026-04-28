import { describe, expect, it } from 'bun:test'

// ─── Tests with PostHog NOT configured (no API key in test env) ─────────────
// The default test env has POSTHOG_API_KEY unset, so the client is null.
// All functions should be no-ops that never throw.
// The "configured" codepath (PostHog SDK calls) is covered by the SDK itself
// and integration tests — unit tests verify graceful degradation.

const { track, identify, shutdown } = await import('./analytics')

describe('analytics (graceful degradation)', () => {
  it('track does not throw without PostHog configured', () => {
    expect(() => track('test_event')).not.toThrow()
  })

  it('track with properties does not throw', () => {
    expect(() => track('signup', { plan: 'pro' }, 'user-123')).not.toThrow()
  })

  it('track returns void', () => {
    const result = track('event')
    expect(result).toBeUndefined()
  })

  it('identify does not throw without PostHog configured', () => {
    expect(() => identify('user-123', { name: 'Test' })).not.toThrow()
  })

  it('identify returns void', () => {
    const result = identify('user-1')
    expect(result).toBeUndefined()
  })

  it('shutdown resolves without PostHog configured', async () => {
    await expect(shutdown()).resolves.toBeUndefined()
  })
})
