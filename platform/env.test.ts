import { describe, expect, it } from 'bun:test'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/** Minimal valid env that satisfies all required fields */
function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    PORT: '3000',
    BETTER_AUTH_SECRET: 'super-secret-key',
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
    STRIPE_PRICE_ID: 'price_monthly_123',
    STRIPE_MONTHLY_PRICE_ID: 'price_monthly_456',
    RESEND_API_KEY: 're_123456',
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
    PUBLIC_APP_URL: 'http://localhost:3000',
    PUBLIC_STRIPE_KEY: 'pk_test_123',
    ...overrides,
  }
}

/** Recreate the exact same env schema as env.ts but with a controlled runtimeEnv */
function buildEnv(runtimeEnv: Record<string, string | undefined>) {
  return createEnv({
    server: {
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      DATABASE_URL: z.string().min(1),
      PORT: z.coerce.number().default(3000),
      BETTER_AUTH_SECRET: z.string().min(1),
      STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
      STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
      STRIPE_PRICE_ID: z.string().startsWith('price_'),
      STRIPE_MONTHLY_PRICE_ID: z.string().startsWith('price_'),
      RESEND_API_KEY: z.string().min(1),
      ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
      POSTHOG_API_KEY: z.string().min(1).optional(),
      POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
      R2_ENDPOINT: z.string().url().optional(),
      R2_ACCESS_KEY_ID: z.string().min(1).optional(),
      R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
      R2_BUCKET_NAME: z.string().min(1).optional(),
      GOOGLE_CLIENT_ID: z.string().min(1).optional(),
      GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
      SENTRY_DSN: z.string().url().optional(),
    },
    clientPrefix: 'PUBLIC_',
    client: {
      PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
      PUBLIC_STRIPE_KEY: z.string().startsWith('pk_'),
      PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    },
    runtimeEnv,
    emptyStringAsUndefined: true,
  })
}

