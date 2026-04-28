import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import type { AppOrg, AppUser } from '@/platform/types'
import { DashboardPage } from './index'
import { SettingsPage } from './settings'

const mockUser: AppUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'pro',
}

const mockOrg: AppOrg = {
  id: 'org-1',
  name: 'Acme Inc',
  slug: 'acme',
  plan: 'pro',
}

const mockOrgs = [{ id: 'org-1', name: 'Acme Inc', slug: 'acme' }]

describe('DashboardPage', () => {
  test('renders greeting', () => {
    const html = renderToString(<DashboardPage user={mockUser} orgs={mockOrgs} />)
    expect(html).toContain('Dashboard')
    expect(html).toContain('Welcome back, Test User')
  })

  test('renders welcome card on first run', () => {
    const html = renderToString(<DashboardPage user={mockUser} orgs={[]} isFirstRun />)
    expect(html).toContain('Welcome to Douala')
    expect(html).toContain('Create an organization')
    expect(html).toContain('Connect Stripe')
    expect(html).toContain('Invite your team')
  })

  test('renders empty state when no orgs', () => {
    const html = renderToString(<DashboardPage user={mockUser} orgs={[]} />)
    expect(html).toContain('No organization yet')
    expect(html).toContain('Create organization')
  })

  test('renders org stats when org provided', () => {
    const html = renderToString(
      <DashboardPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        stats={{ memberCount: 5, subscriptionStatus: 'active', planInterval: 'monthly' }}
      />,
    )
    expect(html).toContain('Members')
    expect(html).toContain('5')
    expect(html).toContain('Status')
  })

  test('renders sidebar with nav', () => {
    const html = renderToString(
      <DashboardPage user={mockUser} org={mockOrg} orgRole="owner" orgs={mockOrgs} />,
    )
    expect(html).toContain('Dashboard')
    expect(html).toContain('Settings')
    expect(html).toContain('Organization')
    expect(html).toContain('Members')
  })

  test('renders org switcher with orgs', () => {
    const html = renderToString(
      <DashboardPage user={mockUser} org={mockOrg} orgRole="owner" orgs={mockOrgs} />,
    )
    expect(html).toContain('Acme Inc')
    expect(html).toContain('org-switcher')
  })

  test('renders admin nav for admin users', () => {
    const adminUser = { ...mockUser, role: 'admin' as const }
    const html = renderToString(
      <DashboardPage user={adminUser} org={mockOrg} orgRole="owner" orgs={mockOrgs} />,
    )
    expect(html).toContain('Admin Panel')
    expect(html).toContain('href="/admin"')
  })

  test('hides admin nav for non-admin users', () => {
    const html = renderToString(
      <DashboardPage user={mockUser} org={mockOrg} orgRole="owner" orgs={mockOrgs} />,
    )
    expect(html).not.toContain('Admin Panel')
  })
})

describe('SettingsPage', () => {
  test('renders account section', () => {
    const html = renderToString(
      <SettingsPage user={mockUser} orgs={mockOrgs} appUrl="http://localhost:3000" />,
    )
    expect(html).toContain('Account')
    expect(html).toContain('test@example.com')
    expect(html).toContain('Save changes')
  })

  test('renders billing with subscription', () => {
    const html = renderToString(
      <SettingsPage
        user={mockUser}
        orgs={mockOrgs}
        appUrl="http://localhost:3000"
        subscription={{
          status: 'active',
          planInterval: 'monthly',
          currentPeriodEnd: '2025-12-31T00:00:00Z',
        }}
      />,
    )
    expect(html).toContain('Billing')
    expect(html).toContain('active')
    expect(html).toContain('monthly')
    expect(html).toContain('Manage in Stripe')
  })

  test('renders billing without subscription', () => {
    const html = renderToString(
      <SettingsPage user={mockUser} orgs={mockOrgs} appUrl="http://localhost:3000" />,
    )
    expect(html).toContain('View plans')
  })

  test('renders danger zone', () => {
    const html = renderToString(
      <SettingsPage user={mockUser} orgs={mockOrgs} appUrl="http://localhost:3000" />,
    )
    expect(html).toContain('Danger Zone')
    expect(html).toContain('Export your data')
    expect(html).toContain('Delete account')
  })
})
