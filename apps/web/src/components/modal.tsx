import type { JSX } from 'solid-js'
import { createEffect, Show } from 'solid-js'

// Modal — wraps native <dialog>. design.md §"Components → Modals":
// "Native <dialog> gives focus trap, Escape-to-close, backdrop click
// handling, a11y — free."

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  footer?: JSX.Element
  children: JSX.Element
}

export function Modal(props: ModalProps): JSX.Element {
  let dialogRef: HTMLDialogElement | undefined
  const captureRef = (el: HTMLDialogElement) => {
    dialogRef = el
  }

  createEffect(() => {
    const el = dialogRef
    if (!el) return
    if (props.open && !el.open) el.showModal()
    if (!props.open && el.open) el.close()
  })

  function handleClose() {
    props.onClose()
  }

  function handleBackdropClick(e: MouseEvent) {
    // design.md: backdrop click closes. Native <dialog> reports the
    // click target as the dialog itself when the click lands on the
    // backdrop area (outside the inner content box).
    if (e.target === dialogRef) props.onClose()
  }

  return (
    <dialog ref={captureRef} class="modal" onClose={handleClose} onClick={handleBackdropClick}>
      <header class="modal-header">{props.title}</header>
      <div>{props.children}</div>
      <Show when={props.footer}>
        <footer class="modal-footer">{props.footer}</footer>
      </Show>
    </dialog>
  )
}
