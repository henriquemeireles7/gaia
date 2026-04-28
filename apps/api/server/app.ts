// apps/api/server/app.ts — Elysia entry point (vision §Stack)
//
// One app, mounted on the configured PORT. Better Auth handles all
// /auth/* routes; everything else is typed Elysia routes with TypeBox
// schemas so Eden Treaty can derive end-to-end client types.

import { Elysia, t } from 'elysia'
import { verifyWebhook } from '@/packages/adapters/payments'
import { auth } from '@/packages/auth'
import { env } from '@/packages/config/env'
import { getLogger } from '@/packages/core/logger'
import { AppError } from '@/packages/errors'

const log = getLogger()

export const app = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      return error.toJSON()
    }
    log.error('unhandled error', { error: String(error) })
    set.status = 500
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Internal server error' }
  })

  // ── Health ─────────────────────────────────────────────────────
  .get('/health', () => ({ ok: true as const }), {
    response: t.Object({ ok: t.Literal(true) }),
  })

  // ── Auth (better-auth) ────────────────────────────────────────
  .all('/auth/*', ({ request }) => auth.handler(request))

  // ── Authenticated session probe ───────────────────────────────
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
    log.info('polar.webhook', { event })
    return { ok: true as const }
  })

export type App = typeof app

if (import.meta.main) {
  app.listen(env.PORT)
  log.info('api.started', { port: env.PORT, env: env.NODE_ENV })
}
