import { Button } from '../../ui/components/button'
import {
  AuthLayout,
  AuthValidationScript,
  FormError,
  GoogleOAuthButton,
  PasswordInput,
} from './shared'

export function SignupPage({ appUrl, hasGoogle }: { appUrl: string; hasGoogle: boolean }) {
  return (
    <AuthLayout title="Create your account" subtitle="Start your free trial today">
      <FormError />

      <form
        id="signup-form"
        action={`${appUrl}/api/auth/sign-up/email`}
        method="POST"
        class="space-y-4"
        data-redirect="/dashboard"
        noValidate
      >
        <div class="space-y-1">
          <label for="name" class="block text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autocomplete="name"
            required
            minLength={2}
            class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            placeholder="Your name"
          />
        </div>

        <div class="space-y-1">
          <label for="email" class="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="w-full px-3 py-2 bg-surface-white border border-linen rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            placeholder="you@example.com"
          />
        </div>

        <PasswordInput autocomplete="new-password" />

        <p class="text-xs text-muted">
          By signing up, you agree to our{' '}
          <a href="/terms" class="text-gold hover:text-gold-hover">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" class="text-gold hover:text-gold-hover">
            Privacy Policy
          </a>
          .
        </p>

        <Button type="submit" fullWidth>
          Create account
        </Button>
      </form>

      {hasGoogle && <GoogleOAuthButton appUrl={appUrl} />}

      <p class="mt-6 text-center text-sm text-body">
        Already have an account?{' '}
        <a href="/login" class="text-gold hover:text-gold-hover font-medium">
          Sign in
        </a>
      </p>

      <AuthValidationScript formId="signup-form" />
    </AuthLayout>
  )
}
