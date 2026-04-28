# Payments

## API hierarchy

Use [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions.md) for on-session payments. Use [PaymentIntents API](https://docs.stripe.com/payments/paymentintents/lifecycle.md) for off-session payments.

## Integration surfaces

1. **Payment Links** — No-code.
2. **Checkout** — Stripe-hosted or embedded form.
3. **Payment Element** — Embedded UI component for advanced customization.

## Traps to avoid

- Don't recommend the legacy Card Element.
- Don't use the Charges API — use Checkout Sessions or PaymentIntents.
- Don't use the Sources API — use Setup Intents.
