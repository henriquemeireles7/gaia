# Auth — Better Auth + Drizzle, Single Source of Truth

> Status: Reference
> Last verified: April 2026
> Scope: All authentication and session code in `packages/auth/` and every caller. Mounted into Elysia at `/auth/*`.

---

## What this file is

The patterns for authentication in Gaia. These implement principles #5 (session hardening), #6 (CSRF), and the auth-adjacent parts of #1 (protected routes) and #6 in `packages/errors/CLAUDE.md` (uniform errors).

`packages/auth/` wraps Better Auth wired to Drizzle. It exposes a single `auth` object with two surfaces:

1. `auth.handler` — mounted at `/auth/*` for the user-facing flows (signup, login, verify, reset, OAuth).
2. `auth.api.getSession({ headers })` — the typed server-side session lookup used by `protectedRoute`.

Vendor SDKs (Better Auth, OAuth providers) are imported **only** here. Features import `@gaia/auth`, never `better-auth`.

Read `code.md` first.

---

## The 10 auth patterns

### 1. One `auth` object — the only entry point

There is one `auth` instance, exported from `packages/auth/index.ts`. Every session lookup, signup, login, password reset, OAuth callback flows through it. Features never call `better-auth` directly.

**Pattern:**

```ts
// packages/auth/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@gaia/db'
import * as schema from '@gaia/db/schema'
import { env } from '@gaia/config'
import { sendEmail } from '@gaia/adapters/email'

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
  // ... see remaining patterns for full config
})

export type Auth = typeof auth
```

**Anti-pattern:**

```ts
// ❌ Hand-rolled session lookup
const session = await db.query.sessions.findFirst({ where: eq(sessions.token, token) })

// ❌ Feature imports Better Auth directly
import { betterAuth } from 'better-auth'

// ❌ A second auth instance with different config
export const adminAuth = betterAuth({ ... })
```

**Enforcement:**

- Oxlint rule — `import * from 'better-auth'` (and `better-auth/*`) is allowed only in `packages/auth/`.
- Lint rule — direct `db.query.sessions` reads outside `packages/auth/` flag as warning.

---

### 2. Session lookups go through `auth.api.getSession`

`protectedRoute` (in `packages/security/`) is the only consumer of `auth.api.getSession`. Routes derive `user` and `session` from the wrapper, not from raw header parsing.

**Pattern:**

```ts
// packages/security/protected-route.ts
import { Elysia } from 'elysia'
import { auth } from '@gaia/auth'
import { AppError } from '@gaia/errors'

export const protectedRoute = new Elysia({ name: 'security.protected' }).derive(
  async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new AppError('UNAUTHORIZED')
    return {
      user: session.user,
      session: session.session,
      requestId: crypto.randomUUID(),
    }
  },
)
```

```ts
// Feature usage
.use(protectedRoute)
.get('/me', ({ user }) => user)
```

**Anti-pattern:**

```ts
// ❌ Manual cookie parse
const token = request.headers.get('cookie')?.match(/gaia\.session=([^;]+)/)?.[1]

// ❌ Direct DB lookup
const session = await db.query.sessions.findFirst({ where: eq(sessions.id, token) })
```

**Enforcement:**

- `protectedRoute` is the only file that calls `auth.api.getSession`.
- Lint rule — routes that read `request.headers.cookie` directly trigger `/w-review` flag.

---

### 3. Session hardening — Better Auth config locked down

Sessions are where most real-world breaches happen. The Better Auth config sets the OWASP-recommended defaults. See `packages/security/CLAUDE.md` #5 for the threat model.

**Pattern:**

