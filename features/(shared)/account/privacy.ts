import { and, eq } from 'drizzle-orm'
import { db } from '@/platform/db/client'
import { memberships, subscriptions, users } from '@/platform/db/schema'
import { payments } from '@/providers/payments'

/**
 * Export all user data as JSON (GDPR/LGPD right to data portability).
 * CUSTOMIZE: Add your app-specific tables to the export.
 */
export async function exportUserData(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const userSubs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
  })

  return {
    user: user ? { email: user.email, name: user.name, createdAt: user.createdAt } : null,
    subscriptions: userSubs.map((s) => ({
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd,
      createdAt: s.createdAt,
    })),
    // CUSTOMIZE: Add more tables here
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Delete all user data (GDPR/LGPD right to erasure).
 * CUSTOMIZE: Add delete calls for your app-specific tables.
 */
export async function deleteUserAccount(userId: string) {
  // Check for sole-owner organizations — must transfer ownership first
  const ownerMemberships = await db.query.memberships.findMany({
    where: and(eq(memberships.userId, userId), eq(memberships.role, 'owner')),
  })

  for (const m of ownerMemberships) {
    const otherOwners = await db.query.memberships.findMany({
      where: and(eq(memberships.orgId, m.orgId), eq(memberships.role, 'owner')),
    })
    if (otherOwners.length <= 1) {
      throw new Error(
        'Cannot delete account while sole owner of organizations. Transfer ownership first.',
      )
    }
  }

  // Cancel active Stripe subscriptions before deleting DB rows
  const userSubs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
  })

  for (const sub of userSubs) {
    if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
      try {
        await payments.subscriptions.cancel(sub.stripeSubscriptionId)
      } catch {
        // Stripe failure should not block account deletion
      }
    }
  }

  await db.delete(subscriptions).where(eq(subscriptions.userId, userId))
  // CUSTOMIZE: Delete additional user data tables here
  // Deleting user cascades sessions, accounts
  await db.delete(users).where(eq(users.id, userId))

  return { deleted: true }
}
