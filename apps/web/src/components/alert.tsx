import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

// Alert — design.md §"Components → Alerts". Tinted background matching
// semantic color, with icon + message. Use Toast for transient
// notifications; use Alert for inline state.

export type AlertType = 'success' | 'error' | 'warning' | 'info'

const ICONS: Record<AlertType, string> = {
  success: '✓',
  error: '×',
  warning: '!',
  info: 'i',
}

export type AlertProps = {
  type: AlertType
  title?: string
  children: JSX.Element
}

export function Alert(props: AlertProps): JSX.Element {
  return (
    <div class={`alert alert-${props.type}`} role={props.type === 'error' ? 'alert' : 'status'}>
      <span class="alert-icon" aria-hidden="true">
        {ICONS[props.type]}
      </span>
      <div class="alert-body">
        <Show when={props.title}>
          <div class="alert-title">{props.title}</div>
        </Show>
        <div>{props.children}</div>
      </div>
    </div>
  )
}
