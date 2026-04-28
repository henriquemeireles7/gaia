import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { Badge } from '../../../ui/components/badge'
import { Button } from '../../../ui/components/button'
import { Card, CardDescription, CardTitle } from '../../../ui/components/card'
import { DashboardLayout } from '../../../ui/layouts/dashboard-layout'

type Invitation = {
  id: string
  email: string
  role: OrgMemberRole
  expiresAt: string
  createdAt: string
}

type InvitationsPageProps = {
  user: AppUser
  org: AppOrg
  orgRole: OrgMemberRole
  orgs: Array<{ id: string; name: string; slug: string }>
  invitations: Invitation[]
  appUrl: string
}

export function InvitationsPage({
  user,
  org,
  orgRole,
  orgs,
  invitations,
  appUrl,
}: InvitationsPageProps) {
  const canManage = orgRole === 'owner' || orgRole === 'admin'

  return (
    <DashboardLayout
      user={user}
      org={org}
      orgRole={orgRole}
      orgs={orgs}
      currentPath="/dashboard/org/invitations"
    >
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink">Invitations</h1>
          <p class="text-body mt-1">Manage pending invitations for {org.name}.</p>
        </div>

        {canManage && <InviteForm appUrl={appUrl} orgRole={orgRole} />}

        {invitations.length === 0 ? (
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 class="font-display text-lg font-semibold text-ink mb-2">No pending invitations</h2>
            <p class="text-body text-sm">Use the form above to invite team members.</p>
          </Card>
        ) : (
          <Card padding="none">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-linen text-left">
                    <th class="px-4 py-3 font-medium text-muted">Email</th>
                    <th class="px-4 py-3 font-medium text-muted">Role</th>
                    <th class="px-4 py-3 font-medium text-muted hidden sm:table-cell">Expires</th>
                    {canManage && (
                      <th class="px-4 py-3 font-medium text-muted text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <InvitationRow
                      key={inv.id}
                      invitation={inv}
                      canManage={canManage}
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

function InviteForm({ appUrl, orgRole }: { appUrl: string; orgRole: OrgMemberRole }) {
  return (
    <Card>
      <CardTitle>Invite a member</CardTitle>
      <CardDescription>
        Send an invitation by email. They'll receive a link to join.
      </CardDescription>

      <form
        action={`${appUrl}/api/orgs/invitations`}
        method="POST"
        class="mt-4 flex flex-col sm:flex-row gap-3"
      >
        <div class="flex-1">
          <label for="invite-email" class="sr-only">
            Email address
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="colleague@company.com"
            class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <select
          name="role"
          class="px-3 py-2 border border-linen rounded-sm bg-surface-white text-ink text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          {orgRole === 'owner' && <option value="owner">Owner</option>}
        </select>
        <Button type="submit" size="md">
          Send invite
        </Button>
      </form>
    </Card>
  )
}

function InvitationRow({
  invitation,
  canManage,
  appUrl: _appUrl,
}: {
  invitation: Invitation
  canManage: boolean
  appUrl: string
}) {
  const isExpired = new Date(invitation.expiresAt) < new Date()
  const roleVariant =
    invitation.role === 'owner' ? 'info' : invitation.role === 'admin' ? 'warning' : 'default'

  return (
    <tr class="border-b border-linen/50 last:border-0">
      <td class="px-4 py-3">
        <span class="text-ink">{invitation.email}</span>
      </td>
      <td class="px-4 py-3">
        <Badge variant={roleVariant}>{invitation.role}</Badge>
      </td>
      <td class="px-4 py-3 hidden sm:table-cell">
        {isExpired ? (
          <Badge variant="error">Expired</Badge>
        ) : (
          <span class="text-muted">{new Date(invitation.expiresAt).toLocaleDateString()}</span>
        )}
      </td>
      {canManage && (
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            {isExpired && (
              <Button
                variant="ghost"
                size="sm"
                data-invitation-id={invitation.id}
                data-action="resend"
              >
                Resend
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              class="text-error hover:bg-error/5"
              data-invitation-id={invitation.id}
              data-action="cancel"
            >
              Cancel
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}
