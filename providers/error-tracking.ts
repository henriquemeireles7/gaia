import { env } from '@/platform/env'

// ─── Error Tracking Provider ───────────────────────────────────────────────
// Optional Sentry integration. Follows the provider pattern:
// - Graceful degradation when SENTRY_DSN is not set
// - Never throws — error tracking must never crash the app
// - Thin wrapper: swap Sentry for any other service by changing this file
//
// CUSTOMIZE: Replace with your error tracking service (Sentry, Bugsnag, etc.)
// Install @sentry/bun and set SENTRY_DSN to enable.

type ErrorContext = {
  userId?: string
  requestId?: string
  method?: string
  path?: string
  [key: string]: unknown
}

// biome-ignore lint/suspicious/noExplicitAny: Sentry is dynamically imported (optional dep)
let _sentry: any = null
let _initialized = false

async function getSentry() {
  if (_initialized) return _sentry
  _initialized = true

  const dsn = env.SENTRY_DSN
  if (!dsn) return null

  try {
    // @ts-expect-error — @sentry/bun is an optional dependency
    const mod = await import('@sentry/bun')
    mod.init({
      dsn,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    })
    _sentry = mod
    return _sentry
  } catch {
    // Sentry not installed — degrade gracefully
    return null
  }
}

export async function captureException(error: Error, context?: ErrorContext): Promise<void> {
  try {
    const sentry = await getSentry()
    if (!sentry) return

    // biome-ignore lint/suspicious/noExplicitAny: dynamic import
    sentry.withScope((scope: any) => {
      if (context?.userId) scope.setUser({ id: context.userId })
      if (context?.requestId) scope.setTag('requestId', context.requestId)
      if (context?.method) scope.setTag('method', context.method)
      if (context?.path) scope.setTag('path', context.path)

      const { userId, requestId, method, path, ...extra } = context ?? {}
      for (const [key, value] of Object.entries(extra)) {
        scope.setExtra(key, value)
      }

      sentry.captureException(error)
    })
  } catch {
    // Error tracking is non-critical — never crash the app
  }
}

export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext,
): Promise<void> {
  try {
    const sentry = await getSentry()
    if (!sentry) return

    // biome-ignore lint/suspicious/noExplicitAny: dynamic import
    sentry.withScope((scope: any) => {
      if (context?.requestId) scope.setTag('requestId', context.requestId)
      for (const [key, value] of Object.entries(context ?? {})) {
        if (key !== 'requestId') scope.setExtra(key, value)
      }
      sentry.captureMessage(message, level)
    })
  } catch {
    // Error tracking is non-critical — never crash the app
  }
}

export async function flush(timeoutMs = 2000): Promise<void> {
  try {
    const sentry = await getSentry()
    if (!sentry) return
    await sentry.flush(timeoutMs)
  } catch {
    // Flush failure is non-critical
  }
}
