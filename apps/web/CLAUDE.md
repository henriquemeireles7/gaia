# web/

## Purpose

SolidStart frontend (vision §Stack). File-based routing under `src/routes/`. Consumes the API via Eden Treaty (`packages/api/`). Replaces the legacy Preact SSR layer that currently renders inside `apps/api/server/render.tsx`.

## Critical Rules

- NEVER call vendor SDKs from the frontend (Stripe, Polar, Resend). Go through `packages/api/` (Eden Treaty client) so types and auth boundaries are preserved.
- NEVER render data the API hasn't typed. If the response shape is unknown, the route is wrong.
- ALWAYS use file-based routing — `src/routes/foo.tsx` becomes `/foo`. Don't hand-roll a router.
- ALWAYS keep route components dumb — call a service/loader, pass to a component, render. Vision §Architecture-9.

## Migration status (Phase 5)

| Concern     | Today                                                                | Target                        |
| ----------- | -------------------------------------------------------------------- | ----------------------------- |
| Frontend    | Preact SSR (`packages/ui/` rendered by `apps/api/server/render.tsx`) | SolidStart (`apps/web/`)      |
| Routing     | hand-mapped in Hono                                                  | file-based in `src/routes/`   |
| Type bridge | none                                                                 | Eden Treaty (`packages/api/`) |

Pages port one at a time; each port deletes its Preact counterpart in `packages/ui/` once parity is reached.

## Imports (use from other modules)

```tsx
import { createApiClient } from '@gaia/api'
const api = createApiClient(import.meta.env.VITE_API_URL)
```

## Recipe: New route

1. Add `src/routes/<name>.tsx` exporting a Solid component.
2. Use a `createAsync` or route loader for data fetching via Eden Treaty.
3. Style via tokens from `packages/ui/styles/` (kept during migration).

## Verify

```sh
bunx tsc --noEmit
bun run dev:web
```
