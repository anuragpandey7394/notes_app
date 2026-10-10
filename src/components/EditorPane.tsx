import { useState } from 'react'
import { LexicalEditor } from '../editor/LexicalEditor'
import { formatAbsoluteTime, formatRelativeTime } from '../lib/format'
import { selectActiveNote } from '../lib/selectors'
import { useWorkspaceActions } from '../state/use-workspace-actions'
import { useWorkspace } from '../state/workspace-context'
import { ConfirmDialog } from './ConfirmDialog'
import { EmptyState } from './EmptyState'
import { IconChevronLeft, IconNotes, IconPin, IconTrash } from './Icons'
import { NotebookPicker } from './NotebookPicker'

interface EditorPaneProps {
  /** Compact layouts show a back control to return to the note list. */
  showBack: boolean
  onBack: () => void
}

function displayTitle(title: string): string {
  return title.trim() || 'Untitled note'
}

export function EditorPane({ showBack, onBack }: EditorPaneProps) {
  const { state } = useWorkspace()
  const { renameNote, deleteNote, togglePin, addNote, setNoteContent } =
    useWorkspaceActions()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const note = selectActiveNote(state)

  if (!note) {
    return (
      <div className="pane pane--editor">
        <EmptyState
          icon={<IconNotes size={22} />}
          title="No note selected"
          description="Choose a note from the list, or start a new one."
          action={
            <button type="button" className="button" onClick={addNote}>
              New note
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="pane pane--editor">
      <header className="editor__header">
        {showBack && (
          <button
            type="button"
            className="icon-button editor__back"
            onClick={onBack}
            aria-label="Back to note list"
          >
            <IconChevronLeft size={18} />
          </button>
        )}

        <div className="editor__meta">
          <NotebookPicker note={note} />
          <time
            className="editor__timestamp"
            dateTime={new Date(note.updatedAt).toISOString()}
            title={formatAbsoluteTime(note.updatedAt)}
          >
            Updated {formatRelativeTime(note.updatedAt)}
          </time>
        </div>

        <div className="editor__actions">
          <button
            type="button"
            className="icon-button"
            data-on={note.pinned}
            aria-pressed={note.pinned}
            title={note.pinned ? 'Unpin this note' : 'Pin this note to the top'}
            aria-label={note.pinned ? 'Unpin this note' : 'Pin this note to the top'}
            onClick={() => togglePin(note.id)}
          >
            <IconPin size={16} />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            aria-label={`Delete ${displayTitle(note.title)}`}
            title="Delete this note"
            onClick={() => setConfirmingDelete(true)}
          >
            <IconTrash size={16} />
          </button>
        </div>
      </header>

      <div className="editor__scroll">
        <div className="editor__doc">
          <label className="visually-hidden" htmlFor="note-title">
            Note title
          </label>

          <input
            id="note-title"
            className="editor__title"
            value={note.title}
            placeholder="Untitled note"
            onChange={(event) => renameNote(note.id, event.target.value)}
          />

          {/*
            Keyed by note id: switching notes remounts the composer, so the note
            being left can never have its content written into the newly opened
            one. Content flows up on every change; PersistenceProvider holds the
            single ~1s autosave debounce.
          */}
          <LexicalEditor
            key={note.id}
            storedContent={note.content}
            onContentChange={(content) => setNoteContent(note.id, content)}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete “${displayTitle(note.title)}”?`}
        description="The note and its version history are removed from your folder. This cannot be undone."
        confirmLabel="Delete note"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false)
          deleteNote(note.id)
        }}
      />
    </div>
  )
}
