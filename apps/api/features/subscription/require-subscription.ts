import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '@/packages/config/types'
import { db } from '@/packages/db/client'
import { subscriptions } from '@/packages/db/schema'
import { throwError } from '@/packages/errors'

/**
 * Access-gating middleware: checks subscription status + period end.
 * Must be stacked AFTER requireAuth (needs user in context).
 */
export const requireActiveSubscription = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user')

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })

  if (!subscription) {
    return throwError(c, 'SUBSCRIPTION_REQUIRED')
  }

  const activeStatuses = ['active', 'past_due', 'trialing']
  if (!activeStatuses.includes(subscription.status)) {
    return throwError(c, 'SUBSCRIPTION_REQUIRED')
  }

  // Check period end: handles cancel_at_period_end where status stays 'active'
  const gracePeriod = 24 * 60 * 60 * 1000 // 1 day
  if (subscription.currentPeriodEnd.getTime() + gracePeriod < Date.now()) {
    return throwError(c, 'SUBSCRIPTION_REQUIRED')
  }

  await next()
})
