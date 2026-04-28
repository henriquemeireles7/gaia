import type { JSX } from 'preact'

type InputProps = {
  label: string
  error?: string
  hint?: string
  class?: string
} & Omit<JSX.IntrinsicElements['input'], 'class'>

export function Input({ label, error, hint, id, class: className = '', ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div class="space-y-1">
      <label for={inputId} class="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        class={`w-full px-3 py-2 bg-surface-white border rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 ${error ? 'border-error' : 'border-linen'} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} class="text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} class="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

type TextareaProps = {
  label: string
  error?: string
  class?: string
} & Omit<JSX.IntrinsicElements['textarea'], 'class'>

export function Textarea({ label, error, id, class: className = '', ...props }: TextareaProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div class="space-y-1">
      <label for={inputId} class="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        class={`w-full px-3 py-2 bg-surface-white border rounded-sm text-ink placeholder:text-muted transition-colors focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 ${error ? 'border-error' : 'border-linen'} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} class="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
