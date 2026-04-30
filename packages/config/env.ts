// packages/config/env.ts — TypeBox env validation (vision §Stack)
//
// Single source of truth for runtime configuration. Everything that reads
// from process.env imports `env` from here; raw process.env access is
// blocked by harden-check.

import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export const EnvSchema = Type.Object({
  // ─── Core ───────────────────────────────────────────────────────
  NODE_ENV: Type.Union(
    [Type.Literal('development'), Type.Literal('test'), Type.Literal('production')],
    { default: 'development' },
  ),
  // VENDOR_MODE — 'mock' (default) runs every external dependency as
  // an in-process fake so the app boots without any vendor signup:
  //   - DB:       PGLite (Postgres-in-WASM, file-backed at .gaia/pglite-data)
  //   - Polar:    in-memory mock client; webhook verification accepts anything
  //   - Resend:   appends sent mail to .gaia/sent-emails.jsonl
  //   - Anthropic: returns rotating placeholder strings
  // 'live' wires the real SDKs; the env vars below must be real keys.
  // Flip via `bun gaia live` (interactive) or set VENDOR_MODE=live in .env.local.
  VENDOR_MODE: Type.Union([Type.Literal('mock'), Type.Literal('live')], { default: 'mock' }),
  // The values below carry mock-mode defaults so `bun dev` boots with no
  // configuration. In live mode (VENDOR_MODE=live) you MUST override these
  // in .env.local with real keys. The startup-time check at the bottom of
  // this file refuses to boot in live mode if any value still matches the
  // 'mock_dev_only' marker — defense against accidental production deploy
  // with placeholder secrets.
  DATABASE_URL: Type.String({
    minLength: 1,
    default: 'postgresql://mock_dev_only:mock_dev_only@localhost:5432/mock_dev_only',
  }),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  BETTER_AUTH_SECRET: Type.String({
    minLength: 32,
    default: 'mock_dev_only_better_auth_secret_replace_in_live_mode_with_real_value',
  }),
  PUBLIC_APP_URL: Type.String({ minLength: 1, default: 'http://localhost:3000' }),

  // ─── Payments: Polar ───────────────────────────────────────────
  POLAR_ACCESS_TOKEN: Type.String({ minLength: 1, default: 'polar_at_mock_dev_only' }),
  POLAR_WEBHOOK_SECRET: Type.String({ minLength: 1, default: 'polar_whsec_mock_dev_only' }),
  POLAR_PRODUCT_ID: Type.String({ minLength: 1, default: 'prod_mock_dev_only' }),

  // ─── Email: Resend ─────────────────────────────────────────────
  RESEND_API_KEY: Type.String({ minLength: 1, default: 're_mock_dev_only' }),

  // ─── AI: Anthropic ─────────────────────────────────────────────
  ANTHROPIC_API_KEY: Type.String({
    pattern: '^sk-ant-',
    default: 'sk-ant-mock_dev_only',
  }),
  // Per-user daily AI cost budget (USD). Free-tier defaults to $0.50;
  // pro-tier defaults to $5.00. Tune per business model. Admin role
  // bypasses budget. See packages/security/ai-budget.ts.
  AI_DAILY_BUDGET_FREE_USD: Type.Number({ minimum: 0, default: 0.5 }),
  AI_DAILY_BUDGET_PRO_USD: Type.Number({ minimum: 0, default: 5 }),

  // ─── Optional: Analytics ───────────────────────────────────────
  POSTHOG_API_KEY: Type.Optional(Type.String({ minLength: 1 })),
  POSTHOG_HOST: Type.String({ minLength: 1, default: 'https://us.i.posthog.com' }),
  PUBLIC_POSTHOG_KEY: Type.Optional(Type.String({ minLength: 1 })),

  // ─── Optional: Storage (S3-compatible — Railway Buckets / R2) ─
  R2_ENDPOINT: Type.Optional(Type.String({ minLength: 1 })),
  R2_ACCESS_KEY_ID: Type.Optional(Type.String({ minLength: 1 })),
  R2_SECRET_ACCESS_KEY: Type.Optional(Type.String({ minLength: 1 })),
  R2_BUCKET_NAME: Type.Optional(Type.String({ minLength: 1 })),

  // ─── Optional: OAuth ───────────────────────────────────────────
  GOOGLE_CLIENT_ID: Type.Optional(Type.String({ minLength: 1 })),
  GOOGLE_CLIENT_SECRET: Type.Optional(Type.String({ minLength: 1 })),

  // ─── Optional: Observability ──────────────────────────────────
  SENTRY_DSN: Type.Optional(Type.String({ minLength: 1 })),
  AXIOM_TOKEN: Type.Optional(Type.String({ minLength: 1 })),
  AXIOM_ORG_ID: Type.Optional(Type.String({ minLength: 1 })),
  OTEL_EXPORTER_OTLP_ENDPOINT: Type.Optional(Type.String({ minLength: 1 })),

  // ─── Optional: Workflows (iii — iii.dev) ──────────────────────
  // Engine WebSocket URL. When unset, the worker registers but cannot
  // reach an engine — fine for unit tests; production must point at a
  // running iii engine.
  III_URL: Type.String({ minLength: 1, default: 'ws://localhost:49134' }),
  // Worker name reported to the engine. Defaults to `gaia-api-worker`.
  III_WORKER_NAME: Type.String({ minLength: 1, default: 'gaia-api-worker' }),
})

export type Env = Static<typeof EnvSchema>

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === '') continue
    cleaned[k] = v
  }
  const candidate = Value.Parse(['Convert', 'Clean', 'Default'], EnvSchema, cleaned)
  if (Value.Check(EnvSchema, candidate)) {
    return candidate
  }
  const errors = [...Value.Errors(EnvSchema, candidate)]
    .map((e) => `  - ${e.path}: ${e.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${errors}`)
}

export const env = parseEnv(process.env as Record<string, string | undefined>)

// Live-mode safety net: refuse to boot if any required vendor value is
// still the mock-mode placeholder. Catches the most common production
// footgun — deploying without filling in .env.local.
if (env.VENDOR_MODE === 'live') {
  const placeholders: string[] = []
  if (env.DATABASE_URL.includes('mock_dev_only')) placeholders.push('DATABASE_URL')
  if (env.BETTER_AUTH_SECRET.includes('mock_dev_only')) placeholders.push('BETTER_AUTH_SECRET')
  if (env.POLAR_ACCESS_TOKEN.includes('mock_dev_only')) placeholders.push('POLAR_ACCESS_TOKEN')
  if (env.POLAR_WEBHOOK_SECRET.includes('mock_dev_only')) placeholders.push('POLAR_WEBHOOK_SECRET')
  if (env.POLAR_PRODUCT_ID.includes('mock_dev_only')) placeholders.push('POLAR_PRODUCT_ID')
  if (env.RESEND_API_KEY.includes('mock_dev_only')) placeholders.push('RESEND_API_KEY')
  if (env.ANTHROPIC_API_KEY.includes('mock_dev_only')) placeholders.push('ANTHROPIC_API_KEY')
  if (placeholders.length > 0) {
    throw new Error(
      `VENDOR_MODE=live but these variables are still the mock-mode placeholder:\n` +
        placeholders.map((p) => `  - ${p}`).join('\n') +
        `\n\nFix: run \`bun gaia live\` (interactive) or set real values in .env.local.\n`,
    )
  }
}
