import type { JSX } from 'solid-js'
import { createContext, createSignal, For, mergeProps, useContext } from 'solid-js'
import { Portal } from 'solid-js/web'

// Toast — transient notifications via context. Wrap app in <ToastProvider>
// then call useToast() in any component to show one. Auto-dismisses after
// duration; click × to dismiss early. Z-layer is `--z-toast`.

export type ToastType = 'success' | 'error' | 'warning' | 'info'

type ToastEntry = {
  id: number
  type: ToastType
  message: string
}

type ToastApi = {
  show: (message: string, opts?: { type?: ToastType; duration?: number }) => void
}

// Default no-op so `useToast()` is safe to call outside <ToastProvider>
// (e.g. during SSR shells or in stories). Calls return silently.
const noopApi: ToastApi = { show: () => {} }
const ToastContext = createContext<ToastApi>(noopApi)

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

export function ToastProvider(props: { children: JSX.Element }): JSX.Element {
  const [toasts, setToasts] = createSignal<ToastEntry[]>([])
  let nextId = 1

  function show(message: string, opts?: { type?: ToastType; duration?: number }) {
    const merged = mergeProps({ type: 'info' as ToastType, duration: 4000 }, opts ?? {})
    const id = nextId++
    setToasts((cur) => [...cur, { id, type: merged.type, message }])
    setTimeout(() => dismiss(id), merged.duration)
  }

  function dismiss(id: number) {
    setToasts((cur) => cur.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {props.children}
      <Portal>
        <div class="toast-container" role="region" aria-label="Notifications">
          <For each={toasts()}>
            {(t) => (
              <div class={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
                <span class="toast-message">{t.message}</span>
                <button
                  type="button"
                  class="toast-dismiss"
                  aria-label="Dismiss"
                  onClick={() => dismiss(t.id)}
                >
                  ×
                </button>
              </div>
            )}
          </For>
        </div>
      </Portal>
    </ToastContext.Provider>
  )
}
