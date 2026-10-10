# Post-it Notes App — Complete Project Plan

## Goal

Build a polished, responsive Post-it Notes application in the existing React + TypeScript + Vite repository.

The app should feel like a modern personal workspace inspired by paper notes: warm, calm, tactile, readable, and polished rather than a generic admin dashboard.

## First principles

1. Inspect the existing repository before changing files. Preserve useful existing code and conventions.
2. Start the existing Vite app early, determine its actual local URL, and keep it running if possible.
3. Implement one phase at a time. Do not build the entire application in one huge change.
4. Verify the relevant UI flows after each phase. Run TypeScript/build checks when relevant.
5. Maintain `PROJECT_PROGRESS.md` throughout the work. Never claim a check passed unless it was performed.
6. Use the MCP router for coding tasks when available: call `route` first, then `execute_task` with `approve_paid=false` by default. Never automatically approve paid-model requests or bypass budget safeguards.
7. Keep the implementation practical and avoid overengineering.
8. If the router is unavailable, report that honestly and follow the available project workflow without claiming the router was used.

## 1. Workspace and visual design

* Build a responsive workspace with a sidebar, note list/grid, and editor area.
* Use a warm, paper-inspired visual style with subtle paper tones, attractive note cards, considered typography, gentle borders/shadows, and restrained accent colors.
* Support light and dark themes with a visible theme toggle.
* Add useful hover and keyboard-focus states.
* Provide meaningful empty, error, and unsupported-browser states.
* At widths below 768px, use a mobile-friendly drawer or bottom sheet rather than forcing the desktop layout.
* Ensure controls have accessible labels and visible keyboard focus.

## 2. Notes

* Create, edit, select, and delete notes.
* Each note has a title and rich-text content.
* Notes can be pinned and should be easy to identify.
* Show useful metadata such as the last-updated time.
* Create an Inbox notebook by default and use it as the default destination for new notes.
* Provide a clear empty state and action when no notes exist.
* Confirm destructive actions when appropriate.

## 3. Rich-text editor

* Use Lexical for rich-text editing.
* Support practical formatting such as bold, italic, underline, headings, lists, links, and undo/redo where supported by the selected Lexical setup.
* Use one consistent, documented, serializable representation for editor content. Do not casually mix HTML and Lexical JSON.
* Provide a clear toolbar and reliable focus/selection behavior.
* Autosave approximately one second after typing stops.
* Avoid unnecessary writes and duplicate version snapshots.
* Show a subtle save status.
* Ensure switching notes does not save pending content to the wrong note.

## 4. Notebooks

* Create, rename, and delete notebooks.
* A note can belong to multiple notebooks.
* Provide an Inbox notebook by default.
* Make the active notebook and note membership clear.
* Prevent orphaned notes when a notebook is deleted. Define a sensible destination or membership-removal behavior.
* Support notebook colors using a restrained, consistent palette.

## 5. Local file persistence

Use the File System Access API where supported.

* Allow the user to choose a local data directory.
* Store the directory handle in IndexedDB.
* Restore the saved handle when possible and provide a reconnect/reselect flow if permission is unavailable or revoked.
* Persist these files in the selected directory:

  * `notes.json`
  * `notebooks.json`
  * `.metadata.json`
  * `images/` directory for image assets
* Store image assets as separate files under `images/`; do not embed large base64 image strings in note JSON.
* Handle missing or malformed files, unsupported browsers, permission errors, and I/O failures gracefully.
* Use safe write patterns where practical and communicate save failures clearly.
* Never claim a file was saved unless the write succeeded.
* Provide Export All even when the File System Access API is unavailable.
* Clearly explain when the user needs to grant directory permission again.

## 6. Version history

* Maintain version history for each note.
* Limit history to a maximum of 50 versions per note.
* Each version records an ID, content snapshot, timestamp, and optional author.
* Avoid a new version for every keystroke.
* Provide a history UI to inspect versions and restore an earlier version.
* Restoring a version must create a new snapshot rather than erase the current version or history.
* Keep ordering consistent and enforce the 50-version limit.
* Define and follow a consistent snapshot policy for title and content changes.

## 7. Search and navigation

* Search note titles and note content.
* Extract readable text from the chosen Lexical content representation rather than relying on fragile string matching against serialized JSON.
* Combine search with notebook filtering and pinned-note ordering predictably.
* Provide a clear-search action and a no-results state.
* Keep navigation understandable on mobile.

## 8. Keyboard and accessibility

* Add useful shortcuts, including a shortcut for creating a note where practical.
* Do not hijack shortcuts while the user is typing in an input or rich-text editor.
* Ensure dialogs, drawers, buttons, and menus work with keyboard navigation and focus.
* Keep destructive actions clear and recoverable where practical.

## 9. Export

* Provide Export All for notes and notebooks, including metadata and version history.
* Use a portable format such as a downloadable JSON export.
* Include image assets where practical and clearly document any export limitations.
* Export must work even when directory access is unavailable.

## Data model

Use or adapt these TypeScript models. Keep the implementation consistent and type-safe.