describe('env validation', () => {
  describe('valid configuration', () => {
    it('passes with all required vars', () => {
      const env = buildEnv(validEnv())
      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/db')
      expect(env.BETTER_AUTH_SECRET).toBe('super-secret-key')
      expect(env.STRIPE_SECRET_KEY).toBe('sk_test_123')
    })

    it('passes with optional vars included', () => {
      const env = buildEnv(
        validEnv({
          POSTHOG_API_KEY: 'phc_abc123',
          GOOGLE_CLIENT_ID: 'google-id',
          GOOGLE_CLIENT_SECRET: 'google-secret',
          SENTRY_DSN: 'https://sentry.example.com/1',
          R2_ENDPOINT: 'https://r2.example.com',
          R2_ACCESS_KEY_ID: 'r2-key',
          R2_SECRET_ACCESS_KEY: 'r2-secret',
          R2_BUCKET_NAME: 'my-bucket',
          PUBLIC_POSTHOG_KEY: 'phc_public_123',
        }),
      )
      expect(env.POSTHOG_API_KEY).toBe('phc_abc123')
      expect(env.GOOGLE_CLIENT_ID).toBe('google-id')
      expect(env.SENTRY_DSN).toBe('https://sentry.example.com/1')
      expect(env.R2_BUCKET_NAME).toBe('my-bucket')
      expect(env.PUBLIC_POSTHOG_KEY).toBe('phc_public_123')
    })
  })

  describe('defaults', () => {
    it('defaults NODE_ENV to development', () => {
      const env = buildEnv(validEnv({ NODE_ENV: undefined }))
      expect(env.NODE_ENV).toBe('development')
    })

    it('defaults PORT to 3000', () => {
      const env = buildEnv(validEnv({ PORT: undefined }))
      expect(env.PORT).toBe(3000)
    })

    it('coerces PORT from string to number', () => {
      const env = buildEnv(validEnv({ PORT: '8080' }))
      expect(env.PORT).toBe(8080)
    })

    it('defaults POSTHOG_HOST to PostHog US endpoint', () => {
      const env = buildEnv(validEnv())
      expect(env.POSTHOG_HOST).toBe('https://us.i.posthog.com')
    })

    it('defaults PUBLIC_APP_URL to localhost:3000', () => {
      const env = buildEnv(validEnv({ PUBLIC_APP_URL: undefined }))
      expect(env.PUBLIC_APP_URL).toBe('http://localhost:3000')
    })
  })

  describe('optional vars', () => {
    it('returns undefined for missing optional vars', () => {
      const env = buildEnv(validEnv())
      expect(env.POSTHOG_API_KEY).toBeUndefined()
      expect(env.R2_ENDPOINT).toBeUndefined()
      expect(env.R2_ACCESS_KEY_ID).toBeUndefined()
      expect(env.R2_SECRET_ACCESS_KEY).toBeUndefined()
      expect(env.R2_BUCKET_NAME).toBeUndefined()
      expect(env.GOOGLE_CLIENT_ID).toBeUndefined()
      expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined()
      expect(env.SENTRY_DSN).toBeUndefined()
      expect(env.PUBLIC_POSTHOG_KEY).toBeUndefined()
    })
  })

  describe('missing required vars', () => {
    it('throws when DATABASE_URL is missing', () => {
      expect(() => buildEnv(validEnv({ DATABASE_URL: undefined }))).toThrow()
    })

    it('throws when BETTER_AUTH_SECRET is missing', () => {
      expect(() => buildEnv(validEnv({ BETTER_AUTH_SECRET: undefined }))).toThrow()
    })

    it('throws when STRIPE_SECRET_KEY is missing', () => {
      expect(() => buildEnv(validEnv({ STRIPE_SECRET_KEY: undefined }))).toThrow()
    })

    it('throws when STRIPE_WEBHOOK_SECRET is missing', () => {
      expect(() => buildEnv(validEnv({ STRIPE_WEBHOOK_SECRET: undefined }))).toThrow()
    })

    it('throws when STRIPE_PRICE_ID is missing', () => {
      expect(() => buildEnv(validEnv({ STRIPE_PRICE_ID: undefined }))).toThrow()
    })

    it('throws when STRIPE_MONTHLY_PRICE_ID is missing', () => {
      expect(() => buildEnv(validEnv({ STRIPE_MONTHLY_PRICE_ID: undefined }))).toThrow()
    })

    it('throws when RESEND_API_KEY is missing', () => {
      expect(() => buildEnv(validEnv({ RESEND_API_KEY: undefined }))).toThrow()
    })

    it('throws when ANTHROPIC_API_KEY is missing', () => {
      expect(() => buildEnv(validEnv({ ANTHROPIC_API_KEY: undefined }))).toThrow()
    })

    it('throws when PUBLIC_STRIPE_KEY is missing', () => {
      expect(() => buildEnv(validEnv({ PUBLIC_STRIPE_KEY: undefined }))).toThrow()
    })
  })

  describe('invalid values', () => {
    it('throws for invalid NODE_ENV', () => {
      expect(() => buildEnv(validEnv({ NODE_ENV: 'staging' }))).toThrow()
    })

    it('throws when STRIPE_SECRET_KEY lacks sk_ prefix', () => {
      expect(() => buildEnv(validEnv({ STRIPE_SECRET_KEY: 'invalid_key' }))).toThrow()
    })

    it('throws when STRIPE_WEBHOOK_SECRET lacks whsec_ prefix', () => {
      expect(() => buildEnv(validEnv({ STRIPE_WEBHOOK_SECRET: 'invalid_secret' }))).toThrow()
    })

    it('throws when STRIPE_PRICE_ID lacks price_ prefix', () => {
      expect(() => buildEnv(validEnv({ STRIPE_PRICE_ID: 'prod_123' }))).toThrow()
    })

    it('throws when STRIPE_MONTHLY_PRICE_ID lacks price_ prefix', () => {
      expect(() => buildEnv(validEnv({ STRIPE_MONTHLY_PRICE_ID: 'prod_456' }))).toThrow()
    })

    it('throws when ANTHROPIC_API_KEY lacks sk-ant- prefix', () => {
      expect(() => buildEnv(validEnv({ ANTHROPIC_API_KEY: 'sk-openai-123' }))).toThrow()
    })

    it('throws when PUBLIC_STRIPE_KEY lacks pk_ prefix', () => {
      expect(() => buildEnv(validEnv({ PUBLIC_STRIPE_KEY: 'sk_test_wrong' }))).toThrow()
    })

    it('throws when PUBLIC_APP_URL is not a valid URL', () => {
      expect(() => buildEnv(validEnv({ PUBLIC_APP_URL: 'not-a-url' }))).toThrow()
    })

    it('throws when SENTRY_DSN is not a valid URL', () => {
      expect(() => buildEnv(validEnv({ SENTRY_DSN: 'not-a-url' }))).toThrow()
    })

    it('throws when R2_ENDPOINT is not a valid URL', () => {
      expect(() => buildEnv(validEnv({ R2_ENDPOINT: 'not-a-url' }))).toThrow()
    })
  })

  describe('emptyStringAsUndefined', () => {
    it('treats empty string as undefined for required fields', () => {
      expect(() => buildEnv(validEnv({ DATABASE_URL: '' }))).toThrow()
    })

    it('treats empty string as undefined for optional fields', () => {
      const env = buildEnv(validEnv({ POSTHOG_API_KEY: '' }))
      expect(env.POSTHOG_API_KEY).toBeUndefined()
    })

    it('treats empty string as undefined for fields with defaults', () => {
      const env = buildEnv(validEnv({ NODE_ENV: '' }))
      expect(env.NODE_ENV).toBe('development')
    })
  })
})
