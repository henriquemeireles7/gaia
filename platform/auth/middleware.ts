import type { Context, Next } from 'hono'
import { throwError } from '../errors'
import type { AppEnv } from '../types'
import { auth } from './config'

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user) {
    return throwError(c, 'UNAUTHORIZED')
  }

  c.set('user', session.user as unknown as AppEnv['Variables']['user'])
  c.set('session', session.session)
  return next()
}
