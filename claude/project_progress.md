# Project Progress

**Project:** Post-it Notes App
**Overall status:** IN PROGRESS
**Last updated:** 2026-10-10

## Phase checklist

* [x] **Phase 0 — Repository audit and running baseline** — `COMPLETED`
* [x] **Phase 1 — Design shell and responsive workspace** — `COMPLETED`
* [x] **Phase 2 — Persistence foundation** — `COMPLETED`
* [x] **Phase 3 — Note and notebook CRUD** — `COMPLETED`
* [x] **Phase 4 — Lexical editor and autosave** — `COMPLETED`
* [ ] **Phase 5 — Search and navigation polish** — `NOT STARTED`
* [ ] **Phase 6 — Version history and restore** — `NOT STARTED`
* [ ] **Phase 7 — Keyboard shortcuts, mobile details, and Export All** — `NOT STARTED`
* [ ] **Phase 8 — Final polish and verification** — `NOT STARTED`

## Baseline

### Repository audit (actual findings)

The repository at the start of Phase 0 contained **no application code at all**:

```
.git/
claude/claude.md
claude/project_plan.md
claude/project_progress.md
```

* `git log` showed a single commit (`71948f7 first commit`) adding only those three
  Markdown files.
* **No `package.json`, no `vite.config.ts`, no `src/`, no `node_modules`, no `.gitignore`.**
* The plan's premise of an "existing React + TypeScript + Vite repository" was **not true**.
  There was no existing Vite app to start and no application code to preserve.
* Files to preserve: the three `claude/*.md` documents. They were left untouched.
* Environment: Node `v22.22.1`, npm `9.2.0`, npm registry reachable (`npm ping` → PONG).

### What was done to establish a running baseline

Because no app existed, a minimal Vite + React + TypeScript baseline had to be scaffolded
before Vite could be started. Scaffolding was generated with the official
`npm create vite@latest -- --template react-ts` template in a temporary directory and the
config files were copied in, so conventions match the upstream template rather than being
invented. Added to the template: `"strict": true` in `tsconfig.app.json` and a
`typecheck` script.

Files created in the repo root: `package.json`, `index.html`, `vite.config.ts`,
`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.gitignore`,
`public/favicon.svg`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.

Dependency versions installed: vite `8.3.4`, react/react-dom `19.2.8`,
@vitejs/plugin-react `6.1.1`, typescript `6.0.2`. No Lexical yet (added in Phase 4 as
planned, to avoid carrying an unused dependency).

`src/App.tsx` is an explicitly marked Phase 0 placeholder. It is **not** persisted data
and does not claim to be anything other than a toolchain smoke test.

### MCP router availability — UNAVAILABLE in this session

Checked `~/.claude.json` and the project/global settings:

* A `router` MCP server **is configured on disk**, but only for the project entries
  `/home/anurag/claude-code` and `/home/anurag/claude-code/mcp-router`:
  `{"type":"stdio","command":"/home/anurag/claude-code/mcp-router/.venv/bin/python","args":["/home/anurag/claude-code/mcp-router/server.py"]}`
* The entry for **this** project (`/home/anurag/claude-code/react-app/notes_app`) has
  `enabledMcpjsonServers: []` and **no** `mcpServers` entry.
* There is no `.mcp.json` in the project and no managed settings file.
* Consequently **no `mcp__router__route` / `mcp__router__execute_task` tools are exposed in
  this session.** The router could not be called, so `route` → `execute_task` was not used.

