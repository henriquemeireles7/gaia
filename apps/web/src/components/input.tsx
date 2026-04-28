import type { ComponentProps, JSX } from 'solid-js'
import { createUniqueId, mergeProps, Show, splitProps } from 'solid-js'

// Input — text-style input with label, helper text, and error/success
// states. Pairs with a `<Field>` wrapper that owns the label/error
// rendering so the same input is reusable inside forms or filter UIs.

export type InputState = 'default' | 'error' | 'success' | 'loading'

export type InputProps = ComponentProps<'input'> & {
  label: string
  helper?: string
  error?: string
  state?: InputState
}

export function Input(rawProps: InputProps): JSX.Element {
  const props = mergeProps({ state: 'default' as InputState, type: 'text' as const }, rawProps)
  const [local, rest] = splitProps(props, ['label', 'helper', 'error', 'state', 'class', 'id'])

  const id = local.id ?? createUniqueId()
  const helperId = `${id}-help`
  const errorId = `${id}-err`

  const effectiveState = () => (local.error ? 'error' : local.state)
  const cls = () => {
    const parts = ['input']
    const s = effectiveState()
    if (s === 'error') parts.push('is-error')
    else if (s === 'success') parts.push('is-success')
    else if (s === 'loading') parts.push('is-loading')
    if (local.class) parts.push(local.class)
    return parts.join(' ')
  }

  return (
    <div class="field">
      <label for={id} class="field-label">
        {local.label}
      </label>
      <input
        {...rest}
        id={id}
        class={cls()}
        aria-invalid={effectiveState() === 'error' || undefined}
        aria-describedby={local.error ? errorId : local.helper ? helperId : undefined}
      />
      <Show when={local.helper && !local.error}>
        <span id={helperId} class="field-helper">
          {local.helper}
        </span>
      </Show>
      <Show when={local.error}>
        <span id={errorId} class="field-error-text" role="alert">
          {local.error}
        </span>
      </Show>
    </div>
  )
}
