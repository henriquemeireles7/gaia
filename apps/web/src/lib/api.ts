// apps/web/src/lib/api.ts — typed API client (Eden Treaty)
//
// Single point of contact between the SolidStart app and the Elysia API.
// Imports `App` as a TYPE only; no runtime dependency on apps/api code.

import { treaty } from '@elysiajs/eden'
import type { App } from '@gaia/api-server'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = treaty<App>(baseUrl)
