import { action, useSubmission } from '@solidjs/router'
import { Show } from 'solid-js'
import { Alert, Button, Card } from '../components'
import { api } from '../lib/api'

const startCheckout = action(async () => {
  'use server'
  const { data, error } = await api.billing.checkout.post()
  if (error) {
    const body = error.value as { message?: string } | null
    return { ok: false as const, message: body?.message ?? 'Checkout failed' }
  }
  return { ok: true as const, url: data.url }
}, 'billing.checkout')

export default function Billing() {
  const result = useSubmission(startCheckout)

  // When checkout succeeds the action returns the Polar URL; redirect to it.
  // Solid's `useSubmission` returns the value reactively; we redirect on first sight.
  const redirectUrl = () => (result.result?.ok === true ? result.result.url : null)
  if (typeof window !== 'undefined') {
    const url = redirectUrl()
    if (url) window.location.href = url
  }

  return (
    <main
      style={{
        'max-width': '720px',
        margin: '0 auto',
        padding: 'var(--space-2xl) var(--space-md)',
      }}
    >
      <h1>Billing</h1>
      <p style={{ color: 'var(--text-secondary)', 'margin-bottom': 'var(--space-lg)' }}>
        Subscriptions are handled by <strong>Polar</strong> (merchant-of-record). After checkout
        Polar charges, collects tax, and we receive a webhook that activates your account.
      </p>

      <Card header="Pro">
        <p>Everything in Free, plus higher rate limits and access to premium features.</p>
        <form action={startCheckout} method="post" style={{ 'margin-top': 'var(--space-md)' }}>
          <Button type="submit" state={result.pending ? 'loading' : 'default'} variant="primary">
            Continue to checkout
          </Button>
        </form>
        <Show when={result.result?.ok === false}>
          {() => (
            <Alert type="error">{(result.result as { ok: false; message: string }).message}</Alert>
          )}
        </Show>
      </Card>
    </main>
  )
}
