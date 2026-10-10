import type { AppState, Note, Notebook } from '../types'
import { plainTextFromContent } from './content'

/**
 * Does a note match the search query?
 *
 * Matches the title and the *readable text* of the body — extracted from the
 * Lexical tree rather than string-matched against the raw JSON, so structural
 * fields can never produce false hits (PROJECT_PLAN.md §7).
 */
export function noteMatchesQuery(note: Note, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return true
  if (note.title.toLowerCase().includes(needle)) return true
  return plainTextFromContent(note.content).toLowerCase().includes(needle)
}

/**
 * Pinned notes first, then most-recently-updated. This is the single ordering
 * rule used everywhere notes are listed (PROJECT_PLAN.md §7 asks for pinned
 * ordering to combine predictably with filtering).
 */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
}

/**
 * The notes the active notebook contains, before the search query is applied.
 *
 * Exposed because the list header reports "3 of 12 notes" while filtering, and
 * that denominator has to be the notebook's size rather than every note.
 */
export function selectNotesInScope(state: AppState): Note[] {
  const activeNotebookId = state.activeNotebookId
  if (!activeNotebookId) return state.notes

  return state.notes.filter((note) => note.notebookIds.includes(activeNotebookId))
}

/** Notes in the active notebook, filtered by the search query, then ordered. */
export function selectVisibleNotes(state: AppState): Note[] {
  return sortNotes(
    selectNotesInScope(state).filter((note) =>
      noteMatchesQuery(note, state.searchQuery),
    ),
  )
}

export function selectActiveNote(state: AppState): Note | null {
  if (!state.activeNoteId) return null
  return state.notes.find((note) => note.id === state.activeNoteId) ?? null
}

export function selectNotebook(
  state: AppState,
  notebookId: string,
): Notebook | undefined {
  return state.notebooks.find((notebook) => notebook.id === notebookId)
}

/** How many notes belong to a notebook (used for sidebar counts). */
export function countNotesInNotebook(state: AppState, notebookId: string): number {
  return state.notes.filter((note) => note.notebookIds.includes(notebookId)).length
}

/** True when a search is active and nothing in the current notebook matches. */
export function selectHasNoSearchResults(state: AppState): boolean {
  return (
    state.searchQuery.trim().length > 0 && selectVisibleNotes(state).length === 0
  )
}

/**
 * How many notes match the query but sit outside the notebook being viewed.
 *
 * Without this, "your search matched nothing" and "your search matched notes in
 * another notebook" look identical: the list is empty either way, and there is
 * no path to the notes that do match. The no-results state uses this to offer
 * searching all notes instead of only offering to give up.
 */
export function countMatchesOutsideCurrentNotebook(state: AppState): number {
  const activeNotebookId = state.activeNotebookId
  if (!activeNotebookId) return 0
  if (state.searchQuery.trim().length === 0) return 0

  return state.notes.filter(
    (note) =>
      !note.notebookIds.includes(activeNotebookId) &&
      noteMatchesQuery(note, state.searchQuery),
  ).length
}
