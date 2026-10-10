import { createContext, useContext } from 'react'

/**
 * Where the app currently stands with local file storage.
 *
 * - `unsupported`      this browser has no File System Access API
 * - `unconfigured`     supported, but the user has not chosen a folder yet
 * - `needs-permission` a folder was remembered but permission must be re-granted
 * - `connected`        reading and writing the chosen folder
 * - `blocked`          a data file exists but could not be read; nothing has
 *                      been overwritten and the user must decide what to do
 */
export type PersistenceMode =
  | 'unsupported'
  | 'unconfigured'
  | 'needs-permission'
  | 'connected'
  | 'blocked'

/** Status of the most recent write to disk. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface PersistenceContextValue {
  mode: PersistenceMode
  saveStatus: SaveStatus
  /** Name of the chosen folder, when one is connected. */
  directoryName: string | null
  /** Current human-readable status or error text, if any. */
  message: string | null
  /** Repairs that were applied the last time the folder was read. */
  issues: string[]
  /** True while a folder operation (choosing, loading, reconnecting) runs. */
  busy: boolean
  chooseDirectory: () => Promise<void>
  reconnect: () => Promise<void>
  /** Explicitly overwrite unreadable files with an empty workspace. */
  startFresh: () => Promise<void>
  exportAll: () => Promise<void>
}

export const PersistenceContext = createContext<PersistenceContextValue | null>(null)

export function usePersistence(): PersistenceContextValue {
  const value = useContext(PersistenceContext)
  if (!value) {
    throw new Error('usePersistence must be used inside a <PersistenceProvider>')
  }
  return value
}
