# auth/

## Purpose

Better Auth wired to Drizzle. The single source of truth for who the user is. Mounted into Elysia at `/auth/*` and queried for sessions on every authenticated request.

## Critical Rules

- NEVER hand-roll session lookups. Always go through `auth.api.getSession({ headers })`.
- NEVER read `BETTER_AUTH_SECRET` directly — it's already wired in this package.
- NEVER add a route or hook that bypasses `auth` to set `session`/`user` on the request scope.
- ALWAYS use this package as the integration point if you swap auth providers later — features must not import `better-auth` directly.

## Imports (use from other modules)

```ts
import { auth } from '@gaia/auth'

// In an Elysia route:
const session = await auth.api.getSession({ headers: request.headers })
```

## Recipe: Protect a route in Elysia

```ts
import { Elysia } from 'elysia'
import { auth } from '@gaia/auth'
import { AppError } from '@gaia/errors'

export const protectedRoutes = new Elysia()
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new AppError('UNAUTHORIZED')
    return { user: session.user, session: session.session }
  })
  .get('/me', ({ user }) => user)
```

## Verify

```sh
bun run check
```
