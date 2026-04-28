import { ctaButton, emailLayout, escapeHtml } from './layout'

// CUSTOMIZE: Update brand name and copy in all emails

export function paymentConfirmationEmail(vars: {
  name: string
  amount: string
  renewalDate: string
  dashboardUrl: string
}) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p><strong>${escapeHtml(vars.amount)} — Pro Plan</strong></p>
<p>Your access is active until ${escapeHtml(vars.renewalDate)}.</p>
${ctaButton('Go to Dashboard', vars.dashboardUrl)}
<p style="color:#A69D91;font-size:14px;">If you have questions, reply to this email.</p>`

  return {
    subject: "You're in — welcome aboard",
    ...emailLayout(content, { preheader: 'Your access is ready.' }),
  }
}

export function renewalReceiptEmail(vars: {
  name: string
  amount: string
  cardLast4: string
  nextRenewalDate: string
  portalUrl: string
}) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>${escapeHtml(vars.amount)} charged to card ending in ${escapeHtml(vars.cardLast4)}.</p>
<p>Your access continues through ${escapeHtml(vars.nextRenewalDate)}.</p>
${ctaButton('View Billing History', vars.portalUrl)}`

  return { subject: 'Your subscription renewed', ...emailLayout(content) }
}

export function paymentFailedEmail(vars: { name: string; amount: string; portalUrl: string }) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Your payment of ${escapeHtml(vars.amount)} couldn't be processed.</p>
<p>This happens — usually it's an expired card or a temporary bank hold.</p>
${ctaButton('Update Payment Method', vars.portalUrl)}
<p>Your access stays active while we retry. If not resolved within 14 days, your access will be paused.</p>`

  return { subject: "Your payment didn't go through", ...emailLayout(content) }
}

export function renewalReminderEmail(vars: {
  name: string
  amount: string
  renewalDate: string
  cardBrand: string
  cardLast4: string
  portalUrl: string
}) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Your subscription (${escapeHtml(vars.amount)}) renews on ${escapeHtml(vars.renewalDate)}.</p>
<p>Payment method: ${escapeHtml(vars.cardBrand)} ending in ${escapeHtml(vars.cardLast4)}</p>
${ctaButton('Manage Billing', vars.portalUrl)}`

  return { subject: 'Your subscription renews in 7 days', ...emailLayout(content) }
}

export function subscriptionCancelledEmail(vars: {
  name: string
  periodEndDate: string
  pricingUrl: string
}) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Your subscription has been cancelled.</p>
<p>You'll continue to have access until ${escapeHtml(vars.periodEndDate)}.</p>
${ctaButton('Resubscribe', vars.pricingUrl)}`

  return { subject: 'Your subscription has been cancelled', ...emailLayout(content) }
}

export function accessRevokedEmail(vars: { name: string; reactivateUrl: string }) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>We weren't able to process your payment after multiple attempts.</p>
<p>Your access has been paused.</p>
${ctaButton('Reactivate Your Subscription', vars.reactivateUrl)}`

  return { subject: 'Your access has been paused', ...emailLayout(content) }
}
