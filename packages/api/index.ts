// packages/api/index.ts — Eden Treaty client (vision §Stack)
//
// End-to-end types from server to client. Imports the Elysia app's type
// (apps/api/server/app.ts → App) and exposes a typed client that any
// consumer can call without a separate API client SDK.
//
// Usage in apps/web/:
//   import { createApiClient } from '@/packages/api'
//   const api = createApiClient(import.meta.env.VITE_API_URL)
//   const { data, error } = await api.health.get()

import { treaty } from '@elysiajs/eden'
import type { App } from '@/apps/api/server/app'

export type { App }

export function createApiClient(baseUrl: string) {
  return treaty<App>(baseUrl)
}
