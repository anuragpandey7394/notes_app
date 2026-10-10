/**
 * Helpers for the single documented content representation used by the app:
 * a JSON string holding a serialized Lexical editor state. See `Note.content`
 * in `src/types.ts` for the format contract.
 *
 * Nothing here imports Lexical itself, so these helpers are safe to use from
 * plain data code (persistence, export, tests) without pulling in the editor.
 */

/** Node types after which a line break is inserted when extracting text. */
const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'listitem',
  'code',
  'code-highlight',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Serialize an empty Lexical document: a root with a single empty paragraph. */
export function createEmptyContent(): string {
  return JSON.stringify({
    root: {
      children: [
        {
          children: [],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 0,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}

/**
 * Build content from plain text. Each non-empty line becomes its own paragraph,
 * which is enough for sample data and for importing simple text.
 */
export function contentFromPlainText(text: string): string {
  const paragraphs = text.split('\n').map((line) => line.trim())

  return JSON.stringify({
    root: {
      children: paragraphs.map((line) => ({
        children:
          line.length > 0
            ? [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: line,
                  type: 'text',
                  version: 1,
                },
              ]
            : [],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}

function extractNode(node: unknown, out: string[]): void {
  if (!isRecord(node)) return

  const type = typeof node.type === 'string' ? node.type : ''

  if (type === 'text') {
    if (typeof node.text === 'string') out.push(node.text)
    return
  }

  if (type === 'linebreak') {
    out.push('\n')
    return
  }

  const children = node.children
  if (Array.isArray(children)) {
    for (const child of children) extractNode(child, out)
  } else if (typeof node.text === 'string') {
    // Defensive: element nodes normally carry `children`, but serialized data
    // written by another tool may only carry the flattened `text`.
    out.push(node.text)
  }

  // One newline per block. A deliberately blank paragraph therefore shows up as
  // an empty line, without every paragraph gaining a spurious blank line after
  // it. Callers that want prose can collapse whitespace themselves.
  if (BLOCK_TYPES.has(type)) out.push('\n')
}

/**
 * Extract readable text from serialized Lexical content.
 *
 * Used for note previews and for body-text search. Deliberately walks the node
 * tree instead of string-matching the raw JSON, so it cannot pick up ids,
 * formats, or other structural noise (PROJECT_PLAN.md §7).
 *
 * Never throws: malformed or missing content yields an empty string.
 */
export function plainTextFromContent(content: string): string {
  if (!content) return ''

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return ''
  }

  if (!isRecord(parsed) || !isRecord(parsed.root)) return ''

  const out: string[] = []
  extractNode(parsed.root, out)

  return out
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** True when the content holds no readable text at all. */
export function isContentEmpty(content: string): boolean {
  return plainTextFromContent(content).length === 0
}
