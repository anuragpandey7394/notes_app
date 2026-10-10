import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation for destructive actions.
 *
 * Built on the native `<dialog>` element so focus trapping, `Escape` handling,
 * the backdrop and the top-layer stacking come from the browser rather than
 * from hand-rolled code. Focus is put on **Cancel**, so the destructive button
 * is never the thing a stray `Enter` hits.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // `Escape` fires `cancel`; the parent owns the open state, so hand it
      // back rather than letting the browser close the dialog directly.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // A click that lands on the dialog element itself is a backdrop click.
        if (event.target === dialogRef.current) onCancel()
      }}
    >
      <div className="confirm__panel">
        <h2 className="confirm__title" id={titleId}>
          {title}
        </h2>
        {description && (
          <p className="confirm__description" id={descriptionId}>
            {description}
          </p>
        )}
        <div className="confirm__actions">
          <button
            type="button"
            ref={cancelRef}
            className="button button--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
