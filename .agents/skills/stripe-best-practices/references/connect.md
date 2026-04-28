# Connect / Platforms

## Accounts v2 API

For new Connect platforms, ALWAYS use the [Accounts v2 API](https://docs.stripe.com/connect/accounts-v2.md). Don't use legacy `type` parameter.

## Controller properties

Configure connected accounts using `controller` properties instead of legacy account types.

## Charge types

Choose one charge type per integration. For most platforms, start with destination charges.

## Traps to avoid

- Don't use "Standard", "Express", or "Custom" as account type labels.
- Don't mix charge types within a single integration.
