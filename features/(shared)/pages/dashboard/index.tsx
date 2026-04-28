import type { AppOrg, AppUser, OrgMemberRole } from '@/platform/types'
import { LinkButton } from '../../ui/components/button'
import { Card, CardDescription, CardTitle } from '../../ui/components/card'
import { DashboardLayout } from '../../ui/layouts/dashboard-layout'

type DashboardPageProps = {
  user: AppUser
  org?: AppOrg | null
  orgRole?: OrgMemberRole | null
  orgs: Array<{ id: string; name: string; slug: string }>
  isFirstRun?: boolean
  stats?: {
    memberCount?: number
    subscriptionStatus?: string
    planInterval?: string
  }
}

export function DashboardPage({ user, org, orgRole, orgs, isFirstRun, stats }: DashboardPageProps) {
  return (
    <DashboardLayout user={user} org={org} orgRole={orgRole} orgs={orgs} currentPath="/dashboard">
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p class="text-body mt-1">Welcome back, {user.name || 'there'}.</p>
        </div>

        {isFirstRun && <WelcomeCard user={user} org={org} />}

        {!isFirstRun && !org && orgs.length === 0 && <EmptyState user={user} />}

        {org && stats && <OrgStats org={org} stats={stats} />}
      </div>
    </DashboardLayout>
  )
}

function WelcomeCard({ user, org }: { user: AppUser; org?: AppOrg | null }) {
  const steps = [
    { label: 'Create your account', done: true },
    { label: 'Create an organization', done: !!org, href: '/dashboard/org/new' },
    { label: 'Connect Stripe', done: false, href: '/dashboard/settings' },
    { label: 'Invite your team', done: false, href: '/dashboard/org/members' },
    { label: 'Configure billing', done: false, href: '/dashboard/settings' },
  ]

  const completed = steps.filter((s) => s.done).length
  const progress = Math.round((completed / steps.length) * 100)

  return (
    <Card class="border-gold/30 bg-gold/5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <CardTitle>Welcome to Douala, {user.name || 'there'}!</CardTitle>
          <CardDescription>Complete these steps to get your SaaS up and running.</CardDescription>
        </div>
        <span class="text-sm font-medium text-gold">
          {completed}/{steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div class="mt-4 h-2 bg-sand rounded-full overflow-hidden">
        <div class="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <ul class="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.label} class="flex items-center gap-3">
            {step.done ? (
              <svg
                aria-hidden="true"
                class="w-5 h-5 text-success shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <div class="w-5 h-5 rounded-full border-2 border-linen shrink-0" />
            )}
            {step.href && !step.done ? (
              <a href={step.href} class="text-sm text-gold hover:text-gold-hover font-medium">
                {step.label}
              </a>
            ) : (
              <span class={`text-sm ${step.done ? 'text-muted line-through' : 'text-ink'}`}>
                {step.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function EmptyState({ user: _user }: { user: AppUser }) {
  return (
    <Card class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-sand flex items-center justify-center mx-auto mb-4">
        <svg
          aria-hidden="true"
          class="w-8 h-8 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h2 class="font-display text-xl font-semibold text-ink mb-2">No organization yet</h2>
      <p class="text-body text-sm max-w-xs mx-auto mb-6">
        Create an organization to start collaborating with your team and managing subscriptions.
      </p>
      <LinkButton href="/dashboard/org/new">Create organization</LinkButton>
    </Card>
  )
}

function OrgStats({
  org,
  stats,
}: {
  org: AppOrg
  stats: NonNullable<DashboardPageProps['stats']>
}) {
  const statItems = [
    { label: 'Members', value: stats.memberCount ?? 0 },
    {
      label: 'Plan',
      value: org.plan === 'free' ? 'Free' : `${org.plan} (${stats.planInterval || 'monthly'})`,
    },
    { label: 'Status', value: stats.subscriptionStatus || 'Active' },
  ]

  return (
    <div class="grid sm:grid-cols-3 gap-4">
      {statItems.map((stat) => (
        <Card key={stat.label}>
          <p class="text-sm text-body">{stat.label}</p>
          <p class="text-2xl font-display font-bold text-ink mt-1">{stat.value}</p>
        </Card>
      ))}
    </div>
  )
}
