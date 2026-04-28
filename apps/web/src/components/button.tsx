import type { ComponentProps, JSX } from 'solid-js'
import { mergeProps, splitProps } from 'solid-js'

// Button — design.md §"Components → Buttons" + §"Interaction states".
// All 8 states are accounted for: default, hover, focus, active, disabled,
// loading, error, success. Hover/focus/active are handled by CSS pseudo-
// classes in components.css; disabled/loading/error/success are explicit
// props that map to the .is-* class names.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonState = 'default' | 'loading' | 'error' | 'success'

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  state?: ButtonState
}

export function Button(rawProps: ButtonProps): JSX.Element {
  const props = mergeProps(
    {
      variant: 'primary' as ButtonVariant,
      state: 'default' as ButtonState,
      type: 'button' as const,
    },
    rawProps,
  )
  const [local, rest] = splitProps(props, ['variant', 'state', 'class', 'disabled', 'children'])

  const cls = () => {
    const parts = ['btn', `btn-${local.variant}`]
    if (local.state === 'loading') parts.push('is-loading')
    if (local.state === 'error') parts.push('is-error')
    if (local.state === 'success') parts.push('is-success')
    if (local.class) parts.push(local.class)
    return parts.join(' ')
  }

  return (
    <button
      {...rest}
      class={cls()}
      disabled={local.disabled || local.state === 'loading'}
      aria-busy={local.state === 'loading'}
    >
      {local.children}
    </button>
  )
}
