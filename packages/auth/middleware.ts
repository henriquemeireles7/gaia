import type { Context, Next } from 'hono'
import type { AppEnv } from '@/packages/config/types'
import { throwError } from '@/packages/errors'
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
