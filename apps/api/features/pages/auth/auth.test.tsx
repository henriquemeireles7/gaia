import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { ForgotPasswordPage, ForgotPasswordSentPage } from './forgot-password'
import { LoginPage } from './login'
import { ResetPasswordPage } from './reset-password'
import { SignupPage } from './signup'

const appUrl = 'http://localhost:3000'

describe('LoginPage', () => {
  test('renders login form', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('Welcome back')
    expect(html).toContain('Sign in to your account')
    expect(html).toContain('name="email"')
    expect(html).toContain('name="password"')
    expect(html).toContain('Sign in')
  })

  test('renders forgot password link', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('href="/forgot-password"')
    expect(html).toContain('Forgot password?')
  })

  test('renders signup link', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('href="/signup"')
    expect(html).toContain('Sign up')
  })

  test('renders remember me checkbox', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('name="rememberMe"')
    expect(html).toContain('Remember me')
  })

  test('renders Google OAuth when enabled', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={true} />)
    expect(html).toContain('Google')
    expect(html).toContain('or continue with')
  })

  test('hides Google OAuth when disabled', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).not.toContain('or continue with')
  })

  test('renders password visibility toggle', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('data-toggle-password')
    expect(html).toContain('Show')
  })

  test('includes validation script', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('login-form')
    expect(html).toContain('<script>')
  })

  test('form posts to auth endpoint', () => {
    const html = renderToString(<LoginPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain(`action="${appUrl}/api/auth/sign-in/email"`)
  })
})

describe('SignupPage', () => {
  test('renders signup form with name field', () => {
    const html = renderToString(<SignupPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('Create your account')
    expect(html).toContain('name="name"')
    expect(html).toContain('name="email"')
    expect(html).toContain('name="password"')
    expect(html).toContain('Create account')
  })

  test('renders terms and privacy links', () => {
    const html = renderToString(<SignupPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
  })

  test('renders login link', () => {
    const html = renderToString(<SignupPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain('href="/login"')
    expect(html).toContain('Sign in')
  })

  test('form posts to signup endpoint', () => {
    const html = renderToString(<SignupPage appUrl={appUrl} hasGoogle={false} />)
    expect(html).toContain(`action="${appUrl}/api/auth/sign-up/email"`)
  })
})

describe('ForgotPasswordPage', () => {
  test('renders email form', () => {
    const html = renderToString(<ForgotPasswordPage appUrl={appUrl} />)
    expect(html).toContain('Reset your password')
    expect(html).toContain('name="email"')
    expect(html).toContain('Send reset link')
  })

  test('renders login link', () => {
    const html = renderToString(<ForgotPasswordPage appUrl={appUrl} />)
    expect(html).toContain('href="/login"')
  })
})

describe('ForgotPasswordSentPage', () => {
  test('renders confirmation message', () => {
    const html = renderToString(<ForgotPasswordSentPage />)
    expect(html).toContain('Check your email')
    expect(html).toContain('reset link')
    expect(html).toContain('href="/login"')
  })
})

describe('ResetPasswordPage', () => {
  test('renders password reset form', () => {
    const html = renderToString(<ResetPasswordPage appUrl={appUrl} token="abc123" />)
    expect(html).toContain('Set new password')
    expect(html).toContain('value="abc123"')
    expect(html).toContain('New password')
    expect(html).toContain('Confirm password')
    expect(html).toContain('Reset password')
  })

  test('includes token as hidden field', () => {
    const html = renderToString(<ResetPasswordPage appUrl={appUrl} token="test-token" />)
    expect(html).toContain('type="hidden"')
    expect(html).toContain('name="token"')
    expect(html).toContain('value="test-token"')
  })

  test('form posts to reset endpoint', () => {
    const html = renderToString(<ResetPasswordPage appUrl={appUrl} token="abc" />)
    expect(html).toContain(`action="${appUrl}/api/auth/reset-password"`)
  })
})
