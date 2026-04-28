// Seed script — populates the database with test data for local development.
//
// Usage: bun run db:seed
// Prerequisites: DATABASE_URL set, migrations applied.

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/packages/config/env'
import * as schema from '@/packages/db/schema'

const client = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

const seedUsers = [
  { email: 'admin@example.com', name: 'Admin User', emailVerified: true, role: 'admin' as const },
  { email: 'user@example.com', name: 'Test User', emailVerified: true, role: 'free' as const },
  { email: 'pro@example.com', name: 'Pro User', emailVerified: true, role: 'pro' as const },
]

console.log('Seeding database…')

const inserted = await db
  .insert(schema.users)
  .values(seedUsers)
  .onConflictDoNothing({ target: schema.users.email })
  .returning()

console.log(`Inserted ${inserted.length} users.`)

await client.end()
console.log('Seed complete.')
process.exit(0)
