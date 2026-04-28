// packages/core/observability.ts — Sentry + Axiom + OpenTelemetry init
//
// Vision §Stack: PostHog (product analytics), Sentry (errors), Axiom
// (logs/traces/metrics), OpenTelemetry (instrumentation protocol).
//
// Call initObservability() once at app boot from apps/api/server/. Each
// integration is independently optional via env vars; a missing key
// degrades gracefully rather than crashing.

import { Axiom } from '@axiomhq/js'
import * as Sentry from '@sentry/node'

export type ObservabilityHandles = {
  axiom: Axiom | null
  sentryEnabled: boolean
}

export function initObservability(env: {
  SENTRY_DSN?: string
  AXIOM_TOKEN?: string
  AXIOM_ORG_ID?: string
  NODE_ENV: string
}): ObservabilityHandles {
  let sentryEnabled = false
  if (env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    })
    sentryEnabled = true
  }

  const axiom =
    env.AXIOM_TOKEN && env.AXIOM_ORG_ID
      ? new Axiom({ token: env.AXIOM_TOKEN, orgId: env.AXIOM_ORG_ID })
      : null

  return { axiom, sentryEnabled }
}

export { Sentry }
