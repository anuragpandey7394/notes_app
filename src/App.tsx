import { AppShell } from './components/AppShell'
import { PersistenceProvider } from './persistence/PersistenceProvider'
import { WorkspaceProvider } from './state/WorkspaceProvider'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <PersistenceProvider>
          <AppShell />
        </PersistenceProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  )
}
