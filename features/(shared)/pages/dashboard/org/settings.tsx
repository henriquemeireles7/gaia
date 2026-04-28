import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { Badge } from '../../../ui/components/badge'
import { Button } from '../../../ui/components/button'
import { Card, CardDescription, CardTitle } from '../../../ui/components/card'
import { DashboardLayout } from '../../../ui/layouts/dashboard-layout'

type OrgSettingsPageProps = {
  user: AppUser
  org: AppOrg
  orgRole: OrgMemberRole
  orgs: Array<{ id: string; name: string; slug: string }>
  appUrl: string
}

export function OrgSettingsPage({ user, org, orgRole, orgs, appUrl }: OrgSettingsPageProps) {
  const canEdit = orgRole === 'owner' || orgRole === 'admin'

  return (
    <DashboardLayout
      user={user}
      org={org}
      orgRole={orgRole}
      orgs={orgs}
      currentPath="/dashboard/org/settings"
    >
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink">Organization Settings</h1>
          <p class="text-body mt-1">Manage {org.name}.</p>
        </div>

        <Card>
          <CardTitle>General</CardTitle>
          <CardDescription>Organization details.</CardDescription>

          <form action={`${appUrl}/api/orgs/current`} method="POST" class="mt-4 space-y-4 max-w-sm">
            <input type="hidden" name="_method" value="PATCH" />
            <div class="space-y-1">
              <label for="org-name" class="block text-sm font-medium text-ink">
                Name
              </label>
              <input
                id="org-name"
                name="name"
                type="text"
                value={org.name}
                disabled={!canEdit}
                class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div class="space-y-1">
              <span class="block text-sm font-medium text-ink">Slug</span>
              <p class="text-sm text-body font-mono">{org.slug}</p>
            </div>

            <div class="space-y-1">
              <span class="block text-sm font-medium text-ink">Plan</span>
              <Badge
                variant={
                  org.plan === 'enterprise' ? 'info' : org.plan === 'pro' ? 'success' : 'default'
                }
              >
                {org.plan}
              </Badge>
            </div>

            <div class="space-y-1">
              <span class="block text-sm font-medium text-ink">Your role</span>
              <Badge>{orgRole}</Badge>
            </div>

            {canEdit && (
              <Button type="submit" size="sm">
                Save changes
              </Button>
            )}
          </form>
        </Card>

        {orgRole === 'owner' && (
          <Card class="border-error/20">
            <CardTitle class="text-error">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible.</CardDescription>

            <div class="mt-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p class="text-sm font-medium text-ink">Delete organization</p>
                <p class="text-xs text-body">Permanently delete {org.name} and all its data.</p>
              </div>
              <Button variant="danger" size="sm">
                Delete organization
              </Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
