import { defineConfig } from 'drizzle-kit'
import { env } from '@/packages/config/env'

export default defineConfig({
  schema: './packages/db/schema.ts',
  out: './packages/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
