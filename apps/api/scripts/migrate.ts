import { env } from '@gaia/config'

// Mode-aware: VENDOR_MODE=mock → migrate the local PGLite store so
// `bun dev` boots with tables. VENDOR_MODE=live → migrate the real
// Postgres pointed at by DATABASE_URL.
//
// Both paths run idempotent migrations from packages/db/migrations.

if (env.VENDOR_MODE === 'mock') {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite')
  const { migrate: migratePglite } = await import('drizzle-orm/pglite/migrator')
  const client = new PGlite('./.gaia/pglite-data')
  const db = drizzlePglite(client)
  await migratePglite(db, { migrationsFolder: './packages/db/migrations' })
  await client.close()
  console.log('Migrations complete (PGLite, mock mode)')
} else {
  const { drizzle: drizzlePostgres } = await import('drizzle-orm/postgres-js')
  const { migrate: migratePostgres } = await import('drizzle-orm/postgres-js/migrator')
  const postgres = (await import('postgres')).default
  const client = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzlePostgres(client)
  await migratePostgres(db, { migrationsFolder: './packages/db/migrations' })
  await client.end()
  console.log('Migrations complete (Postgres, live mode)')
}

process.exit(0)
