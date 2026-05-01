// `env` is a parsed-and-frozen object exported by env.ts. Tests that need
// to assert live-mode behavior mutate `env.VENDOR_MODE` via cast — safe
// here because env.ts is module-level-loaded once and the mutation is
// scoped to the test file. Do NOT replicate this pattern in non-test
// code; treat `env` as immutable everywhere else.
import { describe, expect, it } from 'bun:test'
import { assertNoMockPlaceholdersInLiveMode, MOCK_PLACEHOLDERS, parseEnv } from './env'

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
    const envWithPlaceholder = parseEnv({ ...rest, VENDOR_MODE: 'live' })
    expect(() => assertNoMockPlaceholdersInLiveMode(envWithPlaceholder)).toThrow(/DATABASE_URL/)
  })
})

describe('assertNoMockPlaceholdersInLiveMode', () => {
  it('is a no-op in mock mode (default)', () => {
    const env = parseEnv({})
    expect(env.VENDOR_MODE).toBe('mock')
    expect(() => assertNoMockPlaceholdersInLiveMode(env)).not.toThrow()
  })

  it('passes when all required vars have real values in live mode', () => {
    const env = parseEnv({ ...valid, VENDOR_MODE: 'live' })
    expect(() => assertNoMockPlaceholdersInLiveMode(env)).not.toThrow()
  })

  it('throws when DATABASE_URL is the mock placeholder in live mode', () => {
    const { DATABASE_URL: _, ...rest } = valid
    const env = parseEnv({ ...rest, VENDOR_MODE: 'live' })
    expect(() => assertNoMockPlaceholdersInLiveMode(env)).toThrow(/DATABASE_URL/)
  })

  it('lists every placeholder in the error message (not just the first)', () => {
    // All vars defaulted → all placeholders. Error message names each.
    const env = parseEnv({ VENDOR_MODE: 'live' })
    try {
      assertNoMockPlaceholdersInLiveMode(env)
      expect.unreachable()
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).toContain('DATABASE_URL')
      expect(msg).toContain('BETTER_AUTH_SECRET')
      expect(msg).toContain('ANTHROPIC_API_KEY')
      expect(msg).toContain('POLAR_ACCESS_TOKEN')
      expect(msg).toContain('RESEND_API_KEY')
    }
  })

  it('does NOT false-flag user values that happen to contain "mock_dev_only" substring', () => {
    // Exact-match comparison protects users with test-account names like
    // `polar_at_mock_dev_only_test_account_123` from being rejected.
    const env = parseEnv({
      ...valid,
      VENDOR_MODE: 'live',
      POLAR_ACCESS_TOKEN: 'polar_at_mock_dev_only_test_account_123', // contains substring, not exact
    })
    expect(() => assertNoMockPlaceholdersInLiveMode(env)).not.toThrow()
  })
})

describe('MOCK_PLACEHOLDERS', () => {
  it('every placeholder satisfies its schema (used as default + safety-check sentinel)', () => {
    // Single source of truth — placeholder values must pass the schema's
    // own validation. If any of these break, parseEnv with empty input fails.
    const env = parseEnv({})
    expect(env.DATABASE_URL).toBe(MOCK_PLACEHOLDERS.DATABASE_URL)
    expect(env.BETTER_AUTH_SECRET).toBe(MOCK_PLACEHOLDERS.BETTER_AUTH_SECRET)
    expect(env.POLAR_ACCESS_TOKEN).toBe(MOCK_PLACEHOLDERS.POLAR_ACCESS_TOKEN)
    expect(env.POLAR_WEBHOOK_SECRET).toBe(MOCK_PLACEHOLDERS.POLAR_WEBHOOK_SECRET)
    expect(env.POLAR_PRODUCT_ID).toBe(MOCK_PLACEHOLDERS.POLAR_PRODUCT_ID)
    expect(env.RESEND_API_KEY).toBe(MOCK_PLACEHOLDERS.RESEND_API_KEY)
    expect(env.ANTHROPIC_API_KEY).toBe(MOCK_PLACEHOLDERS.ANTHROPIC_API_KEY)
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
