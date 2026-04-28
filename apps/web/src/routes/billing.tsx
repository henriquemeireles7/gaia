// apps/web/src/routes/billing.tsx — placeholder until Polar checkout route ships.
//
// Per the no-direct-fetch-in-routes rule (.gaia/rules.ts), this page will
// fetch its checkout URL via Eden Treaty (see apps/web/src/lib/api.ts) once
// `POST /billing/checkout` is added to apps/api/server/app.ts.

export default function Billing() {
  return (
    <main>
      <h1>Billing</h1>
      <p>Subscriptions are handled by Polar (merchant-of-record).</p>
      <p>
        The checkout button will land here once the API ships <code>POST /billing/checkout</code>.
        The frontend will call it via the typed Eden Treaty client in <code>~/lib/api</code> — no
        raw <code>fetch</code> from route components.
      </p>
    </main>
  )
}
