import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '@/platform/auth/middleware'
import { requirePermission } from '@/platform/auth/permissions'
import { throwError } from '@/platform/errors'
import { paginated, success } from '@/platform/server/responses'
import type { AppEnv } from '@/platform/types'
import { adminDeleteUser, getAdminStats, getUserDetail, listUsers, updateUserRole } from './queries'

export const adminRoutes = new Hono<AppEnv>()

// All admin routes require auth + admin permission
adminRoutes.use('*', requireAuth, requirePermission('admin'))

// Dashboard stats
adminRoutes.get('/stats', async (c) => {
  const stats = await getAdminStats()
  return success(c, stats)
})

// List users (paginated, searchable, filterable)
adminRoutes.get(
  '/users',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
      search: z.string().optional(),
      role: z.enum(['free', 'pro', 'admin']).optional(),
    }),
  ),
  async (c) => {
    const { page, perPage, search, role } = c.req.valid('query')
    const result = await listUsers({ page, perPage, search, role })
    return paginated(c, result.users, result.total, page, perPage)
  },
)

// User detail
adminRoutes.get('/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  const user = await getUserDetail(userId)

  if (!user) {
    return throwError(c, 'USER_NOT_FOUND')
  }

  return success(c, user)
})

// Update user role
adminRoutes.patch(
  '/users/:userId',
  zValidator(
    'json',
    z.object({
      role: z.enum(['free', 'pro', 'admin']),
    }),
  ),
  async (c) => {
    const userId = c.req.param('userId')
    const currentUser = c.get('user')
    const { role } = c.req.valid('json')

    // Prevent self-demotion
    if (userId === currentUser.id) {
      return throwError(c, 'INVALID_REQUEST', 'Cannot change your own role')
    }

    const user = await getUserDetail(userId)
    if (!user) {
      return throwError(c, 'USER_NOT_FOUND')
    }

    const updated = await updateUserRole(userId, role)
    return success(c, updated)
  },
)

// Delete user
adminRoutes.delete('/users/:userId', async (c) => {
  const userId = c.req.param('userId')
  const currentUser = c.get('user')

  if (userId === currentUser.id) {
    return throwError(c, 'INVALID_REQUEST', 'Cannot delete your own account from admin panel')
  }

  const user = await getUserDetail(userId)
  if (!user) {
    return throwError(c, 'USER_NOT_FOUND')
  }

  await adminDeleteUser(userId)
  return success(c, { deleted: true })
})
