// packages/adapters/mocks/payments.ts — VENDOR_MODE=mock payments.
//
// Mimics the Polar SDK shape for the methods feature code calls
// (checkouts.create, customerSessions.create, customerPortal.create).
// Webhook verification accepts anything and returns a parsed event.
//
// The mock checkout URL points back at the user's own dev server with
// a `/billing/mock-checkout` query — so devs can wire a "thank you"
// confirmation page without a Polar account.

type CheckoutInput = { customerEmail: string; productId?: string; productPriceId?: string }

export const polarMock = {
  checkouts: {
    create: async (input: CheckoutInput): Promise<{ id: string; url: string }> => {
      const id = `mock_checkout_${Date.now()}`
      const url = `http://localhost:3000/billing/mock-checkout?email=${encodeURIComponent(input.customerEmail)}&id=${id}`
      // oxlint-disable-next-line no-console -- mock-mode console hint by design
      console.warn(`[mock polar] checkout created  email=${input.customerEmail}  id=${id}`)
      return { id, url }
    },
  },
  customerSessions: {
    create: async (_input: { customerId: string }): Promise<{ url: string }> => ({
      url: 'http://localhost:3000/billing/mock-portal',
    }),
  },
  customerPortal: {
    create: async (_input: { customerId: string }): Promise<{ url: string }> => ({
      url: 'http://localhost:3000/billing/mock-portal',
    }),
  },
}

/**
 * Mock webhook verification — accepts any signature, parses the body if
 * possible, returns a synthetic event otherwise.
 *
 * Intentionally permissive: in mock mode the user is sending POSTs to
 * /webhooks/polar from curl/Postman to test their handler. The check
 * exists in live mode where the real Polar key is set.
 */
export async function verifyWebhookMock(_h: Headers, body: string): Promise<unknown> {
  try {
    return JSON.parse(body)
  } catch {
    return {
      type: 'mock.event',
      id: `mock_event_${Date.now()}`,
      data: { source: 'verifyWebhookMock', body: body.slice(0, 200) },
    }
  }
}
