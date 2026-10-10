import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import { useIsCompactLayout } from '../hooks/useMediaQuery'
import { useWorkspace } from '../state/workspace-context'
import { EditorPane } from './EditorPane'
import { NoteListPane } from './NoteListPane'
import { Sidebar } from './Sidebar'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AppShell() {
  const { state, dispatch } = useWorkspace()
  const isCompact = useIsCompactLayout()

  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  // The drawer is a compact-layout concept only; ignore it at desktop widths.
  const drawerOpen = state.drawerOpen && isCompact

  const closeDrawer = useCallback(() => {
    dispatch({ type: 'set-drawer', open: false })
  }, [dispatch])

  // Leaving the compact layout while the drawer is open would otherwise strand
  // it open behind the desktop sidebar.
  useEffect(() => {
    if (!isCompact && state.drawerOpen) closeDrawer()
  }, [isCompact, state.drawerOpen, closeDrawer])

  // Move focus into the drawer on open, and back to its trigger on close.
  useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    } else if (wasOpenRef.current) {
      menuButtonRef.current?.focus()
    }
    wasOpenRef.current = drawerOpen
  }, [drawerOpen])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, closeDrawer])

  // Keep Tab inside the drawer while it is modal.
  const onDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!focusable || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const showingEditor = isCompact && state.mobilePane === 'editor'

  return (
    <div className="app" data-compact={isCompact}>
      <a className="skip-link" href="#notes-list">
        Skip to notes
      </a>

      {drawerOpen && (
        <div className="app__scrim" onClick={closeDrawer} aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        ref={drawerRef}
        className="app__sidebar"
        data-open={drawerOpen}
        role={isCompact ? 'dialog' : undefined}
        aria-modal={isCompact ? true : undefined}
        aria-label={isCompact ? 'Notebooks and navigation' : undefined}
        onKeyDown={isCompact ? onDrawerKeyDown : undefined}
        inert={isCompact && !drawerOpen ? true : undefined}
      >
        <Sidebar
          showClose={isCompact}
          onClose={closeDrawer}
          onNavigate={closeDrawer}
        />
      </aside>

      <section
        id="notes-list"
        className="app__list"
        data-hidden={showingEditor}
        inert={drawerOpen ? true : undefined}
      >
        <NoteListPane
          menuButtonRef={menuButtonRef}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => dispatch({ type: 'set-drawer', open: true })}
        />
      </section>

      <main
        className="app__editor"
        data-hidden={!showingEditor}
        inert={drawerOpen ? true : undefined}
      >
        <EditorPane
          showBack={isCompact}
          onBack={() => dispatch({ type: 'set-mobile-pane', pane: 'list' })}
        />
      </main>
    </div>
  )
}
