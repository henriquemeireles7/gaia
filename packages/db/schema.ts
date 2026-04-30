import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ============================================================
// Auth tables (required by Better Auth)
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role', { enum: ['free', 'pro', 'admin'] })
    .notNull()
    .default('free'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// Subscriptions (Polar billing)
// ============================================================
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    polarCustomerId: text('polar_customer_id').notNull(),
    polarSubscriptionId: text('polar_subscription_id').notNull().unique(),
    status: text('status', {
      enum: ['active', 'past_due', 'cancelled', 'trialing', 'incomplete'],
    })
      .notNull()
      .default('active'),
    productId: text('product_id').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('subscriptions_user_id_idx').on(table.userId)],
)

// ============================================================
// Webhook + workflow idempotency (Polar + iii + audit)
// ============================================================
// `provider` is a TS-only enum — the column is plain text in Postgres,
// so renaming a value (e.g. 'inngest' → 'iii') needs no SQL migration,
// only a one-shot data backfill (see scripts/backfill-iii-provider.ts
// when the engine ships).
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: text('provider', { enum: ['polar', 'iii', 'audit'] }).notNull(),
  externalEventId: text('external_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================
// API Keys (agent-first auth)
// ============================================================
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    role: text('role', { enum: ['free', 'pro', 'admin'] })
      .notNull()
      .default('free'),
    expiresAt: timestamp('expires_at'),
    revokedAt: timestamp('revoked_at'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('api_keys_key_hash_idx').on(table.keyHash)],
)

// ============================================================
// Rate limits (Postgres-backed, fixed-window counter)
// ============================================================
// Atomic increment via INSERT ... ON CONFLICT (key, window_start) DO UPDATE.
// Bucketed by `windowStart` so each window is a separate row — old buckets
// are garbage-collected by a periodic DELETE WHERE window_start < cutoff.
// Swap to Redis/Dragonfly when single-DB throughput becomes a bottleneck;
// the rate-limits.ts adapter is the only call site.
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
    index('rate_limits_window_start_idx').on(table.windowStart),
  ],
)

// ============================================================
// AI usage (per-user daily aggregate for budget enforcement)
// ============================================================
// One row per (userId, day-UTC). Updated atomically on every complete()
// call via ON CONFLICT DO UPDATE. Tier-keyed budgets live in env vars
// (AI_DAILY_BUDGET_FREE_USD / _PRO_USD); checked against costUsd before
// each call in packages/security/ai-budget.ts.
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    costUsd: doublePrecision('cost_usd').notNull().default(0),
    callCount: integer('call_count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
)

// ============================================================
// Type helpers
// ============================================================
export type User = typeof users.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type ApiKey = typeof apiKeys.$inferSelect
export type RateLimit = typeof rateLimits.$inferSelect
export type AiUsage = typeof aiUsage.$inferSelect
