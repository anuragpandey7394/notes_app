import { useState } from 'react'
import { toColorKey } from '../lib/palette'
import { countNotesInNotebook } from '../lib/selectors'
import { INBOX_ID } from '../persistence/format'
import { useWorkspaceActions } from '../state/use-workspace-actions'
import { useWorkspace } from '../state/workspace-context'
import { IconClose, IconNotebook, IconNotes, IconPencil, IconPlus } from './Icons'
import { NotebookForm } from './NotebookForm'
import { PersistenceStatus } from './PersistenceStatus'
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  /** Compact layouts show a close control; the desktop sidebar does not need one. */
  showClose: boolean
  onClose: () => void
  onNavigate: () => void
}

/**
 * Which notebook is currently being edited, if any.
 *
 * `'new'` means the create form is open; a notebook id means that notebook's
 * rename/recolor/delete form is open. Only one is open at a time.
 */
type Editing = 'new' | string | null

export function Sidebar({ showClose, onClose, onNavigate }: SidebarProps) {
  const { state, dispatch } = useWorkspace()
  const { addNotebook, renameNotebook, setNotebookColor, deleteNotebook } =
    useWorkspaceActions()

  const [editing, setEditing] = useState<Editing>(null)

  const selectNotebook = (id: string | null) => {
    dispatch({ type: 'select-notebook', id })
    onNavigate()
  }

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">
          <IconNotes size={18} />
        </span>
        <span className="sidebar__wordmark">Notes</span>
        {showClose && (
          <button
            type="button"
            className="icon-button sidebar__close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <IconClose size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Notebooks">
        <ul className="notebook-list">
          <li>
            <button
              type="button"
              className="notebook-item"
              data-active={state.activeNotebookId === null}
              aria-current={state.activeNotebookId === null ? 'true' : undefined}
              onClick={() => selectNotebook(null)}
            >
              <span
                className="notebook-item__dot notebook-item__dot--all"
                aria-hidden="true"
              />
              <span className="notebook-item__name">All notes</span>
              <span className="notebook-item__count">{state.notes.length}</span>
            </button>
          </li>

          {state.notebooks.map((notebook) => {
            if (editing === notebook.id) {
              return (
                <li key={notebook.id} className="notebook-list__editing">
                  <NotebookForm
                    heading="Edit notebook"
                    submitLabel="Save"
                    initialName={notebook.name}
                    initialColor={toColorKey(notebook.color)}
                    onSubmit={(name, color) => {
                      renameNotebook(notebook.id, name)
                      setNotebookColor(notebook.id, color)
                      setEditing(null)
                    }}
                    onCancel={() => setEditing(null)}
                    // Inbox is where unfiled notes go, so it stays.
                    onDelete={
                      notebook.id === INBOX_ID
                        ? undefined
                        : () => {
                            deleteNotebook(notebook.id)
                            setEditing(null)
                          }
                    }
                    deleteName={notebook.name}
                  />
                </li>
              )
            }

            const active = state.activeNotebookId === notebook.id
            const isInbox = notebook.id === INBOX_ID
            return (
              <li key={notebook.id} className="notebook-list__row">
                <button
                  type="button"
                  className="notebook-item"
                  data-active={active}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => selectNotebook(notebook.id)}
                >
                  <span
                    className="notebook-item__dot"
                    data-color={toColorKey(notebook.color)}
                    aria-hidden="true"
                  />
                  <span className="notebook-item__name">{notebook.name}</span>
                  <span className="notebook-item__count">
                    {countNotesInNotebook(state, notebook.id)}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button notebook-item__manage"
                  aria-label={`Edit ${notebook.name}`}
                  title={
                    isInbox
                      ? 'Rename or recolor Inbox'
                      : `Rename, recolor or delete ${notebook.name}`
                  }
                  onClick={() => setEditing(notebook.id)}
                >
                  <IconPencil size={14} />
                </button>
              </li>
            )
          })}
        </ul>

        {editing === 'new' ? (
          <div className="notebook-list__editing">
            <NotebookForm
              heading="New notebook"
              submitLabel="Create"
              initialName=""
              initialColor="sage"
              onSubmit={(name, color) => {
                addNotebook(name, color)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="notebook-add"
            onClick={() => setEditing('new')}
          >
            <IconPlus size={15} />
            New notebook
          </button>
        )}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__row">
          <span className="sidebar__row-label">
            <IconNotebook size={15} />
            Theme
          </span>
          <ThemeToggle />
        </div>
        <PersistenceStatus />
      </div>
    </div>
  )
}
