// apps/web/src/lib/api.ts — typed API client (Eden Treaty)
//
// Single point of contact between the SolidStart app and the Elysia API.
// Imports `App` as a TYPE only; no runtime dependency on apps/api code.

import { treaty } from '@elysiajs/eden'
import type { App } from '@gaia/api-server'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = treaty<App>(baseUrl)

// Better Auth mounts /auth/* as a catch-all whose Eden Treaty surface is
// loose. These thin wrappers keep the no-fetch-in-routes rule honest by
// owning the raw call here.
export async function requestPasswordReset(email: string) {
  const res = await fetch(`${baseUrl}/auth/forget-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, redirectTo: '/reset-password' }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    return { ok: false as const, message: body?.message ?? 'Reset request failed' }
  }
  return { ok: true as const }
}
