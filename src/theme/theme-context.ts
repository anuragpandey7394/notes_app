import { createContext, useContext } from 'react'
import type { Theme } from '../types'

export interface ThemeContextValue {
  /** The theme currently applied to the document. */
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used inside a <ThemeProvider>')
  }
  return value
}

/** localStorage key holding the user's explicit theme choice. */
export const THEME_STORAGE_KEY = 'notes-app.theme'

/** Read the stored theme choice, tolerating blocked or unavailable storage. */
export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

/** Persist the theme choice, tolerating blocked or unavailable storage. */
export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The theme
    // still applies for this session; it just will not be remembered.
  }
}
