import { Button } from '../../ui/components/button'
import {
  AuthLayout,
  AuthValidationScript,
  FormError,
  GoogleOAuthButton,
  PasswordInput,
} from './shared'

export function LoginPage({ appUrl, hasGoogle }: { appUrl: string; hasGoogle: boolean }) {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <FormError />

      <form
        id="login-form"
        action={`${appUrl}/api/auth/sign-in/email`}
        method="POST"
        class="space-y-4"
        data-redirect="/dashboard"
        noValidate
      >
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

        <PasswordInput />

        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" name="rememberMe" class="rounded border-linen" />
            Remember me
          </label>
          <a href="/forgot-password" class="text-sm text-gold hover:text-gold-hover">
            Forgot password?
          </a>
        </div>

        <Button type="submit" fullWidth>
          Sign in
        </Button>
      </form>

      {hasGoogle && <GoogleOAuthButton appUrl={appUrl} />}

      <p class="mt-6 text-center text-sm text-body">
        Don't have an account?{' '}
        <a href="/signup" class="text-gold hover:text-gold-hover font-medium">
          Sign up
        </a>
      </p>

      <AuthValidationScript formId="login-form" />
    </AuthLayout>
  )
}
