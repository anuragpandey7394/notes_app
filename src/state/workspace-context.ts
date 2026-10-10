import { createContext, useContext, type Dispatch } from 'react'
import type { AppState } from '../types'
import type { WorkspaceAction } from './workspace-reducer'

export interface WorkspaceContextValue {
  state: AppState
  dispatch: Dispatch<WorkspaceAction>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext)
  if (!value) {
    throw new Error('useWorkspace must be used inside a <WorkspaceProvider>')
  }
  return value
}
