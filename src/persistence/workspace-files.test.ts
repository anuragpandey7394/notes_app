import { describe, expect, it } from 'vitest'
import { createEmptyContent } from '../lib/content'
import type { Note, Notebook } from '../types'
import {
  IMAGES_DIR,
  INBOX_ID,
  METADATA_FILE,
  NOTES_FILE,
  NOTEBOOKS_FILE,
  parseMetadataFile,
} from './format'
import { loadWorkspace, saveWorkspace } from './workspace-files'

/**
 * Minimal in-memory stand-in for a `FileSystemDirectoryHandle`, sufficient for
 * the read/write behaviour these tests exercise.
 */
function createFakeDirectory(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial))
  const directories = new Set<string>()

  function fileHandle(name: string) {
    return {
      kind: 'file' as const,
      name,
      async getFile() {
        return { text: async () => files.get(name) ?? '' }
      },
      async createWritable() {
        let buffer = ''
        let aborted = false
        return {
          async write(data: string) {
            buffer += data
          },
          async abort() {
            aborted = true
          },
          async close() {
            // Mirrors the real API: nothing is committed unless close succeeds.
            if (!aborted) files.set(name, buffer)
          },
        }
      },
    }
  }

  const directoryHandle = {
    kind: 'directory' as const,
    name: 'fake-directory',
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('missing', 'NotFoundError')
        files.set(name, '')
      }
      return fileHandle(name)
    },
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      if (!directories.has(name) && !options?.create) {
        throw new DOMException('missing', 'NotFoundError')
      }
      directories.add(name)
      return { kind: 'directory' as const, name }
    },
  }

  return {
    handle: directoryHandle as unknown as FileSystemDirectoryHandle,
    files,
    directories,
  }
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note_1',
    title: 'Title',
    content: createEmptyContent(),
    versions: [],
    notebookIds: [INBOX_ID],
    pinned: false,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  }
}

function makeNotebook(overrides: Partial<Notebook> = {}): Notebook {
  return {
    id: INBOX_ID,
    name: 'Inbox',
    color: 'amber',
    createdAt: 1_700_000_000_000,
    ...overrides,
  }
}

describe('loadWorkspace', () => {
  it('treats an empty directory as a fresh start with an Inbox', async () => {
    const { handle } = createFakeDirectory()

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('fresh')
    expect(outcome.notes).toEqual([])
    expect(outcome.notebooks.map((nb) => nb.id)).toEqual([INBOX_ID])
    expect(outcome.error).toBeNull()
  })

  it('does not write anything into an empty directory', async () => {
    const { handle, files } = createFakeDirectory()

    await loadWorkspace(handle)

    expect(files.size).toBe(0)
  })

  it('reports a malformed notes file without overwriting it', async () => {
    const original = '{ this is not valid json'
    const { handle, files } = createFakeDirectory({ [NOTES_FILE]: original })

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('unreadable')
    expect(outcome.error).toContain('not valid JSON')
    // The unreadable file must be left exactly as it was.
    expect(files.get(NOTES_FILE)).toBe(original)
  })

  it('reports a malformed notebooks file without overwriting it', async () => {
    const original = 'nope'
    const { handle, files } = createFakeDirectory({
      [NOTES_FILE]: JSON.stringify({ schemaVersion: 1, notes: [] }),
      [NOTEBOOKS_FILE]: original,
    })

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('unreadable')
    expect(files.get(NOTEBOOKS_FILE)).toBe(original)
  })

  it('creates an Inbox when only notes.json exists', async () => {
    const { handle } = createFakeDirectory({
      [NOTES_FILE]: JSON.stringify({
        schemaVersion: 1,
        notes: [makeNote({ notebookIds: [] })],
      }),
    })

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('loaded')
    expect(outcome.notebooks.map((nb) => nb.id)).toEqual([INBOX_ID])
    expect(outcome.notes[0].notebookIds).toEqual([INBOX_ID])
    expect(outcome.issues.join(' ')).toContain(NOTEBOOKS_FILE)
  })

  it('repairs membership pointing at a notebook that no longer exists', async () => {
    const { handle } = createFakeDirectory({
      [NOTES_FILE]: JSON.stringify({
        schemaVersion: 1,
        notes: [makeNote({ notebookIds: ['nb_gone'] })],
      }),
      [NOTEBOOKS_FILE]: JSON.stringify({ schemaVersion: 1, notebooks: [] }),
    })

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('loaded')
    expect(outcome.notes[0].notebookIds).toEqual([INBOX_ID])
  })

  it('starts with no notes when notes.json is missing but notebooks.json is not', async () => {
    const { handle } = createFakeDirectory({
      [NOTEBOOKS_FILE]: JSON.stringify({
        schemaVersion: 1,
        notebooks: [makeNotebook()],
      }),
    })

    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('loaded')
    expect(outcome.notes).toEqual([])
    expect(outcome.issues.join(' ')).toContain(NOTES_FILE)
  })
})

