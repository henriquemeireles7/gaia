import { env } from '@gaia/config'
import { Resend } from 'resend'
import { sendEmailMock } from './mocks/email'

// `email` is the real Resend client (token may be a mock placeholder
// when VENDOR_MODE=mock — that's fine, the constructor doesn't fire a
// network call). Mock-mode callers go through `sendEmail()`, which
// branches at call-time and never touches the SDK in mock mode.
export const email = new Resend(env.RESEND_API_KEY)

// CUSTOMIZE: update the from address. Resend will fail to send unless
// the domain is verified in your Resend dashboard.
export async function sendEmail(to: string, msg: { subject: string; html: string; text?: string }) {
  if (env.VENDOR_MODE === 'mock') return sendEmailMock(to, msg)
  console.info(`[email] ${msg.subject} -> ${to}`)
  return email.emails.send({
    from: 'My App <hello@example.com>',
    to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ''),
  })
}
