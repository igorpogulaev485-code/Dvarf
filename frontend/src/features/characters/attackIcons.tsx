/** Line icons for combat attack compact rows (same stroke as desk/spell icons). */

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

/** Melee — sword */
export function IconMelee(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M14.2 4.2 19.8 9.8" />
      <path {...stroke} d="M16.8 6.8 8.2 15.4l-1.6 4 4-1.6L19.2 9.2" />
      <path {...stroke} d="M7.4 14.6 5.2 16.8" />
      <path {...stroke} d="M10.6 17.8H6.8" />
    </Svg>
  )
}

/** Ranged — bow */
export function IconRanged(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M6.2 5.5c4.2 1.2 7.4 4.4 8.6 8.6" />
      <path {...stroke} d="M6.2 18.5c4.2-1.2 7.4-4.4 8.6-8.6" />
      <path {...stroke} d="M6.2 5.5v13" />
      <path {...stroke} d="M14.8 12h5" />
      <path {...stroke} d="M17.2 10.2 19.8 12l-2.6 1.8" />
    </Svg>
  )
}

/** Class resource — spark pip */
export function IconResource(props: IconProps) {
  return (
    <Svg {...props}>
      <circle {...stroke} cx="12" cy="12" r="6.2" />
      <path {...stroke} d="M12 8.2v7.6M8.2 12h7.6" />
    </Svg>
  )
}

/** Consumable — vial */
export function IconConsumable(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M9.2 3.8h5.6" />
      <path {...stroke} d="M10.2 3.8v3.2L7.5 12.2v5.6c0 1.2 1 2.2 2.2 2.2h4.6c1.2 0 2.2-1 2.2-2.2v-5.6L13.8 7V3.8" />
      <path {...stroke} d="M8.2 14.2h7.6" />
    </Svg>
  )
}

/** Attack modifiers — sliders */
export function IconAttackMods(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4 7h16" />
      <path {...stroke} d="M4 12h16" />
      <path {...stroke} d="M4 17h16" />
      <circle {...stroke} cx="9" cy="7" r="1.6" fill="currentColor" />
      <circle {...stroke} cx="15" cy="12" r="1.6" fill="currentColor" />
      <circle {...stroke} cx="11" cy="17" r="1.6" fill="currentColor" />
    </Svg>
  )
}

/** Take / hold weapon — open hand */
export function IconWeaponHold(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        {...stroke}
        d="M8.2 11.2V8.4a1.4 1.4 0 0 1 2.8 0v2.2M11 10.6V7.6a1.4 1.4 0 0 1 2.8 0v3.4M13.8 11V8.2a1.4 1.4 0 0 1 2.8 0V14c0 2.6-1.8 4.6-4.4 4.6h-.4c-2.2 0-3.8-1-4.8-2.6L6.2 14"
      />
    </Svg>
  )
}

/** Open inventory item — box */
export function IconWeaponItem(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M4.5 8.2 12 4.5l7.5 3.7v7.6L12 19.5 4.5 15.8z" />
      <path {...stroke} d="M12 19.5v-7.6" />
      <path {...stroke} d="M4.5 8.2 12 11.9l7.5-3.7" />
    </Svg>
  )
}

/** Weapon mode toggle — spark */
export function IconWeaponMode(props: IconProps) {
  return (
    <Svg {...props}>
      <path {...stroke} d="M12 3.8 13.6 9.2 19 10.8 13.6 12.4 12 17.8 10.4 12.4 5 10.8 10.4 9.2z" />
    </Svg>
  )
}

const RANGED_HINT =
  /лук|арбалет|метат|дротик|копье|копьё|пращ|выстрел|бросок|javelin|bow|crossbow|dart|sling/i

/** Pick melee vs ranged glyph from attack name / ability. */
export function attackRowIconKind(input: {
  name: string
  ability: string
}): 'melee' | 'ranged' {
  if (RANGED_HINT.test(input.name)) return 'ranged'
  if (input.ability === 'dex' && !/меч|топор|молот|булав|кинджал|когт|рог|укус/i.test(input.name)) {
    return 'ranged'
  }
  return 'melee'
}
