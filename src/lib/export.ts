/**
 * Export All.
 *
 * Works with or without directory access, which is what makes it the fallback
 * for browsers that cannot open a folder at all (PROJECT_PLAN.md §9).
 *
 * Version history travels inside each note record, so the export is a complete
 * copy of the workspace in one downloadable file.
 *
 * ## Known limitation
 *
 * Image assets are **not** included yet. They live as separate files under
 * `images/` in the data directory and are referenced from note content. The
 * export records that they are missing rather than silently dropping them.
 * Bundling them is part of Phase 7.
 */

import type { Note, Notebook } from '../types'

export const EXPORT_FORMAT = 'notes-app-export'
export const EXPORT_SCHEMA_VERSION = 1

export interface ExportBundle {
  format: typeof EXPORT_FORMAT
  schemaVersion: number
  exportedAt: number
  notebooks: Notebook[]
  notes: Note[]
  images: {
    included: boolean
    note: string
  }
}

export function buildExportBundle(
  notes: readonly Note[],
  notebooks: readonly Notebook[],
  now = Date.now(),
): ExportBundle {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now,
    notebooks: [...notebooks],
    notes: [...notes],
    images: {
      included: false,
      note:
        'Image files stored under images/ are not included in this export yet. ' +
        'Copy the images/ folder from the data directory to keep them.',
    },
  }
}

export function serializeExport(bundle: ExportBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}

/** Local date stamp for the download filename, e.g. `2026-10-10`. */
export function exportFilename(now = Date.now()): string {
  const date = new Date(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `notes-export-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}.json`
}

/**
 * Trigger a download of the export.
 *
 * Uses a Blob URL and a synthetic anchor click — the same approach works in
 * every browser the app supports, including those without folder access.
 */
export function downloadExport(bundle: ExportBundle): string {
  const filename = exportFilename(bundle.exportedAt)
  const blob = new Blob([serializeExport(bundle)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // Give the browser a moment to start the download before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return filename
}
