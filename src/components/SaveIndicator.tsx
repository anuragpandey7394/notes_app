import { usePersistence } from '../persistence/persistence-context'

/**
 * Subtle save status for the note list header.
 *
 * `aria-live="polite"` means the change is announced without interrupting;
 * nothing is announced while idle, so an untouched app stays quiet.
 */
export function SaveIndicator() {
  const { mode, saveStatus, directoryName } = usePersistence()

  if (mode === 'unsupported') {
    return (
      <span className="save-indicator" data-state="off">
        Not saved to disk
      </span>
    )
  }

  if (mode !== 'connected') {
    return (
      <span className="save-indicator" data-state="off">
        Not connected
      </span>
    )
  }

  const label =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Not saved'
        : 'Saved'

  return (
    <span
      className="save-indicator"
      data-state={saveStatus}
      role="status"
      aria-live="polite"
      title={directoryName ? `Saved to ${directoryName}` : undefined}
    >
      {label}
    </span>
  )
}
