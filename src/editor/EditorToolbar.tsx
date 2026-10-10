/**
 * Formatting toolbar for the note body.
 *
 * Buttons act on the current selection rather than stealing focus: each one
 * prevents the default `mousedown` so the editor keeps its selection, which is
 * what makes a toolbar over a `contentEditable` actually work.
 *
 * Shortcuts are not touched here — PROJECT_PLAN.md §8 owns those, and toolbar
 * buttons cannot hijack typing.
 */

import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
  type RangeSelection,
} from 'lexical'
import { useCallback, useEffect, type ReactNode } from 'react'
import { useState } from 'react'

type TextFormat = 'bold' | 'italic' | 'underline'
type BlockType = 'paragraph' | 'h1' | 'h2' | 'quote' | 'ul' | 'ol'

interface ToolbarState {
  bold: boolean
  italic: boolean
  underline: boolean
  block: BlockType
}

const IDLE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  block: 'paragraph',
}

/** Which block the caret currently sits in. Defaults to a plain paragraph. */
function blockTypeOf(selection: RangeSelection): BlockType {
  const anchor = selection.anchor.getNode()

  const list = $getNearestNodeOfType(anchor, ListNode)
  if (list) return list.getListType() === 'number' ? 'ol' : 'ul'

  const top = anchor.getTopLevelElement()
  if (top) {
    if ($isHeadingNode(top)) {
      const tag = top.getTag()
      if (tag === 'h1' || tag === 'h2') return tag
    }
    if ($isQuoteNode(top)) return 'quote'
  }

  return 'paragraph'
}

function readToolbarState(): ToolbarState {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return IDLE

  return {
    bold: selection.hasFormat('bold'),
    italic: selection.hasFormat('italic'),
    underline: selection.hasFormat('underline'),
    block: blockTypeOf(selection),
  }
}

function sameState(a: ToolbarState, b: ToolbarState): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.block === b.block
  )
}

/** Mirror the selection into React state so the buttons can show as pressed. */
function useToolbarState(editor: LexicalEditor): ToolbarState {
  const [state, setState] = useState<ToolbarState>(IDLE)

  useEffect(() => {
    const sync = () => {
      const next = editor.getEditorState().read(readToolbarState)
      setState((prev) => (sameState(prev, next) ? prev : next))
    }

    sync()

    return mergeRegister(
      editor.registerUpdateListener(sync),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          sync()
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return state
}

interface ToolbarButtonProps {
  label: string
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="editor-toolbar__button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      data-on={pressed ? 'true' : undefined}
      // Keep the editor selection; without this the command applies to nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function EditorToolbar() {
  const [editor] = useLexicalComposerContext()
  const active = useToolbarState(editor)

  const format = useCallback(
    (kind: TextFormat) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind)
    },
    [editor],
  )

  const currentBlock = active.block

  const applyBlock = useCallback(
    (block: BlockType) => {
      // List commands are dispatched directly; they are not selection commands.
      if (block === 'ul') {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        return
      }
      if (block === 'ol') {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        return
      }

      // A list item keeps its own block type, so `$setBlocksType` below would
      // silently do nothing when leaving a list. Leaving is its own command.
      if (currentBlock === 'ul' || currentBlock === 'ol') {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      }

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        if (block === 'h1' || block === 'h2') {
          $setBlocksType(selection, () => $createHeadingNode(block))
        } else if (block === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode())
        } else {
          $setBlocksType(selection, () => $createParagraphNode())
        }
      })
    },
    [editor, currentBlock],
  )

  const insertLink = useCallback(() => {
    const url = window.prompt('Link URL')
    if (url === null) return

    const trimmed = url.trim()
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed.length > 0 ? trimmed : null)
  }, [editor])

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButton
        label="Bold"
        pressed={active.bold}
        onClick={() => format('bold')}
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        label="Italic"
        pressed={active.italic}
        onClick={() => format('italic')}
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        label="Underline"
        pressed={active.underline}
        onClick={() => format('underline')}
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolbarButton>

      <span className="editor-toolbar__divider" aria-hidden="true" />

      <ToolbarButton
        label="Heading 1"
        pressed={active.block === 'h1'}
        onClick={() => applyBlock('h1')}
      >
        H1
      </ToolbarButton>

      <ToolbarButton
        label="Heading 2"
        pressed={active.block === 'h2'}
        onClick={() => applyBlock('h2')}
      >
        H2
      </ToolbarButton>

      <ToolbarButton
        label="Body text"
        pressed={active.block === 'paragraph'}
        onClick={() => applyBlock('paragraph')}
      >
        Body
      </ToolbarButton>

      <ToolbarButton
        label="Quote"
        pressed={active.block === 'quote'}
        onClick={() => applyBlock('quote')}
      >
        &ldquo;
      </ToolbarButton>

      <span className="editor-toolbar__divider" aria-hidden="true" />

      <ToolbarButton
        label="Bulleted list"
        pressed={active.block === 'ul'}
        onClick={() => applyBlock('ul')}
      >
        &bull;
      </ToolbarButton>

      <ToolbarButton
        label="Numbered list"
        pressed={active.block === 'ol'}
        onClick={() => applyBlock('ol')}
      >
        1.
      </ToolbarButton>

      <span className="editor-toolbar__divider" aria-hidden="true" />

      <ToolbarButton label="Insert link" onClick={insertLink}>
        Link
      </ToolbarButton>

      <span className="editor-toolbar__divider" aria-hidden="true" />

      <ToolbarButton
        label="Undo"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        &#8630;
      </ToolbarButton>

      <ToolbarButton
        label="Redo"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        &#8631;
      </ToolbarButton>
    </div>
  )
}
