// packages/config/env.ts — TypeBox env validation (vision §Stack)
//
// Single source of truth for runtime configuration. Everything that reads
// from process.env imports `env` from here; raw process.env access is
// blocked by harden-check.

import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

/**
 * Mock-mode placeholder values. Used as schema defaults so `bun dev` boots
 * with no configuration, AND as the exact-match comparands for the
 * live-mode safety check. Single source of truth — drift between the
 * default and the safety-check constant would produce silently-broken
 * production deploys.
 *
 * Each value contains 'mock_dev_only' for human readability when grep'd,
 * but the safety check compares with `===` (not substring) so legitimate
 * user values that happen to contain that string aren't false-flagged.
 */
export const MOCK_PLACEHOLDERS = {
  DATABASE_URL: 'postgresql://mock_dev_only:mock_dev_only@localhost:5432/mock_dev_only',
  BETTER_AUTH_SECRET: 'mock_dev_only_better_auth_secret_replace_in_live_mode_with_real_value',
  POLAR_ACCESS_TOKEN: 'polar_at_mock_dev_only',
  POLAR_WEBHOOK_SECRET: 'polar_whsec_mock_dev_only',
  POLAR_PRODUCT_ID: 'prod_mock_dev_only',
  RESEND_API_KEY: 're_mock_dev_only',
  ANTHROPIC_API_KEY: 'sk-ant-mock_dev_only',
} as const

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
  // in .env.local with real keys. `assertNoMockPlaceholdersInLiveMode`
  // (called at module load below) refuses to boot in live mode if any
  // value still equals the placeholder — defense against accidental
  // production deploy with placeholder secrets.
  DATABASE_URL: Type.String({ minLength: 1, default: MOCK_PLACEHOLDERS.DATABASE_URL }),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  BETTER_AUTH_SECRET: Type.String({
    minLength: 32,
    default: MOCK_PLACEHOLDERS.BETTER_AUTH_SECRET,
  }),
  PUBLIC_APP_URL: Type.String({ minLength: 1, default: 'http://localhost:3000' }),

  // ─── Payments: Polar ───────────────────────────────────────────
  POLAR_ACCESS_TOKEN: Type.String({
    minLength: 1,
    default: MOCK_PLACEHOLDERS.POLAR_ACCESS_TOKEN,
  }),
  POLAR_WEBHOOK_SECRET: Type.String({
    minLength: 1,
    default: MOCK_PLACEHOLDERS.POLAR_WEBHOOK_SECRET,
  }),
  POLAR_PRODUCT_ID: Type.String({
    minLength: 1,
    default: MOCK_PLACEHOLDERS.POLAR_PRODUCT_ID,
  }),

  // ─── Email: Resend ─────────────────────────────────────────────
  RESEND_API_KEY: Type.String({ minLength: 1, default: MOCK_PLACEHOLDERS.RESEND_API_KEY }),

  // ─── AI: Anthropic ─────────────────────────────────────────────
  ANTHROPIC_API_KEY: Type.String({
    pattern: '^sk-ant-',
    default: MOCK_PLACEHOLDERS.ANTHROPIC_API_KEY,
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

/**
 * Live-mode safety net: refuse to boot if any required vendor value is
 * still the mock-mode placeholder. Catches the most common production
 * footgun — deploying without filling in .env.local.
 *
 * Exact-match comparison (not substring) so legitimate user values that
 * happen to contain 'mock_dev_only' (e.g., a Polar test account named
 * `polar_at_mock_dev_only_real_account`) aren't false-flagged.
 *
 * Exported separately from the module-level call so it's unit-testable.
 */
export function assertNoMockPlaceholdersInLiveMode(currentEnv: Env): void {
  if (currentEnv.VENDOR_MODE !== 'live') return
  const placeholders: string[] = []
  if (currentEnv.DATABASE_URL === MOCK_PLACEHOLDERS.DATABASE_URL) placeholders.push('DATABASE_URL')
  if (currentEnv.BETTER_AUTH_SECRET === MOCK_PLACEHOLDERS.BETTER_AUTH_SECRET) {
    placeholders.push('BETTER_AUTH_SECRET')
  }
  if (currentEnv.POLAR_ACCESS_TOKEN === MOCK_PLACEHOLDERS.POLAR_ACCESS_TOKEN) {
    placeholders.push('POLAR_ACCESS_TOKEN')
  }
  if (currentEnv.POLAR_WEBHOOK_SECRET === MOCK_PLACEHOLDERS.POLAR_WEBHOOK_SECRET) {
    placeholders.push('POLAR_WEBHOOK_SECRET')
  }
  if (currentEnv.POLAR_PRODUCT_ID === MOCK_PLACEHOLDERS.POLAR_PRODUCT_ID) {
    placeholders.push('POLAR_PRODUCT_ID')
  }
  if (currentEnv.RESEND_API_KEY === MOCK_PLACEHOLDERS.RESEND_API_KEY) {
    placeholders.push('RESEND_API_KEY')
  }
  if (currentEnv.ANTHROPIC_API_KEY === MOCK_PLACEHOLDERS.ANTHROPIC_API_KEY) {
    placeholders.push('ANTHROPIC_API_KEY')
  }
  if (placeholders.length > 0) {
    throw new Error(
      `VENDOR_MODE=live but these variables are still the mock-mode placeholder:\n` +
        placeholders.map((p) => `  - ${p}`).join('\n') +
        `\n\nFix: run \`bun gaia live\` (interactive) or set real values in .env.local.\n`,
    )
  }
}

assertNoMockPlaceholdersInLiveMode(env)
