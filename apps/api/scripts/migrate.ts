import { env } from '@gaia/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const client = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './packages/db/migrations' })
console.log('Migrations complete')
await client.end()
process.exit(0)
