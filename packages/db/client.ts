import { PGlite } from '@electric-sql/pglite'
import { env } from '@gaia/config'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// VENDOR_MODE=mock → PGLite (Postgres-in-WASM, file-backed under .gaia/).
// VENDOR_MODE=live → postgres-js against a real Neon (or any Postgres) URL.
// Switch via `bun gaia live` or by setting VENDOR_MODE=live in .env.local.
//
// Lazy construction via Proxy: the underlying client (PGLite WASM blob OR
// postgres-js connection pool) only instantiates when something actually
// reads off `db`. Tests that mock @gaia/db (the common case) never trigger
// PGLite WASM init — important because PGLite leaves a file-backed handle
// open that confuses the test runner's exit-code detection.
type DbType = ReturnType<typeof drizzlePostgres>
let _db: DbType | null = null

function getDb(): DbType {
  if (_db) return _db
  if (env.VENDOR_MODE === 'mock') {
    const client = new PGlite('./.gaia/pglite-data')
    _db = drizzlePglite(client, { schema }) as unknown as DbType
  } else {
    const client = postgres(env.DATABASE_URL)
    _db = drizzlePostgres(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    return (getDb() as unknown as Record<PropertyKey, unknown>)[prop]
  },
})
