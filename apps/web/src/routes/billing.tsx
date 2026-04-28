import { action, useSubmission } from '@solidjs/router'

const checkout = action(async () => {
  'use server'
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/billing/checkout`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    return { ok: false, message: 'Could not start checkout' }
  }
  const { url } = (await res.json()) as { url: string }
  return { ok: true as const, url }
}, 'checkout')

export default function Billing() {
  const result = useSubmission(checkout)

  return (
    <main>
      <h1>Billing</h1>
      <p>Subscriptions are handled by Polar (merchant-of-record).</p>
      <form action={checkout} method="post">
        <button type="submit" disabled={result.pending}>
          {result.pending ? 'Redirecting…' : 'Subscribe'}
        </button>
      </form>
      {result.result?.ok && result.result.url && (
        <p>
          <a href={result.result.url}>Continue to Polar</a>
        </p>
      )}
      {result.result && !result.result.ok && <p role="alert">{result.result.message}</p>}
    </main>
  )
}
