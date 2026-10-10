/**
 * Thin wrappers over the File System Access API.
 *
 * Everything that can throw is wrapped so callers receive a plain, readable
 * message instead of a raw `DOMException`. Nothing here assumes support — the
 * caller checks `isFileSystemAccessSupported()` first.
 */

import { IMAGES_DIR } from './format'

export type PermissionLevel = 'granted' | 'prompt' | 'denied' | 'unknown'

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
  )
}

/** Readable message for anything thrown by the file system layer. */
export function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'AbortError':
        return 'The folder selection was cancelled.'
      case 'NotAllowedError':
        return 'Permission to use that folder was denied.'
      case 'NotFoundError':
        return 'That folder or file no longer exists.'
      case 'NotReadableError':
        return 'The file could not be read. It may be in use by another program.'
      case 'InvalidStateError':
        return 'The folder is no longer available. Reselect it to continue.'
      case 'QuotaExceededError':
        return 'There is not enough space to write the file.'
      default:
        return error.message || 'An unexpected file system error occurred.'
    }
  }

  if (error instanceof Error) return error.message
  return 'An unexpected file system error occurred.'
}

/**
 * Ask the user to choose a directory.
 *
 * Must be called directly from a user gesture. Resolves with the handle, or
 * rejects — `describeError` turns a user cancellation into a readable message.
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('This browser cannot open folders directly.')
  }

  return window.showDirectoryPicker!({
    id: 'notes-app-data',
    mode: 'readwrite',
    startIn: 'documents',
  })
}

export async function queryPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionLevel> {
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'unknown'
  }
}

/**
 * Request permission for a handle restored from IndexedDB.
 *
 * Chrome requires a user gesture here, so this is only ever called from a
 * "Reconnect" button.
 */
export async function requestPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionLevel> {
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

/** Read a UTF-8 text file, or `null` when it does not exist. */
export async function readTextFile(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<string | null> {
  try {
    const handle = await directory.getFileHandle(name)
    const file = await handle.getFile()
    return await file.text()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null
    throw error
  }
}

/** Does an entry with this name exist in the directory? */
export async function hasEntry(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await directory.getFileHandle(name)
    return true
  } catch {
    try {
      await directory.getDirectoryHandle(name)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Write a UTF-8 text file.
 *
 * `createWritable()` is itself the safe write pattern: the browser writes to a
 * swap file and only replaces the original when the stream is closed
 * successfully, so a crash or a full disk leaves the previous contents intact.
 */
export async function writeTextFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  contents: string,
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(contents)
  } catch (error) {
    await writable.abort().catch(() => {})
    throw error
  }
  await writable.close()
}

/** Create `images/` if it is not already there. */
export async function ensureImagesDirectory(
  directory: FileSystemDirectoryHandle,
): Promise<void> {
  await directory.getDirectoryHandle(IMAGES_DIR, { create: true })
}
