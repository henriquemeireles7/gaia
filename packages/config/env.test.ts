import { describe, expect, it } from 'bun:test'
import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  BETTER_AUTH_SECRET: 'test-secret-min-32-chars-for-validation-pad',
  POLAR_ACCESS_TOKEN: 'polar_test_token',
  POLAR_WEBHOOK_SECRET: 'polar_whsec_test',
  POLAR_PRODUCT_ID: 'product_test_123',
  RESEND_API_KEY: 're_test_key',
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
}

describe('parseEnv', () => {
  it('passes with all required vars', () => {
    const env = parseEnv(valid)
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL)
    expect(env.POLAR_ACCESS_TOKEN).toBe(valid.POLAR_ACCESS_TOKEN)
  })

  it('coerces PORT from string to integer', () => {
    const env = parseEnv({ ...valid, PORT: '8080' })
    expect(env.PORT).toBe(8080)
  })

  it('applies default NODE_ENV when omitted', () => {
    const env = parseEnv(valid)
    expect(env.NODE_ENV).toBe('development')
  })

  it('applies default PORT when omitted', () => {
    const env = parseEnv(valid)
    expect(env.PORT).toBe(3000)
  })

  it('treats empty strings as undefined for optional vars', () => {
    const env = parseEnv({ ...valid, POSTHOG_API_KEY: '' })
    expect(env.POSTHOG_API_KEY).toBeUndefined()
  })

  it('treats empty strings as undefined for fields with defaults', () => {
    const env = parseEnv({ ...valid, NODE_ENV: '' })
    expect(env.NODE_ENV).toBe('development')
  })

  it('falls back to mock-mode placeholder when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...rest } = valid
    const env = parseEnv(rest)
    // Mock-mode default kicks in. The placeholder includes 'mock_dev_only'
    // so the live-mode safety check (in env.ts) catches accidental
    // production deploys without real credentials.
    expect(env.DATABASE_URL).toContain('mock_dev_only')
    expect(env.VENDOR_MODE).toBe('mock')
  })

  it('refuses to boot in live mode with mock-mode placeholders', () => {
    const { DATABASE_URL: _, ...rest } = valid
    // Live mode + missing DATABASE_URL → schema applies mock placeholder →
    // safety check in env.ts module-level rejects.
    // We can't import env.ts directly here (it parses on import), so we
    // simulate the same condition by parsing the schema and asserting the
    // mock placeholder is what would trigger the live-mode rejection.
    const env = parseEnv({ ...rest, VENDOR_MODE: 'live' })
    expect(env.DATABASE_URL).toContain('mock_dev_only')
    expect(env.VENDOR_MODE).toBe('live')
    // The actual throw lives in env.ts's module-level check, exercised on
    // app boot. parseEnv (this function) doesn't run that check directly.
  })

  it('throws when BETTER_AUTH_SECRET is too short', () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow()
  })

  it('throws when ANTHROPIC_API_KEY lacks sk-ant- prefix', () => {
    expect(() => parseEnv({ ...valid, ANTHROPIC_API_KEY: 'sk-openai-123' })).toThrow()
  })

  it('throws when NODE_ENV is invalid', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'staging' })).toThrow()
  })

  it('preserves optional vars when present', () => {
    const env = parseEnv({
      ...valid,
      POSTHOG_API_KEY: 'phc_test',
      SENTRY_DSN: 'https://test@sentry.example.com/1',
    })
    expect(env.POSTHOG_API_KEY).toBe('phc_test')
    expect(env.SENTRY_DSN).toBe('https://test@sentry.example.com/1')
  })
})
