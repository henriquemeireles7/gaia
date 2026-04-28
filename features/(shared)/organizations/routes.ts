import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '@/platform/auth/middleware'
import { requireOrg, requireOrgRole } from '@/platform/auth/org-middleware'
import { throwError } from '@/platform/errors'
import { created, success } from '@/platform/server/responses'
import type { AppEnv } from '@/platform/types'
import {
  acceptInvitation,
  createInvitation,
  createOrganization,
  deleteInvitation,
  deleteOrganization,
  getInvitationByToken,
  getMembership,
  getOrganizationBySlug,
  getOrgMembers,
  getPendingInvitations,
  getUserOrganizations,
  removeMember,
  updateMemberRole,
  updateOrganization,
} from './queries'

export const orgRoutes = new Hono<AppEnv>()

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ─── Organization CRUD ───

// List user's organizations
orgRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const orgs = await getUserOrganizations(user.id)
  return success(c, orgs)
})

// Create organization
orgRoutes.post(
  '/',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(2).max(100),
      slug: z
        .string()
        .min(2)
        .max(50)
        .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { name, slug } = c.req.valid('json')

    const existing = await getOrganizationBySlug(slug)
    if (existing) {
      return throwError(c, 'ALREADY_EXISTS', 'Organization slug already taken')
    }

    const org = await createOrganization(name, slug, user.id)
    return created(c, org)
  },
)

// Get organization details (requires membership)
orgRoutes.get('/current', requireAuth, requireOrg, async (c) => {
  const org = c.get('org')
  const orgRole = c.get('orgRole')
  return success(c, { ...org, role: orgRole })
})

// Update organization (owner/admin only)
orgRoutes.patch(
  '/current',
  requireAuth,
  requireOrg,
  requireOrgRole('admin'),
  zValidator(
    'json',
    z.object({
      name: z.string().min(2).max(100).optional(),
      slug: z
        .string()
        .min(2)
        .max(50)
        .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens')
        .optional(),
    }),
  ),
  async (c) => {
    const org = c.get('org')
    const data = c.req.valid('json')

    if (data.slug && data.slug !== org.slug) {
      const existing = await getOrganizationBySlug(data.slug)
      if (existing) {
        return throwError(c, 'ALREADY_EXISTS', 'Organization slug already taken')
      }
    }

    const updated = await updateOrganization(org.id, data)
    return success(c, updated)
  },
)

// Delete organization (owner only)
orgRoutes.delete('/current', requireAuth, requireOrg, requireOrgRole('owner'), async (c) => {
  const org = c.get('org')
  await deleteOrganization(org.id)
  return success(c, { deleted: true })
})

// ─── Members ───

// List members
orgRoutes.get('/members', requireAuth, requireOrg, async (c) => {
  const org = c.get('org')
  const members = await getOrgMembers(org.id)
  return success(c, members)
})

// Update member role (admin/owner only)
orgRoutes.patch(
  '/members/:userId',
  requireAuth,
  requireOrg,
  requireOrgRole('admin'),
  zValidator(
    'json',
    z.object({
      role: z.enum(['admin', 'member']),
    }),
  ),
  async (c) => {
    const org = c.get('org')
    const targetUserId = c.req.param('userId')!
    const { role } = c.req.valid('json')

    const membership = await getMembership(org.id, targetUserId)
    if (!membership) {
      return throwError(c, 'NOT_FOUND', 'Member not found')
    }

    // Cannot change owner role via this endpoint
    if (membership.role === 'owner') {
      return throwError(c, 'FORBIDDEN', 'Cannot change owner role')
    }

    const updated = await updateMemberRole(org.id, targetUserId, role)
    return success(c, updated)
  },
)

// Remove member (admin/owner only, cannot remove owner)
orgRoutes.delete(
  '/members/:userId',
  requireAuth,
  requireOrg,
  requireOrgRole('admin'),
  async (c) => {
    const org = c.get('org')
    const targetUserId = c.req.param('userId')!
    const currentUser = c.get('user')

    // Cannot remove yourself
    if (targetUserId === currentUser.id) {
      return throwError(c, 'INVALID_REQUEST', 'Cannot remove yourself. Transfer ownership first.')
    }

    const membership = await getMembership(org.id, targetUserId)
    if (!membership) {
      return throwError(c, 'NOT_FOUND', 'Member not found')
    }

    if (membership.role === 'owner') {
      return throwError(c, 'FORBIDDEN', 'Cannot remove the organization owner')
    }

    await removeMember(org.id, targetUserId)
    return success(c, { removed: true })
  },
)

// ─── Invitations ───

// List pending invitations (admin/owner)
orgRoutes.get('/invitations', requireAuth, requireOrg, requireOrgRole('admin'), async (c) => {
  const org = c.get('org')
  const pending = await getPendingInvitations(org.id)
  return success(c, pending)
})

// Create invitation (admin/owner)
orgRoutes.post(
  '/invitations',
  requireAuth,
  requireOrg,
  requireOrgRole('admin'),
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'member']).default('member'),
    }),
  ),
  async (c) => {
    const org = c.get('org')
    const { email, role } = c.req.valid('json')

    const invitation = await createInvitation(org.id, email, role)
    return created(c, invitation)
  },
)

// Cancel invitation (admin/owner)
orgRoutes.delete(
  '/invitations/:invitationId',
  requireAuth,
  requireOrg,
  requireOrgRole('admin'),
  async (c) => {
    const invitationId = c.req.param('invitationId')!
    const org = c.get('org')
    await deleteInvitation(invitationId, org.id)
    return success(c, { deleted: true })
  },
)

// Accept invitation (authenticated user, no org context needed)
orgRoutes.post('/invitations/:token/accept', requireAuth, async (c) => {
  const token = c.req.param('token')!
  const user = c.get('user')

  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    return throwError(c, 'INVITATION_NOT_FOUND')
  }

  if (invitation.expiresAt < new Date()) {
    return throwError(c, 'INVITATION_EXPIRED')
  }

  // Check email matches
  if (invitation.email !== user.email.toLowerCase().trim()) {
    return throwError(c, 'FORBIDDEN', 'Invitation was sent to a different email address')
  }

  await acceptInvitation(invitation, user.id)
  return success(c, { accepted: true, orgId: invitation.orgId })
})
