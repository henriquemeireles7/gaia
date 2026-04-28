# api/

## Purpose
Eden Treaty client. Bridges types from the Elysia server (`apps/api/server/elysia-app.ts`) to any consumer (the SolidStart frontend, internal scripts, future SDKs). Vision §Stack: "Type bridge: Eden Treaty (end-to-end types, server → client)."

## Critical Rules
- NEVER import this package from inside `apps/api/`. The API IS the source of truth; the client is downstream.
- ALWAYS construct via `createApiClient(baseUrl)` so callers control the URL (env-driven).
- ALWAYS keep this package side-effect-free. Importing it must not start a server or open a connection.

## Imports (use from other modules)
```ts
import { createApiClient } from '@/packages/api'
const api = createApiClient(env.API_BASE_URL)
const { data } = await api.v2.health.get()
```

## Recipe: New endpoint type flow
1. Add the route in `apps/api/server/elysia-app.ts` with TypeBox `response` and `body` schemas.
2. The `ElysiaApp` type updates automatically.
3. Consumers get the new endpoint shape via `api.<path>.<method>()`.

## Verify
```sh
bunx tsc --noEmit
```
