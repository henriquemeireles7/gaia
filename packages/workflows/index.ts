// packages/workflows/index.ts — Inngest client + functions registry
//
// Vision §Architecture-10: workflow orchestration is a platform primitive.
// Functions are defined here (or per-feature) and registered via the
// `functions` array, which apps/api/server/app.ts mounts at /inngest.

import { sendEmail } from '@gaia/adapters/email'
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'gaia',
  name: 'gaia',
})

export type GaiaInngest = typeof inngest

/**
 * Welcome-email workflow. Triggered when a user signs up. Demonstrates
 * the platform primitive: durable, retryable, idempotent step.run.
 */
export const sendWelcome = inngest.createFunction(
  { id: 'send-welcome', triggers: [{ event: 'user/created' }] },
  async ({ event, step }) => {
    const email = (event.data as { email?: string }).email
    if (!email) return { skipped: 'no-email' }
    await step.run('send', () =>
      sendEmail(email, {
        subject: 'Welcome to Gaia',
        html: `<p>Welcome aboard. You're ready to ship.</p>`,
        text: `Welcome aboard. You're ready to ship.`,
      }),
    )
    return { sent: email }
  },
)

/**
 * The list of all functions to register at boot. Add new functions
 * here as they're authored.
 */
export const functions = [sendWelcome]
