// .gaia/rules/folders/apps/web.ts — rules owned by `apps/web`.
//
// Aggregated by .gaia/rules/index.ts. Membership is enforced by
// .gaia/rules/checks/check-rules-shards.ts: every entry's `skill`
// field MUST equal 'apps/web' (the shard's path identifier).

import type { Rule } from '../../types'

export const skill = 'apps/web' as const

export const appsWebRules = [
  {
    id: 'frontend/no-direct-fetch-in-routes',
    skill: 'apps/web',
    description:
      'apps/web/src/routes/** must not call `fetch()` directly — use the typed Eden Treaty client from ~/lib/api.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-vendor-sdk-on-client',
    skill: 'apps/web',
    description:
      'apps/web/** must not import vendor SDKs (Polar, Stripe, Resend, Anthropic). Vendor calls go server-side via Eden Treaty.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/no-hardcoded-colors',
    skill: 'apps/web',
    description: 'apps/web/** must not embed hex/rgb colors — read from the design tokens.',
    tier: 'hook',
    mechanism: { kind: 'hook', hook: 'packages/security/harden-check.ts' },
  },
  {
    id: 'frontend/routes-call-pass-render-only',
    skill: 'apps/web',
    description:
      'Route components do three things: call (service/resource/signal), pass (props), render (JSX). No business logic in routes.',
    tier: 'lint',
    mechanism: { kind: 'ast-grep', rule: 'frontend-routes-call-pass-render-only' },
  },
] as const satisfies readonly Rule[]
