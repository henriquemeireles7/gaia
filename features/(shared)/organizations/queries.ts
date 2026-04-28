import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/platform/db/client'
import {
  type Invitation,
  invitations,
  memberships,
  type Organization,
  organizations,
  users,
} from '@/platform/db/schema'

// ─── Organization CRUD ───

export async function createOrganization(
  name: string,
  slug: string,
  ownerId: string,
): Promise<Organization> {
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name, slug }).returning()
    await tx.insert(memberships).values({ userId: ownerId, orgId: org!.id, role: 'owner' })
    return org!
  })
}

export async function getOrganizationBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  })
}

export async function updateOrganization(orgId: string, data: { name?: string; slug?: string }) {
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning()
  return updated
}

export async function deleteOrganization(orgId: string) {
  await db.delete(organizations).where(eq(organizations.id, orgId))
}

// ─── Memberships ───

export async function getUserOrganizations(userId: string) {
  const rows = await db
    .select({
      org: organizations,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))

  return rows.map((r) => ({ ...r.org, role: r.role }))
}

export async function getOrgMembers(orgId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, orgId))
}

export async function getMembership(orgId: string, userId: string) {
  return db.query.memberships.findFirst({
    where: and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)),
  })
}

export async function removeMember(orgId: string, userId: string) {
  await db
    .delete(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member',
) {
  const [updated] = await db
    .update(memberships)
    .set({ role })
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    .returning()
  return updated
}

// ─── Invitations ───

export async function createInvitation(
  orgId: string,
  email: string,
  role: 'admin' | 'member',
): Promise<Invitation> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const [invitation] = await db
    .insert(invitations)
    .values({ orgId, email: email.toLowerCase().trim(), role, token, expiresAt })
    .returning()

  return invitation!
}

export async function getInvitationByToken(token: string) {
  return db.query.invitations.findFirst({
    where: and(eq(invitations.token, token), isNull(invitations.acceptedAt)),
  })
}

export async function getPendingInvitations(orgId: string) {
  return db.query.invitations.findMany({
    where: and(eq(invitations.orgId, orgId), isNull(invitations.acceptedAt)),
  })
}

export async function acceptInvitation(invitation: Invitation, userId: string) {
  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id))

  await db
    .insert(memberships)
    .values({
      userId,
      orgId: invitation.orgId,
      role: invitation.role as 'admin' | 'member',
    })
    .onConflictDoNothing()
}

export async function deleteInvitation(invitationId: string, orgId: string) {
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.orgId, orgId)))
}
