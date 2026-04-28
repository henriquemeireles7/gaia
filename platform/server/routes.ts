import type { Hono } from 'hono'
import { accountRoutes } from '../../features/(shared)/account/routes'
import { adminRoutes } from '../../features/(shared)/admin/routes'
import { blogRoutes } from '../../features/(shared)/blog/routes'
import { orgRoutes } from '../../features/(shared)/organizations/routes'
import { pageRoutes } from '../../features/(shared)/pages/page-routes'
import { sitemapRoutes } from '../../features/(shared)/seo/sitemap'
import { completeCheckoutRoutes } from '../../features/(shared)/subscription/complete-checkout'
import { checkoutRoutes } from '../../features/(shared)/subscription/create-checkout'
import { portalRoutes } from '../../features/(shared)/subscription/customer-portal'
import { webhookRoutes } from '../../features/(shared)/subscription/handle-webhook'
import { apiKeyAuth } from '../auth/api-key'
import { authRoutes } from '../auth/routes'
import { csrfProtection } from '../csrf'
import { rateLimitMiddleware } from '../rate-limit'
import type { AppEnv } from '../types'
import { docsRoutes, isDocsEnabled } from './docs'

export function mountRoutes(app: Hono<AppEnv>) {
  // ─── Rate Limiting ───
  // Auth: strict (5 req/min) — prevents brute force
  app.use('/api/auth/*', rateLimitMiddleware({ max: 5, windowMs: 60_000 }))
  // Checkout: medium (10 req/min) — prevents abuse
  app.use('/api/checkout/*', rateLimitMiddleware({ max: 10, windowMs: 60_000 }))
  // API: standard (60 req/min)
  app.use('/api/*', rateLimitMiddleware({ max: 60, windowMs: 60_000 }))

  // ─── API Key Auth ───
  // Checks for Bearer sk_... header. If present, authenticates via API key.
  // If both API key and session cookie present, rejects with 400.
  // If no API key, passes through to session auth.
  app.use('/api/*', apiKeyAuth)

  // ─── CSRF Protection ───
  // Protects session-based state-changing routes. Better-auth handles its own CSRF.
  // Webhooks are excluded — they use signature verification instead.
  app.use('/api/account/*', csrfProtection())
  app.use('/api/checkout/*', csrfProtection())
  app.use('/api/subscription/*', csrfProtection())
  app.use('/api/orgs/*', csrfProtection())
  app.use('/api/admin/*', csrfProtection())

  // ─── API Docs (development only) ───
  if (isDocsEnabled()) {
    app.route('/api/docs', docsRoutes)
  }

  // Route chains must be connected for AppRoutes type inference
  return (
    app
      .route('/api/auth', authRoutes)
      .route('/api/checkout', checkoutRoutes)
      .route('/api/checkout', completeCheckoutRoutes)
      .route('/api/subscription/portal', portalRoutes)
      .route('/api/webhook', webhookRoutes)
      .route('/api/account', accountRoutes)
      .route('/', sitemapRoutes)
      .route('/api/blog', blogRoutes)
      .route('/api/orgs', orgRoutes)
      .route('/api/admin', adminRoutes)
      // Page routes — landing, auth, dashboard (must be last to avoid shadowing API routes)
      .route('/', pageRoutes)
  )
  // CUSTOMIZE: Add your feature routes above
}

// Export the type for RPC client type inference
export type AppRoutes = ReturnType<typeof mountRoutes>
