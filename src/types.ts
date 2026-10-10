/**
 * Core data model for the notes app.
 *
 * Kept deliberately close to the models in PROJECT_PLAN.md. Two deliberate
 * adaptations are documented inline below (`Note.content` and `Notebook.color`).
 */

/**
 * A single point-in-time snapshot of a note.
 *
 * `content` uses the same serialized representation as {@link Note.content}.
 */
export interface NoteVersion {
  id: string
  content: string
  timestamp: number
  author?: string
}

/**
 * A note.
 *
 * ## Serialized format of `content`
 *
 * `content` is a **JSON string** containing a serialized **Lexical editor
 * state**, produced by `JSON.stringify(editorState.toJSON())`. Its parsed shape
 * is `{ root: SerializedLexicalNode }`.
 *
 * This is the one and only representation used for rich-text content across the
 * app (note bodies, version snapshots, `notes.json`, and export). HTML is never
 * stored or mixed in — see PROJECT_PLAN.md §3 "Use one consistent, documented,
 * serializable representation for editor content."
 *
 * The empty document is produced by `createEmptyContent()` and plain paragraphs
 * by `contentFromPlainText()` in `src/lib/content.ts`. Readable text is
 * extracted with `plainTextFromContent()` rather than by string-matching the
 * raw JSON.
 */
export interface Note {
  id: string
  title: string
  content: string
  versions: NoteVersion[]
  notebookIds: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

/**
 * A notebook.
 *
 * ## Adaptation: `color` holds a palette key, not a raw value
 *
 * PROJECT_PLAN.md §4 requires notebook colors from "a restrained, consistent
 * palette". `color` therefore stores a {@link NotebookColorKey} such as
 * `"amber"` — **not** a hex value. The key resolves to theme-appropriate CSS
 * custom properties, so notebook colors stay consistent and remain legible in
 * both light and dark themes. See `src/lib/palette.ts` for the allowed keys.
 */
export interface Notebook {
  id: string
  name: string
  color: string
  createdAt: number
}

/** Keys of the restrained notebook color palette (`src/lib/palette.ts`). */
export type NotebookColorKey =
  | 'amber'
  | 'rose'
  | 'sage'
  | 'sky'
  | 'lilac'
  | 'sand'

/** Resolved theme actually applied to the document. */
export type Theme = 'light' | 'dark'

/** Which pane the mobile layout is showing. Ignored at desktop widths. */
export type MobilePane = 'list' | 'editor'

/**
 * Top-level application state.
 *
 * Mirrors PROJECT_PLAN.md, with `mobilePane` added because the sub-768px layout
 * is a single-column stack rather than the two-column desktop split.
 */
export interface AppState {
  notes: Note[]
  notebooks: Notebook[]
  activeNoteId: string | null
  activeNotebookId: string | null
  searchQuery: string
  drawerOpen: boolean
  mobilePane: MobilePane
}
