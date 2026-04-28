import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { captureException } from '../../providers/error-tracking'
import { db } from '../db/client'
import { env } from '../env'
import { createLogger } from '../logger'
import type { AppEnv } from '../types'
import { mountRoutes } from './routes'

const log = createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  pretty: env.NODE_ENV !== 'production',
})

const app = new Hono<AppEnv>()

// Health check — only status for public, detailed info omitted
app.get('/health', async (c) => {
  let dbStatus: 'connected' | 'error' = 'error'
  try {
    await db.execute(sql`SELECT 1`)
    dbStatus = 'connected'
  } catch {
    dbStatus = 'error'
  }

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded'
  const statusCode = status === 'healthy' ? 200 : 503

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
    },
    statusCode,
  )
})

// ─── Request ID Middleware ───
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
  c.header('X-Request-Id', requestId)
  c.set('requestId', requestId)
  await next()
})

// ─── Request Logging Middleware ───
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  const requestId = c.get('requestId')
  log.info(`${c.req.method} ${c.req.path}`, {
    status: c.res.status,
    duration,
    ...(requestId ? { requestId } : {}),
  })
})

app.use('*', secureHeaders())

// CORS: accept main domain + org subdomains
function isAllowedOrigin(origin: string): boolean {
  if (origin === env.PUBLIC_APP_URL) return true
  try {
    const mainUrl = new URL(env.PUBLIC_APP_URL)
    const requestUrl = new URL(origin)
    // Allow *.domain.com subdomains (org subdomains)
    if (
      requestUrl.hostname.endsWith(`.${mainUrl.hostname}`) &&
      requestUrl.protocol === mainUrl.protocol
    ) {
      return true
    }
  } catch {
    return false
  }
  return false
}

app.use(
  '*',
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : env.PUBLIC_APP_URL),
    credentials: true,
  }),
)

// Mount routes
const routes = mountRoutes(app)

// Global error handler
app.onError(async (err, c) => {
  const requestId = c.get('requestId')
  log.error(`${c.req.method} ${c.req.path} — ${err.message}`, {
    ...(requestId ? { requestId } : {}),
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
  })

  // Send to error tracking (non-blocking)
  captureException(err, {
    requestId,
    method: c.req.method,
    path: c.req.path,
  }).catch(() => {})

  return c.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500,
  )
})

// Export type for RPC
export type AppRoutes = typeof routes

// Start server
export default {
  port: env.PORT,
  fetch: app.fetch,
}
