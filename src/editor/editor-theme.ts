/**
 * The node set and CSS theme the editor is configured with.
 *
 * Every block type registered here must also be understood by `BLOCK_TYPES` in
 * `src/lib/content.ts`, otherwise `plainTextFromContent()` silently stops
 * extracting that text and body-text search (PROJECT_PLAN.md §7) loses it.
 * `paragraph`, `heading`, `quote` and `listitem` are all covered there.
 */

import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { EditorThemeClasses, Klass, LexicalNode } from 'lexical'

/** Node classes registered with the composer. */
export const EDITOR_NODES: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
]

/**
 * Class names Lexical applies to generated markup.
 *
 * Styling lives in `src/styles/app.css` and uses the same custom properties as
 * the rest of the app so the editor matches in both themes.
 */
export const EDITOR_THEME: EditorThemeClasses = {
  paragraph: 'editor__paragraph',
  heading: {
    h1: 'editor__heading editor__heading--h1',
    h2: 'editor__heading editor__heading--h2',
  },
  quote: 'editor__quote',
  link: 'editor__link',
  list: {
    ul: 'editor__list editor__list--unordered',
    ol: 'editor__list editor__list--ordered',
    listitem: 'editor__list-item',
  },
  text: {
    bold: 'editor__text-bold',
    italic: 'editor__text-italic',
    underline: 'editor__text-underline',
  },
}
