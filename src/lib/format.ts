/** Human-readable timestamps for note metadata. */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Short relative time, e.g. "just now", "12m ago", "Yesterday", "4 Mar". */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const delta = now - timestamp

  if (!Number.isFinite(timestamp)) return 'Unknown'
  if (delta < MINUTE) return 'just now'
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m ago`
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h ago`
  if (delta < 2 * DAY) return 'Yesterday'
  if (delta < 7 * DAY) return `${Math.floor(delta / DAY)}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year:
      new Date(timestamp).getFullYear() === new Date(now).getFullYear()
        ? undefined
        : 'numeric',
  })
}

/** Full timestamp for `title` tooltips and screen-reader context. */
export function formatAbsoluteTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown date'
  return new Date(timestamp).toLocaleString()
}
