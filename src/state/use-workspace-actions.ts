import { useCallback, useMemo } from 'react'
import { createId } from '../lib/id'
import { createNote, createNotebook } from '../lib/notes'
import type { NotebookColorKey } from '../types'
import { useWorkspace } from './workspace-context'

/**
 * Note and notebook operations, with id/timestamp generation kept out of the
 * reducer so the reducer stays pure.
 *
 * Every action is available from anywhere in the tree, which is why the "New
 * note" control can live in both the list header and the empty state without
 * duplicating the rule about which notebook a new note lands in.
 */
export function useWorkspaceActions() {
  const { state, dispatch } = useWorkspace()

  const activeNotebookId = state.activeNotebookId

  const addNote = useCallback(() => {
    const note = createNote({
      id: createId('note'),
      // A new note lands in the notebook being viewed, otherwise in Inbox.
      notebookId: activeNotebookId,
      now: Date.now(),
    })
    dispatch({ type: 'create-note', note })
    return note.id
  }, [activeNotebookId, dispatch])

  const renameNote = useCallback(
    (id: string, title: string) => {
      dispatch({ type: 'rename-note', id, title, now: Date.now() })
    },
    [dispatch],
  )

  const deleteNote = useCallback(
    (id: string) => {
      dispatch({ type: 'delete-note', id })
    },
    [dispatch],
  )

  const togglePin = useCallback(
    (id: string) => {
      dispatch({ type: 'toggle-pin', id })
    },
    [dispatch],
  )

  const setNoteNotebooks = useCallback(
    (id: string, notebookIds: string[]) => {
      dispatch({ type: 'set-note-notebooks', id, notebookIds, now: Date.now() })
    },
    [dispatch],
  )

  const setNoteContent = useCallback(
    (id: string, content: string) => {
      dispatch({ type: 'set-note-content', id, content, now: Date.now() })
    },
    [dispatch],
  )

  const addNotebook = useCallback(
    (name: string, color: NotebookColorKey) => {
      const notebook = createNotebook(
        createId('nb'),
        name.trim(),
        color,
        Date.now(),
      )
      dispatch({ type: 'create-notebook', notebook })
      return notebook.id
    },
    [dispatch],
  )

  const renameNotebook = useCallback(
    (id: string, name: string) => {
      dispatch({ type: 'rename-notebook', id, name: name.trim() })
    },
    [dispatch],
  )

  const setNotebookColor = useCallback(
    (id: string, color: NotebookColorKey) => {
      dispatch({ type: 'set-notebook-color', id, color })
    },
    [dispatch],
  )

  const deleteNotebook = useCallback(
    (id: string) => {
      dispatch({ type: 'delete-notebook', id })
    },
    [dispatch],
  )

  return useMemo(
    () => ({
      addNote,
      renameNote,
      deleteNote,
      togglePin,
      setNoteNotebooks,
      setNoteContent,
      addNotebook,
      renameNotebook,
      setNotebookColor,
      deleteNotebook,
    }),
    [
      addNote,
      renameNote,
      deleteNote,
      togglePin,
      setNoteNotebooks,
      setNoteContent,
      addNotebook,
      renameNotebook,
      setNotebookColor,
      deleteNotebook,
    ],
  )
}
