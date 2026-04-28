# email

## Purpose
Transactional email templates: auth emails, payment lifecycle emails.

## Critical Rules
- ALWAYS use sendEmail() from providers/email — never import Resend directly
- ALWAYS use escapeHtml() for user-provided data in templates
- ALWAYS include both HTML and plain text versions (via emailLayout)

---
<!-- AUTO-GENERATED BELOW — do not edit manually -->

## Files
| File | Exports |
|------|---------|
| auth-emails.ts | verificationEmail, welcomeEmail, passwordResetEmail, passwordChangedEmail |
| layout.ts | emailLayout, escapeHtml, ctaButton, stripHtml |
| payment-emails.ts | paymentConfirmationEmail, renewalReceiptEmail, paymentFailedEmail, renewalReminderEmail, subscriptionCancelledEmail, accessRevokedEmail |

<!-- Generated: 2026-04-19T04:04:55.788Z -->
