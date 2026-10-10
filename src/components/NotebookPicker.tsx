import { toColorKey } from '../lib/palette'
import { INBOX_ID, INBOX_NAME } from '../persistence/format'
import { useWorkspaceActions } from '../state/use-workspace-actions'
import { useWorkspace } from '../state/workspace-context'
import type { Note } from '../types'

/**
 * Which notebooks a note belongs to.
 *
 * A note can be in several at once. Inbox is always on and cannot be turned
 * off: it is the fallback every note lands in, which is what stops a note from
 * becoming unreachable when its last notebook is deleted. That rule is enforced
 * in the reducer, so this control reflects it rather than being the only thing
 * holding it up.
 */
export function NotebookPicker({ note }: { note: Note }) {
  const { state } = useWorkspace()
  const { setNoteNotebooks } = useWorkspaceActions()

  const toggle = (id: string) => {
    const next = note.notebookIds.includes(id)
      ? note.notebookIds.filter((current) => current !== id)
      : [...note.notebookIds, id]
    setNoteNotebooks(note.id, next)
  }

  return (
    <div className="notebook-picker" role="group" aria-label="Notebooks for this note">
      {state.notebooks.map((notebook) => {
        const isInbox = notebook.id === INBOX_ID
        const included = note.notebookIds.includes(notebook.id)
        return (
          <button
            key={notebook.id}
            type="button"
            className="chip chip--toggle"
            data-color={toColorKey(notebook.color)}
            data-on={included}
            aria-pressed={included}
            disabled={isInbox}
            title={
              isInbox
                ? `${INBOX_NAME} holds every note and cannot be turned off.`
                : included
                  ? `Remove from ${notebook.name}`
                  : `Add to ${notebook.name}`
            }
            onClick={() => toggle(notebook.id)}
          >
            {notebook.name}
          </button>
        )
      })}
    </div>
  )
}