```typescript
interface NoteVersion {
  id: string;
  content: string;
  timestamp: number;
  author?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  versions: NoteVersion[];
  notebookIds: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface AppState {
  notes: Note[];
  notebooks: Notebook[];
  activeNoteId: string | null;
  activeNotebookId: string | null;
  searchQuery: string;
  drawerOpen: boolean;
}
```

Requirements for the model:

* Document the serialized format used by `content`.
* Extend the models only when an actual feature needs it.
* Store the directory handle in IndexedDB, not in JSON.
* Define and document the purpose and structure of `.metadata.json`.

## Suggested architecture

Inspect the repository first, then use the simplest architecture that fits. Keep concerns understandable and reasonably separated:

* Workspace and responsive layout
* Note list/cards and editor
* Notebook navigation and management
* Lexical editor and toolbar
* Filesystem persistence adapter
* IndexedDB helper for the directory handle
* Note/version operations and search helpers
* Theme handling
* Export utility

Use existing React state/context patterns unless there is a clear reason to add another state library. Do not add a large state-management dependency without need.

## Implementation phases

### Phase 0 — Repository audit and running baseline

* Inspect repository structure, package scripts, dependencies, and existing components.
* Identify code to preserve.
* Check whether the MCP router is available.
* Start Vite and report the actual local URL.
* Record baseline findings and actual command results in `PROJECT_PROGRESS.md`.
* Do not make broad feature changes before the audit.

**Acceptance:** startup is attempted, and the actual result and blockers are recorded.

### Phase 1 — Design shell and responsive workspace

* Implement the visual system, workspace shell, sidebar, note list/grid, editor placeholder, notebook navigation, and theme toggle.
* Use temporary state only where needed; never misrepresent temporary data as persisted.
* Implement responsive drawer/bottom-sheet behavior below 768px.
* Ensure visible controls work or are clearly marked unavailable until their phase.

**Acceptance:** desktop and mobile layouts are usable and the app runs.

### Phase 2 — Persistence foundation

* Implement directory selection through the File System Access API.
* Store and retrieve the directory handle with IndexedDB.
* Read/write `notes.json`, `notebooks.json`, and `.metadata.json`.
* Add permission and reconnect handling, plus user-visible saving/error status.
* Initialize Inbox when no notebook data exists.
* Provide a usable fallback/export path for unsupported browsers.

**Acceptance:** choose a directory, reload the app, and verify data is read back; errors are surfaced honestly.

### Phase 3 — Note and notebook CRUD

* Implement note creation, selection, editing, and deletion.
* Implement notebook creation, renaming, and deletion.
* Support multi-notebook membership and Inbox defaults.
* Implement pinning and predictable filtering.

**Acceptance:** CRUD and membership work in the UI and persistence is verified.

### Phase 4 — Lexical editor and autosave

* Integrate Lexical with practical formatting and a usable toolbar.
* Persist editor content in the chosen serialized representation.
* Implement approximately one-second debounced autosave and save status.
* Handle note switching and pending saves safely.

**Acceptance:** edit and format a note, wait for autosave, reload, and verify content and formatting remain intact.

### Phase 5 — Search and navigation polish

* Implement title and readable-body-text search.
* Combine search with notebook filtering and pinned ordering.
* Add clear-search and no-results states.
* Verify mobile navigation and note selection.

**Acceptance:** search finds title/body text and filtering behaves predictably.

### Phase 6 — Version history and restore

* Implement snapshots capped at 50 versions per note.
* Avoid duplicate snapshots and excessive history while typing.
* Add version-history UI and restore behavior that creates a new snapshot.

**Acceptance:** edit a note several times, inspect history, restore an earlier version, and verify history remains intact.

### Phase 7 — Keyboard shortcuts, mobile details, and Export All

* Add useful, conflict-safe keyboard shortcuts.
* Finish responsive drawer/bottom-sheet behavior and accessibility details.
* Implement Export All with notes, notebooks, metadata, and version history; include images where practical and document limitations.

**Acceptance:** export produces a usable file and mobile/keyboard flows work.

### Phase 8 — Final polish and verification

* Review visual consistency, typography, spacing, interactions, and responsive behavior.
* Check empty/error/unsupported states and persistence failure handling.
* Run relevant build/type checks and a small number of focused tests for persistence, version history, and data integrity.
* Fix regressions found during verification.

**Acceptance:** the app builds if the environment permits, main flows are verified in the UI, and remaining issues are documented honestly.

## Verification and reporting

After each phase, record:

* What was implemented
* Which UI flows were tried
* Commands actually run and their real results
* Known issues or blockers

Prefer practical browser checks first. Focus automated tests on serialization/persistence, note/notebook integrity, version caps and restore, and rich-text search extraction. Avoid building a large test suite without a clear need.

After each phase, report concisely:

1. Implemented
2. Local browser URL
3. What to try
4. Checks run and actual results
5. Updated phase status
6. Next phase

Do not proceed past an important failure while pretending the phase succeeded. Fix it or clearly document the blocker.

## Start now

Begin with Phase 0. Inspect the existing repository, check MCP router availability, start Vite, record the actual baseline in `PROJECT_PROGRESS.md`, and proceed phase by phase. Keep the app runnable and visible in the browser throughout development where possible.
