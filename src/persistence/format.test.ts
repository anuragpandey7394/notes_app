import { describe, expect, it } from 'vitest'
import { createEmptyContent, contentFromPlainText, plainTextFromContent } from '../lib/content'
import type { Note, Notebook } from '../types'
import {
  INBOX_ID,
  MAX_VERSIONS_PER_NOTE,
  applyIntegrity,
  createFreshWorkspace,
  createMetadata,
  parseMetadataFile,
  parseNotebooksFile,
  parseNotesFile,
  serializeNotebooks,
  serializeNotes,
} from './format'

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

function envelope(key: string, value: unknown): string {
  return JSON.stringify({ schemaVersion: 1, [key]: value })
}

describe('notes file', () => {
  it('round-trips through serialize and parse', () => {
    const notes = [makeNote(), makeNote({ id: 'note_2', title: 'Second', pinned: true })]

    const result = parseNotesFile(serializeNotes(notes))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual(notes)
    expect(result.issues).toEqual([])
  })

  it('reports malformed JSON instead of throwing', () => {
    const result = parseNotesFile('{ this is not json')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('not valid JSON')
  })

  it('rejects a file with no notes array', () => {
    expect(parseNotesFile('{"schemaVersion":1}').ok).toBe(false)
    expect(parseNotesFile('"just a string"').ok).toBe(false)
  })

  it('drops records with no id rather than failing the whole file', () => {
    const text = envelope('notes', [
      { title: 'no id here' },
      { id: 'note_ok', title: 'Kept' },
    ])

    const result = parseNotesFile(text)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.map((n) => n.id)).toEqual(['note_ok'])
    expect(result.issues.join(' ')).toContain('no id')
  })

  it('keeps the first record when ids are duplicated', () => {
    const text = envelope('notes', [
      { id: 'dup', title: 'First' },
      { id: 'dup', title: 'Second' },
    ])

    const result = parseNotesFile(text)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(1)
    expect(result.value[0].title).toBe('First')
    expect(result.issues.join(' ')).toContain('duplicate note id')
  })

  it('replaces unparseable content with an empty document and says so implicitly', () => {
    const text = envelope('notes', [{ id: 'note_1', content: 'not json at all' }])

    const result = parseNotesFile(text)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value[0].content).toBe(createEmptyContent())
    expect(plainTextFromContent(result.value[0].content)).toBe('')
  })

  it('fills defaults for missing fields', () => {
    const result = parseNotesFile(envelope('notes', [{ id: 'bare' }]))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const note = result.value[0]
    expect(note.title).toBe('')
    expect(note.pinned).toBe(false)
    expect(note.versions).toEqual([])
    expect(note.notebookIds).toEqual([])
    expect(note.createdAt).toBeGreaterThan(0)
    expect(note.updatedAt).toBe(note.createdAt)
  })

  it('enforces the 50-version cap on load', () => {
    const versions = Array.from({ length: 60 }, (_, i) => ({
      id: `v${i}`,
      content: createEmptyContent(),
      timestamp: 1_700_000_000_000 + i,
    }))

    const result = parseNotesFile(envelope('notes', [{ id: 'note_1', versions }]))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const kept = result.value[0].versions
    expect(kept).toHaveLength(MAX_VERSIONS_PER_NOTE)
    // The newest versions are the ones retained.
    expect(kept[kept.length - 1].id).toBe('v59')
    expect(kept[0].id).toBe('v10')
  })

  it('drops versions that have no id', () => {
    const versions = [
      { content: createEmptyContent(), timestamp: 1 },
      { id: 'v_good', content: createEmptyContent(), timestamp: 2 },
    ]

    const result = parseNotesFile(envelope('notes', [{ id: 'note_1', versions }]))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value[0].versions.map((v) => v.id)).toEqual(['v_good'])
  })
})

describe('notebooks file', () => {
  it('round-trips through serialize and parse', () => {
    const notebooks = [
      makeNotebook(),
      makeNotebook({ id: 'nb_2', name: 'Ideas', color: 'sage' }),
    ]

    const result = parseNotebooksFile(serializeNotebooks(notebooks))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual(notebooks)
  })

  it('coerces an unknown color to a palette key', () => {
    const result = parseNotebooksFile(
      envelope('notebooks', [{ id: 'nb_1', name: 'X', color: '#ff00ff' }]),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value[0].color).toBe('amber')
  })

  it('reports malformed JSON', () => {
    expect(parseNotebooksFile('nope').ok).toBe(false)
  })
})

