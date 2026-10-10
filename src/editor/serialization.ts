/**
 * Moving between stored note content and Lexical's editor state.
 *
 * Deliberately free of Lexical imports, mirroring `src/lib/content.ts`, so the
 * rules here stay unit-testable and usable from plain data code.
 *
 * `Note.content` is a JSON string of `editorState.toJSON()` — see `src/types.ts`.
 */

import { createEmptyContent } from '../lib/content'

/** True when `value` looks like a serialized Lexical editor state. */
export function isEditorState(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false

  const root = (value as { root?: unknown }).root
  if (typeof root !== 'object' || root === null) return false

  return Array.isArray((root as { children?: unknown }).children)
}

/**
 * Stored content that Lexical can load, falling back to an empty document.
 *
 * Content written by another tool, or truncated by a bad write, must never
 * crash the composer, so anything that is not a recognisable editor state is
 * replaced rather than passed through. The caller decides whether to write the
 * fallback back to disk — this function only reports what is safe to load.
 */
export function editorStateFromStored(content: string): string {
  if (!content) return createEmptyContent()

  try {
    return isEditorState(JSON.parse(content)) ? content : createEmptyContent()
  } catch {
    return createEmptyContent()
  }
}

/** Serialize editor state exactly as `Note.content` stores it. */
export function serializeEditorState(state: unknown): string {
  return JSON.stringify(state)
}
