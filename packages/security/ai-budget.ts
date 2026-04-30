// packages/security/ai-budget.ts — per-user daily AI cost cap.
//
// Vision §Security-12 + LLM/Unbounded-Consumption: every authenticated
// AI call charges against a daily budget, cleared at UTC midnight. The
// adapter calls `assertAiBudget(userId)` BEFORE invoking Anthropic, then
// `recordAiUsage(...)` after — atomic increment via ON CONFLICT.
//
// Tier resolution comes from `users.role`:
//   - 'free'  → AI_DAILY_BUDGET_FREE_USD (default $0.50)
//   - 'pro'   → AI_DAILY_BUDGET_PRO_USD  (default $5.00)
//   - 'admin' → bypass (returns immediately)
//
// System calls (no userId attached) bypass the check; route handlers
// must pass the authenticated user's id when their feature delegates
// to `complete()` so end-user cost is attributed correctly.

import { env } from '@gaia/config'
import { db } from '@gaia/db'
import { aiUsage, users } from '@gaia/db/schema'
import { AppError } from '@gaia/errors'
import { and, eq, sql } from 'drizzle-orm'

export type Tier = 'free' | 'pro' | 'admin'

/**
 * Today as a UTC date string (YYYY-MM-DD). Drizzle's `date` column
 * accepts this shape. Using UTC avoids timezone drift between API
 * pods.
 *
 * Exported for unit testing.
 */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Resolve the user's tier from `users.role`. Caches nothing — fresh
 * read each call. The query is a single PK lookup so it's cheap;
 * billing-tier-aware caching is a future optimization.
 */
async function resolveTier(userId: string): Promise<Tier> {
  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const role = rows[0]?.role ?? 'free'
  return role
}

/**
 * Map a tier to its daily USD budget. Admin tier returns +Infinity to
 * make `spent >= limit` always false. Exported for unit testing.
 */
export function budgetFor(tier: Tier): number {
  if (tier === 'admin') return Number.POSITIVE_INFINITY
  if (tier === 'pro') return env.AI_DAILY_BUDGET_PRO_USD
  return env.AI_DAILY_BUDGET_FREE_USD
}

/**
 * Throw RATE_LIMITED (HTTP 429) when the user has exhausted today's AI
 * budget. Returns silently when allowed. Admin tier always allowed.
 *
 * Race note: this is a check-then-spend pattern. Two simultaneous calls
 * for a user near the cap may both pass and overshoot by one call's
 * cost. That's acceptable — the whole point of per-call max_tokens=300
 * is to bound that overshoot to ~$0.0015 (haiku) / ~$0.0225 (opus).
 * If hard ceilings ever matter, swap to optimistic-locking on aiUsage.
 */
export async function assertAiBudget(userId: string): Promise<void> {
  const tier = await resolveTier(userId)
  if (tier === 'admin') return

  const day = todayUtc()
  const rows = await db
    .select({ costUsd: aiUsage.costUsd })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)))
    .limit(1)

  const spent = rows[0]?.costUsd ?? 0
  const limit = budgetFor(tier)
  if (spent >= limit) {
    throw new AppError(
      'RATE_LIMITED',
      `daily AI budget reached: ${spent.toFixed(4)} >= ${limit.toFixed(2)} USD (tier=${tier})`,
    )
  }
}

/**
 * Atomically add this call's tokens + cost to today's usage row. Idempotent
 * across pod restarts — the (userId, day) PK + ON CONFLICT DO UPDATE means
 * concurrent writers never lose updates.
 */
export async function recordAiUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number,
  costUsd: number,
): Promise<void> {
  const day = todayUtc()
  await db
    .insert(aiUsage)
    .values({ userId, day, tokensIn, tokensOut, costUsd, callCount: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: {
        tokensIn: sql`${aiUsage.tokensIn} + ${tokensIn}`,
        tokensOut: sql`${aiUsage.tokensOut} + ${tokensOut}`,
        costUsd: sql`${aiUsage.costUsd} + ${costUsd}`,
        callCount: sql`${aiUsage.callCount} + 1`,
      },
    })
}
