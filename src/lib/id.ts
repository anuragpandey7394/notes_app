/**
 * Identifier generation.
 *
 * Uses `crypto.randomUUID` where available (all browsers that support the File
 * System Access API) and falls back to a timestamp + random suffix so the app
 * still works in older/unsupported browsers rather than throwing.
 */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${random}`
}
