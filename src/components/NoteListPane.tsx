import type { ReactNode, RefObject } from 'react'
import {
  countMatchesOutsideCurrentNotebook,
  selectHasNoSearchResults,
  selectNotebook,
  selectNotesInScope,
  selectVisibleNotes,
} from '../lib/selectors'
import { useWorkspaceActions } from '../state/use-workspace-actions'
import { useWorkspace } from '../state/workspace-context'
import { EmptyState } from './EmptyState'
import { IconMenu, IconNotes, IconPlus, IconSearch } from './Icons'
import { NoteCard } from './NoteCard'
import { SaveIndicator } from './SaveIndicator'
import { ThemeToggle } from './ThemeToggle'

interface NoteListPaneProps {
  menuButtonRef: RefObject<HTMLButtonElement | null>
  drawerOpen: boolean
  onOpenDrawer: () => void
}

export function NoteListPane({
  menuButtonRef,
  drawerOpen,
  onOpenDrawer,
}: NoteListPaneProps) {
  const { state, dispatch } = useWorkspace()
  const { addNote } = useWorkspaceActions()

  const notes = selectVisibleNotes(state)
  const activeNotebook = state.activeNotebookId
    ? selectNotebook(state, state.activeNotebookId)
    : undefined
  const heading = activeNotebook?.name ?? 'All notes'
  const searchActive = state.searchQuery.trim().length > 0

  const hasAnyNotes = state.notes.length > 0
  const noSearchResults = selectHasNoSearchResults(state)
  const matchesElsewhere = countMatchesOutsideCurrentNotebook(state)

  // "3 notes" while filtering is ambiguous — three out of how many? The
  // denominator is the notebook's size, not the whole library.
  const scopedCount = selectNotesInScope(state).length
  const noteWord = (count: number) => (count === 1 ? 'note' : 'notes')
  const subtitle = searchActive
    ? `${notes.length} of ${scopedCount} ${noteWord(scopedCount)}`
    : `${notes.length} ${noteWord(notes.length)}`

  const clearSearch = () => dispatch({ type: 'set-search', query: '' })
  const searchAllNotebooks = () => {
    dispatch({ type: 'select-notebook', id: null })
  }

  return (
    <div className="pane pane--list">
      <header className="pane__header">
        <button
          type="button"
          ref={menuButtonRef}
          className="icon-button pane__menu"
          onClick={onOpenDrawer}
          aria-label="Open notebooks and navigation"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
        >
          <IconMenu size={18} />
        </button>

        <div className="pane__titles">
          <h1 className="pane__title">{heading}</h1>
          <p className="pane__subtitle">{subtitle}</p>
        </div>

        <div className="pane__header-actions">
          <SaveIndicator />
          <ThemeToggle showLabel={false} />
        </div>

        <button
          type="button"
          className="button button--small pane__new"
          onClick={addNote}
          title="New note (in the notebook you are viewing)"
        >
          <IconPlus size={15} />
          New note
        </button>
      </header>

      <div className="pane__search">
        <label className="visually-hidden" htmlFor="note-search">
          Search notes
        </label>
        <span className="search-field">
          <span className="search-field__icon" aria-hidden="true">
            <IconSearch size={15} />
          </span>
          <input
            id="note-search"
            type="search"
            className="search-field__input"
            placeholder="Search notes"
            value={state.searchQuery}
            onChange={(event) =>
              dispatch({ type: 'set-search', query: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === 'Escape' && state.searchQuery.length > 0) {
                // Clear before the browser's own `search` reset, which the
                // layout does not rely on.
                event.preventDefault()
                clearSearch()
              }
            }}
          />
          {searchActive && (
            <button
              type="button"
              className="search-field__clear"
              onClick={() => dispatch({ type: 'set-search', query: '' })}
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </span>
      </div>

      <div className="pane__body">
        {notes.length > 0 && (
          <ul className="note-grid">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                notebooks={state.notebooks}
                active={note.id === state.activeNoteId}
                onSelect={(id) => dispatch({ type: 'select-note', id })}
              />
            ))}
          </ul>
        )}

        {noSearchResults && (
          <EmptyState
            icon={<IconSearch size={22} />}
            title="No notes match your search"
            description={`Nothing found for “${state.searchQuery.trim()}”${
              activeNotebook ? ` in ${activeNotebook.name}` : ''
            }.${
              // A dead end is only honest when nothing matches anywhere; when
              // the query does match elsewhere, say so and offer the way there.
              matchesElsewhere > 0
                ? ` ${matchesElsewhere} ${noteWord(matchesElsewhere)} match in other notebooks.`
                : ''
            }`}
            action={
              <div className="empty-state__actions">
                {matchesElsewhere > 0 && (
                  <button
                    type="button"
                    className="button"
                    onClick={searchAllNotebooks}
                  >
                    Search all notes
                  </button>
                )}
                <button
                  type="button"
                  className={matchesElsewhere > 0 ? 'button button--ghost' : 'button'}
                  onClick={clearSearch}
                >
                  Clear search
                </button>
              </div>
            }
          />
        )}

        {notes.length === 0 && !searchActive && !hasAnyNotes && (
          <EmptyState
            icon={<IconNotes size={22} />}
            title="No notes yet"
            description="Create your first note — it goes to Inbox unless you are viewing another notebook."
            action={
              <button type="button" className="button" onClick={addNote}>
                New note
              </button>
            }
          />
        )}

        {notes.length === 0 && !searchActive && hasAnyNotes && (
          <EmptyState
            title={`${heading} is empty`}
            description="No notes belong to this notebook yet."
            action={
              <button
                type="button"
                className="button"
                onClick={() => dispatch({ type: 'select-notebook', id: null })}
              >
                View all notes
              </button>
            }
          />
        )}
      </div>
    </div>
  )
}
