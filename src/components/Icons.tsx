/**
 * Inline SVG icons.
 *
 * All icons are decorative by default (`aria-hidden`), because every place they
 * are used already carries a visible or `aria-label`ed text alternative.
 */
interface IconProps {
  size?: number
  className?: string
}

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  }
}

export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconPlus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconPin({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 4h6l-1 6 3.5 3.5H12l-1.5 6-1.5-6H5.5L9 10z" />
    </svg>
  )
}

export function IconTrash({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  )
}

export function IconPencil({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4" />
    </svg>
  )
}

export function IconMenu({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconClose({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconChevronLeft({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  )
}

export function IconSun({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  )
}

export function IconMoon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2z" />
    </svg>
  )
}

export function IconNotes({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 3.5h9L19 7.5v13H6z" />
      <path d="M14.5 3.5v4.2h4.2M9 12.5h7M9 16h5" />
    </svg>
  )
}

export function IconNotebook({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5.5 4.5h12v15h-12z" />
      <path d="M8.5 4.5v15M5.5 8h3M5.5 12h3" />
    </svg>
  )
}
