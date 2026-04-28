import { ctaButton, emailLayout, escapeHtml } from './layout'

// CUSTOMIZE: Update brand name in subjects and copy

export function verificationEmail(vars: { name: string; url: string }) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Click below to verify your email and access your account.</p>
${ctaButton('Verify Email', vars.url)}
<p style="color:#A69D91;font-size:14px;">This link expires in 24 hours.<br>
If you didn't create an account, ignore this email.</p>`

  return { subject: 'Verify your email', ...emailLayout(content) }
}

export function welcomeEmail(vars: { name: string; dashboardUrl: string }) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Your account is verified and ready.</p>
${ctaButton('Go to Dashboard', vars.dashboardUrl)}`

  return { subject: 'Welcome!', ...emailLayout(content) }
}

export function passwordResetEmail(vars: { name: string; url: string }) {
  const name = escapeHtml(vars.name)
  const content = `
<p>Hi ${name},</p>
<p>Someone requested a password reset for your account.</p>
${ctaButton('Reset Password', vars.url)}
<p style="color:#A69D91;font-size:14px;">This link expires in 30 minutes.<br>
If you didn't request this, your password hasn't changed.</p>`

  return { subject: 'Reset your password', ...emailLayout(content) }
}

export function passwordChangedEmail(vars: {
  name: string
  date: string
  forgotPasswordUrl: string
}) {
  const name = escapeHtml(vars.name)
  const dateStr = vars.date.split('T')[0]
  const content = `
<p>Hi ${name},</p>
<p>Your password was successfully changed on ${dateStr}.</p>
<p>All other sessions have been signed out for your security.</p>
<p>If you didn't make this change, reset your password immediately:</p>
${ctaButton('Reset Password', vars.forgotPasswordUrl)}`

  return { subject: 'Your password was changed', ...emailLayout(content) }
}
