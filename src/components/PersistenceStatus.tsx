import { useState } from 'react'
import { usePersistence } from '../persistence/persistence-context'

/**
 * The single place that tells the user where their notes actually live, and
 * what to do when that is not a folder on disk.
 *
 * Every message here is derived from real state — nothing claims a save that
 * did not happen.
 */
export function PersistenceStatus() {
  const {
    mode,
    saveStatus,
    directoryName,
    message,
    issues,
    busy,
    chooseDirectory,
    reconnect,
    startFresh,
    exportAll,
  } = usePersistence()

  const [confirmingFresh, setConfirmingFresh] = useState(false)

  const exportButton = (
    <button type="button" className="link-button" onClick={() => void exportAll()}>
      Export All
    </button>
  )

  return (
    <div className="persistence" data-mode={mode}>
      {mode === 'unsupported' && (
        <>
          <p className="persistence__text">
            This browser cannot save to a folder. Your notes stay in this tab, so
            use <strong>Export All</strong> to keep them.
          </p>
          {message && (
            <p className="persistence__text persistence__text--note" role="status">
              {message}
            </p>
          )}
          <div className="persistence__actions">{exportButton}</div>
        </>
      )}

      {mode === 'unconfigured' && (
        <>
          {message ? (
            <p className="persistence__text" role="alert">
              {message}
            </p>
          ) : (
            <p className="persistence__text">
              Notes are held in this tab only. Choose a folder to save them to
              disk.
            </p>
          )}
          <div className="persistence__actions">
            <button
              type="button"
              className="button button--small"
              onClick={() => void chooseDirectory()}
              disabled={busy}
            >
              {busy ? 'Opening…' : 'Choose folder'}
            </button>
            {exportButton}
          </div>
        </>
      )}

      {mode === 'needs-permission' && (
        <>
          <p className="persistence__text" role="status">
            {message}
          </p>
          <div className="persistence__actions">
            <button
              type="button"
              className="button button--small"
              onClick={() => void reconnect()}
              disabled={busy}
            >
              {busy ? 'Reconnecting…' : 'Reconnect'}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => void chooseDirectory()}
              disabled={busy}
            >
              Choose another folder
            </button>
          </div>
        </>
      )}

      {mode === 'blocked' && (
        <>
          <p className="persistence__text" role="alert">
            {message} Nothing has been overwritten.
          </p>
          <div className="persistence__actions">
            <button
              type="button"
              className="button button--small"
              onClick={() => void reconnect()}
              disabled={busy}
            >
              Try again
            </button>
            {confirmingFresh ? (
              <>
                <button
                  type="button"
                  className="button button--small button--danger"
                  onClick={() => {
                    setConfirmingFresh(false)
                    void startFresh()
                  }}
                  disabled={busy}
                >
                  Yes, overwrite
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setConfirmingFresh(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="link-button"
                onClick={() => setConfirmingFresh(true)}
                disabled={busy}
              >
                Start fresh instead
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'connected' && (
        <>
          <p className="persistence__text" data-state={saveStatus}>
            {saveStatus === 'error' ? (
              <>
                <strong>Not saved.</strong> {message}
              </>
            ) : (
              <>
                Saving to <strong>{directoryName}</strong>
                {saveStatus === 'saving' ? ' — saving…' : ''}
              </>
            )}
          </p>
          {saveStatus !== 'error' && message && (
            <p className="persistence__text persistence__text--note" role="status">
              {message}
            </p>
          )}
          <div className="persistence__actions">
            <button
              type="button"
              className="link-button"
              onClick={() => void chooseDirectory()}
              disabled={busy}
            >
              Change folder
            </button>
            {exportButton}
          </div>
        </>
      )}

      {issues.length > 0 && mode !== 'blocked' && (
        <details className="persistence__issues">
          <summary>{issues.length} repair(s) applied</summary>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
