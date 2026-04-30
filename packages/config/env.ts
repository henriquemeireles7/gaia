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
  DATABASE_URL: Type.String({ minLength: 1 }),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  BETTER_AUTH_SECRET: Type.String({ minLength: 32 }),
  PUBLIC_APP_URL: Type.String({ minLength: 1, default: 'http://localhost:3000' }),

  // ─── Payments: Polar ───────────────────────────────────────────
  POLAR_ACCESS_TOKEN: Type.String({ minLength: 1 }),
  POLAR_WEBHOOK_SECRET: Type.String({ minLength: 1 }),
  POLAR_PRODUCT_ID: Type.String({ minLength: 1 }),

  // ─── Email: Resend ─────────────────────────────────────────────
  RESEND_API_KEY: Type.String({ minLength: 1 }),

  // ─── AI: Anthropic ─────────────────────────────────────────────
  ANTHROPIC_API_KEY: Type.String({ pattern: '^sk-ant-' }),

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
