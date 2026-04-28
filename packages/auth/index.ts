// packages/auth/index.ts — better-auth wired to Drizzle (vision §Stack)
//
// Mounted into Elysia at apps/api/server/app.ts via `auth.handler` over
// the catch-all `/auth/*` route. The same `auth` object exposes a typed
// `getSession({ headers })` for server-side authorization checks.

import { env } from '@gaia/config'
import { db } from '@gaia/db'
import * as schema from '@gaia/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => Bun.password.hash(password, 'argon2id'),
      verify: ({ password, hash }) => Bun.password.verify(password, hash),
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
})

export type Auth = typeof auth
