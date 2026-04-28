import { describe, expect, it } from 'bun:test'
import {
  accessRevokedEmail,
  paymentConfirmationEmail,
  paymentFailedEmail,
  renewalReceiptEmail,
  renewalReminderEmail,
  subscriptionCancelledEmail,
} from './payment-emails'

describe('paymentConfirmationEmail', () => {
  it('returns subject with html and text', () => {
    const result = paymentConfirmationEmail({
      name: 'Alice',
      amount: '$99.00',
      renewalDate: 'Jan 15, 2025',
      dashboardUrl: 'https://example.com/dashboard',
    })
    expect(result.subject).toContain('welcome')
    expect(result.html).toContain('Alice')
    expect(result.html).toContain('$99.00')
    expect(result.html).toContain('Jan 15, 2025')
    expect(result.text).toBeDefined()
  })
})

describe('renewalReceiptEmail', () => {
  it('includes card info and renewal date', () => {
    const result = renewalReceiptEmail({
      name: 'Bob',
      amount: '$9.90',
      cardLast4: '4242',
      nextRenewalDate: 'Feb 15, 2025',
      portalUrl: 'https://example.com/portal',
    })
    expect(result.subject).toContain('renewed')
    expect(result.html).toContain('4242')
    expect(result.html).toContain('Feb 15, 2025')
  })
})

describe('paymentFailedEmail', () => {
  it('includes amount and portal link', () => {
    const result = paymentFailedEmail({
      name: 'Charlie',
      amount: '$99.00',
      portalUrl: 'https://example.com/portal',
    })
    expect(result.subject).toContain("didn't go through")
    expect(result.html).toContain('$99.00')
    expect(result.html).toContain('Update Payment Method')
  })
})

describe('renewalReminderEmail', () => {
  it('includes card brand and renewal date', () => {
    const result = renewalReminderEmail({
      name: 'Dana',
      amount: '$99.00',
      renewalDate: 'Jan 22, 2025',
      cardBrand: 'Visa',
      cardLast4: '1234',
      portalUrl: 'https://example.com/portal',
    })
    expect(result.subject).toContain('7 days')
    expect(result.html).toContain('Visa')
    expect(result.html).toContain('1234')
  })
})

describe('subscriptionCancelledEmail', () => {
  it('includes period end date and resubscribe link', () => {
    const result = subscriptionCancelledEmail({
      name: 'Eve',
      periodEndDate: 'Mar 1, 2025',
      pricingUrl: 'https://example.com/pricing',
    })
    expect(result.subject).toContain('cancelled')
    expect(result.html).toContain('Mar 1, 2025')
    expect(result.html).toContain('Resubscribe')
  })
})

describe('accessRevokedEmail', () => {
  it('includes reactivate link', () => {
    const result = accessRevokedEmail({
      name: 'Frank',
      reactivateUrl: 'https://example.com/reactivate',
    })
    expect(result.subject).toContain('paused')
    expect(result.html).toContain('Reactivate')
    expect(result.html).toContain('https://example.com/reactivate')
  })
})
