/**
 * The note body editor.
 *
 * Mounted by `EditorPane` with `key={note.id}`, so switching notes remounts the
 * composer rather than reusing it. That is the guarantee behind PROJECT_PLAN.md
 * §3 "switching notes does not save pending content to the wrong note": the
 * editor for the note being left is torn down (its last change has already been
 * dispatched) before the next note's editor exists.
 *
 * There is deliberately **no debounce here**. Content is dispatched on every
 * change and `PersistenceProvider` applies the single ~1s debounce before
 * writing to disk, matching how the title field already behaves.
 */

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import type { EditorState } from 'lexical'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EDITOR_NODES, EDITOR_THEME } from './editor-theme'
import { EditorToolbar } from './EditorToolbar'
import { editorStateFromStored, serializeEditorState } from './serialization'

interface LexicalEditorProps {
  /** `Note.content` for the note currently open. */
  storedContent: string
  /** Receives new serialized content whenever the document actually changes. */
  onContentChange: (content: string) => void
}

export function LexicalEditor({
  storedContent,
  onContentChange,
}: LexicalEditorProps) {
  // Fixed for this mount: the caller keys the component by note id, so the
  // initializer only ever runs for the note this editor was created for.
  const [initialContent] = useState(() => editorStateFromStored(storedContent))

  // Last value handed upstream. Lexical fires an update for the state it just
  // loaded, and emitting that would bump `updatedAt` merely for opening a note.
  const lastEmitted = useRef(initialContent)

  const changeHandler = useRef(onContentChange)
  useEffect(() => {
    changeHandler.current = onContentChange
  })

  const handleChange = useCallback((editorState: EditorState) => {
    const serialized = serializeEditorState(editorState.toJSON())
    if (serialized === lastEmitted.current) return

    lastEmitted.current = serialized
    changeHandler.current(serialized)
  }, [])

  const initialConfig = useMemo(
    () => ({
      namespace: 'notes-app',
      theme: EDITOR_THEME,
      nodes: EDITOR_NODES,
      editable: true,
      editorState: initialContent,
      onError: (error: Error) => {
        // Surfacing beats swallowing: a serialization bug should be visible.
        throw error
      },
    }),
    [initialContent],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorToolbar />

      <div className="editor__canvas">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="editor__input"
              aria-label="Note body"
              aria-multiline="true"
            />
          }
          placeholder={
            <div className="editor__placeholder">Start writing…</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>

      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
    </LexicalComposer>
  )
}
