import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().default(3000),
    BETTER_AUTH_SECRET: z.string().min(1),

    // ─── Payments: Stripe ───
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    STRIPE_PRICE_ID: z.string().startsWith('price_'),
    STRIPE_MONTHLY_PRICE_ID: z.string().startsWith('price_'),

    // ─── Email: Resend ───
    RESEND_API_KEY: z.string().min(1),

    // ─── AI: Anthropic ───
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

    // ─── Analytics: PostHog (optional) ───
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),

    // ─── Storage: S3/R2 (optional) ───
    R2_ENDPOINT: z.string().url().optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),

    // ─── OAuth: Google (optional) ───
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // ─── Error Tracking: Sentry (optional) ───
    SENTRY_DSN: z.string().url().optional(),

    // CUSTOMIZE: Add your env vars above
  },
  clientPrefix: 'PUBLIC_',
  client: {
    PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    PUBLIC_STRIPE_KEY: z.string().startsWith('pk_'),
    PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
