import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { success } from '@/apps/api/server/responses'
import { payments } from '@/packages/adapters/payments'
import { requireAuth } from '@/packages/auth/middleware'
import { env } from '@/packages/config/env'
import type { AppEnv } from '@/packages/config/types'
import { db } from '@/packages/db/client'
import { subscriptions } from '@/packages/db/schema'
import { throwError } from '@/packages/errors'

export const portalRoutes = new Hono<AppEnv>()

// CUSTOMIZE: Update return_url
portalRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user')

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })

  if (!subscription) {
    return throwError(c, 'SUBSCRIPTION_NOT_FOUND')
  }

  const portalSession = await payments.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${env.PUBLIC_APP_URL}/settings`,
  })

  return success(c, { url: portalSession.url })
})
