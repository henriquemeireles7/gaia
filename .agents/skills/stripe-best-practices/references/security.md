# Security Best Practices

## API keys

Never include keys in source code. Store in secrets vault or environment variables. Rotate keys when personnel depart. Use separate keys for separate environments.

## Restricted API keys (RAKs)

Use restricted API keys (`rk_`) instead of secret keys (`sk_`) wherever possible. Follow principle of least privilege.

## Webhook security

Always verify webhook signatures. Allowlist Stripe's IP addresses on webhook endpoints.

## Traps to avoid

- Don't embed keys in client-side code or mobile apps.
- Don't process webhook events without verifying signatures.
