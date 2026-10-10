import { plainTextFromContent } from '../lib/content'
import { formatAbsoluteTime, formatRelativeTime } from '../lib/format'
import { toColorKey } from '../lib/palette'
import type { Note, Notebook } from '../types'
import { IconPin } from './Icons'

const PREVIEW_LENGTH = 140

interface NoteCardProps {
  note: Note
  notebooks: Notebook[]
  active: boolean
  onSelect: (id: string) => void
}

function previewOf(note: Note): string {
  const text = plainTextFromContent(note.content).replace(/\s+/g, ' ').trim()
  if (text.length <= PREVIEW_LENGTH) return text
  return `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…`
}

export function NoteCard({ note, notebooks, active, onSelect }: NoteCardProps) {
  const memberNotebooks = notebooks.filter((nb) => note.notebookIds.includes(nb.id))
  const preview = previewOf(note)

  // The colored spine reflects the note's first notebook, if it has one.
  const primaryNotebook = notebooks.find((nb) =>
    note.notebookIds.includes(nb.id),
  )

  return (
    <li className="note-card-item">
      <button
        type="button"
        className="note-card"
        data-active={active}
        data-pinned={note.pinned}
        data-color={primaryNotebook ? toColorKey(primaryNotebook.color) : undefined}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(note.id)}
      >
        <span className="note-card__head">
          <span className="note-card__title">{note.title.trim() || 'Untitled note'}</span>
          {note.pinned && (
            <span className="note-card__pin" title="Pinned">
              <IconPin size={13} />
              <span className="visually-hidden">Pinned</span>
            </span>
          )}
        </span>

        <span className="note-card__preview" data-empty={preview.length === 0}>
          {preview.length > 0 ? preview : 'No text yet'}
        </span>

        <span className="note-card__meta">
          <span className="note-card__dots">
            {memberNotebooks.slice(0, 3).map((notebook) => (
              <span
                key={notebook.id}
                className="note-card__dot"
                data-color={toColorKey(notebook.color)}
                title={notebook.name}
              />
            ))}
            {memberNotebooks.length > 3 && (
              <span className="note-card__more">+{memberNotebooks.length - 3}</span>
            )}
          </span>
          <time
            className="note-card__time"
            dateTime={new Date(note.updatedAt).toISOString()}
            title={formatAbsoluteTime(note.updatedAt)}
          >
            {formatRelativeTime(note.updatedAt)}
          </time>
        </span>
      </button>
    </li>
  )
}
