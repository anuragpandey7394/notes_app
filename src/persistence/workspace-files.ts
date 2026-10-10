/**
 * Reading and writing the workspace as a set of files in a directory.
 *
 * This layer is deliberately free of React and of permission handling: it takes
 * a directory handle and does the I/O. That keeps the rules that decide whether
 * user data is safe — when to create an Inbox, when to refuse to overwrite a
 * file we could not read — testable against an in-memory directory.
 */

import type { Note, Notebook } from '../types'
import {
  METADATA_FILE,
  NOTES_FILE,
  NOTEBOOKS_FILE,
  applyIntegrity,
  createFreshWorkspace,
  createMetadata,
  parseMetadataFile,
  parseNotebooksFile,
  parseNotesFile,
  serializeMetadata,
  serializeNotebooks,
  serializeNotes,
  type DirectoryMetadata,
} from './format'
import { ensureImagesDirectory, readTextFile, writeTextFile } from './fsa'

export type LoadKind =
  /** Files existed and were read, possibly after repairs. */
  | 'loaded'
  /** No data files existed: a new workspace, seeded with an Inbox. */
  | 'fresh'
  /** A data file existed but could not be read. Nothing has been overwritten. */
  | 'unreadable'

export interface LoadOutcome {
  kind: LoadKind
  notes: Note[]
  notebooks: Notebook[]
  metadata: DirectoryMetadata | null
  /** Human-readable notes about repairs that were applied while reading. */
  issues: string[]
  /** Set when `kind` is `'unreadable'`. */
  error: string | null
}

/**
 * Load the workspace from a directory.
 *
 * Never writes anything: a directory whose files cannot be parsed is reported
 * as `'unreadable'` and left untouched, so a bug here cannot destroy data.
 * Overwriting in that case requires an explicit user action.
 */
export async function loadWorkspace(
  directory: FileSystemDirectoryHandle,
): Promise<LoadOutcome> {
  const issues: string[] = []

  const notesText = await readTextFile(directory, NOTES_FILE)
  const notebooksText = await readTextFile(directory, NOTEBOOKS_FILE)
  const metadataText = await readTextFile(directory, METADATA_FILE)

  let metadata: DirectoryMetadata | null = null
  if (metadataText !== null) {
    metadata = parseMetadataFile(metadataText)
    if (!metadata) {
      issues.push(`${METADATA_FILE} could not be read and will be rewritten.`)
    }
  }

  // First run in an empty directory.
  if (notesText === null && notebooksText === null) {
    const fresh = createFreshWorkspace()
    return {
      kind: 'fresh',
      notes: fresh.notes,
      notebooks: fresh.notebooks,
      metadata,
      issues,
      error: null,
    }
  }

  let notes: Note[] = []
  if (notesText === null) {
    issues.push(`${NOTES_FILE} was missing, so no notes were loaded.`)
  } else {
    const parsed = parseNotesFile(notesText)
    if (!parsed.ok) {
      return {
        kind: 'unreadable',
        notes: [],
        notebooks: [],
        metadata,
        issues,
        error: parsed.error,
      }
    }
    notes = parsed.value
    issues.push(...parsed.issues)
  }

  let notebooks: Notebook[] = []
  if (notebooksText === null) {
    issues.push(`${NOTEBOOKS_FILE} was missing, so an Inbox was created.`)
  } else {
    const parsed = parseNotebooksFile(notebooksText)
    if (!parsed.ok) {
      return {
        kind: 'unreadable',
        notes: [],
        notebooks: [],
        metadata,
        issues,
        error: parsed.error,
      }
    }
    notebooks = parsed.value
    issues.push(...parsed.issues)
  }

  const repaired = applyIntegrity(notes, notebooks)
  issues.push(...repaired.issues)

  return {
    kind: 'loaded',
    notes: repaired.notes,
    notebooks: repaired.notebooks,
    metadata,
    issues,
    error: null,
  }
}

/**
 * Write the workspace back to the directory.
 *
 * `notes.json` and `notebooks.json` are written first and `.metadata.json` last,
 * so the metadata never describes a state that is not yet on disk.
 */
export async function saveWorkspace(
  directory: FileSystemDirectoryHandle,
  notes: readonly Note[],
  notebooks: readonly Notebook[],
  previousMetadata: DirectoryMetadata | null,
  now = Date.now(),
): Promise<DirectoryMetadata> {
  await ensureImagesDirectory(directory)
  await writeTextFile(directory, NOTES_FILE, serializeNotes(notes))
  await writeTextFile(directory, NOTEBOOKS_FILE, serializeNotebooks(notebooks))

  const metadata = createMetadata(notebooks, notes, previousMetadata, now)
  await writeTextFile(directory, METADATA_FILE, serializeMetadata(metadata))

  return metadata
}
