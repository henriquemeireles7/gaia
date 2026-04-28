# Customization Guide

Douala is designed to be customized by removing what you don't need, not by adding boilerplate. Each provider can be swapped independently.

## Provider Swaps

Providers live in `providers/`. Each file wraps one capability. To swap a vendor, change the implementation — the rest of the app doesn't know or care.

### Email: Resend → SendGrid / Postmark / AWS SES

Edit `providers/email.ts`:

```ts
// Before (Resend)
import { Resend } from 'resend'
const email = new Resend(env.RESEND_API_KEY)

// After (SendGrid)
import sgMail from '@sendgrid/mail'
sgMail.setApiKey(env.SENDGRID_API_KEY)

export async function sendEmail(to, { subject, html, text }) {
  return sgMail.send({ to, from: 'hello@example.com', subject, html, text })
}
```

Then update `env.ts` to validate the new env var.

### Payments: Stripe → Lemonsqueezy / Paddle

Edit `providers/payments.ts`. The key contract is:
- `plans` object with price IDs and metadata
- `payments` client for API calls
- `intervalFromPriceId()` helper

Webhook handling in `features/(shared)/subscription/handle-webhook.ts` will also need updating.

### AI: Anthropic → OpenAI / Local

Edit `providers/ai.ts`:

```ts
// Before (Anthropic)
import Anthropic from '@anthropic-ai/sdk'
const ai = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

// After (OpenAI)
import OpenAI from 'openai'
const ai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function complete(prompt, options?) {
  const response = await ai.chat.completions.create({
    model: options?.model ?? 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  })
  return response.choices[0]?.message?.content ?? ''
}
```

### Analytics: PostHog → Mixpanel / Amplitude

Edit `providers/analytics.ts`. The contract is:
- `track(event, properties?, distinctId?)` — fire and forget
- `identify(distinctId, properties?)` — associate user data
- `shutdown()` — flush pending events

All analytics calls are wrapped in try/catch — they never crash the app.

### Storage: R2 → AWS S3 / GCS / Local

Edit `providers/storage.ts`. The R2 client uses the S3-compatible API, so switching to AWS S3 is just changing the endpoint. For GCS or local storage, replace the S3 client.

### Error Tracking: Sentry → Bugsnag / Datadog

Edit `providers/error-tracking.ts`. The contract is:
- `captureException(error, context?)` — report an error
- `captureMessage(message, level?, context?)` — report a message
- `flush(timeoutMs?)` — flush pending reports

## Removing Features

### Remove AI

1. Delete `providers/ai.ts`
2. Remove `ANTHROPIC_API_KEY` from `env.ts`
3. Remove `@anthropic-ai/sdk` from `package.json`

### Remove Analytics

1. Delete `providers/analytics.ts`
2. Remove `POSTHOG_API_KEY` and related vars from `env.ts`
3. Remove `posthog-node` from `package.json`
4. Search for `track(` and `identify(` calls — remove or no-op them

### Remove Storage

1. Delete `providers/storage.ts`
2. Remove `R2_*` vars from `env.ts`
3. Remove `@aws-sdk/*` from `package.json`

### Remove Blog/Content

1. Delete `content/` directory
2. Delete `features/(shared)/blog/`
3. Remove the blog route from `platform/server/routes.ts`

## Adding Env Vars

1. Add the Zod schema to `platform/env.ts` (required vars in `server`, optional with `.optional()`)
2. Add to `.env.example` with documentation
3. Access via `env.YOUR_VAR` — never use `process.env` directly

## Adding Error Codes

Add to `platform/errors.ts`:

```ts
MY_ERROR: { status: 400, code: 'MY_ERROR', message: 'Description' },
```

Use with `throwError(c, 'MY_ERROR')` or `throwError(c, 'MY_ERROR', 'additional details')`.
