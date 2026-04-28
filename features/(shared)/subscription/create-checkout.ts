import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { env } from '@/platform/env'
import { throwError } from '@/platform/errors'
import { success } from '@/platform/server/responses'
import { track } from '@/providers/analytics'
import { payments, plans } from '@/providers/payments'

const checkoutSchema = z.object({
  email: z.string().email().optional(),
  plan: z.enum(['monthly', 'yearly']).default('yearly'),
})

export const checkoutRoutes = new Hono()

// CUSTOMIZE: Update success/cancel URLs
checkoutRoutes.get('/redirect', async (c) => {
  const planKey = c.req.query('plan') === 'monthly' ? 'monthly' : 'yearly'
  const plan = plans[planKey]

  try {
    const session = await payments.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${env.PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.PUBLIC_APP_URL,
      allow_promotion_codes: true,
    })
    track('checkout_started', { plan: planKey, price: plan.priceId })
    if (!session.url) return c.redirect(env.PUBLIC_APP_URL, 303)
    return c.redirect(session.url, 303)
  } catch (error) {
    console.error('Checkout redirect error:', error)
    return c.redirect(`${env.PUBLIC_APP_URL}?error=checkout_failed`, 303)
  }
})

checkoutRoutes.post('/', zValidator('json', checkoutSchema), async (c) => {
  const { email, plan: planKey } = c.req.valid('json')
  const plan = plans[planKey]

  try {
    const session = await payments.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${env.PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.PUBLIC_APP_URL,
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
    })

    return success(c, { url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return throwError(c, 'PAYMENT_FAILED')
  }
})
