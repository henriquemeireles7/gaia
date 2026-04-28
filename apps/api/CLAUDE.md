# api/

## Purpose
The HTTP API. Currently runs on Hono (`server/app.ts`) with Elysia (`server/elysia-app.ts`) coming online incrementally. Once parity is reached, Hono is deleted and Elysia is the only entry point. Vision §Stack: Elysia + TypeBox + Eden Treaty.

## Critical Rules
- NEVER add new routes to `server/app.ts` (Hono). Add them to `server/elysia-app.ts` (Elysia) instead.
- NEVER import a feature's internals from another feature; cross-feature reuse goes through `packages/`.
- ALWAYS validate request input with TypeBox schemas in Elysia routes (`body`, `query`, `params` keys).
- ALWAYS shape responses with TypeBox `response` schemas so Eden Treaty types reach the client.
- ALWAYS run `bun run check` before committing.

## Migration status (Phase 4)

| Concern | Today | Target |
|---|---|---|
| Framework | Hono (`server/app.ts`) | Elysia (`server/elysia-app.ts`) |
| Validation | Zod (`@hono/zod-validator`) | TypeBox (`@sinclair/typebox`, native to Elysia) |
| Type bridge | none | Eden Treaty (`packages/api/`) |
| Workflows | none | Inngest (`packages/workflows/`) |
| Payments | Stripe (`packages/adapters/payments.ts`) | Polar (`@polar-sh/sdk`) |

Hono and Elysia run side-by-side on different prefixes during the swap (`/api/*` Hono, `/v2/*` Elysia). Each route is ported individually; Hono entries are deleted when their Elysia counterpart passes parity tests.

## Imports (use from other modules)
```ts
import { app } from '@/apps/api/server/app'           // Hono (legacy)
import { elysiaApp } from '@/apps/api/server/elysia-app' // Elysia (target)
```

## Recipe: New endpoint
1. Add to `server/elysia-app.ts`:
   ```ts
   .get('/things', () => list(), {
     response: t.Array(thingSchema),
   })
   ```
2. The `ElysiaApp` type updates automatically; clients get it via `packages/api/`.
3. Add a colocated test in the same folder.

## Verify
```sh
bun run check
```
