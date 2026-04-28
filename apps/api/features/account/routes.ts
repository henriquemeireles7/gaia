import { Hono } from 'hono'
import { success } from '@/apps/api/server/responses'
import { requireAuth } from '@/packages/auth/middleware'
import type { AppEnv } from '@/packages/config/types'
import { deleteUserAccount, exportUserData } from './privacy'

export const accountRoutes = new Hono<AppEnv>()

// Export all user data (GDPR)
accountRoutes.get('/export', requireAuth, async (c) => {
  const user = c.get('user')
  const data = await exportUserData(user.id)
  return success(c, data)
})

// Delete account and all data (GDPR)
accountRoutes.delete('/', requireAuth, async (c) => {
  const user = c.get('user')
  await deleteUserAccount(user.id)
  return success(c, { deleted: true })
})
