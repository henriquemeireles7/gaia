// apps/api/server/elysia-app.ts — Elysia app skeleton (vision §Stack)
//
// This is the target framework. The existing Hono app at app.ts continues
// to serve traffic during the migration; this file is the canonical Elysia
// entry point that routes will be ported to over time.
//
// The pattern is: each Hono route gets re-implemented here as an Elysia
// .get/.post chain returning typed responses, then the route is removed
// from the Hono app once parity tests pass.

import { Elysia, t } from 'elysia'

export const elysiaApp = new Elysia({ prefix: '/v2' }).get('/health', () => ({ ok: true }), {
  response: t.Object({
    ok: t.Boolean(),
  }),
})

export type ElysiaApp = typeof elysiaApp
