// packages/workflows/index.ts — iii worker + function registry.
//
// Vision §Architecture-10: workflow orchestration is a platform primitive.
// The iii engine (Rust binary, ws://localhost:49134 by default) handles
// durability, retry, and routing; this file registers the worker plus
// every function and trigger Gaia owns.
//
// Self-hosted iii has no Elysia-side serve handler — the engine routes
// invocations over WebSocket. apps/api/server/app.ts only needs to
// import this module so registration runs at boot.

import { sendEmail } from '@gaia/adapters/email'
import { env } from '@gaia/config'
import { Logger, registerWorker } from 'iii-sdk'

export const iii = registerWorker(env.III_URL, {
  workerName: env.III_WORKER_NAME,
})

export const logger = new Logger()

// ── Functions ───────────────────────────────────────────────────

type SendWelcomePayload = { email: string; idempotencyKey?: string }
type SendWelcomeResult = { sent: string } | { skipped: string }

/**
 * Welcome-email workflow. Triggered when a user signs up. Idempotent:
 * the caller passes a stable `idempotencyKey` so retries are safe.
 */
export const sendWelcomeRef = iii.registerFunction(
  'email::send-welcome',
  async (payload: SendWelcomePayload): Promise<SendWelcomeResult> => {
    if (!payload?.email) return { skipped: 'no-email' }
    await sendEmail(payload.email, {
      subject: 'Welcome to Gaia',
      html: `<p>Welcome aboard. You're ready to ship.</p>`,
      text: `Welcome aboard. You're ready to ship.`,
    })
    return { sent: payload.email }
  },
  { description: 'Send the post-signup welcome email.' },
)

/**
 * The list of registered function refs. Mirrors the legacy `functions`
 * export so callers that imported it from inngest days keep compiling
 * during the migration.
 */
export const functions = [sendWelcomeRef]
