import { useEffect, useState } from 'react'

function readMatch(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

/** Subscribe to a CSS media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)

    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Matches the single-column layout breakpoint used throughout the CSS. */
export function useIsCompactLayout(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
