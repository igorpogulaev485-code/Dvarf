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

/** Prepare — wizard hat */
export function IconWizardHat(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.4 6.2 14.8h11.6L12 3.4Z" />
      <path {...stroke} d="M5.2 14.8c1.4 1.6 3.8 2.6 6.8 2.6s5.4-1 6.8-2.6" />
      <path {...stroke} d="M4.4 17.6h15.2c.6 0 1 .5.9 1.1-.2 1.2-2.4 2.1-5.3 2.1H8.8c-2.9 0-5.1-.9-5.3-2.1-.1-.6.3-1.1.9-1.1Z" />
      <path {...stroke} d="M13.4 7.2l.9 1.6M14.8 9.4l1.1.5" />
    </Svg>
  )
}

/** @deprecated alias — prepare uses wizard hat */
export const IconQuill = IconWizardHat

/** Cast — sparkle ✨ */
export function IconCast(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.6v4.2M12 16.2v4.2M3.6 12h4.2M16.2 12h4.2" />
      <path {...stroke} d="M6.8 6.8l2.4 2.4M14.8 14.8l2.4 2.4M17.2 6.8l-2.4 2.4M9.2 14.8l-2.4 2.4" />
      <circle {...stroke} cx="12" cy="12" r="1.6" />
      <path {...stroke} d="M18.6 4.8v1.8M17.7 5.7h1.8" />
    </Svg>
  )
}

/** Spell focus — medallion */
export function IconFocus(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.4v2.4" />
      <path {...stroke} d="M9.6 3.8c.6-.6 1.4-.9 2.4-.9s1.8.3 2.4.9" />
      <circle {...stroke} cx="12" cy="13.2" r="6.2" />
      <circle {...stroke} cx="12" cy="13.2" r="3.2" />
      <path {...stroke} d="M12 11.2v4M10.4 13.2h3.2" />
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

/** Ritual — crescent moon */
export function IconRitual(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M15.2 4.6a7.6 7.6 0 1 0 4.1 13.8 6.4 6.4 0 1 1-4.1-13.8Z"
      />
      <path {...stroke} d="M16.8 7.2v1.6M16 8h1.6" />
    </Svg>
  )
}