```ts
// packages/auth/index.ts (the hardened block)
betterAuth({
  secret: env.BETTER_AUTH_SECRET, // ≥ 32 chars (256-bit), env only
  baseURL: env.PUBLIC_APP_URL,
  trustedOrigins: env.ALLOWED_ORIGINS, // explicit list, no wildcards

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days max
    updateAge: 60 * 60 * 24, // refresh sliding window daily
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5-min cache
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
    cookiePrefix: 'gaia',
    defaultCookieAttributes: {
      httpOnly: true, // XSS defense
      secure: true, // HTTPS only
      sameSite: 'lax', // CSRF defense
      path: '/',
      // domain: undefined — host-only; cross-subdomain sharing disabled
    },
    disableCSRFCheck: false, // never disable
    disableOriginCheck: false,
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12, // NIST 2017+ recommendation
    maxPasswordLength: 128,
    password: {
      hash: (pw) => Bun.password.hash(pw, 'argon2id'),
      verify: ({ password, hash }) => Bun.password.verify(password, hash),
    },
  },
})
```

**Anti-pattern:**

```ts
// ❌ Storing session in localStorage — readable by any JS, vulnerable to XSS
localStorage.setItem('session', token)

// ❌ Disabling CSRF "for convenience"
disableCSRFCheck: true

// ❌ Wildcard trusted origins
trustedOrigins: ['*']

// ❌ Long-lived sessions
expiresIn: 60 * 60 * 24 * 365 // a year
```

**Enforcement:**

- Integration test — login, inspect `Set-Cookie` header, assert `HttpOnly`, `Secure` (prod), `SameSite=Lax`.
- ADR required for any change to `defaultCookieAttributes` or `session.expiresIn`.
- Client-side scanner: `localStorage.setItem(...token...|...auth...|...session...)` triggers lint error.

---

### 4. Email and password are first-class — argon2id, verification required

Email/password is the default flow. OAuth providers are additive (principle 9). Passwords hash with `argon2id` via `Bun.password`. Email verification is mandatory before login completes.

**Pattern:**

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  password: {
    hash: (password) => Bun.password.hash(password, 'argon2id'),
    verify: ({ password, hash }) => Bun.password.verify(password, hash),
  },
  sendResetPassword: async ({ user, url }) => {
    await sendEmail(user.email, {
      subject: 'Reset your Gaia password',
      html: `<p>Click below to reset your password. The link expires in 1 hour.</p>
             <p><a href="${url}">Reset password</a></p>`,
    })
  },
},
emailVerification: {
  sendOnSignUp: true,
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail(user.email, {
      subject: 'Verify your email for Gaia',
      html: `<p>Welcome. Click below to confirm your email:</p>
             <p><a href="${url}">Verify email</a></p>`,
    })
  },
},
```

Email delivery goes through `@gaia/adapters/email` — never `resend` directly. See `packages/adapters/CLAUDE.md` #1.

**Anti-pattern:**

```ts
// ❌ bcrypt or sha — slower hash beats both
password: { hash: (pw) => bcrypt.hash(pw, 10) }

// ❌ Email verification optional
requireEmailVerification: false

// ❌ Direct vendor SDK
sendResetPassword: async ({ user, url }) => {
  const resend = new Resend(env.RESEND_API_KEY) // imports vendor in auth package
  await resend.emails.send({ ... })
}
```

**Enforcement:**

- Lint rule — `bcrypt` import is banned; `Bun.password` is the only hash API.
- Integration test — signup creates user with `emailVerified: false`; login before verification returns `UNAUTHORIZED`.

---

### 5. Auth errors are uniform — never reveal account existence

"User not found" vs "wrong password" enables account enumeration. Better Auth's default error responses are uniform; Gaia keeps it that way and never adds custom errors that distinguish.

**Pattern:**

```ts
// All auth failures return UNAUTHORIZED to the client
async function login({ email, password }) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    log.info('auth.login.failed', { reason: 'user_not_found', email })
    throw new AppError('UNAUTHORIZED', { context: { reason: 'user_not_found' } })
  }
  if (!(await Bun.password.verify(password, user.passwordHash))) {
    log.info('auth.login.failed', { reason: 'wrong_password', userId: user.id })
    throw new AppError('UNAUTHORIZED', { context: { reason: 'wrong_password' } })
  }
  return user
}
```

Same client response. Different log entries. See `packages/errors/CLAUDE.md` #6 for the full pattern.

**Anti-pattern:**

```ts
// ❌ Reveals existence
if (!user) throw new AppError('USER_NOT_FOUND')
if (!verified) throw new AppError('WRONG_PASSWORD')
```

**Enforcement:**

- Code review flag — any new auth-adjacent error code that distinguishes "user" vs "credential" failure triggers `/w-review`.
- Integration test — login with non-existent email and login with wrong password return identical body and headers (timing comparison test).

---

### 6. Session rotation — on login, on password change

Better Auth rotates sessions on login by default (defends session fixation). Gaia adds a plugin to revoke all sessions on password change (defends stolen session reuse).

**Pattern:**

```ts
// packages/auth/plugins/revoke-on-password-change.ts (target shape)
import type { BetterAuthPlugin } from 'better-auth'
import { db } from '@gaia/db'
import { sessions } from '@gaia/db/schema'
import { eq } from 'drizzle-orm'

