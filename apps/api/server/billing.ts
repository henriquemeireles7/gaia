// apps/api/server/billing.ts — Elysia plugin for the Polar billing flow.
//
// Routes:
//   POST /billing/checkout       — creates a Polar checkout session, returns the URL
//   GET  /billing/subscription   — returns the current user's active subscription (or null)
//
// Webhook is mounted in app.ts at /webhooks/polar; this file exports the
// `processPolarEvent()` helper it calls. Idempotency uses webhookEvents
// (provider='polar', externalEventId=event.id).

import { ProviderError } from '@gaia/adapters/errors'
import { polar } from '@gaia/adapters/payments'
import { env } from '@gaia/config'
import { db } from '@gaia/db'
import { subscriptions, webhookEvents } from '@gaia/db/schema'
import { AppError } from '@gaia/errors'
import { auth } from '@gaia/auth'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

// ── Types ───────────────────────────────────────────────────────

const SubStatus = t.Union([
  t.Literal('active'),
  t.Literal('past_due'),
  t.Literal('cancelled'),
  t.Literal('trialing'),
  t.Literal('incomplete'),
])

const SubscriptionResponse = t.Object({
  id: t.String(),
  status: SubStatus,
  productId: t.String(),
  currentPeriodEnd: t.String({ format: 'date-time' }),
})

// ── Service ─────────────────────────────────────────────────────

export async function getSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId)
  if (!sub) return false
  return sub.status === 'active' || sub.status === 'trialing'
}

type PolarSubscriptionEvent = {
  type: string
  id?: string
  data?: {
    id?: string
    customer_id?: string
    customer?: { id?: string; email?: string }
    product_id?: string
    status?: string
    current_period_end?: string | null
    metadata?: { user_id?: string }
  }
}

const SUBSCRIPTION_STATUSES = new Set(['active', 'past_due', 'cancelled', 'trialing', 'incomplete'])

function normalizeStatus(s: string | undefined): typeof subscriptions.$inferInsert.status {
  if (s && SUBSCRIPTION_STATUSES.has(s)) {
    return s as typeof subscriptions.$inferInsert.status
  }
  return 'incomplete'
}

/**
 * Apply a verified Polar event to the database. Idempotent — replays of
 * the same event id are no-ops. All shape guards run before any DB call
 * so unit tests can cover them without a live database.
 */
export async function processPolarEvent(event: PolarSubscriptionEvent): Promise<void> {
  const externalId = event.id ?? event.data?.id
  if (!externalId) return
  if (!event.type?.startsWith('subscription.')) return

  const data = event.data
  if (!data) return
  const userId = data.metadata?.user_id
  if (!userId) return // we attach user_id at checkout creation; without it we can't reconcile
  const polarSubId = data.id
  const customerId = data.customer_id ?? data.customer?.id
  const productId = data.product_id
  if (!polarSubId || !customerId || !productId) return
  const status = normalizeStatus(data.status)
  const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end) : new Date()

  // Idempotency: insert-or-skip. The unique constraint on externalEventId
  // makes a re-delivered event a no-op.
  const inserted = await db
    .insert(webhookEvents)
    .values({
      provider: 'polar',
      externalEventId: externalId,
      eventType: event.type,
    })
    .onConflictDoNothing({ target: webhookEvents.externalEventId })
    .returning({ id: webhookEvents.id })
  if (inserted.length === 0) return

  await db
    .insert(subscriptions)
    .values({
      userId,
      polarCustomerId: customerId,
      polarSubscriptionId: polarSubId,
      productId,
      status,
      currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.polarSubscriptionId,
      set: { status, currentPeriodEnd, productId, updatedAt: new Date() },
    })
}

// ── Routes ──────────────────────────────────────────────────────

export const billingRoutes = new Elysia({ name: 'billing' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return { user: session?.user ?? null }
  })

  .post(
    '/billing/checkout',
    async ({ user }) => {
      if (!user) throw new AppError('UNAUTHORIZED')
      try {
        // Use the new "custom checkout" API; the top-level
        // polar.checkouts.create is deprecated by Polar.
        const checkout = await polar.checkouts.custom.create({
          productId: env.POLAR_PRODUCT_ID,
          successUrl: `${env.PUBLIC_APP_URL}/dashboard?upgraded=1`,
          customerEmail: user.email,
          metadata: { user_id: user.id },
        })
        if (!checkout.url) {
          throw new ProviderError('polar', 'createCheckout', 502, 'no checkout URL returned')
        }
        return { url: checkout.url }
      } catch (err) {
        if (err instanceof ProviderError) throw err
        throw new ProviderError('polar', 'createCheckout', 502, String(err))
      }
    },
    {
      response: t.Object({ url: t.String() }),
    },
  )

  .get(
    '/billing/subscription',
    async ({ user }) => {
      if (!user) throw new AppError('UNAUTHORIZED')
      const sub = await getSubscription(user.id)
      if (!sub) return { subscription: null }
      return {
        subscription: {
          id: sub.id,
          status: sub.status,
          productId: sub.productId,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        },
      }
    },
    {
      response: t.Object({
        subscription: t.Union([t.Null(), SubscriptionResponse]),
      }),
    },
  )
