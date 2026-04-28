// packages/api/index.ts — Eden Treaty client (vision §Stack)
//
// End-to-end types from server to client. Import the Elysia app's type
// (apps/api/server/elysia-app.ts → ElysiaApp) and expose a typed client
// that any consumer can call without a separate API client SDK.
//
// Usage in apps/web/ (once SolidStart lands in Phase 5):
//   import { api } from '@/packages/api'
//   const { data, error } = await api.v2.health.get()

import { treaty } from '@elysiajs/eden'
import type { ElysiaApp } from '@/apps/api/server/elysia-app'

export type { ElysiaApp }

export function createApiClient(baseUrl: string) {
  return treaty<ElysiaApp>(baseUrl)
}
