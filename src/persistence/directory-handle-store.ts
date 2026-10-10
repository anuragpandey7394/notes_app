/**
 * IndexedDB storage for the user's chosen data directory handle.
 *
 * A `FileSystemDirectoryHandle` can be structured-cloned into IndexedDB, which
 * is the only supported way to remember the choice across reloads. It is
 * deliberately **not** stored in `notes.json` or any other file in the data
 * directory (PROJECT_PLAN.md §5 and the data-model requirements).
 *
 * All operations fail soft: if IndexedDB is unavailable (private windows,
 * blocked storage, unsupported browsers) the app keeps working in memory and
 * simply cannot remember the directory.
 */

const DB_NAME = 'notes-app'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const DIRECTORY_KEY = 'data-directory'

export const HANDLE_STORAGE_UNAVAILABLE =
  'This browser did not allow local storage for the folder choice, so it cannot be remembered.'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open the local database.'))
    request.onblocked = () =>
      reject(new Error('The local database is blocked by another tab.'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const request = work(transaction.objectStore(STORE_NAME))

        transaction.oncomplete = () => {
          db.close()
          resolve(request.result)
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error ?? new Error('Local database transaction failed.'))
        }
        transaction.onabort = () => {
          db.close()
          reject(transaction.error ?? new Error('Local database transaction was aborted.'))
        }
      }),
  )
}

/**
 * Remember the chosen directory.
 *
 * Resolves `true` when the handle was stored and `false` when it could not be
 * (storage blocked, or a browser that cannot clone a handle into IndexedDB).
 * Failing to *remember* the folder must never stop the app from *using* it, so
 * this reports the problem instead of throwing — same contract as the reads
 * above.
 */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await runTransaction('readwrite', (store) => store.put(handle, DIRECTORY_KEY))
    return true
  } catch {
    return false
  }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const value = await runTransaction<unknown>('readonly', (store) =>
      store.get(DIRECTORY_KEY),
    )
    return isDirectoryHandle(value) ? value : null
  } catch {
    return null
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => store.delete(DIRECTORY_KEY))
  } catch {
    // Nothing to do: the handle could not be read back anyway.
  }
}

/**
 * Guard against a stored value that is not a directory handle — for example
 * data written by another version of the app, or a partially written record.
 */
function isDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as FileSystemHandle).kind === 'directory' &&
    typeof (value as FileSystemDirectoryHandle).getFileHandle === 'function'
  )
}
