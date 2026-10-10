import { useMemo, useReducer, type ReactNode } from 'react'
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-context'
import { createInitialState, workspaceReducer } from './workspace-reducer'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    createInitialState,
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({ state, dispatch }),
    [state],
  )

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}
