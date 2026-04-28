import { env } from '@gaia/config'
import { Resend } from 'resend'

export const email = new Resend(env.RESEND_API_KEY)

// CUSTOMIZE: update the from address. Resend will fail to send unless
// the domain is verified in your Resend dashboard.
export async function sendEmail(to: string, msg: { subject: string; html: string; text?: string }) {
  console.info(`[email] ${msg.subject} -> ${to}`)
  return email.emails.send({
    from: 'My App <hello@example.com>',
    to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ''),
  })
}
