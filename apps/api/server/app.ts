// apps/api/server/app.ts — Elysia entry point (vision §Stack)
//
// One app, mounted on the configured PORT. Better Auth handles all
// /auth/* routes; everything else is typed Elysia routes with TypeBox
// schemas so Eden Treaty can derive end-to-end client types.

import { ProviderError } from '@gaia/adapters/errors'
import { verifyWebhook } from '@gaia/adapters/payments'
import { auth } from '@gaia/auth'
import { env } from '@gaia/config'
import { getLogger } from '@gaia/core/logger'
import { initObservability } from '@gaia/core/observability'
import { AppError } from '@gaia/errors'
import { checkRateLimit, clientIp, limits } from '@gaia/security/rate-limits'
import { applySecurityHeaders } from '@gaia/security/security-headers'
// Importing @gaia/workflows runs the worker registration (registerWorker +
// iii.registerFunction calls) at module load. Self-hosted iii routes
// invocations over WebSocket via the engine — no Elysia-side serve handler.
// `functions` is the registered function-ref list; logged at boot below
// so the import isn't unassigned.
import { functions as workflowFunctions } from '@gaia/workflows'
import { cors } from '@elysiajs/cors'
import { Elysia, t } from 'elysia'
import { billingRoutes, processPolarEvent } from './billing'

initObservability(env)
const log = getLogger()
log.info('workflows.registered', { count: workflowFunctions.length })

export const app = new Elysia()
  // CORS allowlist — explicit origin only. Webhooks bypass via separate
  // handler that runs server-to-server with signature verification, so
  // the browser-origin check here doesn't affect Polar deliveries.
  .use(
    cors({
      origin: [env.PUBLIC_APP_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  )
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      return error.toJSON()
    }
    if (error instanceof ProviderError) {
      set.status = error.statusCode
      return {
        ok: false,
        code: 'PROVIDER_ERROR',
        message: error.message,
        provider: error.provider,
        operation: error.operation,
      }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { ok: false, code: 'NOT_FOUND', message: 'Route not found' }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { ok: false, code: 'VALIDATION_ERROR', message: 'Invalid input' }
    }
    log.error('unhandled error', { error: String(error), code })
    set.status = 500
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Internal server error' }
  })

  // Apply OWASP-baseline security headers to every response.
  // Feature routes use @gaia/security/protected-route which composes the
  // same headers + auth derive; this app-level hook covers the inline
  // routes below (health, auth, webhook).
  .onBeforeHandle(({ set }) => applySecurityHeaders(set))

  // ── Health ─────────────────────────────────────────────────────
  // Liveness — is the process up at all? Always returns 200.
  .get('/health', () => ({ ok: true as const }), {
    response: t.Object({ ok: t.Literal(true) }),
  })
  // Readiness — is the app ready to serve traffic? Probe DB, etc.
  // Loadbalancers gate routing on this; deploys gate promotion on this.
  .get('/health/ready', () => ({ ok: true as const, ready: true as const }), {
    response: t.Object({ ok: t.Literal(true), ready: t.Literal(true) }),
  })

  // ── Auth (better-auth) ────────────────────────────────────────
  // IP-based throttle defends login/signup/password-reset against brute
  // force + credential stuffing. Better-Auth handles per-user details
  // (account lockout, breached-password checks) downstream.
  .all('/auth/*', async ({ request }) => {
    const ip = clientIp(request.headers)
    await checkRateLimit(`auth:${ip}`, limits.authFlow.requests, limits.authFlow.windowSec)
    return auth.handler(request)
  })

  // ── Authenticated session probe ───────────────────────────────
  // For full feature routes use protectedRoute from @gaia/security/protected-route
  // which derives { user, session, requestId } onto the context.
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  })
  .get('/me', ({ user }) => {
    if (!user) throw new AppError('UNAUTHORIZED')
    return { user }
  })

  // ── Polar webhook ─────────────────────────────────────────────
  .post('/webhooks/polar', async ({ request }) => {
    const body = await request.text()
    const event = await verifyWebhook(request.headers, body)
    await processPolarEvent(event as Parameters<typeof processPolarEvent>[0])
    log.info('polar.webhook', { type: (event as { type?: string }).type })
    return { ok: true as const }
  })

  // ── Billing routes ─────────────────────────────────────────────
  .use(billingRoutes)

export type App = typeof app

if (import.meta.main) {
  app.listen(env.PORT)
  log.info('api.started', { port: env.PORT, env: env.NODE_ENV })
}
