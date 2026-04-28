import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { db } from '../db/client'
import { apiKeys, users } from '../db/schema'
import { throwError } from '../errors'
import type { AppEnv, AppUser } from '../types'

const ROLE_HIERARCHY: Record<AppUser['role'], number> = {
  free: 0,
  pro: 1,
  admin: 2,
}

const API_KEY_PREFIX = 'sk_'
const API_KEY_HEADER = 'authorization'
const BEARER_PREFIX = 'Bearer '

/**
 * Generate a new API key with a secure random value.
 * Returns the full key (shown once) and the hash (stored in DB).
 */
export async function generateApiKey(): Promise<{ key: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const key = `${API_KEY_PREFIX}${raw}`
  const hash = await hashKey(key)
  return { key, hash }
}

/**
 * Create an API key for a user, with role escalation prevention.
 * The requested key role cannot exceed the creating user's current role.
 */
export async function createApiKey(
  creatingUser: AppUser,
  opts: { name: string; role: AppUser['role']; expiresAt?: Date },
): Promise<{ key: string; id: string }> {
  if (ROLE_HIERARCHY[opts.role] > ROLE_HIERARCHY[creatingUser.role]) {
    throw new Error(
      `Cannot create API key with role "${opts.role}" — exceeds your current role "${creatingUser.role}"`,
    )
  }

  const { key, hash } = await generateApiKey()

  const [record] = await db
    .insert(apiKeys)
    .values({
      userId: creatingUser.id,
      name: opts.name,
      keyHash: hash,
      role: opts.role,
      expiresAt: opts.expiresAt ?? null,
    })
    .returning({ id: apiKeys.id })

  return { key, id: record!.id }
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function extractBearerToken(c: Context): string | null {
  const header = c.req.header(API_KEY_HEADER)
  if (!header?.startsWith(BEARER_PREFIX)) return null
  const token = header.slice(BEARER_PREFIX.length).trim()
  if (!token.startsWith(API_KEY_PREFIX)) return null
  return token
}

function hasSessionCookie(c: Context): boolean {
  const cookieHeader = c.req.header('cookie')
  if (!cookieHeader) return false
  // better-auth uses "better-auth.session_token" as its session cookie name
  return cookieHeader.includes('better-auth.session_token=')
}

/**
 * Middleware that authenticates via API key (Bearer token).
 *
 * Mutually exclusive with session auth:
 * - If both API key header AND session cookie present → 400
 * - If API key present → validate and set user context
 * - If no API key → pass through (let session auth handle it)
 *
 * @example
 * app.use('/api/*', apiKeyAuth)
 * app.use('/api/*', requireAuth) // falls back to session if no API key
 */
export async function apiKeyAuth(c: Context<AppEnv>, next: Next) {
  const token = extractBearerToken(c)
  const hasCookie = hasSessionCookie(c)

  // No API key → let next middleware (session auth) handle it
  if (!token) return next()

  // Both present → reject (confused deputy prevention)
  if (hasCookie) {
    return throwError(
      c,
      'INVALID_REQUEST',
      'Cannot use both API key and session authentication. Use one or the other.',
    )
  }

  // Validate the API key
  const hash = await hashKey(token)
  const [record] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1)

  if (!record) {
    return throwError(c, 'UNAUTHORIZED', 'Invalid API key')
  }

  if (record.revokedAt) {
    return throwError(c, 'UNAUTHORIZED', 'API key has been revoked')
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    return throwError(c, 'UNAUTHORIZED', 'API key has expired')
  }

  // Update last used timestamp (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, record.id))
    .catch(() => {})

  // Fetch the user's CURRENT role and email from the users table
  // (the API key's stored role may be stale after role changes)
  const [dbUser] = await db
    .select({ email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1)

  if (!dbUser) {
    return throwError(c, 'UNAUTHORIZED', 'API key owner no longer exists')
  }

  const user: AppUser = {
    id: record.userId,
    email: dbUser.email,
    name: dbUser.name,
    role: (dbUser.role as AppUser['role']) ?? 'free',
  }

  c.set('user', user)
  c.set('session', { id: `apikey:${record.id}`, userId: record.userId })

  return next()
}

// Re-export for route handlers that need to create/revoke keys
export { apiKeys } from '../db/schema'
