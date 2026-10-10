import type { NotebookColorKey } from '../types'

/**
 * The restrained notebook color palette.
 *
 * Notebooks store a key from this list rather than a raw color value, so the
 * same notebook renders correctly in both themes. Each key resolves to the CSS
 * custom properties `--note-<key>` (surface) and `--note-<key>-ink` (text)
 * defined in `src/styles/tokens.css`.
 */
export const NOTEBOOK_COLOR_KEYS: readonly NotebookColorKey[] = [
  'amber',
  'rose',
  'sage',
  'sky',
  'lilac',
  'sand',
] as const

/** Human-readable label for each palette key, for tooltips and menus. */
export const NOTEBOOK_COLOR_LABELS: Record<NotebookColorKey, string> = {
  amber: 'Amber',
  rose: 'Rose',
  sage: 'Sage',
  sky: 'Sky',
  lilac: 'Lilac',
  sand: 'Sand',
}

/** Narrow an arbitrary string to a palette key, falling back to `amber`. */
export function toColorKey(value: string | undefined): NotebookColorKey {
  return NOTEBOOK_COLOR_KEYS.includes(value as NotebookColorKey)
    ? (value as NotebookColorKey)
    : 'amber'
}
