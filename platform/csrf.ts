import type { Context, Next } from 'hono'
import { throwError } from './errors'
import type { AppEnv } from './types'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = '__csrf'
const TOKEN_LENGTH = 32

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const cookies: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=')
    const k = key?.trim()
    if (k) cookies[k] = rest.join('=').trim()
  }
  return cookies
}

/**
 * CSRF protection middleware using double-submit cookie pattern.
 *
 * On GET requests: sets a CSRF cookie if not already present.
 * On state-changing requests (POST/PUT/PATCH/DELETE): validates the
 * x-csrf-token header matches the __csrf cookie value.
 *
 * Better-auth handles its own CSRF. This middleware protects custom routes.
 *
 * @example
 * app.use('/api/account/*', csrfProtection())
 */
export function csrfProtection() {
  return async (c: Context<AppEnv>, next: Next) => {
    // Skip CSRF for API key authenticated requests (machine-to-machine)
    const authHeader = c.req.header('authorization')
    if (authHeader?.startsWith('Bearer sk_')) {
      return next()
    }

    const method = c.req.method
    const cookies = parseCookies(c.req.header('cookie'))
    const existingToken = cookies[CSRF_COOKIE]

    // GET/HEAD/OPTIONS: set the cookie if not present, then pass through
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      if (!existingToken) {
        const token = generateToken()
        c.header('Set-Cookie', `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; Secure`)
      }
      return next()
    }

    // State-changing methods: require matching token
    const headerToken = c.req.header(CSRF_HEADER)

    if (!existingToken || !headerToken || existingToken !== headerToken) {
      return throwError(c, 'FORBIDDEN', 'Invalid or missing CSRF token')
    }

    return next()
  }
}
