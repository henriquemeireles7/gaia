import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/platform/db/client'
import { memberships, subscriptions, users } from '@/platform/db/schema'

export async function getAdminStats() {
  const [userCount] = await db.select({ count: count() }).from(users)
  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  const recentSignups = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(10)

  return {
    totalUsers: userCount?.count ?? 0,
    activeSubscriptions: subCount?.count ?? 0,
    recentSignups,
  }
}

export async function listUsers(opts: {
  page: number
  perPage: number
  search?: string
  role?: string
}) {
  const { page, perPage, search, role } = opts
  const offset = (page - 1) * perPage
  const conditions = []

  if (search) {
    const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
    conditions.push(or(ilike(users.email, `%${escaped}%`), ilike(users.name, `%${escaped}%`)))
  }

  if (role) {
    conditions.push(eq(users.role, role as 'free' | 'pro' | 'admin'))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Base query for users
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      image: users.image,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(perPage)
    .offset(offset)

  const [totalResult] = await db.select({ count: count() }).from(users).where(whereClause)

  return { users: rows, total: totalResult?.count ?? 0 }
}

export async function getUserDetail(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) return null

  const userSubs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
  })

  const userMemberships = await db
    .select({
      orgId: memberships.orgId,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .where(eq(memberships.userId, userId))

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    subscriptions: userSubs.map((s) => ({
      id: s.id,
      status: s.status,
      planInterval: s.planInterval,
      currentPeriodEnd: s.currentPeriodEnd,
    })),
    memberships: userMemberships,
  }
}

export async function updateUserRole(userId: string, role: 'free' | 'pro' | 'admin') {
  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()
  return updated
}

export async function adminDeleteUser(userId: string) {
  // Cascade handles sessions, accounts, memberships
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId))
  await db.delete(users).where(eq(users.id, userId))
}
