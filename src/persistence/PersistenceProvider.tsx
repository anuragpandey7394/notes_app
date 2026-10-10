import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buildExportBundle, downloadExport } from '../lib/export'
import { useWorkspace } from '../state/workspace-context'
import type { Note, Notebook } from '../types'
import {
  HANDLE_STORAGE_UNAVAILABLE,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from './directory-handle-store'
import type { DirectoryMetadata } from './format'
import { createFreshWorkspace } from './format'
import {
  describeError,
  isFileSystemAccessSupported,
  pickDirectory,
  queryPermission,
  requestPermission,
} from './fsa'
import {
  PersistenceContext,
  type PersistenceContextValue,
  type PersistenceMode,
  type SaveStatus,
} from './persistence-context'
import { loadWorkspace, saveWorkspace } from './workspace-files'

/**
 * How long edits settle before being written.
 *
 * PROJECT_PLAN.md §3 asks for autosave roughly one second after typing stops.
 * The title field already dispatches per keystroke, so the debounce is applied
 * here rather than in the editor.
 */
const SAVE_DEBOUNCE_MS = 1000

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useWorkspace()

  const [mode, setMode] = useState<PersistenceMode>(() =>
    isFileSystemAccessSupported() ? 'unconfigured' : 'unsupported',
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [directoryName, setDirectoryName] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const metadataRef = useRef<DirectoryMetadata | null>(null)

  // Latest workspace data, readable from async callbacks without re-creating
  // them on every keystroke.
  const notesRef = useRef<Note[]>(state.notes)
  const notebooksRef = useRef<Notebook[]>(state.notebooks)

  // The exact arrays that are known to be on disk. Skipping a save when the
  // references are unchanged avoids rewriting files right after a load, and
  // avoids pointless writes when unrelated state (search, selection) changes.
  const savedRef = useRef<{ notes: Note[]; notebooks: Notebook[] } | null>(null)

  useEffect(() => {
    notesRef.current = state.notes
    notebooksRef.current = state.notebooks
  }, [state.notes, state.notebooks])

  /** Adopt a workspace that has been read from disk. */
  const adoptWorkspace = useCallback(
    (notes: Note[], notebooks: Notebook[]) => {
      dispatch({ type: 'hydrate', notes, notebooks })
      savedRef.current = { notes, notebooks }
      setSaveStatus('idle')
    },
    [dispatch],
  )

  const connectTo = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const outcome = await loadWorkspace(handle)

      if (outcome.kind === 'unreadable') {
        // Nothing has been written. Keep the handle so the user can retry or
        // explicitly start fresh.
        handleRef.current = handle
        metadataRef.current = outcome.metadata
        setDirectoryName(handle.name)
        setIssues(outcome.issues)
        setMessage(outcome.error)
        setMode('blocked')
        return
      }

      handleRef.current = handle
      metadataRef.current = outcome.metadata
      setDirectoryName(handle.name)
      setIssues(outcome.issues)
      setMessage(null)
      adoptWorkspace(outcome.notes, outcome.notebooks)
      setMode('connected')

      // A brand-new folder has no files yet: write the initial structure so the
      // user can see exactly what the app stores.
      if (outcome.kind === 'fresh') {
        try {
          metadataRef.current = await saveWorkspace(
            handle,
            outcome.notes,
            outcome.notebooks,
            outcome.metadata,
          )
          setSaveStatus('saved')
        } catch (error) {
          setSaveStatus('error')
          setMessage(describeError(error))
        }
      }
    },
    [adoptWorkspace],
  )

  const chooseDirectory = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      setMessage('This browser cannot open folders directly.')
      return
    }

    setBusy(true)
    try {
      const handle = await pickDirectory()
      // A folder that cannot be remembered is still usable for this session;
      // say so rather than failing the connection.
      const remembered = await saveDirectoryHandle(handle)
      await connectTo(handle)
      if (!remembered) {
        setIssues((current) => [...current, HANDLE_STORAGE_UNAVAILABLE])
      }
    } catch (error) {
      setMessage(describeError(error))
      setSaveStatus('error')
    } finally {
      setBusy(false)
    }
  }, [connectTo])

  const reconnect = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) {
      await chooseDirectory()
      return
    }

    setBusy(true)
    try {
      // Must run inside this click handler: browsers require a user gesture.
      const permission = await requestPermission(handle)
      if (permission !== 'granted') {
        setMessage('Permission was not granted, so the folder is still disconnected.')
        return
      }
      setMessage(null)
      await connectTo(handle)
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setBusy(false)
    }
  }, [chooseDirectory, connectTo])

  const startFresh = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return

    setBusy(true)
    try {
      const { notes, notebooks } = createFreshWorkspace()
      metadataRef.current = await saveWorkspace(
        handle,
        notes,
        notebooks,
        metadataRef.current,
      )
      adoptWorkspace(notes, notebooks)
      setIssues([])
      setMessage(null)
      setSaveStatus('saved')
      setMode('connected')
    } catch (error) {
      setMessage(describeError(error))
      setSaveStatus('error')
    } finally {
      setBusy(false)
    }
  }, [adoptWorkspace])

  const exportAll = useCallback(async () => {
    const bundle = buildExportBundle(
      notesRef.current,
      notebooksRef.current,
      Date.now(),
    )
    downloadExport(bundle)
    const notice = 'Export downloaded. Check your browser downloads.'
    setMessage(notice)
    // Transient: don't leave a stale confirmation sitting in the sidebar.
    window.setTimeout(
      () => setMessage((current) => (current === notice ? null : current)),
      5000,
    )
  }, [])

  // Restore a remembered folder on first load. Reading permission is queried
  // without prompting; if it is not already granted the user must reconnect,
  // because browsers only grant it from a user gesture.
  useEffect(() => {
    if (!isFileSystemAccessSupported()) return
    let cancelled = false

    void (async () => {
      const handle = await loadDirectoryHandle()
      if (cancelled || !handle) return

      handleRef.current = handle
      setDirectoryName(handle.name)

      const permission = await queryPermission(handle)
      if (cancelled) return

      if (permission === 'granted') {
        setBusy(true)
        try {
          await connectTo(handle)
        } catch (error) {
          setMessage(describeError(error))
        } finally {
          if (!cancelled) setBusy(false)
        }
        return
      }

      setMode('needs-permission')
      setMessage(
        permission === 'denied'
          ? `Permission to use “${handle.name}” is blocked. Allow access in your browser settings, or choose the folder again.`
          : `Reconnect to “${handle.name}” to load your notes.`,
      )
    })()

    return () => {
      cancelled = true
    }
  }, [connectTo])

  // Debounced autosave whenever note or notebook data actually changes.
  useEffect(() => {
    if (mode !== 'connected') return

    const saved = savedRef.current
    if (
      saved &&
      saved.notes === state.notes &&
      saved.notebooks === state.notebooks
    ) {
      return
    }

    // Say "saving" as soon as there is something to write, not when the write
    // starts: otherwise the indicator still reads "Saved" throughout the
    // debounce window even though the latest keystroke is not on disk yet.
    setSaveStatus('saving')

    const timer = window.setTimeout(() => {
      const handle = handleRef.current
      if (!handle) return

      void (async () => {
        try {
          metadataRef.current = await saveWorkspace(
            handle,
            notesRef.current,
            notebooksRef.current,
            metadataRef.current,
          )
          savedRef.current = {
            notes: notesRef.current,
            notebooks: notebooksRef.current,
          }
          setSaveStatus('saved')
          setMessage(null)
        } catch (error) {
          // The previous contents are still on disk; say so rather than
          // pretending the write landed.
          setSaveStatus('error')
          setMessage(`Could not save: ${describeError(error)}`)
        }
      })()
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [state.notes, state.notebooks, mode])

  const value = useMemo<PersistenceContextValue>(
    () => ({
      mode,
      saveStatus,
      directoryName,
      message,
      issues,
      busy,
      chooseDirectory,
      reconnect,
      startFresh,
      exportAll,
    }),
    [
      mode,
      saveStatus,
      directoryName,
      message,
      issues,
      busy,
      chooseDirectory,
      reconnect,
      startFresh,
      exportAll,
    ],
  )

  return (
    <PersistenceContext.Provider value={value}>
      {children}
    </PersistenceContext.Provider>
  )
}
