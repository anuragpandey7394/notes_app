import { useTheme } from '../theme/theme-context'
import { IconMoon, IconSun } from './Icons'

/**
 * Visible light/dark toggle.
 *
 * The visible word names the theme currently applied; the accessible name
 * describes the action the button performs, so it is unambiguous either way.
 */
export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      data-compact={!showLabel}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
      {showLabel && <span aria-hidden="true">{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
