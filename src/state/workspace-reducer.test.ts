import { describe, expect, it } from 'vitest'
import { createNote, createNotebook, normalizeMembership } from '../lib/notes'
import { sortNotes } from '../lib/selectors'
import { applyIntegrity, INBOX_ID } from '../persistence/format'
import type { AppState, Note, Notebook } from '../types'
import { createInitialState, workspaceReducer, type WorkspaceAction } from './workspace-reducer'

const T0 = 1_700_000_000_000

function note(id: string, overrides: Partial<Note> = {}): Note {
  return {
    id,
    title: id,
    content: '{"root":{"children":[]}}',
    versions: [],
    notebookIds: [INBOX_ID],
    pinned: false,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

function notebook(id: string, name = id): Notebook {
  return { id, name, color: 'sage', createdAt: T0 }
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    notebooks: [notebook(INBOX_ID, 'Inbox'), notebook('nb_travel', 'Travel')],
    notes: [],
    ...overrides,
  }
}

function run(start: AppState, ...actions: WorkspaceAction[]): AppState {
  return actions.reduce(workspaceReducer, start)
}

/**
 * The rule the whole phase rests on: after any operation, the in-memory
 * workspace must already satisfy the same integrity rules that are applied when
 * a directory is read. If it does not, notes would silently change shape on the
 * next reload.
 */
function expectIntegrityHolds(next: AppState) {
  const { issues } = applyIntegrity(next.notes, next.notebooks)
  expect(issues).toEqual([])
}

describe('create-note', () => {
  it('inserts, selects, and switches to the editor', () => {
    const next = run(
      state(),
      { type: 'create-note', note: createNote({ id: 'note_1', now: T0 }) },
    )

    expect(next.notes.map((n) => n.id)).toEqual(['note_1'])
    expect(next.activeNoteId).toBe('note_1')
    expect(next.mobilePane).toBe('editor')
    expect(next.notes[0].notebookIds).toEqual([INBOX_ID])
    expectIntegrityHolds(next)
  })

  it('files the note in the notebook being viewed', () => {
    const next = run(
      state({ activeNotebookId: 'nb_travel' }),
      {
        type: 'create-note',
        note: createNote({ id: 'note_1', notebookId: 'nb_travel', now: T0 }),
      },
    )
    expect(next.notes[0].notebookIds).toEqual(['nb_travel'])
    expectIntegrityHolds(next)
  })

  it('clears an active search so the new note is visible', () => {
    const next = run(
      state({ searchQuery: 'nothing matches this' }),
      { type: 'create-note', note: createNote({ id: 'note_1', now: T0 }) },
    )
    expect(next.searchQuery).toBe('')
  })
})

describe('delete-note', () => {
  it('selects the note that took its place, not the top of the list', () => {
    // Sorted newest-first: c, b, a. Deleting the middle one should land on `a`.
    const start = state({
      notes: [
        note('note_a', { updatedAt: T0 + 1 }),
        note('note_b', { updatedAt: T0 + 2 }),
        note('note_c', { updatedAt: T0 + 3 }),
      ],
      activeNoteId: 'note_b',
    })

    const next = run(start, { type: 'delete-note', id: 'note_b' })
    // Storage order is preserved; display order comes from `sortNotes`.
    expect(next.notes.map((n) => n.id)).toEqual(['note_a', 'note_c'])
    expect(sortNotes(next.notes).map((n) => n.id)).toEqual(['note_c', 'note_a'])
    expect(next.activeNoteId).toBe('note_a')
  })

  it('clears the selection when the last note is deleted', () => {
    const start = state({ notes: [note('note_a')], activeNoteId: 'note_a' })
    const next = run(start, { type: 'delete-note', id: 'note_a' })

    expect(next.notes).toEqual([])
    expect(next.activeNoteId).toBeNull()
    expect(next.mobilePane).toBe('list')
  })

  it('keeps the selection when a different note is deleted', () => {
    const start = state({
      notes: [note('note_a'), note('note_b')],
      activeNoteId: 'note_a',
      mobilePane: 'editor',
    })
    const next = run(start, { type: 'delete-note', id: 'note_b' })

    expect(next.activeNoteId).toBe('note_a')
    expect(next.mobilePane).toBe('editor')
  })
})

describe('pin and rename', () => {
  it('toggles pin without touching updatedAt', () => {
    const start = state({ notes: [note('note_a')] })

    const pinned = run(start, { type: 'toggle-pin', id: 'note_a' })
    expect(pinned.notes[0].pinned).toBe(true)
    expect(pinned.notes[0].updatedAt).toBe(T0)

    const unpinned = run(pinned, { type: 'toggle-pin', id: 'note_a' })
    expect(unpinned.notes[0].pinned).toBe(false)
  })

  it('records the edit time when the title changes', () => {
    const start = state({ notes: [note('note_a')] })
    const next = run(start, {
      type: 'rename-note',
      id: 'note_a',
      title: 'Groceries',
      now: T0 + 500,
    })

    expect(next.notes[0].title).toBe('Groceries')
    expect(next.notes[0].updatedAt).toBe(T0 + 500)
  })
})

describe('note membership', () => {
  it('adds and removes notebooks', () => {
    const start = state({ notes: [note('note_a')] })

    const added = run(start, {
      type: 'set-note-notebooks',
      id: 'note_a',
      notebookIds: [INBOX_ID, 'nb_travel'],
      now: T0 + 1,
    })
    expect(added.notes[0].notebookIds).toEqual([INBOX_ID, 'nb_travel'])

    const removed = run(added, {
      type: 'set-note-notebooks',
      id: 'note_a',
      notebookIds: ['nb_travel'],
      now: T0 + 2,
    })
    expect(removed.notes[0].notebookIds).toEqual(['nb_travel'])
  })

  it('falls back to Inbox rather than leaving a note unfiled', () => {
    const start = state({ notes: [note('note_a', { notebookIds: ['nb_travel'] })] })
    const next = run(start, {
      type: 'set-note-notebooks',
      id: 'note_a',
      notebookIds: [],
      now: T0 + 1,
    })

    expect(next.notes[0].notebookIds).toEqual([INBOX_ID])
    expectIntegrityHolds(next)
  })

  it('drops memberships pointing at notebooks that do not exist', () => {
    const start = state({ notes: [note('note_a')] })
    const next = run(start, {
      type: 'set-note-notebooks',
      id: 'note_a',
      notebookIds: ['nb_ghost', 'nb_travel'],
      now: T0 + 1,
    })

    expect(next.notes[0].notebookIds).toEqual(['nb_travel'])
    expectIntegrityHolds(next)
  })

  it('de-duplicates repeated ids', () => {
    const start = state({ notes: [note('note_a')] })
    const next = run(start, {
      type: 'set-note-notebooks',
      id: 'note_a',
      notebookIds: ['nb_travel', 'nb_travel', INBOX_ID],
      now: T0 + 1,
    })
    expect(next.notes[0].notebookIds).toEqual(['nb_travel', INBOX_ID])
  })
})

describe('notebooks', () => {
  it('creates and selects a notebook', () => {
    const next = run(state(), {
      type: 'create-notebook',
      notebook: createNotebook('nb_ideas', 'Ideas', 'lilac', T0),
    })

    expect(next.notebooks.map((nb) => nb.name)).toEqual(['Inbox', 'Travel', 'Ideas'])
    expect(next.activeNotebookId).toBe('nb_ideas')
  })

  it('renames and recolors without disturbing notes', () => {
    const start = state({ notes: [note('note_a', { notebookIds: ['nb_travel'] })] })
    const next = run(
      start,
      { type: 'rename-notebook', id: 'nb_travel', name: 'Trips' },
      { type: 'set-notebook-color', id: 'nb_travel', color: 'sky' },
    )

    expect(next.notebooks[1]).toMatchObject({ name: 'Trips', color: 'sky' })
    expect(next.notes[0].notebookIds).toEqual(['nb_travel'])
  })

  it('moves notes that were only in the deleted notebook into Inbox', () => {
    const start = state({
      notes: [
        note('note_only_travel', { notebookIds: ['nb_travel'] }),
        note('note_shared', { notebookIds: [INBOX_ID, 'nb_travel'] }),
      ],
    })

    const next = run(start, { type: 'delete-notebook', id: 'nb_travel' })

    expect(next.notebooks.map((nb) => nb.id)).toEqual([INBOX_ID])
    expect(next.notes[0].notebookIds).toEqual([INBOX_ID])
    expect(next.notes[1].notebookIds).toEqual([INBOX_ID])
    expectIntegrityHolds(next)
  })

  it('returns the view to All notes when the viewed notebook is deleted', () => {
    const next = run(
      state({ activeNotebookId: 'nb_travel' }),
      { type: 'delete-notebook', id: 'nb_travel' },
    )
    expect(next.activeNotebookId).toBeNull()
  })

  it('refuses to delete Inbox', () => {
    const start = state()
    const next = run(start, { type: 'delete-notebook', id: INBOX_ID })
    expect(next).toBe(start)
  })
})

describe('normalizeMembership', () => {
  it('keeps known ids, drops unknown ones, and never returns an empty list', () => {
    expect(normalizeMembership(['a', 'b'], ['a', 'b'])).toEqual(['a', 'b'])
    expect(normalizeMembership(['a', 'ghost'], ['a'])).toEqual(['a'])
    expect(normalizeMembership([], ['a'])).toEqual([INBOX_ID])
    expect(normalizeMembership(['ghost'], ['a'])).toEqual([INBOX_ID])
  })
})

describe('integrity invariant across a session of edits', () => {
  it('leaves a workspace that a reload would not need to repair', () => {
    let current = state()

    const actions: WorkspaceAction[] = [
      { type: 'create-notebook', notebook: createNotebook('nb_ideas', 'Ideas', 'lilac', T0) },
      { type: 'create-note', note: createNote({ id: 'note_1', now: T0 }) },
      {
        type: 'set-note-notebooks',
        id: 'note_1',
        notebookIds: ['nb_ideas'],
        now: T0 + 1,
      },
      { type: 'create-note', note: createNote({ id: 'note_2', notebookId: 'nb_travel', now: T0 + 2 }) },
      { type: 'toggle-pin', id: 'note_1' },
      { type: 'delete-notebook', id: 'nb_ideas' },
      { type: 'rename-note', id: 'note_2', title: 'Lisbon', now: T0 + 3 },
      { type: 'delete-note', id: 'note_2' },
    ]

    for (const action of actions) {
      current = workspaceReducer(current, action)
      expectIntegrityHolds(current)
      // Every membership must point at a notebook that exists.
      const known = new Set(current.notebooks.map((nb) => nb.id))
      for (const n of current.notes) {
        expect(n.notebookIds.length).toBeGreaterThan(0)
        expect(n.notebookIds.every((id) => known.has(id))).toBe(true)
      }
    }

    expect(current.notes.map((n) => n.id)).toEqual(['note_1'])
    expect(current.notes[0].notebookIds).toEqual([INBOX_ID])
  })
})