**This is reported, not silently bypassed.** Per `claude.md` and plan §First principles 8
("If the router is unavailable, report that honestly and follow the available project
workflow without claiming the router was used"), implementation proceeds under the normal
project workflow. **No paid-model request was made or auto-approved at any point.**
`approve_paid` was never set to `true`.

To enable the router for this project, add the server above to the
`/home/anurag/claude-code/react-app/notes_app` entry in `~/.claude.json` (or add a project
`.mcp.json`) and restart the session.

**Update, Phase 4 (2026-10-10):** the finding above was true in the Phase 0 session, but the
`mcp__router__route` and `mcp__router__execute_task` tools **are** exposed in the current
session, so it is no longer accurate as a standing statement. They still could not be used for
this phase:

* `route` returns `{"route":"deepseek/deepseek-v4.1-flash","complexity":"high","reason":"High
  complexity selects paid model; explicit approval required"}` — a paid model, and
  `approve_paid` was never set to `true`.
* `execute_task` failed twice with *"claude-sonnet-5 is temporarily unavailable, so auto mode
  cannot determine the safety of mcp__router__execute_task right now."*

Per `claude.md` and plan §First principles 8, this is reported rather than glossed over:
**Phase 4 was implemented directly by the assistant under the user's explicit approval of the
plan, not through the router.** No paid-model request was made or auto-approved at any point.

### Baseline command results (actually run)

| Command | Actual result |
| ------- | ------------- |
| `npm install` | `added 30 packages, and audited 31 packages in 19s` — `found 0 vulnerabilities` |
| `npx tsc -b` | exit code `0`, no diagnostics |
| `npm run dev -- --host 127.0.0.1 --port 5173` | `VITE v8.3.4 ready in 422 ms` |
| `curl http://127.0.0.1:5173/` | HTTP `200`, HTML shell served |
| `curl http://127.0.0.1:5173/src/main.tsx` | HTTP `200`, TSX transformed and served |

**Local browser URL: http://127.0.0.1:5173/**

The dev server is running in the background (log at `/tmp/vite-dev.log`).

## Phase 1 — Design shell and responsive workspace — `COMPLETED`

### Implemented

* **Visual system** in `src/styles/tokens.css` + `src/styles/app.css`: warm paper palette,
  full light and dark themes, notebook color palette (six restrained keys), type scale,
  spacing/radius/motion tokens, `prefers-reduced-motion` handling, themed scrollbars.
* **Workspace shell** (`src/components/AppShell.tsx`): sidebar / note list / editor columns
  on desktop; off-canvas drawer + single-column list⇄editor panes below 768px.
* **Sidebar** (`Sidebar.tsx`): brand, "All notes" plus per-notebook navigation with note
  counts, live theme toggle, and the data-source badge.
* **Note list/grid** (`NoteListPane.tsx`, `NoteCard.tsx`): responsive card grid, pinned
  notes first, colored notebook spine and dots, relative updated time, title + body preview.
* **Editor placeholder** (`EditorPane.tsx`): editable title (in-memory), read-only body
  preview rendered from the stored content, notebook chips, updated timestamp.
* **Empty states** (`EmptyState.tsx`): no-notes, empty-notebook, and no-search-results.
* **State** (`src/state/`): typed reducer + context, no new state library.
* **Data model** (`src/types.ts`): the plan's models plus documented adaptations —
  `Note.content` is documented as serialized Lexical JSON, and `Notebook.color` holds a
  palette key rather than a raw hex value so colors stay theme-correct.
* `src/lib/`: `content.ts` (Lexical serialize/extract helpers), `selectors.ts` (filter +
  pinned ordering), `format.ts`, `palette.ts`, `id.ts`.

### Honesty guarantees added in this phase

* `DataSource` (`'sample' | 'filesystem' | 'memory'`) is part of the workspace context and
  is rendered by `DataBadge` — Phase 1 shows "Sample data — nothing is saved yet."
* The editor states plainly that body editing is unavailable and nothing is saved.
* No control is rendered that does not work; features belonging to later phases (create,
  pin, delete, notebooks CRUD, file saving) are absent rather than faked.

### Verification — actually run

`npx tsc -b --force` → exit `0`. `npm run build` → succeeded (37 modules, 462 ms).

Browser checks were run with a headless Chrome + puppeteer-core harness kept **outside** the
repository (`/tmp/browser-tools/check.mjs`), driving the real dev server. Results:

| Check | Actual result |
| ----- | ------------- |
| Note cards rendered (desktop 1440×900) | 6 |
| Grid columns at 1440px | 2 |
| Menu button hidden at desktop width | `display: none` |
| Theme toggle → `html[data-theme]` | `dark`; `body` background `rgb(26,23,20)` |
| Theme toggle back | `light` |
| Body-text search `"sourdough"` (text lives inside note content, not the title) | 1 matching card |
| Search `"zzzznope"` | no-results state shown, title "No notes match your search" |
| Clear-search action | back to 6 cards |
| Notebook filter → Travel | heading "Travel", 1 card |
| Title edit reflected on the matching card | "Edited title" |
| Skip link is the first Tab stop | yes; transforms to visible on focus |
| Mobile (390×844) menu button | `display: flex` |
| Mobile drawer closed | `visibility: hidden`, `inert: true` |
| Mobile drawer opened | visible, scrim present, focus moved to the drawer close button |
| `Escape` in drawer | closed; focus returned to the menu button |
| Mobile note select | list `display: none`, editor `display: flex`, back button shown |
| Mobile back button | list shown again |
| Console / page errors / failed requests | **none** |

### Screenshots reviewed

`/tmp/shots/desktop-dark.png`, `mobile-list.png`, `mobile-drawer.png`,
`mobile-editor.png`, `desktop-no-results.png`.

## Phase 2 — Persistence foundation — `COMPLETED`

### Implemented

* **On-disk formats** (`src/persistence/format.ts`) — pure and unit-tested:
  `notes.json` / `notebooks.json` as `{schemaVersion, notes|notebooks}` envelopes,
  `.metadata.json` as `{schemaVersion, app, createdAt, updatedAt, noteCount, notebookCount,
  lastExportAt}`, plus `images/`. `INBOX_ID = 'nb_inbox'`, `MAX_VERSIONS_PER_NOTE = 50`.
* **Parsing and repair** — `parseNotesFile` / `parseNotebooksFile` / `parseMetadataFile`
  return `{ok, value, issues}`. Malformed JSON is **rejected, never rewritten**. Records
  are repaired individually (missing id → skipped, duplicate id → skipped, unparseable
  content → empty document, unknown color → amber) and every repair is reported to the user.
  `applyIntegrity` guarantees the Inbox exists, drops memberships pointing at missing
  notebooks, and moves unassigned notes into the Inbox.
* **File System Access layer** (`src/persistence/fsa.ts`) with ambient types in
  `file-system-access.d.ts` (added because TypeScript does not ship them; proven with a
  `@ts-expect-error` probe). `writeTextFile` uses `createWritable()` — the browser's own
  swap-file pattern — so an interrupted write leaves the previous file intact.
* **Directory handle storage** (`src/persistence/directory-handle-store.ts`) — IndexedDB
  `notes-app` → store `handles`, key `data-directory`. **All operations fail soft**; a
  handle that cannot be stored (or a browser that cannot clone one) does not stop the app
  from using the folder, it only means the choice is not remembered. The handle is
  deliberately never written into `notes.json`.
* **Read/write orchestration** (`src/persistence/workspace-files.ts`) — `loadWorkspace`
  **never writes**; it returns `'loaded' | 'fresh' | 'unreadable'`. `saveWorkspace` creates
  `images/`, then `notes.json`, then `notebooks.json`, and writes `.metadata.json` last, so
  the metadata never describes a state the files do not have.
* **`PersistenceProvider`** (`src/persistence/PersistenceProvider.tsx`) — five honest modes
  (`unsupported` / `unconfigured` / `needs-permission` / `connected` / `blocked`), a
  `SaveStatus` of `idle | saving | saved | error`, and a 1000 ms debounced autosave. A save
  is skipped when the note/notebook arrays are reference-identical to the ones known to be on
  disk, so loading or browsing never triggers a rewrite.
* **Status UI** — `PersistenceStatus.tsx` (sidebar footer) states where the notes live and
  offers Choose folder / Reconnect / Try again / Start fresh / Change folder / Export All;
  `SaveIndicator.tsx` shows Saving… / Saved / Not saved in the compact-layout header.
* **Export All** (`src/lib/export.ts`) — a real downloadable JSON bundle
  (`format: 'notes-app-export'`, schema 1) that works with or without folder access, which is
  what makes it the fallback for unsupported browsers. Images are **not** included yet; the
  bundle says so explicitly rather than dropping them silently (Phase 7).
* **Destructive action is confirmed.** "Start fresh" (overwriting unreadable files) is behind
  an inline Yes/Cancel step; it is the only control that discards data.

### Changed from Phase 1

* `DataSource` and `DataBadge` were **removed**. They described a state the app no longer has:
  persistence is real now, and "sample data" no longer exists.
* **Sample notes were removed.** `createFreshWorkspace()` returns an empty Inbox, so a new
  folder starts genuinely empty instead of being pre-filled with fiction.
* Phase 1's browser checks ran against that sample data. After the change the app starts
  empty, so the list/search/notebook checks were re-run in Phase 2 against seeded data
  (scenario [4] below) rather than being assumed to still pass.
* `saveDirectoryHandle` now returns `boolean` instead of throwing, matching the module's
  documented fail-soft contract; a folder that cannot be remembered is still connected, and
  the limitation is surfaced as a repair note.

### Verification — actually run

| Command | Actual result |
| ------- | ------------- |
| `npx tsc -b --force` | exit `0`, no diagnostics |
| `npx oxlint` | exit `0`, no warnings |
| `npm test` (`vitest run`) | **37 passed** — `format.test.ts` 25, `workspace-files.test.ts` 12 |
| `npm run build` | succeeded — 44 modules, `dist/assets/index-*.js` 250.77 kB (gzip 77.49 kB) |

Unit tests cover round-tripping, malformed and partial files, duplicate/missing ids, the
50-version cap, unknown-color coercion, the `applyIntegrity` rules, metadata contents, and —
against an in-memory fake directory handle — that an empty folder is not written to on load,
that malformed files are not overwritten, that saving writes all three files plus `images/`,
and that an aborted write leaves the original file intact.

### Browser checks — actually run

The File System Access picker is a native dialog and cannot be automated, and a real
`FileSystemDirectoryHandle` cannot be constructed from page script. So the persistence paths
were driven by installing a **stand-in for the browser** — an in-page fake of the API slice
this app uses (`/tmp/browser-tools/fake-fs.mjs`) — while the app's own `fsa.ts`,
`workspace-files.ts` and `format.ts` ran untouched. Harness:
`/tmp/browser-tools/phase2.mjs` (48 assertions) and `phase2-mobile.mjs` (12 assertions).

| Scenario | Actual result |
| -------- | ------------- |
| **Unsupported browser** (no `showDirectoryPicker`) | mode `unsupported`; "This browser cannot save to a folder…"; indicator "Not saved to disk"; no Choose-folder button offered |
| Export All in that browser | real file downloaded: `notes-export-2026-10-10.json`; `format: 'notes-app-export'`, `schemaVersion: 1`, 0 notes, notebooks `["Inbox"]`, `images.included: false`; confirmation shown afterwards |
| **Fresh empty folder → Choose folder** | mode `connected`; indicator `Saved`; sidebar "Saving to **NotesData**" |
| Files created | `notes.json`, `notebooks.json`, `.metadata.json`, and `images/` |
| Write order | `notes.json → notebooks.json → .metadata.json` (metadata last) |
| `.metadata.json` contents | `{"schemaVersion":1,"app":"notes-app","createdAt":1791630695126,"updatedAt":1791630695126,"noteCount":0,"notebookCount":1,"lastExportAt":null}` |
| `notes.json` / `notebooks.json` | `notes: []`; notebooks `["Inbox"]` |
| **Reload the written folder** | mode `connected`; "No notes yet"; **0 files rewritten**; all three files intact |
| **Existing data → Choose folder** | 2 cards, pinned first (`Lisbon trip`, `Groceries`); notebooks `All notes / Inbox / Travel` with counts `2 / 1 / 2`; body preview read from stored content |
| Body-text search (`"sourdough"`, absent from every title) | 1 matching card |
| Notebook filter → Travel | heading `Travel`, 2 cards |
| Browsing (search + notebook filter) | 0 files written |
| **Unreadable `notes.json`** (`not json {`) | mode `blocked`; message names the file — "notes.json is not valid JSON"; states "Nothing has been overwritten" |
| While blocked | 0 writes; `notes.json` still exactly `not json {` |
| "Start fresh instead" | confirmation offered; **Cancel wrote nothing** and stayed `blocked` |
| Confirming "Yes, overwrite" | mode `connected`; empty workspace written; the bad file repaired |
| Compact layout 390×844 and 360×560 | status block fully inside the viewport (758–828 of 844; 474–544 of 560); header indicator visible and reading `Saved`; note card rendered |
| Console / page errors / failed requests | **none**, in every scenario |

### Screenshots reviewed

`/tmp/shots/p2-unsupported.png`, `p2-connected.png`, `p2-loaded.png`, `p2-blocked.png`,
`p2-mobile-drawer.png`, `p2-mobile-list.png`, `p2-short-drawer.png`.

### Not verified in a browser — stated plainly

* **`needs-permission` / `reconnect` could not be exercised end to end.** It only occurs for
  a handle restored from IndexedDB, and a real handle cannot be created or cloned by page
  script, so the fake cannot reach that branch. It is covered by reading the code path and by
  the store's unit-tested guard, not by a browser run.
* **Real `showDirectoryPicker` behaviour** (the native dialog, real permission prompts, and
  remembering a handle across a reload) is unverified here. It needs a human clicking the
  picker in Chrome. This is the one acceptance item of Phase 2 that a browser run cannot
  settle — see Next action.

## Phase 3 — Note and notebook CRUD — `COMPLETED`

### Implemented

* **Notes** — create (from the list header, the editor's empty state, and the empty list),
  select, rename, pin/unpin, delete. New notes are filed in the notebook being viewed,
  otherwise in Inbox, and creating one clears an active search so it cannot appear to have
  created nothing.
* **Notebooks** — create, rename, recolor, delete, from a `⋯`/pencil control on each row that
  expands into an inline form (name field + six-swatch radio group). Inbox can be renamed and
  recolored but not deleted.
* **Multi-notebook membership** — `NotebookPicker` in the editor header toggles a note's
  notebooks; `aria-pressed` chips, with Inbox permanently on.
* **Pinning** — `IconPin` toggle in the editor header; pinned notes sort first.
* **Confirmations** — `ConfirmDialog` built on the native `<dialog>` element, used for
  deleting a note, deleting a notebook, and overwriting unreadable files. Focus starts on
  **Cancel**, `Escape` and backdrop clicks cancel, and the destructive button is never the
  default target.
* **Pure, testable rules** — `src/lib/notes.ts` (`createNote`, `createNotebook`,
  `normalizeMembership`, `capVersions`) and `src/state/use-workspace-actions.ts` (id/timestamp
  generation kept out of the reducer). 19 new reducer tests.

### Interpretation recorded (a decision the plan left open)

The plan says "Prevent orphaned notes when a notebook is deleted. Define a sensible
destination or membership-removal behavior." This is resolved as:

> **Every note belongs to at least one notebook, and Inbox is the fallback.**

Consequences, all deliberate: the Inbox chip cannot be switched off (it explains why on
hover/focus), deleting a notebook moves any note that was only in it into Inbox, and Inbox's
count therefore always equals "All notes". The rule is enforced in the **reducer**, not just in
the UI, so in-memory state is already a fixed point of `applyIntegrity` — a reload never
silently reshapes the data. That property is asserted directly in the tests.

Also decided: pinning does **not** change `updatedAt` (it changes position, not content), and
`notes.json` stores notes in insertion order while the UI sorts them — the two are different
things and the tests assert them separately.

### Verification — actually run

| Command | Actual result |
| ------- | ------------- |
| `npx tsc -b --force` | exit `0`, no diagnostics |
| `npx oxlint` | exit `0`, no warnings |
| `npm test` | **56 passed** — format 25, workspace-files 12, workspace-reducer 19 |
| `npm run build` | succeeded — 50 modules |

Reducer tests cover: create inserting/selecting/clearing search; deletion selecting the
neighbour that took the note's place and clearing selection when the last note goes; pin not
touching `updatedAt`; membership dropping unknown ids, de-duplicating, and falling back to
Inbox; notebook deletion moving orphans to Inbox and resetting the view; Inbox being
undeletable; and an 8-action session after every step of which `applyIntegrity` reports **zero
repairs needed**.

### Browser checks — actually run

| Scenario | Actual result |
| -------- | ------------- |
| `phase3.mjs` — create | new note appears, is selected, header count and nav counts update |
| …typed title reaches disk | `notes.json` gains `Weekend plans` filed in `["nb_inbox"]`; `notebooks.json` untouched |
| …pin | `aria-pressed=true`, card `data-pinned=true`, `pinned: true` persisted |
| …membership | chips reflect state; adding Travel → note has 2 dots, Travel count 1, `["nb_inbox","nb_travel"]` persisted; removing it leaves `["nb_inbox"]` |
| …notebook create | appears in nav, is selected, `["Ideas","lilac"]` persisted |
| …note created while viewing it | filed in that notebook's generated id |
| …rename + recolor | nav and disk both show `Sketches` / `rose` |
| …delete notebook | dialog titled `Delete “Sketches”?`, focus on Cancel; **Escape deleted nothing**; confirming removed it, moved its only note to `["nb_inbox"]`, returned the view to All notes, lost no note |
| …delete note | button labelled `Delete Idea one`; dialog names the note; Cancel kept it; confirming removed it from list and disk and moved selection to the neighbouring note |
| …reload | 2 cards, 3 nav rows, counts `2/2/0`, **no repairs reported, 0 files rewritten**, pins intact |
| `phase3-mobile.mjs` — 390×844 | no horizontal overflow; New note button inside the viewport; note created and saved from the phone layout; chips inside the viewport; notebook form fully inside the viewport; confirm dialog fits (19→377 of 390) |
| Console / page errors | **none** in any scenario |

Totals: **52** assertions in `phase3.mjs`, **22** in `phase3-mobile.mjs`, plus the Phase 2
suites re-run and still green (48 + 12).

### Screenshots reviewed

`/tmp/shots/p3-confirm.png`, `p3-after-crud.png`, `p3-mobile-editor.png`,
`p3-mobile-notebook-form.png`, `p3-mobile-confirm.png`, `p3-dark-confirm.png`,
`p3-dark-form.png`. Light and dark both checked; the dark dialog resolves to
`rgb(236,229,216)` on `rgb(34,30,25)` and the danger button to `rgb(42,21,18)` on
`rgb(216,117,106)`.

### Navigation limitation found and recorded (not a defect)

On a phone the drawer's menu button lives in the **list** pane, so while a note is open in the
editor there is no menu button — you return to the list first. This is asserted in the harness
rather than glossed over. It matches the usual mobile notes pattern and is left as is; if it
becomes annoying, a menu control in the editor header is the fix.

## Phase 4 — Lexical editor and autosave — `COMPLETED`

### Implemented

* **Lexical editor** (`lexical` / `@lexical/*` `0.52.0`) mounted with `key={note.id}`, so
  switching notes remounts the composer. That is the mechanism behind PROJECT_PLAN.md §3
  "switching notes must not save pending content to the wrong note": the editor for the note
  being left is torn down after its last change has already been dispatched, and the next
  note gets a new editor. It also means undo history is per note and can never reach across
  into a different note.
* **Node set** — `HeadingNode`, `QuoteNode`, `ListNode`, `ListItemNode`, `LinkNode`
  (`src/editor/editor-theme.ts`). Every registered block type is also understood by
  `BLOCK_TYPES` in `src/lib/content.ts`, so `plainTextFromContent()` keeps extracting text
  for previews and Phase 5 search. That constraint is documented in the file, because
  registering a node without updating `BLOCK_TYPES` would silently drop its text from search.
* **Toolbar** — bold, italic, underline, H1, H2, body text, quote, bulleted list, numbered
  list, link, undo, redo. Buttons `preventDefault()` on `mousedown` so a click never steals
  the editor selection, and each shows its active state via `aria-pressed` driven by
  `registerUpdateListener` + `SELECTION_CHANGE_COMMAND`.
* **One representation** — `Note.content` stays the JSON string of `editorState.toJSON()`
  defined in `src/types.ts`. Nothing mixes HTML into storage; `serializeEditorState()` is the
  only writer and `editorStateFromStored()` the only reader (`src/editor/serialization.ts`,
  deliberately Lexical-free like `src/lib/content.ts`).
* **Malformed content cannot break the composer** — content that is not a recognisable editor
  state falls back to an empty document rather than being passed to Lexical.
* **Single debounce** — the editor dispatches on every change and holds no timer of its own;
  `PersistenceProvider`'s existing ~1s debounce remains the only one, matching how the title
  field already behaved. `versions` is deliberately untouched: PROJECT_PLAN.md §6 forbids a
  snapshot per keystroke and history is Phase 6.

### Two fixes beyond the new files (both small, both justified)

* **Leaving a list.** `$setBlocksType` cannot convert a list item, so "Body text" (or a
  heading) clicked from inside a list silently did nothing. `REMOVE_LIST_COMMAND` is now
  dispatched first when the caret is in a list. Verified: all three list items become
  paragraphs and the toolbar unpresses "Numbered list" and presses "Body text".
* **The save indicator told the truth only after the fact.** `setSaveStatus('saving')` ran
  *inside* the debounce timeout, so for the whole ~1s window after a keystroke the indicator
  still read **Saved** even though the newest content was not on disk. It is now set as soon
  as there is something to write. `SaveIndicator` already mapped `saving` → "Saving…", so
  this is a one-line move in `PersistenceProvider.tsx` and no new status was invented.

### Interpretation recorded (behaviour Lexical defines, not invented here)

* Requesting **Numbered list** while inside a bullet list **converts** the list in place
  rather than nesting a second list. This is Lexical's own `insertList` behaviour.
* **Body text** from inside a list flattens the whole list to paragraphs, because Lexical's
  `removeList` operates on the `ListNode`. The per-item exit is **Enter twice**, which Lexical
  handles natively and which is verified separately to leave earlier lists intact. Both paths
  are undoable. Diverging from Lexical's semantics would mean hand-rolling tree surgery for
  no user benefit, so the upstream behaviour is kept and recorded rather than "fixed".
* The note-list preview is a single truncated line (`…`), so text near the end of a long note
  is not visible in the list. That is the existing card design, unchanged in this phase.

### Verification — actually run

| Command | Actual result |
| ------- | ------------- |
| `npx tsc -b --force` | exit `0`, no diagnostics |
| `npx oxlint` | exit `0`, no warnings |
| `npm test` | **69 passed** — serialization 13 (new), format 25, workspace-files 12, workspace-reducer 19 |
| `npm run build` | succeeded — 94 modules |

`src/editor/serialization.test.ts` covers the storage contract: the stored shape is accepted,
anything without a `root.children` array is rejected, content that is not JSON or not an
editor state falls back to an empty document instead of crashing the composer, content written
by the plain-text importer still loads, a retry (serialize what was loaded) is byte-identical,
and a save/reload preserves text, the `h1` tag and the bold `format: 1` bit.

### Browser checks — actually run

Driven over the Chrome DevTools Protocol against `http://127.0.0.1:5173/` in real Chrome
(`/tmp/phase4.mjs`, `/tmp/phase4-disk.mjs`, run with `/tmp/run-harness.sh`, which starts
Chrome on a fresh profile so OPFS/IndexedDB state cannot leak between runs).

| Scenario | Actual result |
| -------- | ------------- |
| `phase4.mjs` — mount | editor present, `contenteditable="true"`, placeholder "Start writing…", all **12** toolbar controls found |
| …typing and formatting | bold toggles on and back off (`aria-pressed` both ways); italic, underline, H1, H2, bulleted list, numbered list, body text, quote and link all produce the expected markup (`editor__text-bold`, `editor__text-italic`, `editor__text-underline`, `editor__heading--h1/h2`, `editor__list--unordered/--ordered`, `editor__quote`, `editor__link`) |
| …active states | Body/H1/H2/Quote/Bulleted/Numbered each read `aria-pressed="true"` exactly while the caret is in that block, in **12** separate readings |
| …list conversion | requesting `<ol>` from a `<ul>` converts it; text typed afterwards lands in the `<ol>` |
| …leaving a list | "Body text" produces paragraphs, no list markup remains (the fix above) |
| …double Enter | exits the list to a paragraph **and** leaves an earlier list intact |
| …link | prompt reads "Link URL"; the URL lands in `href` with `rel="noreferrer"` |
| …note list preview | shows the heading and body text extracted from the structured nodes — proves `plainTextFromContent` still understands everything the editor writes |
| …round trip by switching notes | leave the note, open another (starts empty), return — **HTML byte-identical**, so serialize → store → reload is lossless |
| …undo/redo | undo is a **no-op** on a freshly opened note (history belongs to the editor instance, so it cannot jump into another note), then reverts and redoes an edit made in that note |
| …themes | light `rgb(247,242,232)` body / `rgb(47,43,37)` ink / link `rgb(184,86,47)`; dark `rgb(26,23,20)` / link `rgb(224,138,95)`; the active toolbar button is accent-on-soft in both |
| …compact 390×844 | no horizontal overflow (`scrollWidth 390 = innerWidth 390`), toolbar wraps to 2 rows and stays inside the viewport |
| Console / page errors | **none** — 46 assertions, 0 failures |

| Scenario (`phase4-disk.mjs` — the acceptance criterion) | Actual result |
| ------------------------------------------------------ | ------------- |
| Folder connection | real `FileSystemDirectoryHandle` (Chrome's OPFS, injected in place of the picker because the native dialog cannot be automated); status reads "Saving to notes-appdata" |
| Typing, then the debounce | indicator is **"Saving…"** immediately after typing settles and **"Saved"** once written |
| What reached the disk | `notes.json`, `notebooks.json`, `.metadata.json`, `images/`; the stored content is serialized JSON (contains no `<`), and walking the tree finds `root → paragraph → text(bold) → heading[h1] → list → listitem → text` |
| Reload in a **separate tab** (fresh JS context, so nothing can come from memory) | the remembered folder reopened **without** the picker, the note list showed the saved note, and the reloaded editor HTML was **identical** to what was typed — bold, `h1` and the bullet list all intact |
| Console / page errors | **none** — 20 assertions, 0 failures |

**"Edit and format a note, wait for autosave, reload, and verify content and formatting remain
intact" is therefore verified end to end**, with the one substitution noted: the folder came
from OPFS rather than the native picker, because the picker's dialog cannot be automated. The
handle is a genuine `FileSystemDirectoryHandle` and every read and write in that run went
through the app's normal `saveWorkspace`/`loadWorkspace` path.

### Screenshots reviewed

`/tmp/shots/p4-light.png`, `p4-dark.png`, `p4-mobile.png`, `p4-reloaded.png`. Light and dark
both checked: toolbar rhythm and dividers, the active-button treatment, heading sizes, the
quote's left rule, the list marker, and the link underline all read correctly in both themes.
The mobile shot confirms the toolbar wraps to two rows inside 390px. The reloaded shot is the
post-reload tab, showing bold + heading + bullet with "Saving to notes-appdata" in the sidebar.

### Not verified — stated plainly

* The **native folder picker** itself (above). Unchanged from Phase 2.
* **Router assistance was not used for this phase.** `route` classifies the work as high
  complexity and selects a paid model, which requires `approve_paid=true`; that was never set.
  `execute_task` additionally failed twice with *"claude-sonnet-5 is temporarily unavailable,
  so auto mode cannot determine the safety of mcp__router__execute_task"*. Phase 4 was
  implemented directly under the user's explicit approval of the plan, and this is recorded
  rather than presented as router-assisted work.

## Latest changes

* Phase 4 complete: the note body is a real rich-text editor — bold, italic, underline,
  headings, quotes, both list types, links, and undo/redo — stored in one representation,
  autosaved through the existing single ~1 s debounce, and verified to survive a reload.
* The body is still a read-only preview — Lexical is Phase 4.

## Verification log

| Date       | Phase | Check                              | Result                                                        |
| ---------- | ----- | ---------------------------------- | ------------------------------------------------------------- |
| 2026-10-10 | Setup | Progress tracking initialized      | Complete; application checks not yet performed                 |
| 2026-10-10 | 0     | Repository audit                   | Docs-only repo; no app code existed; nothing to preserve but `claude/*.md` |
| 2026-10-10 | 0     | MCP router availability            | **Unavailable** — not configured for this project; tools not exposed |
| 2026-10-10 | 0     | `npm install`                      | Passed — 30 packages, 0 vulnerabilities                        |
| 2026-10-10 | 0     | `npx tsc -b`                       | Passed — exit 0, no diagnostics                                |
| 2026-10-10 | 0     | Vite dev server start              | Passed — ready in 422 ms at http://127.0.0.1:5173/             |
| 2026-10-10 | 0     | HTTP check of `/` and `/src/main.tsx` | Passed — both HTTP 200                                      |
| 2026-10-10 | 1     | `npx tsc -b --force`               | Passed — exit 0, no diagnostics                                |
| 2026-10-10 | 1     | `npm run build`                    | Passed — 37 modules, built in 462 ms                           |
| 2026-10-10 | 1     | Desktop browser checks (16 assertions) | All passed; see Phase 1 table above                        |
| 2026-10-10 | 1     | Mobile browser checks (13 assertions)  | All passed; see Phase 1 table above                        |
| 2026-10-10 | 1     | Browser console/page errors        | None                                                           |
| 2026-10-10 | 1     | `npx oxlint` (template config added) | Passed — exit 0, no warnings after dropping two context re-exports |
| 2026-10-10 | 2     | `npx tsc -b --force`               | Passed — exit 0, no diagnostics                                |
| 2026-10-10 | 2     | `npx oxlint`                       | Passed — exit 0, no warnings                                   |
| 2026-10-10 | 2     | `npm test`                         | Passed — 37/37 tests in 2 files                                |
| 2026-10-10 | 2     | `npm run build`                    | Passed — 44 modules, 251 kB JS (gzip 77 kB)                    |
| 2026-10-10 | 2     | Browser: unsupported + Export All  | Passed — real download verified; see Phase 2 table             |
| 2026-10-10 | 2     | Browser: fresh folder writes       | Passed — 3 files + `images/`, metadata last                    |
| 2026-10-10 | 2     | Browser: reload reads back         | Passed — 0 files rewritten                                     |
| 2026-10-10 | 2     | Browser: existing data rendered    | Passed — cards, counts, search, notebook filter                |
| 2026-10-10 | 2     | Browser: unreadable file blocked   | Passed — nothing overwritten; confirm-then-overwrite works     |
| 2026-10-10 | 2     | Browser: compact layouts           | Passed — 12 assertions at 390×844 and 360×560                  |
| 2026-10-10 | 2     | Browser console/page errors        | None in any scenario                                           |
| 2026-10-10 | 2     | `needs-permission` / real picker   | **Not run** — cannot be automated; see Phase 2 "Not verified"  |
| 2026-10-10 | 4     | `npx tsc -b --force` / `npx oxlint` | exit `0` / exit `0`, no warnings                              |
| 2026-10-10 | 4     | `npm test`                         | **69 passed** (serialization 13 new + format 25 + files 12 + reducer 19) |
| 2026-10-10 | 4     | `npm run build`                    | succeeded — 94 modules                                        |
| 2026-10-10 | 4     | Browser: editor mounts             | Passed — contenteditable, placeholder, 12 toolbar controls    |
| 2026-10-10 | 4     | Browser: every format applied      | Passed — bold/italic/underline/H1/H2/quote/ul/ol/link markup  |
| 2026-10-10 | 4     | Browser: toolbar active states     | Passed — 12 readings, correct block each time                 |
| 2026-10-10 | 4     | Browser: leaving a list            | Passed — paragraphs produced; fix verified                    |
| 2026-10-10 | 4     | Browser: double Enter exits list   | Passed — earlier list left intact                             |
| 2026-10-10 | 4     | Browser: round trip via note switch | Passed — HTML byte-identical                                 |
| 2026-10-10 | 4     | Browser: undo/redo                 | Passed — no-op on a fresh note, works after an in-note edit    |
| 2026-10-10 | 4     | Browser: light + dark themes       | Passed — both resolved from tokens, active button visible      |
| 2026-10-10 | 4     | Browser: compact 390×844           | Passed — no overflow; toolbar wraps to 2 rows                 |
| 2026-10-10 | 4     | Browser: autosave status           | Passed — "Saving…" then "Saved"; fix verified                 |
| 2026-10-10 | 4     | Browser: content on disk           | Passed — serialized JSON with heading/h1/bold/list/listitem   |
| 2026-10-10 | 4     | Browser: reload in a second tab    | Passed — formatting identical; handle remembered, no picker   |
| 2026-10-10 | 4     | Browser console/page errors        | None in any scenario (46 + 20 assertions, 0 failures)         |
| 2026-10-10 | 4     | Native folder picker               | **Not run** — cannot be automated; OPFS used instead          |

## Known issues and blockers

* **MCP router still not usable for this project's work** (see the Phase 4 update in Baseline).
  The tools are now exposed, but `route` selects a paid model that `approve_paid=false` must
  refuse, and `execute_task` is currently failing a safety-classification step. Not a blocker —
  the plan documents the fallback path — but it means no router assistance is in use, and no
  router-assisted work is claimed anywhere in this document.
* **Node/npm version note:** npm `9.2.0` is older than the npm shipped with Node 22. Vite 8
  works; no action taken.
* **Security note (not in this repo):** `~/.claude/settings.json` stores an
  `ANTHROPIC_API_KEY` in plaintext and the session is pointed at a third-party
  `ANTHROPIC_BASE_URL`. Not part of this repository and not committed; flagged here only so
  it is not copied into project files. No secret has been written into any project file.
* **Phase 4 limitations (expected, resolved in later phases):** version history is stored but
  never appended to or restored (Phase 6) — editing deliberately does not create snapshots;
  keyboard shortcuts for formatting are Phase 7, so the toolbar is the only way to format
  today; body-text search matches whatever `plainTextFromContent` extracts, and its final
  combination rules with notebook filtering and pinned ordering are Phase 5; Export All omits
  images (Phase 7).
* **The bundle grew to 540 kB (166 kB gzipped)** with Lexical, and the build now warns that a
  chunk exceeds 500 kB. Not addressed here — code-splitting the editor is a Phase 8 polish
  item, and the app is a local single-user tool, not something served over a slow link.
* **Every keystroke re-renders the note list**, because the reducer produces a new `notes`
  array and `updatedAt` changes. This is pre-existing behaviour (the title field already did
  it) and it is what the autosave debounce keys on. Worth measuring in Phase 8 if long notes
  feel sluggish; the fix would be a narrower subscription, not a second debounce.
* **Chrome reported 3 npm vulnerabilities (1 moderate, 2 critical) after installing Lexical.**
  Not investigated or "fixed" by upgrading, because a blind `npm audit fix` could change
  behaviour outside this phase's scope. Flagged for a deliberate look before Phase 8.
* **Search is not yet in its final form.** It filters on the title and extracted body text;
  the documented combination rules with notebook filtering and pinned ordering, plus the
  no-results/clear-search polish, are tightened in Phase 5.
* **Real folder picking is unverified.** The native picker, real permission prompts, and
  remembering a handle across a reload need a human in Chrome. Everything downstream of the
  picker is covered by the fake-directory browser runs and the unit tests.

## Next action

Phase 5 — Search and navigation polish. Search already filters on the title and on the text
`plainTextFromContent()` extracts, and Phase 4 confirmed that extraction still understands
everything the editor writes (headings, lists, quotes, formatted runs). What Phase 5 owes is
the documented combination rules — how search interacts with notebook filtering and pinned
ordering — plus the no-results and clear-search states.

**Worth a human look when convenient:** open http://127.0.0.1:5173/ in Chrome and check the
editor by hand — the toolbar's feel and focus behaviour, and the two placeholder paths. The
automated runs cover behaviour and markup, but not how the caret and the formatting buttons
*feel* to use, and not the compact-layout toolbar on a real touch device.
