import type { ComponentProps, JSX } from 'solid-js'
import { mergeProps, Show, splitProps } from 'solid-js'

// Card — surface with optional header + footer. design.md §"Components →
// Cards" rules: never nest cards inside cards.

export type CardProps = ComponentProps<'section'> & {
  header?: JSX.Element
  footer?: JSX.Element
  variant?: 'default' | 'elevated'
  interactive?: boolean
}

export function Card(rawProps: CardProps): JSX.Element {
  const props = mergeProps({ variant: 'default' as const, interactive: false }, rawProps)
  const [local, rest] = splitProps(props, [
    'header',
    'footer',
    'variant',
    'interactive',
    'class',
    'children',
  ])

  const cls = () => {
    const parts = ['card']
    if (local.variant === 'elevated') parts.push('card-elevated')
    if (local.interactive) parts.push('card-interactive')
    if (local.class) parts.push(local.class)
    return parts.join(' ')
  }

  return (
    <section {...rest} class={cls()}>
      <Show when={local.header}>
        <header class="card-header">{local.header}</header>
      </Show>
      {local.children}
      <Show when={local.footer}>
        <footer class="card-footer">{local.footer}</footer>
      </Show>
    </section>
  )
}
