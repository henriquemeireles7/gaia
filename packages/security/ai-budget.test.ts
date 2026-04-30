import { describe, expect, it } from 'bun:test'
import { env } from '@gaia/config'
import { budgetFor, todayUtc } from './ai-budget'

// DB-bound `assertAiBudget` and `recordAiUsage` are exercised by integration
// tests against a real Postgres branch (Neon-branch-per-PR). Bun's
// mock.module is process-global, so mocking @gaia/db or @gaia/config here
// pollutes every other test. Pure helpers covered below.

describe('budgetFor', () => {
  it('admin tier is unlimited', () => {
    expect(budgetFor('admin')).toBe(Number.POSITIVE_INFINITY)
  })

  it('pro tier returns AI_DAILY_BUDGET_PRO_USD from env', () => {
    expect(budgetFor('pro')).toBe(env.AI_DAILY_BUDGET_PRO_USD)
  })

  it('free tier returns AI_DAILY_BUDGET_FREE_USD from env', () => {
    expect(budgetFor('free')).toBe(env.AI_DAILY_BUDGET_FREE_USD)
  })

  it('pro budget is strictly greater than free budget by default', () => {
    expect(budgetFor('pro')).toBeGreaterThan(budgetFor('free'))
  })

  it('free budget is non-negative', () => {
    expect(budgetFor('free')).toBeGreaterThanOrEqual(0)
  })
})

describe('todayUtc', () => {
  it('returns YYYY-MM-DD slice of given UTC date', () => {
    expect(todayUtc(new Date('2026-04-30T10:30:42.123Z'))).toBe('2026-04-30')
  })

  it('returns the same date string for any moment in the same UTC day', () => {
    const start = new Date('2026-04-30T00:00:00.000Z')
    const end = new Date('2026-04-30T23:59:59.999Z')
    expect(todayUtc(start)).toBe(todayUtc(end))
  })

  it('rolls to the next date at UTC midnight', () => {
    const before = new Date('2026-04-30T23:59:59.999Z')
    const after = new Date('2026-05-01T00:00:00.000Z')
    expect(todayUtc(before)).not.toBe(todayUtc(after))
    expect(todayUtc(after)).toBe('2026-05-01')
  })

  it('produces a valid ISO date format (YYYY-MM-DD)', () => {
    const result = todayUtc(new Date())
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
