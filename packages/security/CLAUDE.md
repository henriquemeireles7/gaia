# security/

Runtime security primitives. Audit-the-world is a different surface — that lives in the `a-security` skill at `.claude/skills/a-security/`.

## What's here

- `protected-route.ts` — Elysia plugin: session lookup, CSRF, security headers, rate limit.
- `public-route.ts` — Elysia plugin: rate limit + security headers (no auth).
- `security-headers.ts` — CSP, HSTS, X-Frame-Options.
- `audit-log.ts` — append-only audit log for state-changing actions.
- `harden-check.ts` — fast, deterministic security check fired by the harden-gate hook.

## Critical rules

- NEVER bypass `protected-route` / `public-route` wrappers — every Elysia plugin in `apps/api/server/features/` composes one.
- NEVER call `process.env` outside of `packages/config/env.ts`. Import `env` instead.
- NEVER log secrets, password fields, or tokens — the harden-check hook flags `console.log(secret)` patterns.
- ALWAYS audit state-changing routes via `auditLog()` from this package.

## Recipe: protect a route

```ts
import { protectedRoute } from '@gaia/security/protected-route'
import { auditLog } from '@gaia/security/audit-log'

export const userRoutes = protectedRoute().post('/users/:id/promote', async ({ user, params }) => {
  await promoteUser(params.id)
  await auditLog({ actor: user.id, action: 'user.promote', target: params.id })
  return { ok: true }
})
```

## Verify

```sh
bun run check
```

## Audits

Run the standalone security audit: `/a-security`. The audit walks this package + every route mounted via the wrappers, flagging coverage gaps.

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| audit-log.ts | AuditEntry, auditLog |
| harden-check.ts | — |
| protected-route.ts | userRoutes, protectedRoute |
| public-route.ts | healthRoutes, publicRoute |
| security-headers.ts | applySecurityHeaders |

<!-- Generated: 2026-04-30T04:36:18.616Z -->
