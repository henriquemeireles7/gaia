# subscription

## Purpose
Stripe checkout + webhook handling + subscription lifecycle management.

## Critical Rules
- NEVER use raw `c.json()` — use `success()` for data, `throwError()` for errors
- ALWAYS verify webhook signature before processing events
- ALWAYS normalize email: `.toLowerCase().trim()` before storing
- ALWAYS use `onConflictDoNothing` to prevent duplicate subscriptions
- NEVER import Stripe directly — use `payments` from `providers/payments`

## Recipe: New Webhook Event Handler
```ts
// Inside webhookRoutes handler, add a new case:
case 'customer.subscription.trial_will_end': {
  const sub = event.data.object
  // ... handle the event ...
  break
}
```

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| complete-checkout.ts | completeCheckoutRoutes |
| create-checkout.ts | checkoutRoutes |
| customer-portal.ts | portalRoutes |
| handle-webhook.ts | webhookRoutes |
| helpers.ts | getUserForSubscription |
| require-subscription.ts | requireActiveSubscription |

## Internal Dependencies
- platform/auth
- platform/db
- platform/env
- platform/errors
- platform/server
- platform/types
- providers/analytics
- providers/email
- providers/payments

<!-- Generated: 2026-04-19T04:04:55.790Z -->
