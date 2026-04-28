import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { auth } from '@/platform/auth/config'
import { db } from '@/platform/db/client'
import { memberships, organizations, subscriptions } from '@/platform/db/schema'
import { env } from '@/platform/env'
import { renderPage } from '@/platform/server/render'
import type { AppEnv, AppOrg, AppUser, OrgMemberRole } from '@/platform/types'

export const pageRoutes = new Hono<AppEnv>()

// ─── Static assets ───
pageRoutes.use('/styles.css', serveStatic({ path: './styles/global.css' }))

// ─── Helper: Get session without throwing ───
async function getSession(headers: Headers) {
  try {
    return await auth.api.getSession({ headers })
  } catch {
    return null
  }
}

// ─── Helper: Get user's orgs ───
async function getUserOrgs(userId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
  return rows
}

// ─── Helper: Has Google OAuth ───
const hasGoogle = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

// ─── Public pages ───

pageRoutes.get('/', async (c) => {
  const { LandingPage } = await import('./landing')
  const html = renderPage(<LandingPage appUrl={env.PUBLIC_APP_URL} />, {
    title: 'Douala — Ship your SaaS in days',
    description:
      'The maximal SaaS template with auth, payments, teams, admin, and security built in.',
    posthogKey: env.PUBLIC_POSTHOG_KEY,
    posthogHost: env.POSTHOG_HOST,
  })
  return c.html(html)
})

pageRoutes.get('/login', async (c) => {
  const { LoginPage } = await import('./auth/login')
  const html = renderPage(<LoginPage appUrl={env.PUBLIC_APP_URL} hasGoogle={hasGoogle} />, {
    title: 'Sign in — Douala',
  })
  return c.html(html)
})

pageRoutes.get('/signup', async (c) => {
  const { SignupPage } = await import('./auth/signup')
  const html = renderPage(<SignupPage appUrl={env.PUBLIC_APP_URL} hasGoogle={hasGoogle} />, {
    title: 'Create account — Douala',
  })
  return c.html(html)
})

pageRoutes.get('/forgot-password', async (c) => {
  const sent = c.req.query('sent')
  if (sent) {
    const { ForgotPasswordSentPage } = await import('./auth/forgot-password')
    return c.html(renderPage(<ForgotPasswordSentPage />, { title: 'Check your email — Douala' }))
  }
  const { ForgotPasswordPage } = await import('./auth/forgot-password')
  return c.html(
    renderPage(<ForgotPasswordPage appUrl={env.PUBLIC_APP_URL} />, {
      title: 'Reset password — Douala',
    }),
  )
})

pageRoutes.get('/reset-password', async (c) => {
  const token = c.req.query('token') || ''
  const { ResetPasswordPage } = await import('./auth/reset-password')
  return c.html(
    renderPage(<ResetPasswordPage appUrl={env.PUBLIC_APP_URL} token={token} />, {
      title: 'Set new password — Douala',
    }),
  )
})

// ─── Authenticated pages ───

pageRoutes.get('/dashboard', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')

  const user = session.user as unknown as AppUser
  const userOrgs = await getUserOrgs(user.id)
  const orgSlug = c.req.query('org') || userOrgs[0]?.slug
  const currentOrg = userOrgs.find((o) => o.slug === orgSlug)

  let stats:
    | { memberCount?: number; subscriptionStatus?: string; planInterval?: string }
    | undefined
  if (currentOrg) {
    const [memberRows, subRows] = await Promise.all([
      db.select().from(memberships).where(eq(memberships.orgId, currentOrg.id)),
      db.select().from(subscriptions).where(eq(subscriptions.orgId, currentOrg.id)),
    ])
    stats = {
      memberCount: memberRows.length,
      subscriptionStatus: subRows[0]?.status || 'none',
      planInterval: subRows[0]?.planInterval || undefined,
    }
  }

  const isFirstRun = userOrgs.length === 0
  const { DashboardPage } = await import('./dashboard/index')
  const html = renderPage(
    <DashboardPage
      user={user}
      org={
        currentOrg
          ? {
              id: currentOrg.id,
              name: currentOrg.name,
              slug: currentOrg.slug,
              plan: currentOrg.plan as AppOrg['plan'],
            }
          : null
      }
      orgRole={currentOrg?.role as OrgMemberRole | undefined}
      orgs={userOrgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      isFirstRun={isFirstRun}
      stats={stats}
    />,
    { title: 'Dashboard — Douala' },
  )
  return c.html(html)
})