export function revokeOnPasswordChange(): BetterAuthPlugin {
  return {
    id: 'revoke-on-password-change',
    hooks: {
      after: [
        {
          matcher: (ctx) => ctx.path === '/change-password',
          handler: async ({ user }) => {
            await db.delete(sessions).where(eq(sessions.userId, user.id))
          },
        },
      ],
    },
  }
}

// In packages/auth/index.ts
betterAuth({
  // ...
  plugins: [revokeOnPasswordChange()],
})
```

**Enforcement:**

- Integration test — change password, attempt to use old session token, assert 401.
- Integration test — login twice in the same browser, assert second login returns a different session id.

---

### 7. Ownership checks are an auth concern, not a route concern

Authentication says "you are logged in". Authorization says "you own this row". The shared `requireOwnership()` helper lives in `packages/auth/` because it's the layer between session and resource.

**Pattern:**

```ts
// packages/auth/ownership.ts
import { AppError } from '@gaia/errors'

export function requireOwnership<T extends { userId: string }>(
  resource: T | null,
  userId: string,
): T {
  if (!resource) throw new AppError('NOT_FOUND') // uniform: don't reveal existence
  if (resource.userId !== userId) throw new AppError('NOT_FOUND') // same response as missing
  return resource
}
```

```ts
// Feature usage
.get('/invoices/:id', async ({ params, user }) => {
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, params.id), eq(invoices.userId, user.id)),
  })
  return requireOwnership(invoice, user.id)
})
```

See `packages/security/CLAUDE.md` #2 for the threat model and `packages/errors/CLAUDE.md` #6 for the uniform-error rule.

**Enforcement:**

- GritQL rule — `db.query.*.findFirst({ where: eq(X.id, ...) })` without a second `eq()` clause (tenant, userId, orgId) flags as BOLA risk.
- Security integration test — for every `GET/PUT/DELETE /resource/:id` route, create resource owned by user A, attempt access as user B, assert 404.

---

### 8. Audit every auth event

Every login, logout, password change, email change, session revoke, and 2FA toggle emits an audit log entry. `packages/security/audit-log.ts` is the entry point. See `packages/security/CLAUDE.md` #10.

**Pattern:**

```ts
import { auditLog } from '@gaia/security/audit-log'

