import { eq } from 'drizzle-orm'
import { db } from '@/platform/db/client'
import { subscriptions, users } from '@/platform/db/schema'

/**
 * Look up user data for a Stripe subscription.
 * Used by webhook handlers to get email + name for lifecycle emails.
 *
 * Returns null when the subscription isn't linked to a user yet.
 * Callers MUST handle null gracefully — skip the email, don't throw.
 */
export async function getUserForSubscription(
  stripeSubscriptionId: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  })

  if (!subscription?.userId) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, subscription.userId),
  })

  if (!user) return null

  return { id: user.id, email: user.email, name: user.name }
}
