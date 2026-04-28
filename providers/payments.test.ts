import { describe, expect, it } from 'bun:test'
import { intervalFromPriceId, plans } from './payments'

describe('plans', () => {
  it('has yearly and monthly plans', () => {
    expect(plans.yearly).toBeDefined()
    expect(plans.monthly).toBeDefined()
  })

  it('yearly plan has correct shape', () => {
    expect(plans.yearly.interval).toBe('year')
    expect(plans.yearly.amount).toBe(9900)
    expect(plans.yearly.currency).toBe('usd')
    expect(plans.yearly.name).toContain('Yearly')
  })

  it('monthly plan has correct shape', () => {
    expect(plans.monthly.interval).toBe('month')
    expect(plans.monthly.amount).toBe(990)
    expect(plans.monthly.currency).toBe('usd')
    expect(plans.monthly.name).toContain('Monthly')
  })
})

describe('intervalFromPriceId', () => {
  it('returns month for monthly price ID', () => {
    expect(intervalFromPriceId(plans.monthly.priceId)).toBe('month')
  })

  it('returns year for yearly price ID when different from monthly', () => {
    // When price IDs are identical (dev env), monthly wins since it's checked first
    if (plans.yearly.priceId === plans.monthly.priceId) {
      expect(intervalFromPriceId(plans.yearly.priceId)).toBe('month')
    } else {
      expect(intervalFromPriceId(plans.yearly.priceId)).toBe('year')
    }
  })

  it('defaults to year for unknown price ID', () => {
    expect(intervalFromPriceId('price_unknown')).toBe('year')
  })
})
