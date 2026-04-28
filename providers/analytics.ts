import { PostHog } from 'posthog-node'
import { env } from '@/platform/env'

const client = env.POSTHOG_API_KEY
  ? new PostHog(env.POSTHOG_API_KEY, { host: env.POSTHOG_HOST })
  : null

export function track(
  event: string,
  properties?: Record<string, unknown>,
  distinctId?: string,
): void {
  if (!client) return
  try {
    client.capture({
      distinctId: distinctId ?? 'anonymous',
      event,
      properties,
    })
  } catch {
    // Analytics is non-critical — never crash the app
  }
}

export function identify(distinctId: string, properties?: Record<string, unknown>): void {
  if (!client) return
  try {
    client.identify({ distinctId, properties })
  } catch {
    // Analytics is non-critical — never crash the app
  }
}

export async function shutdown(): Promise<void> {
  if (!client) return
  await client.shutdown()
}
