import { describe, expect, it } from 'vitest'
import { createEmptyContent, contentFromPlainText, plainTextFromContent } from '../lib/content'
import { editorStateFromStored, isEditorState, serializeEditorState } from './serialization'

/** A document with a heading, with formatting, as Lexical would serialize it. */
const RICH_STATE = {
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text: 'Title', type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h1',
        type: 'heading',
        version: 1,
      },
      {
        children: [
          { detail: 0, format: 1, mode: 'normal', style: '', text: 'Bold', type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        textFormat: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

describe('isEditorState', () => {
  it('accepts a serialized editor state', () => {
    expect(isEditorState(RICH_STATE)).toBe(true)
    expect(isEditorState(JSON.parse(createEmptyContent()))).toBe(true)
  })

  it('rejects anything without a root children array', () => {
    expect(isEditorState(null)).toBe(false)
    expect(isEditorState('a string')).toBe(false)
    expect(isEditorState(42)).toBe(false)
    expect(isEditorState({})).toBe(false)
    expect(isEditorState({ root: {} })).toBe(false)
    expect(isEditorState({ root: { children: 'not an array' } })).toBe(false)
  })

  it('rejects a note-shaped object that happens to have a root', () => {
    // Guessing here would mount a broken composer, so only the real shape passes.
    expect(isEditorState({ root: { type: 'root' } })).toBe(false)
  })
})

describe('editorStateFromStored', () => {
  it('returns valid stored content unchanged', () => {
    const stored = serializeEditorState(RICH_STATE)

    expect(editorStateFromStored(stored)).toBe(stored)
  })

  it('falls back to an empty document for content that is not JSON', () => {
    expect(editorStateFromStored('not json at all')).toBe(createEmptyContent())
  })

  it('falls back for JSON that is not an editor state', () => {
    expect(editorStateFromStored('{"hello":"world"}')).toBe(createEmptyContent())
    expect(editorStateFromStored('[]')).toBe(createEmptyContent())
    expect(editorStateFromStored('"# Heading"')).toBe(createEmptyContent())
  })

  it('falls back for empty content', () => {
    expect(editorStateFromStored('')).toBe(createEmptyContent())
  })

  it('always returns something loadable, whatever it is given', () => {
    const inputs = ['', 'nope', '{}', 'null', createEmptyContent(), serializeEditorState(RICH_STATE)]

    for (const input of inputs) {
      expect(isEditorState(JSON.parse(editorStateFromStored(input)))).toBe(true)
    }
  })

  it('accepts content written by the plain-text importer', () => {
    const imported = contentFromPlainText('Imported line')

    expect(isEditorState(JSON.parse(editorStateFromStored(imported)))).toBe(true)
  })
})

describe('round trip through storage', () => {
  it('preserves text and formatting across a save and reload', () => {
    const saved = serializeEditorState(RICH_STATE)

    const reloaded = editorStateFromStored(saved)

    expect(reloaded).toBe(saved)
    expect(plainTextFromContent(reloaded).split('\n')).toEqual(['Title', 'Bold'])
    const reloadedState = JSON.parse(reloaded) as typeof RICH_STATE
    expect(reloadedState.root.children[0].tag).toBe('h1')
    expect(reloadedState.root.children[1].children[0].format).toBe(1)
  })

  it('survives a retry: serializing what was loaded changes nothing', () => {
    const saved = serializeEditorState(RICH_STATE)

    const again = serializeEditorState(JSON.parse(editorStateFromStored(saved)))

    expect(again).toBe(saved)
  })
})

describe('serializeEditorState', () => {
  it('produces the JSON string Note.content expects', () => {
    expect(serializeEditorState({ root: { children: [] } })).toBe('{"root":{"children":[]}}')
  })

  it('is the inverse of what the loader accepts', () => {
    const state = JSON.parse(createEmptyContent())

    expect(editorStateFromStored(serializeEditorState(state))).toBe(
      serializeEditorState(state),
    )
  })
})
