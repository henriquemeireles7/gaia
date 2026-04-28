# api/

## Purpose
The Elysia HTTP API. Single entry at `server/app.ts`. Better Auth handles `/auth/*`; everything else is typed Elysia routes with TypeBox schemas so Eden Treaty derives end-to-end client types in `packages/api/`.

## Critical Rules
- NEVER add a `/api/...` route by hand-rolling fetch handlers — define on the Elysia `app` so the type flows to clients.
- ALWAYS validate request input with TypeBox (`body`, `query`, `params`) and shape responses with TypeBox (`response`).
- NEVER import vendor SDKs (Resend, Polar, Anthropic, S3, PostHog) directly. Go through `packages/adapters/`.
- NEVER write authorization checks inline. Use `auth.api.getSession({ headers })` from `packages/auth/`.
- ALWAYS `bun run check` before committing.

## Imports (use from other modules)
```ts
import { app } from '@gaia/api-server'
```

## Recipe: New endpoint
```ts
import { Elysia, t } from 'elysia'
import { app } from './app'

app.get('/things/:id', ({ params }) => fetchThing(params.id), {
  params: t.Object({ id: t.String({ format: 'uuid' }) }),
  response: t.Object({ id: t.String(), name: t.String() }),
})
```

The route's body/query/params/response types automatically reach the client via `packages/api/`.

## Verify
```sh
bun run check
bun run dev
```
