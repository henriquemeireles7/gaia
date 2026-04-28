import { describe, expect, it } from 'bun:test'
import {
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
  welcomeEmail,
} from './auth-emails'

describe('verificationEmail', () => {
  it('returns subject, html, and text', () => {
    const result = verificationEmail({ name: 'Alice', url: 'https://example.com/verify' })
    expect(result.subject).toBe('Verify your email')
    expect(result.html).toContain('Alice')
    expect(result.html).toContain('https://example.com/verify')
    expect(result.html).toContain('24 hours')
    expect(result.text).toBeDefined()
  })

  it('escapes HTML in user name', () => {
    const result = verificationEmail({ name: '<script>alert(1)</script>', url: 'https://x.com' })
    expect(result.html).not.toContain('<script>alert(1)</script>')
    expect(result.html).toContain('&lt;script&gt;')
  })
})

describe('welcomeEmail', () => {
  it('returns correct subject and content', () => {
    const result = welcomeEmail({ name: 'Bob', dashboardUrl: 'https://example.com/dashboard' })
    expect(result.subject).toBe('Welcome!')
    expect(result.html).toContain('Bob')
    expect(result.html).toContain('https://example.com/dashboard')
  })
})

describe('passwordResetEmail', () => {
  it('returns correct subject and content', () => {
    const result = passwordResetEmail({ name: 'Charlie', url: 'https://example.com/reset' })
    expect(result.subject).toBe('Reset your password')
    expect(result.html).toContain('Charlie')
    expect(result.html).toContain('30 minutes')
  })
})

describe('passwordChangedEmail', () => {
  it('returns correct subject and content', () => {
    const result = passwordChangedEmail({
      name: 'Dana',
      date: '2024-01-15T10:30:00Z',
      forgotPasswordUrl: 'https://example.com/forgot',
    })
    expect(result.subject).toBe('Your password was changed')
    expect(result.html).toContain('Dana')
    expect(result.html).toContain('2024-01-15')
  })
})
