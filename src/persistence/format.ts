/**
 * On-disk formats for the data directory, plus the normalisation rules applied
 * when reading them back.
 *
 * Everything in this module is pure: no DOM, no File System Access API. That
 * keeps the rules that protect user data unit-testable on their own.
 *
 * ## Directory layout
 *
 * ```
 * <chosen directory>/
 *   notes.json          note records, including version history
 *   notebooks.json      notebook records
 *   .metadata.json      app-level info about this directory
 *   images/             image assets referenced by notes
 * ```
 *
 * Image bytes are written as separate files under `images/` and only ever
 * referenced from note content — never embedded as base64 in `notes.json`
 * (PROJECT_PLAN.md §5).
 *
 * ## Envelopes
 *
 * `notes.json` and `notebooks.json` are objects, not bare arrays, so a schema
 * version can travel with the data:
 *
 * ```json
 * { "schemaVersion": 1, "notes": [ ... ] }
 * ```
 *
 * ## `.metadata.json`
 *
 * Purpose: app-level information about the directory itself — **not** note
 * content. It lets the app recognise a directory it created, tell when the data
 * was last written, and record bookkeeping such as the last export time.
 *
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "app": "notes-app",
 *   "createdAt": 1760000000000,
 *   "updatedAt": 1760000000000,
 *   "noteCount": 6,
 *   "notebookCount": 3,
 *   "lastExportAt": null
 * }
 * ```
 */

import { createEmptyContent } from '../lib/content'
import { toColorKey } from '../lib/palette'
import type { Note, NoteVersion, Notebook } from '../types'

export const SCHEMA_VERSION = 1
export const APP_ID = 'notes-app'

export const NOTES_FILE = 'notes.json'
export const NOTEBOOKS_FILE = 'notebooks.json'
export const METADATA_FILE = '.metadata.json'
export const IMAGES_DIR = 'images'

/** The Inbox notebook is created on first run and is the default destination. */
export const INBOX_ID = 'nb_inbox'
export const INBOX_NAME = 'Inbox'
export const INBOX_COLOR = 'amber'

/** Hard cap on retained versions per note (PROJECT_PLAN.md §6). */
export const MAX_VERSIONS_PER_NOTE = 50

export interface NotesFile {
  schemaVersion: number
  notes: Note[]
}

export interface NotebooksFile {
  schemaVersion: number
  notebooks: Notebook[]
}

export interface DirectoryMetadata {
  schemaVersion: number
  app: string
  createdAt: number
  updatedAt: number
  noteCount: number
  notebookCount: number
  lastExportAt: number | null
}

/** Result of parsing a file, carrying any repairs that were applied. */
export type ParseResult<T> =
  | { ok: true; value: T; issues: string[] }
  | { ok: false; error: string }

/* ------------------------------------------------------------------ helpers */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter((entry): entry is string => typeof entry === 'string')
}

/** Is this a string containing parseable JSON? Used to vet `content`. */
function isParseableJson(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------- normalisation */

export function normalizeVersion(raw: unknown): NoteVersion | null {
  if (!isRecord(raw)) return null

  const id = asString(raw.id)
  if (id.length === 0) return null

  const content = asString(raw.content)

  const version: NoteVersion = {
    id,
    content: isParseableJson(content) ? content : createEmptyContent(),
    timestamp: asTimestamp(raw.timestamp, Date.now()),
  }

  const author = asString(raw.author)
  if (author.length > 0) version.author = author

  return version
}

/**
 * Coerce one stored record into a `Note`.
 *
 * Returns `null` for entries that cannot be salvaged (no id), so a single bad
 * record cannot take down the whole file.
 */
export function normalizeNote(raw: unknown): Note | null {
  if (!isRecord(raw)) return null

  const id = asString(raw.id)
  if (id.length === 0) return null

  const content = asString(raw.content)
  const createdAt = asTimestamp(raw.createdAt, Date.now())
  const updatedAt = asTimestamp(raw.updatedAt, createdAt)

  return {
    id,
    title: asString(raw.title),
    content: isParseableJson(content) ? content : createEmptyContent(),
    versions: asArray(raw.versions)
      .map(normalizeVersion)
      .filter((v): v is NoteVersion => v !== null)
      .slice(-MAX_VERSIONS_PER_NOTE),
    notebookIds: [...new Set(asStringArray(raw.notebookIds))],
    pinned: asBoolean(raw.pinned, false),
    createdAt,
    updatedAt,
  }
}

export function normalizeNotebook(raw: unknown): Notebook | null {
  if (!isRecord(raw)) return null

  const id = asString(raw.id)
  if (id.length === 0) return null

  return {
    id,
    name: asString(raw.name, 'Untitled notebook'),
    // Stored color values are palette keys; anything else falls back to amber.
    color: toColorKey(asString(raw.color)),
    createdAt: asTimestamp(raw.createdAt, Date.now()),
  }
}

/** Accessor for the array inside an envelope, tolerating a bare array too. */
function envelopeArray(parsed: unknown, key: string): unknown[] | null {
  if (Array.isArray(parsed)) return parsed
  if (isRecord(parsed) && Array.isArray(parsed[key])) return parsed[key]
  return null
}

export function parseNotesFile(text: string): ParseResult<Note[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: `${NOTES_FILE} is not valid JSON.` }
  }

  const rawNotes = envelopeArray(parsed, 'notes')
  if (!rawNotes) {
    return { ok: false, error: `${NOTES_FILE} does not contain a notes array.` }
  }

  const issues: string[] = []
  const notes: Note[] = []
  const seen = new Set<string>()

  for (const raw of rawNotes) {
    const note = normalizeNote(raw)
    if (!note) {
      issues.push('Skipped a note record that had no id.')
      continue
    }
    if (seen.has(note.id)) {
      issues.push(`Skipped a duplicate note id (${note.id}).`)
      continue
    }
    seen.add(note.id)
    notes.push(note)
  }

  return { ok: true, value: notes, issues }
}

