// packages/security/protected-route.ts — auth-gated Elysia plugin (vision §Backend-5)
//
// Composes:
//   1. better-auth session enforcement → throws AppError UNAUTHORIZED if no session
//   2. derives user / session / requestId onto the route context
//   3. security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
//   4. rate limiting — Postgres-backed via packages/security/rate-limits.ts
//   5. (TODO) audit logging on mutations — see auditLog() helper in this package
//
// Usage:
//   import { protectedRoute } from '@gaia/security/protected-route'
//
//   export const userRoutes = new Elysia({ prefix: '/users' })
//     .use(protectedRoute)
//     .get('/me', ({ user }) => user)

import { Elysia } from 'elysia'
import { auth } from '@gaia/auth'
import { AppError } from '@gaia/errors'
import { checkRateLimit, clientIp, limits } from './rate-limits'
import { applySecurityHeaders } from './security-headers'

export const protectedRoute = new Elysia({ name: 'security.protected' })
  .onBeforeHandle(({ set }) => applySecurityHeaders(set))
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new AppError('UNAUTHORIZED')
    // Per-user rate limit. Falls back to IP for the rare case session-less
    // requests reach this branch via a future code path.
    const scope = session.user.id
    await checkRateLimit(
      `protected:${scope}`,
      limits.protectedTier.requests,
      limits.protectedTier.windowSec,
    )
    return {
      user: session.user,
      session: session.session,
      requestId: crypto.randomUUID(),
      clientIp: clientIp(request.headers),
    }
  })
