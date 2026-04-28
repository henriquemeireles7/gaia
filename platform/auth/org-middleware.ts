import { and, eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { db } from '../db/client'
import { memberships, organizations } from '../db/schema'
import { throwError } from '../errors'
import type { AppEnv, AppOrg, OrgMemberRole } from '../types'

const ORG_SLUG_HEADER = 'x-org-slug'

/**
 * Middleware that resolves an organization from the x-org-slug header,
 * verifies the authenticated user is a member, and sets org context.
 *
 * Must be used AFTER requireAuth or apiKeyAuth.
 */
export async function requireOrg(c: Context<AppEnv>, next: Next) {
  const slug = c.req.header(ORG_SLUG_HEADER)
  if (!slug) {
    return throwError(c, 'VALIDATION_ERROR', 'x-org-slug header is required')
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  })

  if (!org) {
    return throwError(c, 'ORG_NOT_FOUND')
  }

  const user = c.get('user')
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.orgId, org.id), eq(memberships.userId, user.id)),
  })

  if (!membership) {
    return throwError(c, 'NOT_A_MEMBER')
  }

  const appOrg: AppOrg = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan as AppOrg['plan'],
  }

  c.set('org', appOrg)
  c.set('orgRole', membership.role as OrgMemberRole)

  return next()
}

/**
 * Middleware that requires a specific org-level role (or higher).
 * Must be used AFTER requireOrg.
 */
export function requireOrgRole(minRole: OrgMemberRole) {
  const hierarchy: Record<OrgMemberRole, number> = {
    member: 0,
    admin: 1,
    owner: 2,
  }

  return async (c: Context<AppEnv>, next: Next) => {
    const orgRole = c.get('orgRole')
    if (hierarchy[orgRole] < hierarchy[minRole]) {
      return throwError(c, 'FORBIDDEN', `Requires ${minRole} role or higher`)
    }
    return next()
  }
}
