/**
 * Seed script — populates the database with test data for local development.
 *
 * Usage: bun platform/scripts/seed.ts
 *
 * Prerequisites: DATABASE_URL must be set and migrations must be run first.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })

// ─── Seed Data ───────────────────────────────────────────────────────────────

const adminUser = {
  email: 'admin@example.com',
  name: 'Admin User',
  emailVerified: true,
  role: 'admin' as const,
}

const testUser = {
  email: 'user@example.com',
  name: 'Test User',
  emailVerified: true,
  role: 'free' as const,
}

const proUser = {
  email: 'pro@example.com',
  name: 'Pro User',
  emailVerified: true,
  role: 'pro' as const,
}

// ─── Insert ──────────────────────────────────────────────────────────────────

console.log('Seeding database...')

const users = await db
  .insert(schema.users)
  .values([adminUser, testUser, proUser])
  .onConflictDoNothing({ target: schema.users.email })
  .returning()

console.log(`Created ${users.length} users`)

// ─── Done ────────────────────────────────────────────────────────────────────

await client.end()
console.log('Seed complete')
process.exit(0)