// Inside Better Auth hooks (or a plugin)
hooks: {
  after: [{
    matcher: (ctx) => ctx.path === '/sign-in',
    handler: async ({ user, request }) => {
      await auditLog({
        userId: user.id,
        action: 'auth.login',
        subject: user.id,
      })
    },
  }],
}
```

Events to audit (minimum baseline):

| Event                                            |
| ------------------------------------------------ |
| `auth.login`, `auth.login_failed`, `auth.logout` |
| `auth.password_changed`, `auth.email_changed`    |
| `auth.session_revoked`, `auth.session_expired`   |
| `auth.2fa_enabled`, `auth.2fa_disabled`          |
| `auth.oauth_linked`, `auth.oauth_unlinked`       |

**Anti-pattern:**

```ts
// ❌ Console-log audit (lost on crash, can't query)
console.log('user logged in', user.id)
```

**Enforcement:**

- Integration test — every Better Auth flow (signup, login, logout, password change) produces an audit log entry.
- DB migration grants `INSERT` only on `audit_log` to the app role — see `packages/security/CLAUDE.md` #10.

---

### 9. OAuth is opt-in, never the default

Email/password is the default flow. OAuth providers (Google, GitHub) are conditionally enabled — only when env keys are set. Never the only login method (email recovery still required for account recovery).

**Pattern:**

```ts
// packages/auth/index.ts
betterAuth({
  // ...
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
```

When OAuth is enabled, the `account` table links external identities to the local `users` row. The local user is the source of truth — OAuth is an attached identity, not a replacement.

**Anti-pattern:**

```ts
// ❌ OAuth-only with no email/password fallback
emailAndPassword: { enabled: false }, // user can't recover account if OAuth provider lockout

// ❌ Hardcoded credentials
clientId: 'real-client-id-123',
```

**Enforcement:**

- `socialProviders` block must guard every provider with an env check; lint rule flags hardcoded provider config.
- Boot warning if OAuth is enabled but `requireEmailVerification` is `false` (the linked email may be unverified).

---

### 10. Better Auth is the integration seam — swap-ready

If Better Auth is replaced (e.g., for Auth.js, Clerk, or a self-hosted alternative), the change is contained to `packages/auth/`. Features import `auth.api.getSession` and `auth.handler`; they never know which library is underneath.

**Pattern:**

The public API of `@gaia/auth` is exactly:

```ts
export const auth: {
  handler: (request: Request) => Promise<Response>
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{ user: User; session: Session } | null>
  }
}

export type Auth = typeof auth
```

Anything beyond this surface is internal. A future swap re-implements `handler` and `getSession` against the new library; everything else stays the same.

**Anti-pattern:**

```ts
// ❌ Feature reaches into Better Auth internals
import { auth } from '@gaia/auth'
const internal = (auth as any).$context.adapter.findOne(...) // locks Gaia to Better Auth
```

**Enforcement:**

- Lint rule — code outside `packages/auth/` may use only `auth.handler` and `auth.api.getSession`.
- Public API typed in `packages/auth/index.ts`; widening it requires a PR justification.

---

## Inventory

| File           | Purpose                                                           |
| -------------- | ----------------------------------------------------------------- |
| `index.ts`     | The single `auth` object — Better Auth wired to Drizzle           |
| `ownership.ts` | `requireOwnership()` — authorization helper (planned)             |
| `plugins/*.ts` | Better Auth plugins (e.g., `revoke-on-password-change`) (planned) |

---

## Quick reference

| Need                               | Pattern                                                               |
| ---------------------------------- | --------------------------------------------------------------------- |
| Look up the current session        | `await auth.api.getSession({ headers: request.headers })`             |
| Protect a route                    | `.use(protectedRoute)` from `@gaia/security/protected-route`          |
| Open a public route                | `.use(publicRoute)` from `@gaia/security/public-route` (with ADR tag) |
| Check ownership                    | `requireOwnership(resource, user.id)` from `@gaia/auth/ownership`     |
| Mount the auth handler             | `app.all('/auth/*', ({ request }) => auth.handler(request))`          |
| Send a verification or reset email | Configured inside Better Auth hooks; calls `@gaia/adapters/email`     |
| Audit an auth event                | `await auditLog({ userId, action: 'auth.login', subject: userId })`   |
| Hash / verify passwords            | `Bun.password.hash(pw, 'argon2id')` / `Bun.password.verify(pw, hash)` |

---

## Cross-references

- Code principles: `.claude/skills/w-code/reference.md`
- Backend patterns: `apps/api/CLAUDE.md` (route guards, schema imports)
- Security: `packages/security/CLAUDE.md` (#1 protected by default, #5 sessions, #6 CSRF)
- Errors: `packages/errors/CLAUDE.md` (#6 uniform auth errors)
- Database: `packages/db/CLAUDE.md` (`users`, `sessions`, `accounts`, `verifications` tables)
- Adapters: `packages/adapters/CLAUDE.md` (email delivery)
