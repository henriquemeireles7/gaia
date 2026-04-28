import { env } from '@gaia/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './packages/db/schema.ts',
  out: './packages/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
