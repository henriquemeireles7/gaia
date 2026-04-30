// packages/adapters/mocks/email.ts — VENDOR_MODE=mock email implementation.
//
// Writes each "sent" email as one JSONL row to .gaia/sent-emails.jsonl so
// the developer can audit exactly what their app would have sent. Console
// line for the typical "did anything just go out?" check during dev.
//
// This is a layer BEFORE the Resend wrap (packages/adapters/email.ts).
// Same return-shape so callers don't branch.

import { appendFileSync, mkdirSync } from 'node:fs'

export type MockEmailResult = { id: string }

export async function sendEmailMock(
  to: string,
  msg: { subject: string; html: string; text?: string },
): Promise<MockEmailResult> {
  const id = `mock_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const entry = {
    ts: new Date().toISOString(),
    id,
    to,
    subject: msg.subject,
    htmlPreview: msg.html.slice(0, 200),
    textPreview: (msg.text ?? '').slice(0, 200),
  }
  try {
    mkdirSync('.gaia', { recursive: true })
    appendFileSync('.gaia/sent-emails.jsonl', `${JSON.stringify(entry)}\n`)
  } catch {
    /* best-effort — never crash app on log-file write failure */
  }
  // oxlint-disable-next-line no-console -- mock-mode console hint by design
  console.warn(`[mock email] ${msg.subject} → ${to}  (id=${id})`)
  return { id }
}