describe('saveWorkspace', () => {
  it('writes the three data files and creates the images directory', async () => {
    const { handle, files, directories } = createFakeDirectory()

    await saveWorkspace(handle, [makeNote()], [makeNotebook()], null, 1000)

    expect([...files.keys()].sort()).toEqual(
      [METADATA_FILE, NOTEBOOKS_FILE, NOTES_FILE].sort(),
    )
    expect(directories.has(IMAGES_DIR)).toBe(true)
  })

  it('records accurate counts and timestamps in .metadata.json', async () => {
    const { handle, files } = createFakeDirectory()

    await saveWorkspace(
      handle,
      [makeNote(), makeNote({ id: 'note_2' })],
      [makeNotebook()],
      null,
      1234,
    )

    const metadata = parseMetadataFile(files.get(METADATA_FILE) ?? '')

    expect(metadata).not.toBeNull()
    expect(metadata?.noteCount).toBe(2)
    expect(metadata?.notebookCount).toBe(1)
    expect(metadata?.createdAt).toBe(1234)
  })

  it('preserves the original createdAt across subsequent saves', async () => {
    const { handle, files } = createFakeDirectory()

    const first = await saveWorkspace(handle, [], [makeNotebook()], null, 1000)
    await saveWorkspace(handle, [makeNote()], [makeNotebook()], first, 2000)

    const metadata = parseMetadataFile(files.get(METADATA_FILE) ?? '')

    expect(metadata?.createdAt).toBe(1000)
    expect(metadata?.updatedAt).toBe(2000)
  })

  it('round-trips through loadWorkspace', async () => {
    const { handle } = createFakeDirectory()
    const notes = [
      makeNote({ title: 'First', pinned: true }),
      makeNote({
        id: 'note_2',
        title: 'Second',
        notebookIds: [INBOX_ID, 'nb_ideas'],
        versions: [
          { id: 'v1', content: createEmptyContent(), timestamp: 1_700_000_000_001 },
        ],
      }),
    ]
    const notebooks = [makeNotebook(), makeNotebook({ id: 'nb_ideas', name: 'Ideas' })]

    await saveWorkspace(handle, notes, notebooks, null, 1000)
    const outcome = await loadWorkspace(handle)

    expect(outcome.kind).toBe('loaded')
    expect(outcome.notes).toEqual(notes)
    expect(outcome.notebooks).toEqual(notebooks)
    expect(outcome.issues).toEqual([])
  })

  it('does not rewrite the notes file when the writable stream aborts', async () => {
    const { handle, files } = createFakeDirectory()
    await saveWorkspace(handle, [makeNote({ title: 'Original' })], [makeNotebook()], null, 1)
    const before = files.get(NOTES_FILE)

    // Simulate the browser refusing the commit part-way through a later save.
    const failing = {
      ...handle,
      async getFileHandle() {
        return {
          kind: 'file' as const,
          name: NOTES_FILE,
          async getFile() {
            return { text: async () => files.get(NOTES_FILE) ?? '' }
          },
          async createWritable() {
            return {
              async write() {},
              async abort() {},
              async close() {
                throw new DOMException('disk full', 'QuotaExceededError')
              },
            }
          },
        }
      },
    } as unknown as FileSystemDirectoryHandle

    await expect(
      saveWorkspace(failing, [makeNote({ title: 'Changed' })], [makeNotebook()], null, 2),
    ).rejects.toThrow()

    expect(files.get(NOTES_FILE)).toBe(before)
  })
})