describe('applyIntegrity', () => {
  it('creates a missing Inbox', () => {
    const { notebooks, issues } = applyIntegrity([], [])

    expect(notebooks.map((nb) => nb.id)).toEqual([INBOX_ID])
    expect(notebooks[0].name).toBe('Inbox')
    expect(issues.join(' ')).toContain('Inbox')
  })

  it('does not duplicate an existing Inbox', () => {
    const { notebooks } = applyIntegrity([], [makeNotebook()])
    expect(notebooks).toHaveLength(1)
  })

  it('removes memberships pointing at missing notebooks', () => {
    const notes = [makeNote({ notebookIds: [INBOX_ID, 'nb_deleted'] })]

    const { notes: repaired, issues } = applyIntegrity(notes, [makeNotebook()])

    expect(repaired[0].notebookIds).toEqual([INBOX_ID])
    expect(issues.join(' ')).toContain('missing notebook')
  })

  it('moves a note with no notebooks left into the Inbox', () => {
    const notes = [makeNote({ notebookIds: ['nb_deleted'] })]

    const { notes: repaired, issues } = applyIntegrity(notes, [makeNotebook()])

    expect(repaired[0].notebookIds).toEqual([INBOX_ID])
    expect(issues.join(' ')).toContain('unassigned note')
  })

  it('leaves valid notes untouched, by identity', () => {
    const note = makeNote({ notebookIds: [INBOX_ID] })

    const { notes: repaired, issues } = applyIntegrity([note], [makeNotebook()])

    expect(issues).toEqual([])
    expect(repaired[0]).toBe(note)
  })

  it('never leaves a note outside every notebook', () => {
    const notes = [
      makeNote({ id: 'a', notebookIds: [] }),
      makeNote({ id: 'b', notebookIds: ['gone'] }),
      makeNote({ id: 'c', notebookIds: [INBOX_ID] }),
    ]

    const { notes: repaired, notebooks } = applyIntegrity(notes, [makeNotebook()])
    const known = new Set(notebooks.map((nb) => nb.id))

    for (const note of repaired) {
      expect(note.notebookIds.length).toBeGreaterThan(0)
      expect(note.notebookIds.every((id) => known.has(id))).toBe(true)
    }
  })
})

describe('metadata', () => {
  it('counts notes and notebooks and keeps the original createdAt', () => {
    const first = createMetadata([makeNotebook()], [makeNote()], null, 1000)
    const second = createMetadata([makeNotebook()], [], first, 2000)

    expect(first.createdAt).toBe(1000)
    expect(second.createdAt).toBe(1000)
    expect(second.updatedAt).toBe(2000)
    expect(second.noteCount).toBe(0)
    expect(second.notebookCount).toBe(1)
  })

  it('round-trips through JSON', () => {
    const metadata = createMetadata([makeNotebook()], [makeNote()], null, 1000)
    const parsed = parseMetadataFile(JSON.stringify(metadata))

    expect(parsed).toEqual(metadata)
  })

  it('returns null for unreadable metadata instead of throwing', () => {
    expect(parseMetadataFile('broken')).toBeNull()
    expect(parseMetadataFile('[1,2,3]')).toBeNull()
  })
})

describe('fresh workspace', () => {
  it('starts with an Inbox and no notes', () => {
    const { notes, notebooks } = createFreshWorkspace(500)

    expect(notes).toEqual([])
    expect(notebooks).toHaveLength(1)
    expect(notebooks[0].id).toBe(INBOX_ID)
    expect(notebooks[0].createdAt).toBe(500)
  })
})

describe('content extraction', () => {
  it('recovers readable text from a JSON representation, not the raw JSON', () => {
    const content = contentFromPlainText('First line\nSecond line')

    const text = plainTextFromContent(content)

    expect(text).toBe('First line\nSecond line')
    expect(text).not.toContain('"root"')
    expect(text).not.toContain('textFormat')
  })

  it('never surfaces structural field values as matches', () => {
    const content = contentFromPlainText('Hello')

    expect(plainTextFromContent(content).toLowerCase()).not.toContain('paragraph')
    expect(plainTextFromContent(content).toLowerCase()).not.toContain('ltr')
  })

  it('returns an empty string for malformed or missing content', () => {
    expect(plainTextFromContent('')).toBe('')
    expect(plainTextFromContent('not json')).toBe('')
    expect(plainTextFromContent('{}')).toBe('')
  })
})
