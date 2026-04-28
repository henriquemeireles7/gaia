import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { requireAuth } from '@/platform/auth/middleware'
import { db } from '@/platform/db/client'
import { subscriptions } from '@/platform/db/schema'
import { env } from '@/platform/env'
import { throwError } from '@/platform/errors'
import { success } from '@/platform/server/responses'
import type { AppEnv } from '@/platform/types'
import { payments } from '@/providers/payments'

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
