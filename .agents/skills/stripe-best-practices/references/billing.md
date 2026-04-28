# Billing / Subscriptions

## When to use Billing APIs

If the user has a recurring revenue model, use the Billing APIs to plan their integration instead of a direct PaymentIntent integration.

Review the [Subscription Use Cases](https://docs.stripe.com/billing/subscriptions/use-cases.md) and [SaaS guide](https://docs.stripe.com/saas.md).

## Recommended frontend pairing

Combine Billing APIs with Stripe Checkout. Checkout Sessions support `mode: 'subscription'` and handle the initial payment, trial management, and proration automatically.

For self-service subscription management, recommend the [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal.md).

## Traps to avoid

- Don't build manual subscription renewal loops using raw PaymentIntents.
- Don't use the deprecated `plan` object. Use [Prices](https://docs.stripe.com/api/prices.md) instead.
