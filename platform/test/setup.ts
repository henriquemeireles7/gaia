import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '@/platform/db/schema'

const TEST_DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test' // harden:ignore — test infra needs direct env access

const client = postgres(TEST_DATABASE_URL)
export const testDb = drizzle(client, { schema })

/**
 * Run migrations on the test database. Call in beforeAll().
 */
export async function setupTestDb() {
  await migrate(testDb, { migrationsFolder: './platform/db/migrations' })
}

/**
 * Truncate all application tables (preserving schema). Call in afterEach() or afterAll().
 */
export async function teardownTestDb() {
  await testDb.execute(sql`
    DO $$ DECLARE
      tbl text;
    BEGIN
      FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl);
      END LOOP;
    END $$;
  `)
}