pageRoutes.get('/dashboard/settings', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')

  const user = session.user as unknown as AppUser
  const userOrgs = await getUserOrgs(user.id)
  const currentOrg = userOrgs[0]

  let subscription: { status: string; planInterval: string; currentPeriodEnd: string } | null = null
  if (currentOrg) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, currentOrg.id))
      .limit(1)
    if (sub) {
      subscription = {
        status: sub.status,
        planInterval: sub.planInterval,
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      }
    }
  }

  const { SettingsPage } = await import('./dashboard/settings')
  const html = renderPage(
    <SettingsPage
      user={user}
      org={
        currentOrg
          ? {
              id: currentOrg.id,
              name: currentOrg.name,
              slug: currentOrg.slug,
              plan: currentOrg.plan as AppOrg['plan'],
            }
          : null
      }
      orgRole={currentOrg?.role as OrgMemberRole | undefined}
      orgs={userOrgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      appUrl={env.PUBLIC_APP_URL}
      subscription={subscription}
    />,
    { title: 'Settings — Douala' },
  )
  return c.html(html)
})

pageRoutes.get('/dashboard/org/settings', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')

  const user = session.user as unknown as AppUser
  const userOrgs = await getUserOrgs(user.id)
  const currentOrg = userOrgs[0]
  if (!currentOrg) return c.redirect('/dashboard')

  const { OrgSettingsPage } = await import('./dashboard/org/settings')
  const html = renderPage(
    <OrgSettingsPage
      user={user}
      org={{
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        plan: currentOrg.plan as AppOrg['plan'],
      }}
      orgRole={currentOrg.role as OrgMemberRole}
      orgs={userOrgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      appUrl={env.PUBLIC_APP_URL}
    />,
    { title: `${currentOrg.name} Settings — Douala` },
  )
  return c.html(html)
})

pageRoutes.get('/dashboard/org/members', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')

  const user = session.user as unknown as AppUser
  const userOrgs = await getUserOrgs(user.id)
  const currentOrg = userOrgs[0]
  if (!currentOrg) return c.redirect('/dashboard')

  // Inline import to get users table
  const { users } = await import('@/platform/db/schema')
  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, currentOrg.id))

  const { MembersPage } = await import('./dashboard/org/members')
  const html = renderPage(
    <MembersPage
      user={user}
      org={{
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        plan: currentOrg.plan as AppOrg['plan'],
      }}
      orgRole={currentOrg.role as OrgMemberRole}
      orgs={userOrgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      members={memberRows.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role as OrgMemberRole,
        joinedAt: m.joinedAt.toISOString(),
      }))}
      appUrl={env.PUBLIC_APP_URL}
    />,
    { title: `Members — ${currentOrg.name} — Douala` },
  )
  return c.html(html)
})

pageRoutes.get('/dashboard/org/invitations', async (c) => {
  const session = await getSession(c.req.raw.headers)
  if (!session?.user) return c.redirect('/login')

  const user = session.user as unknown as AppUser
  const userOrgs = await getUserOrgs(user.id)
  const currentOrg = userOrgs[0]
  if (!currentOrg) return c.redirect('/dashboard')

  const { invitations } = await import('@/platform/db/schema')
  const { isNull } = await import('drizzle-orm')
  const inviteRows = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.orgId, currentOrg.id), isNull(invitations.acceptedAt)))

  const { InvitationsPage } = await import('./dashboard/org/invitations')
  const html = renderPage(
    <InvitationsPage
      user={user}
      org={{
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        plan: currentOrg.plan as AppOrg['plan'],
      }}
      orgRole={currentOrg.role as OrgMemberRole}
      orgs={userOrgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
      invitations={inviteRows.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role as OrgMemberRole,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      }))}
      appUrl={env.PUBLIC_APP_URL}
    />,
    { title: `Invitations — ${currentOrg.name} — Douala` },
  )
  return c.html(html)
})
