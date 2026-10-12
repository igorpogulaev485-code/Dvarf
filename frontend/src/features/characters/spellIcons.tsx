/** Line icons for spells panel / cast / grimoire (kit spells — icons-first). */

import type { ReactNode } from 'react'

type IconProps = { className?: string; title?: string }

function Svg({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className ? `desk-icon ${className}` : 'desk-icon'}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Grimoire — open book */
export function IconSpellBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4.5 6.2c2.2-1.2 4.6-1.2 6.5 0v11.6c-1.9-1.2-4.3-1.2-6.5 0V6.2Z" />
      <path {...stroke} d="M19.5 6.2c-2.2-1.2-4.6-1.2-6.5 0v11.6c1.9-1.2 4.3-1.2 6.5 0V6.2Z" />
    </Svg>
  )
}

/** Prepare — quill */
export function IconQuill(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M14.2 4.8c2.4 1.2 4.2 3.4 4.8 5.8-2.2-.2-4.4-1.4-5.8-3.2L6.2 18.4l-1.4-1.4 9.4-12.2Z" />
      <path {...stroke} d="M5.4 17.8 4.2 20l2.4-.8" />
    </Svg>
  )
}

/** Cast — wand burst */
export function IconCast(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4.5 19.2 14.8 8.9" />
      <path {...stroke} d="M15.6 5.4l3 3M17.2 4.2v2.2M19.8 6.8H17.6" />
      <path {...stroke} d="M13.2 7.4l3.2 3.2" />
    </Svg>
  )
}

/** Spell focus — wand / crystal tip */
export function IconFocus(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M8.2 15.8 18.5 5.5l1.8 1.8L10 17.6l-1.8-1.8Z" />
      <path {...stroke} d="M16.8 5.8l1.6-1.6 1.6 1.6-1.6 1.6Z" />
      <path {...stroke} d="M6.2 18.4h3.2" />
    </Svg>
  )
}

/** Component pouch */
export function IconPouch(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M8.2 8.2h7.6l1.4 3.2v6.4c0 1-.8 1.8-1.8 1.8H8.6c-1 0-1.8-.8-1.8-1.8v-6.4L8.2 8.2Z" />
      <path {...stroke} d="M9.2 8.2V6.8c0-1.4 1.2-2.4 2.8-2.4s2.8 1 2.8 2.4v1.4" />
      <path {...stroke} d="M9.6 13.2h4.8" />
    </Svg>
  )
}

/** Concentration — orbit ring */
export function IconConcentration(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="12" cy="12" r="3.2" />
      <path {...stroke} d="M12 4.2a7.8 7.8 0 0 1 7.8 7.8" />
      <path {...stroke} d="M12 19.8A7.8 7.8 0 0 1 4.2 12" />
      <path {...stroke} d="M18.6 7.2l1.4-.8M5.4 16.8l-1.4.8" />
    </Svg>
  )
}
