# providers

## Purpose
Thin vendor wrappers. One file per capability, named by WHAT not WHO. Features never import vendor SDKs directly.

## Critical Rules
- NEVER import vendor SDKs from features — always go through providers
- ONE file per capability (payments, email, analytics, storage, ai, markdown)
- ALWAYS throw ProviderError on failure (from providers/errors.ts)
- ALWAYS name files by capability, not by vendor (email.ts not resend.ts)

## Imports (use from other modules)
```ts
import { payments, plans } from '@gaia/adapters/payments'
import { sendEmail } from '@gaia/adapters/email'
import { track, identify } from '@gaia/adapters/analytics'
import { upload, download, getSignedUrl, remove } from '@gaia/adapters/storage'
import { complete } from '@gaia/adapters/ai'
import { renderMarkdown, listContentFiles, getContentFile } from '@gaia/adapters/markdown'
```

## Recipe: New Provider
```ts
import { env } from '@gaia/config'
import { ProviderError } from '@gaia/adapters/errors'

// Initialize client at module level
const client = new VendorSDK(env.VENDOR_API_KEY)

export async function doThing(input: string): Promise<Result> {
  try {
    return await client.method(input)
  } catch (error) {
    throw new ProviderError('vendor', 'doThing', 500, error)
  }
}
```

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| ai.ts | ai, complete |
| analytics.ts | track, identify, shutdown |
| email.ts | email, sendEmail |
| error-tracking.ts | captureException, captureMessage, flush |
| errors.ts | ProviderError |
| markdown.ts | BlogPostFrontmatter, parseFrontmatter, renderMarkdown, calculateReadTime, ContentHeading, ParsedContentItem, listContentFiles, getContentFile |
| payments.ts | payments, plans, intervalFromPriceId |
| storage.ts | upload, download, getSignedUrl, remove |

## Internal Dependencies
- platform/env
- providers/errors

<!-- Generated: 2026-04-19T04:04:55.799Z -->
