---
name: upgrade-stripe
description: Guide for upgrading Stripe API versions and SDKs

---

The latest Stripe API version is 2026-03-25.dahlia.

## Upgrade Checklist

1. Review the [API Changelog](https://docs.stripe.com/changelog.md)
2. Check [Upgrades Guide](https://docs.stripe.com/upgrades.md)
3. Update server-side SDK package version
4. Update the `apiVersion` parameter in your Stripe client initialization
5. Test with `Stripe-Version` header
6. Update webhook handlers for new event structures
7. Update Stripe.js version if needed
8. Update mobile SDK versions if needed
