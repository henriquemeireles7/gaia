import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import type { AppOrg, AppUser } from '@/platform/types'
import { InvitationsPage } from './invitations'
import { MembersPage } from './members'
import { OrgSettingsPage } from './settings'

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
const appUrl = 'http://localhost:3000'

describe('OrgSettingsPage', () => {
  test('renders org name and slug', () => {
    const html = renderToString(
      <OrgSettingsPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Organization Settings')
    expect(html).toContain('Acme Inc')
    expect(html).toContain('acme')
  })

  test('shows save button for admin/owner', () => {
    const html = renderToString(
      <OrgSettingsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Save changes')
  })

  test('hides save button for member', () => {
    const html = renderToString(
      <OrgSettingsPage
        user={mockUser}
        org={mockOrg}
        orgRole="member"
        orgs={mockOrgs}
        appUrl={appUrl}
      />,
    )
    expect(html).not.toContain('Save changes')
  })

  test('shows danger zone for owner only', () => {
    const ownerHtml = renderToString(
      <OrgSettingsPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        appUrl={appUrl}
      />,
    )
    expect(ownerHtml).toContain('Delete organization')

    const adminHtml = renderToString(
      <OrgSettingsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        appUrl={appUrl}
      />,
    )
    expect(adminHtml).not.toContain('Delete organization')
  })
})

describe('MembersPage', () => {
  const members = [
    {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'owner' as const,
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'member' as const,
      joinedAt: '2024-02-01T00:00:00Z',
    },
  ]

  test('renders member list', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        members={members}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Members')
    expect(html).toContain('2 members')
    expect(html).toContain('Test User')
    expect(html).toContain('Bob')
  })

  test('shows (you) label for current user', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        members={members}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('(you)')
  })

  test('shows invite button for admin/owner', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        members={members}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Invite member')
  })

  test('hides invite button for member', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="member"
        orgs={mockOrgs}
        members={members}
        appUrl={appUrl}
      />,
    )
    expect(html).not.toContain('Invite member')
  })

  test('renders empty state', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        members={[]}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('No members yet')
  })

  test('renders loading skeleton', () => {
    const html = renderToString(
      <MembersPage
        user={mockUser}
        org={mockOrg}
        orgRole="owner"
        orgs={mockOrgs}
        members={[]}
        appUrl={appUrl}
        loading
      />,
    )
    expect(html).toContain('animate-pulse')
  })
})

describe('InvitationsPage', () => {
  const invitations = [
    {
      id: 'inv-1',
      email: 'alice@example.com',
      role: 'member' as const,
      expiresAt: '2099-12-31T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]

  test('renders invitation list', () => {
    const html = renderToString(
      <InvitationsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        invitations={invitations}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Invitations')
    expect(html).toContain('alice@example.com')
  })

  test('shows invite form for admin/owner', () => {
    const html = renderToString(
      <InvitationsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        invitations={[]}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Invite a member')
    expect(html).toContain('Send invite')
  })

  test('renders empty state', () => {
    const html = renderToString(
      <InvitationsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        invitations={[]}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('No pending invitations')
  })

  test('shows expired badge for expired invitations', () => {
    const expired = [
      {
        id: 'inv-1',
        email: 'old@example.com',
        role: 'member' as const,
        expiresAt: '2020-01-01T00:00:00Z',
        createdAt: '2019-12-01T00:00:00Z',
      },
    ]
    const html = renderToString(
      <InvitationsPage
        user={mockUser}
        org={mockOrg}
        orgRole="admin"
        orgs={mockOrgs}
        invitations={expired}
        appUrl={appUrl}
      />,
    )
    expect(html).toContain('Expired')
    expect(html).toContain('Resend')
  })
})
