import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Button } from './button'

// EmptyState — design.md §"Components → Empty states": empty states are
// onboarding opportunities, not dead ends. Pattern: icon + statement +
// explanation + primary CTA.

export type EmptyStateProps = {
  title: string
  description: string
  icon?: JSX.Element
  action?: { label: string; onClick: () => void }
}

export function EmptyState(props: EmptyStateProps): JSX.Element {
  return (
    <div class="empty-state">
      <Show when={props.icon}>
        <div class="empty-state-icon" aria-hidden="true">
          {props.icon}
        </div>
      </Show>
      <h2 class="empty-state-title">{props.title}</h2>
      <p class="empty-state-description">{props.description}</p>
      <Show when={props.action}>
        {(action) => (
          <Button variant="primary" onClick={action().onClick}>
            {action().label}
          </Button>
        )}
      </Show>
    </div>
  )
}
