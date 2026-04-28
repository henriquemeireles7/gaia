import { A, createAsync, query } from '@solidjs/router'
import { Show } from 'solid-js'
import { Alert, Button, Card, EmptyState, Skeleton } from '../components'
import { api } from '../lib/api'

const getMe = query(async () => {
  'use server'
  const { data, error } = await api.me.get()
  if (error) return null
  return data
}, 'me')

const getSubscription = query(async () => {
  'use server'
  const { data, error } = await api.billing.subscription.get()
  if (error) return null
  return data.subscription
}, 'billing.subscription')

export const route = {
  preload: () => {
    getMe()
    getSubscription()
  },
}

export default function Dashboard() {
  const me = createAsync(() => getMe())
  const sub = createAsync(() => getSubscription())

  return (
    <main
      style={{
        'max-width': '900px',
        margin: '0 auto',
        padding: 'var(--space-2xl) var(--space-md)',
      }}
    >
      <header
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': 'var(--space-xl)',
        }}
      >
        <h1>Dashboard</h1>
        <A href="/billing">
          <Button variant="ghost">Billing</Button>
        </A>
      </header>

      <div style={{ display: 'grid', 'grid-template-columns': '1fr', gap: 'var(--space-lg)' }}>
        <Card header="Account">
          <Show when={me()} fallback={<Skeleton variant="text" width="60%" />}>
            {(data) => (
              <p>
                Signed in as <strong>{data().user.email}</strong>.
              </p>
            )}
          </Show>
        </Card>

        <Card header="Subscription">
          <Show when={sub() !== undefined} fallback={<Skeleton variant="text" width="40%" />}>
            <Show
              when={sub()}
              fallback={
                <EmptyState
                  title="No active subscription"
                  description="Upgrade to unlock everything Gaia ships with."
                  action={{ label: 'View plans', onClick: () => (location.href = '/billing') }}
                />
              }
            >
              {(s) => (
                <Alert type={s().status === 'active' ? 'success' : 'warning'}>
                  Status: <strong>{s().status}</strong> · renews{' '}
                  {new Date(s().currentPeriodEnd).toLocaleDateString()}.
                </Alert>
              )}
            </Show>
          </Show>
        </Card>

        <Card header="Build something">
          This is your starting point. Add a feature in <code>apps/api/server/</code>, expose a
          route, then consume it via the typed Eden Treaty client in{' '}
          <code>apps/web/src/lib/api.ts</code>.
        </Card>
      </div>
    </main>
  )
}
