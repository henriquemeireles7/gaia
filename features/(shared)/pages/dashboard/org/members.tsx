import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { Badge } from '../../../ui/components/badge'
import { Button } from '../../../ui/components/button'
import { Card } from '../../../ui/components/card'
import { SkeletonTable } from '../../../ui/components/skeleton'
import { DashboardLayout } from '../../../ui/layouts/dashboard-layout'

type Member = {
  id: string
  name: string | null
  email: string
  role: OrgMemberRole
  joinedAt: string
}

type MembersPageProps = {
  user: AppUser
  org: AppOrg
  orgRole: OrgMemberRole
  orgs: Array<{ id: string; name: string; slug: string }>
  members: Member[]
  appUrl: string
  loading?: boolean
}

export function MembersPage({
  user,
  org,
  orgRole,
  orgs,
  members,
  appUrl,
  loading,
}: MembersPageProps) {
  const canManage = orgRole === 'owner' || orgRole === 'admin'

  return (
    <DashboardLayout
      user={user}
      org={org}
      orgRole={orgRole}
      orgs={orgs}
      currentPath="/dashboard/org/members"
    >
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="font-display text-2xl font-bold text-ink">Members</h1>
            <p class="text-body mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} in {org.name}.
            </p>
          </div>
          {canManage && (
            <a
              href="/dashboard/org/invitations"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-sm text-sm font-medium hover:bg-gold-hover transition-colors no-underline"
            >
              <svg
                aria-hidden="true"
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Invite member
            </a>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : members.length === 0 ? (
          <Card class="text-center py-12">
            <div class="w-12 h-12 rounded-full bg-sand flex items-center justify-center mx-auto mb-4">
              <svg
                aria-hidden="true"
                class="w-6 h-6 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h2 class="font-display text-lg font-semibold text-ink mb-2">No members yet</h2>
            <p class="text-body text-sm mb-4">Invite your team to get started.</p>
          </Card>
        ) : (
          <Card padding="none">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-linen text-left">
                    <th class="px-4 py-3 font-medium text-muted">Member</th>
                    <th class="px-4 py-3 font-medium text-muted">Role</th>
                    <th class="px-4 py-3 font-medium text-muted hidden sm:table-cell">Joined</th>
                    {canManage && (
                      <th class="px-4 py-3 font-medium text-muted text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      currentUser={user}
                      canManage={canManage}
                      orgRole={orgRole}
                      appUrl={appUrl}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

function MemberRow({
  member,
  currentUser,
  canManage,
  orgRole,
  appUrl: _appUrl,
}: {
  member: Member
  currentUser: AppUser
  canManage: boolean
  orgRole: OrgMemberRole
  appUrl: string
}) {
  const isSelf = member.id === currentUser.id
  const canChangeRole = canManage && !isSelf && (orgRole === 'owner' || member.role === 'member')
  const canRemove =
    canManage &&
    !isSelf &&
    (orgRole === 'owner' || (orgRole === 'admin' && member.role === 'member'))

  const roleVariant =
    member.role === 'owner' ? 'info' : member.role === 'admin' ? 'warning' : 'default'

  return (
    <tr class="border-b border-linen/50 last:border-0">
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-sm font-bold text-gold shrink-0">
            {(member.name ?? member.email).charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <p class="font-medium text-ink truncate">
              {member.name || 'Unnamed'}
              {isSelf && ' (you)'}
            </p>
            <p class="text-xs text-muted truncate">{member.email}</p>
          </div>
        </div>
      </td>
      <td class="px-4 py-3">
        <Badge variant={roleVariant}>{member.role}</Badge>
      </td>
      <td class="px-4 py-3 text-muted hidden sm:table-cell">
        {new Date(member.joinedAt).toLocaleDateString()}
      </td>
      {canManage && (
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            {canChangeRole && (
              <select
                class="text-xs border border-linen rounded px-2 py-1 bg-surface-white text-ink"
                value={member.role}
                data-member-id={member.id}
                data-action="change-role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                {orgRole === 'owner' && <option value="owner">Owner</option>}
              </select>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                class="text-error hover:bg-error/5"
                data-member-id={member.id}
                data-action="remove"
              >
                Remove
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
