import { useEffect, useId, useRef, useState } from 'react'
import {
  NOTEBOOK_COLOR_KEYS,
  NOTEBOOK_COLOR_LABELS,
} from '../lib/palette'
import type { NotebookColorKey } from '../types'
import { ConfirmDialog } from './ConfirmDialog'

interface NotebookFormProps {
  /** Heading shown above the fields, e.g. "New notebook" or "Edit notebook". */
  heading: string
  submitLabel: string
  initialName: string
  initialColor: NotebookColorKey
  onSubmit: (name: string, color: NotebookColorKey) => void
  onCancel: () => void
  /** Omitted for Inbox (which cannot be deleted) and for new notebooks. */
  onDelete?: () => void
  /** Name used in the delete confirmation, if deletion is offered. */
  deleteName?: string
}

/**
 * Create/rename/recolor a notebook.
 *
 * Color is a radio group rather than a free color picker: the app stores a
 * palette key, not a raw value, so the same notebook stays legible in both
 * themes (see `lib/palette.ts`).
 */
export function NotebookForm({
  heading,
  submitLabel,
  initialName,
  initialColor,
  onSubmit,
  onCancel,
  onDelete,
  deleteName,
}: NotebookFormProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<NotebookColorKey>(initialColor)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
  }, [])

  const canSubmit = name.trim().length > 0

  return (
    <form
      className="notebook-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) return
        onSubmit(name, color)
      }}
    >
      <p className="notebook-form__heading">{heading}</p>

      <label className="visually-hidden" htmlFor={nameId}>
        Notebook name
      </label>
      <input
        id={nameId}
        ref={nameRef}
        className="notebook-form__name"
        value={name}
        placeholder="Notebook name"
        maxLength={60}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
      />

      <fieldset className="notebook-form__colors">
        <legend className="visually-hidden">Notebook color</legend>
        {NOTEBOOK_COLOR_KEYS.map((key) => (
          <label key={key} className="color-swatch" title={NOTEBOOK_COLOR_LABELS[key]}>
            {/* The radio stays in the DOM so the group is keyboard-navigable and
                announced; the dot next to it is what is actually drawn, which
                keeps the selected state styleable without `:has()`. */}
            <input
              type="radio"
              name={`${nameId}-color`}
              value={key}
              checked={color === key}
              onChange={() => setColor(key)}
            />
            <span className="color-swatch__dot" data-color={key} aria-hidden="true" />
            <span className="visually-hidden">{NOTEBOOK_COLOR_LABELS[key]}</span>
          </label>
        ))}
      </fieldset>

      <div className="notebook-form__actions">
        <button
          type="submit"
          className="button button--small"
          disabled={!canSubmit}
        >
          {submitLabel}
        </button>
        <button type="button" className="link-button" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            className="link-button link-button--danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        )}
      </div>

      {onDelete && (
        <ConfirmDialog
          open={confirmingDelete}
          title={`Delete “${deleteName ?? initialName}”?`}
          description="Notes in this notebook stay in your workspace; any note that was only in it moves to Inbox. This cannot be undone."
          confirmLabel="Delete notebook"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false)
            onDelete()
          }}
        />
      )}
    </form>
  )
}
