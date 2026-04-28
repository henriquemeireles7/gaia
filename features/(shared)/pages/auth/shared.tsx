import type { ComponentChildren } from 'preact'
import { PublicLayout } from '../../ui/layouts/public-layout'

/**
 * Shared auth page wrapper. Centers the form card with consistent styling.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ComponentChildren
  title: string
  subtitle?: string
}) {
  return (
    <PublicLayout>
      <div class="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <h1 class="font-display text-2xl font-bold text-ink">{title}</h1>
            {subtitle && <p class="mt-2 text-sm text-body">{subtitle}</p>}
          </div>
          <div class="bg-surface-white border border-linen rounded-md p-6">{children}</div>
        </div>
      </div>
    </PublicLayout>
  )
}

/**
 * Inline client-side validation script for auth forms.
 * Validates on blur + submit, shows inline errors below fields.
 *
 * Rendered as a <script> tag in the page — no framework needed.
 */
export function AuthValidationScript({ formId }: { formId: string }) {
  const script = `
(function() {
  var form = document.getElementById('${formId}');
  if (!form) return;

  var rules = {
    email: function(v) { return !v ? 'Email is required' : !/^[^@]+@[^@]+\\.[^@]+$/.test(v) ? 'Enter a valid email address' : '' },
    password: function(v) { return !v ? 'Password is required' : v.length < 8 ? 'Password must be at least 8 characters' : '' },
    name: function(v) { return !v ? 'Name is required' : v.length < 2 ? 'Name must be at least 2 characters' : '' },
    'confirm-password': function(v) {
      var pw = form.querySelector('[name="password"]');
      return !v ? 'Please confirm your password' : pw && v !== pw.value ? 'Passwords do not match' : '';
    }
  };

  function showError(input, msg) {
    var id = input.id || input.name;
    var el = document.getElementById(id + '-error');
    if (msg) {
      if (!el) {
        el = document.createElement('p');
        el.id = id + '-error';
        el.className = 'text-sm text-error mt-1';
        el.setAttribute('role', 'alert');
        input.parentNode.appendChild(el);
      }
      el.textContent = msg;
      input.classList.add('border-error');
      input.classList.remove('border-linen');
      input.setAttribute('aria-invalid', 'true');
    } else if (el) {
      el.remove();
      input.classList.remove('border-error');
      input.classList.add('border-linen');
      input.removeAttribute('aria-invalid');
    }
  }

  function validate(input) {
    var rule = rules[input.name];
    if (rule) showError(input, rule(input.value.trim()));
  }

  form.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('blur', function() { validate(input); });
  });

  form.addEventListener('submit', function(e) {
    var valid = true;
    form.querySelectorAll('input').forEach(function(input) {
      validate(input);
      if (input.getAttribute('aria-invalid') === 'true') valid = false;
    });
    if (!valid) { e.preventDefault(); return; }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }

    var formError = document.getElementById('form-error');

    var data = {};
    new FormData(form).forEach(function(v, k) { data[k] = v; });

    e.preventDefault();
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(function(res) {
      if (res.ok || res.redirected) {
        var redirect = form.dataset.redirect || '/dashboard';
        window.location.href = redirect;
      } else {
        return res.json().then(function(body) {
          if (formError) formError.textContent = (body.error && body.error.message) || 'Something went wrong';
          if (formError) formError.classList.remove('hidden');
        });
      }
    }).catch(function() {
      if (formError) formError.textContent = 'Network error. Please try again.';
      if (formError) formError.classList.remove('hidden');
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    });
  });

  // Password visibility toggle
  form.querySelectorAll('[data-toggle-password]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var input = document.getElementById(btn.dataset.togglePassword);
      if (input) {
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? 'Hide' : 'Show';
      }
    });
  });
})();
`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

export function FormError() {
  return (
    <div
      id="form-error"
      class="hidden text-sm text-error bg-error/5 border border-error/20 rounded-sm px-3 py-2 mb-4"
      role="alert"
    />
  )
}

export function PasswordInput({
  id = 'password',
  name = 'password',
  label = 'Password',
  autocomplete = 'current-password',
}: {
  id?: string
  name?: string
  label?: string
  autocomplete?: string
}) {
  return (
    <div class="space-y-1">
      <label for={id} class="block text-sm font-medium text-ink">
        {label}
      </label>
      <div class="relative">
        <input
          id={id}
          name={name}
          type="password"
          autocomplete={autocomplete}
          required
          minLength={8}
          class="w-full px-3 py-2 pr-16 bg-surface-white border border-linen rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          placeholder="••••••••"
        />
        <button
          type="button"
          data-toggle-password={id}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-body px-2 py-1"
        >
          Show
        </button>
      </div>
    </div>
  )
}

export function GoogleOAuthButton({ appUrl }: { appUrl: string }) {
  return (
    <>
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-linen" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-surface-white text-muted">or continue with</span>
        </div>
      </div>
      <a
        href={`${appUrl}/api/auth/sign-in/social?provider=google`}
        class="w-full inline-flex items-center justify-center gap-3 px-4 py-2 border border-linen rounded-sm text-sm font-medium text-ink hover:bg-sand transition-colors no-underline"
      >
        <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </a>
    </>
  )
}
