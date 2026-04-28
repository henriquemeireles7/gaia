import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from '@/packages/config/env'

const client = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './packages/db/migrations' })
console.log('Migrations complete')
await client.end()
process.exit(0)
