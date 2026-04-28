import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '@/platform/db/client'
import { subscriptions, webhookEvents } from '@/platform/db/schema'
import { env } from '@/platform/env'
import { throwError } from '@/platform/errors'
import { success } from '@/platform/server/responses'
import { sendEmail } from '@/providers/email'
import { intervalFromPriceId, payments } from '@/providers/payments'
import {
  accessRevokedEmail,
  paymentFailedEmail,
  renewalReceiptEmail,
  subscriptionCancelledEmail,
} from '../email/payment-emails'
import { getUserForSubscription } from './helpers'

export const webhookRoutes = new Hono()

webhookRoutes.post('/', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')

  if (!signature) {
    return throwError(c, 'VALIDATION_ERROR', 'No signature')
  }

  let event: ReturnType<typeof payments.webhooks.constructEvent> extends Promise<infer T>
    ? T
    : ReturnType<typeof payments.webhooks.constructEvent>
  try {
    event = payments.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return throwError(c, 'VALIDATION_ERROR', 'Invalid signature')
  }

  // Idempotency: INSERT-first with ON CONFLICT DO NOTHING
  const inserted = await db
    .insert(webhookEvents)
    .values({ stripeEventId: event.id, eventType: event.type })
    .onConflictDoNothing({ target: webhookEvents.stripeEventId })

  if ((inserted as unknown as { rowCount: number }).rowCount === 0) {
    console.info(`[webhook] Duplicate: ${event.type} ${event.id}`)
    return success(c, { received: true })
  }

  console.info(`[webhook] ${event.type} ${event.id}`)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode !== 'subscription') break

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription?.id ?? '')

      if (!subscriptionId) break

      const customerId =
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? '')

      const sub = await payments.subscriptions.retrieve(subscriptionId)
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end
      const priceId =
        (sub as unknown as { items?: { data?: Array<{ price?: { id?: string } }> } }).items
          ?.data?.[0]?.price?.id ?? ''

      await db
        .insert(subscriptions)
        .values({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: 'active',
          planInterval: intervalFromPriceId(priceId),
          currentPeriodEnd: new Date(periodEnd * 1000),
        })
        .onConflictDoNothing({ target: subscriptions.stripeSubscriptionId })

      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as unknown as {
        billing_reason: string
        subscription: string
        amount_paid?: number
        lines?: { data?: Array<{ period?: { end?: number } }> }
      }

      if (invoice.billing_reason !== 'subscription_cycle') break

      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : ''
      if (!subId) break

      const periodEnd = invoice.lines?.data?.[0]?.period?.end
      if (periodEnd) {
        await db
          .update(subscriptions)
          .set({ currentPeriodEnd: new Date(periodEnd * 1000), updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, subId))
      }

      // Send renewal receipt email
      const user = await getUserForSubscription(subId)
      if (user) {
        const amount = invoice.amount_paid
          ? `$${(invoice.amount_paid / 100).toFixed(2)}`
          : 'your plan'
        const nextDate = periodEnd
          ? new Date(periodEnd * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'your next billing date'

        await sendEmail(
          user.email,
          renewalReceiptEmail({
            name: user.name,
            amount,
            cardLast4: '••••',
            nextRenewalDate: nextDate,
            portalUrl: `${env.PUBLIC_APP_URL}/api/subscription/portal`,
          }),
        ).catch((err) => console.error('[webhook] Failed to send renewal email:', err))
      }

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as {
        subscription: string
        attempt_count: number
        amount_due?: number
      }

      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : ''
      if (!subId) break

      console.error(
        `[webhook] Payment failed for subscription ${subId} (attempt ${invoice.attempt_count})`,
      )

      await db
        .update(subscriptions)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subId))

      // Send payment failed email
      const user = await getUserForSubscription(subId)
      if (user) {
        const amount = invoice.amount_due
          ? `$${(invoice.amount_due / 100).toFixed(2)}`
          : 'your payment'

        await sendEmail(
          user.email,
          paymentFailedEmail({
            name: user.name,
            amount,
            portalUrl: `${env.PUBLIC_APP_URL}/api/subscription/portal`,
          }),
        ).catch((err) => console.error('[webhook] Failed to send payment failed email:', err))
      }

      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as unknown as {
        id: string
        cancel_at_period_end: boolean
        status: string
        current_period_end: number
      }

      let dbStatus: 'active' | 'past_due' | 'cancelled'
      if (sub.status === 'active') {
        dbStatus = 'active'
      } else if (sub.status === 'past_due') {
        dbStatus = 'past_due'
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        dbStatus = 'cancelled'
      } else {
        dbStatus = 'past_due'
      }

      await db
        .update(subscriptions)
        .set({
          status: dbStatus,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id))

      // Send cancellation email if subscription set to cancel at period end
      if (sub.cancel_at_period_end) {
        const user = await getUserForSubscription(sub.id)
        if (user) {
          const periodEndDate = new Date(sub.current_period_end * 1000).toLocaleDateString(
            'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' },
          )

          await sendEmail(
            user.email,
            subscriptionCancelledEmail({
              name: user.name,
              periodEndDate,
              pricingUrl: `${env.PUBLIC_APP_URL}/pricing`,
            }),
          ).catch((err) => console.error('[webhook] Failed to send cancellation email:', err))
        }
      }

      break
    }

    case 'customer.subscription.deleted': {
      const subObj = event.data.object as unknown as { id: string }

      await db
        .update(subscriptions)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subObj.id))

      // Send access revoked email
      const user = await getUserForSubscription(subObj.id)
      if (user) {
        await sendEmail(
          user.email,
          accessRevokedEmail({
            name: user.name,
            reactivateUrl: `${env.PUBLIC_APP_URL}/pricing`,
          }),
        ).catch((err) => console.error('[webhook] Failed to send access revoked email:', err))
      }

      break
    }
  }

  return success(c, { received: true })
})