export function parseNotebooksFile(text: string): ParseResult<Notebook[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: `${NOTEBOOKS_FILE} is not valid JSON.` }
  }

  const rawNotebooks = envelopeArray(parsed, 'notebooks')
  if (!rawNotebooks) {
    return { ok: false, error: `${NOTEBOOKS_FILE} does not contain a notebooks array.` }
  }

  const issues: string[] = []
  const notebooks: Notebook[] = []
  const seen = new Set<string>()

  for (const raw of rawNotebooks) {
    const notebook = normalizeNotebook(raw)
    if (!notebook) {
      issues.push('Skipped a notebook record that had no id.')
      continue
    }
    if (seen.has(notebook.id)) {
      issues.push(`Skipped a duplicate notebook id (${notebook.id}).`)
      continue
    }
    seen.add(notebook.id)
    notebooks.push(notebook)
  }

  return { ok: true, value: notebooks, issues }
}

export function parseMetadataFile(text: string): DirectoryMetadata | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null

  return {
    schemaVersion:
      typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : SCHEMA_VERSION,
    app: asString(parsed.app, APP_ID),
    createdAt: asTimestamp(parsed.createdAt, Date.now()),
    updatedAt: asTimestamp(parsed.updatedAt, Date.now()),
    noteCount: typeof parsed.noteCount === 'number' ? parsed.noteCount : 0,
    notebookCount:
      typeof parsed.notebookCount === 'number' ? parsed.notebookCount : 0,
    lastExportAt:
      typeof parsed.lastExportAt === 'number' ? parsed.lastExportAt : null,
  }
}

/* ------------------------------------------------------------- serialisation */

export function serializeNotes(notes: readonly Note[]): string {
  return `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, notes }, null, 2)}\n`
}

export function serializeNotebooks(notebooks: readonly Notebook[]): string {
  return `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, notebooks }, null, 2)}\n`
}

export function createMetadata(
  notebooks: readonly Notebook[],
  notes: readonly Note[],
  previous?: DirectoryMetadata | null,
  now = Date.now(),
): DirectoryMetadata {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: APP_ID,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    noteCount: notes.length,
    notebookCount: notebooks.length,
    lastExportAt: previous?.lastExportAt ?? null,
  }
}

export function serializeMetadata(metadata: DirectoryMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`
}

/* ----------------------------------------------------------------- integrity */

export function createInboxNotebook(now = Date.now()): Notebook {
  return {
    id: INBOX_ID,
    name: INBOX_NAME,
    color: INBOX_COLOR,
    createdAt: now,
  }
}

export interface IntegrityResult {
  notes: Note[]
  notebooks: Notebook[]
  issues: string[]
}

/**
 * Repair relationships between notes and notebooks after loading.
 *
 * Rules, applied in order:
 *
 * 1. Ensure an Inbox notebook exists — it is the default destination for new
 *    notes and the fallback membership for notes with none.
 * 2. Drop memberships pointing at notebooks that no longer exist.
 * 3. Give any note left without a notebook the Inbox, so no note is orphaned
 *    or invisible in every notebook view.
 */
export function applyIntegrity(
  notes: readonly Note[],
  notebooks: readonly Notebook[],
): IntegrityResult {
  const issues: string[] = []

  const repairedNotebooks = [...notebooks]
  if (!repairedNotebooks.some((nb) => nb.id === INBOX_ID)) {
    const inbox = createInboxNotebook()
    repairedNotebooks.unshift(inbox)
    issues.push('Created a missing Inbox notebook.')
  }

  const known = new Set(repairedNotebooks.map((nb) => nb.id))

  const repairedNotes = notes.map((note) => {
    const kept = note.notebookIds.filter((id) => known.has(id))

    if (kept.length !== note.notebookIds.length) {
      issues.push(`Removed a membership pointing at a missing notebook (${note.id}).`)
    }

    if (kept.length > 0) {
      return kept.length === note.notebookIds.length ? note : { ...note, notebookIds: kept }
    }

    issues.push(`Moved an unassigned note into Inbox (${note.id}).`)
    return { ...note, notebookIds: [INBOX_ID] }
  })

  return { notes: repairedNotes, notebooks: repairedNotebooks, issues }
}

/** A brand-new, empty directory: an Inbox and no notes. */
export function createFreshWorkspace(now = Date.now()): {
  notes: Note[]
  notebooks: Notebook[]
} {
  return { notes: [], notebooks: [createInboxNotebook(now)] }
}
