// packages/security/public-route.ts — explicit opt-out from auth (vision §Backend-5)
//
// Use this for endpoints that genuinely need no session: health checks,
// auth callbacks, marketing pages, webhook receivers (which authenticate
// via signed payloads, not sessions). Composing publicRoute is an explicit
// signal that the absence of auth is intentional.
//
// publicRoute composes:
//   1. security headers (same as protectedRoute)
//   2. (stricter) rate limiting — TODO @upstash/ratelimit
//   3. requestId for tracing
//
// Usage:
//   export const healthRoutes = new Elysia({ prefix: '/health' })
//     .use(publicRoute)
//     .get('/', () => ({ ok: true as const }))

import { Elysia } from 'elysia'
import { applySecurityHeaders } from './security-headers'

export const publicRoute = new Elysia({ name: 'security.public' })
  .onBeforeHandle(({ set }) => applySecurityHeaders(set))
  .derive(() => ({
    requestId: crypto.randomUUID(),
  }))
