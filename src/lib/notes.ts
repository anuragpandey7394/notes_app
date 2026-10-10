/**
 * Note and notebook construction, plus the membership rule that keeps the
 * in-memory workspace identical to what a reload would produce.
 *
 * These are pure: ids and timestamps are passed in, so the reducer stays
 * testable and deterministic.
 */

import { INBOX_ID, MAX_VERSIONS_PER_NOTE } from '../persistence/format'
import type { Note, Notebook, NotebookColorKey } from '../types'
import { createEmptyContent } from './content'

export interface NoteDraft {
  id: string
  /** Notebook the new note is filed under. Falls back to Inbox when null. */
  notebookId?: string | null
  now: number
}

/**
 * A new, empty note.
 *
 * New notes go to the active notebook when one is selected, otherwise to Inbox
 * (PROJECT_PLAN.md §2: "Create an Inbox notebook by default and use it as the
 * default destination for new notes").
 */
export function createNote({ id, notebookId, now }: NoteDraft): Note {
  return {
    id,
    title: '',
    content: createEmptyContent(),
    versions: [],
    notebookIds: [notebookId ?? INBOX_ID],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function createNotebook(
  id: string,
  name: string,
  color: NotebookColorKey,
  now: number,
): Notebook {
  return { id, name, color, createdAt: now }
}

/**
 * Enforce the membership rule: **every note belongs to at least one notebook,
 * and Inbox is the fallback.**
 *
 * This mirrors `applyIntegrity` in `persistence/format.ts`, which moves
 * unassigned notes into Inbox when a directory is read. Keeping the same rule
 * in memory means the workspace never changes shape behind the user's back on
 * reload. It also means deleting a notebook can never orphan a note.
 */
export function normalizeMembership(
  notebookIds: readonly string[],
  knownNotebookIds: readonly string[],
): string[] {
  const known = new Set(knownNotebookIds)
  const kept = [...new Set(notebookIds)].filter((id) => known.has(id))
  return kept.length > 0 ? kept : [INBOX_ID]
}

/**
 * Trim stored version history to the cap, keeping the newest.
 *
 * Defined here (and applied by the reducer) so the cap holds in memory between
 * saves; `normalizeNote` applies the same limit when reading from disk.
 */
export function capVersions<T>(versions: readonly T[]): T[] {
  return versions.length <= MAX_VERSIONS_PER_NOTE
    ? [...versions]
    : versions.slice(-MAX_VERSIONS_PER_NOTE)
}

/** Default name for a notebook the user has not named yet. */
export const UNTITLED_NOTEBOOK = 'Untitled notebook'
