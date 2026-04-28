import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { Badge } from '../../ui/components/badge'
import { Button, LinkButton } from '../../ui/components/button'
import { Card, CardDescription, CardTitle } from '../../ui/components/card'
import { DashboardLayout } from '../../ui/layouts/dashboard-layout'

type SettingsPageProps = {
  user: AppUser
  org?: AppOrg | null
  orgRole?: OrgMemberRole | null
  orgs: Array<{ id: string; name: string; slug: string }>
  appUrl: string
  subscription?: {
    status: string
    planInterval: string
    currentPeriodEnd: string
  } | null
}

export function SettingsPage({
  user,
  org,
  orgRole,
  orgs,
  appUrl,
  subscription,
}: SettingsPageProps) {
  return (
    <DashboardLayout
      user={user}
      org={org}
      orgRole={orgRole}
      orgs={orgs}
      currentPath="/dashboard/settings"
    >
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink">Settings</h1>
          <p class="text-body mt-1">Manage your account and billing.</p>
        </div>

        <AccountSection user={user} appUrl={appUrl} />
        <BillingSection appUrl={appUrl} subscription={subscription} />
        <DangerSection appUrl={appUrl} />
      </div>
    </DashboardLayout>
  )
}

function AccountSection({ user, appUrl }: { user: AppUser; appUrl: string }) {
  return (
    <Card>
      <CardTitle>Account</CardTitle>
      <CardDescription>Your personal account information.</CardDescription>

      <form action={`${appUrl}/api/account/profile`} method="POST" class="mt-4 space-y-4 max-w-sm">
        <div class="space-y-1">
          <label for="name" class="block text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={user.name || ''}
            class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>

        <div class="space-y-1">
          <span class="block text-sm font-medium text-ink">Email</span>
          <p class="text-sm text-body">{user.email}</p>
        </div>

        <div class="space-y-1">
          <span class="block text-sm font-medium text-ink">Role</span>
          <Badge
            variant={user.role === 'admin' ? 'info' : user.role === 'pro' ? 'success' : 'default'}
          >
            {user.role}
          </Badge>
        </div>

        <Button type="submit" size="sm">
          Save changes
        </Button>
      </form>
    </Card>
  )
}

function BillingSection({
  appUrl,
  subscription,
}: {
  appUrl: string
  subscription?: SettingsPageProps['subscription']
}) {
  return (
    <Card>
      <CardTitle>Billing</CardTitle>
      <CardDescription>Manage your subscription and payment method.</CardDescription>

      <div class="mt-4">
        {subscription ? (
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm text-body">Status:</span>
              <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
                {subscription.status}
              </Badge>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-body">Plan:</span>
              <span class="text-sm font-medium text-ink capitalize">
                {subscription.planInterval}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-body">Renews:</span>
              <span class="text-sm text-ink">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
            <LinkButton href={`${appUrl}/api/subscription/portal`} variant="secondary" size="sm">
              Manage in Stripe
            </LinkButton>
          </div>
        ) : (
          <div class="space-y-3">
            <p class="text-sm text-body">You don't have an active subscription.</p>
            <LinkButton href="/#pricing" variant="primary" size="sm">
              View plans
            </LinkButton>
          </div>
        )}
      </div>
    </Card>
  )
}

function DangerSection({ appUrl }: { appUrl: string }) {
  return (
    <Card class="border-error/20">
      <CardTitle class="text-error">Danger Zone</CardTitle>
      <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>

      <div class="mt-4 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p class="text-sm font-medium text-ink">Export your data</p>
            <p class="text-xs text-body">Download a copy of all your data.</p>
          </div>
          <LinkButton href={`${appUrl}/api/account/export`} variant="secondary" size="sm">
            Export data
          </LinkButton>
        </div>

        <hr class="border-linen" />

        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p class="text-sm font-medium text-ink">Delete account</p>
            <p class="text-xs text-body">Permanently delete your account and all data.</p>
          </div>
          <Button variant="danger" size="sm">
            Delete account
          </Button>
        </div>
      </div>
    </Card>
  )
}
