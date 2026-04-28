import Stripe from 'stripe'
import { env } from '@/platform/env'

export const payments = new Stripe(env.STRIPE_SECRET_KEY)

// CUSTOMIZE: Define your subscription plans
export const plans = {
  yearly: {
    priceId: env.STRIPE_PRICE_ID,
    name: 'Pro — Yearly',
    amount: 9900,
    currency: 'usd',
    interval: 'year' as const,
  },
  monthly: {
    priceId: env.STRIPE_MONTHLY_PRICE_ID,
    name: 'Pro — Monthly',
    amount: 990,
    currency: 'usd',
    interval: 'month' as const,
  },
} as const

type PlanInterval = 'month' | 'year'

/** Derive billing interval from a Stripe price ID */
export function intervalFromPriceId(priceId: string): PlanInterval {
  if (priceId === plans.monthly.priceId) return 'month'
  if (priceId === plans.yearly.priceId) return 'year'
  console.warn(`[payments] Unknown price ID: ${priceId}, defaulting to year`)
  return 'year'
}
