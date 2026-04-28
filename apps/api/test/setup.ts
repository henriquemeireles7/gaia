// apps/api/test/setup.ts — preload for `bun test`.
//
// Fills in safe placeholders for required env vars so adapter modules
// can initialize at import time during tests. Real values come from .env
// in dev and from the CI workflow secrets in CI.

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  BETTER_AUTH_SECRET: 'test-secret-min-32-chars-for-validation-pad',
  POLAR_ACCESS_TOKEN: 'polar_test_token',
  POLAR_WEBHOOK_SECRET: 'polar_whsec_test',
  POLAR_PRODUCT_ID: 'product_test_123',
  RESEND_API_KEY: 're_test_key',
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
  PUBLIC_APP_URL: 'http://localhost:3000',
}

for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v // harden:ignore — test setup seeds env
}
